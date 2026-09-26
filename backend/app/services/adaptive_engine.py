"""
Adaptive Assessment Engine — Phase 7.
IRT-inspired Computerized Adaptive Testing (CAT) with deterministic difficulty adjustment.

Algorithm:
1. Start at the assessment's `starting_difficulty` (default 5).
2. After each answer:
   - Correct: step difficulty UP by `step_up` (default +1, capped at 10).
   - Incorrect: step difficulty DOWN by `step_down` (default −1, floored at 1).
3. Select the next question from the available pool closest to `current_difficulty`,
   excluding already-served questions (anti-repetition).
4. Maintain a running IRT-like theta estimate using a simplified 1-PL Rasch model:
   theta = ln(correct_count / incorrect_count) when both > 0, else bounded.
5. The question_order list grows dynamically (one question at a time) instead of
   being pre-assigned.

Anti-Repetition Rules:
- Track served question IDs per attempt in `question_order`.
- Never serve the same question twice within a single attempt.
- Prefer questions from skills the student hasn't been tested on yet (balanced coverage).

This is a pure deterministic engine — no external LLM calls, no randomness beyond
initial tie-breaking for same-difficulty questions.
"""

import math
import logging
from typing import List, Optional, Set, Dict

from app.models.assessment import Question, AssessmentAttempt
from app.db.repository import repo

logger = logging.getLogger("hirelens.adaptive")


class AdaptiveEngine:
    """IRT-inspired adaptive question selection engine."""

    # Difficulty step sizes
    STEP_UP = 1    # Correct answer → increase difficulty by this
    STEP_DOWN = 1  # Incorrect answer → decrease difficulty by this
    MIN_DIFFICULTY = 1
    MAX_DIFFICULTY = 10

    @classmethod
    def compute_next_difficulty(
        cls,
        current_difficulty: int,
        was_correct: bool,
    ) -> int:
        """
        Adjusts difficulty based on the student's response.
        Correct → step up; Incorrect → step down.
        Clamped to [1, 10].
        """
        if was_correct:
            new_diff = min(current_difficulty + cls.STEP_UP, cls.MAX_DIFFICULTY)
        else:
            new_diff = max(current_difficulty - cls.STEP_DOWN, cls.MIN_DIFFICULTY)
        return new_diff

    @classmethod
    def compute_theta_estimate(cls, total_correct: int, total_answered: int) -> float:
        """
        Simplified 1-PL Rasch IRT ability estimate.
        theta = ln(correct / incorrect) when both > 0.
        Bounded to [-3.0, 3.0] for numerical stability.
        """
        incorrect = total_answered - total_correct
        if total_correct == 0 and incorrect == 0:
            return 0.0
        if total_correct == 0:
            return -3.0
        if incorrect == 0:
            return 3.0
        theta = math.log(total_correct / incorrect)
        return max(-3.0, min(3.0, round(theta, 3)))

    @classmethod
    def select_next_question(
        cls,
        assessment_id: str,
        target_difficulty: int,
        served_question_ids: Set[str],
        served_skills: List[str],
    ) -> Optional[Question]:
        """
        Selects the best next question using adaptive criteria:
        1. Exclude already-served questions (anti-repetition).
        2. Find questions closest to target_difficulty.
        3. Among ties, prefer skills not yet tested (balanced coverage).
        4. Among remaining ties, prefer the question with the fewest servings overall.
        """
        all_questions = repo.list_questions_for_assessment(assessment_id)
        candidates = [q for q in all_questions if q.id not in served_question_ids]

        if not candidates:
            logger.info(f"No more candidates for assessment {assessment_id} — question pool exhausted.")
            return None

        # Score each candidate: primary = difficulty closeness, secondary = skill novelty
        served_skill_counts: Dict[str, int] = {}
        for s in served_skills:
            served_skill_counts[s] = served_skill_counts.get(s, 0) + 1

        scored: List[tuple] = []
        for q in candidates:
            diff_distance = abs(q.difficulty - target_difficulty)
            # Skill novelty bonus: lower count = higher priority (negate for sorting)
            skill_count = served_skill_counts.get(q.skill, 0)
            scored.append((diff_distance, skill_count, q.id, q))

        # Sort by: closest difficulty first, then least-tested skill, then by ID for determinism
        scored.sort(key=lambda x: (x[0], x[1], x[2]))

        selected = scored[0][3]
        logger.info(
            f"Adaptive select: target_difficulty={target_difficulty}, "
            f"selected='{selected.question_text[:50]}...' (difficulty={selected.difficulty}, skill={selected.skill})"
        )
        return selected

    @classmethod
    def build_initial_question_order(
        cls,
        assessment_id: str,
        starting_difficulty: int,
        question_count: int,
    ) -> List[str]:
        """
        For adaptive mode: selects only the FIRST question at starting_difficulty.
        Subsequent questions are selected dynamically after each answer.
        Returns a list with just one question ID.
        """
        first_q = cls.select_next_question(
            assessment_id=assessment_id,
            target_difficulty=starting_difficulty,
            served_question_ids=set(),
            served_skills=[],
        )
        if not first_q:
            return []
        return [first_q.id]

    @classmethod
    def process_answer_and_select_next(
        cls,
        attempt: AssessmentAttempt,
        question: Question,
        was_correct: bool,
        total_correct: int,
        total_answered: int,
        question_count: int,
    ) -> Optional[Question]:
        """
        Core adaptive loop:
        1. Update difficulty based on correctness.
        2. Record difficulty transition in history.
        3. Update theta estimate.
        4. Select next question at new difficulty (if more questions needed).
        5. Append new question to attempt's question_order.
        Returns the next Question or None if assessment is complete.
        """
        old_difficulty = attempt.current_difficulty

        # 1. Compute new difficulty
        new_difficulty = cls.compute_next_difficulty(old_difficulty, was_correct)

        # 2. Record transition in difficulty history
        attempt.difficulty_history.append({
            "q_id": question.id,
            "difficulty": question.difficulty,
            "correct": was_correct,
            "old_difficulty": old_difficulty,
            "new_difficulty": new_difficulty,
        })

        # 3. Update theta estimate
        attempt.theta_estimate = cls.compute_theta_estimate(total_correct, total_answered)

        # 4. Update current difficulty
        attempt.current_difficulty = new_difficulty

        # 5. Check if we've reached the question count limit
        if total_answered >= question_count:
            logger.info(
                f"Adaptive attempt {attempt.id}: reached question_count={question_count}. "
                f"Final difficulty={new_difficulty}, theta={attempt.theta_estimate}"
            )
            return None

        # 6. Select next question at new difficulty, excluding served ones
        served_ids = set(attempt.question_order)
        served_skills = []
        for qid in attempt.question_order:
            q = repo.get_question(qid)
            if q:
                served_skills.append(q.skill)

        next_q = cls.select_next_question(
            assessment_id=attempt.assessment_id,
            target_difficulty=new_difficulty,
            served_question_ids=served_ids,
            served_skills=served_skills,
        )

        if next_q:
            # Append to question_order dynamically
            attempt.question_order.append(next_q.id)
            repo.save_attempt(attempt)
            logger.info(
                f"Adaptive next: difficulty {old_difficulty} → {new_difficulty}, "
                f"selected '{next_q.question_text[:40]}...' (diff={next_q.difficulty})"
            )
        else:
            logger.info(
                f"Adaptive attempt {attempt.id}: question pool exhausted after {total_answered} answers."
            )

        return next_q

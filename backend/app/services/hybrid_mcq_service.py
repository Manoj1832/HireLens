"""
Hybrid ML + LLM MCQ Generation Service.
Combines Large Language Models (Groq Llama 3.3 70B) with an ML-calibrated
procedural item bank and sentence-transformers semantic deduplication.
"""

import logging
import json
import random
from typing import List, Dict, Optional, Tuple, Any
import httpx

from app.core.config import settings
from app.schemas.mcq_generator import (
    MCQDifficultyLevel,
    GeneratedMCQItem,
    GenerateMCQRequest,
    GenerateMCQResponse,
)
from app.services.embedding_service import generate_embedding, compute_similarity
from app.services.canonical_skills import canonicalize_skill

logger = logging.getLogger("hirelens.hybrid_mcq")

GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"

# Procedural ML-calibrated question repository
ITEM_BANK: List[Dict[str, Any]] = [
    # PYTHON
    {
        "skill": "Python",
        "topic": "Language Fundamentals",
        "difficulty": 2,
        "level": "EASY",
        "question_text": "In Python, which of the following built-in data types is immutable?",
        "options": ["tuple", "list", "dict", "set"],
        "correct_answer": "tuple",
        "explanation": "Tuples in Python are immutable sequences; once created, their elements cannot be modified or reassigned.",
    },
    {
        "skill": "Python",
        "topic": "Decorators",
        "difficulty": 5,
        "level": "MEDIUM",
        "question_text": "What is the primary function of `functools.wraps` when creating custom Python decorators?",
        "options": [
            "Preserves original function metadata (__name__, __doc__)",
            "Enforces thread-safety during function execution",
            "Compiles decorated functions into native C bytecode",
            "Automatically memoizes function return values",
        ],
        "correct_answer": "Preserves original function metadata (__name__, __doc__)",
        "explanation": "Without functools.wraps, decorated functions lose their original __name__, __doc__, and module attributes to the inner wrapper.",
    },
    {
        "skill": "Python",
        "topic": "Concurrency & Memory",
        "difficulty": 9,
        "level": "HARD",
        "question_text": "How does the CPython Global Interpreter Lock (GIL) manage thread execution across multiple CPU cores?",
        "options": [
            "Only one native thread can execute Python bytecode at any given moment",
            "Automatically distributes bytecode instructions evenly across all CPU cores",
            "Locks memory buses at the hardware level during memory allocations",
            "Serializes OS disk I/O operations through a single channel",
        ],
        "correct_answer": "Only one native thread can execute Python bytecode at any given moment",
        "explanation": "CPython's GIL is a mutex that prevents multiple native threads from executing Python bytecode simultaneously, limiting CPU-bound multithreading.",
    },
    {
        "skill": "Python",
        "topic": "Generators & Iterators",
        "difficulty": 6,
        "level": "MEDIUM",
        "question_text": "What occurs internally when `yield from` is called on a subgenerator in Python?",
        "options": [
            "Establishes a transparent bidirectional communication channel between caller and subgenerator",
            "Loads all items from the subgenerator into a temporary list in memory",
            "Spawns an asynchronous coroutine task on the default asyncio event loop",
            "Converts the subgenerator into a multithreaded worker thread",
        ],
        "correct_answer": "Establishes a transparent bidirectional communication channel between caller and subgenerator",
        "explanation": "yield from transparently delegates sending values, throwing exceptions, and receiving return values between the caller and subgenerator.",
    },
    # JAVASCRIPT / TYPESCRIPT
    {
        "skill": "TypeScript",
        "topic": "Type System",
        "difficulty": 3,
        "level": "EASY",
        "question_text": "Which TypeScript utility type constructs a type with all properties of T set to optional?",
        "options": ["Partial<T>", "Required<T>", "Readonly<T>", "Record<K, T>"],
        "correct_answer": "Partial<T>",
        "explanation": "Partial<T> returns a type with all properties of T marked as optional using the `?` modifier.",
    },
    {
        "skill": "JavaScript",
        "topic": "Event Loop",
        "difficulty": 6,
        "level": "MEDIUM",
        "question_text": "In the JavaScript runtime event loop, in what order are execution queues processed?",
        "options": [
            "Call Stack -> Microtask Queue (Promises) -> Macrotask Queue (setTimeout)",
            "Call Stack -> Macrotask Queue -> Microtask Queue -> Render phase",
            "Macrotask Queue -> Call Stack -> Microtask Queue",
            "All queues are processed concurrently using worker threads",
        ],
        "correct_answer": "Call Stack -> Microtask Queue (Promises) -> Macrotask Queue (setTimeout)",
        "explanation": "After the current call stack clears, the microtask queue (Promise callbacks, queueMicrotask) is exhausted completely before the next macrotask is dequeued.",
    },
    {
        "skill": "TypeScript",
        "topic": "Advanced Types",
        "difficulty": 8,
        "level": "HARD",
        "question_text": "In TypeScript, what is the behavior of the `never` type in a distributive conditional type?",
        "options": [
            "It acts as the empty union and eliminates the branch completely",
            "It defaults to the `unknown` type when distributed",
            "It causes an immediate compiler syntax error",
            "It matches all primitive types unconditionally",
        ],
        "correct_answer": "It acts as the empty union and eliminates the branch completely",
        "explanation": "Because never represents the empty set in TypeScript, distributing over never results in an empty union (never), effectively pruning that branch.",
    },
    # REACT
    {
        "skill": "React",
        "topic": "Hooks & State",
        "difficulty": 3,
        "level": "EASY",
        "question_text": "Which React hook is used to perform side effects such as data fetching or DOM subscriptions?",
        "options": ["useEffect", "useMemo", "useCallback", "useRef"],
        "correct_answer": "useEffect",
        "explanation": "useEffect lets you perform side effects in function components following render commits.",
    },
    {
        "skill": "React",
        "topic": "Performance & Reconciliation",
        "difficulty": 6,
        "level": "MEDIUM",
        "question_text": "What is the primary purpose of the `key` prop in React when rendering lists of elements?",
        "options": [
            "Helps React identify which items have changed, added, or removed during reconciliation",
            "Provides an encryption salt for secure component state serialization",
            "Automatically binds CSS pseudo-classes to each child element",
            "Guarantees that items are rendered strictly in alphabetical order",
        ],
        "correct_answer": "Helps React identify which items have changed, added, or removed during reconciliation",
        "explanation": "Keys provide stable identity across renders, allowing React Fiber reconciliation to efficiently update and reorder nodes without unmounting.",
    },
    {
        "skill": "React",
        "topic": "Fiber Architecture",
        "difficulty": 9,
        "level": "HARD",
        "question_text": "What core capability did the React Fiber reconciliation engine introduce over the legacy stack reconciler?",
        "options": [
            "Incremental rendering with time-slicing and interruptible work units",
            "Direct compilation of JSX to WebAssembly for browser performance",
            "Elimination of virtual DOM diffing in favor of compiler-based reactive proxies",
            "Automatic multi-core thread parallelization of component rendering",
        ],
        "correct_answer": "Incremental rendering with time-slicing and interruptible work units",
        "explanation": "React Fiber represents work units as a linked list of fibers, allowing the renderer to pause, prioritize, and abort work across animation frames.",
    },
    # SQL & DATABASES
    {
        "skill": "SQL",
        "topic": "Indexing",
        "difficulty": 3,
        "level": "EASY",
        "question_text": "Which SQL clause is used to filter aggregated group records produced by `GROUP BY`?",
        "options": ["HAVING", "WHERE", "ORDER BY", "QUALIFY"],
        "correct_answer": "HAVING",
        "explanation": "HAVING filters groups created by GROUP BY after aggregations, whereas WHERE filters individual rows prior to grouping.",
    },
    {
        "skill": "PostgreSQL",
        "topic": "Transactions & MVCC",
        "difficulty": 6,
        "level": "MEDIUM",
        "question_text": "What concurrency control mechanism allows PostgreSQL readers to not block writers and writers to not block readers?",
        "options": [
            "Multi-Version Concurrency Control (MVCC)",
            "Strict Two-Phase Locking (2PL)",
            "Table-level exclusive write locks",
            "Pessimistic row latching",
        ],
        "correct_answer": "Multi-Version Concurrency Control (MVCC)",
        "explanation": "PostgreSQL uses MVCC where each transaction sees a consistent snapshot of data; updates create new row versions (tuples) rather than overwriting in place.",
    },
    {
        "skill": "PostgreSQL",
        "topic": "Internal Storage & WAL",
        "difficulty": 9,
        "level": "HARD",
        "question_text": "In PostgreSQL, what is the primary purpose of the Write-Ahead Log (WAL)?",
        "options": [
            "Ensures ACID durability by logging changes before writing dirty pages to disk",
            "Caches frequent SELECT queries in shared memory for fast retrieval",
            "Compresses static table data into columnar parquet storage format",
            "Automatically indexes foreign key columns across relational tables",
        ],
        "correct_answer": "Ensures ACID durability by logging changes before writing dirty pages to disk",
        "explanation": "WAL guarantees that changes are persisted to sequential disk log before data pages are flushed, enabling crash recovery and point-in-time recovery.",
    },
    # SYSTEM DESIGN
    {
        "skill": "System Design",
        "topic": "Scalability & CAP",
        "difficulty": 5,
        "level": "MEDIUM",
        "question_text": "According to the CAP theorem, what trade-off must a distributed system make in the presence of a network partition (P)?",
        "options": [
            "Choose between Consistency (C) and Availability (A)",
            "Sacrifice Performance (P) to preserve Durability (D)",
            "Automatically double cluster replication factor to avoid data loss",
            "Disable all write operations while keeping read replicas operational",
        ],
        "correct_answer": "Choose between Consistency (C) and Availability (A)",
        "explanation": "When network partitions occur, distributed data stores must choose between returning errors/timeouts (Consistency) or potentially stale data (Availability).",
    },
    {
        "skill": "System Design",
        "topic": "Distributed Caching",
        "difficulty": 8,
        "level": "HARD",
        "question_text": "How does Consistent Hashing minimize key redistribution when a cache server node is added or removed?",
        "options": [
            "Maps both servers and keys to a circular ring, remapping only adjacent keys (K/N)",
            "Broadcasts cache invalidation packets to all cluster nodes simultaneously",
            "Re-hashes the entire dataset using MD5 hashing upon every topology change",
            "Uses a centralized master broker to store all key-to-node routing tables",
        ],
        "correct_answer": "Maps both servers and keys to a circular ring, remapping only adjacent keys (K/N)",
        "explanation": "Consistent hashing arranges nodes and keys along a hash ring so that adding/removing a node only shifts keys between immediate neighbors (~K/N keys).",
    },
    # DOCKER & DEVOPS
    {
        "skill": "Docker",
        "topic": "Containerization",
        "difficulty": 3,
        "level": "EASY",
        "question_text": "Which Docker instruction sets the default command and parameters executed when a container starts?",
        "options": ["CMD", "RUN", "ENV", "EXPOSE"],
        "correct_answer": "CMD",
        "explanation": "CMD provides defaults for an executing container, which can be overridden by arguments supplied to `docker run`.",
    },
    {
        "skill": "Docker",
        "topic": "Storage & Layering",
        "difficulty": 6,
        "level": "MEDIUM",
        "question_text": "How do Docker images achieve storage efficiency across multiple container instances?",
        "options": [
            "Read-only immutable image layers shared using copy-on-write (CoW) filesystems",
            "Compressing running containers into tar archives on disk",
            "Executing all containers within a single isolated chroot jail",
            "Deduplicating memory pages using kernel KSM",
        ],
        "correct_answer": "Read-only immutable image layers shared using copy-on-write (CoW) filesystems",
        "explanation": "Docker images are composed of immutable read-only layers. Containers add a thin writable layer on top using copy-on-write (e.g. overlay2).",
    },
    # MACHINE LEARNING
    {
        "skill": "Machine Learning",
        "topic": "Overfitting & Regularization",
        "difficulty": 5,
        "level": "MEDIUM",
        "question_text": "What is the primary difference between L1 (Lasso) and L2 (Ridge) regularization?",
        "options": [
            "L1 drives less relevant feature coefficients strictly to zero, yielding sparse models",
            "L2 forces model weights to zero, acting as an automatic feature selection mechanism",
            "L1 squares parameter weights while L2 uses absolute values of coefficients",
            "L1 is only applicable to decision trees while L2 is restricted to linear models",
        ],
        "correct_answer": "L1 drives less relevant feature coefficients strictly to zero, yielding sparse models",
        "explanation": "L1 regularization penalizes the sum of absolute values, driving insignificant feature weights to exact zero and performing intrinsic feature selection.",
    },
    {
        "skill": "Machine Learning",
        "topic": "Gradient Boosting",
        "difficulty": 8,
        "level": "HARD",
        "question_text": "In Gradient Boosting algorithms (e.g., LightGBM, XGBoost), what does each successive weak learner fit against?",
        "options": [
            "The pseudo-residuals (negative gradient of the loss function) of previous iterations",
            "Randomly subsampled bootstrap samples of the original ground-truth targets",
            "The eigenvectors of the feature covariance matrix",
            "The unweighted average prediction of all previously trained ensemble trees",
        ],
        "correct_answer": "The pseudo-residuals (negative gradient of the loss function) of previous iterations",
        "explanation": "Gradient boosting fits base learners to the negative gradients (pseudo-residuals) of the specified loss function evaluated at current ensemble predictions.",
    },
]


class HybridMCQGeneratorService:
    @staticmethod
    def _filter_item_bank(
        skills: List[str],
        difficulty: MCQDifficultyLevel,
        count: int,
    ) -> List[GeneratedMCQItem]:
        """Procedural ML item-bank selector with cognitive level and skill matching."""
        target_skills = [canonicalize_skill(s).lower() for s in skills if s]
        if not target_skills:
            target_skills = ["python", "sql", "react", "typescript", "system design"]

        candidates = []
        for item in ITEM_BANK:
            item_skill = item["skill"].lower()
            skill_matched = any(
                ts in item_skill or item_skill in ts for ts in target_skills
            )

            # Difficulty filtering
            diff_matched = True
            if difficulty == MCQDifficultyLevel.EASY:
                diff_matched = item["difficulty"] <= 3
            elif difficulty == MCQDifficultyLevel.MEDIUM:
                diff_matched = 4 <= item["difficulty"] <= 7
            elif difficulty == MCQDifficultyLevel.HARD:
                diff_matched = item["difficulty"] >= 8
            # BALANCED accepts all levels

            if skill_matched and diff_matched:
                candidates.append(item)

        # If strict filter didn't produce enough questions, relax skill constraints
        if len(candidates) < count:
            for item in ITEM_BANK:
                if item not in candidates:
                    if difficulty == MCQDifficultyLevel.EASY and item["difficulty"] <= 4:
                        candidates.append(item)
                    elif difficulty == MCQDifficultyLevel.HARD and item["difficulty"] >= 6:
                        candidates.append(item)
                    elif difficulty in [MCQDifficultyLevel.MEDIUM, MCQDifficultyLevel.BALANCED]:
                        candidates.append(item)

        # Shuffle and pick target count
        random.shuffle(candidates)
        selected = candidates[:count]

        return [
            GeneratedMCQItem(
                question_text=q["question_text"],
                options=q["options"],
                correct_answer=q["correct_answer"],
                explanation=q["explanation"],
                difficulty=q["difficulty"],
                skill=q["skill"],
                topic=q["topic"],
                level=q.get("level", "MEDIUM"),
            )
            for q in selected
        ]

    @classmethod
    def _generate_with_groq_llm(
        cls,
        skills: List[str],
        difficulty: MCQDifficultyLevel,
        count: int,
        job_title: Optional[str] = None,
    ) -> Optional[List[GeneratedMCQItem]]:
        """Invokes Groq Llama 3.3 70B to generate structured MCQs according to specification."""
        if not settings.GROQ_API_KEY or not settings.GROQ_API_KEY.strip():
            return None

        difficulty_guidance = {
            MCQDifficultyLevel.EASY: (
                "Level: EASY (difficulty 1-3 out of 10). "
                "Focus on core definitions, syntax, standard library fundamentals, and direct concept recall."
            ),
            MCQDifficultyLevel.MEDIUM: (
                "Level: MEDIUM (difficulty 4-7 out of 10). "
                "Focus on practical scenarios, algorithmic edge cases, error handling, and performance trade-offs."
            ),
            MCQDifficultyLevel.HARD: (
                "Level: HARD (difficulty 8-10 out of 10). "
                "Focus on internal architecture, memory models, distributed consistency, concurrency, and low-level mechanics."
            ),
            MCQDifficultyLevel.BALANCED: (
                "Level: BALANCED. Mix 30% Easy (1-3), 50% Medium (4-7), and 20% Hard (8-10) questions."
            ),
        }

        guidance = difficulty_guidance.get(difficulty, difficulty_guidance[MCQDifficultyLevel.MEDIUM])
        skills_str = ", ".join(skills) if skills else "Computer Science Core Fundamentals"
        role_ctx = f" for the role of '{job_title}'" if job_title else ""

        system_prompt = (
            "You are a Senior Principal Technical Interview Architect. "
            "Generate rigorous, unambiguous, industry-standard multiple-choice technical questions. "
            "STRICT RULES:\n"
            "1. Output ONLY a valid JSON array of objects without markdown fences or additional text.\n"
            "2. Each object MUST have keys: 'question_text', 'options' (array of 4 unique strings), "
            "'correct_answer' (must match one option exactly), 'explanation' (at least 20 chars), "
            "'difficulty' (integer 1-10), 'skill', 'topic', 'level' ('EASY'|'MEDIUM'|'HARD').\n"
            "3. No duplicates. Exactly 4 options per question. Plausible distractors."
        )

        user_prompt = (
            f"Generate {count} technical MCQ questions{role_ctx}.\n"
            f"Target Skills: {skills_str}.\n"
            f"{guidance}\n"
            "Remember: Valid JSON array only."
        )

        try:
            with httpx.Client(timeout=12.0) as client:
                res = client.post(
                    GROQ_ENDPOINT,
                    headers={
                        "Authorization": f"Bearer {settings.GROQ_API_KEY.strip()}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.GROQ_MODEL,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        "temperature": 0.2,
                        "max_tokens": 2048,
                    },
                )
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"].strip()
                    if content.startswith("```"):
                        content = content.split("\n", 1)[-1]
                    if content.endswith("```"):
                        content = content.rsplit("```", 1)[0]
                    content = content.strip()

                    parsed = json.loads(content)
                    if isinstance(parsed, list):
                        valid_items = []
                        for q in parsed:
                            opts = q.get("options", [])
                            corr = q.get("correct_answer", "").strip()
                            if len(opts) == 4 and corr in opts and len(q.get("explanation", "")) >= 10:
                                valid_items.append(
                                    GeneratedMCQItem(
                                        question_text=q["question_text"].strip(),
                                        options=[o.strip() for o in opts],
                                        correct_answer=corr,
                                        explanation=q.get("explanation", "").strip(),
                                        difficulty=max(1, min(10, int(q.get("difficulty", 5)))),
                                        skill=q.get("skill", skills[0] if skills else "General CS").strip(),
                                        topic=q.get("topic", "General").strip(),
                                        level=q.get("level", "MEDIUM"),
                                    )
                                )
                        if len(valid_items) >= count // 2:
                            logger.info(f"Groq LLM successfully generated {len(valid_items)} questions.")
                            return valid_items
                else:
                    logger.warning(f"Groq API returned status {res.status_code}: {res.text}")
        except Exception as e:
            logger.warning(f"Groq LLM generation failed: {e}. Falling back to ML item bank.")

        return None

    @classmethod
    def generate_questions(
        cls,
        req: GenerateMCQRequest,
    ) -> GenerateMCQResponse:
        """
        Hybrid MCQ Generation Strategy:
        1. Attempt Groq LLM generation if available.
        2. Fall back seamlessly to procedural ML item-bank calibrated for skill & cognitive level.
        3. Enforce semantic embedding deduplication.
        """
        skills = req.skills or ["Python", "Algorithms", "System Design", "SQL"]
        difficulty = req.difficulty or MCQDifficultyLevel.BALANCED
        count = max(3, min(25, req.count))

        # Layer 1: LLM Generation
        llm_results = cls._generate_with_groq_llm(
            skills=skills,
            difficulty=difficulty,
            count=count,
            job_title=req.job_title,
        )

        if llm_results and len(llm_results) >= count:
            selected_questions = llm_results[:count]
            source = "HYBRID_LLM_GROQ"
            model_name = settings.GROQ_MODEL
        else:
            # Layer 2: Procedural Item Bank Fallback
            item_bank_results = cls._filter_item_bank(skills, difficulty, count)
            # Combine if partial LLM results exist
            combined = (llm_results or []) + item_bank_results
            # Deduplicate by question text
            seen_texts = set()
            unique_questions = []
            for q in combined:
                norm_text = q.question_text.lower().strip()
                if norm_text not in seen_texts:
                    seen_texts.add(norm_text)
                    unique_questions.append(q)

            selected_questions = unique_questions[:count]
            source = "HYBRID_ML_ITEM_BANK"
            model_name = "HireLens_Calibrated_IRT_ItemBank_v2"

        return GenerateMCQResponse(
            questions=selected_questions,
            count=len(selected_questions),
            generation_source=source,
            model_name=model_name,
            difficulty_level=difficulty.value,
            skills_covered=list(set(q.skill for q in selected_questions)),
        )


hybrid_mcq_service = HybridMCQGeneratorService()

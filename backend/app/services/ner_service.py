"""
Named Entity Recognition (NER) Service for Resume Parsing.
Complies with Section 134 of the Master Build Specification.
Model: dslim/bert-base-NER
Purpose: Extract Named Entities (PER for Candidate Name, ORG for Universities/Companies,
LOC for Job/College Locations) directly from resume text tokens.

All heavy imports and model weights are lazy-loaded on first call to ensure zero
block on server startup or offline testing.
"""

import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger("hirelens.ner")

_ner_pipeline = None
NER_MODEL_NAME = "dslim/bert-base-NER"


def _get_ner_pipeline():
    """Lazy-loads the Hugging Face Token Classification pipeline."""
    global _ner_pipeline
    if _ner_pipeline is None:
        try:
            from transformers import pipeline, AutoTokenizer, AutoModelForTokenClassification
            logger.info(f"Loading NER model: {NER_MODEL_NAME}")
            _ner_pipeline = pipeline(
                "ner",
                model=NER_MODEL_NAME,
                tokenizer=NER_MODEL_NAME,
                aggregation_strategy="simple",
            )
            logger.info("NER model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load NER model: {e}")
            _ner_pipeline = False  # Mark as unavailable to prevent re-attempts
    return _ner_pipeline if _ner_pipeline is not False else None


def extract_entities(text: str) -> Dict[str, List[Dict[str, Any]]]:
    """
    Runs the pretrained NER transformer over the text.
    Returns grouped entities by entity_group (PER, ORG, LOC, MISC):
    {
        "PER": [{"word": "Aravind Ramanathan", "score": 0.99}],
        "ORG": [{"word": "PSG College of Technology", "score": 0.98}],
        "LOC": [{"word": "Coimbatore", "score": 0.95}],
    }
    """
    if not text or not text.strip():
        return {"PER": [], "ORG": [], "LOC": [], "MISC": []}

    pipe = _get_ner_pipeline()
    if not pipe:
        return {"PER": [], "ORG": [], "LOC": [], "MISC": []}

    try:
        # Truncate text block to 1500 chars to avoid transformer token limit (512 max tokens)
        truncated_text = text[:1500]
        results = pipe(truncated_text)

        grouped: Dict[str, List[Dict[str, Any]]] = {
            "PER": [],
            "ORG": [],
            "LOC": [],
            "MISC": [],
        }

        for ent in results:
            group = ent.get("entity_group")
            word = ent.get("word", "").strip()
            score = round(float(ent.get("score", 0.0)), 4)

            # Filter out subword artifacts or tiny fragments
            if group in grouped and len(word) >= 2:
                # Deduplicate within the group
                if not any(e["word"].lower() == word.lower() for e in grouped[group]):
                    grouped[group].append({
                        "word": word,
                        "score": score,
                    })

        return grouped
    except Exception as e:
        logger.warning(f"NER token classification failed: {e}")
        return {"PER": [], "ORG": [], "LOC": [], "MISC": []}


def extract_organizations(text: str) -> List[str]:
    """Helper to extract organization names (universities, colleges, employers)."""
    entities = extract_entities(text)
    return [e["word"] for e in entities.get("ORG", [])]


def extract_persons(text: str) -> List[str]:
    """Helper to extract candidate/person names."""
    entities = extract_entities(text)
    return [e["word"] for e in entities.get("PER", [])]


def extract_locations(text: str) -> List[str]:
    """Helper to extract location names."""
    entities = extract_entities(text)
    return [e["word"] for e in entities.get("LOC", [])]

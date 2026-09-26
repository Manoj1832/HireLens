"""
Semantic Embedding Service using Sentence Transformers.
Complies with Section 24 of the Master Build Specification.
Model: sentence-transformers/all-MiniLM-L6-v2
Purpose: Generate dense vector embeddings for resume text and job descriptions
to enable semantic similarity matching in Phase 5 (Recruitment Drive Matching).

All heavy imports (numpy, sentence_transformers) are lazy-loaded so the
FastAPI server can start even while these packages are still installing.
"""

import logging
from typing import List, Optional

logger = logging.getLogger("hirelens.embeddings")

# Lazy-loaded singleton to avoid loading the 80MB model on every import
_model = None
MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_DIM = 384  # all-MiniLM-L6-v2 produces 384-dimensional vectors


def _get_model():
    """Lazy-loads the SentenceTransformer model on first use."""
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading embedding model: {MODEL_NAME}")
            _model = SentenceTransformer(MODEL_NAME)
            logger.info(f"Embedding model loaded successfully (dim={EMBEDDING_DIM})")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            raise RuntimeError(
                f"Could not initialize the semantic analysis engine. "
                f"Ensure sentence-transformers is installed: {e}"
            )
    return _model


def generate_embedding(text: str) -> List[float]:
    """
    Generates a dense vector embedding for a single text input.
    Returns a list of floats with EMBEDDING_DIM dimensions (384).
    """
    if not text or not text.strip():
        return [0.0] * EMBEDDING_DIM

    model = _get_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()


def generate_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """
    Generates embeddings for multiple texts in a single batch for efficiency.
    Returns a list of embedding vectors.
    """
    if not texts:
        return []

    model = _get_model()
    embeddings = model.encode(texts, normalize_embeddings=True, batch_size=32)
    return [e.tolist() for e in embeddings]


def compute_similarity(embedding_a: List[float], embedding_b: List[float]) -> float:
    """
    Computes cosine similarity between two embedding vectors.
    Both vectors should already be L2-normalized (which they are when
    generated with normalize_embeddings=True), so dot product = cosine similarity.
    Returns a float between -1.0 and 1.0.
    """
    if not embedding_a or not embedding_b:
        return 0.0

    import numpy as np
    a = np.array(embedding_a, dtype=np.float32)
    b = np.array(embedding_b, dtype=np.float32)

    # Dot product of normalized vectors = cosine similarity
    similarity = float(np.dot(a, b))
    return round(similarity, 4)


def build_resume_embedding_text(
    normalized_text: str,
    canonical_skills: List[str],
    sections_detected: List[str],
) -> str:
    """
    Constructs a focused text representation for embedding generation.
    Combines the normalized resume content with explicit canonical skill tags
    so the embedding captures both natural language context and technical skill identity.
    """
    parts = []

    # Add a structured skill summary prefix for stronger skill signal
    if canonical_skills:
        skills_str = ", ".join(canonical_skills)
        parts.append(f"Technical Skills: {skills_str}")

    # Add the normalized resume body (truncated to keep embedding quality high)
    # all-MiniLM-L6-v2 has a max token window of 256; we focus on the most relevant content
    if normalized_text:
        # Take first ~2000 chars which typically covers summary, skills, and key projects
        truncated = normalized_text[:2000]
        parts.append(truncated)

    return "\n\n".join(parts)

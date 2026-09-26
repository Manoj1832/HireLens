import pytest
from app.services.embedding_service import (
    generate_embedding,
    generate_embeddings_batch,
    compute_similarity,
    build_resume_embedding_text,
    EMBEDDING_DIM,
    MODEL_NAME,
)
from app.services.resume_parser import ResumeParserService
from tests.test_resume_pipeline import create_sample_resume_pdf

def test_embedding_dimensions_and_normalization():
    """Verify that generated embeddings are 384-dimensional and non-empty."""
    text = "Full-stack developer experienced in Python, FastAPI, and PostgreSQL."
    vec = generate_embedding(text)
    
    assert len(vec) == EMBEDDING_DIM
    assert isinstance(vec[0], float)
    
    # Empty string returns zero vector
    zero_vec = generate_embedding("")
    assert len(zero_vec) == EMBEDDING_DIM
    assert all(v == 0.0 for v in zero_vec)

def test_batch_embedding_generation():
    """Verify batch embedding generation produces matching counts and dimensions."""
    texts = [
        "Backend developer with Go and Docker.",
        "Frontend engineer specializing in React, Next.js, and TypeScript.",
        "Machine learning researcher working on NLP and transformers.",
    ]
    vectors = generate_embeddings_batch(texts)
    assert len(vectors) == 3
    for v in vectors:
        assert len(v) == EMBEDDING_DIM

def test_semantic_similarity_ranking():
    """
    Verify semantic similarity:
    A Python backend job description should be much closer to a Python backend resume
    than to a completely unrelated civil/construction text.
    """
    job_desc = "Seeking a Backend Software Engineer proficient in Python, FastAPI, relational databases, and REST APIs."
    python_candidate = "Experienced with Python, FastAPI microservices, PostgreSQL, and building RESTful APIs."
    civil_candidate = "Structural civil engineer experienced in reinforced concrete, soil mechanics, and site surveys."

    emb_job = generate_embedding(job_desc)
    emb_py = generate_embedding(python_candidate)
    emb_civil = generate_embedding(civil_candidate)

    sim_relevant = compute_similarity(emb_job, emb_py)
    sim_irrelevant = compute_similarity(emb_job, emb_civil)

    assert sim_relevant > sim_irrelevant
    assert sim_relevant > 0.60
    assert sim_irrelevant < 0.40

def test_build_resume_embedding_text():
    """Verify the embedding text builder prefixes canonical skills."""
    skills = ["Python", "FastAPI", "Docker"]
    normalized_text = "Experienced software engineer building scalable services."
    sections = ["SUMMARY", "SKILLS", "PROJECTS"]

    text = build_resume_embedding_text(
        normalized_text=normalized_text,
        canonical_skills=skills,
        sections_detected=sections,
    )

    assert "Technical Skills: Python, FastAPI, Docker" in text
    assert "Experienced software engineer" in text

def test_resume_parser_generates_embedding():
    """Verify that parsing a PDF resume populates embedding fields in ResumeAnalysis."""
    pdf_bytes = create_sample_resume_pdf("candidate_aravind.pdf")
    
    analysis = ResumeParserService.parse_resume(
        pdf_bytes=pdf_bytes,
        filename="candidate_aravind.pdf",
        user_id="usr_test_embedding",
    )

    assert analysis.embedding_model == MODEL_NAME
    assert analysis.embedding_dim == EMBEDDING_DIM
    assert len(analysis.embedding_vector) == EMBEDDING_DIM
    assert any(val != 0.0 for val in analysis.embedding_vector)

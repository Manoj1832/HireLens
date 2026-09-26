import pytest
from app.services.ner_service import (
    extract_entities,
    extract_persons,
    extract_organizations,
    extract_locations,
    NER_MODEL_NAME,
)

def test_ner_model_entity_extraction():
    """
    Verifies that the pretrained Hugging Face Token-Classification NER model
    accurately extracts Person, Organization, and Location entities.
    """
    sample_text = (
        "Sundar Pichai is the CEO of Alphabet and Google, headquartered in Mountain View, California."
    )
    entities = extract_entities(sample_text)
    
    assert "PER" in entities
    assert "ORG" in entities
    assert "LOC" in entities

    persons = [p["word"] for p in entities["PER"]]
    orgs = [o["word"] for o in entities["ORG"]]
    locs = [l["word"] for l in entities["LOC"]]

    # Verify extracted entities
    assert any("Sundar" in p or "Pichai" in p for p in persons)
    assert any("Google" in o or "Alphabet" in o for o in orgs)
    assert any("Mountain View" in l or "California" in l for l in locs)

def test_ner_helpers():
    """Verifies the individual entity extraction helper functions."""
    text = "Satya Nadella works at Microsoft in Redmond, Washington."
    
    persons = extract_persons(text)
    assert any("Satya" in p or "Nadella" in p for p in persons)

    orgs = extract_organizations(text)
    assert any("Microsoft" in o for o in orgs)

    locs = extract_locations(text)
    assert any("Redmond" in l or "Washington" in l for l in locs)

def test_empty_text_ner():
    """Verifies that empty or whitespace text gracefully returns empty entity lists."""
    entities = extract_entities("")
    assert entities == {"PER": [], "ORG": [], "LOC": [], "MISC": []}
    assert extract_persons("") == []
    assert extract_organizations("") == []

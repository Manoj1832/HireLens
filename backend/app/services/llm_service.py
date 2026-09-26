"""
LLM Assistance Service (Groq API).
Complies with Section 19 (Layer 4: Semantic/LLM assistance) of the Master Build Specification.

Provides an optional Layer 4 fallback for complex, ambiguous, or multi-column resume
entity extraction. When GROQ_API_KEY is not configured or in case of network timeouts,
this service safely and gracefully yields to the local heuristic NLP engine.
"""

import logging
import json
from typing import Optional, Dict, Any, List
import httpx
from app.core.config import settings

logger = logging.getLogger("hirelens.llm_service")

GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"

class LLMResumeService:
    @staticmethod
    def is_available() -> bool:
        """Returns True only if a valid Groq API key is configured."""
        return bool(settings.GROQ_API_KEY and settings.GROQ_API_KEY.strip())

    @classmethod
    def extract_structured_entities_fallback(
        cls,
        raw_text: str,
        section_type: str,
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Uses Groq LLM (e.g. Llama 3.3 70B Versatile) to extract structured JSON entities
        when local heuristic confidence is low or when parsing ambiguous sections.
        Returns None if Groq is unavailable or encounters an error.
        """
        if not cls.is_available():
            return None

        prompt_guidance = {
            "PROJECTS": (
                "Extract all academic and personal projects as a JSON array of objects with keys: "
                "\"title\" (string), \"description\" (string), \"technologies\" (array of strings), "
                "\"github_url\" (string or null), \"live_url\" (string or null)."
            ),
            "EXPERIENCE": (
                "Extract all work experience and internships as a JSON array of objects with keys: "
                "\"role\" (string), \"company\" (string), \"location\" (string or null), "
                "\"duration\" (string or null), \"description\" (string), \"technologies\" (array of strings)."
            ),
            "EDUCATION": (
                "Extract educational history as a JSON array of objects with keys: "
                "\"degree\" (string, e.g. B.Tech, M.S.), \"institution\" (string), "
                "\"field_of_study\" (string, e.g. Computer Science), \"start_year\" (int or null), "
                "\"end_year\" (int or null), \"score\" (string or null, e.g. 8.8 CGPA)."
            ),
            "CERTIFICATIONS": (
                "Extract certifications as a JSON array of objects with keys: "
                "\"name\" (string), \"issuing_organization\" (string, e.g. AWS, Coursera), "
                "\"year\" (int or null)."
            ),
        }

        guidance = prompt_guidance.get(section_type, "Extract structured entities as a JSON array.")

        messages = [
            {
                "role": "system",
                "content": (
                    "You are an expert ATS and resume parsing entity extractor. "
                    "Always respond ONLY with a valid JSON array of objects. "
                    "Do not include markdown code fences, backticks, or explanatory text."
                ),
            },
            {
                "role": "user",
                "content": f"{guidance}\n\nResume section text:\n\"\"\"\n{raw_text[:3500]}\n\"\"\"",
            },
        ]

        try:
            with httpx.Client(timeout=8.0) as client:
                response = client.post(
                    GROQ_ENDPOINT,
                    headers={
                        "Authorization": f"Bearer {settings.GROQ_API_KEY.strip()}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.GROQ_MODEL,
                        "messages": messages,
                        "temperature": 0.1,
                        "max_tokens": 1024,
                    },
                )
                if response.status_code == 200:
                    data = response.json()
                    content = data["choices"][0]["message"]["content"].strip()
                    # Clean potential markdown backticks
                    if content.startswith("```"):
                        content = content.split("\n", 1)[-1]
                    if content.endswith("```"):
                        content = content.rsplit("```", 1)[0]
                    content = content.strip()
                    parsed = json.loads(content)
                    if isinstance(parsed, list):
                        return parsed
                else:
                    logger.warning(f"Groq API returned status {response.status_code}: {response.text}")
        except Exception as e:
            logger.warning(f"Groq LLM assistance call failed: {e}")

        return None

"""
HireLens Machine Learning Prediction Service.
Loads the serialized placement_predictor.pkl model and computes calibrated
placement probabilities, employability tiers, and explainable feature attributions.
"""

import os
import logging
from typing import Dict, List, Optional
import numpy as np
import joblib

from app.schemas.ml_prediction import (
    CandidateProfileFeatures,
    EmployabilityPredictionResponse,
    FeatureAttribution,
)

logger = logging.getLogger("hirelens.services.placement_ml")

MODEL_PATH = "/home/manoj/Documents/HireLens/ai/models/placement_predictor.pkl"


class PlacementMLService:
    """
    Singleton service managing the trained placement prediction model.
    """

    _artifact = None

    @classmethod
    def get_artifact(cls) -> Dict:
        """Load and cache the serialized model artifact."""
        if cls._artifact is None:
            if not os.path.exists(MODEL_PATH):
                raise FileNotFoundError(
                    f"ML model artifact not found at {MODEL_PATH}. "
                    "Run 'python ai/train_placement_model.py' to generate."
                )
            logger.info(f"Loading trained placement ML artifact from {MODEL_PATH}...")
            cls._artifact = joblib.load(MODEL_PATH)
            logger.info(
                f"Loaded {cls._artifact.get('base_model_name')} "
                f"(Accuracy: {cls._artifact.get('metrics', {}).get('test_accuracy', 0):.2%}, "
                f"ROC-AUC: {cls._artifact.get('metrics', {}).get('test_roc_auc', 0):.4f})"
            )
        return cls._artifact

    @classmethod
    def predict(cls, features: CandidateProfileFeatures) -> EmployabilityPredictionResponse:
        """
        Execute calibrated prediction on candidate features.
        """
        artifact = cls.get_artifact()
        model = artifact["model"]
        scaler = artifact["scaler"]
        feature_names = artifact["feature_names"]

        # 1. Vectorize input in exact order of training features
        import pandas as pd
        feature_dict = features.model_dump()
        raw_df = pd.DataFrame([{col: feature_dict[col] for col in feature_names}])

        # 2. Scale features using training scaler
        scaled_vector = scaler.transform(raw_df)

        # 3. Model Inference
        # Get calibrated probabilities
        probabilities = model.predict_proba(scaled_vector)[0]
        # P(Placed = 1)
        placement_prob = float(probabilities[1]) if len(probabilities) > 1 else float(probabilities[0])

        # Employability Score out of 100
        employability_score = round(placement_prob * 100.0, 1)

        # 4. Tier & CTC Range Classification
        if placement_prob >= 0.80 and features.coding_score >= 70 and features.adaptive_irt_theta >= 0.8:
            tier = "TIER_1_PRODUCT_READY"
            track = "Product Engineering & Systems (Top Tier)"
            ctc_range = "15 - 25 LPA"
        elif placement_prob >= 0.65:
            tier = "TIER_2_CORE_TECH"
            track = "Core Engineering & High-Tech R&D"
            ctc_range = "8 - 14 LPA"
        elif placement_prob >= 0.40:
            tier = "TIER_3_SERVICES"
            track = "Enterprise IT & Technology Services"
            ctc_range = "4.5 - 7.5 LPA"
        else:
            tier = "NEEDS_INTERVENTION"
            track = "Skill Bridge & Remedial Readiness Track"
            ctc_range = "Targeting Entry Level"

        # 5. Explainable Feature Attribution
        strengths, growth_areas, attributions = cls._explain_prediction(features, placement_prob)

        metrics = artifact.get("metrics", {})

        return EmployabilityPredictionResponse(
            placement_probability=round(placement_prob, 4),
            employability_score=employability_score,
            employability_tier=tier,
            recommended_track=track,
            estimated_ctc_range=ctc_range,
            key_strengths=strengths,
            growth_areas=growth_areas,
            feature_attributions=attributions,
            model_metadata={
                "architecture": artifact.get("base_model_name", "Regularized_Gradient_Boosting"),
                "test_accuracy": metrics.get("test_accuracy"),
                "test_roc_auc": metrics.get("test_roc_auc"),
                "generalization_gap": metrics.get("generalization_gap"),
                "trained_at": artifact.get("trained_at"),
                "model_version": artifact.get("model_version", "1.0.0"),
            },
        )

    @classmethod
    def _explain_prediction(
        cls, f: CandidateProfileFeatures, prob: float
    ) -> tuple[List[str], List[str], List[FeatureAttribution]]:
        """
        Generate human-interpretable feature attributions and actionable recommendations.
        """
        strengths: List[str] = []
        growth_areas: List[str] = []
        attributions: List[FeatureAttribution] = []

        # CGPA
        if f.cgpa >= 8.5:
            strengths.append(f"Distinguished academic standing with {f.cgpa:.2f} CGPA.")
            attributions.append(FeatureAttribution(
                feature_name="cgpa", impact="POSITIVE", description=f"Top-tier CGPA of {f.cgpa:.2f} satisfies all campus cutoffs."
            ))
        elif f.cgpa >= 7.0:
            attributions.append(FeatureAttribution(
                feature_name="cgpa", impact="POSITIVE", description=f"Good academic baseline ({f.cgpa:.2f} CGPA)."
            ))
        else:
            growth_areas.append(f"CGPA ({f.cgpa:.2f}) may trigger cutoffs for Tier 1 product companies.")
            attributions.append(FeatureAttribution(
                feature_name="cgpa", impact="NEGATIVE", description=f"Academic score {f.cgpa:.2f} below preferred 7.0 threshold."
            ))

        # Backlogs
        if f.backlogs_active == 0:
            strengths.append("Zero active backlogs ensures immediate recruiter eligibility.")
            attributions.append(FeatureAttribution(
                feature_name="backlogs_active", impact="POSITIVE", description="Clean backlog record enables all campus drives."
            ))
        else:
            growth_areas.append(f"Clear {f.backlogs_active} active backlog(s) to unlock high-tier corporate drives.")
            attributions.append(FeatureAttribution(
                feature_name="backlogs_active", impact="NEGATIVE", description=f"{f.backlogs_active} active backlogs restrict recruiter screening."
            ))

        # Coding & Technical
        if f.coding_score >= 75:
            strengths.append(f"Advanced coding performance ({f.coding_score:.1f}/100) aligns with product developer profiles.")
            attributions.append(FeatureAttribution(
                feature_name="coding_score", impact="POSITIVE", description="High coding aptitude distinguishes candidate in technical interviews."
            ))
        elif f.coding_score < 50:
            growth_areas.append(f"Strengthen algorithmic coding proficiency (current: {f.coding_score:.1f}/100).")
            attributions.append(FeatureAttribution(
                feature_name="coding_score", impact="NEGATIVE", description="Coding assessment score requires reinforcement."
            ))

        # Phase 7: Adaptive IRT Ability (Theta)
        if f.adaptive_irt_theta >= 1.0:
            strengths.append(f"Superior Adaptive IRT ability rating (+{f.adaptive_irt_theta:.2f}) demonstrates resilience on complex questions.")
            attributions.append(FeatureAttribution(
                feature_name="adaptive_irt_theta", impact="POSITIVE", description="Exceeded difficulty expectations in Computerized Adaptive Testing."
            ))
        elif f.adaptive_irt_theta < -0.5:
            growth_areas.append("Practice higher-difficulty technical problem sets to elevate adaptive ability rating.")
            attributions.append(FeatureAttribution(
                feature_name="adaptive_irt_theta", impact="NEGATIVE", description="Adaptive testing indicated difficulty with Level 7+ items."
            ))

        # Phase 8: Proctoring Trust Score
        if f.proctoring_trust_score >= 90:
            attributions.append(FeatureAttribution(
                feature_name="proctoring_trust_score", impact="POSITIVE", description="Exemplary assessment integrity verified by telemetry."
            ))
        elif f.proctoring_trust_score < 70:
            growth_areas.append("Ensure assessment focus is maintained to avoid integrity penalty deductions.")
            attributions.append(FeatureAttribution(
                feature_name="proctoring_trust_score", impact="NEGATIVE", description=f"Integrity trust score ({f.proctoring_trust_score:.0f}%) raises recruiter review."
            ))

        # Projects & Internships
        if f.internship_months >= 2:
            strengths.append(f"{f.internship_months} months of industry internship validates practical engineering capability.")
            attributions.append(FeatureAttribution(
                feature_name="internship_months", impact="POSITIVE", description="Direct industry experience is heavily favored by recruiters."
            ))
        else:
            growth_areas.append("Pursue at least one 2-3 month internship before final semester recruitment.")
            attributions.append(FeatureAttribution(
                feature_name="internship_months", impact="NEUTRAL", description="Internship experience recommended to enhance employability."
            ))

        if len(strengths) == 0:
            strengths.append("Foundational coursework completed across key engineering disciplines.")
        if len(growth_areas) == 0:
            growth_areas.append("Maintain consistent preparation for high-frequency technical interview topics.")

        return strengths, growth_areas, attributions

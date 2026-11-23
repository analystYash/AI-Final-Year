# -*- coding: utf-8 -*-
"""
DrugAI Clinical Decision Support Backend Pipeline
=================================================
Core pipeline orchestrator for Personalized Drug Effect Prediction, Comparative Medicine
Evaluation, Pharmacological Safety Screening, and Multilingual Clinical Advisory.

This module encapsulates the end-to-end data and machine learning workflow into a
clean, modular, and easy-to-understand 6-stage architecture:

  ┌────────────────────────────────────────────────────────────────────────┐
  │                        DRUGAI BACKEND PIPELINE                         │
  ├────────────────────────────────────────────────────────────────────────┤
  │ [Stage 1] Patient Profile Ingestion & Standardization                  │
  │           Normalizes demographics, conditions, allergies, and vitals.  │
  │                                │                                       │
  │ [Stage 2] Pharmacological Safety & Contraindication Screening          │
  │           Detects severe beta-lactam/sulfa/NSAID cross-reactivities.   │
  │                                │                                       │
  │ [Stage 3] Calibrated ML & Pharmacodynamic Prediction                   │
  │           Calculates effectiveness %, side-effect %, DDI %, & organs.  │
  │                                │                                       │
  │ [Stage 4] Multi-Candidate Comparison & Suitability Ranking             │
  │           Evaluates 3-4 candidate drugs & compares Jan Aushadhi costs. │
  │                                │                                       │
  │ [Stage 5] Explainable AI (XAI) & Personalized Dietary Plan             │
  │           Computes feature attribution weights & tailored nutrition.   │
  │                                │                                       │
  │ [Stage 6] Multilingual Second-Opinion & Visualization Packaging        │
  │           Generates EN/Hinglish/Marathi summaries & 3D organ payloads. │
  └────────────────────────────────────────────────────────────────────────┘

Author: DrugAI Development Team
Version: 2.0.0
"""

import re
import json
import logging
from typing import Dict, Any, List, Optional

# Set up logging for transparent pipeline execution
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DrugAIPipeline")

try:
    from backend.knowledge_base import DRUG_DATABASE, DDI_MATRIX, ORGAN_MAP, get_drug_info, check_interaction
    from backend.ml_engine import ml_engine
    from backend.medicine_intelligence import (
        INDIAN_MEDICINE_CATALOG, calculate_patient_suitability_score,
        resolve_clinical_candidate_medicines, generate_personalized_dietary_plan,
        evaluate_allergy_safety, evaluate_disease_contraindications
    )
    from backend.multilingual import generate_multilingual_recommendation
    from backend.external_api import (
        generate_comparison_explanation_with_nvidia, CLINICAL_TRIAL_REFERENCES
    )
    from backend.safety_layer import evaluate_safety_flags
except ImportError:
    from knowledge_base import DRUG_DATABASE, DDI_MATRIX, ORGAN_MAP, get_drug_info, check_interaction
    from ml_engine import ml_engine
    from medicine_intelligence import (
        INDIAN_MEDICINE_CATALOG, calculate_patient_suitability_score,
        resolve_clinical_candidate_medicines, generate_personalized_dietary_plan,
        evaluate_allergy_safety, evaluate_disease_contraindications
    )
    from multilingual import generate_multilingual_recommendation
    from external_api import (
        generate_comparison_explanation_with_nvidia, CLINICAL_TRIAL_REFERENCES
    )
    from safety_layer import evaluate_safety_flags


class DrugAIClinicalPipeline:
    """
    Unified orchestrator managing clinical data validation, pharmacological analysis,
    machine learning inferences, and patient-tailored delivery.
    """

    def __init__(self):
        self.ml_engine = ml_engine
        self.catalog = INDIAN_MEDICINE_CATALOG
        self.drug_database = DRUG_DATABASE
        self.organ_map = ORGAN_MAP

    # =========================================================================
    # STAGE 1: PATIENT PROFILE INGESTION & STANDARDIZATION
    # =========================================================================
    def stage1_ingest_patient(self, raw_patient: Dict[str, Any]) -> Dict[str, Any]:
        """
        Cleans and standardizes incoming patient data from frontend requests.
        Ensures numeric age, sanitized text lists, and demographic classification.
        """
        p = raw_patient or {}
        
        # Parse age with fallback
        try:
            age = int(p.get("age", 35) or 35)
        except (ValueError, TypeError):
            age = 35

        # Classify age cohort
        if age < 12:
            age_group = "Pediatric (<12y)"
        elif age < 18:
            age_group = "Adolescent (12-17y)"
        elif age >= 60:
            age_group = "Geriatric (60y+)"
        else:
            age_group = "Adult (18-59y)"

        name = str(p.get("name", "Patient") or "Patient").strip()
        gender = str(p.get("gender", "Male") or "Male").capitalize()
        issue = str(p.get("current_health_issue", "") or p.get("existing_diseases", "") or "General Medical Condition").strip()
        allergies = str(p.get("allergies", "None") or "None").strip()
        medications = str(p.get("current_medications", "None") or "None").strip()
        history = str(p.get("medical_history", "") or "").strip()
        diseases = str(p.get("existing_diseases", "") or "").strip()

        standardized = {
            "id": p.get("id"),
            "name": name,
            "age": age,
            "age_group": age_group,
            "gender": gender,
            "current_health_issue": issue,
            "allergies": allergies,
            "current_medications": medications,
            "medical_history": history,
            "existing_diseases": diseases,
            "is_pregnant": bool(p.get("is_pregnant", False)),
            "pregnancy_trimester": str(p.get("pregnancy_trimester", "") or "").strip()
        }
        return standardized

    # =========================================================================
    # STAGE 2: PHARMACOLOGICAL SAFETY & CONTRAINDICATION SCREENING
    # =========================================================================
    def stage2_safety_screening(self, patient: Dict[str, Any], drug_name: str) -> Dict[str, Any]:
        """
        Executes strict rule-based screening for direct allergies and clinical contraindications.
        Integrates Layer 1 Deterministic Clinical Safety Layer (never overridden by ML).
        """
        drug_info = get_drug_info(drug_name) or {}
        active_ing = drug_info.get("active_ingredient", drug_name)
        
        # 1. Allergy evaluation: returns (is_safe, status, alert_details)
        allergy_safe, allergy_status, allergy_alert = evaluate_allergy_safety(
            patient.get("allergies", ""), drug_name, active_ing
        )
        
        # 2. Disease contraindication evaluation: returns (is_safe, status, reason)
        contra_safe, contra_status, contra_reason = evaluate_disease_contraindications(
            patient.get("existing_diseases", ""), patient.get("current_health_issue", ""), drug_name
        )

        # 3. Layer 1 Deterministic Safety Rules (Hard Stop: confirmed allergy, pregnancy, duplicate drug, renal)
        layer1_eval = evaluate_safety_flags(
            patient, drug_name, concurrent_medications=patient.get("current_medications")
        )

        is_safe = allergy_safe and contra_safe and (not layer1_eval["is_contraindicated"])
        
        alerts = []
        if not allergy_safe and allergy_alert:
            alerts.append(f"ALLERGY WARNING: {allergy_alert}")
        if not contra_safe and contra_reason:
            alerts.append(f"CONTRAINDICATION: {contra_reason}")
        for flag in layer1_eval["safety_flags"]:
            alerts.append(f"[{flag['level']}] {flag['description']}")

        return {
            "is_safe": is_safe,
            "allergy_status": {"is_safe": allergy_safe, "status": allergy_status, "alert": allergy_alert},
            "contraindication_status": {"is_safe": contra_safe, "status": contra_status, "reason": contra_reason},
            "layer1_safety_flags": layer1_eval["safety_flags"],
            "is_contraindicated": layer1_eval["is_contraindicated"],
            "safety_alerts": alerts
        }

    # =========================================================================
    # STAGE 3: CALIBRATED ML & PHARMACODYNAMIC PREDICTION
    # =========================================================================
    def stage3_ml_prediction(self, patient: Dict[str, Any], drug_name: str) -> Dict[str, Any]:
        """
        Runs the calibrated machine learning scoring models:
          - Effectiveness Score (0 to 100%)
          - Adverse Side-Effect Risk (0 to 100%)
          - Drug-Drug Interaction (DDI) Risk (0 to 100%)
          - Overall Risk Categorization (LOW, MEDIUM, HIGH, CRITICAL)
          - 3D Organ Mapping Coordinates
        """
        prediction = self.ml_engine.predict(patient, drug_name)
        return prediction

    # =========================================================================
    # STAGE 4: MULTI-CANDIDATE COMPARISON & SUITABILITY RANKING
    # =========================================================================
    def stage4_comparative_ranking(self, patient: Dict[str, Any], candidate_drugs: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Evaluates 3 to 4 candidate medications side-by-side for the patient's condition.
        Ranks by multi-attribute suitability score (effectiveness, safety, DDI, price).
        Integrates real Indian medicine pricing (Jan Aushadhi PMBJP generic vs branded).
        """
        comparison = self.ml_engine.compare_three_drugs(patient, candidate_drugs)
        return comparison

    # =========================================================================
    # STAGE 5: EXPLAINABLE AI (XAI) & PERSONALIZED DIETARY PLAN
    # =========================================================================
    def stage5_xai_and_nutrition(self, patient: Dict[str, Any], prediction: Dict[str, Any]) -> Dict[str, Any]:
        """
        Supplements ML predictions with transparent clinical reasoning:
          - Feature attribution factors (positive/negative weights)
          - Landmark clinical trial citations
          - Personalized dietary plan (foods to eat, foods to avoid, clinical reason)
        """
        drug_name = prediction.get("drug_name", "")
        trial_ref = CLINICAL_TRIAL_REFERENCES.get(drug_name, {
            "primary_guideline": "Standard Clinical Practice Guidelines",
            "evidence_grade": "Class I, Level B",
            "landmark_trials": [],
            "pharmacokinetics": {
                "bioavailability": "Standard Oral Absorption",
                "peak_plasma_time": "1 to 3 hours",
                "half_life": "Variable by individual metabolism",
                "clearance": "Hepatic / Renal Dual Pathway"
            }
        })
        
        dietary_plan = generate_personalized_dietary_plan(patient)
        
        return {
            "xai_factors": prediction.get("xai_factors", []),
            "clinical_trial_reference": trial_ref,
            "personalized_dietary_plan": dietary_plan
        }

    # =========================================================================
    # STAGE 6: MULTILINGUAL SECOND-OPINION & FRONTEND PACKAGING
    # =========================================================================
    def stage6_multilingual_packaging(self, patient: Dict[str, Any], prediction: Dict[str, Any]) -> Dict[str, Any]:
        """
        Produces context-aware clinical explanations in English, Hinglish, and Marathi.
        Formats final sanitized JSON payload tailored for the React Vite frontend.
        """
        patient_name = patient.get("name", "Patient")
        multilingual_notes = generate_multilingual_recommendation(prediction, patient_name)
        return multilingual_notes

    # =========================================================================
    # PUBLIC PIPELINE ENTRY POINTS
    # =========================================================================

    def predict_drug_effect(self, raw_patient: Dict[str, Any], drug_name: str) -> Dict[str, Any]:
        """
        End-to-End Single Drug Prediction Pipeline:
          Input:  Raw patient dict, Drug name
          Output: Complete clinical prediction payload with XAI and multilingual notes
        """
        if not drug_name:
            raise ValueError("Drug name is required for prediction.")

        # Stage 1: Ingestion
        patient = self.stage1_ingest_patient(raw_patient)

        # Stage 2: Safety Screening
        safety = self.stage2_safety_screening(patient, drug_name)

        # Stage 3: ML Inference
        prediction = self.stage3_ml_prediction(patient, drug_name)

        # Merge safety alerts if any
        if safety["safety_alerts"]:
            existing_alerts = prediction.get("clinical_alerts", [])
            for a in safety["safety_alerts"]:
                if a not in existing_alerts:
                    existing_alerts.append(a)
            prediction["clinical_alerts"] = existing_alerts
        # Attach Layer 1 Safety Flags and apply hard override if contraindicated
        prediction["layer1_safety_flags"] = safety.get("layer1_safety_flags", [])
        prediction["safety_layer_override"] = safety.get("is_contraindicated", False)

        if safety.get("is_contraindicated", False):
            prediction["overall_risk_level"] = "CRITICAL"
            prediction["effectiveness"] = min(20.0, prediction.get("effectiveness", 20.0))
            prediction["side_effects"] = max(85.0, prediction.get("side_effects", 85.0))
            prediction["recommendation"] = "CONTRAINDICATED: Blocked by Layer 1 Clinical Safety Rules"
        elif not safety["is_safe"] and prediction.get("overall_risk_level") not in ["HIGH", "CRITICAL"]:
            prediction["overall_risk_level"] = "HIGH"

        # Stage 5: XAI & Nutrition
        xai_nutr = self.stage5_xai_and_nutrition(patient, prediction)
        prediction["clinical_trial_reference"] = xai_nutr["clinical_trial_reference"]
        prediction["personalized_dietary_plan"] = xai_nutr["personalized_dietary_plan"]

        # Stage 6: Multilingual Packaging
        multilingual = self.stage6_multilingual_packaging(patient, prediction)
        prediction["multilingual_recommendation"] = multilingual

        return prediction

    def compare_candidate_drugs(self, raw_patient: Dict[str, Any], drug_names: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        End-to-End Multi-Drug Comparative Evaluation Pipeline:
          Input:  Raw patient dict, Optional candidate drug names
          Output: Comparative ranking, Indian pricing, dietary guidance, multilingual explanations
        """
        # Stage 1: Ingestion
        patient = self.stage1_ingest_patient(raw_patient)

        # Stage 4: Comparative Ranking
        comparison = self.stage4_comparative_ranking(patient, drug_names)

        # Stage 5 & 6: Multilingual explanations for top candidate
        best_candidate = comparison.get("recommended_drug")
        if best_candidate:
            best_pred = next((c for c in comparison.get("candidate_drugs", []) if c.get("drug_name") == best_candidate), None)
            if best_pred:
                comparison["top_recommendation_multilingual"] = generate_multilingual_recommendation(
                    best_pred, patient.get("name", "Patient")
                )

        p_issue = patient.get("current_health_issue") or "your medical condition"
        comparison["explanation_for_patient"] = generate_comparison_explanation_with_nvidia(
            patient, best_candidate or "Candidate", p_issue
        )

        return comparison

    def get_pipeline_info(self) -> Dict[str, Any]:
        """
        Returns structured metadata describing the pipeline stages, catalog size,
        and operational capabilities.
        """
        return {
            "name": "DrugAI Clinical Decision Support Pipeline",
            "version": "2.0.0",
            "status": "operational",
            "stages": [
                {"stage": 1, "name": "Patient Profile Ingestion", "description": "Demographic parsing and clinical condition standardization."},
                {"stage": 2, "name": "Safety & Contraindication Screening", "description": "Allergy cross-reactivity and disease contraindication detection."},
                {"stage": 3, "name": "Calibrated ML Prediction", "description": "Effectiveness, side-effect risk, DDI risk, and 3D organ mapping."},
                {"stage": 4, "name": "Multi-Candidate Comparison", "description": "4-drug suitability scoring with real PMBJP Jan Aushadhi pricing."},
                {"stage": 5, "name": "Explainable AI & Nutrition", "description": "Feature attribution, landmark trial citations, and tailored diet plan."},
                {"stage": 6, "name": "Multilingual Advisory", "description": "Second opinion synthesis in English, Hinglish, and Marathi."}
            ],
            "catalog_medicines_count": len(self.drug_database),
            "supported_languages": ["English", "Hinglish (Conversational Hindi)", "Marathi (Devanagari)"]
        }


# Global pipeline singleton instance
clinical_pipeline = DrugAIClinicalPipeline()

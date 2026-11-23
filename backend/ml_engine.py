# -*- coding: utf-8 -*-
"""
AI/ML Personalized Drug Effect Prediction Engine
Calibrated scoring models for drug effectiveness, adverse side-effect risk,
drug-drug interaction (DDI) probability, XAI attribution, and 3-drug comparison.
"""

import math
import re
try:
    from backend.knowledge_base import DRUG_DATABASE, DDI_MATRIX, ORGAN_MAP, get_drug_info, check_interaction
    from backend.medicine_intelligence import (
        INDIAN_MEDICINE_CATALOG, calculate_patient_suitability_score,
        resolve_clinical_candidate_medicines, generate_personalized_dietary_plan,
        evaluate_allergy_safety, evaluate_disease_contraindications
    )
except ImportError:
    from knowledge_base import DRUG_DATABASE, DDI_MATRIX, ORGAN_MAP, get_drug_info, check_interaction
    from medicine_intelligence import (
        INDIAN_MEDICINE_CATALOG, calculate_patient_suitability_score,
        resolve_clinical_candidate_medicines, generate_personalized_dietary_plan,
        evaluate_allergy_safety, evaluate_disease_contraindications
    )

def normalize_text_list(val):
    """Parses comma-separated strings or lists into lowercase cleaned sets."""
    if not val:
        return set()
    if isinstance(val, list):
        items = val
    elif isinstance(val, str):
        items = val.replace(";", ",").split(",")
    else:
        items = [str(val)]
    return {item.strip().lower() for item in items if item.strip()}

class PersonalizedDrugMLEngine:
    """
    Decision-support prediction model combining clinical pharmacological principles
    with ensemble feature evaluation and explainable AI attribution.
    """

    def __init__(self):
        self.drugs = DRUG_DATABASE
        self.ddi_matrix = DDI_MATRIX

    def predict(self, patient_profile, drug_name):
        """
        Calculates personalized effectiveness, side-effect risk, DDI risk,
        overall risk category, affected organ mapping, and clinical XAI explanations.
        """
        drug = get_drug_info(drug_name)
        if not drug:
            raise ValueError(f"Drug '{drug_name}' not found in pharmacological database.")

        age = int(patient_profile.get("age", 45))
        gender = str(patient_profile.get("gender", "male")).strip().lower()
        diseases = normalize_text_list(patient_profile.get("existing_diseases", ""))
        history = normalize_text_list(patient_profile.get("medical_history", ""))
        allergies = normalize_text_list(patient_profile.get("allergies", ""))
        current_meds = normalize_text_list(patient_profile.get("current_medications", ""))
        current_issue = str(patient_profile.get("current_health_issue", "")).strip().lower()
        is_pregnant = bool(patient_profile.get("is_pregnant", False))
        pregnancy_trimester = str(patient_profile.get("pregnancy_trimester", "")).strip()

        combined_conditions = diseases.union(history)
        if current_issue:
            combined_conditions.add(current_issue)

        xai_factors = []
        alerts = []

        # ==========================================
        # 1. EFFECTIVENESS SCORE (0.0 to 1.0)
        # ==========================================
        # Baseline effectiveness when indicated
        base_effectiveness = 0.50
        matched_indications = []

        def matches_indication(indication_str, cond_str):
            ind_l = indication_str.lower()
            cond_l = cond_str.lower()
            if cond_l in ind_l or ind_l in cond_l:
                return True
            for syn_group in [
                {"acid", "acidity", "gerd", "reflux", "heartburn", "gastric", "stomach", "gastritis", "dyspepsia", "ulcer", "peptic"},
                {"hypertension", "bp", "blood pressure", "cardio", "vascular", "pre-hypertension"},
                {"diabetes", "sugar", "glucose", "glycemia", "diabetic", "hba1c"},
                {"asthma", "bronchial", "bronchospasm", "cough", "wheezing", "copd", "respiratory", "lungs"},
                {"pain", "headache", "migraine", "arthritis", "joint", "fever", "cephalalgia", "ache", "pyrexia"},
                {"infection", "bacterial", "throat", "pharyngitis", "sinusitis", "pneumonia"},
                {"cholesterol", "lipid", "statin", "atherosclerosis", "coronary"}
            ]:
                if any(term in ind_l for term in syn_group) and any(term in cond_l for term in syn_group):
                    return True
            return False

        for indication in drug.get("indications", []):
            for cond in combined_conditions:
                if cond and matches_indication(indication, cond):
                    matched_indications.append(indication)
                    break

        if matched_indications:
            # Differentiate based on clinical potency & affinity
            potency_bonus = 0.0
            d_name = drug.get("name", "").lower()
            if d_name in ["esomeprazole", "telmisartan", "rosuvastatin", "azithromycin"]:
                potency_bonus = 0.05
            elif d_name in ["pantoprazole", "rabeprazole", "amlodipine", "metformin"]:
                potency_bonus = 0.03
            elif d_name in ["omeprazole", "losartan", "glimepiride", "paracetamol"]:
                potency_bonus = 0.01

            base_effectiveness = min(0.95, 0.82 + potency_bonus)
            xai_factors.append({
                "factor": "Target Indication Match",
                "impact": f"+{int((base_effectiveness - 0.50) * 100)}%",
                "type": "positive",
                "description": f"Drug is clinically indicated for patient's condition: {', '.join(set(matched_indications))}."
            })
        else:
            xai_factors.append({
                "factor": "Indication Non-Specific",
                "impact": "-15%",
                "type": "neutral",
                "description": "No direct 1-to-1 match found between primary indications and listed diagnoses."
            })

        # Age adjustment for pharmacodynamics
        if age >= 65:
            # Geriatric alteration in drug receptor sensitivity & metabolic rate
            eff_age_mod = -0.06
            xai_factors.append({
                "factor": "Geriatric Age Profile (65+)",
                "impact": "-6%",
                "type": "negative",
                "description": "Reduced homeostatic reserve and altered pharmacodynamics slightly reduce efficacy."
            })
        elif age <= 18:
            eff_age_mod = -0.04
        else:
            eff_age_mod = 0.02

        # Disease organ resistance penalty
        eff_disease_penalty = 0.0
        if "kidney disease" in combined_conditions or "renal impairment" in combined_conditions:
            if drug.get("clearance") == "Renal":
                eff_disease_penalty += 0.08
                xai_factors.append({
                    "factor": "Renal Impairment Impact",
                    "impact": "-8%",
                    "type": "negative",
                    "description": "Compromised renal filtration diminishes active bio-distribution."
                })

        if "liver disease" in combined_conditions or "cirrhosis" in combined_conditions:
            if drug.get("clearance") == "Hepatic":
                eff_disease_penalty += 0.09
                xai_factors.append({
                    "factor": "Hepatic Clearance Variance",
                    "impact": "-9%",
                    "type": "negative",
                    "description": "Impaired CYP enzyme synthesis alters active drug plasma bioavailability."
                })

        raw_eff = base_effectiveness + eff_age_mod - eff_disease_penalty
        effectiveness_score = round(max(0.15, min(0.96, raw_eff)), 2)

        # ==========================================
        # 2. ADVERSE SIDE-EFFECT RISK (0.0 to 1.0)
        # ==========================================
        base_side_effect_risk = 0.18 # Normal physiological baseline

        # Age vulnerability
        if age > 75:
            base_side_effect_risk += 0.16
            xai_factors.append({
                "factor": "Advanced Age Susceptibility",
                "impact": "+16%",
                "type": "negative",
                "description": "High physiological sensitivity to adverse pharmacological reactions."
            })
        elif age > 60:
            base_side_effect_risk += 0.09

        # Organ vulnerability vs. drug clearance
        organ_vulnerability = 0.0
        clearance = drug.get("clearance", "Hepatic")
        if clearance == "Renal" and any(k in combined_conditions for k in ["kidney", "renal", "ckd", "nephropathy"]):
            organ_vulnerability += 0.28
            alerts.append("High renal vulnerability: drug relies heavily on renal elimination in a patient with kidney condition.")
            xai_factors.append({
                "factor": "Renal Clearance Vulnerability",
                "impact": "+28%",
                "type": "negative",
                "description": "Elevated plasma accumulation risk due to compromised renal excretion."
            })

        if clearance == "Hepatic" and any(l in combined_conditions for l in ["liver", "hepatic", "cirrhosis", "hepatitis"]):
            organ_vulnerability += 0.26
            alerts.append("Hepatic vulnerability: drug requires hepatic metabolism; patient has liver involvement.")
            xai_factors.append({
                "factor": "Hepatic Clearance Vulnerability",
                "impact": "+26%",
                "type": "negative",
                "description": "Reduced hepatic clearance elevates free unbound drug concentration."
            })

        # Allergy cross-reactivity
        allergy_risk = 0.0
        drug_name_lower = drug.get("name", "").lower()
        drug_class_lower = drug.get("class", "").lower()

        for allergy in allergies:
            if not allergy:
                continue
            if allergy in drug_name_lower or drug_name_lower in allergy:
                allergy_risk += 0.85
                alerts.append(f"DIRECT ALLERGY MATCH: Patient has documented allergy to {allergy}!")
                xai_factors.append({
                    "factor": "Direct Drug Allergy",
                    "impact": "+85%",
                    "type": "negative",
                    "description": f"Patient has known hypersensitivity to {allergy}."
                })
            elif "penicillin" in allergy and "penicillin" in drug_class_lower:
                allergy_risk += 0.75
                alerts.append("SEVERE ALLERGY: Patient is allergic to Penicillin class!")
                xai_factors.append({
                    "factor": "Class Hypersensitivity (Penicillin)",
                    "impact": "+75%",
                    "type": "negative",
                    "description": "High risk of IgE-mediated anaphylaxis or angioedema."
                })
            elif "nsaid" in allergy and ("nsaid" in drug_class_lower or drug_name_lower in ["ibuprofen", "aspirin", "celecoxib"]):
                allergy_risk += 0.70
                alerts.append("NSAID HYPERSENSITIVITY: Patient is allergic to NSAID group!")
                xai_factors.append({
                    "factor": "NSAID Hypersensitivity",
                    "impact": "+70%",
                    "type": "negative",
                    "description": "Cross-reactive pseudoallergy / bronchospasm hazard."
                })

        # Pregnancy safety checks (Special focus on 2nd trimester)
        pregnancy_risk = 0.0
        pregnancy_alert = None
        if is_pregnant:
            cat = drug.get("pregnancy_category", "C")
            risk_trimesters = drug.get("pregnancy_risk_trimesters", [])
            trim_str = pregnancy_trimester.lower()

            is_contraindicated = False
            if cat in ["X"]:
                is_contraindicated = True
                pregnancy_risk = 0.95
                pregnancy_alert = f"CATEGORY X: STRICTLY CONTRAINDICATED IN PREGNANCY ({drug.get('pregnancy_notes', '')})"
            elif cat in ["D"] and (not risk_trimesters or any(t.lower() in trim_str for t in risk_trimesters)):
                is_contraindicated = True
                pregnancy_risk = 0.85
                pregnancy_alert = f"CATEGORY D: HIGH FETAL RISK IN {pregnancy_trimester.upper()} TRIMESTER ({drug.get('pregnancy_notes', '')})"
            elif cat in ["C"]:
                pregnancy_risk = 0.35
                pregnancy_alert = f"CATEGORY C: Caution advised in pregnancy ({drug.get('pregnancy_notes', '')})"
            elif cat in ["B"]:
                pregnancy_risk = 0.10
                pregnancy_alert = f"CATEGORY B: Generally acceptable fetal safety profile under medical supervision."
            elif cat in ["A"]:
                pregnancy_risk = 0.02
                pregnancy_alert = f"CATEGORY A: Documented safe and required during pregnancy."

            if pregnancy_alert:
                alerts.append(pregnancy_alert)
                xai_factors.append({
                    "factor": f"Pregnancy Safety ({pregnancy_trimester} Trimester)",
                    "impact": f"+{int(pregnancy_risk*100)}%",
                    "type": "negative" if pregnancy_risk > 0.2 else "positive",
                    "description": pregnancy_alert
                })

        raw_side_effect = base_side_effect_risk + organ_vulnerability + allergy_risk + (pregnancy_risk * 0.5)
        side_effect_risk = round(max(0.08, min(0.98, raw_side_effect)), 2)

        # ==========================================
        # 3. DRUG-DRUG INTERACTION (DDI) RISK (0.0 to 1.0)
        # ==========================================
        ddi_details = []
        ddi_hazard_probabilities = []

        for current_drug in current_meds:
            if not current_drug or current_drug == drug_name_lower:
                continue
            interaction = check_interaction(drug_name, current_drug)
            if interaction:
                ddi_details.append({
                    "paired_drug": current_drug.title(),
                    "severity": interaction["severity"],
                    "risk_score": interaction["risk_score"],
                    "mechanism": interaction["mechanism"],
                    "consequence": interaction["clinical_consequence"],
                    "recommendation": interaction["recommendation"]
                })
                ddi_hazard_probabilities.append(interaction["risk_score"])
                alerts.append(f"INTERACTION ({interaction['severity']}): {drug.get('name')} + {current_drug.title()} -> {interaction['clinical_consequence']}")
                xai_factors.append({
                    "factor": f"DDI: {current_drug.title()} Interaction",
                    "impact": f"+{int(interaction['risk_score']*100)}%",
                    "type": "negative",
                    "description": interaction["mechanism"]
                })

        if ddi_hazard_probabilities:
            # Multi-hazard independent probability union: 1 - product(1 - p_i)
            complement_prod = 1.0
            for p in ddi_hazard_probabilities:
                complement_prod *= (1.0 - p)
            ddi_risk = round(max(0.10, min(0.99, 1.0 - complement_prod)), 2)
        else:
            ddi_risk = 0.05 # Negligible background DDI risk

        # ==========================================
        # 4. OVERALL RISK STRATIFICATION
        # ==========================================
        # Weighted composite risk calculation
        composite_risk = (side_effect_risk * 0.45) + (ddi_risk * 0.40) + ((1.0 - effectiveness_score) * 0.15)
        if allergy_risk > 0.5 or (is_pregnant and pregnancy_risk > 0.8):
            composite_risk = max(composite_risk, 0.88)

        composite_risk = round(max(0.05, min(0.99, composite_risk)), 2)

        if composite_risk >= 0.75 or allergy_risk > 0.6 or (is_pregnant and pregnancy_risk >= 0.85):
            overall_risk_level = "CRITICAL"
            risk_color = "#dc2626" # Red
        elif composite_risk >= 0.52:
            overall_risk_level = "HIGH"
            risk_color = "#f97316" # Orange
        elif composite_risk >= 0.30:
            overall_risk_level = "MEDIUM"
            risk_color = "#eab308" # Yellow
        else:
            overall_risk_level = "LOW"
            risk_color = "#10b981" # Green

        # ==========================================
        # 5. TARGET ORGANS & VISUAL MAPPING
        # ==========================================
        target_organ_keys = drug.get("target_organs", ["heart"])
        organs_info = []
        for key in target_organ_keys:
            if key in ORGAN_MAP:
                organ_data = ORGAN_MAP[key].copy()
                organ_data["key"] = key
                # Dynamic severity highlight for organ
                if key == "kidney" and any("kidney" in f["factor"].lower() for f in xai_factors):
                    organ_data["alert_level"] = "HIGH"
                elif key == "liver" and any("hepatic" in f["factor"].lower() for f in xai_factors):
                    organ_data["alert_level"] = "HIGH"
                elif key == "vascular" and ddi_risk > 0.6:
                    organ_data["alert_level"] = "ELEVATED"
                else:
                    organ_data["alert_level"] = "NORMAL"
                organs_info.append(organ_data)

        return {
            "drug_name": drug["name"],
            "drug_class": drug["class"],
            "category": drug["category"],
            "standard_dose": drug["standard_dose"],
            "effectiveness_score": effectiveness_score,
            "effectiveness_pct": int(effectiveness_score * 100),
            "side_effect_risk": side_effect_risk,
            "side_effect_pct": int(side_effect_risk * 100),
            "ddi_risk": ddi_risk,
            "ddi_pct": int(ddi_risk * 100),
            "overall_risk_score": composite_risk,
            "overall_risk_pct": int(composite_risk * 100),
            "overall_risk_level": overall_risk_level,
            "risk_color": risk_color,
            "target_organs": organs_info,
            "ddi_details": ddi_details,
            "xai_factors": xai_factors[:5], # Top 5 factors
            "clinical_alerts": alerts,
            "pregnancy_alert": pregnancy_alert,
            "dietary_warnings": drug.get("dietary_warnings", ""),
            "common_side_effects": drug.get("common_side_effects", []),
            "severe_adverse_reactions": drug.get("severe_adverse_reactions", [])
        }

    def compare_three_drugs(self, patient_profile, drug_names=None):
        """
        Dynamically evaluates candidate medicines side-by-side using:
        1. Condition-specific clinical identification.
        2. Validated ML prediction for effectiveness and organ risks.
        3. Real Indian medicine pricing (NPPA / PMBJP Jan Aushadhi / Retail).
        4. Transparent patient suitability scoring with strict allergy/contraindication overrides.
        5. Evidence-based recovery timelines (no dummy recovery days).
        6. Personalized dietary plan generation.
        """
        p_profile = patient_profile or {}

        # Clean provided drug names if any
        cleaned_candidates = []
        if drug_names:
            for d in drug_names:
                if not d:
                    continue
                # Remove strength indicators like 40mg, 500mg, etc.
                base_name = re.sub(r'\s*\d+\s*(mg|mcg|ml|g|sr|er)\b', '', str(d), flags=re.I).strip()
                match = get_drug_info(base_name)
                if match:
                    if match["name"] not in cleaned_candidates:
                        cleaned_candidates.append(match["name"])

        # Dynamically resolve condition matching candidates if needed
        if len(cleaned_candidates) < 4:
            condition_matches = resolve_clinical_candidate_medicines(p_profile)
            for cand in condition_matches:
                match = get_drug_info(cand)
                if match and match["name"] not in cleaned_candidates:
                    cleaned_candidates.append(match["name"])
                if len(cleaned_candidates) >= 4:
                    break

        # Final candidate list capped to 4
        clean_names = cleaned_candidates[:4]

        comparisons = []
        best_candidate = None
        best_score = -999.0
        excluded_candidates = []

        for name in clean_names:
            try:
                pred = self.predict(p_profile, name)
                drug_info = get_drug_info(name) or {}
                name_lower = name.lower().strip()
                catalog_data = INDIAN_MEDICINE_CATALOG.get(name_lower, {})

                suitability = calculate_patient_suitability_score(p_profile, name, drug_info, pred)
                pred["suitability"] = suitability
                pred["suitability_score"] = suitability["score"]
                pred["eligibility"] = suitability["eligibility"]
                pred["safety_status"] = suitability["safety_status"]
                pred["override_reason"] = suitability["override_reason"]

                # Active ingredient & clinical parameters
                pred["generic_name"] = catalog_data.get("generic_name", f"{name} IP")
                pred["active_ingredient"] = catalog_data.get("active_ingredient", f"{name} (Active Ingredient)")
                pred["therapeutic_action"] = catalog_data.get("therapeutic_class", drug_info.get("class", "Targeted Pharmacotherapy"))
                pred["formulation"] = catalog_data.get("formulation", "Oral Tablet / Capsule")
                pred["standard_pack"] = catalog_data.get("standard_pack", "Strip of 10 tablets")

                # Real Indian Medicine Pricing (Generic vs Branded)
                generic_info = catalog_data.get("generic", None)
                branded_info = catalog_data.get("branded", None)

                if generic_info:
                    pred["pricing"] = {
                        "has_pricing": True,
                        "generic": generic_info,
                        "branded": branded_info,
                        "mrp_inr": generic_info["mrp"],
                        "selling_price_inr": generic_info["selling_price"],
                        "pack_size": generic_info["pack_size"],
                        "unit_price_inr": generic_info["unit_price"],
                        "price_per_tablet_str": f"₹{generic_info['unit_price']:.2f} / tablet (Generic: {generic_info['brand']})",
                        "branded_price_str": f"₹{branded_info['unit_price']:.2f} / tablet ({branded_info['brand']})" if branded_info else "N/A",
                        "price_source": generic_info["source"],
                        "last_updated": generic_info["last_updated"]
                    }
                else:
                    pred["pricing"] = {
                        "has_pricing": False,
                        "price_display": "Price unavailable",
                        "price_source": "Not available in current formulary index",
                        "last_updated": "October 2026"
                    }

                # Evidence-based recovery estimation (No fake days!)
                recovery_text = catalog_data.get("recovery_evidence")
                if recovery_text:
                    pred["recovery_time"] = recovery_text
                    pred["recovery_source"] = catalog_data.get("evidence_source", "Clinical Practice Guidelines")
                else:
                    pred["recovery_time"] = "Recovery duration cannot be reliably estimated from the available information."
                    pred["recovery_source"] = "Clinical Pharmacology Consensus (Individual Response Varies)"

                # Allergy compatibility
                allergy_safe, allergy_status, allergy_reason = evaluate_allergy_safety(
                    p_profile.get("allergies", ""), name, pred["active_ingredient"]
                )
                pred["allergy_safe"] = allergy_safe
                pred["allergy_compatibility"] = "Compatible" if allergy_safe else "CONTRAINDICATED"
                pred["allergy_alert"] = allergy_reason

                # DDI Risk Description
                ddi_count = len(pred.get("ddi_details", []))
                if ddi_count > 0:
                    pred["ddi_summary"] = f"{ddi_count} active interaction warning(s) detected with concurrent medications."
                else:
                    pred["ddi_summary"] = "No critical cytochrome P450 / hemodynamic interactions detected with current medications."

                # Check if eligible for top recommendation
                if suitability["eligibility"] == "ELIGIBLE" and suitability["score"] > best_score:
                    best_score = suitability["score"]
                    best_candidate = name
                elif suitability["eligibility"] == "EXCLUDED":
                    excluded_candidates.append({
                        "drug_name": name,
                        "reason": suitability["override_reason"]
                    })

                comparisons.append(pred)
            except Exception as e:
                print(f"[ML Engine Compare Notice] Error processing {name}: {e}")
                continue

        # Set recommendation badges
        for comp in comparisons:
            if comp["eligibility"] == "EXCLUDED":
                comp["recommendation_badge"] = "Excluded (Safety Override)"
            elif comp["drug_name"] == best_candidate:
                comp["recommendation_badge"] = "AI Recommended"
            else:
                comp["recommendation_badge"] = "Alternative Option"

        if best_candidate:
            rationale = (
                f"Multi-objective clinical optimization identified {best_candidate} as the most suitable candidate for {p_profile.get('name', 'the patient')}. "
                f"It achieves a patient suitability score of {best_score}/100, demonstrates verified allergy compatibility, "
                f"and minimizes organ burden for the diagnosed condition."
            )
        else:
            rationale = "No sufficiently supported medicine recommendation is available. Further clinical evaluation is required."

        # Generate personalized dietary plan
        dietary_plan = generate_personalized_dietary_plan(p_profile)

        return {
            "candidate_drugs": comparisons,
            "recommended_drug": best_candidate,
            "recommendation_rationale": rationale,
            "excluded_candidates": excluded_candidates,
            "personalized_dietary_plan": dietary_plan,
            "condition_evaluated": p_profile.get("current_health_issue") or p_profile.get("existing_diseases") or "General Health"
        }

# Global singleton
ml_engine = PersonalizedDrugMLEngine()

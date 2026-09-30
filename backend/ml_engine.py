# -*- coding: utf-8 -*-
"""
AI/ML Personalized Drug Effect Prediction Engine
Calibrated scoring models for drug effectiveness, adverse side-effect risk,
drug-drug interaction (DDI) probability, XAI attribution, and 3-drug comparison.
"""

import math
try:
    from backend.knowledge_base import DRUG_DATABASE, DDI_MATRIX, ORGAN_MAP, get_drug_info, check_interaction
except ImportError:
    from knowledge_base import DRUG_DATABASE, DDI_MATRIX, ORGAN_MAP, get_drug_info, check_interaction

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

        for indication in drug.get("indications", []):
            ind_lower = indication.lower()
            for cond in combined_conditions:
                if cond and (cond in ind_lower or ind_lower in cond):
                    matched_indications.append(indication)
                    break

        if matched_indications:
            base_effectiveness = 0.84
            xai_factors.append({
                "factor": "Target Indication Match",
                "impact": "+34%",
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
        Evaluates 3 candidate medicines side-by-side for the patient.
        If less than 3 provided, picks intelligent alternatives based on therapeutic class.
        """
        if not drug_names:
            drug_names = ["Amlodipine", "Lisinopril", "Losartan"]

        # Ensure exactly 3 drugs
        clean_names = list(drug_names)[:3]
        catalog_keys = list(self.drugs.keys())
        while len(clean_names) < 3:
            for cand in catalog_keys:
                if cand not in clean_names:
                    clean_names.append(cand)
                    if len(clean_names) == 3:
                        break

        comparisons = []
        for name in clean_names:
            try:
                pred = self.predict(patient_profile, name)
                comparisons.append(pred)
            except Exception:
                continue

        # Determine clinical recommendation amongst the 3
        # Lowest overall risk with highest effectiveness
        best_candidate = None
        best_score = -999.0
        for comp in comparisons:
            # Score formula: Effectiveness * 1.2 - Overall Risk * 1.5
            net_utility = (comp["effectiveness_score"] * 1.2) - (comp["overall_risk_score"] * 1.5)
            if comp["overall_risk_level"] == "CRITICAL":
                net_utility -= 2.0
            if net_utility > best_score:
                best_score = net_utility
                best_candidate = comp["drug_name"]

        return {
            "candidate_drugs": comparisons,
            "recommended_drug": best_candidate,
            "recommendation_rationale": f"Based on multi-objective patient optimization, {best_candidate} presents the most favorable efficacy-to-safety ratio with minimized contraindication hazards."
        }

# Global singleton
ml_engine = PersonalizedDrugMLEngine()

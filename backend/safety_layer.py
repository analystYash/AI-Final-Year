# -*- coding: utf-8 -*-
"""
Layer 1: Deterministic Clinical Safety Layer (Outside ML)
Evaluates hard clinical rules derived from pharmacological guidelines (FDA, BNF, Lexicomp).
These rules output safety flags and overrides that CANNOT be overridden by the machine learning model.
"""

# Teratogenic / contraindicated drugs in pregnancy (FDA Category D/X, NICE/ACOG guidelines)
PREGNANCY_CONTRAINDICATED_DRUGS = {
    "lisinopril": "ACE Inhibitor fetopathy, renal dysgenesis, skull hypoplasia",
    "losartan": "ARB fetotoxicity, oligohydramnios, neonatal renal failure",
    "atorvastatin": "HMG-CoA reductase inhibitor: cholesterol synthesis required for fetal development",
    "warfarin": "Warfarin embryopathy, nasal hypoplasia, stippled epiphyses, CNS hemorrhage",
    "ciprofloxacin": "Fluoroquinolone: cartilage toxicity and arthropathy in developing fetus",
    "methotrexate": "Dihydrofolate reductase inhibitor: multiple cranial-facial malformations",
    "valproate": "Neural tube defects, spina bifida, impaired cognitive development"
}

# Therapeutic drug class redundancy mapping
DRUG_CLASS_MAP = {
    "pantoprazole": "Proton Pump Inhibitor (PPI)",
    "omeprazole": "Proton Pump Inhibitor (PPI)",
    "esomeprazole": "Proton Pump Inhibitor (PPI)",
    "rabeprazole": "Proton Pump Inhibitor (PPI)",
    "lisinopril": "ACE Inhibitor",
    "enalapril": "ACE Inhibitor",
    "ramipril": "ACE Inhibitor",
    "losartan": "Angiotensin II Receptor Blocker (ARB)",
    "telmisartan": "Angiotensin II Receptor Blocker (ARB)",
    "valsartan": "Angiotensin II Receptor Blocker (ARB)",
    "amlodipine": "Calcium Channel Blocker (CCB)",
    "nifedipine": "Calcium Channel Blocker (CCB)",
    "atorvastatin": "Statin (HMG-CoA Reductase Inhibitor)",
    "rosuvastatin": "Statin (HMG-CoA Reductase Inhibitor)",
    "metformin": "Biguanide",
    "amoxicillin": "Penicillin Antibiotic",
    "amoxicillin-clavulanate": "Penicillin Antibiotic",
    "ampicillin": "Penicillin Antibiotic",
    "ciprofloxacin": "Fluoroquinolone Antibiotic",
    "levofloxacin": "Fluoroquinolone Antibiotic",
    "ibuprofen": "NSAID",
    "naproxen": "NSAID",
    "diclofenac": "NSAID",
    "aspirin": "Salicylate / NSAID",
    "warfarin": "Vitamin K Antagonist (Anticoagulant)",
    "paracetamol": "Analgesic & Antipyretic",
    "sertraline": "SSRI Antidepressant",
    "fluoxetine": "SSRI Antidepressant",
    "metoprolol": "Beta Blocker",
    "atenolol": "Beta Blocker"
}

# Critical organ clearance cutoffs
RENAL_CONTRAINDICATIONS = {
    "metformin": {"egfr_cutoff": 30.0, "reason": "High risk of fatal lactic acidosis when eGFR < 30 mL/min/1.73m²"},
    "ciprofloxacin": {"egfr_cutoff": 30.0, "reason": "Neurotoxicity and crystal nephropathy without 50% dose reduction"},
    "ibuprofen": {"egfr_cutoff": 45.0, "reason": "Hemodynamic acute kidney injury via afferent arteriolar vasoconstriction"},
    "lisinopril": {"egfr_cutoff": 30.0, "reason": "Risk of severe hyperkalemia and acute decline in glomerular filtration"}
}

def evaluate_safety_flags(patient, drug_name, concurrent_medications=None):
    """
    Evaluates clinical safety rules for a (patient, drug) pair.
    Returns:
      flags (list of dicts): [{"level": "CRITICAL"|"WARNING"|"INFO", "rule": str, "description": str, "override": bool}]
      is_contraindicated (bool): True if any hard clinical rule prohibits drug administration.
    """
    drug_lower = str(drug_name).strip().lower()
    flags = []
    is_contraindicated = False

    # Extract patient attributes with resilient normalization
    confirmed_allergies = [str(a).strip().lower() for a in patient.get("confirmed_allergies", [])]
    suspected_allergies = [str(a).strip().lower() for a in patient.get("suspected_allergies", [])]
    allergy_status = str(patient.get("allergy_status", "unknown")).strip().lower()

    # Normalize single allergy string if passed
    if "allergy" in patient and isinstance(patient["allergy"], str):
        raw_all = patient["allergy"].lower()
        if "penicillin" in raw_all:
            confirmed_allergies.append("amoxicillin")
            confirmed_allergies.append("penicillin")
        if "sulfa" in raw_all:
            confirmed_allergies.append("sulfa")
        if "aspirin" in raw_all:
            confirmed_allergies.append("aspirin")
            confirmed_allergies.append("ibuprofen")

    # 1. Confirmed Allergy Match (Hard Stop)
    if drug_lower in confirmed_allergies or any(a in drug_lower for a in confirmed_allergies if len(a) > 3):
        flags.append({
            "level": "CRITICAL",
            "rule": "CONFIRMED_ALLERGY",
            "description": f"CONFIRMED ALLERGY: Patient has verified anaphylaxis or severe hypersensitivity to {drug_name.upper()}. DO NOT SUGGEST.",
            "override": True
        })
        is_contraindicated = True

    # 2. Suspected Allergy Match (Review Required)
    elif drug_lower in suspected_allergies or any(a in drug_lower for a in suspected_allergies if len(a) > 3):
        flags.append({
            "level": "WARNING",
            "rule": "SUSPECTED_ALLERGY",
            "description": f"SUSPECTED ALLERGY: Prior reaction or intolerance reported for {drug_name}. Doctor review required before prescribing.",
            "override": False
        })

    # 3. Allergy Status Unknown
    if allergy_status in ["unknown", "missing", ""]:
        flags.append({
            "level": "INFO",
            "rule": "ALLERGY_STATUS_UNKNOWN",
            "description": f"Allergy status unknown: No documented allergy profile on file. Confirm patient allergy history.",
            "override": False
        })

    # 4. Pregnancy Contraindication
    is_pregnant = (
        patient.get("is_pregnant") in [1, 1.0, True, "1", "true", "yes"] or
        patient.get("pregnancy_stage") not in ["None", "none", None, ""]
    )
    if is_pregnant:
        if drug_lower in PREGNANCY_CONTRAINDICATED_DRUGS:
            reason = PREGNANCY_CONTRAINDICATED_DRUGS[drug_lower]
            flags.append({
                "level": "CRITICAL",
                "rule": "PREGNANCY_CONTRAINDICATION",
                "description": f"PREGNANCY CONTRAINDICATION: {drug_name.upper()} is teratogenic ({reason}). Contraindicated in pregnancy.",
                "override": True
            })
            is_contraindicated = True
        else:
            flags.append({
                "level": "WARNING",
                "rule": "PREGNANCY_REVIEW_NEEDED",
                "description": f"Pregnancy: Patient is pregnant ({patient.get('pregnancy_stage', 'Documented')}). Doctor review required for fetal safety profile.",
                "override": False
            })

    # 5. Duplicate Drug / Therapeutic Class Redundancy
    current_meds = concurrent_medications or patient.get("concurrent_medications") or []
    if isinstance(current_meds, str):
        current_meds = [m.strip().lower() for m in current_meds.split(",") if m.strip()]
    else:
        current_meds = [str(m).strip().lower() for m in current_meds]

    target_class = DRUG_CLASS_MAP.get(drug_lower)
    for existing in current_meds:
        if existing == drug_lower:
            flags.append({
                "level": "CRITICAL",
                "rule": "DUPLICATE_DRUG",
                "description": f"DUPLICATE DRUG: Patient is already currently prescribed {drug_name}. Avoid double dosing.",
                "override": True
            })
            is_contraindicated = True
            break
        elif target_class and DRUG_CLASS_MAP.get(existing) == target_class:
            flags.append({
                "level": "WARNING",
                "rule": "CLASS_REDUNDANCY",
                "description": f"THERAPEUTIC REDUNDANCY: Patient is already taking {existing.title()} from the same drug class ({target_class}).",
                "override": False
            })

    # 6. Organ Clearance Failure
    egfr = patient.get("egfr")
    if egfr is not None:
        try:
            egfr_val = float(egfr)
            if drug_lower in RENAL_CONTRAINDICATIONS:
                rule_info = RENAL_CONTRAINDICATIONS[drug_lower]
                if egfr_val < rule_info["egfr_cutoff"]:
                    flags.append({
                        "level": "CRITICAL",
                        "rule": "RENAL_CONTRAINDICATION",
                        "description": f"RENAL FAILURE CONTRAINDICATION: Patient eGFR ({egfr_val:.1f} mL/min) is below threshold ({rule_info['egfr_cutoff']}). {rule_info['reason']}.",
                        "override": True
                    })
                    is_contraindicated = True
        except Exception:
            pass

    return {
        "drug_name": drug_name,
        "is_contraindicated": is_contraindicated,
        "total_flags": len(flags),
        "safety_flags": flags
    }

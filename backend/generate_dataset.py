# -*- coding: utf-8 -*-
"""
Dataset Generator for Clinical Drug Pharmacology & Personalized Response Dataset
Generates realistic multi-factor clinical trial data for model training and validation.
"""

import csv
import random
import os

random.seed(42)

DRUGS = [
    {"name": "Metformin", "class": "Biguanide", "dose": 500, "clearance": "Renal", "indications": ["Diabetes Type 2", "Insulin Resistance"], "contraindications": ["Renal Impairment", "Severe Kidney Disease", "Lactic Acidosis"]},
    {"name": "Lisinopril", "class": "ACE Inhibitor", "dose": 10, "clearance": "Renal", "indications": ["Hypertension", "Heart Failure", "Post-Myocardial Infarction"], "contraindications": ["Angioedema", "Pregnancy", "Hyperkalemia", "Renal Artery Stenosis"]},
    {"name": "Amlodipine", "class": "Calcium Channel Blocker", "dose": 5, "clearance": "Hepatic", "indications": ["Hypertension", "Coronary Artery Disease", "Angina"], "contraindications": ["Severe Hypotension", "Severe Aortic Stenosis"]},
    {"name": "Atorvastatin", "class": "HMG-CoA Reductase Inhibitor", "dose": 20, "clearance": "Hepatic", "indications": ["Hyperlipidemia", "Dyslipidemia", "Cardiovascular Prevention"], "contraindications": ["Active Liver Disease", "Unexplained Persistent Transaminase Elevation", "Pregnancy"]},
    {"name": "Amoxicillin", "class": "Penicillin Antibiotic", "dose": 500, "clearance": "Renal", "indications": ["Bacterial Infection", "Streptococcal Pharyngitis", "Otitis Media", "Sinusitis"], "contraindications": ["Penicillin Allergy", "Cephalosporin Cross-Reactivity", "Mononucleosis"]},
    {"name": "Ibuprofen", "class": "NSAID", "dose": 400, "clearance": "Renal & Hepatic", "indications": ["Acute Pain", "Inflammation", "Osteoarthritis", "Fever"], "contraindications": ["Peptic Ulcer Disease", "GI Bleeding", "Severe Renal Impairment", "Third Trimester Pregnancy"]},
    {"name": "Levothyroxine", "class": "Thyroid Hormone", "dose": 50, "clearance": "Hepatic", "indications": ["Hypothyroidism", "TSH Suppression", "Thyroiditis"], "contraindications": ["Uncorrected Adrenal Insufficiency", "Acute Myocardial Infarction", "Thyrotoxicosis"]},
    {"name": "Omeprazole", "class": "Proton Pump Inhibitor", "dose": 20, "clearance": "Hepatic", "indications": ["GERD", "Gastric Ulcer", "Duodenal Ulcer", "Zollinger-Ellison"], "contraindications": ["Known PPI Hypersensitivity", "Severe Hepatic Impairment"]},
    {"name": "Warfarin", "class": "Vitamin K Antagonist", "dose": 5, "clearance": "Hepatic", "indications": ["Atrial Fibrillation", "Deep Vein Thrombosis", "Pulmonary Embolism", "Mechanical Heart Valves"], "contraindications": ["Active Major Bleeding", "Hemorrhagic Stroke", "Severe Thrombocytopenia", "Pregnancy"]},
    {"name": "Losartan", "class": "Angiotensin II Receptor Blocker", "dose": 50, "clearance": "Hepatic & Renal", "indications": ["Hypertension", "Diabetic Nephropathy", "Heart Failure"], "contraindications": ["Pregnancy", "Severe Hepatic Impairment", "Hyperkalemia"]},
    {"name": "Sertraline", "class": "SSRI Antidepressant", "dose": 50, "clearance": "Hepatic", "indications": ["Major Depressive Disorder", "Panic Disorder", "Obsessive-Compulsive Disorder", "PTSD"], "contraindications": ["Concurrent MAOI Therapy", "Pimozide Co-administration", "Known SSRI Allergy"]},
    {"name": "Ciprofloxacin", "class": "Fluoroquinolone Antibiotic", "dose": 500, "clearance": "Renal", "indications": ["Urinary Tract Infection", "Pyelonephritis", "Infectious Diarrhea", "Prostatitis"], "contraindications": ["Myasthenia Gravis", "Tendonitis / Tendon Rupture", "QT Prolongation", "Fluoroquinolone Allergy"]},
    {"name": "Paracetamol", "class": "Analgesic & Antipyretic", "dose": 500, "clearance": "Hepatic", "indications": ["Mild to Moderate Pain", "Headache", "Fever", "Osteoarthritis Pain"], "contraindications": ["Severe Hepatic Impairment", "Severe Active Liver Disease", "Chronic Alcoholism"]},
    {"name": "Metoprolol", "class": "Beta-1 Selective Blocker", "dose": 25, "clearance": "Hepatic", "indications": ["Hypertension", "Angina Pectoris", "Heart Failure", "Post-MI Cardioprotection"], "contraindications": ["Sinus Bradycardia", "Second/Third Degree Heart Block", "Cardiogenic Shock", "Severe Asthma"]},
    {"name": "Clopidogrel", "class": "P2Y12 Platelet Inhibitor", "dose": 75, "clearance": "Hepatic", "indications": ["Acute Coronary Syndrome", "Post-PCI Stent Placement", "Ischemic Stroke", "Peripheral Artery Disease"], "contraindications": ["Active Pathological Bleeding", "Severe Hepatic Impairment", "Intracranial Hemorrhage"]}
]

CONDITIONS = [
    "Hypertension", "Diabetes Type 2", "Hyperlipidemia", "GERD", "Coronary Artery Disease",
    "Hypothyroidism", "Bacterial Infection", "Acute Pain", "Major Depressive Disorder",
    "Atrial Fibrillation", "Urinary Tract Infection", "Osteoarthritis", "Asthma"
]

COMORBIDITIES = [
    "None", "Renal Impairment", "Liver Cirrhosis", "Peptic Ulcer", "Bradycardia",
    "Chronic Kidney Disease", "Mild Hepatic Steatosis", "Hypertension", "Diabetes Type 2"
]

ALLERGIES = [
    "None", "Penicillin Allergy", "Sulfa Allergy", "NSAID Allergy", "Aspirin Sensitivity"
]

MEDICATIONS = [
    "None", "Warfarin", "Lisinopril", "Ibuprofen", "Aspirin", "Omeprazole", "Metformin", "Sertraline", "Clopidogrel", "Potassium Supplements"
]

def generate_dataset(num_samples=1500, output_path="clinical_drug_dataset.csv"):
    rows = []
    
    for i in range(1, num_samples + 1):
        drug = random.choice(DRUGS)
        age = random.randint(18, 88)
        gender = random.choice(["Male", "Female"])
        
        # 65% chance the patient has one of the drug's indicated conditions
        if random.random() < 0.65:
            condition = random.choice(drug["indications"])
        else:
            condition = random.choice(CONDITIONS)
            
        comorbidity = random.choice(COMORBIDITIES)
        allergy = random.choice(ALLERGIES)
        concurrent_med = random.choice(MEDICATIONS)
        is_pregnant = (gender == "Female" and age < 50 and random.random() < 0.08)
        pregnancy_trimester = random.choice(["1st", "2nd", "3rd"]) if is_pregnant else "None"
        
        # Calculate pharmacodynamic features
        indication_match = 1 if condition in drug["indications"] else 0
        
        # Organ mismatch check
        organ_mismatch = 0
        if "Renal" in drug["clearance"] and ("Renal" in comorbidity or "Kidney" in comorbidity):
            organ_mismatch = 1
        elif "Hepatic" in drug["clearance"] and ("Liver" in comorbidity or "Hepatic" in comorbidity):
            organ_mismatch = 1
            
        # DDI risk determination
        ddi_hazard = 0
        if drug["name"] == "Warfarin" and concurrent_med in ["Ibuprofen", "Aspirin", "Omeprazole"]:
            ddi_hazard = 3
        elif drug["name"] == "Lisinopril" and concurrent_med in ["Potassium Supplements", "Ibuprofen"]:
            ddi_hazard = 2
        elif drug["name"] == "Clopidogrel" and concurrent_med in ["Omeprazole", "Aspirin"]:
            ddi_hazard = 2
        elif drug["name"] == "Sertraline" and concurrent_med in ["Warfarin", "Aspirin"]:
            ddi_hazard = 2
        elif concurrent_med != "None" and concurrent_med != drug["name"]:
            ddi_hazard = 1
            
        # Allergy hazard
        allergy_conflict = 0
        if "Penicillin" in allergy and drug["class"] == "Penicillin Antibiotic":
            allergy_conflict = 1
        elif "NSAID" in allergy and drug["class"] == "NSAID":
            allergy_conflict = 1

        # Calculate base effectiveness (0.0 to 1.0)
        eff = 0.50
        if indication_match:
            eff += 0.35
        else:
            eff -= 0.15
            
        if age >= 65:
            eff -= 0.06
        elif age <= 25:
            eff += 0.02
            
        if organ_mismatch:
            eff -= 0.12
            
        if ddi_hazard >= 2:
            eff -= 0.10
            
        if allergy_conflict:
            eff -= 0.30
            
        eff = max(0.10, min(0.96, eff + random.uniform(-0.05, 0.05)))
        
        # Calculate side effect risk (0.0 to 1.0)
        side_risk = 0.12
        if age >= 65:
            side_risk += 0.14
        if organ_mismatch:
            side_risk += 0.25
        if ddi_hazard == 3:
            side_risk += 0.35
        elif ddi_hazard == 2:
            side_risk += 0.18
        elif ddi_hazard == 1:
            side_risk += 0.06
            
        if allergy_conflict:
            side_risk += 0.50
            
        if is_pregnant and drug["name"] in ["Lisinopril", "Losartan", "Warfarin", "Ibuprofen"]:
            side_risk += 0.45
            
        side_risk = max(0.05, min(0.98, side_risk + random.uniform(-0.04, 0.04)))
        
        # Overall risk class
        if allergy_conflict or (is_pregnant and drug["name"] in ["Lisinopril", "Losartan", "Warfarin"]) or side_risk >= 0.55:
            risk_class = "CRITICAL"
        elif side_risk >= 0.35 or ddi_hazard >= 2 or organ_mismatch:
            risk_class = "HIGH"
        elif side_risk >= 0.20 or ddi_hazard == 1:
            risk_class = "MODERATE"
        else:
            risk_class = "LOW"
            
        # Clinical outcome label
        if risk_class in ["CRITICAL", "HIGH"] and side_risk > 0.50:
            outcome = "Adverse Reaction"
        elif eff >= 0.70 and side_risk < 0.35:
            outcome = "Optimal Efficacy"
        elif eff >= 0.50:
            outcome = "Moderate Response"
        else:
            outcome = "Poor Response"

        rows.append({
            "trial_id": f"CT-{10000 + i}",
            "age": age,
            "gender": gender,
            "primary_condition": condition,
            "comorbidity": comorbidity,
            "allergy": allergy,
            "concurrent_medication": concurrent_med,
            "is_pregnant": 1 if is_pregnant else 0,
            "pregnancy_trimester": pregnancy_trimester,
            "drug_name": drug["name"],
            "drug_class": drug["class"],
            "standard_dose_mg": drug["dose"],
            "clearance_pathway": drug["clearance"],
            "indication_match": indication_match,
            "organ_mismatch": organ_mismatch,
            "ddi_hazard_level": ddi_hazard,
            "allergy_conflict": allergy_conflict,
            "geriatric_flag": 1 if age >= 65 else 0,
            "effectiveness_pct": round(eff * 100, 1),
            "side_effect_pct": round(side_risk * 100, 1),
            "overall_risk_level": risk_class,
            "clinical_outcome": outcome
        })

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    print(f"Generated {len(rows)} clinical trial records at: {output_path}")

if __name__ == "__main__":
    out = os.path.join(os.path.dirname(__file__), "dataset", "clinical_drug_dataset.csv")
    generate_dataset(1500, out)

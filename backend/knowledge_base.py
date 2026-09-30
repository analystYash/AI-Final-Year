# -*- coding: utf-8 -*-
"""
Medical Knowledge Base & Pharmacological Database
Provides structured drug data, organ targets, contraindications, and DDI matrix.
"""

# Organ mapping with 3D coordinate offsets and glowing visual themes
ORGAN_MAP = {
    "heart": {
        "name": "Cardiovascular System (Heart & Vessels)",
        "color": "#ef4444", # Red
        "secondary_color": "#b91c1c",
        "coords": [0, 0.45, 0.15],
        "scale": [0.35, 0.35, 0.35],
        "mesh_type": "heart",
        "description": "Primary organ for hemodynamics, blood pressure control, and cardiac rhythm."
    },
    "kidney": {
        "name": "Renal System (Kidneys)",
        "color": "#f59e0b", # Amber/Orange
        "secondary_color": "#d97706",
        "coords": [0, 0.1, -0.08],
        "scale": [0.45, 0.3, 0.25],
        "mesh_type": "kidney",
        "description": "Crucial for drug filtration, electrolyte homeostasis, and fluid balance."
    },
    "liver": {
        "name": "Hepatic System (Liver)",
        "color": "#10b981", # Emerald
        "secondary_color": "#047857",
        "coords": [0.18, 0.2, 0.1],
        "scale": [0.4, 0.32, 0.3],
        "mesh_type": "liver",
        "description": "Major site of cytochrome P450 drug metabolism and bile secretion."
    },
    "brain": {
        "name": "Central Nervous System (Brain)",
        "color": "#8b5cf6", # Purple
        "secondary_color": "#6d28d9",
        "coords": [0, 1.35, 0],
        "scale": [0.32, 0.35, 0.32],
        "mesh_type": "brain",
        "description": "Controls neurotransmission, cognitive functions, and central autonomic regulation."
    },
    "lungs": {
        "name": "Respiratory System (Lungs & Bronchi)",
        "color": "#06b6d4", # Cyan
        "secondary_color": "#0e7490",
        "coords": [0, 0.55, 0.05],
        "scale": [0.55, 0.45, 0.3],
        "mesh_type": "lungs",
        "description": "Facilitates oxygen exchange, bronchodilation, and respiratory regulation."
    },
    "stomach": {
        "name": "Gastrointestinal System (Stomach & Gut)",
        "color": "#ec4899", # Pink
        "secondary_color": "#be185d",
        "coords": [-0.12, 0.18, 0.12],
        "scale": [0.35, 0.35, 0.25],
        "mesh_type": "stomach",
        "description": "Site of primary oral absorption, gastric acid secretion, and mucosal lining."
    },
    "vascular": {
        "name": "Peripheral Vascular System",
        "color": "#3b82f6", # Blue
        "secondary_color": "#1d4ed8",
        "coords": [0, -0.3, 0],
        "scale": [0.7, 1.2, 0.3],
        "mesh_type": "vascular",
        "description": "Regulates systemic vascular resistance and arterial tissue perfusion."
    }
}

# Curated catalog of 30+ common drugs across primary clinical domains
DRUG_DATABASE = {
    # ---------------- Cardiovascular ----------------
    "Amlodipine": {
        "class": "Calcium Channel Blocker",
        "category": "Antihypertensive",
        "standard_dose": "5 mg once daily",
        "indications": ["Hypertension", "Coronary Artery Disease", "Angina"],
        "target_organs": ["heart", "vascular"],
        "clearance": "Hepatic",
        "common_side_effects": ["Peripheral edema", "Flushing", "Dizziness", "Palpitations"],
        "severe_adverse_reactions": ["Severe hypotension", "Syncope"],
        "contraindications": ["Severe aortic stenosis", "Cardiogenic shock"],
        "pregnancy_category": "C",
        "pregnancy_risk_trimesters": ["1st", "2nd", "3rd"],
        "pregnancy_notes": "Use only if potential benefit justifies fetal risk. Monitor maternal blood pressure.",
        "dietary_warnings": "Avoid excessive grapefruit juice (increases drug concentration)."
    },
    "Lisinopril": {
        "class": "ACE Inhibitor",
        "category": "Antihypertensive",
        "standard_dose": "10 mg once daily",
        "indications": ["Hypertension", "Heart Failure", "Post-Myocardial Infarction", "Diabetic Nephropathy"],
        "target_organs": ["heart", "kidney", "vascular"],
        "clearance": "Renal",
        "common_side_effects": ["Dry persistent cough", "Dizziness", "Headache", "Hyperkalemia"],
        "severe_adverse_reactions": ["Angioedema", "Acute renal impairment"],
        "contraindications": ["History of ACE-inhibitor angioedema", "Bilateral renal artery stenosis", "Pregnancy"],
        "pregnancy_category": "D",
        "pregnancy_risk_trimesters": ["2nd", "3rd"],
        "pregnancy_notes": "CONTRAINDICATED in 2nd and 3rd trimesters. Causes fetal renal dysgenesis, oligohydramnios, and neonatal skull hypoplasia.",
        "dietary_warnings": "Avoid high potassium salt substitutes."
    },
    "Losartan": {
        "class": "Angiotensin II Receptor Blocker (ARB)",
        "category": "Antihypertensive",
        "standard_dose": "50 mg once daily",
        "indications": ["Hypertension", "Diabetic Nephropathy", "Stroke prophylaxis in HTN"],
        "target_organs": ["heart", "kidney", "vascular"],
        "clearance": "Hepatic/Renal",
        "common_side_effects": ["Dizziness", "Fatigue", "Nasal congestion", "Hyperkalemia"],
        "severe_adverse_reactions": ["Angioedema", "Renal failure in volume depletion"],
        "contraindications": ["Pregnancy", "Concomitant aliskiren in diabetics"],
        "pregnancy_category": "D",
        "pregnancy_risk_trimesters": ["2nd", "3rd"],
        "pregnancy_notes": "CONTRAINDICATED in 2nd and 3rd trimesters due to severe fetal renal harm and mortality risk.",
        "dietary_warnings": "Moderate potassium intake; avoid potassium supplements unless monitored."
    },
    "Metoprolol": {
        "class": "Beta-1 Selective Adrenergic Blocker",
        "category": "Cardiovascular",
        "standard_dose": "25-50 mg twice daily",
        "indications": ["Hypertension", "Angina", "Heart Failure", "Post-MI secondary prevention"],
        "target_organs": ["heart", "vascular"],
        "clearance": "Hepatic",
        "common_side_effects": ["Bradycardia", "Fatigue", "Dizziness", "Cold extremities"],
        "severe_adverse_reactions": ["Severe heart block", "Bronchospasm in severe asthma", "Decompensated HF"],
        "contraindications": ["Severe bradycardia (<45 bpm)", "Second/third degree AV block", "Decompensated shock"],
        "pregnancy_category": "C",
        "pregnancy_risk_trimesters": ["3rd"],
        "pregnancy_notes": "May decrease placental perfusion; monitor fetal heart rate and growth.",
        "dietary_warnings": "Take with or immediately after meals for consistent bioavailability."
    },
    "Atorvastatin": {
        "class": "HMG-CoA Reductase Inhibitor (Statin)",
        "category": "Lipid-Lowering Agent",
        "standard_dose": "20 mg at bedtime",
        "indications": ["Hypercholesterolemia", "Cardiovascular event prevention", "Atherosclerosis"],
        "target_organs": ["liver", "vascular"],
        "clearance": "Hepatic",
        "common_side_effects": ["Myalgia", "Mild gastrointestinal upset", "Headache"],
        "severe_adverse_reactions": ["Rhabdomyolysis", "Hepatotoxicity (elevated transaminases)"],
        "contraindications": ["Active liver disease", "Unexplained persistent liver enzymes", "Pregnancy"],
        "pregnancy_category": "X",
        "pregnancy_risk_trimesters": ["1st", "2nd", "3rd"],
        "pregnancy_notes": "STRICTLY CONTRAINDICATED in pregnancy. Cholesterol biosynthesis is essential for fetal development.",
        "dietary_warnings": "Avoid grapefruit and grapefruit juice in large quantities."
    },
    "Warfarin": {
        "class": "Vitamin K Antagonist",
        "category": "Anticoagulant",
        "standard_dose": "5 mg daily (titrated to INR 2.0-3.0)",
        "indications": ["Atrial Fibrillation", "Deep Vein Thrombosis", "Pulmonary Embolism", "Prosthetic Valves"],
        "target_organs": ["vascular", "liver"],
        "clearance": "Hepatic",
        "common_side_effects": ["Minor bruising", "Nosebleeds", "Bleeding gums"],
        "severe_adverse_reactions": ["Major gastrointestinal/intracranial hemorrhage", "Warfarin-induced skin necrosis"],
        "contraindications": ["Active bleeding disorders", "Severe thrombocytopenia", "Pregnancy (except high-risk mechanical valves)"],
        "pregnancy_category": "X",
        "pregnancy_risk_trimesters": ["1st", "2nd", "3rd"],
        "pregnancy_notes": "TERATOGENIC. Causes fetal warfarin syndrome (chondrodysplasia punctata) and central nervous system defects.",
        "dietary_warnings": "Maintain consistent intake of vitamin K rich green vegetables (spinach, kale)."
    },
    "Aspirin": {
        "class": "Salicylate / Antiplatelet",
        "category": "Antiplatelet / Analgesic",
        "standard_dose": "75-100 mg once daily (low dose)",
        "indications": ["CAD Prophylaxis", "Secondary stroke prevention", "Acute coronary syndrome"],
        "target_organs": ["vascular", "stomach"],
        "clearance": "Hepatic/Renal",
        "common_side_effects": ["Gastric irritation", "Heartburn", "Dyspepsia"],
        "severe_adverse_reactions": ["Peptic ulcer bleeding", "Aspirin-exacerbated respiratory disease (AERD)"],
        "contraindications": ["Active peptic ulcer", "Severe bleeding diathesis", "Children with viral illness (Reye syndrome)"],
        "pregnancy_category": "D",
        "pregnancy_risk_trimesters": ["3rd"],
        "pregnancy_notes": "High doses contraindicated in 3rd trimester (premature ductus arteriosus closure). Low dose (75-150mg) is often used for preeclampsia prophylaxis under strict OB-GYN supervision.",
        "dietary_warnings": "Take with food to minimize gastric irritation."
    },
    "Clopidogrel": {
        "class": "P2Y12 Platelet Inhibitor",
        "category": "Antiplatelet",
        "standard_dose": "75 mg once daily",
        "indications": ["Acute Coronary Syndrome", "Post-coronary stenting", "Recent Ischemic Stroke"],
        "target_organs": ["vascular"],
        "clearance": "Hepatic",
        "common_side_effects": ["Bruising", "Epistaxis", "Hematoma"],
        "severe_adverse_reactions": ["Thrombotic thrombocytopenic purpura (TTP)", "Severe hemorrhage"],
        "contraindications": ["Active pathological bleeding (peptic ulcer, intracranial bleed)"],
        "pregnancy_category": "B",
        "pregnancy_risk_trimesters": ["3rd"],
        "pregnancy_notes": "Use only if clearly needed. Discontinue 5-7 days before scheduled elective delivery or surgery.",
        "dietary_warnings": "Avoid concurrent NSAIDs or excessive alcohol."
    },
    "Furosemide": {
        "class": "Loop Diuretic",
        "category": "Diuretic",
        "standard_dose": "20-40 mg once daily morning",
        "indications": ["Edema from Heart Failure", "Renal Disease", "Cirrhosis", "Resistant Hypertension"],
        "target_organs": ["kidney", "vascular"],
        "clearance": "Renal",
        "common_side_effects": ["Frequent urination", "Hypokalemia", "Dehydration", "Orthostatic dizziness"],
        "severe_adverse_reactions": ["Severe electrolyte depletion", "Ototoxicity (at high IV doses)", "Acute interstitial nephritis"],
        "contraindications": ["Anuria", "Hypovolemia", "Severe hyponatremia/hypokalemia"],
        "pregnancy_category": "C",
        "pregnancy_risk_trimesters": ["2nd", "3rd"],
        "pregnancy_notes": "May decrease placental perfusion and maternal blood volume; monitor carefully.",
        "dietary_warnings": "May require potassium-rich foods or potassium supplementation."
    },
    "Spironolactone": {
        "class": "Potassium-Sparing Diuretic / Aldosterone Antagonist",
        "category": "Cardiovascular / Diuretic",
        "standard_dose": "25 mg once daily",
        "indications": ["Heart Failure with Reduced EF", "Resistant Hypertension", "Primary Aldosteronism", "Ascites"],
        "target_organs": ["kidney", "heart"],
        "clearance": "Hepatic",
        "common_side_effects": ["Gynecomastia", "Hyperkalemia", "Menstrual irregularities"],
        "severe_adverse_reactions": ["Life-threatening hyperkalemia", "Severe acute kidney injury"],
        "contraindications": ["Hyperkalemia (>5.0 mEq/L)", "Severe renal impairment (eGFR <30)", "Addison disease"],
        "pregnancy_category": "C",
        "pregnancy_risk_trimesters": ["2nd", "3rd"],
        "pregnancy_notes": "Anti-androgenic activity can affect male fetal sexual development.",
        "dietary_warnings": "Avoid high potassium diet and salt substitutes."
    },

    # ---------------- Endocrinology & Diabetes ----------------
    "Metformin": {
        "class": "Biguanide",
        "category": "Antidiabetic",
        "standard_dose": "500-1000 mg twice daily with meals",
        "indications": ["Type 2 Diabetes Mellitus", "Prediabetes", "PCOS"],
        "target_organs": ["liver", "stomach"],
        "clearance": "Renal",
        "common_side_effects": ["Nausea", "Diarrhea", "Abdominal discomfort", "Metallic taste"],
        "severe_adverse_reactions": ["Lactic Acidosis (rare, severe)", "Vitamin B12 deficiency (long-term)"],
        "contraindications": ["Severe renal impairment (eGFR <30 mL/min)", "Acute metabolic acidosis", "Severe hypoxia"],
        "pregnancy_category": "B",
        "pregnancy_risk_trimesters": ["1st", "2nd", "3rd"],
        "pregnancy_notes": "Commonly used in gestational diabetes when lifestyle changes alone are insufficient. Generally safe under specialist supervision.",
        "dietary_warnings": "Take strictly with meals to minimize gastrointestinal upset. Avoid excessive alcohol."
    },
    "Glimepiride": {
        "class": "Second-Generation Sulfonylurea",
        "category": "Antidiabetic",
        "standard_dose": "1-2 mg once daily before breakfast",
        "indications": ["Type 2 Diabetes Mellitus"],
        "target_organs": ["liver", "vascular"],
        "clearance": "Hepatic/Renal",
        "common_side_effects": ["Hypoglycemia", "Weight gain", "Mild nausea"],
        "severe_adverse_reactions": ["Severe prolonged hypoglycemia", "Hemolytic anemia"],
        "contraindications": ["Type 1 Diabetes", "Diabetic ketoacidosis", "Severe sulfa allergy"],
        "pregnancy_category": "C",
        "pregnancy_risk_trimesters": ["3rd"],
        "pregnancy_notes": "May cause prolonged severe neonatal hypoglycemia if used close to term.",
        "dietary_warnings": "Must not skip meals; carry rapid-acting glucose tablets or sweet candy."
    },
    "Empagliflozin": {
        "class": "SGLT2 Inhibitor",
        "category": "Antidiabetic / Cardiorenal",
        "standard_dose": "10-25 mg once daily morning",
        "indications": ["Type 2 Diabetes", "Heart Failure with preserved/reduced EF", "Chronic Kidney Disease"],
        "target_organs": ["kidney", "vascular"],
        "clearance": "Renal",
        "common_side_effects": ["Genital mycotic infections", "Increased urination", "Urinary tract infections"],
        "severe_adverse_reactions": ["Euglycemic diabetic ketoacidosis", "Fournier gangrene", "Severe hypovolemia"],
        "contraindications": ["Dialysis / End-stage renal disease", "History of serious hypersensitivity"],
        "pregnancy_category": "D",
        "pregnancy_risk_trimesters": ["2nd", "3rd"],
        "pregnancy_notes": "Avoid in 2nd and 3rd trimesters due to potential risk to fetal renal development.",
        "dietary_warnings": "Ensure adequate daily fluid intake to prevent volume depletion."
    },
    "Insulin Glargine": {
        "class": "Long-Acting Basal Insulin",
        "category": "Antidiabetic",
        "standard_dose": "10 units once daily subcutaneous at bedtime",
        "indications": ["Type 1 Diabetes", "Type 2 Diabetes uncontrolled on orals", "Gestational Diabetes"],
        "target_organs": ["liver", "vascular"],
        "clearance": "Renal/Hepatic",
        "common_side_effects": ["Mild hypoglycemia", "Injection site lipodystrophy", "Weight gain"],
        "severe_adverse_reactions": ["Severe hypoglycemia", "Hypokalemia", "Anaphylaxis (rare)"],
        "contraindications": ["Episodes of hypoglycemia", "Hypersensitivity to insulin glargine"],
        "pregnancy_category": "B",
        "pregnancy_risk_trimesters": ["1st", "2nd", "3rd"],
        "pregnancy_notes": "Gold standard therapy for glycemic control in pregnancy. Does not cross the placenta.",
        "dietary_warnings": "Maintain consistent meal schedule and monitor capillary blood glucose."
    },
    "Levothyroxine": {
        "class": "Thyroid Hormone (T4)",
        "category": "Endocrine",
        "standard_dose": "25-100 mcg once daily fasting morning",
        "indications": ["Hypothyroidism", "TSH suppression in thyroid cancer"],
        "target_organs": ["heart", "vascular"],
        "clearance": "Hepatic",
        "common_side_effects": ["Palpitations (if over-replaced)", "Insomnia", "Weight loss", "Heat intolerance"],
        "severe_adverse_reactions": ["Cardiac arrhythmias", "Exacerbation of angina pectoris"],
        "contraindications": ["Uncorrected adrenal insufficiency", "Acute myocardial infarction"],
        "pregnancy_category": "A",
        "pregnancy_risk_trimesters": ["1st", "2nd", "3rd"],
        "pregnancy_notes": "SAFE and ESSENTIAL in pregnancy. Fetal neurodevelopment requires adequate maternal T4; dose usually increases by 25-30% in 1st/2nd trimester.",
        "dietary_warnings": "Take on empty stomach 30-60 minutes before breakfast; avoid calcium/iron supplements within 4 hours."
    },

    # ---------------- Analgesics & Anti-inflammatory ----------------
    "Paracetamol": {
        "class": "Analgesic & Antipyretic",
        "category": "Analgesic",
        "standard_dose": "500-650 mg every 6-8 hours (Max 3000 mg/day)",
        "indications": ["Fever", "Mild to moderate pain", "Osteoarthritis", "Headache"],
        "target_organs": ["liver", "brain"],
        "clearance": "Hepatic",
        "common_side_effects": ["Minimal side effects at therapeutic doses", "Rare mild skin rash"],
        "severe_adverse_reactions": ["Acute hepatic necrosis (in overdose or chronic liver failure)"],
        "contraindications": ["Severe active hepatic impairment", "Severe acute hepatitis"],
        "pregnancy_category": "B",
        "pregnancy_risk_trimesters": ["1st", "2nd", "3rd"],
        "pregnancy_notes": "Safest and first-line analgesic/antipyretic across all trimesters of pregnancy at lowest effective dose.",
        "dietary_warnings": "Avoid alcohol consumption during therapy (increases hepatotoxicity risk)."
    },
    "Ibuprofen": {
        "class": "Nonsteroidal Anti-inflammatory Drug (NSAID)",
        "category": "Analgesic / Anti-inflammatory",
        "standard_dose": "400 mg every 8 hours with food",
        "indications": ["Inflammatory arthritis", "Dysmenorrhea", "Musculoskeletal pain", "Dental pain"],
        "target_organs": ["stomach", "kidney", "vascular"],
        "clearance": "Hepatic/Renal",
        "common_side_effects": ["Epigastric pain", "Dyspepsia", "Heartburn", "Nausea"],
        "severe_adverse_reactions": ["Gastric ulceration and bleeding", "Acute kidney injury", "Cardiovascular thrombosis"],
        "contraindications": ["Active gastrointestinal bleed", "Severe renal failure", "Third trimester pregnancy", "Post-CABG surgery"],
        "pregnancy_category": "D",
        "pregnancy_risk_trimesters": ["2nd", "3rd"],
        "pregnancy_notes": "CONTRAINDICATED in 2nd and 3rd trimesters. Risk of premature closure of fetal ductus arteriosus, oligohydramnios, and fetal renal dysfunction.",
        "dietary_warnings": "Always take with food or milk to minimize gastric mucosa irritation."
    },
    "Tramadol": {
        "class": "Centrally Acting Opioid / SNRI",
        "category": "Analgesic",
        "standard_dose": "50 mg every 6 hours as needed",
        "indications": ["Moderate to moderately severe pain"],
        "target_organs": ["brain", "stomach"],
        "clearance": "Hepatic/Renal",
        "common_side_effects": ["Nausea", "Dizziness", "Constipation", "Somnolence", "Dry mouth"],
        "severe_adverse_reactions": ["Respiratory depression", "Serotonin syndrome (with serotonergics)", "Seizure risk"],
        "contraindications": ["Severe respiratory depression", "Acute intoxication with sedatives", "Epilepsy uncontrolled"],
        "pregnancy_category": "C",
        "pregnancy_risk_trimesters": ["3rd"],
        "pregnancy_notes": "Chronic use in pregnancy may cause neonatal opioid withdrawal syndrome.",
        "dietary_warnings": "Do not consume alcohol. May cause significant drowsiness."
    },
    "Celecoxib": {
        "class": "COX-2 Selective NSAID",
        "category": "Analgesic / Anti-inflammatory",
        "standard_dose": "100-200 mg once or twice daily",
        "indications": ["Osteoarthritis", "Rheumatoid Arthritis", "Ankylosing Spondylitis", "Acute pain"],
        "target_organs": ["vascular", "kidney", "stomach"],
        "clearance": "Hepatic",
        "common_side_effects": ["Peripheral edema", "Abdominal pain", "Hypertension"],
        "severe_adverse_reactions": ["Myocardial infarction", "Thrombotic events", "Renal papillary necrosis"],
        "contraindications": ["Sulfa allergy", "Post-CABG pain", "Active GI ulceration", "Third trimester pregnancy"],
        "pregnancy_category": "D",
        "pregnancy_risk_trimesters": ["2nd", "3rd"],
        "pregnancy_notes": "Avoid from 20 weeks gestation onwards due to fetal kidney dysfunction and oligohydramnios.",
        "dietary_warnings": "Take with meals to enhance tolerability."
    },

    # ---------------- Respiratory ----------------
    "Salbutamol": {
        "class": "Short-Acting Beta-2 Agonist (SABA)",
        "category": "Bronchodilator",
        "standard_dose": "100-200 mcg inhaler as needed (1-2 puffs)",
        "indications": ["Acute asthma exacerbation", "COPD bronchospasm", "Exercise-induced asthma"],
        "target_organs": ["lungs", "heart"],
        "clearance": "Hepatic/Renal",
        "common_side_effects": ["Fine tremor of hands", "Tachycardia", "Palpitations", "Nervousness"],
        "severe_adverse_reactions": ["Paradoxical bronchospasm", "Severe hypokalemia", "Supraventricular tachycardia"],
        "contraindications": ["Known hypersensitivity to albuterol"],
        "pregnancy_category": "C",
        "pregnancy_risk_trimesters": ["1st"],
        "pregnancy_notes": "First choice for acute asthma rescue in pregnancy; benefits of maintaining maternal oxygenation far outweigh risks.",
        "dietary_warnings": "Avoid high caffeine intake which may exacerbate tremors."
    },
    "Montelukast": {
        "class": "Leukotriene Receptor Antagonist",
        "category": "Respiratory / Anti-asthmatic",
        "standard_dose": "10 mg once daily evening",
        "indications": ["Chronic asthma maintenance", "Allergic rhinitis", "Exercise bronchoconstriction"],
        "target_organs": ["lungs", "brain"],
        "clearance": "Hepatic",
        "common_side_effects": ["Headache", "Upper respiratory tract infection", "Abdominal pain"],
        "severe_adverse_reactions": ["Neuropsychiatric events (agitation, depression, suicidal ideation - Black Box warning)"],
        "contraindications": ["Acute asthma attack rescue (not a rescue inhaler)"],
        "pregnancy_category": "B",
        "pregnancy_risk_trimesters": [],
        "pregnancy_notes": "Generally safe when indicated for persistent asthma control in pregnancy.",
        "dietary_warnings": "Take in the evening with or without food."
    },
    "Budesonide": {
        "class": "Inhaled Corticosteroid (ICS)",
        "category": "Respiratory / Anti-inflammatory",
        "standard_dose": "200-400 mcg inhaled twice daily",
        "indications": ["Persistent bronchial asthma", "COPD maintenance", "Allergic rhinitis"],
        "target_organs": ["lungs"],
        "clearance": "Hepatic",
        "common_side_effects": ["Oral candidiasis (thrush)", "Hoarseness", "Throat irritation"],
        "severe_adverse_reactions": ["Adrenal suppression (high doses)", "Decreased bone mineral density"],
        "contraindications": ["Status asthmaticus primary treatment"],
        "pregnancy_category": "B",
        "pregnancy_risk_trimesters": [],
        "pregnancy_notes": "Preferred inhaled corticosteroid during pregnancy with the most extensive reassuring human safety data.",
        "dietary_warnings": "Rinse mouth and gargle with water after inhalation to prevent oral thrush."
    },

    # ---------------- Antibiotics & Antimicrobials ----------------
    "Amoxicillin": {
        "class": "Aminopenicillin Antibiotic",
        "category": "Antibiotic",
        "standard_dose": "500 mg every 8 hours for 5-7 days",
        "indications": ["Bacterial pharyngitis", "Otitis media", "Community acquired pneumonia", "H. pylori"],
        "target_organs": ["kidney", "stomach"],
        "clearance": "Renal",
        "common_side_effects": ["Diarrhea", "Nausea", "Mild maculopapular rash"],
        "severe_adverse_reactions": ["Anaphylaxis / Angioedema in penicillin-allergic patients", "C. difficile colitis"],
        "contraindications": ["True IgE-mediated Penicillin Allergy / Cephalosporin anaphylaxis"],
        "pregnancy_category": "B",
        "pregnancy_risk_trimesters": [],
        "pregnancy_notes": "Safe and widely prescribed during all trimesters of pregnancy.",
        "dietary_warnings": "Can be taken without regard to meals."
    },
    "Azithromycin": {
        "class": "Macrolide Antibiotic",
        "category": "Antibiotic",
        "standard_dose": "500 mg Day 1, then 250 mg daily Days 2-5",
        "indications": ["Atypical pneumonia", "Chlamydia trachomatis", "Sinusitis", "Exacerbations of COPD"],
        "target_organs": ["liver", "heart"],
        "clearance": "Hepatic/Biliary",
        "common_side_effects": ["Gastrointestinal cramping", "Diarrhea", "Nausea"],
        "severe_adverse_reactions": ["QTc prolongation & Torsades de Pointes", "Cholestatic jaundice"],
        "contraindications": ["History of cholestatic jaundice with macrolides", "Congenital long QT syndrome"],
        "pregnancy_category": "B",
        "pregnancy_risk_trimesters": [],
        "pregnancy_notes": "Second-line alternative in penicillin-allergic pregnant patients; generally safe.",
        "dietary_warnings": "Take 1 hour before or 2 hours after meals for optimal absorption."
    },
    "Ciprofloxacin": {
        "class": "Fluoroquinolone Antibiotic",
        "category": "Antibiotic",
        "standard_dose": "500 mg twice daily for 7-14 days",
        "indications": ["Complicated UTI", "Infectious diarrhea", "Bone and joint infections", "Prostatitis"],
        "target_organs": ["kidney", "brain", "heart"],
        "clearance": "Renal/Hepatic",
        "common_side_effects": ["Nausea", "Headache", "Dizziness", "Mild insomnia"],
        "severe_adverse_reactions": ["Tendon rupture (Achilles tendon)", "QTc prolongation", "Peripheral neuropathy", "Aortic aneurysm dissection"],
        "contraindications": ["Concurrent tizanidine", "Myasthenia gravis", "Pregnancy"],
        "pregnancy_category": "C",
        "pregnancy_risk_trimesters": ["1st", "2nd", "3rd"],
        "pregnancy_notes": "CONTRAINDICATED in pregnancy due to cartilage damage and arthropathy observed in immature animal studies.",
        "dietary_warnings": "Avoid dairy products or antacids containing calcium/magnesium/iron within 2 hours."
    },

    # ---------------- Gastrointestinal ----------------
    "Pantoprazole": {
        "class": "Proton Pump Inhibitor (PPI)",
        "category": "Gastrointestinal",
        "standard_dose": "40 mg once daily 30 mins before breakfast",
        "indications": ["GERD", "Peptic Ulcer Disease", "Zollinger-Ellison", "NSAID ulcer prophylaxis"],
        "target_organs": ["stomach", "liver"],
        "clearance": "Hepatic",
        "common_side_effects": ["Headache", "Diarrhea", "Flatulence", "Abdominal discomfort"],
        "severe_adverse_reactions": ["Clostridioides difficile infection", "Hypomagnesemia (long-term)", "Bone fractures"],
        "contraindications": ["Hypersensitivity to substituted benzimidazoles"],
        "pregnancy_category": "B",
        "pregnancy_risk_trimesters": [],
        "pregnancy_notes": "Commonly used for severe refractory pregnancy heartburn; acceptable safety profile.",
        "dietary_warnings": "Take 30 minutes before the first meal of the day."
    },
    "Omeprazole": {
        "class": "Proton Pump Inhibitor (PPI)",
        "category": "Gastrointestinal",
        "standard_dose": "20 mg once daily morning fasting",
        "indications": ["Duodenal/Gastric Ulcers", "Erosive Esophagitis", "GERD", "H. pylori eradication"],
        "target_organs": ["stomach", "liver"],
        "clearance": "Hepatic",
        "common_side_effects": ["Nausea", "Constipation", "Headache"],
        "severe_adverse_reactions": ["Acute interstitial nephritis", "Subacute cutaneous lupus erythematosus"],
        "contraindications": ["Concurrent rilpivirine administration"],
        "pregnancy_category": "C",
        "pregnancy_risk_trimesters": [],
        "pregnancy_notes": "Widely studied and frequently used in pregnant patients with severe acid reflux.",
        "dietary_warnings": "Take 30 to 60 minutes before breakfast."
    },

    # ---------------- Central Nervous System / Psychiatry ----------------
    "Sertraline": {
        "class": "Selective Serotonin Reuptake Inhibitor (SSRI)",
        "category": "Antidepressant / Anxiolytic",
        "standard_dose": "50 mg once daily morning",
        "indications": ["Major Depressive Disorder", "Panic Disorder", "OCD", "PTSD", "Social Anxiety"],
        "target_organs": ["brain", "stomach"],
        "clearance": "Hepatic",
        "common_side_effects": ["Nausea", "Insomnia", "Sexual dysfunction", "Tremor", "Fatigue"],
        "severe_adverse_reactions": ["Serotonin syndrome (with MAOIs)", "Suicidal ideation in young adults", "Hyponatremia (SIADH)"],
        "contraindications": ["Concurrent MAOIs or pimozide", "Hypersensitivity"],
        "pregnancy_category": "C",
        "pregnancy_risk_trimesters": ["3rd"],
        "pregnancy_notes": "Preferred first-line SSRI in pregnancy and breastfeeding. Monitor newborn for mild neonatal adaptation syndrome if used near term.",
        "dietary_warnings": "Take with breakfast to minimize nausea; avoid alcohol."
    },
    "Alprazolam": {
        "class": "Benzodiazepine",
        "category": "Anxiolytic",
        "standard_dose": "0.25-0.5 mg two to three times daily",
        "indications": ["Panic Disorder", "Generalized Anxiety Disorder (short-term)"],
        "target_organs": ["brain"],
        "clearance": "Hepatic",
        "common_side_effects": ["Sedation", "Drowsiness", "Ataxia", "Cognitive slowing"],
        "severe_adverse_reactions": ["Respiratory depression", "Dependence & severe withdrawal seizures", "Paradoxical agitation"],
        "contraindications": ["Acute narrow-angle glaucoma", "Severe respiratory insufficiency", "Sleep apnea"],
        "pregnancy_category": "D",
        "pregnancy_risk_trimesters": ["1st", "2nd", "3rd"],
        "pregnancy_notes": "HIGH RISK in pregnancy. First-trimester cleft lip/palate risk; third-trimester 'floppy infant syndrome' and neonatal withdrawal.",
        "dietary_warnings": "Strictly avoid alcohol and CNS depressants. Never drive after dose."
    }
}

# Explicit Drug-Drug Interaction (DDI) Matrix
# Key format: sorted tuple of lowercase drug names
DDI_MATRIX = {
    ("aspirin", "warfarin"): {
        "severity": "CRITICAL",
        "risk_score": 0.88,
        "mechanism": "Synergistic inhibition of coagulation cascade and platelet aggregation.",
        "clinical_consequence": "Markedly elevated risk of major gastrointestinal and intracranial hemorrhage.",
        "recommendation": "Avoid combination unless strictly indicated by cardiologist with gastroprotection and intensive INR monitoring."
    },
    ("ibuprofen", "lisinopril"): {
        "severity": "HIGH",
        "risk_score": 0.76,
        "mechanism": "NSAIDs inhibit renal vasodilatory prostaglandins, opposing ACE-inhibitor afferent/efferent arteriolar balance.",
        "clinical_consequence": "Acute hemodynamic renal failure, marked blunting of antihypertensive effect, and hyperkalemia.",
        "recommendation": "Replace ibuprofen with paracetamol for pain control. If NSAID essential, monitor renal function (Cr, eGFR) and potassium closely."
    },
    ("ibuprofen", "losartan"): {
        "severity": "HIGH",
        "risk_score": 0.74,
        "mechanism": "Prostaglandin inhibition diminishes ARB vasodilation and compromises renal perfusion.",
        "clinical_consequence": "Significant loss of BP control and risk of acute kidney injury.",
        "recommendation": "Use paracetamol as safer analgesic alternative."
    },
    ("lisinopril", "spironolactone"): {
        "severity": "HIGH",
        "risk_score": 0.78,
        "mechanism": "Dual aldosterone and RAAS inhibition severely impairs renal potassium excretion.",
        "clinical_consequence": "Severe life-threatening hyperkalemia and ventricular arrhythmias.",
        "recommendation": "Frequent monitoring of serum potassium and creatinine within 1-2 weeks of initiation; limit dietary potassium."
    },
    ("losartan", "spironolactone"): {
        "severity": "HIGH",
        "risk_score": 0.75,
        "mechanism": "Combined potassium-sparing effects.",
        "clinical_consequence": "Hyperkalemia and renal decompensation.",
        "recommendation": "Check baseline serum potassium and monitor regularly."
    },
    ("clopidogrel", "omeprazole"): {
        "severity": "MODERATE",
        "risk_score": 0.62,
        "mechanism": "Omeprazole competitive inhibition of CYP2C19 impairs bioactivation of clopidogrel prodrug.",
        "clinical_consequence": "Reduced antiplatelet effectiveness; increased risk of recurrent ischemic events or stent thrombosis.",
        "recommendation": "Switch PPI to pantoprazole, which has minimal CYP2C19 inhibitory liability."
    },
    ("atorvastatin", "clarithromycin"): {
        "severity": "HIGH",
        "risk_score": 0.80,
        "mechanism": "Strong CYP3A4 inhibition elevates atorvastatin plasma AUC by >4-fold.",
        "clinical_consequence": "Severe myopathy and rhabdomyolysis.",
        "recommendation": "Temporarily hold atorvastatin during macrolide therapy or use azithromycin."
    },
    ("ciprofloxacin", "warfarin"): {
        "severity": "HIGH",
        "risk_score": 0.79,
        "mechanism": "Fluoroquinolones inhibit CYP1A2 and alter gut flora synthesizing vitamin K.",
        "clinical_consequence": "Dangerous elevation in INR, bleeding diathesis.",
        "recommendation": "Monitor INR within 48-72 hours; expect 25-50% warfarin dose reduction."
    },
    ("metformin", "ciprofloxacin"): {
        "severity": "MODERATE",
        "risk_score": 0.55,
        "mechanism": "Fluoroquinolones interfere with glucose homeostasis (both hypo and hyperglycemia).",
        "clinical_consequence": "Erratic blood sugar swings.",
        "recommendation": "Instruct patient to test capillary blood glucose more frequently."
    },
    ("sertraline", "tramadol"): {
        "severity": "CRITICAL",
        "risk_score": 0.85,
        "mechanism": "Dual serotonergic enhancement via reuptake inhibition plus opioid serotonin release.",
        "clinical_consequence": "Serotonin Syndrome (hyperthermia, clonus, autonomic instability, delirium).",
        "recommendation": "Avoid combination. Choose non-serotonergic analgesic (paracetamol, topical NSAID)."
    },
    ("metoprolol", "amlodipine"): {
        "severity": "LOW",
        "risk_score": 0.28,
        "mechanism": "Complementary antihypertensive mechanisms (vasodilation + beta blockade).",
        "clinical_consequence": "Usually synergistic and beneficial; mild additive bradycardia or hypotension risk.",
        "recommendation": "Standard clinical combination; check blood pressure and resting pulse."
    },
    ("furosemide", "lisinopril"): {
        "severity": "LOW",
        "risk_score": 0.32,
        "mechanism": "Volume depletion enhances RAAS sensitivity.",
        "clinical_consequence": "Initial dose hypotension risk.",
        "recommendation": "Ensure patient is euvolemic before initiating ACE inhibitor; monitor BP."
    },
    ("furosemide", "ibuprofen"): {
        "severity": "HIGH",
        "risk_score": 0.72,
        "mechanism": "NSAID inhibition of renal prostaglandins opposes loop diuretic natriuresis.",
        "clinical_consequence": "Refractory edema, heart failure worsening, renal injury.",
        "recommendation": "Avoid NSAIDs in heart failure or volume overload states."
    },
    ("aspirin", "ibuprofen"): {
        "severity": "MODERATE",
        "risk_score": 0.65,
        "mechanism": "Ibuprofen competitively blocks the COX-1 active site, preventing irreversible aspirin acetylation.",
        "clinical_consequence": "Loss of cardioprotective antiplatelet effect and increased gastric mucosal ulceration.",
        "recommendation": "Take aspirin at least 30 minutes before ibuprofen or 8 hours after."
    }
}

def get_drug_info(drug_name):
    """Retrieve drug information safely with case insensitivity."""
    if not drug_name:
        return None
    for name, info in DRUG_DATABASE.items():
        if name.lower() == drug_name.strip().lower():
            return {"name": name, **info}
    return None

def check_interaction(drug1, drug2):
    """Check pairwise drug interaction."""
    if not drug1 or not drug2:
        return None
    pair = tuple(sorted([drug1.strip().lower(), drug2.strip().lower()]))
    return DDI_MATRIX.get(pair, None)

# -*- coding: utf-8 -*-
"""
SQLite Database Layer
Stores patient profiles, multi-doctor associations, centralized consultations,
prescriptions with ongoing tracking status, appointments, and OTP authentication sessions.
Includes realistic clinical seed data for demonstration.
"""

import sqlite3
import json
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), "drug_ai.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Patients table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT NOT NULL,
        contact_number TEXT UNIQUE NOT NULL,
        medical_history TEXT,
        existing_diseases TEXT,
        allergies TEXT,
        current_health_issue TEXT,
        current_medications TEXT,
        is_pregnant INTEGER DEFAULT 0,
        pregnancy_trimester TEXT,
        blood_group TEXT DEFAULT 'O+',
        emergency_contact TEXT DEFAULT '',
        address TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Dynamic Column Migration for patients table
    cursor.execute("PRAGMA table_info(patients)")
    existing_patient_cols = [c["name"] for c in cursor.fetchall()]
    needed_patient_cols = {
        "blood_group": "TEXT DEFAULT 'O+'",
        "emergency_contact": "TEXT DEFAULT ''",
        "address": "TEXT DEFAULT ''"
    }
    for col, col_def in needed_patient_cols.items():
        if col not in existing_patient_cols:
            try:
                cursor.execute(f"ALTER TABLE patients ADD COLUMN {col} {col_def}")
            except Exception:
                pass

    # 2. Prescriptions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS prescriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        patient_name TEXT,
        patient_contact TEXT,
        drug_name TEXT NOT NULL,
        dosage TEXT,
        effectiveness_pct INTEGER,
        side_effect_pct INTEGER,
        ddi_pct INTEGER,
        overall_risk TEXT,
        target_organs TEXT,
        multilingual_notes TEXT,
        clinical_alerts TEXT,
        doctor_notes TEXT,
        xai_factors TEXT,
        dietary_warnings TEXT,
        full_prediction_json TEXT,
        doctor_id INTEGER DEFAULT 1,
        doctor_name TEXT DEFAULT 'Dr. Sharma, MD',
        doctor_specialization TEXT DEFAULT 'Cardiology & Internal Medicine',
        doctor_hospital TEXT DEFAULT 'Apex Multispecialty Hospital',
        frequency TEXT DEFAULT 'Once daily',
        start_date TEXT DEFAULT '',
        end_date TEXT DEFAULT '',
        instructions TEXT DEFAULT 'Take with water after meals',
        status TEXT DEFAULT 'active',
        discontinued_reason TEXT DEFAULT '',
        status_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients (id)
    );
    """)

    # Dynamic Column Migration for prescriptions table
    cursor.execute("PRAGMA table_info(prescriptions)")
    existing_rx_cols = [c["name"] for c in cursor.fetchall()]
    needed_rx_cols = {
        "xai_factors": "TEXT",
        "dietary_warnings": "TEXT",
        "full_prediction_json": "TEXT",
        "doctor_id": "INTEGER DEFAULT 1",
        "doctor_name": "TEXT DEFAULT 'Dr. Sharma, MD'",
        "doctor_specialization": "TEXT DEFAULT 'Cardiology & Internal Medicine'",
        "doctor_hospital": "TEXT DEFAULT 'Apex Multispecialty Hospital'",
        "frequency": "TEXT DEFAULT 'Once daily'",
        "start_date": "TEXT DEFAULT ''",
        "end_date": "TEXT DEFAULT ''",
        "instructions": "TEXT DEFAULT 'Take with water after meals'",
        "status": "TEXT DEFAULT 'active'",
        "discontinued_reason": "TEXT DEFAULT ''",
        "status_updated_at": "TIMESTAMP"
    }
    for col, col_type in needed_rx_cols.items():
        if col not in existing_rx_cols:
            try:
                cursor.execute(f"ALTER TABLE prescriptions ADD COLUMN {col} {col_type}")
            except Exception:
                pass

    # 3. OTP authentication sessions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS otp_sessions (
        contact_number TEXT PRIMARY KEY,
        otp TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_verified INTEGER DEFAULT 0
    );
    """)

    # 4. Multi-Doctor Patient Associations table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS patient_doctor_associations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        doctor_id INTEGER NOT NULL,
        doctor_name TEXT NOT NULL,
        doctor_specialization TEXT,
        doctor_hospital TEXT,
        relationship_type TEXT DEFAULT 'treating',
        access_permission TEXT DEFAULT 'full',
        consent_status TEXT DEFAULT 'granted',
        notes TEXT,
        associated_since TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_interaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients (id),
        UNIQUE(patient_id, doctor_id)
    );
    """)

    # 5. Centralized Consultations table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS consultations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        doctor_id INTEGER NOT NULL,
        doctor_name TEXT NOT NULL,
        doctor_specialization TEXT,
        hospital_name TEXT,
        consultation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        diagnosis TEXT NOT NULL,
        symptoms TEXT,
        treatment_notes TEXT,
        clinical_summary TEXT,
        vital_signs TEXT,
        medical_reports TEXT,
        prescription_ids TEXT,
        follow_up_date TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients (id)
    );
    """)

    # 6. Appointments table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        patient_name TEXT NOT NULL,
        patient_contact TEXT,
        doctor_id INTEGER NOT NULL,
        doctor_name TEXT NOT NULL,
        doctor_specialization TEXT,
        appointment_date TEXT NOT NULL,
        appointment_time TEXT NOT NULL,
        reason TEXT,
        status TEXT DEFAULT 'confirmed',
        type TEXT DEFAULT 'In-Person Consultation',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients (id)
    );
    """)

    conn.commit()

    # Seed Initial Multi-Doctor, Consultation, Medication and Appointment data
    seed_initial_clinical_data(conn)

    conn.commit()
    conn.close()

def seed_initial_clinical_data(conn):
    """Populates realistic multi-doctor relationships, chronological consultations, and medication states."""
    cursor = conn.cursor()

    # Check existing patients
    cursor.execute("SELECT id, name, contact_number, current_health_issue, existing_diseases, allergies FROM patients")
    patients = cursor.fetchall()
    if not patients:
        return

    patient_by_contact = {p["contact_number"]: p for p in patients}

    # ----------------------------------------------------
    # Seed 1: Associations between Doctors and Patients
    # ----------------------------------------------------
    cursor.execute("SELECT COUNT(*) FROM patient_doctor_associations")
    if cursor.fetchone()[0] == 0:
        # Dr. Sharma (1): Cardiologist & Internist
        # Dr. Yash Kadhane (2): Consultant Physician
        # Dr. Ananya Iyer (3): Gastroenterologist & Hepatologist
        # Dr. Priya Nair (4): Pulmonologist & Critical Care

        # Rahul Verma (9876543210)
        p_rahul = patient_by_contact.get("9876543210")
        if p_rahul:
            p_id = p_rahul["id"]
            cursor.execute("""
            INSERT OR IGNORE INTO patient_doctor_associations
            (patient_id, doctor_id, doctor_name, doctor_specialization, doctor_hospital, relationship_type, access_permission, consent_status, notes, associated_since, last_interaction)
            VALUES
            (?, 1, 'Dr. Sharma, MD', 'Cardiology & Internal Medicine', 'Apex Multispecialty Hospital', 'treating', 'full', 'granted', 'Primary attending physician for acid-peptic disease and blood pressure monitoring.', '2026-09-01 09:30:00', '2026-10-01 12:30:00'),
            (?, 3, 'Dr. Ananya Iyer, MD', 'Gastroenterology & Hepatology', 'City Health Medical Center', 'consulting', 'full', 'granted', 'Consulting gastroenterologist for refractory dyspepsia and endoscopic evaluation.', '2026-06-10 11:00:00', '2026-06-15 14:15:00'),
            (?, 2, 'Dr. Yash Kadhane', 'Cardiology & Internal Medicine', 'Apex Multispecialty Hospital', 'previous', 'view_only', 'granted', 'Initial primary care evaluation and baseline cardiac profile consultation.', '2025-11-15 10:00:00', '2025-11-20 16:45:00')
            """, (p_id, p_id, p_id))

        # Anjali Deshmukh (9811223344)
        p_anjali = patient_by_contact.get("9811223344")
        if p_anjali:
            p_id = p_anjali["id"]
            cursor.execute("""
            INSERT OR IGNORE INTO patient_doctor_associations
            (patient_id, doctor_id, doctor_name, doctor_specialization, doctor_hospital, relationship_type, access_permission, consent_status, notes, associated_since, last_interaction)
            VALUES
            (?, 1, 'Dr. Sharma, MD', 'Cardiology & Internal Medicine', 'Apex Multispecialty Hospital', 'treating', 'full', 'granted', 'Attending physician overseeing systemic hypertension management.', '2026-09-15 10:00:00', '2026-09-22 17:20:00'),
            (?, 4, 'Dr. Priya Nair, MD', 'Pulmonology & Critical Care', 'Metro Care Clinic', 'consulting', 'full', 'granted', 'Co-managing bronchial asthma and respiratory inhaler therapy.', '2026-04-05 14:00:00', '2026-04-10 11:30:00'),
            (?, 2, 'Dr. Yash Kadhane', 'Cardiology & Internal Medicine', 'Apex Multispecialty Hospital', 'previous', 'view_only', 'granted', 'Annual preventive health checkup and metabolic screening.', '2025-08-20 09:00:00', '2025-08-20 10:15:00')
            """, (p_id, p_id, p_id))

        # Rahane mam (1234567890)
        p_rahane = patient_by_contact.get("1234567890")
        if p_rahane:
            p_id = p_rahane["id"]
            cursor.execute("""
            INSERT OR IGNORE INTO patient_doctor_associations
            (patient_id, doctor_id, doctor_name, doctor_specialization, doctor_hospital, relationship_type, access_permission, consent_status, notes, associated_since, last_interaction)
            VALUES
            (?, 1, 'Dr. Sharma, MD', 'Cardiology & Internal Medicine', 'Apex Multispecialty Hospital', 'treating', 'full', 'granted', 'Primary physician for acute cephalalgia and pain management.', '2026-10-14 09:00:00', '2026-10-14 09:20:00'),
            (?, 2, 'Dr. Yash Kadhane', 'Cardiology & Internal Medicine', 'Apex Multispecialty Hospital', 'consulting', 'full', 'granted', 'Second opinion consultation for tension headache contraindication screening.', '2026-10-14 11:00:00', '2026-10-14 11:30:00')
            """, (p_id, p_id))

    # ----------------------------------------------------
    # Seed 2: Centralized Consultations (Chronological History)
    # ----------------------------------------------------
    cursor.execute("SELECT COUNT(*) FROM consultations")
    if cursor.fetchone()[0] == 0:
        p_rahul = patient_by_contact.get("9876543210")
        if p_rahul:
            p_id = p_rahul["id"]
            # Consultation 1: Dr. Sharma (Most recent: 2026-10-01)
            vitals_1 = json.dumps({"bp": "126/82 mmHg", "pulse": "76 bpm", "temp": "98.4 F", "spo2": "99%", "weight": "71 kg"})
            reports_1 = json.dumps([
                {"title": "Upper GI Video Endoscopy", "date": "2026-09-28", "type": "Diagnostic Imaging", "findings": "Mild patchy erythematous mucosal change in the gastric antrum. No active ulceration or Barrett's esophagus.", "facility": "Apex Endoscopy Suite"},
                {"title": "Rapid Urease Test (H. pylori)", "date": "2026-09-28", "type": "Biopsy Pathology", "findings": "Negative for Helicobacter pylori colonization.", "facility": "Apex Pathology Lab"}
            ])
            cursor.execute("""
            INSERT INTO consultations
            (patient_id, doctor_id, doctor_name, doctor_specialization, hospital_name, consultation_date, diagnosis, symptoms, treatment_notes, clinical_summary, vital_signs, medical_reports, follow_up_date)
            VALUES (?, 1, 'Dr. Sharma, MD', 'Cardiology & Internal Medicine', 'Apex Multispecialty Hospital', '2026-10-01 12:25:00',
            'Severe Gastroesophageal Reflux Disease (GERD) with Acute Gastric Mucosal Irritation',
            'Severe epigastric burning, retrosternal chest pain radiating to throat, nocturnal acid regurgitation',
            'Commenced Pantoprazole 40mg once daily 30 minutes before breakfast for 10 days. Advised avoidance of late meals, caffeinated beverages, and citrus foods.',
            'Patient presented with acute exacerbation of reflux symptoms following irregular dietary habits. Endoscopy demonstrates mild antral erythema without erosion. Commenced proton pump inhibitor with high predicted therapeutic index.',
            ?, ?, '2026-10-15')
            """, (p_id, vitals_1, reports_1))

            # Consultation 2: Dr. Ananya Iyer (Earlier: 2026-06-15)
            vitals_2 = json.dumps({"bp": "122/80 mmHg", "pulse": "74 bpm", "temp": "98.6 F", "spo2": "98%", "weight": "72 kg"})
            reports_2 = json.dumps([
                {"title": "Abdominal Ultrasound (Whole Abdomen)", "date": "2026-06-12", "type": "Radiological Scan", "findings": "Liver normal in size and echotexture. Gallbladder thin-walled with no calculi. Pancreas, spleen and bilateral kidneys unremarkable.", "facility": "City Health Imaging"}
            ])
            cursor.execute("""
            INSERT INTO consultations
            (patient_id, doctor_id, doctor_name, doctor_specialization, hospital_name, consultation_date, diagnosis, symptoms, treatment_notes, clinical_summary, vital_signs, medical_reports, follow_up_date)
            VALUES (?, 3, 'Dr. Ananya Iyer, MD', 'Gastroenterology & Hepatology', 'City Health Medical Center', '2026-06-15 14:15:00',
            'Chronic Functional Dyspepsia with Non-Ulcer Acid Sensitivity',
            'Postprandial bloating, early satiety, intermittent dull epigastric discomfort',
            'Prescribed Rabeprazole 20mg + Domperidone 30mg SR for 14 days. Emphasized stress reduction techniques and smaller frequent meals.',
            'Initial gastroenterology evaluation for functional dyspepsia. Normal abdominal ultrasound ruling out biliary/pancreatic etiology. Symptomatic relief noted on prokinetic PPI regimen.',
            ?, ?, '2026-06-30')
            """, (p_id, vitals_2, reports_2))

            # Consultation 3: Dr. Yash Kadhane (Past: 2025-11-20)
            vitals_3 = json.dumps({"bp": "134/86 mmHg", "pulse": "82 bpm", "temp": "98.6 F", "spo2": "99%", "weight": "73 kg"})
            reports_3 = json.dumps([
                {"title": "Routine Metabolic & Lipid Profile", "date": "2025-11-18", "type": "Biochemistry", "findings": "Fasting Blood Sugar: 94 mg/dL. Total Cholesterol: 188 mg/dL. Serum Creatinine: 0.9 mg/dL. LFT within normal limits.", "facility": "Apex Diagnostics"}
            ])
            cursor.execute("""
            INSERT INTO consultations
            (patient_id, doctor_id, doctor_name, doctor_specialization, hospital_name, consultation_date, diagnosis, symptoms, treatment_notes, clinical_summary, vital_signs, medical_reports, follow_up_date)
            VALUES (?, 2, 'Dr. Yash Kadhane', 'Cardiology & Internal Medicine', 'Apex Multispecialty Hospital', '2025-11-20 16:45:00',
            'Pre-Hypertension & Mild Work-Related Cephalalgia',
            'Occasional evening frontal headaches, elevated office blood pressure readings',
            'Counselled on dietary salt restriction (DASH diet), 30 minutes of aerobic exercise 5 days/week, and home BP log recording.',
            'Young adult with border-line elevated blood pressure in the setting of occupational stress. Advised structured lifestyle interventions before pharmacotherapy initiation.',
            ?, ?, '2025-12-20')
            """, (p_id, vitals_3, reports_3))

        # Anjali Deshmukh (9811223344)
        p_anjali = patient_by_contact.get("9811223344")
        if p_anjali:
            p_id = p_anjali["id"]
            # Consultation 1: Dr. Sharma (2026-09-22)
            vitals_a1 = json.dumps({"bp": "142/90 mmHg", "pulse": "78 bpm", "temp": "98.4 F", "spo2": "98%", "weight": "62 kg"})
            reports_a1 = json.dumps([
                {"title": "12-Lead Resting Electrocardiogram (ECG)", "date": "2026-09-22", "type": "Cardiology", "findings": "Normal sinus rhythm, rate 78 bpm. No ST-T deviations or left ventricular hypertrophy pattern.", "facility": "Apex Cardiac Care"}
            ])
            cursor.execute("""
            INSERT INTO consultations
            (patient_id, doctor_id, doctor_name, doctor_specialization, hospital_name, consultation_date, diagnosis, symptoms, treatment_notes, clinical_summary, vital_signs, medical_reports, follow_up_date)
            VALUES (?, 1, 'Dr. Sharma, MD', 'Cardiology & Internal Medicine', 'Apex Multispecialty Hospital', '2026-09-22 17:18:35',
            'Stage-1 Essential Hypertension in Bronchial Asthma Patient',
            'Persistently elevated blood pressure readings (142/90 mmHg), mild occipital fullness',
            'Started Amlodipine 5mg once daily morning. Note: Beta-blockers strictly avoided due to documented bronchial asthma history.',
            'Hypertensive patient with mild asthma. Calcium channel blocker selected as first-line agent to avoid bronchospasm hazard. Blood pressure target < 130/80 mmHg.',
            ?, ?, '2026-10-22')
            """, (p_id, vitals_a1, reports_a1))

            # Consultation 2: Dr. Priya Nair (2026-04-10)
            vitals_a2 = json.dumps({"bp": "124/82 mmHg", "pulse": "84 bpm", "temp": "98.6 F", "spo2": "97%", "weight": "61 kg"})
            reports_a2 = json.dumps([
                {"title": "Spirometry & Pulmonary Function Test", "date": "2026-04-08", "type": "Respiratory Physiology", "findings": "FEV1/FVC ratio 74%. Significant bronchodilator reversibility (+14% post-salbutamol inhalation).", "facility": "Metro Care Pulmonology"}
            ])
            cursor.execute("""
            INSERT INTO consultations
            (patient_id, doctor_id, doctor_name, doctor_specialization, hospital_name, consultation_date, diagnosis, symptoms, treatment_notes, clinical_summary, vital_signs, medical_reports, follow_up_date)
            VALUES (?, 4, 'Dr. Priya Nair, MD', 'Pulmonology & Critical Care', 'Metro Care Clinic', '2026-04-10 11:30:00',
            'Mild Persistent Bronchial Asthma (Allergic Phenotype)',
            'Exertional wheezing, nocturnal dry cough triggered by cold air and dust exposure',
            'Prescribed Salbutamol 100mcg MDI (2 puffs PRN for acute bronchospasm) + Budesonide inhaler 200mcg twice daily.',
            'Confirmed reversible obstructive airways disease. Patient demonstrated correct inhaler spacer technique. Allergen avoidance counseling provided.',
            ?, ?, '2026-07-10')
            """, (p_id, vitals_a2, reports_a2))

    # ----------------------------------------------------
    # Seed 3: Enrich Existing Prescriptions & Add Medication Tracking Records
    # ----------------------------------------------------
    # Ensure existing prescriptions have valid doctor details and statuses
    cursor.execute("""
    UPDATE prescriptions SET
        doctor_id = 1,
        doctor_name = 'Dr. Sharma, MD',
        doctor_specialization = 'Cardiology & Internal Medicine',
        doctor_hospital = 'Apex Multispecialty Hospital',
        frequency = COALESCE(NULLIF(frequency, ''), 'Once daily (Before Breakfast)'),
        start_date = COALESCE(NULLIF(start_date, ''), strftime('%Y-%m-%d', created_at)),
        end_date = COALESCE(NULLIF(end_date, ''), date(created_at, '+10 days')),
        instructions = COALESCE(NULLIF(instructions, ''), 'Take 30 mins before breakfast with plain water.'),
        status = 'active'
    WHERE drug_name LIKE '%Pantoprazole%' AND (status IS NULL OR status = '' OR status = 'active')
    """)

    cursor.execute("""
    UPDATE prescriptions SET
        doctor_id = 1,
        doctor_name = 'Dr. Sharma, MD',
        doctor_specialization = 'Cardiology & Internal Medicine',
        doctor_hospital = 'Apex Multispecialty Hospital',
        frequency = COALESCE(NULLIF(frequency, ''), 'Once daily (Morning)'),
        start_date = COALESCE(NULLIF(start_date, ''), strftime('%Y-%m-%d', created_at)),
        end_date = COALESCE(NULLIF(end_date, ''), 'Ongoing (Long-term)'),
        instructions = COALESCE(NULLIF(instructions, ''), 'Take after morning breakfast with water.'),
        status = 'active'
    WHERE drug_name LIKE '%Amlodipine%' AND (status IS NULL OR status = '' OR status = 'active')
    """)

    # Seed distinct Completed, Discontinued, and Historical prescriptions for Rahul Verma to illustrate multi-doctor medication tracking
    p_rahul = patient_by_contact.get("9876543210")
    if p_rahul:
        p_id = p_rahul["id"]
        cursor.execute("SELECT COUNT(*) FROM prescriptions WHERE patient_id = ? AND status IN ('completed', 'discontinued')", (p_id,))
        if cursor.fetchone()[0] == 0:
            # 1. Completed prescription from Dr. Ananya Iyer (Gastroenterology)
            cursor.execute("""
            INSERT INTO prescriptions (
                patient_id, patient_name, patient_contact, drug_name, dosage,
                effectiveness_pct, side_effect_pct, ddi_pct, overall_risk,
                target_organs, multilingual_notes, clinical_alerts, doctor_notes,
                doctor_id, doctor_name, doctor_specialization, doctor_hospital,
                frequency, start_date, end_date, instructions, status, discontinued_reason, created_at
            ) VALUES (
                ?, 'Rahul Verma', '9876543210', 'Rabeprazole', '20 mg once daily',
                84, 14, 6, 'LOW',
                '["Stomach", "Esophagus"]', '{}', '[]', 'Completed full 14-day therapeutic course for acid peptic disorder.',
                3, 'Dr. Ananya Iyer, MD', 'Gastroenterology & Hepatology', 'City Health Medical Center',
                'Once daily (Before Breakfast)', '2026-06-15', '2026-06-29', 'Take 30 mins before morning meal.',
                'completed', '', '2026-06-15 14:15:00'
            )
            """, (p_id,))

            # 2. Discontinued prescription from Dr. Yash Kadhane (Allergy conflict: Penicillin sensitivity)
            cursor.execute("""
            INSERT INTO prescriptions (
                patient_id, patient_name, patient_contact, drug_name, dosage,
                effectiveness_pct, side_effect_pct, ddi_pct, overall_risk,
                target_organs, multilingual_notes, clinical_alerts, doctor_notes,
                doctor_id, doctor_name, doctor_specialization, doctor_hospital,
                frequency, start_date, end_date, instructions, status, discontinued_reason, created_at
            ) VALUES (
                ?, 'Rahul Verma', '9876543210', 'Amoxicillin', '500 mg three times daily',
                60, 45, 12, 'HIGH',
                '["GI Tract", "Skin"]', '{}', '["High-risk allergy conflict detected: Patient has Penicillin allergy."]',
                'Discontinued on Day 2 due to mild cutaneous erythema and documented penicillin hypersensitivity.',
                2, 'Dr. Yash Kadhane', 'Cardiology & Internal Medicine', 'Apex Multispecialty Hospital',
                'TDS (Every 8 hours)', '2025-11-20', '2025-11-22', 'Stop immediately if rash appears.',
                'discontinued', 'Drug allergy reaction: Cutaneous erythema and urticaria risk due to penicillin sensitivity.', '2025-11-20 16:45:00'
            )
            """, (p_id,))

    # ----------------------------------------------------
    # Seed 4: Realistic Doctor Appointments
    # ----------------------------------------------------
    cursor.execute("SELECT COUNT(*) FROM appointments")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
        INSERT INTO appointments
        (patient_id, patient_name, patient_contact, doctor_id, doctor_name, doctor_specialization, appointment_date, appointment_time, reason, status, type)
        VALUES
        (7, 'Rahul Verma', '9876543210', 1, 'Dr. Sharma, MD', 'Cardiology & Internal Medicine', '2026-10-28', '10:30 AM', 'GERD Therapeutic Response & Endoscopy Follow-up', 'confirmed', 'In-Person Consultation'),
        (7, 'Rahul Verma', '9876543210', 3, 'Dr. Ananya Iyer, MD', 'Gastroenterology & Hepatology', '2026-11-04', '02:00 PM', 'Follow-up Gastric Mucosal Review', 'confirmed', 'In-Person Consultation'),
        (5, 'Anjali Deshmukh', '9811223344', 1, 'Dr. Sharma, MD', 'Cardiology & Internal Medicine', '2026-10-29', '11:15 AM', 'Hypertension Blood Pressure Titration Check', 'confirmed', 'In-Person Consultation'),
        (5, 'Anjali Deshmukh', '9811223344', 4, 'Dr. Priya Nair, MD', 'Pulmonology & Critical Care', '2026-11-08', '03:30 PM', 'Asthma Control Test & Inhaler Review', 'confirmed', 'Teleconsultation'),
        (11, 'Rahane mam', '1234567890', 1, 'Dr. Sharma, MD', 'Cardiology & Internal Medicine', '2026-10-30', '12:00 PM', 'Cephalalgia Pain Relief Follow-up', 'confirmed', 'In-Person Consultation')
        """)

    conn.commit()

# Initialize upon module import
init_db()

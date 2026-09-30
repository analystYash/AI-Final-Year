# -*- coding: utf-8 -*-
"""
Flask REST API Server for Personalized Drug Effect Prediction System
Serves prediction endpoints, drug repository, 3-drug comparative analysis,
multilingual second-opinion generation, and doctor/patient portal endpoints.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import json
import random
from datetime import datetime, timedelta

import os

try:
    from backend.knowledge_base import DRUG_DATABASE, ORGAN_MAP, get_drug_info
    from backend.ml_engine import ml_engine
    from backend.multilingual import generate_multilingual_recommendation
    from backend.database import get_db_connection, init_db
    from backend.auth_db import register_doctor, authenticate_doctor
    from backend.train_model import train_and_evaluate, ARTIFACTS_PATH, DATASET_PATH
    from backend.external_api import fetch_external_drug_research, expand_clinical_dataset_with_api, MEDICAL_API_KEY
except ImportError:
    from knowledge_base import DRUG_DATABASE, ORGAN_MAP, get_drug_info
    from ml_engine import ml_engine
    from multilingual import generate_multilingual_recommendation
    from database import get_db_connection, init_db
    from auth_db import register_doctor, authenticate_doctor
    from train_model import train_and_evaluate, ARTIFACTS_PATH, DATASET_PATH
    from external_api import fetch_external_drug_research, expand_clinical_dataset_with_api, MEDICAL_API_KEY


app = Flask(__name__)
CORS(app) # Enable cross-origin resource sharing for Vite frontend

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "online",
        "service": "Personalized Drug Effect Prediction AI",
        "version": "2.0.0",
        "available_drugs_count": len(DRUG_DATABASE)
    })

# ==========================================
# AUTHENTICATION & DOCTOR ACCOUNTS (users.db)
# ==========================================

@app.route("/api/auth/register-doctor", methods=["POST"])
def auth_register_doctor():
    """Registers a new doctor account with salted password hashing in users.db."""
    try:
        data = request.get_json() or {}
        name = data.get("name", "").strip()
        email = data.get("email", "").strip()
        password = data.get("password", "").strip()
        specialization = data.get("specialization", "General Medicine").strip()
        license_number = data.get("license_number", "").strip()
        hospital_name = data.get("hospital_name", "City Health Medical Center").strip()

        if not name or not email or not password:
            return jsonify({"error": "Full Name, Email Address, and Password are required."}), 400

        doctor_profile = register_doctor(
            name=name,
            email=email,
            password=password,
            specialization=specialization,
            license_number=license_number,
            hospital_name=hospital_name
        )

        return jsonify({
            "success": True,
            "message": f"Doctor account registered successfully for {name}.",
            "doctor": doctor_profile
        }), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/auth/login-doctor", methods=["POST"])
def auth_login_doctor():
    """Authenticates a doctor using credentials stored in users.db."""
    try:
        data = request.get_json() or {}
        email = data.get("email", "").strip()
        password = data.get("password", "").strip()

        if not email or not password:
            return jsonify({"error": "Email and password are required."}), 400

        doctor = authenticate_doctor(email, password)
        if not doctor:
            return jsonify({"error": "Invalid email or password. Please verify your credentials or register a new doctor account."}), 401

        return jsonify({
            "success": True,
            "message": f"Welcome, {doctor['name']}!",
            "doctor": doctor
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==========================================
# MACHINE LEARNING & EXTERNAL DATASET STATS
# ==========================================

@app.route("/api/ml/dataset-stats", methods=["GET"])
def get_dataset_stats():
    """Returns training dataset statistics, model metrics, confusion matrix, and feature weights."""
    try:
        if os.path.exists(ARTIFACTS_PATH):
            with open(ARTIFACTS_PATH, "r", encoding="utf-8") as f:
                artifacts = json.load(f)
        else:
            artifacts = train_and_evaluate(DATASET_PATH, save_artifacts=True)

        return jsonify(artifacts)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/ml/retrain", methods=["POST"])
def trigger_retrain():
    """Triggers retraining of the model on the latest CSV dataset."""
    try:
        artifacts = train_and_evaluate(DATASET_PATH, save_artifacts=True)
        return jsonify({
            "success": True,
            "message": f"Model successfully retrained on {artifacts['total_samples']} external clinical trial records.",
            "artifacts": artifacts
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==========================================
# EXTERNAL MEDICAL RESEARCH & DATASET API
# ==========================================

@app.route("/api/external/drug-research/<drug_name>", methods=["GET"])
def get_external_drug_research(drug_name):
    """Fetches live pharmacological analysis, clinical trials, and reference alternatives using Medical API key."""
    try:
        data = fetch_external_drug_research(drug_name)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/external/expand-dataset", methods=["POST"])
def expand_dataset_with_api():
    """Uses the external Medical API to import additional clinical cohorts and retrain ML model."""
    try:
        data = request.get_json() or {}
        num_records = int(data.get("num_records", 300))
        
        # 1. Expand dataset CSV
        expansion_res = expand_clinical_dataset_with_api(num_records)
        
        # 2. Retrain ML model on newly expanded dataset
        updated_artifacts = train_and_evaluate(DATASET_PATH, save_artifacts=True)
        
        return jsonify({
            "success": True,
            "message": f"Successfully imported {expansion_res['new_records_added']} external clinical trial records. Dataset now contains {expansion_res['total_dataset_size']} rows.",
            "expansion": expansion_res,
            "updated_model_artifacts": updated_artifacts
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route("/api/drugs", methods=["GET"])
def get_drugs():
    """Returns all available drugs formatted for selector UI."""
    drugs_list = []
    for name, data in DRUG_DATABASE.items():
        drugs_list.append({
            "name": name,
            "class": data["class"],
            "category": data["category"],
            "standard_dose": data["standard_dose"],
            "target_organs": data["target_organs"],
            "pregnancy_category": data.get("pregnancy_category", "C"),
            "indications": data.get("indications", []),
            "common_side_effects": data.get("common_side_effects", [])
        })
    # Sort alphabetically
    drugs_list.sort(key=lambda x: x["name"])
    return jsonify(drugs_list)

@app.route("/api/organs", methods=["GET"])
def get_organs():
    """Returns organ mapping with 3D coordinate metadata."""
    return jsonify(ORGAN_MAP)

@app.route("/api/predict", methods=["POST"])
def predict():
    """
    Core AI/ML prediction endpoint.
    Expects { patient: {...}, drug_name: "Lisinopril" }
    """
    try:
        data = request.get_json() or {}
        patient = data.get("patient", {})
        drug_name = data.get("drug_name", "")

        if not drug_name:
            return jsonify({"error": "Drug name is required"}), 400

        prediction = ml_engine.predict(patient, drug_name)
        patient_name = patient.get("name", "Patient")
        recommendations = generate_multilingual_recommendation(prediction, patient_name)
        prediction["multilingual_recommendation"] = recommendations

        return jsonify(prediction)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/compare", methods=["POST"])
def compare():
    """
    Three-medicine comparative evaluation.
    Expects { patient: {...}, drugs: ["DrugA", "DrugB", "DrugC"] }
    """
    try:
        data = request.get_json() or {}
        patient = data.get("patient", {})
        drug_names = data.get("drugs", [])

        comparison_result = ml_engine.compare_three_drugs(patient, drug_names)

        # Generate multilingual summaries for the top recommended drug
        best_candidate = comparison_result["recommended_drug"]
        best_pred = next((c for c in comparison_result["candidate_drugs"] if c["drug_name"] == best_candidate), None)
        if best_pred:
            comparison_result["top_recommendation_multilingual"] = generate_multilingual_recommendation(
                best_pred, patient.get("name", "Patient")
            )

        return jsonify(comparison_result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/patients", methods=["GET"])
def get_patients():
    """Returns all registered patients for the doctor dashboard."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM patients ORDER BY id DESC")
    rows = cursor.fetchall()
    patients = [dict(row) for row in rows]
    conn.close()
    return jsonify(patients)

@app.route("/api/patients", methods=["POST"])
def add_patient():
    """Registers or updates a patient profile in the database based on contact number."""
    try:
        data = request.get_json() or {}
        name = data.get("name", "").strip()
        age = int(data.get("age", 0))
        gender = data.get("gender", "Other").strip()
        contact = data.get("contact_number", "").strip()

        if not name or not contact or age <= 0:
            return jsonify({"error": "Valid name, contact number, and age are required."}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # Check existing contact
        cursor.execute("SELECT id FROM patients WHERE contact_number = ?", (contact,))
        existing = cursor.fetchone()
        if existing:
            patient_id = existing["id"]
            cursor.execute("""
            UPDATE patients SET
                name = ?, age = ?, gender = ?, medical_history = ?,
                existing_diseases = ?, allergies = ?, current_health_issue = ?,
                current_medications = ?, is_pregnant = ?, pregnancy_trimester = ?
            WHERE id = ?
            """, (
                name, age, gender,
                data.get("medical_history", ""),
                data.get("existing_diseases", ""),
                data.get("allergies", ""),
                data.get("current_health_issue", ""),
                data.get("current_medications", ""),
                1 if data.get("is_pregnant") else 0,
                data.get("pregnancy_trimester", ""),
                patient_id
            ))
            conn.commit()
            conn.close()
            return jsonify({
                "success": True,
                "id": patient_id,
                "contact_number": contact,
                "is_updated": True,
                "message": f"Patient profile for {name} ({contact}) updated successfully."
            }), 200

        cursor.execute("""
        INSERT INTO patients (
            name, age, gender, contact_number, medical_history,
            existing_diseases, allergies, current_health_issue,
            current_medications, is_pregnant, pregnancy_trimester
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            name, age, gender, contact,
            data.get("medical_history", ""),
            data.get("existing_diseases", ""),
            data.get("allergies", ""),
            data.get("current_health_issue", ""),
            data.get("current_medications", ""),
            1 if data.get("is_pregnant") else 0,
            data.get("pregnancy_trimester", "")
        ))
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()

        return jsonify({
            "success": True,
            "id": new_id,
            "contact_number": contact,
            "is_updated": False,
            "message": f"Patient {name} ({contact}) registered successfully."
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/patients/by-contact/<contact>", methods=["GET"])
def get_patient_by_contact(contact):
    """Fetches patient profile and all prescriptions by phone number."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM patients WHERE contact_number = ?", (contact.strip(),))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return jsonify({"error": "Patient not found with this contact number."}), 404
        
        patient = dict(row)
        cursor.execute("SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY id DESC", (patient["id"],))
        prescriptions = []
        for p in cursor.fetchall():
            p_dict = dict(p)
            for json_field in ["target_organs", "multilingual_notes", "clinical_alerts", "xai_factors", "full_prediction_json"]:
                try:
                    p_dict[json_field] = json.loads(p_dict.get(json_field, "[]" if "alerts" in json_field or "organs" in json_field or "factors" in json_field else "{}"))
                except Exception:
                    p_dict[json_field] = None
            prescriptions.append(p_dict)
        conn.close()
        return jsonify({"patient": patient, "prescriptions": prescriptions})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/prescribe", methods=["POST"])
def prescribe():
    """Commits an AI-analyzed prescription with doctor notes and AI second opinion, tied to phone number.
    Supports either a single medicine (drug_name) or multiple medicines (medicines list)."""
    try:
        data = request.get_json() or {}
        patient_id = data.get("patient_id")
        contact_number = str(data.get("contact_number", "")).strip()
        medicines = data.get("medicines", [])
        drug_name = data.get("drug_name")

        if not drug_name and not medicines:
            return jsonify({"error": "Drug Name or medicines list is required."}), 400
        if not patient_id and not contact_number:
            return jsonify({"error": "Patient ID or Contact Number is required."}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        if patient_id:
            cursor.execute("SELECT * FROM patients WHERE id = ?", (patient_id,))
        else:
            cursor.execute("SELECT * FROM patients WHERE contact_number = ?", (contact_number,))
        
        patient_row = cursor.fetchone()
        if not patient_row:
            conn.close()
            return jsonify({"error": "Patient record not found. Please register patient first."}), 404

        patient = dict(patient_row)
        patient_id = patient["id"]

        # Check if columns exist in current table (gracefully handle migration)
        cursor.execute("PRAGMA table_info(prescriptions)")
        cols = [c["name"] for c in cursor.fetchall()]
        has_new_cols = "xai_factors" in cols

        # Standardize into a list of medicines to save
        meds_to_save = []
        if medicines and isinstance(medicines, list) and len(medicines) > 0:
            for m in medicines:
                m_drug = m.get("drug") or m.get("drug_name")
                if m_drug:
                    meds_to_save.append({
                        "drug_name": m_drug,
                        "dosage": m.get("dosage") or f"{m.get('dosage', 'Standard')} ({m.get('timing', '')}, {m.get('duration', '')})",
                        "doctor_notes": m.get("doctor_notes") or data.get("doctor_notes", "Standard clinical monitoring recommended."),
                        "prediction": m.get("prediction")
                    })
        elif drug_name:
            meds_to_save.append({
                "drug_name": drug_name,
                "dosage": data.get("dosage", "Standard dose"),
                "doctor_notes": data.get("doctor_notes", "Standard clinical monitoring recommended."),
                "prediction": data.get("prediction")
            })

        saved_ids = []
        for item in meds_to_save:
            cur_drug = item["drug_name"]
            cur_dosage = item["dosage"]
            cur_notes = item["doctor_notes"]
            prediction = item["prediction"]

            if not prediction:
                prediction = ml_engine.predict(patient, cur_drug)
                prediction["multilingual_recommendation"] = generate_multilingual_recommendation(prediction, patient["name"])

            if has_new_cols:
                cursor.execute("""
                INSERT INTO prescriptions (
                    patient_id, patient_name, patient_contact, drug_name, dosage,
                    effectiveness_pct, side_effect_pct, ddi_pct, overall_risk,
                    target_organs, multilingual_notes, clinical_alerts, xai_factors,
                    dietary_warnings, full_prediction_json, doctor_notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    patient_id,
                    patient["name"],
                    patient["contact_number"],
                    cur_drug,
                    cur_dosage,
                    prediction.get("effectiveness_pct", 75),
                    prediction.get("side_effect_pct", 20),
                    prediction.get("ddi_pct", 10),
                    prediction.get("overall_risk_level", "LOW"),
                    json.dumps(prediction.get("target_organs", [])),
                    json.dumps(prediction.get("multilingual_recommendation", {})),
                    json.dumps(prediction.get("clinical_alerts", [])),
                    json.dumps(prediction.get("xai_factors", [])),
                    prediction.get("dietary_warnings", ""),
                    json.dumps(prediction),
                    cur_notes
                ))
            else:
                cursor.execute("""
                INSERT INTO prescriptions (
                    patient_id, patient_name, patient_contact, drug_name, dosage,
                    effectiveness_pct, side_effect_pct, ddi_pct, overall_risk,
                    target_organs, multilingual_notes, clinical_alerts, doctor_notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    patient_id,
                    patient["name"],
                    patient["contact_number"],
                    cur_drug,
                    cur_dosage,
                    prediction.get("effectiveness_pct", 75),
                    prediction.get("side_effect_pct", 20),
                    prediction.get("ddi_pct", 10),
                    prediction.get("overall_risk_level", "LOW"),
                    json.dumps(prediction.get("target_organs", [])),
                    json.dumps(prediction.get("multilingual_recommendation", {})),
                    json.dumps(prediction.get("clinical_alerts", [])),
                    cur_notes
                ))
            saved_ids.append(cursor.lastrowid)

        conn.commit()
        prescription_id = saved_ids[0] if saved_ids else None
        conn.close()

        return jsonify({
            "success": True,
            "prescription_id": prescription_id,
            "patient_contact": patient["contact_number"],
            "patient_name": patient["name"],
            "message": f"Prescription for {drug_name} saved successfully for {patient['name']} (Phone: {patient['contact_number']})."
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/prescriptions", methods=["GET"])
def get_prescriptions():
    """Returns all recorded prescriptions with patient metadata."""
    try:
        patient_id = request.args.get("patient_id")
        conn = get_db_connection()
        cursor = conn.cursor()

        if patient_id:
            cursor.execute("""
                SELECT p.*, pt.age, pt.gender, pt.allergies, pt.current_health_issue
                FROM prescriptions p
                LEFT JOIN patients pt ON p.patient_id = pt.id
                WHERE p.patient_id = ?
                ORDER BY p.id DESC
            """, (patient_id,))
        else:
            cursor.execute("""
                SELECT p.*, pt.age, pt.gender, pt.allergies, pt.current_health_issue
                FROM prescriptions p
                LEFT JOIN patients pt ON p.patient_id = pt.id
                ORDER BY p.id DESC
            """)

        rows = cursor.fetchall()
        prescriptions = []
        for r in rows:
            p_dict = dict(r)
            for json_field in ["target_organs", "multilingual_notes", "clinical_alerts", "xai_factors", "full_prediction_json"]:
                if json_field in p_dict and p_dict[json_field]:
                    try:
                        p_dict[json_field] = json.loads(p_dict[json_field])
                    except Exception:
                        pass
                else:
                    if json_field in ["target_organs", "clinical_alerts", "xai_factors"]:
                        p_dict[json_field] = []
                    elif json_field in ["multilingual_notes", "full_prediction_json"]:
                        p_dict[json_field] = {}
            prescriptions.append(p_dict)

        conn.close()
        return jsonify(prescriptions)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/dashboard/stats", methods=["GET"])
def get_dashboard_stats():
    """Returns dynamic stats for doctor dashboard based on real patient and prescription records."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Total patients
        cursor.execute("SELECT COUNT(*) FROM patients")
        total_patients = cursor.fetchone()[0]

        # New patients in last 7 days
        cursor.execute("""
            SELECT COUNT(*) FROM patients
            WHERE created_at >= datetime('now', '-7 days')
        """)
        new_patients = cursor.fetchone()[0]

        # Total prescriptions
        cursor.execute("SELECT COUNT(*) FROM prescriptions")
        total_prescriptions = cursor.fetchone()[0]

        # Weekly breakdown for graph
        cursor.execute("""
            SELECT 
                COUNT(*) as count,
                strftime('%Y-%W', created_at) as wk
            FROM prescriptions
            GROUP BY wk
            ORDER BY wk DESC
            LIMIT 4
        """)
        weekly_counts = [dict(r) for r in cursor.fetchall()]

        conn.close()
        return jsonify({
            "total_patients": total_patients,
            "new_patients": new_patients,
            "total_prescriptions": total_prescriptions,
            "total_analyses": total_prescriptions,
            "weekly_counts": weekly_counts
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/otp/send", methods=["POST"])
def send_otp():
    """Generates an OTP for patient mobile login. For convenience in demo, default OTP is 1234."""
    try:
        data = request.get_json() or {}
        contact = str(data.get("contact_number", "")).strip()

        if not contact:
            return jsonify({"error": "Contact number is required."}), 400

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name FROM patients WHERE contact_number = ?", (contact,))
        patient = cursor.fetchone()
        if not patient:
            conn.close()
            return jsonify({"error": f"No patient record found associated with mobile number {contact}. Please ask your doctor to register your profile first."}), 404

        # Fixed convenient OTP for demonstration / viva evaluation: "1234"
        otp = "1234"
        expires_at = (datetime.now() + timedelta(minutes=15)).strftime("%Y-%m-%d %H:%M:%S")

        cursor.execute("""
        INSERT OR REPLACE INTO otp_sessions (contact_number, otp, expires_at, is_verified)
        VALUES (?, ?, ?, 0)
        """, (contact, otp, expires_at))
        conn.commit()
        conn.close()

        return jsonify({
            "success": True,
            "contact_number": contact,
            "patient_name": patient["name"],
            "message": f"Verification code sent to {contact}. (For demo: use OTP 1234)",
            "demo_otp": "1234"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/otp/verify", methods=["POST"])
def verify_otp():
    """Validates patient OTP and returns patient record with active prescriptions & full visualization report."""
    try:
        data = request.get_json() or {}
        contact = str(data.get("contact_number", "")).strip()
        entered_otp = str(data.get("otp", "")).strip()

        if not contact or not entered_otp:
            return jsonify({"error": "Mobile number and OTP are required."}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM otp_sessions WHERE contact_number = ?", (contact,))
        session = cursor.fetchone()

        # Check OTP (accept "1234" or matching session)
        if entered_otp != "1234" and (not session or session["otp"] != entered_otp):
            conn.close()
            return jsonify({"error": "Invalid verification code. Please try again or use 1234."}), 401

        # Fetch patient profile
        cursor.execute("SELECT * FROM patients WHERE contact_number = ?", (contact,))
        patient_row = cursor.fetchone()
        if not patient_row:
            conn.close()
            return jsonify({"error": "Patient record not found."}), 404

        patient = dict(patient_row)

        # Fetch all prescriptions for this patient
        cursor.execute("SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY id DESC", (patient["id"],))
        prescription_rows = cursor.fetchall()

        prescriptions = []
        for p in prescription_rows:
            p_dict = dict(p)
            for json_field in ["target_organs", "multilingual_notes", "clinical_alerts", "xai_factors", "full_prediction_json"]:
                if json_field in p_dict and p_dict[json_field]:
                    try:
                        p_dict[json_field] = json.loads(p_dict[json_field])
                    except Exception:
                        pass
                else:
                    if json_field in ["target_organs", "clinical_alerts", "xai_factors"]:
                        p_dict[json_field] = []
                    elif json_field in ["multilingual_notes", "full_prediction_json"]:
                        p_dict[json_field] = {}

            # If full_prediction_json is missing, reconstruct prediction data on the fly
            if not p_dict.get("full_prediction_json") or not p_dict["full_prediction_json"].get("effectiveness_pct"):
                try:
                    reconstructed = ml_engine.predict(patient, p_dict["drug_name"])
                    reconstructed["multilingual_recommendation"] = p_dict.get("multilingual_notes") or generate_multilingual_recommendation(reconstructed, patient["name"])
                    p_dict["full_prediction_json"] = reconstructed
                except Exception:
                    pass

            prescriptions.append(p_dict)

        conn.close()

        return jsonify({
            "success": True,
            "patient": patient,
            "prescriptions": prescriptions
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    init_db()
    print("DrugAI Backend running on http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, debug=True)

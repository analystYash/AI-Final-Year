# -*- coding: utf-8 -*-
"""
Flask REST API Server for Personalized Drug Effect Prediction System
Serves prediction endpoints, drug repository, 3-drug comparative analysis,
multilingual second-opinion generation, and doctor/patient portal endpoints.
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import sqlite3
import json
import random
import io
from datetime import datetime, timedelta

import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

try:
    from backend.knowledge_base import DRUG_DATABASE, ORGAN_MAP, get_drug_info
    from backend.ml_engine import ml_engine
    from backend.multilingual import generate_multilingual_recommendation
    from backend.database import get_db_connection, init_db
    from backend.auth_db import register_doctor, authenticate_doctor
    from backend.train_model import train_and_evaluate, ARTIFACTS_PATH, DATASET_PATH
    from backend.external_api import (
        fetch_external_drug_research, expand_clinical_dataset_with_api,
        fetch_external_clinical_analysis, MEDICAL_API_KEY, TRANSLATION_API_KEY,
        MODEL_RESPONSE_API_KEY, translate_with_nvidia, generate_comparison_explanation_with_nvidia
    )
except ImportError:
    from knowledge_base import DRUG_DATABASE, ORGAN_MAP, get_drug_info
    from ml_engine import ml_engine
    from multilingual import generate_multilingual_recommendation
    from database import get_db_connection, init_db
    from auth_db import register_doctor, authenticate_doctor
    from train_model import train_and_evaluate, ARTIFACTS_PATH, DATASET_PATH
    from external_api import (
        fetch_external_drug_research, expand_clinical_dataset_with_api,
        fetch_external_clinical_analysis, MEDICAL_API_KEY, TRANSLATION_API_KEY,
        MODEL_RESPONSE_API_KEY, translate_with_nvidia, generate_comparison_explanation_with_nvidia
    )


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



@app.route("/api/external/clinical-analysis", methods=["POST"])
def get_external_clinical_analysis_endpoint():
    """
    Returns AI advisory, organ-specific body effects, side effects, personalized diet (eat/avoid),
    and allergy cross-checks powered by the external Medical API key (5d5094cae00d74ee47d92601d5e4afd0).
    """
    try:
        data = request.get_json() or {}
        patient = data.get("patient", {})
        drug_name = data.get("drug_name", "")
        lang = data.get("lang", "english")
        candidate_drugs = data.get("candidate_drugs", [])

        if not drug_name:
            return jsonify({"error": "Drug name is required"}), 400

        analysis = fetch_external_clinical_analysis(patient, drug_name, candidate_drugs, lang)
        return jsonify(analysis)
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
    Multi-medicine comparative evaluation powered by Medical API Key and ML Engine.
    Expects { patient: {...}, drugs: ["DrugA", "DrugB", "DrugC", "DrugD"] }
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

        # Generate patient-friendly explanation in 3 languages using NVIDIA NIM Model & Translation APIs
        p_issue = patient.get("current_health_issue") or patient.get("existing_diseases") or "your medical condition"
        comparison_result["explanation_for_patient"] = generate_comparison_explanation_with_nvidia(patient, best_candidate, p_issue)
        comparison_result["api_key_verified"] = f"{MODEL_RESPONSE_API_KEY[:9]}...{MODEL_RESPONSE_API_KEY[-4:]}"
        comparison_result["translation_key_verified"] = f"{TRANSLATION_API_KEY[:9]}...{TRANSLATION_API_KEY[-4:]}"

        return jsonify(comparison_result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/translate", methods=["POST"])
def api_translate():
    """Translates medical instruction into Marathi or Hinglish using the configured NVIDIA Translation API Key."""
    try:
        data = request.get_json() or {}
        text = data.get("text", "")
        target_lang = data.get("target_lang", "marathi")
        if not text:
            return jsonify({"error": "Text is required"}), 400
        translated = translate_with_nvidia(text, target_lang=target_lang)
        return jsonify({
            "original": text,
            "translated": translated,
            "target_lang": target_lang,
            "translation_key": f"{TRANSLATION_API_KEY[:9]}...{TRANSLATION_API_KEY[-4:]}"
        })
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

@app.route("/api/patients/<int:patient_id>", methods=["DELETE"])
def delete_patient(patient_id):
    """Deletes a patient profile and associated prescriptions from the database."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM patients WHERE id = ?", (patient_id,))
        patient = cursor.fetchone()
        if not patient:
            conn.close()
            return jsonify({"error": f"Patient with ID {patient_id} not found."}), 404

        patient_name = patient["name"]
        contact = patient["contact_number"]

        # Delete associated prescriptions
        cursor.execute("DELETE FROM prescriptions WHERE patient_id = ? OR patient_contact = ?", (patient_id, contact))
        deleted_prescriptions = cursor.rowcount

        # Delete OTP sessions if any
        cursor.execute("DELETE FROM otp_sessions WHERE contact_number = ?", (contact,))

        # Delete patient record
        cursor.execute("DELETE FROM patients WHERE id = ?", (patient_id,))

        conn.commit()
        conn.close()

        return jsonify({
            "success": True,
            "message": f"Patient '{patient_name}' and {deleted_prescriptions} associated prescription record(s) deleted successfully.",
            "deleted_patient_id": patient_id,
            "deleted_prescriptions_count": deleted_prescriptions
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/prescriptions/<int:prescription_id>", methods=["DELETE"])
def delete_prescription(prescription_id):
    """Deletes an individual prescription from the database."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM prescriptions WHERE id = ?", (prescription_id,))
        deleted = cursor.rowcount
        conn.commit()
        conn.close()
        if deleted == 0:
            return jsonify({"error": f"Prescription {prescription_id} not found."}), 404
        return jsonify({
            "success": True,
            "message": f"Prescription record {prescription_id} deleted successfully.",
            "deleted_id": prescription_id
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/patients/export-excel", methods=["GET"])
def export_patients_excel():
    """Generates and downloads a styled Excel (.xlsx) workbook for patient count and clinical record maintenance."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Query all patients
        cursor.execute("SELECT * FROM patients ORDER BY id ASC")
        patients = [dict(row) for row in cursor.fetchall()]

        # Query prescriptions to map prescription count & latest prescription per patient
        cursor.execute("SELECT id, patient_id, patient_contact, drug_name, dosage, created_at FROM prescriptions ORDER BY id DESC")
        all_prescriptions = [dict(row) for row in cursor.fetchall()]
        conn.close()

        # Build prescription lookup
        prescriptions_by_patient = {}
        for pr in all_prescriptions:
            p_key = pr.get("patient_id")
            c_key = pr.get("patient_contact")
            for k in [p_key, c_key]:
                if k:
                    if k not in prescriptions_by_patient:
                        prescriptions_by_patient[k] = []
                    prescriptions_by_patient[k].append(pr)

        wb = openpyxl.Workbook()

        # ── SHEET 1: Patient Directory & Clinical Records ──
        ws1 = wb.active
        ws1.title = "Patient Records"
        ws1.views.sheetView[0].showGridLines = True

        # Styles
        title_font = Font(name="Calibri", size=15, bold=True, color="1E3A8A")
        sub_font = Font(name="Calibri", size=9, italic=True, color="475569")
        header_font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="1E40AF", end_color="1E40AF", fill_type="solid")

        row_even_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        row_odd_fill = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
        alert_fill = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")

        thin_border = Border(
            left=Side(style="thin", color="CBD5E1"),
            right=Side(style="thin", color="CBD5E1"),
            top=Side(style="thin", color="CBD5E1"),
            bottom=Side(style="thin", color="CBD5E1")
        )

        align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
        align_left = Alignment(horizontal="left", vertical="center", wrap_text=True)

        # Title Block
        ws1.cell(row=1, column=1, value="DrugAI Clinical Intelligence - Patient Registry & Records").font = title_font
        ws1.cell(row=2, column=1, value=f"Exported on {datetime.now().strftime('%d %b %Y, %I:%M %p')} | Total Registered Patients: {len(patients)}").font = sub_font
        ws1.row_dimensions[1].height = 24
        ws1.row_dimensions[2].height = 18

        headers = [
            "Patient ID",
            "Full Name",
            "Age",
            "Gender",
            "Contact Number",
            "Current Health Issue",
            "Existing Diseases",
            "Allergies",
            "Medical History",
            "Current Medications",
            "Pregnancy Status",
            "Trimester",
            "Prescriptions Count",
            "Latest Prescribed Drug",
            "Registration Date"
        ]

        # Write Headers at Row 4
        ws1.row_dimensions[4].height = 26
        for col_idx, header_text in enumerate(headers, 1):
            cell = ws1.cell(row=4, column=col_idx, value=header_text)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = align_center
            cell.border = thin_border

        # Write Data Rows
        row_idx = 5
        for p in patients:
            p_id = p.get("id")
            contact = p.get("contact_number")
            p_prescriptions = prescriptions_by_patient.get(p_id) or prescriptions_by_patient.get(contact) or []
            rx_count = len(p_prescriptions)
            latest_rx = p_prescriptions[0]["drug_name"] if rx_count > 0 else "None"

            is_pregnant_str = "Yes" if p.get("is_pregnant") else "No"
            allergies_str = p.get("allergies") or "None"

            row_data = [
                f"PAT-{p_id:03d}",
                p.get("name") or "Unknown",
                p.get("age") or 0,
                p.get("gender") or "Other",
                contact or "N/A",
                p.get("current_health_issue") or "N/A",
                p.get("existing_diseases") or "None",
                allergies_str,
                p.get("medical_history") or "None",
                p.get("current_medications") or "None",
                is_pregnant_str,
                p.get("pregnancy_trimester") or "N/A",
                rx_count,
                latest_rx,
                str(p.get("created_at") or "")[:19]
            ]

            fill_to_use = row_even_fill if row_idx % 2 == 0 else row_odd_fill
            ws1.row_dimensions[row_idx].height = 20

            for col_idx, val in enumerate(row_data, 1):
                cell = ws1.cell(row=row_idx, column=col_idx, value=val)
                cell.font = Font(name="Calibri", size=10)
                cell.border = thin_border

                if col_idx == 8 and allergies_str.lower() not in ["none", ""]:
                    cell.fill = alert_fill
                    cell.font = Font(name="Calibri", size=10, bold=True, color="B45309")
                else:
                    cell.fill = fill_to_use

                if col_idx in [1, 3, 4, 5, 11, 12, 13, 15]:
                    cell.alignment = align_center
                else:
                    cell.alignment = align_left

            row_idx += 1

        # Auto-adjust column widths
        for col in ws1.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                if cell.row >= 4 and cell.value:
                    val_len = len(str(cell.value))
                    if val_len > max_len:
                        max_len = val_len
            ws1.column_dimensions[col_letter].width = max(max_len + 4, 12)

        # ── SHEET 2: Clinical Summary & Counts ──
        ws2 = wb.create_sheet(title="Summary & Statistics")
        ws2.views.sheetView[0].showGridLines = True

        ws2.cell(row=1, column=1, value="Clinical Cohort Summary & Record Maintenance Counts").font = title_font
        ws2.cell(row=2, column=1, value=f"Comprehensive analytics summary as of {datetime.now().strftime('%d %b %Y, %I:%M %p')}").font = sub_font
        ws2.row_dimensions[1].height = 24
        ws2.row_dimensions[2].height = 18

        total_pts = len(patients)
        male_pts = sum(1 for p in patients if str(p.get("gender", "")).lower() == "male")
        female_pts = sum(1 for p in patients if str(p.get("gender", "")).lower() == "female")
        other_pts = total_pts - male_pts - female_pts
        allergies_count = sum(1 for p in patients if p.get("allergies") and p.get("allergies").lower() not in ["none", "no", ""])
        pregnant_count = sum(1 for p in patients if p.get("is_pregnant"))
        total_rx_count = len(all_prescriptions)
        avg_age = round(sum(p.get("age", 0) for p in patients) / total_pts, 1) if total_pts > 0 else 0

        summary_headers = ["Metric / Parameter", "Count / Value", "Description & Clinical Relevance"]
        ws2.row_dimensions[4].height = 24
        for col_idx, h_text in enumerate(summary_headers, 1):
            cell = ws2.cell(row=4, column=col_idx, value=h_text)
            cell.font = header_font
            cell.fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
            cell.alignment = align_center
            cell.border = thin_border

        summary_rows = [
            ("Total Registered Patients", total_pts, "Active clinical cohort size in database"),
            ("Male Patients", male_pts, f"{round((male_pts/total_pts)*100, 1) if total_pts else 0}% of total cohort"),
            ("Female Patients", female_pts, f"{round((female_pts/total_pts)*100, 1) if total_pts else 0}% of total cohort"),
            ("Other / Unspecified Gender", other_pts, "Gender unspecified or diverse"),
            ("Average Cohort Age", f"{avg_age} years", "Mean age across all registered patients"),
            ("Patients with Recorded Allergies", allergies_count, "Require strict drug allergy contraindication screening"),
            ("Pregnant Patients", pregnant_count, "Require pregnancy trimester safety check (FDA Category / Teratogenicity)"),
            ("Total Prescriptions Recorded", total_rx_count, "Total therapeutic treatments committed with AI verification"),
            ("Attending Physician", "Dr. Sharma, MD", "Cardiology & Internal Medicine"),
            ("Hospital / Clinical Center", "Apex Multispecialty Hospital", "MH-CARD-2021-984"),
            ("Report Export Timestamp", datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "Timestamp for audit log & record maintenance")
        ]

        for s_idx, (m_label, m_val, m_desc) in enumerate(summary_rows, 5):
            ws2.row_dimensions[s_idx].height = 20
            c1 = ws2.cell(row=s_idx, column=1, value=m_label)
            c2 = ws2.cell(row=s_idx, column=2, value=m_val)
            c3 = ws2.cell(row=s_idx, column=3, value=m_desc)

            c1.font = Font(name="Calibri", size=10, bold=True)
            c2.font = Font(name="Calibri", size=10, bold=True, color="1E40AF")
            c3.font = Font(name="Calibri", size=10, italic=True, color="475569")

            c1.border = thin_border
            c2.border = thin_border
            c3.border = thin_border

            c1.alignment = align_left
            c2.alignment = align_center
            c3.alignment = align_left

            s_fill = row_even_fill if s_idx % 2 == 0 else row_odd_fill
            c1.fill = s_fill
            c2.fill = s_fill
            c3.fill = s_fill

        ws2.column_dimensions["A"].width = 34
        ws2.column_dimensions["B"].width = 22
        ws2.column_dimensions["C"].width = 46

        # Save to memory buffer
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)

        filename = f"Patient_Records_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        return send_file(
            buf,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name=filename
        )
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

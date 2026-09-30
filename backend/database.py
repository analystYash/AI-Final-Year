# -*- coding: utf-8 -*-
"""
SQLite Database Layer
Stores patient profiles, prescriptions, and OTP authentication sessions.
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

    # Patients table
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Prescriptions table
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
        xai_factors TEXT,
        dietary_warnings TEXT,
        full_prediction_json TEXT,
        doctor_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients (id)
    );
    """)

    # OTP authentication sessions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS otp_sessions (
        contact_number TEXT PRIMARY KEY,
        otp TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_verified INTEGER DEFAULT 0
    );
    """)

    # Dynamic Column Migration for prescriptions table
    cursor.execute("PRAGMA table_info(prescriptions)")
    existing_cols = [c["name"] for c in cursor.fetchall()]
    needed_cols = {
        "xai_factors": "TEXT",
        "dietary_warnings": "TEXT",
        "full_prediction_json": "TEXT"
    }
    for col, col_type in needed_cols.items():
        if col not in existing_cols:
            try:
                cursor.execute(f"ALTER TABLE prescriptions ADD COLUMN {col} {col_type}")
            except Exception:
                pass

    conn.commit()
    conn.close()

# Initialize upon module import
init_db()

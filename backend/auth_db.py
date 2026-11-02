# -*- coding: utf-8 -*-
"""
Dedicated User Authentication & Doctor Credentials Database
Stores doctor registrations, hashed passwords, encrypted biometric credentials, and security audit logs in users.db.
"""

import sqlite3
import hashlib
import os
import secrets
from datetime import datetime

AUTH_DB_PATH = os.path.join(os.path.dirname(__file__), "users.db")

def get_auth_db_connection():
    conn = sqlite3.connect(AUTH_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password, salt=None):
    """Generates a secure SHA-256 password hash with salt."""
    if not salt:
        salt = secrets.token_hex(16)
    hash_obj = hashlib.sha256((password + salt).encode('utf-8'))
    return hash_obj.hexdigest(), salt

def verify_password(password, password_hash, salt):
    """Verifies password against stored hash and salt."""
    computed_hash, _ = hash_password(password, salt)
    return computed_hash == password_hash

def init_auth_db():
    conn = get_auth_db_connection()
    cursor = conn.cursor()

    # 1. Doctors Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS doctors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        specialization TEXT DEFAULT 'General Medicine',
        license_number TEXT,
        hospital_name TEXT DEFAULT 'City Health Medical Center',
        qualifications TEXT DEFAULT 'MBBS, MD (Medicine)',
        experience_years INTEGER DEFAULT 12,
        phone TEXT DEFAULT '+91 98201 12345',
        clinic_address TEXT DEFAULT 'Suite 402, Apex Multispecialty Hospital, Mumbai',
        availability TEXT DEFAULT 'Mon - Fri, 09:00 AM - 04:00 PM',
        profile_picture TEXT DEFAULT '',
        bio TEXT DEFAULT 'Senior Clinical Consultant specializing in internal medicine, cardiac therapeutics, and evidence-based personalized treatment.',
        department TEXT DEFAULT 'Cardiology & Internal Medicine',
        status TEXT DEFAULT 'active',
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Dynamic column migration for doctors table
    cursor.execute("PRAGMA table_info(doctors)")
    existing_doc_cols = [c["name"] for c in cursor.fetchall()]
    needed_doc_cols = {
        "qualifications": "TEXT DEFAULT 'MBBS, MD (Medicine)'",
        "experience_years": "INTEGER DEFAULT 10",
        "phone": "TEXT DEFAULT '+91 98201 12345'",
        "clinic_address": "TEXT DEFAULT 'Apex Multispecialty Hospital, Mumbai'",
        "availability": "TEXT DEFAULT 'Mon - Fri, 09:00 AM - 04:00 PM'",
        "profile_picture": "TEXT DEFAULT ''",
        "bio": "TEXT DEFAULT 'Specialist clinical practitioner.'",
        "department": "TEXT DEFAULT 'Internal Medicine'",
        "status": "TEXT DEFAULT 'active'",
        "last_login_at": "TIMESTAMP"
    }
    for col, col_def in needed_doc_cols.items():
        if col not in existing_doc_cols:
            try:
                cursor.execute(f"ALTER TABLE doctors ADD COLUMN {col} {col_def}")
            except Exception:
                pass

    # 2. Comprehensive Authentication Audit Logs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS authentication_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        user_role TEXT NOT NULL,
        authentication_method TEXT NOT NULL,
        authentication_status TEXT NOT NULL,
        failure_reason TEXT,
        device_information TEXT DEFAULT 'Clinical Console',
        ip_address TEXT DEFAULT '127.0.0.1',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 4. Login Activity Audit Table (legacy preserved)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS login_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_type TEXT NOT NULL,
        identifier TEXT NOT NULL,
        login_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL
    );
    """)

    conn.commit()

    # Seed initial doctors with realistic clinical specializations
    seed_doctors = [
        {
            "name": "Dr. Sharma, MD",
            "email": "dr.sharma@hospital.org",
            "password": "doctor123",
            "specialization": "Cardiology & Internal Medicine",
            "license_number": "MH-CARD-2021-984",
            "hospital_name": "Apex Multispecialty Hospital",
            "qualifications": "MBBS, MD (General Medicine), DM (Cardiology), FACC",
            "experience_years": 14,
            "phone": "+91 98201 54321",
            "clinic_address": "Cabin 402, 4th Floor, Apex Multispecialty Hospital, Andheri West, Mumbai",
            "availability": "Mon - Fri, 09:00 AM - 03:30 PM",
            "bio": "Senior Consultant Cardiologist and Physician with extensive experience in cardiovascular pharmacology, hypertension management, and adverse drug reaction profiling.",
            "department": "Cardiology & Vascular Medicine"
        },
        {
            "name": "Dr. Ananya Iyer, MD",
            "email": "dr.iyer@hospital.org",
            "password": "doctor123",
            "specialization": "Gastroenterology & Hepatology",
            "license_number": "MH-GAST-2019-332",
            "hospital_name": "City Health Medical Center",
            "qualifications": "MBBS, MD (Medicine), DNB (Gastroenterology)",
            "experience_years": 11,
            "phone": "+91 98334 78901",
            "clinic_address": "Suite 201, City Health Medical Center, Bandra, Mumbai",
            "availability": "Tue, Thu, Sat, 10:00 AM - 05:00 PM",
            "bio": "Consultant Gastroenterologist focusing on acid peptic disorders, GERD therapeutics, liver pathology, and safe drug titration in gastrointestinal disease.",
            "department": "Gastroenterology"
        },
        {
            "name": "Dr. Priya Nair, MD",
            "email": "dr.nair@hospital.org",
            "password": "doctor123",
            "specialization": "Pulmonology & Critical Care",
            "license_number": "MH-PULM-2020-517",
            "hospital_name": "Metro Care Clinic",
            "qualifications": "MBBS, MD (Pulmonary Medicine), FCCP",
            "experience_years": 9,
            "phone": "+91 98112 45678",
            "clinic_address": "Clinic 3B, Metro Care Specialist Wing, Dadar, Mumbai",
            "availability": "Mon, Wed, Fri, 11:00 AM - 04:00 PM",
            "bio": "Specialist in obstructive airways disease, bronchial asthma, drug-induced pulmonary toxicity, and multimodal respiratory therapeutics.",
            "department": "Pulmonary Medicine"
        }
    ]

    for doc in seed_doctors:
        cursor.execute("SELECT id FROM doctors WHERE email = ?", (doc["email"],))
        existing_doc = cursor.fetchone()
        if not existing_doc:
            pwd_hash, salt = hash_password(doc["password"])
            cursor.execute("""
            INSERT INTO doctors (
                name, email, password_hash, salt, specialization, license_number,
                hospital_name, qualifications, experience_years, phone,
                clinic_address, availability, bio, department, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
            """, (
                doc["name"], doc["email"], pwd_hash, salt,
                doc["specialization"], doc["license_number"], doc["hospital_name"],
                doc["qualifications"], doc["experience_years"], doc["phone"],
                doc["clinic_address"], doc["availability"], doc["bio"], doc["department"]
            ))
        else:
            # Update fields for existing doctor if fields are empty
            cursor.execute("""
            UPDATE doctors SET
                qualifications = COALESCE(NULLIF(qualifications, ''), ?),
                experience_years = COALESCE(NULLIF(experience_years, 0), ?),
                phone = COALESCE(NULLIF(phone, ''), ?),
                clinic_address = COALESCE(NULLIF(clinic_address, ''), ?),
                availability = COALESCE(NULLIF(availability, ''), ?),
                bio = COALESCE(NULLIF(bio, ''), ?),
                department = COALESCE(NULLIF(department, ''), ?),
                status = COALESCE(NULLIF(status, ''), 'active')
            WHERE id = ?
            """, (
                doc["qualifications"], doc["experience_years"], doc["phone"],
                doc["clinic_address"], doc["availability"], doc["bio"], doc["department"],
                existing_doc["id"]
            ))

    # Also backfill Dr. Yash Kadhane if present
    cursor.execute("SELECT id FROM doctors WHERE email = 'yashkadhane11@gmail.com'")
    yash_doc = cursor.fetchone()
    if yash_doc:
        cursor.execute("""
        UPDATE doctors SET
            qualifications = COALESCE(NULLIF(qualifications, ''), 'MBBS, MD (Internal Medicine)'),
            experience_years = COALESCE(NULLIF(experience_years, 0), 8),
            phone = COALESCE(NULLIF(phone, ''), '+91 97654 32109'),
            clinic_address = COALESCE(NULLIF(clinic_address, ''), 'Department of Medicine, Apex Multispecialty Hospital, Mumbai'),
            availability = COALESCE(NULLIF(availability, ''), 'Mon - Sat, 08:30 AM - 02:00 PM'),
            bio = COALESCE(NULLIF(bio, ''), 'Consultant Physician managing chronic multisystem disorders, pharmacotherapy optimization, and patient-centered longitudinal care.'),
            department = COALESCE(NULLIF(department, ''), 'General & Internal Medicine'),
            status = 'active'
        WHERE id = ?
        """, (yash_doc["id"],))

    conn.commit()
    conn.close()

def register_doctor(name, email, password, specialization="Internal Medicine", license_number="", hospital_name="",
                    qualifications="MBBS, MD", experience_years=5, phone="", clinic_address="", availability="Mon - Fri, 09:00 AM - 04:00 PM", bio="", department=""):
    """Registers a new doctor and persists into users.db."""
    conn = get_auth_db_connection()
    cursor = conn.cursor()
    email_clean = email.strip().lower()

    cursor.execute("SELECT id FROM doctors WHERE email = ?", (email_clean,))
    if cursor.fetchone():
        conn.close()
        raise ValueError(f"A doctor account with email '{email_clean}' is already registered.")

    pwd_hash, salt = hash_password(password)
    cursor.execute("""
    INSERT INTO doctors (
        name, email, password_hash, salt, specialization, license_number, hospital_name,
        qualifications, experience_years, phone, clinic_address, availability, bio, department, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    """, (
        name.strip(),
        email_clean,
        pwd_hash,
        salt,
        specialization.strip() or "Internal Medicine",
        license_number.strip() or f"MED-{secrets.token_hex(3).upper()}",
        hospital_name.strip() or "Clinical Care Center",
        qualifications.strip() or "MBBS, MD",
        int(experience_years or 5),
        phone.strip() or "+91 98200 00000",
        clinic_address.strip() or hospital_name.strip() or "Clinical Care Center",
        availability.strip() or "Mon - Fri, 09:00 AM - 04:00 PM",
        bio.strip() or "Consultant Medical Practitioner.",
        department.strip() or specialization.strip() or "Internal Medicine"
    ))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()

    return {
        "id": new_id,
        "name": name.strip(),
        "email": email_clean,
        "specialization": specialization.strip(),
        "license_number": license_number.strip(),
        "hospital_name": hospital_name.strip(),
        "qualifications": qualifications.strip(),
        "experience_years": experience_years,
        "phone": phone.strip(),
        "clinic_address": clinic_address.strip(),
        "availability": availability.strip(),
        "bio": bio.strip(),
        "department": department.strip(),
        "status": "active"
    }

def get_doctor_by_id(doctor_id):
    """Fetches a sanitized doctor profile by ID."""
    conn = get_auth_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM doctors WHERE id = ?", (doctor_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    d.pop("password_hash", None)
    d.pop("salt", None)
    return d

def get_all_doctors():
    """Returns all registered doctors (sanitized)."""
    conn = get_auth_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM doctors ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()
    doctors = []
    for r in rows:
        d = dict(r)
        d.pop("password_hash", None)
        d.pop("salt", None)
        doctors.append(d)
    return doctors

def update_doctor_profile(doctor_id, updates):
    """Updates permitted profile fields for a doctor."""
    allowed_fields = [
        "name", "specialization", "hospital_name", "license_number",
        "qualifications", "experience_years", "phone", "clinic_address",
        "availability", "profile_picture", "bio", "department", "status"
    ]
    set_clauses = []
    values = []
    for field in allowed_fields:
        if field in updates:
            set_clauses.append(f"{field} = ?")
            values.append(updates[field])

    if not set_clauses:
        return get_doctor_by_id(doctor_id)

    values.append(doctor_id)
    query = f"UPDATE doctors SET {', '.join(set_clauses)} WHERE id = ?"

    conn = get_auth_db_connection()
    cursor = conn.cursor()
    cursor.execute(query, tuple(values))
    conn.commit()
    conn.close()

    return get_doctor_by_id(doctor_id)

def authenticate_doctor(email, password):
    """Authenticates a doctor against users.db."""
    conn = get_auth_db_connection()
    cursor = conn.cursor()
    email_clean = email.strip().lower()

    cursor.execute("SELECT * FROM doctors WHERE email = ?", (email_clean,))
    doctor = cursor.fetchone()

    if not doctor:
        cursor.execute("INSERT INTO login_logs (user_type, identifier, status) VALUES ('doctor', ?, 'FAILED')", (email_clean,))
        conn.commit()
        conn.close()
        return None

    doctor_dict = dict(doctor)
    if verify_password(password, doctor_dict["password_hash"], doctor_dict["salt"]):
        cursor.execute("INSERT INTO login_logs (user_type, identifier, status) VALUES ('doctor', ?, 'SUCCESS')", (email_clean,))
        conn.commit()
        conn.close()
        del doctor_dict["password_hash"]
        del doctor_dict["salt"]
        return doctor_dict
    else:
        cursor.execute("INSERT INTO login_logs (user_type, identifier, status) VALUES ('doctor', ?, 'FAILED')", (email_clean,))
        conn.commit()
        conn.close()
        return None

def update_doctor_last_login(doctor_id):
    """Updates the last_login_at timestamp for a doctor."""
    conn = get_auth_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE doctors SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?", (doctor_id,))
    conn.commit()
    conn.close()

def log_auth_event(user_id, user_role, method, status, failure_reason="", device_info="Safran Morpho MSO 1300 E3", ip_address="127.0.0.1"):
    """
    Persists structured security audit entry in authentication_logs.
    Never stores plaintext passwords, raw fingerprint templates, or OTP values.
    """
    try:
        conn = get_auth_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO authentication_logs (
            user_id, user_role, authentication_method, authentication_status,
            failure_reason, device_information, ip_address, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, (user_id, user_role, method, status, failure_reason, device_info, ip_address))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Warning: Failed to write audit log: {e}")

def get_auth_logs(limit=100):
    """Returns recent authentication audit logs."""
    conn = get_auth_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM authentication_logs
        ORDER BY timestamp DESC, id DESC
        LIMIT ?
    """, (limit,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

# Initialize upon module load
init_auth_db()

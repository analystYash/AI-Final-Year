# -*- coding: utf-8 -*-
"""
Dedicated User Authentication & Doctor Credentials Database
Stores real doctor registrations, hashed passwords, and login audit logs in a separate users.db database.
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

    # Doctors Table
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Login Activity Audit Table
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

    # Seed an initial doctor if empty so system is ready to use immediately
    cursor.execute("SELECT COUNT(*) FROM doctors")
    if cursor.fetchone()[0] == 0:
        pwd_hash, salt = hash_password("doctor123")
        cursor.execute("""
        INSERT INTO doctors (name, email, password_hash, salt, specialization, license_number, hospital_name)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            "Dr. Sharma, MD",
            "dr.sharma@hospital.org",
            pwd_hash,
            salt,
            "Cardiology & Internal Medicine",
            "MH-CARD-2021-984",
            "Apex Multispecialty Hospital"
        ))
        conn.commit()

    conn.close()

def register_doctor(name, email, password, specialization="Internal Medicine", license_number="", hospital_name=""):
    """Registers a new doctor and persists into users.db."""
    conn = get_auth_db_connection()
    cursor = conn.cursor()
    email_clean = email.strip().lower()

    # Check if email exists
    cursor.execute("SELECT id FROM doctors WHERE email = ?", (email_clean,))
    if cursor.fetchone():
        conn.close()
        raise ValueError(f"A doctor account with email '{email_clean}' is already registered.")

    pwd_hash, salt = hash_password(password)
    cursor.execute("""
    INSERT INTO doctors (name, email, password_hash, salt, specialization, license_number, hospital_name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        name.strip(),
        email_clean,
        pwd_hash,
        salt,
        specialization.strip() or "Internal Medicine",
        license_number.strip() or f"MED-{secrets.token_hex(3).upper()}",
        hospital_name.strip() or "Clinical Care Center"
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
        "hospital_name": hospital_name.strip()
    }

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
        # Return doctor profile without sensitive hash/salt
        del doctor_dict["password_hash"]
        del doctor_dict["salt"]
        return doctor_dict
    else:
        cursor.execute("INSERT INTO login_logs (user_type, identifier, status) VALUES ('doctor', ?, 'FAILED')", (email_clean,))
        conn.commit()
        conn.close()
        return None

# Initialize upon module load
init_auth_db()

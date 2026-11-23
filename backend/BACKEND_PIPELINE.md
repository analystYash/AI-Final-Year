# DrugAI Clinical Backend Pipeline Guide
**Personalized Drug Effect Prediction & Clinical Decision Support System**

---

## 1. Executive Summary

The **DrugAI Backend Pipeline** is an evidence-based clinical machine learning and pharmacological decision-support engine. It ingests patient demographics, diagnosed conditions, allergy profiles, and concurrent medications to compute calibrated drug effectiveness, adverse side-effect risks, drug-drug interactions (DDI), multi-candidate comparative rankings with real Indian pricing (PMBJP Jan Aushadhi), transparent Explainable AI (XAI) feature attributions, and patient-friendly multilingual advisories (English, Hinglish, Marathi).

```
                      PATIENT DATA & HEALTH COMPLAINT
                                     │
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                        DRUGAI 6-STAGE PIPELINE                         │
 ├────────────────────────────────────────────────────────────────────────┤
 │ [Stage 1] Patient Profile Ingestion & Standardization                  │
 │           Normalizes demographics, conditions, vitals, & age cohort.   │
 │                                   │                                    │
 │ [Stage 2] Pharmacological Safety & Contraindication Screening          │
 │           Detects severe beta-lactam/sulfa/NSAID cross-reactivities.   │
 │                                   │                                    │
 │ [Stage 3] Calibrated ML & Pharmacodynamic Prediction                   │
 │           Calculates effectiveness %, side-effect %, DDI %, & organs.  │
 │                                   │                                    │
 │ [Stage 4] Multi-Candidate Comparison & Suitability Ranking             │
 │           Evaluates 3-4 candidate drugs & compares Jan Aushadhi costs. │
 │                                   │                                    │
 │ [Stage 5] Explainable AI (XAI) & Personalized Dietary Plan             │
 │           Computes feature attribution weights & tailored nutrition.   │
 │                                   │                                    │
 │ [Stage 6] Multilingual Second-Opinion & Visualization Packaging        │
 │           Generates EN/Hinglish/Marathi summaries & 3D organ payloads. │
 └────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
               VITE REACT FRONTEND (DOCTOR & PATIENT PORTALS)
```

---

## 2. The 6-Stage Pipeline Breakdown

### Stage 1: Patient Profile Ingestion & Standardization
* **Module**: `pipeline.py` -> `stage1_ingest_patient()`
* **Function**: Ingests patient records from frontend form submissions or database lookups.
* **Standardization**:
  - Validates and sanitizes numeric age and assigns the clinical cohort:
    - Pediatric (`< 12y`)
    - Adolescent (`12 - 17y`)
    - Adult (`18 - 59y`)
    - Geriatric (`60y+`)
  - Parses comma-delimited strings of existing diseases, medical history, allergies, and current medications into normalized lowercase token sets.
  - Resolves colloquial symptom descriptions (e.g. *"heartburn"*, *"chest burning"*, *"pet me jalan"*) to standardized clinical indication keys (`acidity`, `gerd`, `gastritis`).

### Stage 2: Pharmacological Safety & Contraindication Screening
* **Module**: `pipeline.py` -> `stage2_safety_screening()`, `medicine_intelligence.py`
* **Function**: Executes rule-based safety screening to prevent hazardous adverse events:
  - **Allergy Cross-Reactivity**: Checks active drug ingredient against documented patient allergies:
    - *Penicillin* allergy -> Flags Beta-lactams (`Amoxicillin`, `Ampicillin`).
    - *Sulfa* allergy -> Flags Sulfonamides (`Glimepiride`, `Furosemide`, `Spironolactone`).
    - *NSAID* allergy -> Flags COX inhibitors (`Ibuprofen`, `Aspirin`, `Celecoxib`).
  - **Absolute Disease Contraindications**:
    - Asthma / COPD -> Flags non-selective Beta-blockers (`Metoprolol`).
    - Active Gastritis / Peptic Ulcer -> Flags NSAIDs (`Ibuprofen`, `Aspirin`).
    - Severe Renal Impairment -> Flags Metformin and high-dose ACE inhibitors.

### Stage 3: Calibrated ML & Pharmacodynamic Prediction
* **Module**: `pipeline.py` -> `stage3_ml_prediction()`, `ml_engine.py`
* **Function**: Evaluates the patient against pharmacological knowledge matrices:
  - **Effectiveness Score ($0 - 100\%$)**: Baseline indication match adjusted for patient age cohort, disease severity, and contraindications.
  - **Adverse Side-Effect Risk ($0 - 100\%$)**: Computes baseline toxicity modified by organ vulnerability, geriatric multipliers ($1.25\times$), and polypharmacy penalties.
  - **Drug-Drug Interaction (DDI) Hazard ($0 - 100\%$)**: Cross-references patient's current medications against the 31-drug interaction matrix in `knowledge_base.py`.
  - **Target Organ Mapping**: Associates affected organs (`Stomach`, `Liver`, `Heart`, `Kidneys`, `Lungs`, `Brain`) with 3D coordinate metadata for the frontend 3D Human Body and Mol* viewers.

### Stage 4: Multi-Candidate Comparison & Suitability Ranking
* **Module**: `pipeline.py` -> `stage4_comparative_ranking()`, `medicine_intelligence.py`
* **Function**: Automatically compares 3 to 4 condition-appropriate candidate drugs:
  - Calculates a **Patient Suitability Score** ($0 - 100$):
    $$\text{Suitability} = 0.50 \times \text{Effectiveness} + 0.30 \times (100 - \text{SideEffect}) + 0.20 \times (100 - \text{DDI}) - \text{Contraindication Penalties}$$
  - Evaluates Indian Medicine Pricing from `INDIAN_MEDICINE_CATALOG`:
    - Generic Jan Aushadhi (PMBJP) Price per tablet vs. Branded Retail MRP.
    - Highlights estimated 30-day savings for patient financial accessibility.

### Stage 5: Explainable AI (XAI) & Personalized Dietary Plan
* **Module**: `pipeline.py` -> `stage5_xai_and_nutrition()`, `external_api.py`
* **Function**: Provides clinical transparency and holistic lifestyle guidance:
  - **Feature Attribution (XAI)**: Quantifies positive and negative factors influencing the score (e.g. *Age profile*, *Target indication match*, *Organ burden*).
  - **Clinical Trial Citations**: Landmark evidence retrieval (ACC/AHA Guidelines, ADA Guidelines, ALLHAT, UKPDS trials).
  - **Personalized Dietary Plan**:
    - **Foods to Eat**: Gentle, mucosal-protective foods (e.g. coconut water, oatmeal, bland khichdi).
    - **Foods to Avoid**: Mucosal irritants (e.g. fried foods, strong black tea, raw chillies).
    - **Clinical Justification**: Physiological explanation of dietary synergy with prescribed pharmacotherapy.

### Stage 6: Multilingual Second-Opinion & Visualization Packaging
* **Module**: `pipeline.py` -> `stage6_multilingual_packaging()`, `multilingual.py`
* **Function**: Translates complex medical output into empathetic, easy-to-understand explanations:
  - **English**: Formal clinical second-opinion and patient-friendly summary.
  - **Hinglish**: Conversational Hindi written in Latin alphabet (easy for patients across India).
  - **Marathi**: High-precision Devanagari script for regional accessibility.
  - Emits JSON payloads consumed by frontend charts, 3D organ highlighting, and doctor consultation cards.

---

## 3. Backend Codebase Directory Structure

```
backend/
├── app.py                      # Flask REST API server (30+ endpoints, CORS, route handlers)
├── pipeline.py                 # Core DrugAI Clinical Pipeline orchestrator (Stages 1 - 6)
├── ml_engine.py                # Calibrated ML scoring & prediction engine
├── medicine_intelligence.py    # Indian medicine catalog, pricing, diet planner & safety rules
├── knowledge_base.py           # Pharmacological repository (31 drugs, DDI matrix, organ maps)
├── database.py                 # SQLite layer for patients, prescriptions, consultations (drug_ai.db)
├── auth_db.py                  # Doctor credentials, PBKDF2 hashing, security audit logs (users.db)
├── otp_service.py              # Multi-Factor Authentication (TOTP, Google Authenticator, SMS, Email)
├── multilingual.py             # Rule-based multilingual generator (English, Hinglish, Marathi)
├── external_api.py             # OpenFDA integration, landmark trial guidelines & circuit breakers
├── tabular_loader.py           # Universal CSV & Excel dataset parser and converter
├── train_model.py              # ML training and evaluation script (exports model_artifacts.json)
├── requirements.txt            # Python dependencies
└── dataset/
    └── clinical_drug_dataset.csv # Clinical pharmacology training dataset
```

---

## 4. Frontend-Backend Communication Architecture

The system operates as a decoupled client-server architecture:

```
┌─────────────────────────────────┐           ┌─────────────────────────────────┐
│     Vite React Frontend         │           │       Python Flask Backend      │
│     (Port 5173)                 │           │       (Port 5000)               │
├─────────────────────────────────┤           ├─────────────────────────────────┤
│ • Doctor Portal                 │   /api/*  │ • DrugAIClinicalPipeline        │
│ • Patient Health Portal         │ ────────> │ • REST API Controllers          │
│ • 3D Mol* / Human Body Viewer   │ (Vite     │ • SQLite Databases              │
│ • Multilingual Viewers          │  Proxy)   │ • ML Inference Engine           │
└─────────────────────────────────┘           └─────────────────────────────────┘
```

### Key API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Backend health check and catalog statistics |
| `/api/pipeline/info` | GET | Structured metadata on the 6 pipeline stages |
| `/api/predict` | POST | Runs Stages 1, 2, 3, 5, 6 for single drug effect prediction |
| `/api/compare` | POST | Runs Stages 1-6 for 4-drug comparative evaluation |
| `/api/drugs` | GET | Returns full pharmacological catalog (31 drugs) |
| `/api/organs` | GET | Returns 3D coordinate mapping for organ models |
| `/api/patients` | GET / POST | Patient records management |
| `/api/prescriptions` | GET | Prescriptions history and active medication tracking |
| `/api/prescribe` | POST | Saves new prescription with prediction snapshot |
| `/api/dashboard/stats` | GET | Dynamic clinic metrics (patient count, prescriptions) |
| `/api/auth/login-doctor` | POST | Doctor authentication with PBKDF2 password verification |
| `/api/patient/auth/validate`| POST | Patient mobile and identity validation |
| `/api/patient/auth/send-otp` | POST | Dispatches 6-digit cryptographic verification challenge |
| `/api/patient/auth/verify-otp`| POST | Validates OTP and opens authenticated patient session |

---

## 5. Verification & Testing

To test the backend pipeline and all API endpoints at any time, run:

```powershell
# Using the project's virtual environment
& ".venv\Scripts\python.exe" backend/test_pipeline.py
```

### Launching the Complete Application

To start both the Flask Backend (Port 5000) and the Vite React Frontend (Port 5173) simultaneously:
Double-click `run_project.bat` or run:
```powershell
.\run_project.bat
```

* **Frontend Clinical Portal**: [http://localhost:5173](http://localhost:5173)
* **Backend REST API**: [http://127.0.0.1:5000](http://127.0.0.1:5000)

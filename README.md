# Optimized Machine Learning-Based Personalized Drug Effect Prediction & 3D Visualization

Personalized Clinical Decision Support System combining pharmacodynamics, Explainable AI (XAI), multi-candidate drug comparison, Indian medicine pricing (PMBJP Jan Aushadhi), personalized nutrition, and 3D organ visualization.

---

## Quick Start (Run Both Services)

To launch both the **Flask Backend** (Port 5000) and **Vite React Frontend** (Port 5173) together:

### Option 1: Automated Script (Recommended)
Double-click or run:
```powershell
.\run_project.bat
```

### Option 2: Manual Terminal Commands

**Terminal 1 (Backend):**
```powershell
& ".venv\Scripts\python.exe" backend/app.py
```
*API Base*: [http://127.0.0.1:5000](http://127.0.0.1:5000)

**Terminal 2 (Frontend):**
```powershell
cd frontend
npm run dev
```
*Web Portal*: [http://localhost:5173](http://localhost:5173)

---

## Backend Pipeline Architecture

The backend pipeline is organized into a clean, modular 6-stage architecture encapsulated in `backend/pipeline.py`:

1. **Stage 1: Patient Profile Ingestion & Standardization** — Normalizes demographics, age cohort, and clinical complaints.
2. **Stage 2: Pharmacological Safety Screening** — Rule-based allergy cross-reactivity and disease contraindication detection.
3. **Stage 3: Calibrated ML Prediction** — Calculates effectiveness %, adverse side-effect %, DDI %, and 3D organ coordinates.
4. **Stage 4: Multi-Candidate Comparison** — 4-drug comparative evaluation with suitability scoring and PMBJP Jan Aushadhi generic pricing.
5. **Stage 5: Explainable AI & Nutrition** — Feature attribution factors, landmark trial citations, and personalized diet plan.
6. **Stage 6: Multilingual Advisory** — Generates clinical summaries in English, Hinglish, and Marathi.

> For the comprehensive pipeline documentation, diagrams, and API contracts, see [backend/BACKEND_PIPELINE.md](backend/BACKEND_PIPELINE.md).

---

## Verifying Backend & Pipeline Health

Run the automated test suite anytime to verify all pipeline stages and REST API endpoints:
```powershell
& ".venv\Scripts\python.exe" backend/test_pipeline.py
```

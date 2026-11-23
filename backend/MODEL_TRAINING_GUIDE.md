# AI/ML Model Training & Testing Pipeline Guide
**Personalized Pharmacology Drug Effect Prediction System**

---

## 1. Overview

The machine learning engine trains supervised pharmacological regression and classification models to predict:
1. **Target 1 (Regression)**: Personalized Therapeutic Drug Effectiveness Score ($0 - 100\%$).
2. **Target 2 (Regression)**: Adverse Drug Reaction Probability ($0 - 100\%$).
3. **Target 3 (Classification)**: 4-Tier Clinical Risk Level (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`).

### Key Innovation: Dedicated Train & Test Datasets (Excel & CSV)
You can now supply **distinct training and testing files** in **ANY combination of Excel and CSV**:
- **Train on Excel (`.xlsx`) and Test on CSV (`.csv`)** *(Recommended)*
- **Train on CSV (`.csv`) and Test on Excel (`.xlsx`)**
- **Train on Excel (`.xlsx`) and Test on Excel (`.xlsx`)**
- **Train on CSV (`.csv`) and Test on CSV (`.csv`)**
- *(Or train on a single combined dataset with automatic train/test split)*

---

## 2. Universal File Format Support: CSV & Excel

The system natively parses and validates tabular files via the Universal Tabular Ingestion Engine ([`backend/tabular_loader.py`](file:///d:/New%20folder/Final%20Year%20Project/backend/tabular_loader.py)):

| File Category | Supported Extensions | Engine & Capabilities |
| :--- | :--- | :--- |
| **Modern Excel** | `.xlsx`, `.xlsm`, `.xltx`, `.xltm` | Powered natively by `openpyxl` & `pandas`. Reads multi-sheet workbooks, formatted tables, and formula values. |
| **Legacy / Web Excel** | `.xls`, `.xlsb` | Auto-detects XML Spreadsheet 2003, HTML tables, and standard workbooks. |
| **Standard CSV** | `.csv` | Auto-detects encodings (`utf-8-sig`, `utf-8`, `latin-1`, `cp1252`) and delimiters (comma `,`, semicolon `;`, pipe `\|`). |
| **Delimited Text** | `.tsv`, `.txt` | Tab-delimited and custom text formats. |

### Intelligent Fuzzy Column Mapping
Headers are automatically normalized regardless of column naming conventions:
- **Patient Age**: `age`, `patient_age`, `Age (Years)`, `Years`
- **Gender**: `gender`, `sex`, `Patient Gender`, `M/F` (recognizes "Male", "Female", "M", "F", "Man", "Woman", 1, 0)
- **Medication**: `drug_name`, `medication`, `medicine`, `drug`, `treatment`
- **Condition**: `primary_condition`, `diagnosis`, `disease`, `indication`, `pathology`
- **Therapeutic Efficacy**: `effectiveness_pct`, `efficacy`, `Efficacy (%)`, `response_rate`
- **Adverse Risk**: `side_effect_pct`, `toxicity`, `Adverse Risk (%)`, `side_effects`
- **Safety Category**: `overall_risk_level`, `risk_level`, `Risk`, `Safety Category`

---

## 3. Pre-Generated Train and Test Datasets

The repository includes pre-partitioned clinical pharmacology datasets ready for immediate use:

| Role | File Path | Format | Records |
| :--- | :--- | :--- | :--- |
| **Training (Excel)** | `backend/dataset/clinical_drug_train.xlsx` | Modern Excel (`.xlsx`) | 13,520 records |
| **Training (CSV)** | `backend/dataset/clinical_drug_train.csv` | Standard CSV (`.csv`) | 13,520 records |
| **Testing (Excel)** | `backend/dataset/clinical_drug_test.xlsx` | Modern Excel (`.xlsx`) | 3,380 records |
| **Testing (CSV)** | `backend/dataset/clinical_drug_test.csv` | Standard CSV (`.csv`) | 3,380 records |
| **Combined** | `backend/dataset/clinical_drug_dataset.csv` | Standard CSV (`.csv`) | 16,900 records |

---

## 4. How to Train and Test the Model

### Option A: Interactive One-Click Script (`train_model.bat`)

Double-click [`train_model.bat`](file:///d:/New%20folder/Final%20Year%20Project/train_model.bat) or run in PowerShell:
```powershell
.\train_model.bat
```

#### Features:
1. **Interactive Menu**:
   ```text
   Select an ML Training option:
     [1] Train on Excel (.xlsx) and Test on CSV (.csv) [Recommended]
     [2] Train on CSV (.csv) and Test on Excel (.xlsx)
     [3] Train and Test using CSV files (.csv)
     [4] Train on single combined dataset (80/20 train/test auto-split)
     [5] Enter custom Train and Test file paths manually
   ```
2. **Two-File Drag & Drop**: Drag and drop **TWO files** (e.g. `train.xlsx` and `test.csv`) onto `train_model.bat` in Windows Explorer to automatically train on the first file and test on the second!
3. **Single-File Drag & Drop**: Drag and drop a single file to train with auto-splitting.

---

### Option B: Python Command-Line Interface (CLI)

#### 1. Train on Excel (`.xlsx`) and Test on CSV (`.csv`):
```powershell
& ".venv\Scripts\python.exe" backend/train_model.py --train backend/dataset/clinical_drug_train.xlsx --test backend/dataset/clinical_drug_test.csv --epochs 15
```

#### 2. Train on CSV (`.csv`) and Test on Excel (`.xlsx`):
```powershell
& ".venv\Scripts\python.exe" backend/train_model.py --train backend/dataset/clinical_drug_train.csv --test backend/dataset/clinical_drug_test.xlsx --epochs 15
```

#### 3. Quick Positional Arguments (1st = Train, 2nd = Test):
```powershell
& ".venv\Scripts\python.exe" backend/train_model.py path/to/train.xlsx path/to/test.csv
```

#### 4. Train on Single Combined Dataset (Auto-Split):
```powershell
& ".venv\Scripts\python.exe" backend/train_model.py --dataset backend/dataset/clinical_drug_dataset.csv --epochs 15 --split 0.20
```

#### Available CLI Arguments:
| Argument | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `--train`, `-tr` | `str` | `clinical_drug_train.xlsx` | Path to Training dataset (`.xlsx`, `.csv`, `.xls`, `.tsv`) |
| `--test`, `-te` | `str` | `clinical_drug_test.csv` | Path to Testing dataset (`.xlsx`, `.csv`, `.xls`, `.tsv`) |
| `--dataset`, `-d` | `str` | None | Path to single dataset (auto-partitioned by `--split`) |
| `files [pos]` | `list` | None | If 2 files are passed: 1st=Train, 2nd=Test |
| `--epochs` | `int` | `15` | Number of gradient optimization iterations (5 - 50) |
| `--split` | `float` | `0.20` | Fraction reserved for validation if using single dataset |
| `--verbose` | `flag` | `True` | Outputs step logs, epoch metrics, and benchmarks |

---

### Option C: Windows File Dialog Picker (`train_with_file_picker.bat`)

If you prefer selecting your files with a Windows Explorer popup instead of typing file paths:
1. Double-click [`train_with_file_picker.bat`](file:///d:/New%20folder/Final%20Year%20Project/train_with_file_picker.bat).
2. A Windows file selection dialog opens to pick your **Training dataset** (`.xlsx` or `.csv`).
3. A second popup opens to pick your **Testing dataset** (`.xlsx` or `.csv`).
4. Training executes in your PowerShell/Terminal window immediately.

---

## 5. Sample Terminal Output

```text
============================================================================
PERSONALIZED DRUG PREDICTION: AI/ML MODEL TRAINING ENGINE
Supported Formats : .csv, .xlsx, .xls, .xlsm, .xltx, .xltm, .tsv, .txt
Training Mode     : SEPARATE TRAIN & TEST DATASETS
Train File        : clinical_drug_train.xlsx [Modern Excel Spreadsheet (.XLSX)]
Test File         : clinical_drug_test.csv [Standard CSV Dataset (.CSV)]
Epochs            : 15
============================================================================
[07:38:41] [START]    Initializing ML Pipeline in SEPARATE TRAIN & TEST mode:
[07:38:41] [INFO]       * Training Dataset: clinical_drug_train.xlsx [Modern Excel Spreadsheet (.XLSX)]
[07:38:41] [INFO]       * Testing Dataset : clinical_drug_test.csv [Standard CSV Dataset (.CSV)]
[07:38:49] [INFO]     Successfully ingested 13520 training records and 3380 test records.
[07:38:49] [INFO]     Extracted 7 standardized clinical features for supervised gradient optimization.
[07:38:49] [TRAIN]    Optimizing Target 1: Drug Therapeutic Effectiveness Score (0 - 100%)...
[07:38:49] [TRAIN]    Epoch  1/15 - Loss: 158.6141 | Val Loss: 165.7358 | Val MAE: 12.87% | R2: 0.7025
[07:38:49] [TRAIN]    Epoch  4/15 - Loss: 51.4356  | Val Loss: 49.1989  | Val MAE: 7.01%  | R2: 0.9117
[07:38:49] [TRAIN]    Epoch  8/15 - Loss: 36.4510  | Val Loss: 38.1205  | Val MAE: 5.60%  | R2: 0.9315
[07:38:49] [TRAIN]    Epoch 15/15 - Loss: 28.1120  | Val Loss: 31.0540  | Val MAE: 4.64%  | R2: 0.9423
[07:38:49] [SUCCESS] Target 1 Model Converged: R2 = 0.9423, MAE = 4.64%, RMSE = 5.67%
[07:38:49] [TRAIN]    Optimizing Target 2: Adverse Reaction Probability (0 - 100%)...
[07:38:50] [SUCCESS] Target 2 Model Converged: R2 = 0.7774, MAE = 5.82%, RMSE = 7.23%
[07:38:50] [TRAIN]    Evaluating Target 3: 4-Tier Clinical Risk Classification on Test Set...
[07:38:50] [SUCCESS] Classification Evaluation Complete: Test Set Accuracy = 78.55%
[07:38:50] [SUCCESS] Model artifacts and training telemetry exported to model_artifacts.json

============================================================================
TRAINING PROCESS & BENCHMARK SUMMARY
============================================================================
Model Architecture       : Personalized-Pharmacology-Gradient-Ensemble v2.5
Train Dataset File       : clinical_drug_train.xlsx (Modern Excel Spreadsheet (.XLSX)) - 13520 records
Test Dataset File        : clinical_drug_test.csv (Standard CSV Dataset (.CSV)) - 3380 records
Total Trial Records      : 16900 records
Effectiveness R2 Score   : 0.9423 (MAE: 4.64%)
Adverse Risk R2 Score    : 0.7774 (MAE: 5.82%)
Classification Accuracy  : 78.55%

Top 4 Pharmacological Feature Weights:
  * Allergy Conflict           : 29.5% relative impact
  * Indication Match           : 19.1% relative impact
  * Normalized Age             : 17.5% relative impact
  * Organ Clearance Mismatch   : 14.3% relative impact
============================================================================
Model successfully trained and persisted to: backend/model_artifacts.json
```

---

## 6. REST API Endpoints for Automation

| Method | Endpoint | Description | Payload / Query |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/ml/upload-train-test` | Uploads both Train and Test datasets simultaneously | Form-data: `train_file`, `test_file` |
| `POST` | `/api/ml/upload-dataset` | Ingests a single dataset with specific role | Form-data: `file`, `role` (`train`, `test`, `combined`) |
| `GET` | `/api/ml/train-template` | Downloads Training dataset template | `?format=excel` or `?format=csv` |
| `GET` | `/api/ml/test-template` | Downloads Testing dataset template | `?format=excel` or `?format=csv` |
| `POST` | `/api/ml/retrain` | Triggers model training on Train & Test files | JSON: `{"use_train_test": true, "epochs": 15}` |
| `GET` | `/api/ml/dataset-stats` | Returns current model metrics, available datasets, and confusion matrix | None |

---

## 7. Model Persistence & Dynamic Hot-Reloading

Every training execution automatically updates:
```
backend/model_artifacts.json
```
The active Flask server dynamically reads this file for real-time predictions (`/api/predict` and `/api/compare`), meaning new model weights and calibrations take effect **instantly without needing to restart the backend server**.

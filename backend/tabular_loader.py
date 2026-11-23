# -*- coding: utf-8 -*-
"""
Universal Tabular Data Ingestion Engine for Clinical Pharmacological Datasets
Supports all standard CSV and Excel formats:
  - CSV / Delimited: .csv, .tsv, .txt (auto-detects delimiters: comma, semicolon, tab, pipe; auto-detects encodings)
  - Excel Workbooks: .xlsx, .xlsm, .xltx, .xltm (via openpyxl and pandas)
  - Legacy/Exported Excel: .xls (auto-handles XML Spreadsheet 2003, HTML tables, and standard workbooks)

Includes intelligent fuzzy column mapping, resilient type coercion, missing-field inference,
and clinical risk categorization.
"""

import os
import re
import csv
import io
import math
import pandas as pd
import openpyxl

SUPPORTED_EXTENSIONS = {
    "csv": [".csv", ".tsv", ".txt"],
    "excel": [".xlsx", ".xlsm", ".xltx", ".xltm", ".xls", ".xlsb"]
}

ALL_SUPPORTED_EXTENSIONS = [
    ".csv", ".xlsx", ".xls", ".xlsm", ".xltx", ".xltm", ".tsv", ".txt"
]

# Canonical feature keys to list of fuzzy alias regex/patterns
COLUMN_ALIASES = {
    "trial_id": [
        "trial_id", "trialid", "trial", "patient_id", "patientid", "id",
        "subject_id", "subjectid", "study_id", "studyid", "record_id", "case_id"
    ],
    "age": [
        "age", "patient_age", "patientage", "pt_age", "years", "age_years", "age_yrs"
    ],
    "gender": [
        "gender", "sex", "patient_gender", "patientgender", "pt_gender", "gender_code"
    ],
    "primary_condition": [
        "primary_condition", "primarycondition", "condition", "disease",
        "indication", "primary_indication", "diagnosis", "pathology", "illness"
    ],
    "drug_name": [
        "drug_name", "drugname", "drug", "medicine", "medication",
        "treatment", "agent", "compound", "drug_administered", "rx_name"
    ],
    "indication_match": [
        "indication_match", "indicationmatch", "match_indication", "indication_fit",
        "on_label", "onlabel", "indicated", "indication_score"
    ],
    "organ_mismatch": [
        "organ_mismatch", "organmismatch", "organ_toxicity", "renal_mismatch",
        "hepatic_mismatch", "clearance_hazard", "organ_hazard", "toxicity_flag"
    ],
    "ddi_hazard_level": [
        "ddi_hazard_level", "ddihazardlevel", "ddi_hazard", "ddi",
        "drug_interaction", "interaction_risk", "interaction_severity", "ddi_risk"
    ],
    "allergy_conflict": [
        "allergy_conflict", "allergyconflict", "allergy", "allergic_reaction",
        "allergy_risk", "hypersensitivity", "allergy_flag", "has_allergy"
    ],
    "geriatric_flag": [
        "geriatric_flag", "geriatricflag", "geriatric", "elderly",
        "is_elderly", "senior", "aged_flag", "geriatric_risk"
    ],
    "is_pregnant": [
        "is_pregnant", "ispregnant", "pregnant", "pregnancy",
        "pregnancy_flag", "gestation", "maternal"
    ],
    "effectiveness_pct": [
        "effectiveness_pct", "effectivenesspct", "effectiveness", "efficacy",
        "efficacy_pct", "efficacypct", "response_rate", "cure_rate", "benefit_pct"
    ],
    "side_effect_pct": [
        "side_effect_pct", "sideeffectpct", "side_effect", "side_effects",
        "adverse_risk", "adverse_pct", "adverse_events", "toxicity_pct", "safety_risk_pct"
    ],
    "overall_risk_level": [
        "overall_risk_level", "overallrisklevel", "risk_level", "risklevel",
        "risk", "overall_risk", "safety_risk", "clinical_risk", "risk_category"
    ],
    "clinical_outcome": [
        "clinical_outcome", "clinicaloutcome", "outcome", "clinical_response",
        "response", "treatment_result", "clinical_status"
    ]
}

def clean_key(col_name):
    """Normalizes string column header for fuzzy dictionary mapping."""
    if not col_name:
        return ""
    s = str(col_name).strip().lower()
    # remove special chars, units like (%), brackets, punctuation
    s = re.sub(r"[\s_\-\(\)\[\]\%/\\\.,:]+", "", s)
    return s

def map_column_headers(raw_columns):
    """
    Maps raw DataFrame/CSV column names to standard clinical schema keys.
    Returns mapping dict: {raw_col_name: canonical_key}
    """
    mapping = {}
    normalized_raw = {clean_key(col): col for col in raw_columns}

    for canonical, aliases in COLUMN_ALIASES.items():
        matched_raw = None
        for alias in aliases:
            cleaned_alias = clean_key(alias)
            if cleaned_alias in normalized_raw:
                matched_raw = normalized_raw[cleaned_alias]
                break

        # Fallback substring match if exact normalized key wasn't found
        if not matched_raw:
            for cleaned_raw, original in normalized_raw.items():
                if any(cleaned_raw == clean_key(a) or clean_key(a) in cleaned_raw for a in aliases[:3]):
                    matched_raw = original
                    break

        if matched_raw:
            mapping[matched_raw] = canonical

    return mapping

def read_csv_resilient(file_path_or_bytes):
    """
    Reads CSV or delimited text file with automatic detection of encoding and separator.
    Handles comma, semicolon, tab, pipe, with utf-8, utf-8-sig, latin-1, cp1252.
    """
    encodings = ["utf-8-sig", "utf-8", "latin-1", "cp1252", "iso-8859-1"]
    separators = [",", ";", "\t", "|"]

    # If passed as bytes or StringIO/BytesIO
    if isinstance(file_path_or_bytes, (bytes, bytearray)):
        raw_bytes = file_path_or_bytes
        for enc in encodings:
            try:
                text = raw_bytes.decode(enc)
                # Auto-detect separator with csv.Sniffer
                try:
                    dialect = csv.Sniffer().sniff(text[:4096], delimiters=",;\t|")
                    sep = dialect.delimiter
                except Exception:
                    sep = None

                df = pd.read_csv(io.StringIO(text), sep=sep, engine="python")
                if not df.empty and len(df.columns) > 1:
                    return df
            except Exception:
                continue
        # Fallback pandas standard
        return pd.read_csv(io.BytesIO(raw_bytes), encoding="utf-8-sig", on_bad_lines="skip")

    # If passed as file path
    file_path = file_path_or_bytes
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    # Sniff encoding and separator
    for enc in encodings:
        try:
            with open(file_path, "r", encoding=enc) as f:
                sample = f.read(4096)
                if not sample.strip():
                    continue

                try:
                    dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
                    sep = dialect.delimiter
                except Exception:
                    # Count occurrences of candidate separators in the first non-empty line
                    first_line = sample.splitlines()[0] if sample.splitlines() else ""
                    counts = {s: first_line.count(s) for s in separators}
                    sep = max(counts, key=counts.get) if any(counts.values()) else ","

            df = pd.read_csv(file_path, sep=sep, encoding=enc, engine="python", on_bad_lines="skip")
            if not df.empty:
                return df
        except Exception:
            continue

    # Final fallback
    return pd.read_csv(file_path, encoding="latin-1", on_bad_lines="skip")

def read_excel_resilient(file_path_or_bytes):
    """
    Reads Excel spreadsheet (.xlsx, .xlsm, .xltx, .xltm, .xls).
    Attempts openpyxl engine first, then checks for XML Spreadsheet 2003 or HTML table disguised as .xls.
    """
    # 1. Try openpyxl via pandas
    try:
        return pd.read_excel(file_path_or_bytes, engine="openpyxl")
    except Exception as exc1:
        pass

    # 2. Try default pandas engine
    try:
        return pd.read_excel(file_path_or_bytes)
    except Exception as exc2:
        pass

    # 3. Check if file is actually an XML Spreadsheet 2003 or HTML table disguised as .xls or .xlsx
    try:
        if isinstance(file_path_or_bytes, str) and os.path.exists(file_path_or_bytes):
            with open(file_path_or_bytes, "r", encoding="utf-8", errors="ignore") as f:
                header = f.read(2048).lower()
        elif isinstance(file_path_or_bytes, (bytes, bytearray)):
            header = file_path_or_bytes[:2048].decode("utf-8", errors="ignore").lower()
        else:
            header = ""

        if "<html" in header or "<table" in header:
            dfs = pd.read_html(file_path_or_bytes)
            if dfs:
                return dfs[0]

        if "<?xml" in header or "<workbook" in header:
            # Parse XML table rows
            import xml.etree.ElementTree as ET
            if isinstance(file_path_or_bytes, str):
                tree = ET.parse(file_path_or_bytes)
                root = tree.getroot()
            else:
                root = ET.fromstring(file_path_or_bytes)

            rows_data = []
            for row in root.iter():
                if row.tag.endswith("Row"):
                    cells = [c.text or "" for c in row.iter() if c.tag.endswith("Data")]
                    if cells:
                        rows_data.append(cells)
            if rows_data:
                header_row = rows_data[0]
                return pd.DataFrame(rows_data[1:], columns=header_row)
    except Exception:
        pass

    # 4. If all else fails, attempt CSV parser (sometimes CSV is saved with .xls extension)
    try:
        return read_csv_resilient(file_path_or_bytes)
    except Exception:
        raise ValueError(
            "Could not parse Excel spreadsheet. Please ensure the file is a valid .xlsx or .csv workbook."
        )

def load_tabular_file(file_path_or_bytes, original_filename=None):
    """
    Main entry point for loading any CSV or Excel file.
    Accepts:
      - file_path (str)
      - file bytes or file-like stream with original_filename hint
    Returns:
      cleaned_records (list of dicts matching clinical schema)
    """
    # Determine file format hint
    filename = original_filename or (file_path_or_bytes if isinstance(file_path_or_bytes, str) else "dataset.csv")
    ext = os.path.splitext(filename)[1].lower() if filename else ".csv"

    if ext in SUPPORTED_EXTENSIONS["excel"]:
        df = read_excel_resilient(file_path_or_bytes)
    else:
        df = read_csv_resilient(file_path_or_bytes)

    if df.empty:
        raise ValueError(f"The uploaded file '{os.path.basename(str(filename))}' contains no records.")

    # Drop columns that are completely empty or Unnamed
    df = df.dropna(how="all", axis=1)
    df = df.dropna(how="all", axis=0)

    # Clean raw column names
    raw_columns = [str(col).strip() for col in df.columns]
    df.columns = raw_columns
    col_mapping = map_column_headers(raw_columns)

    # Rename recognized columns to canonical keys
    df_renamed = df.rename(columns=col_mapping)

    cleaned_records = []
    for idx, row in df_renamed.iterrows():
        # Age
        try:
            val = row.get("age")
            if pd.isna(val) or val is None or str(val).strip() == "":
                age = 45.0
            else:
                age = float(re.sub(r"[^\d\.]", "", str(val)) or 45.0)
        except Exception:
            age = 45.0

        # Gender
        raw_g = str(row.get("gender", "male")).strip().lower()
        if raw_g in ["1", "1.0", "male", "m", "man"]:
            gender_num = 1.0
        elif raw_g in ["0", "0.0", "female", "f", "woman"]:
            gender_num = 0.0
        else:
            gender_num = 1.0

        # Indication Match (0.0 to 1.0)
        try:
            im_val = row.get("indication_match")
            if pd.isna(im_val) or im_val is None:
                ind_match = 1.0
            else:
                ind_match = float(im_val)
        except Exception:
            ind_match = 1.0

        # Organ Mismatch (0.0 to 1.0)
        try:
            om_val = row.get("organ_mismatch")
            if pd.isna(om_val) or om_val is None:
                organ_mis = 0.0
            else:
                organ_mis = float(om_val)
        except Exception:
            organ_mis = 0.0

        # DDI Hazard Level (0 to 3)
        try:
            ddi_val = row.get("ddi_hazard_level")
            if pd.isna(ddi_val) or ddi_val is None:
                ddi_haz = 0.0
            else:
                ddi_haz = float(ddi_val)
        except Exception:
            ddi_haz = 0.0

        # Allergy Conflict (0.0 to 1.0)
        try:
            all_val = row.get("allergy_conflict")
            if pd.isna(all_val) or all_val is None:
                allergy_conf = 0.0
            else:
                allergy_conf = float(all_val)
        except Exception:
            allergy_conf = 0.0

        # Geriatric Flag
        g_val = row.get("geriatric_flag")
        if not pd.isna(g_val) and g_val is not None:
            g_str = str(g_val).strip().lower()
            geriatric = 1.0 if g_str in ["1", "1.0", "true", "yes", "y"] or age >= 65 else 0.0
        else:
            geriatric = 1.0 if age >= 65 else 0.0

        # Is Pregnant
        p_val = row.get("is_pregnant")
        if not pd.isna(p_val) and p_val is not None:
            p_str = str(p_val).strip().lower()
            is_pregnant = 1.0 if p_str in ["1", "1.0", "true", "yes", "y"] else 0.0
        else:
            is_pregnant = 0.0

        # Targets: Effectiveness (%)
        try:
            eff_val = row.get("effectiveness_pct")
            if pd.isna(eff_val) or eff_val is None or str(eff_val).strip() == "":
                eff = max(10.0, 85.0 - (organ_mis * 20.0 + ddi_haz * 15.0))
            else:
                eff = float(re.sub(r"[^\d\.]", "", str(eff_val)) or 80.0)
        except Exception:
            eff = 80.0
        eff = round(max(0.0, min(100.0, eff)), 2)

        # Targets: Side Effect (%)
        try:
            side_val = row.get("side_effect_pct")
            if pd.isna(side_val) or side_val is None or str(side_val).strip() == "":
                side = min(95.0, 10.0 + organ_mis * 25.0 + ddi_haz * 20.0 + allergy_conf * 40.0)
            else:
                side = float(re.sub(r"[^\d\.]", "", str(side_val)) or 20.0)
        except Exception:
            side = 20.0
        side = round(max(0.0, min(100.0, side)), 2)

        # Risk Classification
        risk_raw = str(row.get("overall_risk_level") or "").strip().upper()
        if risk_raw in ["LOW", "MODERATE", "MEDIUM", "HIGH", "CRITICAL", "SEVERE"]:
            if risk_raw == "MEDIUM":
                risk = "MODERATE"
            elif risk_raw == "SEVERE":
                risk = "CRITICAL"
            else:
                risk = risk_raw
        else:
            if side >= 50.0 or allergy_conf > 0:
                risk = "CRITICAL"
            elif side >= 35.0 or ddi_haz >= 2:
                risk = "HIGH"
            elif side >= 20.0 or ddi_haz >= 1:
                risk = "MODERATE"
            else:
                risk = "LOW"

        # Metadata
        t_id = str(row.get("trial_id") or "").strip()
        if not t_id or t_id == "nan":
            t_id = f"CT-{10001 + idx}"

        drug = str(row.get("drug_name") or "").strip()
        if not drug or drug == "nan":
            drug = "Standard Drug"

        cond = str(row.get("primary_condition") or "").strip()
        if not cond or cond == "nan":
            cond = "Primary Indication"

        outcome = str(row.get("clinical_outcome") or "").strip()
        if not outcome or outcome == "nan":
            if risk in ["LOW", "MODERATE"] and eff >= 75.0:
                outcome = "Optimal Efficacy"
            elif risk == "CRITICAL":
                outcome = "Severe Adverse Reaction"
            else:
                outcome = "Evaluated Response"

        cleaned_records.append({
            "trial_id": t_id,
            "age": age,
            "gender": gender_num,
            "indication_match": ind_match,
            "organ_mismatch": organ_mis,
            "ddi_hazard_level": ddi_haz,
            "allergy_conflict": allergy_conf,
            "geriatric_flag": geriatric,
            "is_pregnant": is_pregnant,
            "effectiveness_pct": eff,
            "side_effect_pct": side,
            "overall_risk_level": risk,
            "clinical_outcome": outcome,
            "drug_name": drug,
            "primary_condition": cond
        })

    return cleaned_records

def export_records_to_csv(records, target_path):
    """Saves records list to standard CSV file."""
    if not records:
        return target_path
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    with open(target_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(records[0].keys()))
        writer.writeheader()
        writer.writerows(records)
    return target_path

def export_records_to_excel(records, target_path):
    """Saves records list to styled .xlsx Excel file using openpyxl."""
    if not records:
        return target_path
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    df = pd.DataFrame(records)
    with pd.ExcelWriter(target_path, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="ClinicalDataset", index=False)
        # Apply header styling with openpyxl
        ws = writer.sheets["ClinicalDataset"]
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
        for cell in ws[1]:
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center", vertical="center")
    return target_path

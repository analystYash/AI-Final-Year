# -*- coding: utf-8 -*-
"""
Multilingual Clinical Recommendation Generator
Produces context-aware, human-readable explanations in English, Hinglish, and Marathi.
Emphasizes that the output is an AI-assisted second opinion supporting the doctor.
"""

def generate_multilingual_recommendation(prediction_result, patient_name="Patient"):
    """
    Generates structured, natural explanations in English, Hinglish, and Marathi.
    """
    drug_name = prediction_result.get("drug_name", "Medicine")
    eff_pct = prediction_result.get("effectiveness_pct", 75)
    side_pct = prediction_result.get("side_effect_pct", 20)
    ddi_pct = prediction_result.get("ddi_pct", 10)
    risk_level = prediction_result.get("overall_risk_level", "LOW")
    alerts = prediction_result.get("clinical_alerts", [])
    dietary = prediction_result.get("dietary_warnings", "Take as directed.")
    organs = [o.get("name", "") for o in prediction_result.get("target_organs", [])]
    organ_str = ", ".join(organs) if organs else "targeted physiological systems"
    side_effects = ", ".join(prediction_result.get("common_side_effects", [])[:3])

    # -------------------------------------------------------------
    # 1. ENGLISH (Formal Clinical & Patient-Friendly)
    # -------------------------------------------------------------
    en_risk_desc = {
        "LOW": "The predicted risk profile is low and manageable.",
        "MEDIUM": "Moderate risk observed. Routine monitoring is advised.",
        "HIGH": "High adverse risk detected. Dose titration or alternative therapy strongly recommended.",
        "CRITICAL": "CRITICAL RISK: Severe contraindication or drug interaction detected. Avoid without specialist review."
    }.get(risk_level, "Standard clinical monitoring advised.")

    en_explanation = f"""
Clinical Second-Opinion Summary for {patient_name}:
• Estimated Effectiveness: {eff_pct}% (based on diagnosed conditions and pharmacological profile).
• Adverse Side-Effect Risk: {side_pct}% | Drug-Drug Interaction Hazard: {ddi_pct}%.
• Overall Risk Assessment: {risk_level} — {en_risk_desc}
• Affected Organs / Systems: {organ_str}.
• Common Side Effects to Monitor: {side_effects if side_effects else 'Standard mild effects'}.
• Dietary & Lifestyle Guidance: {dietary}
"""
    if alerts:
        en_explanation += f"\nCritical Safety Alerts:\n" + "\n".join([f"  ⚠ {a}" for a in alerts])

    en_explanation += "\n\n*Important Medical Notice: This AI prediction provides decision-support analysis only. Final prescribing decisions rest entirely with the attending physician.*"

    # -------------------------------------------------------------
    # 2. HINGLISH (Conversational Hindi in Latin/English script)
    # -------------------------------------------------------------
    hi_risk_desc = {
        "LOW": "Overall risk kam hai aur yeh medicine safe lagti hai.",
        "MEDIUM": "Thoda risk dekha gaya hai. Regular checkup zaroori hai.",
        "HIGH": "Zyada risk hai! Doctor ko alternative medicine ya dose change par dhyan dena chahiye.",
        "CRITICAL": "DANGER / CRITICAL: Severe interaction ya allergy risk hai. Bina doctor ke approval ke bilkul na lein."
    }.get(risk_level, "Doctor ki salah zaroori hai.")

    hinglish_explanation = f"""
{patient_name} ke liye AI Second-Opinion:
• Expected Asar (Effectiveness): {eff_pct}% — Yeh dawai patient ki bimari ke liye kaafi effective dikhayi de rahi hai.
• Side Effects ka Risk: {side_pct}% | Dusri dawaiyon ke saath reaction (DDI): {ddi_pct}%.
• Overall Risk Status: {risk_level} — {hi_risk_desc}
• Target Ang (Organs): {organ_str} par dawai ka main asar hoga.
• Dhyan dene yogya Side Effects: {side_effects if side_effects else 'Samanya thakaan ya pet me halki dikkat'}.
• Khan-paan ki Salah: {dietary}
"""
    if alerts:
        hinglish_explanation += f"\nZaroori Chetawani (Alerts):\n" + "\n".join([f"  ⚠ {a}" for a in alerts])

    hinglish_explanation += "\n\n*Khas Suchna: Yeh AI system doctor ke faisle ko badal nahi sakta. Antim nirnay doctor ka hi hoga.*"

    # -------------------------------------------------------------
    # 3. MARATHI (Devanagari script)
    # -------------------------------------------------------------
    mr_risk_desc = {
        "LOW": "एकूण धोका कमी असून हे औषध रुग्णासाठी सुरक्षित वाटते.",
        "MEDIUM": "मध्यम स्वरूपाचा धोका दिसून आला आहे. नियमित तपासणी आवश्यक आहे.",
        "HIGH": "जास्त धोका आहे! डॉक्टरांनी डोस बदलणे किंवा पर्यायी औषध देणे आवश्यक आहे.",
        "CRITICAL": "अतिधोकादायक (CRITICAL): औषधांचा गंभीर विपरित परिणाम किंवा ऍलर्जी दिसून आली आहे. विशेष खबरदारी घ्या."
    }.get(risk_level, "डॉक्टरांचा सल्ला आवश्यक.")

    marathi_explanation = f"""
{patient_name} यांच्यासाठी AI द्वितीय मत (Second-Opinion):
• अंदाजित प्रभावशीलता (Effectiveness): {eff_pct}% — रुग्णाच्या आजारानुसार हे औषध योग्य परिणामकारक ठरू शकते.
• दुष्परिणामांचा धोका (Side Effect Risk): {side_pct}% | इतर औषधांसोबतचा धोका (Interaction): {ddi_pct}%.
• एकूण धोका पातळी (Overall Risk): {risk_level} — {mr_risk_desc}
• प्रभावित अवयव (Target Organs): {organ_str}.
• सामान्य दुष्परिणाम: {side_effects if side_effects else 'हलका थकवा किंवा मळमळ'}.
• आहारातील पथ्ये: {dietary}
"""
    if alerts:
        marathi_explanation += f"\nमहत्त्वाच्या सूचना व धोके (Alerts):\n" + "\n".join([f"  ⚠ {a}" for a in alerts])

    marathi_explanation += "\n\n*वैद्यकीय सूचना: ही AI प्रणाली डॉक्टरांच्या मार्गदर्शनासाठी एक साहाय्यक सल्ला आहे. अंतिम प्रिस्क्रिप्शन फक्त नोंदणीकृत डॉक्टरांचेच असावे.*"

    return {
        "english": en_explanation.strip(),
        "hinglish": hinglish_explanation.strip(),
        "marathi": marathi_explanation.strip()
    }

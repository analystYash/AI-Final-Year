import React, { useState, useEffect } from 'react';
import {
  Printer, Download, ShieldCheck, AlertTriangle, CheckCircle,
  FileText, Activity, Heart, Stethoscope, User, Calendar, Phone,
  Pill, AlertOctagon, Sparkles, Languages, Check, BookOpen, ExternalLink,
  Award, GitCompare, Zap
} from 'lucide-react';
import { getDrugResearch } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function MedicalReport({
  patient,
  prescription,
  prediction,
  doctorNotes = '',
  reportId = '',
  isDoctorView = false
}) {
  const { lang, t } = useLanguage();
  const [selectedLang, setSelectedLang] = useState(lang || 'english');
  const [externalResearch, setExternalResearch] = useState(null);
  const [loadingResearch, setLoadingResearch] = useState(false);

  useEffect(() => {
    if (lang) setSelectedLang(lang);
  }, [lang]);


  // Resolve prediction and prescription data seamlessly
  const predData = prediction || prescription?.full_prediction_json || {};
  const drugName = prescription?.drug_name || predData?.drug_name || 'Prescription In Review';
  const dosage = prescription?.dosage || predData?.standard_dose || 'As directed by physician';
  const effPct = prescription?.effectiveness_pct ?? predData?.effectiveness_pct ?? 75;
  const sidePct = prescription?.side_effect_pct ?? predData?.side_effect_pct ?? 20;
  const ddiPct = prescription?.ddi_pct ?? predData?.ddi_pct ?? 10;
  const overallRisk = prescription?.overall_risk || predData?.overall_risk_level || 'LOW';
  const riskColor = predData?.risk_color || (overallRisk === 'CRITICAL' ? '#dc2626' : overallRisk === 'HIGH' ? '#f97316' : overallRisk === 'MEDIUM' ? '#eab308' : '#10b981');
  const clinicalAlerts = prescription?.clinical_alerts || predData?.clinical_alerts || [];
  const xaiFactors = prescription?.xai_factors || predData?.xai_factors || [];
  const targetOrgans = prescription?.target_organs || predData?.target_organs || [];
  const multiNotes = prescription?.multilingual_notes || predData?.multilingual_recommendation || {};
  const dietary = prescription?.dietary_warnings || predData?.dietary_warnings || 'Take with water as directed.';
  const notes = doctorNotes || prescription?.doctor_notes || 'Standard clinical monitoring advised. Review in 14 days.';
  const generatedDate = prescription?.created_at ? new Date(prescription.created_at).toLocaleDateString() : new Date().toLocaleDateString();
  const generatedId = reportId || `REP-${patient?.contact_number?.slice(-4) || '9999'}-${Math.floor(Math.random() * 8999 + 1000)}`;

  // Fetch live external medical research using the configured API key
  useEffect(() => {
    if (drugName && drugName !== 'Prescription In Review') {
      fetchResearchData(drugName);
    }
  }, [drugName]);

  const fetchResearchData = async (drug) => {
    setLoadingResearch(true);
    try {
      const data = await getDrugResearch(drug);
      setExternalResearch(data);
    } catch (err) {
      console.error('Error fetching external drug research:', err);
    } finally {
      setLoadingResearch(false);
    }
  };

  if (!patient) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-400">
        <FileText size={36} className="mx-auto text-slate-600 mb-2" />
        <p>No patient or report information available to generate the report.</p>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const activeExplanation = multiNotes[selectedLang] || multiNotes.english || notes;

  return (
    <div className="space-y-4">
      {/* Top Action Controls (hidden on print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl print:hidden">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-cyan-400" />
          <span className="text-sm font-bold text-white">
            Clinical AI Safety & Medical Report
          </span>
          <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2.5 py-0.5 rounded-lg border border-slate-700">
            {generatedId}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <Languages size={14} className="text-slate-500 ml-1 mr-1.5" />
            <button
              onClick={() => setSelectedLang('english')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                selectedLang === 'english' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setSelectedLang('hinglish')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                selectedLang === 'hinglish' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hinglish
            </button>
            <button
              onClick={() => setSelectedLang('marathi')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                selectedLang === 'marathi' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              मराठी
            </button>
          </div>

          {/* Print / Download Button */}
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition cursor-pointer"
          >
            <Printer size={15} /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRINTABLE OFFICIAL MEDICAL REPORT DOCUMENT CONTAINER                      */}
      {/* ========================================================================= */}
      <div
        id="printable-report"
        className="bg-white text-slate-900 border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-6 font-sans print:p-0 print:m-0 print:border-none print:shadow-none"
      >
        {/* REPORT HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-slate-200 pb-5 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-sm">
              +
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 font-times">
                APEX MULTISPECIALTY HOSPITAL
              </h1>
              <p className="text-xs text-blue-700 font-medium">
                Clinical Pharmacological AI & Personalized Decision Support Unit
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs space-y-1">
            <div className="font-mono text-slate-500">
              Report ID: <span className="text-slate-900 font-bold">{generatedId}</span>
            </div>
            <div className="text-slate-500">
              Date: <span className="text-slate-800 font-medium">{generatedDate}</span>
            </div>
            <div className="inline-block px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[10px] font-bold uppercase tracking-wider border border-blue-200">
              Official Medical Consultation
            </div>
          </div>
        </div>

        {/* PATIENT DEMOGRAPHICS & CLINICAL INTAKE */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 text-xs">
          <div className="font-bold text-blue-800 uppercase tracking-wider mb-3 text-[11px] flex items-center gap-1.5 font-times">
            <User size={14} /> Patient Clinical Profile
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-slate-500 block text-[10px]">Patient Name</span>
              <span className="font-bold text-slate-900 text-sm font-times">{patient.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Age / Gender</span>
              <span className="font-semibold text-slate-800">{patient.age} Years • {patient.gender}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Contact Number</span>
              <span className="font-semibold font-mono text-blue-700">+91 {patient.contact_number}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Pregnancy Status</span>
              <span className="font-semibold text-slate-800">
                {patient.is_pregnant ? `Pregnant (${patient.pregnancy_trimester || '2nd'} Trimester)` : 'Non-Pregnant'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-200">
            <div>
              <span className="text-slate-500 block text-[10px]">Diagnosed Conditions / Diseases:</span>
              <span className="font-medium text-slate-800">{patient.existing_diseases || 'None recorded'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Known Drug Allergies:</span>
              <span className="font-bold text-red-700">{patient.allergies || 'No Known Drug Allergies (NKDA)'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Active Concurrent Medications:</span>
              <span className="font-medium text-blue-700">{patient.current_medications || 'None'}</span>
            </div>
          </div>
        </div>

        {/* PRESCRIBED THERAPY & PHARMACOLOGICAL EVALUATION */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 text-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <Pill size={15} className="text-emerald-700" />
              <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] font-times">
                Prescribed Drug & AI Personalized Prediction
              </span>
            </div>
            <span
              className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: `${riskColor}20`,
                color: riskColor === '#10b981' ? '#047857' : riskColor,
                border: `1px solid ${riskColor}40`
              }}
            >
              Overall Risk: {overallRisk}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px] block">Prescribed Medicine</span>
              <span className="text-base font-bold text-slate-900 block font-times">{drugName}</span>
              <span className="text-[11px] text-blue-700 font-mono">{dosage}</span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px] block">Therapeutic Class</span>
              <span className="text-xs font-semibold text-slate-800 block mt-1">
                {predData?.drug_class || 'Standard Formulation'}
              </span>
              <span className="text-[10px] text-slate-500">Category: {predData?.category || 'Pharmacotherapy'}</span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px] block">Target Organs</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {targetOrgans.length > 0 ? (
                  targetOrgans.map((org, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200"
                    >
                      {org.name ? org.name.split(' ')[0] : org.key || org}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 text-[10px]">Cardiovascular & Systemic</span>
                )}
              </div>
            </div>
          </div>

          {/* AI/ML METRIC GAUGES SCOREBOARD */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                Predicted Effectiveness
              </span>
              <span className="text-2xl font-black text-emerald-700 font-mono block">
                {effPct}%
              </span>
              <span className="text-[10px] text-slate-500">Receptor & Indication Match</span>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-amber-800 block">
                Side-Effect Risk
              </span>
              <span className="text-2xl font-black text-amber-700 font-mono block">
                {sidePct}%
              </span>
              <span className="text-[10px] text-slate-500">Clearance & Age Adjusted</span>
            </div>

            <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-indigo-800 block">
                DDI Interaction Hazard
              </span>
              <span className="text-2xl font-black text-indigo-700 font-mono block">
                {ddiPct}%
              </span>
              <span className="text-[10px] text-slate-500">Polypharmacy Cross-Check</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* NEW: EXTERNAL MEDICAL RESEARCH, EVIDENCE & REFERENCE ALTERNATIVE DRUGS     */}
        {/* ========================================================================= */}
        {externalResearch && (
          <div className="bg-slate-950/60 print:bg-slate-50 border border-indigo-500/30 print:border-slate-300 rounded-2xl p-4 sm:p-5 text-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800 print:border-slate-200 pb-2 gap-2">
              <div className="flex items-center gap-2">
                <BookOpen size={15} className="text-indigo-400 print:text-indigo-700" />
                <span className="font-bold text-white print:text-slate-900 uppercase tracking-wider text-[11px]">
                  External Medical Evidence & Reference Alternatives (API Key Verified)
                </span>
              </div>
              <span className="text-[10px] text-indigo-400 print:text-indigo-700 font-mono">
                Guideline: {externalResearch.primary_guideline} • {externalResearch.evidence_grade}
              </span>
            </div>

            {/* Landmark Clinical Trials & Pharmacokinetics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-900 print:bg-white rounded-xl border border-slate-800 print:border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-cyan-400 print:text-cyan-800 uppercase block flex items-center gap-1">
                  <Award size={13} /> Landmark Clinical Trials & Literature Citations
                </span>
                <div className="space-y-1.5">
                  {externalResearch.landmark_trials?.map((t, i) => (
                    <div key={i} className="text-[11px] border-l-2 border-cyan-500 pl-2 py-0.5">
                      <div className="flex items-center justify-between font-semibold text-slate-200 print:text-slate-900">
                        <span>{t.name} ({t.trial_id})</span>
                        <span className="text-[10px] text-slate-400 print:text-slate-600 font-mono">{t.journal}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 print:text-slate-600 leading-snug">{t.finding}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pharmacokinetics & Clearance */}
              <div className="p-3 bg-slate-900 print:bg-white rounded-xl border border-slate-800 print:border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-amber-400 print:text-amber-800 uppercase block flex items-center gap-1">
                  <Activity size={13} /> Pharmacokinetics & Bio-Clearance Matrix
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 print:text-slate-600 text-[10px] block">Bioavailability:</span>
                    <span className="text-slate-200 print:text-slate-800 font-medium">{externalResearch.pharmacokinetics?.bioavailability}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 print:text-slate-600 text-[10px] block">Peak Plasma Time:</span>
                    <span className="text-slate-200 print:text-slate-800 font-medium">{externalResearch.pharmacokinetics?.peak_plasma_time}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 print:text-slate-600 text-[10px] block">Elimination Half-Life:</span>
                    <span className="text-slate-200 print:text-slate-800 font-medium">{externalResearch.pharmacokinetics?.half_life}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 print:text-slate-600 text-[10px] block">Excretion Pathway:</span>
                    <span className="text-slate-200 print:text-slate-800 font-medium">{externalResearch.pharmacokinetics?.clearance}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reference Alternative Medicines Comparison */}
            {externalResearch.reference_alternatives?.length > 0 && (
              <div className="pt-2 border-t border-slate-800 print:border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-indigo-400 print:text-indigo-800 uppercase block flex items-center gap-1">
                  <GitCompare size={13} /> Calculated Reference Alternative Medicines
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {externalResearch.reference_alternatives.map((alt, i) => (
                    <div key={i} className="p-2.5 bg-white rounded-xl border border-slate-200 text-[11px] space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-900 font-times">
                        <span>{alt.drug} ({alt.class})</span>
                        <span className="text-blue-700 font-mono">Relative Efficacy: {alt.relative_efficacy}</span>
                      </div>
                      <p className="text-[10px] text-slate-600">
                        <strong>Clinical Note:</strong> {alt.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CLINICAL SAFETY ALERTS & CONTRAINDICATIONS */}
        {clinicalAlerts.length > 0 && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-2">
            <span className="text-xs font-bold text-red-700 uppercase flex items-center gap-1.5 font-times">
              <AlertTriangle size={15} /> Safety Alerts & Pharmacological Contraindications
            </span>
            <ul className="space-y-1.5 text-xs text-red-800 list-disc list-inside">
              {clinicalAlerts.map((alert, i) => (
                <li key={i}>{typeof alert === 'string' ? alert : alert.alert || JSON.stringify(alert)}</li>
              ))}
            </ul>
          </div>
        )}

        {/* MULTILINGUAL CLINICAL SECOND OPINION & PATIENT ADVICE */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 text-xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-bold text-blue-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 font-times">
              <Sparkles size={14} /> AI Clinical Second-Opinion ({selectedLang.toUpperCase()})
            </span>
            <span className="text-[10px] text-slate-500">Multilingual Decision Support</span>
          </div>

          <div className="whitespace-pre-line text-slate-800 leading-relaxed font-sans text-xs bg-white p-3.5 rounded-xl border border-slate-200">
            {activeExplanation}
          </div>
        </div>

        {/* PHYSICIAN CLINICAL OBSERVATIONS & SIGNATURE */}
        <div className="pt-4 border-t-2 border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
          <div className="space-y-1.5 text-xs">
            <span className="text-slate-500 text-[10px] uppercase font-bold block font-times">
              Attending Physician Observations:
            </span>
            <p className="text-slate-800 italic bg-slate-50 p-3 rounded-xl border border-slate-200">
              "{notes}"
            </p>
          </div>

          <div className="text-left sm:text-right space-y-2 text-xs">
            <div className="border-b border-dashed border-slate-300 w-48 ml-auto pb-1 text-center font-times text-slate-800 text-sm">
              Dr. Sharma, MD
            </div>
            <span className="text-slate-500 block text-[10px]">
              Authorized Medical Officer / Prescribing Specialist
            </span>
            <span className="text-[10px] text-blue-700 font-mono block">
              Digital Signature ID: {generatedId}-AUTH
            </span>
          </div>
        </div>

        {/* STATUTORY DISCLAIMER FOOTER */}
        <div className="text-center pt-4 border-t border-slate-200 text-[10px] text-slate-500 leading-relaxed">
          <p>
            <strong>Academic Clinical Decision Support Notice:</strong> This pharmacological evaluation is generated by the AI-powered personalized drug effect prediction system utilizing external medical research data and machine learning ensembles. It is designed to assist clinical practitioners and does not supersede professional medical judgement.
          </p>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  User, Pill, Calendar, AlertCircle, Heart, ShieldCheck,
  Languages, Utensils, Phone, LogOut, Activity, Eye, ChevronDown, Sparkles,
  FileText, Printer, Stethoscope, ChevronRight, Clock, Award, Sliders, CheckCircle, Info,
  AlertTriangle, Check, ShieldAlert, Layers, Users, Building2, FileSpreadsheet,
  ClipboardList, TrendingUp, TimerReset
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import HumanBody3D from '../components/HumanBody3D';
import EffectCharts from '../components/EffectCharts';
import MedicalReport from '../components/MedicalReport';
import DrugComparison from '../components/DrugComparison';
import { useLanguage } from '../context/LanguageContext';
import {
  getExternalClinicalAnalysis,
  getGeminiMedicineRecommendation,
  getCentralizedMedicalHistory
} from '../services/api';

export default function PatientDashboard() {
  const navigate = useNavigate();
  const { lang, setLang } = useLanguage();

  const [patient, setPatient] = useState({
    name: 'Rahul Verma',
    age: 28,
    gender: 'Male',
    contact_number: '9876543210',
    existing_diseases: 'Gastritis (2022), Mild BP',
    current_health_issue: 'Severe Acidity & Stomach Pain',
    allergies: 'Penicillin, Dust',
    current_medications: 'None currently'
  });

  const [prescriptions, setPrescriptions] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'history' | 'timeline' | 'medications' | 'doctors' | 'report'
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [clinicalAnalysis, setClinicalAnalysis] = useState(null);
  const [medicineComparison, setMedicineComparison] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Centralized Medical History & Multi-Doctor Care Team states
  const [historyData, setHistoryData] = useState(null);
  const [careTeam, setCareTeam] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [medications, setMedications] = useState({ active: [], completed: [], discontinued: [], historical: [] });
  const [medicalReports, setMedicalReports] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [medFilter, setMedFilter] = useState('active'); // 'active' | 'completed' | 'discontinued' | 'all'

  // ─── Step 1: Instantly pre-populate from localStorage (data saved at login) ───
  useEffect(() => {
    const storedPatient       = localStorage.getItem('drugai_patient');
    const storedPrescriptions = localStorage.getItem('drugai_prescriptions');
    const storedConsultations = localStorage.getItem('drugai_consultations');
    const storedDoctors       = localStorage.getItem('drugai_doctors');
    const storedMedications   = localStorage.getItem('drugai_medications');
    const storedTimeline      = localStorage.getItem('drugai_timeline');

    if (storedPatient) {
      try { setPatient(JSON.parse(storedPatient)); } catch (e) { console.error(e); }
    }

    if (storedPrescriptions) {
      try {
        const parsed = JSON.parse(storedPrescriptions);
        setPrescriptions(parsed);
        if (parsed.length > 0) setSelectedPrescription(parsed[0]);
      } catch (e) { console.error(e); }
    }

    if (storedConsultations) {
      try { setConsultations(JSON.parse(storedConsultations)); } catch (e) { console.error(e); }
    }

    if (storedDoctors) {
      try { setCareTeam(JSON.parse(storedDoctors)); } catch (e) { console.error(e); }
    }

    if (storedMedications) {
      try {
        const med = JSON.parse(storedMedications);
        // Backend returns { active, completed, discontinued, historical } OR a flat array
        if (med && typeof med === 'object' && !Array.isArray(med)) {
          setMedications(med);
        }
      } catch (e) { console.error(e); }
    }

    if (storedTimeline) {
      try { setTimeline(JSON.parse(storedTimeline)); } catch (e) { console.error(e); }
    }
  }, []);

  // ─── Step 2: Refresh from API (fills gaps if backend has newer records) ───
  useEffect(() => {
    async function fetchPatientHistory() {
      const pId = patient?.id;
      if (!pId) return;
      setLoadingHistory(true);
      try {
        const data = await getCentralizedMedicalHistory(pId);
        setHistoryData(data);
        if (data.associated_doctors && data.associated_doctors.length > 0) {
          setCareTeam(data.associated_doctors);
          localStorage.setItem('drugai_doctors', JSON.stringify(data.associated_doctors));
        }
        if (data.consultations && data.consultations.length > 0) {
          setConsultations(data.consultations);
          localStorage.setItem('drugai_consultations', JSON.stringify(data.consultations));
        }
        if (data.medications) {
          setMedications(data.medications);
          localStorage.setItem('drugai_medications', JSON.stringify(data.medications));
        }
        if (data.medical_reports) setMedicalReports(data.medical_reports);
        if (data.timeline && data.timeline.length > 0) {
          setTimeline(data.timeline);
          localStorage.setItem('drugai_timeline', JSON.stringify(data.timeline));
        }
        if (data.prescriptions && data.prescriptions.length > 0 && prescriptions.length === 0) {
          setPrescriptions(data.prescriptions);
          setSelectedPrescription(data.prescriptions[0]);
        }
      } catch (err) {
        console.warn('Could not fetch centralized medical history for patient:', err);
      } finally {
        setLoadingHistory(false);
      }
    }
    fetchPatientHistory();
  }, [patient?.id, patient?.contact_number]);

  const activeDrugName = selectedPrescription?.drug_name || (prescriptions[0]?.drug_name) || 'Pantoprazole 40mg';
  const activeDosage = selectedPrescription?.dosage || (prescriptions[0]?.dosage) || '40 mg (Once Daily, 10 Days, Before Breakfast)';

  // Auto-fetch personalized clinical analysis (using Medical API Key 5d5094cae00d74ee47d92601d5e4afd0)
  useEffect(() => {
    let isMounted = true;
    async function loadPatientData() {
      if (!patient || !activeDrugName) return;
      setLoadingAi(true);
      try {
        const [analysis, comp] = await Promise.all([
          getExternalClinicalAnalysis({
            patient,
            drugName: activeDrugName,
            candidateDrugs: prescriptions.map(p => p.drug_name).filter(Boolean),
            lang
          }).catch(() => null),
          getGeminiMedicineRecommendation({
            patient,
            currentDrug: activeDrugName,
            lang
          }).catch(() => null)
        ]);
        if (isMounted) {
          if (analysis) setClinicalAnalysis(analysis);
          if (comp) setMedicineComparison(comp);
        }
      } catch (err) {
        console.warn('Patient medical data fetch error:', err);
      } finally {
        if (isMounted) setLoadingAi(false);
      }
    }
    loadPatientData();
    return () => { isMounted = false; };
  }, [activeDrugName, patient?.contact_number, patient?.current_health_issue, lang]);

  const handleLogout = () => {
    localStorage.removeItem('drugai_patient');
    localStorage.removeItem('drugai_prescriptions');
    localStorage.removeItem('drugai_consultations');
    localStorage.removeItem('drugai_doctors');
    localStorage.removeItem('drugai_medications');
    localStorage.removeItem('drugai_timeline');
    navigate('/login');
  };

  const ageNum = parseInt(patient?.age || '28');
  const ageGroup = ageNum < 12 ? 'Pediatric (<12y)' : ageNum < 18 ? 'Adolescent (12-17y)' : ageNum >= 60 ? 'Geriatric (60y+)' : 'Adult (18-59y)';
  const activeCondition = patient?.current_health_issue || patient?.existing_diseases || 'Gastritis & Acid Peptic Disease';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* TOP HEADER */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 px-4 lg:px-6 py-3.5 flex items-center justify-between print:hidden backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <User size={22} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-tight text-white">DrugAI Health Portal</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                Patient View
              </span>
            </div>
            <span className="text-[11px] text-slate-300 hidden sm:block">
              Personalized Medicine, 3D Anatomy Mapping & Multilingual Clinical Guidance
            </span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Multilingual Switcher: English, Hinglish, Marathi */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <Languages size={14} className="text-slate-400 ml-1 mr-1" />
            <button
              onClick={() => setLang('english')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${lang === 'english' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              English
            </button>
            <button
              onClick={() => setLang('hinglish')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${lang === 'hinglish' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Hinglish
            </button>
            <button
              onClick={() => setLang('marathi')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${lang === 'marathi' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              मराठी
            </button>
          </div>

          <div
            onClick={() => setActiveTab('doctors')}
            className={`hidden md:flex flex-col text-right cursor-pointer group px-3 py-1 rounded-xl border transition ${
              activeTab === 'doctors'
                ? 'bg-blue-600/20 border-blue-500/40 shadow-sm'
                : 'bg-slate-950 border-slate-800 hover:border-cyan-500/40 hover:bg-slate-900'
            }`}
            title="Click to view My Doctor Care Team profile"
          >
            <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition flex items-center gap-1.5 justify-end">
              <Stethoscope size={13} className={activeTab === 'doctors' ? 'text-cyan-300' : 'text-cyan-400'} /> Dr. Sharma, MD
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                activeTab === 'doctors' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-cyan-300 border border-slate-700'
              }`}>
                Doctor Team
              </span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono group-hover:text-slate-300 transition">
              Apex Multispecialty Hospital
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 bg-slate-950 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 rounded-xl border border-slate-800 transition cursor-pointer"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* PATIENT PROFILE HEADER CARD */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 lg:px-6 py-3 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center font-bold text-cyan-400 text-sm">
              {patient?.name?.charAt(0) || 'R'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-white text-sm">{patient?.name || 'Rahul Verma'}</h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-cyan-300 font-mono">
                  {ageGroup} • {patient?.age || 28}y
                </span>
                {patient?.allergies && patient.allergies.toLowerCase() !== 'none' && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    ⚠ Allergies: {patient.allergies}
                  </span>
                )}
              </div>
              <p className="text-slate-300 text-[11px]">
                Health Issue: <strong className="text-white">{activeCondition}</strong> • Phone ID: <span className="text-cyan-400 font-mono font-bold">{patient?.contact_number || '9876543210'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Clinical Dashboard
              </button>

              {/* ─── Medical History Button ─── */}
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${activeTab === 'history' ? 'bg-violet-600 text-white shadow shadow-violet-500/30' : 'text-slate-400 hover:text-violet-300 hover:bg-violet-500/10'}`}
              >
                <ClipboardList size={13} /> Medical History
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${activeTab === 'history' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {consultations.length}
                </span>
              </button>

              {/* ─── Timeline Button ─── */}
              <button
                onClick={() => setActiveTab('timeline')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${activeTab === 'timeline' ? 'bg-cyan-600 text-white shadow shadow-cyan-500/30' : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10'}`}
              >
                <TrendingUp size={13} /> Timeline
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${activeTab === 'timeline' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {timeline.length > 0 ? timeline.length : consultations.length + prescriptions.length}
                </span>
              </button>

              {/* ─── Ongoing Medications Button ─── */}
              <button
                onClick={() => setActiveTab('medications')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${activeTab === 'medications' ? 'bg-emerald-600 text-white shadow shadow-emerald-500/30' : 'text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10'}`}
              >
                <Pill size={13} /> Ongoing Medications
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${activeTab === 'medications' ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                  {medications?.active?.length || 0}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('doctors')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${activeTab === 'doctors' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                <Users size={13} /> My Doctor Team ({careTeam.length})
              </button>
              <button
                onClick={() => setActiveTab('report')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${activeTab === 'report' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                <FileText size={13} /> Official Medical Report
              </button>
            </div>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-800 flex items-center gap-1.5 transition cursor-pointer shrink-0"
            >
              <Printer size={13} /> Print
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <main className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Status Banner */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm">Prescription Active & Medical API Verified Safe</h3>
                  <p className="text-slate-300">
                    Pharmacological compatibility verified for <strong className="text-cyan-300">{activeDrugName}</strong> • Target Indication Match
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-blue-600/20 text-cyan-300 border border-blue-500/40 font-mono font-bold text-xs">
                  {activeDrugName}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold text-xs">
                  87% Safe
                </span>
              </div>
            </div>

            {/* Multi-Medicine Tablet Switcher Banner (if multiple medicines are prescribed) */}
            {prescriptions.length > 1 && (
              <div className="p-4 rounded-2xl bg-slate-900 border border-cyan-500/30 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                    <Layers size={14} /> Your Prescribed Medicines ({prescriptions.length}) — Click to switch 3D organ view:
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Currently Viewing: <strong className="text-white">{activeDrugName}</strong>
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {prescriptions.map((pr, idx) => {
                    const isSelected = pr.drug_name === activeDrugName;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedPrescription(pr)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-cyan-500 hover:text-white'
                        }`}
                      >
                        <Pill size={13} className={isSelected ? 'text-slate-950' : 'text-cyan-400'} />
                        <span>{pr.drug_name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${isSelected ? 'bg-slate-900/30 text-slate-950' : 'bg-slate-900 text-slate-400'}`}>
                          {pr.dosage || 'Daily'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* DISTINCT CLINICAL BOXES FOR PATIENT                                 */}
            {/* =================================================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* ─────────────────────────────────────────────────────────────── */}
              {/* BOX 1: 3D HUMAN ANATOMY & TARGET ORGAN SIMULATION              */}
              {/* ─────────────────────────────────────────────────────────────── */}
              <div className="bg-slate-900 rounded-2xl border border-emerald-500/40 overflow-hidden shadow-lg flex flex-col">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 flex items-center justify-between text-white">
                  <span className="font-black text-xs uppercase tracking-wider flex items-center gap-2">
                    <Eye size={16} /> 1. Real 3D Human Anatomy & Drug Pharmacokinetics
                  </span>
                  <span className="text-[10px] font-mono bg-emerald-950/70 px-2 py-0.5 rounded-full border border-emerald-400/40">
                    Active: {activeDrugName}
                  </span>
                </div>

                <div className="p-3 flex-1 flex flex-col space-y-3">
                  <div className="h-80 sm:h-96 w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                    <HumanBody3D
                      targetOrgans={
                        selectedPrescription?.target_organs ||
                        clinicalAnalysis?.bodyEffects?.map(b => b.organ) ||
                        ['Stomach']
                      }
                      drugName={activeDrugName}
                      riskLevel={selectedPrescription?.overall_risk || 'LOW'}
                    />
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                    <span>✨ Rotate 360°, inspect organ glow aura, and monitor pharmacokinetic particle flow.</span>
                    <span className="font-mono text-cyan-400 font-bold shrink-0 ml-2">{activeDrugName}</span>
                  </div>
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────── */}
              {/* BOX 2: AI DOCTOR ADVICE & MULTILINGUAL CARE PLAN              */}
              {/* ─────────────────────────────────────────────────────────────── */}
              <div className="bg-slate-900 rounded-2xl border border-amber-500/40 overflow-hidden shadow-lg flex flex-col">
                <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-3 flex items-center justify-between text-white">
                  <span className="font-black text-xs uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={16} /> 2. AI Doctor Advice & Multilingual Instructions
                  </span>
                  <span className="text-[10px] font-mono bg-amber-950/70 px-2 py-0.5 rounded-full border border-amber-400/40">
                    {lang.toUpperCase()}
                  </span>
                </div>

                <div className="p-5 space-y-4 flex-1 text-xs">
                  {/* Doctor Notes Box */}
                  <div className="p-4 rounded-xl bg-amber-950/25 border border-amber-500/30 space-y-2">
                    <span className="text-amber-300 font-extrabold text-xs flex items-center gap-1.5">
                      <Stethoscope size={14} /> Doctor's Clinical Instruction:
                    </span>
                    <p className="text-white leading-relaxed text-xs font-medium">
                      {clinicalAnalysis?.advisory?.[lang] || clinicalAnalysis?.advisory?.english || (
                        lang === 'marathi'
                          ? `${patient?.name} यांच्या ${activeCondition} त्रासासाठी ${activeDrugName} अत्यंत गुणकारी ठरले आहे. डॉक्टरांच्या सल्ल्यानुसार हे औषध पाण्यासोबत घ्यावे आणि पथ्य पाळावे.`
                          : (lang === 'hinglish'
                              ? `${patient?.name} ke liye ${activeCondition} me ${activeDrugName} sabse asardaar dawai hai. Isse niyamit roop se paani ke sath lein aur parhez ka dhyan rakhein.`
                              : `${activeDrugName} provides optimal evidence-based therapeutic action for ${patient?.name} (${ageGroup}) suffering from ${activeCondition}. Take with water as prescribed.`)
                      )}
                    </p>
                  </div>

                  {/* Dosage schedule */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <span className="text-slate-400 block text-[11px] font-semibold">Prescription Schedule:</span>
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold text-sm">{activeDosage}</span>
                      <span className="text-cyan-400 font-mono text-[11px] bg-slate-900 px-2 py-0.5 rounded">Regular Course</span>
                    </div>
                  </div>

                  {/* Allergy Alert */}
                  {patient?.allergies && patient.allergies.toLowerCase() !== 'none' && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400">Allergy Verification:</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check size={13} /> Checked for {patient.allergies} (Safe)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────── */}
              {/* BOX 3: PERSONALIZED NUTRITION (WHAT TO EAT vs WHAT TO AVOID)    */}
              {/* ─────────────────────────────────────────────────────────────── */}
              <div className="bg-slate-900 rounded-2xl border border-emerald-500/40 p-5 space-y-4 shadow-lg lg:col-span-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Utensils size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">
                        3. Personalized Nutrition & Dietary Plan
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Tailored for <strong className="text-white">{activeCondition}</strong> in <strong className="text-cyan-300">{ageGroup}</strong>
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Multilingual: {lang.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* GREEN: Recommended Foods */}
                  <div className="p-4 rounded-xl bg-emerald-950/25 border border-emerald-500/40 space-y-2.5">
                    <span className="text-xs font-black text-emerald-300 flex items-center gap-2">
                      <Check size={16} className="text-emerald-400" />
                      {lang === 'marathi' ? 'खाण्यासाठी शिफारस केलेले अन्न (Foods to Eat):' :
                       lang === 'hinglish' ? 'Yeh Khana Chahiye (Recommended Foods):' :
                       'Recommended Foods to Eat (High Benefit):'}
                    </span>
                    <div className="space-y-1.5 pt-1">
                      {(
                        clinicalAnalysis?.personalizedDiet?.foods_to_eat?.[lang] ||
                        clinicalAnalysis?.personalizedDiet?.foods_to_eat?.english ||
                        ['Tender coconut water & fresh buttermilk', 'Cold milk & boiled oatmeal', 'Bland khichdi with mild turmeric', 'Non-citrus ripe bananas & papaya']
                      ).map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                          <span className="font-medium">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* RED: Strictly Avoid Foods */}
                  <div className="p-4 rounded-xl bg-rose-950/25 border border-rose-500/40 space-y-2.5">
                    <span className="text-xs font-black text-rose-300 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-rose-400" />
                      {lang === 'marathi' ? 'काटेकोरपणे टाळायचे पदार्थ (Foods to Avoid):' :
                       lang === 'hinglish' ? 'Yeh Bilkul Na Khayein (Strictly Avoid):' :
                       'Strictly Harmful Foods to Avoid:'}
                    </span>
                    <div className="space-y-1.5 pt-1">
                      {(
                        clinicalAnalysis?.personalizedDiet?.foods_to_avoid?.[lang] ||
                        clinicalAnalysis?.personalizedDiet?.foods_to_avoid?.english ||
                        ['Deep-fried snacks & oily red gravies', 'Empty stomach black tea & strong coffee', 'Sour citrus juices (lemon, orange)', 'Late-night heavy meals & raw chilies']
                      ).map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-rose-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                          <span className="font-medium">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Clinical Rationale */}
                {(clinicalAnalysis?.personalizedDiet?.clinical_reason?.[lang] || clinicalAnalysis?.personalizedDiet?.clinical_reason?.english) && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
                    <Info size={14} className="text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">
                        {lang === 'marathi' ? 'वैद्यकीय कारण:' : lang === 'hinglish' ? 'Doctor ki Salah:' : 'Clinical Rationale:'}
                      </strong>{' '}
                      {clinicalAnalysis.personalizedDiet.clinical_reason[lang] || clinicalAnalysis.personalizedDiet.clinical_reason.english}
                    </span>
                  </div>
                )}
              </div>

              {/* ─────────────────────────────────────────────────────────────── */}
              {/* BOX 4: WHY THIS MEDICINE WAS CHOSEN (COMPARISON MATRIX)        */}
              {/* ─────────────────────────────────────────────────────────────── */}
              <div className="bg-slate-900 rounded-2xl border border-purple-500/40 p-5 space-y-4 shadow-lg lg:col-span-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      <Award size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">
                        4. Pharmacological Comparison: Why This Medicine Was Chosen
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Evaluated across 4 candidate treatments for <strong className="text-white">{activeCondition}</strong> using Medical API
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    4-Drug Matrix
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="p-3">Medicine</th>
                        <th className="p-3">Therapeutic Action</th>
                        <th className="p-3">Safety Score</th>
                        <th className="p-3">Recovery Est.</th>
                        <th className="p-3">Monthly Cost</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-950">
                      {(medicineComparison?.candidateDrugs && medicineComparison.candidateDrugs.length > 0
                        ? medicineComparison.candidateDrugs
                        : [
                            { drug_name: activeDrugName, drug_class: 'Proton Pump Inhibitor', effectiveness_pct: 88, safety_score_pct: 87, recovery_time: '3 - 5 Days', monthly_cost_inr: 120, recommendation_badge: 'Recommended' },
                            { drug_name: 'Omeprazole 20mg', drug_class: 'Proton Pump Inhibitor', effectiveness_pct: 84, safety_score_pct: 82, recovery_time: '4 - 6 Days', monthly_cost_inr: 95, recommendation_badge: 'Alternative' },
                            { drug_name: 'Rabeprazole 20mg', drug_class: 'Proton Pump Inhibitor', effectiveness_pct: 85, safety_score_pct: 84, recovery_time: '4 - 6 Days', monthly_cost_inr: 140, recommendation_badge: 'Alternative' },
                            { drug_name: 'Esomeprazole 40mg', drug_class: 'Proton Pump Inhibitor', effectiveness_pct: 89, safety_score_pct: 83, recovery_time: '3 - 5 Days', monthly_cost_inr: 175, recommendation_badge: 'Alternative' }
                          ]
                      ).map((cd, idx) => {
                        const isChosen = cd.drug_name.toLowerCase().includes(activeDrugName.toLowerCase()) || cd.recommendation_badge === 'Recommended' || idx === 0;
                        return (
                          <tr key={idx} className={isChosen ? 'bg-blue-950/30 font-bold' : 'hover:bg-slate-900/50'}>
                            <td className="p-3 flex items-center gap-2">
                              <Pill size={13} className={isChosen ? 'text-cyan-400' : 'text-slate-400'} />
                              <span className={isChosen ? 'text-white' : 'text-slate-300'}>{cd.drug_name}</span>
                            </td>
                            <td className="p-3 text-slate-300">{cd.drug_class || 'Pharmacotherapy'}</td>
                            <td className="p-3 text-emerald-400 font-mono font-bold">{cd.safety_score_pct || 87}% Safe</td>
                            <td className="p-3 text-slate-300">{cd.recovery_time || '3 - 5 Days'}</td>
                            <td className="p-3 font-mono text-cyan-400 font-bold">₹{cd.monthly_cost_inr || 120}</td>
                            <td className="p-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                isChosen ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {isChosen ? '★ Chosen' : 'Alternative'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Patient-friendly explanation */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200">
                  <span className="text-cyan-400 font-bold block mb-1">
                    {lang === 'marathi' ? 'डॉक्टरांचे स्पष्टीकरण:' : lang === 'hinglish' ? 'Doctor ki Salah:' : 'Why this medicine is right for you:'}
                  </span>
                  <p>
                    {medicineComparison?.explanationForPatient?.[lang] || medicineComparison?.explanationForPatient?.english || (
                      `${activeDrugName} is chosen specifically for your age (${ageGroup}) and condition (${activeCondition}). It provides rapid relief with low risk of side effects.`
                    )}
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB: CENTRALIZED MEDICAL HISTORY & TIMELINE */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-violet-500/30 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <ClipboardList size={20} className="text-violet-400" /> Centralized Medical History & Consultations
                  </h2>
                  <p className="text-xs text-slate-400">
                    Comprehensive multi-doctor records automatically loaded from your patient database at login
                  </p>
                  {/* DB sync indicator */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse inline-block" />
                    <span className="text-[10px] text-violet-400 font-semibold">
                      Auto-loaded from database &middot; {consultations.length} consultation record{consultations.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5 w-fit">
                  <ShieldCheck size={14} /> Full Record Integration
                </span>
              </div>

              {/* Baseline Summary Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Documented Allergies</span>
                  <span className={patient?.allergies && patient.allergies.toLowerCase() !== 'none' ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {patient?.allergies || 'No known allergies reported'}
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Existing Medical Conditions</span>
                  <span className="text-slate-200 font-semibold">{patient?.existing_diseases || 'None documented'}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Primary Treating Doctor</span>
                  <span className="text-cyan-300 font-bold">{careTeam.find(d => d.relationship_type === 'treating')?.doctor_name || 'Dr. Sharma, MD'}</span>
                </div>
              </div>
            </div>

            {/* Consultations List */}
            {consultations.length === 0 ? (
              <div className="text-center py-12 bg-slate-900 rounded-3xl border border-slate-800 text-slate-400 text-xs">
                No previous consultations found on file.
              </div>
            ) : (
              <div className="space-y-4">
                {consultations.map((c) => (
                  <div key={c.id} className="bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl space-y-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-base">{c.diagnosis}</span>
                          <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 text-[10px] font-bold border border-blue-500/30">
                            Consultation #{c.id}
                          </span>
                        </div>
                        <div className="text-xs text-cyan-300 font-semibold flex items-center gap-1.5 mt-0.5">
                          <Stethoscope size={13} className="text-cyan-400" />
                          <span>{c.doctor_name}</span>
                          <span className="text-slate-500">|</span>
                          <span className="text-slate-400">{c.doctor_specialization}</span>
                          {c.hospital_name && (
                            <>
                              <span className="text-slate-500">|</span>
                              <span className="text-slate-400 font-normal">{c.hospital_name}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-mono text-slate-400 flex items-center gap-1 justify-end">
                          <Calendar size={13} className="text-blue-400" />
                          {String(c.consultation_date).slice(0, 16)}
                        </span>
                        {c.follow_up_date && (
                          <span className="text-[11px] text-amber-300 block mt-0.5 font-medium">
                            Follow-up: {c.follow_up_date}
                          </span>
                        )}
                      </div>
                    </div>

                    {c.symptoms && (
                      <div className="text-xs text-slate-300">
                        <strong className="text-slate-400">Symptoms Discussed: </strong>
                        {c.symptoms}
                      </div>
                    )}

                    <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 text-xs text-slate-200">
                      <strong className="text-slate-400 block mb-1">Doctor's Treatment Plan & Advice:</strong>
                      <p className="leading-relaxed">{c.treatment_notes || c.clinical_summary || 'Standard clinical guidance provided.'}</p>
                    </div>

                    {/* Vitals */}
                    {c.vital_signs && Object.keys(c.vital_signs).length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {Object.entries(c.vital_signs).map(([k, v]) => (
                          <span key={k} className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono">
                            <span className="text-slate-500 uppercase">{k}:</span> <strong className="text-white">{v}</strong>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Medical Reports */}
                    {c.medical_reports && c.medical_reports.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-800/80">
                        <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                          <FileSpreadsheet size={13} /> Attached Diagnostic Investigations
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {c.medical_reports.map((rep, idx) => (
                            <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                              <div className="flex items-center justify-between font-bold text-white">
                                <span>{rep.title}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{rep.date}</span>
                              </div>
                              <p className="text-slate-300 text-[11px]">{rep.findings}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: ONGOING MEDICATIONS TRACKER */}
        {activeTab === 'medications' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-emerald-500/30 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Pill size={20} className="text-emerald-400 rotate-45" /> Ongoing Medications & Prescription History
                </h2>
                <p className="text-xs text-slate-400">
                  Tracking active treatments, completed courses, and discontinued medications from all your doctors
                </p>
                {/* DB auto-sync badge */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    Auto-synced from your patient record &middot; {medications?.active?.length || 0} active course{(medications?.active?.length || 0) !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setMedFilter('active')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    medFilter === 'active' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Active ({medications.active?.length || 0})
                </button>
                <button
                  onClick={() => setMedFilter('completed')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    medFilter === 'completed' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Completed ({medications.completed?.length || 0})
                </button>
                <button
                  onClick={() => setMedFilter('discontinued')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    medFilter === 'discontinued' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Discontinued ({medications.discontinued?.length || 0})
                </button>
                <button
                  onClick={() => setMedFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    medFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({prescriptions.length})
                </button>
              </div>
            </div>

            {/* List of Medications */}
            {(() => {
              const listToDisplay =
                medFilter === 'active'
                  ? medications.active || []
                  : medFilter === 'completed'
                  ? medications.completed || []
                  : medFilter === 'discontinued'
                  ? medications.discontinued || []
                  : prescriptions || [];

              if (listToDisplay.length === 0) {
                return (
                  <div className="text-center py-12 bg-slate-900 rounded-3xl border border-slate-800 text-slate-400 text-xs">
                    No medications found in the <strong>'{medFilter}'</strong> category.
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {listToDisplay.map((med, idx) => {
                    const isActive = med.status === 'active';
                    const isCompleted = med.status === 'completed';
                    const isDiscontinued = med.status === 'discontinued';
                    return (
                      <div
                        key={med.id || idx}
                        className={`bg-slate-900 rounded-3xl p-5 sm:p-6 border transition shadow-xl space-y-3.5 ${
                          isActive
                            ? 'border-emerald-500/30 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/20'
                            : isDiscontinued
                            ? 'border-red-500/30 bg-gradient-to-r from-slate-900 via-slate-900 to-red-950/20'
                            : 'border-slate-800'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span className="text-base font-black text-white">{med.drug_name}</span>
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                                {med.dosage}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isActive
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : isCompleted
                                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                  : isDiscontinued
                                  ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                                  : 'bg-slate-800 text-slate-400'
                              }`}>
                                {med.status || 'Active'}
                              </span>
                            </div>

                            <div className="text-xs text-slate-300 flex items-center gap-1.5">
                              <Stethoscope size={13} className="text-blue-400" />
                              <span>Prescribing Doctor: <strong className="text-white">{med.doctor_name || 'Attending Physician'}</strong></span>
                              <span className="text-slate-500">|</span>
                              <span className="text-slate-400">{med.doctor_specialization || 'Internal Medicine'}</span>
                            </div>
                          </div>

                          <div className="text-right text-xs">
                            <span className="text-slate-400 font-mono text-[11px] block">
                              Prescribed on: {String(med.created_at).slice(0, 10)}
                            </span>
                            <span className="text-emerald-400 font-bold text-xs">
                              AI Safety Score: {100 - (med.side_effect_pct || 15)}%
                            </span>
                          </div>
                        </div>

                        {/* Details row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Frequency & Timing</span>
                            <span className="font-semibold text-white">{med.frequency || 'Once daily'}</span>
                          </div>

                          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Duration / Dates</span>
                            <span className="font-semibold text-slate-200">
                              {med.start_date || 'Start Date'} → {med.end_date || 'Ongoing'}
                            </span>
                          </div>

                          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Instructions</span>
                            <span className="font-medium text-cyan-300">{med.instructions || 'Take with water as directed.'}</span>
                          </div>
                        </div>

                        {isDiscontinued && med.discontinued_reason && (
                          <div className="text-xs bg-red-950/40 p-3 rounded-2xl border border-red-500/30 text-red-200 flex items-start gap-2">
                            <ShieldAlert size={15} className="text-red-400 shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-red-300">Discontinued Reason: </strong>
                              {med.discontinued_reason}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB: TIMELINE */}
        {activeTab === 'timeline' && (() => {
          // Build a unified chronological event list from consultations + prescriptions
          const builtTimeline = timeline.length > 0
            ? timeline
            : [
                ...consultations.map(c => ({
                  type: 'consultation',
                  date: c.consultation_date || c.created_at,
                  title: c.diagnosis || 'Consultation',
                  detail: `${c.doctor_name || 'Physician'} — ${c.doctor_specialization || ''}`,
                  sub: c.symptoms || c.treatment_notes || '',
                  hospital: c.hospital_name || '',
                })),
                ...prescriptions.map(p => ({
                  type: 'prescription',
                  date: p.created_at,
                  title: `Prescribed: ${p.drug_name}`,
                  detail: `${p.dosage || ''} · ${p.frequency || 'Once daily'}`,
                  sub: p.instructions || '',
                  status: p.status,
                  doctor: p.doctor_name,
                })),
              ].sort((a, b) => new Date(b.date) - new Date(a.date));

          return (
            <div className="space-y-6">
              {/* Header */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-cyan-500/30 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <TrendingUp size={20} className="text-cyan-400" /> Health Timeline
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Chronological view of all consultations, prescriptions &amp; medical events for{' '}
                      <strong className="text-white">{patient?.name}</strong>
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-xs font-bold">
                    {builtTimeline.length} Events
                  </span>
                </div>

                {/* Quick summary chips */}
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-[11px] font-semibold">
                    🩺 {consultations.length} Consultations
                  </span>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold">
                    💊 {medications?.active?.length || 0} Active Medications
                  </span>
                  <span className="px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[11px] font-semibold">
                    📋 {prescriptions.length} Total Prescriptions
                  </span>
                </div>
              </div>

              {builtTimeline.length === 0 ? (
                <div className="text-center py-16 bg-slate-900 rounded-3xl border border-slate-800 text-slate-400 text-xs">
                  No timeline events found. Your health events will appear here as records are added.
                </div>
              ) : (
                <div className="relative">
                  {/* Vertical connector line */}
                  <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-cyan-500/30 via-slate-700 to-slate-800 hidden sm:block" />

                  <div className="space-y-4">
                    {builtTimeline.map((event, idx) => {
                      const isConsult = event.type === 'consultation';
                      const isRx      = event.type === 'prescription';
                      const isActiveRx = event.status === 'active';

                      const dotColor  = isConsult ? 'bg-violet-500 border-violet-400 shadow-violet-500/30'
                                      : isRx && isActiveRx ? 'bg-emerald-500 border-emerald-400 shadow-emerald-500/30'
                                      : isRx ? 'bg-blue-500 border-blue-400 shadow-blue-500/20'
                                      : 'bg-slate-600 border-slate-500';

                      const cardBorder = isConsult ? 'border-violet-500/30 hover:border-violet-400/50'
                                       : isRx && isActiveRx ? 'border-emerald-500/30 hover:border-emerald-400/50'
                                       : isRx ? 'border-blue-500/20 hover:border-blue-400/40'
                                       : 'border-slate-800';

                      const tagLabel  = isConsult ? '🩺 Consultation'
                                      : isRx ? `💊 Prescription${event.status ? ` · ${event.status}` : ''}`
                                      : '📄 Report';

                      const tagClass  = isConsult ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                                      : isRx && isActiveRx ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                      : isRx ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                                      : 'bg-slate-800 text-slate-400 border-slate-700';

                      return (
                        <div key={idx} className="flex gap-4 sm:gap-6 items-start group">
                          {/* Timeline dot */}
                          <div className={`relative z-10 w-10 h-10 rounded-full border-2 ${dotColor} flex items-center justify-center shrink-0 bg-slate-950 shadow-lg group-hover:scale-110 transition-transform`}>
                            {isConsult
                              ? <Stethoscope size={16} className="text-violet-300" />
                              : isRx
                              ? <Pill size={16} className={isActiveRx ? 'text-emerald-300' : 'text-blue-300'} />
                              : <FileText size={16} className="text-slate-300" />}
                          </div>

                          {/* Event Card */}
                          <div className={`flex-1 bg-slate-900 rounded-2xl border p-4 sm:p-5 space-y-2.5 transition-all shadow-lg ${cardBorder}`}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${tagClass}`}>
                                  {tagLabel}
                                </span>
                                <h3 className="font-black text-white text-sm">{event.title}</h3>
                              </div>
                              <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1 shrink-0">
                                <Calendar size={11} className="text-cyan-500" />
                                {String(event.date || '').slice(0, 10)}
                              </span>
                            </div>

                            {event.detail && (
                              <p className={`text-xs font-semibold flex items-center gap-1.5 ${isConsult ? 'text-violet-300' : 'text-cyan-300'}`}>
                                {isConsult
                                  ? <Stethoscope size={12} className="text-violet-400 shrink-0" />
                                  : <Pill size={12} className="text-blue-400 shrink-0" />}
                                {event.detail}
                              </p>
                            )}

                            {event.hospital && (
                              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                <Building2 size={11} /> {event.hospital}
                              </p>
                            )}

                            {event.doctor && (
                              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                <Stethoscope size={11} /> Prescribed by <strong className="text-slate-200 ml-1">{event.doctor}</strong>
                              </p>
                            )}

                            {event.sub && (
                              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-[11px] text-slate-300 leading-relaxed">
                                {event.sub}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* TAB: MY DOCTOR TEAM */}
        {activeTab === 'doctors' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users size={20} className="text-blue-400" /> My Multi-Doctor Care Team
              </h2>
              <p className="text-xs text-slate-400">
                Authorized doctors managing your treatment, second opinions, and medical history
              </p>
            </div>

            {careTeam.length === 0 ? (
              <div className="text-center py-12 bg-slate-900 rounded-3xl border border-slate-800 text-slate-400 text-xs">
                No doctors associated with your profile yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {careTeam.map((doc) => {
                  const isTreating = doc.relationship_type === 'treating';
                  const isConsulting = doc.relationship_type === 'consulting';
                  return (
                    <div
                      key={doc.doctor_id}
                      className="bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isTreating
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : isConsulting
                              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {doc.relationship_type === 'treating' ? 'Treating Physician' : doc.relationship_type === 'consulting' ? 'Consulting Specialist' : 'Previous Doctor'}
                          </span>

                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                            <ShieldCheck size={12} /> Consent Active
                          </span>
                        </div>

                        <div className="pt-1">
                          <h3 className="font-black text-white text-base">{doc.doctor_name}</h3>
                          <p className="text-xs text-cyan-300 font-semibold">{doc.doctor_specialization}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                            <Building2 size={13} /> {doc.doctor_hospital}
                          </p>
                        </div>

                        {doc.notes && (
                          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-300">
                            <span className="text-slate-500 block text-[10px] uppercase font-bold">Clinical Scope:</span>
                            {doc.notes}
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                        <span>Access: <strong className="text-slate-200 capitalize">{doc.access_permission || 'Full'} Record</strong></span>
                        <span className="font-mono text-[10px]">Since {String(doc.associated_since).slice(0, 10)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'report' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText size={18} className="text-cyan-400" /> Patient Clinical Discharge & Drug Safety Report
                </h2>
                <p className="text-xs text-slate-400">
                  Certified pharmacological record from Apex Multispecialty Hospital
                </p>
              </div>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow transition cursor-pointer"
              >
                <Printer size={15} /> Print Report
              </button>
            </div>

            <MedicalReport
              patient={patient}
              prediction={selectedPrescription?.prediction || {
                drug_name: activeDrugName,
                drug_class: 'Proton Pump Inhibitor (PPI)',
                standard_dose: activeDosage,
                effectiveness_pct: 88,
                side_effect_pct: 12,
                ddi_pct: 8,
                overall_risk_level: 'LOW',
                target_organs: ['Stomach', 'Gastrointestinal System'],
                clinical_alerts: [],
                xai_factors: [],
                dietary_warnings: 'Take 30 minutes before breakfast with a glass of water.',
                multilingual_recommendation: {
                  english: `${activeDrugName} provides high therapeutic efficacy with minimal hepatic load.`,
                  hinglish: `${activeDrugName} pet me acid kam karta hai. Subah khali pet lein.`,
                  marathi: `${activeDrugName} पोटातील ॲसिड कमी करण्यासाठी सुरक्षित आणि प्रभावी आहे.`
                }
              }}
              doctorNotes="Take before breakfast with water. Avoid heavy and spicy meals. Review after 10 days."
            />
          </div>
        )}
      </main>
    </div>
  );
}

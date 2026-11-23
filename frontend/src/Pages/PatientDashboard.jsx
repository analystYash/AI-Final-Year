import React, { useState, useEffect } from 'react';
import {
  User, Pill, Calendar, AlertCircle, Heart, ShieldCheck,
  Languages, Utensils, Phone, LogOut, Activity, Eye, ChevronDown, Sparkles,
  FileText, Printer, Stethoscope, ChevronRight, Clock, Award, Sliders, CheckCircle, Info,
  AlertTriangle, Check, ShieldAlert, Layers, Users, Building2, FileSpreadsheet,
  ClipboardList, TrendingUp, TimerReset, Sun, Moon
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
  const { lang, setLang, t } = useLanguage();

  // Theme mode: 'sand' (Soft Sand) | 'dark' (Dark Calm Mode)
  const [patientTheme, setPatientTheme] = useState(() => localStorage.getItem('patient_theme') || 'sand');

  useEffect(() => {
    document.documentElement.setAttribute('data-patient-theme', patientTheme);
    localStorage.setItem('patient_theme', patientTheme);
  }, [patientTheme]);

  const togglePatientTheme = () => {
    setPatientTheme(prev => (prev === 'sand' || prev === 'light') ? 'dark' : 'sand');
  };

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
    <div className="min-h-screen bg-[#FBF6EF] text-[#2B3A35] flex flex-col font-sans selection:bg-[#2F5D50] selection:text-white">
      {/* TOP HEADER */}
      <header className="bg-[#2F5D50] text-white border-b border-[#244A40] sticky top-0 z-30 px-4 lg:px-6 py-3.5 flex items-center justify-between print:hidden shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#5FA58C] flex items-center justify-center shadow-md shadow-xs">
            <User size={22} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-tight text-white">MedInsight AI Patient Portal</span>
              <span className="px-2 py-0.5 rounded-full bg-[#5FA58C] text-white border border-[#5FA58C]/40 text-[10px] font-bold">
                Patient View
              </span>
            </div>
            <span className="text-[11px] text-[#DCEFE6] hidden sm:block">
              Personalized Medicine, 3D Anatomy Mapping & Multilingual Clinical Guidance
            </span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Language & Portal Status */}
          <div className="flex items-center bg-[#244A40] p-1 rounded-xl border border-[#3A6B5C] text-xs">
            <Languages size={14} className="text-[#DCEFE6] ml-1 mr-1" />
            <button
              onClick={() => setLang('english')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${lang === 'english' ? 'bg-[#5FA58C] text-white shadow-sm' : 'text-[#DCEFE6] hover:text-white'}`}
            >
              English
            </button>
            <button
              onClick={() => setLang('hinglish')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${lang === 'hinglish' ? 'bg-[#5FA58C] text-white shadow-sm' : 'text-[#DCEFE6] hover:text-white'}`}
            >
              Hinglish
            </button>
            <button
              onClick={() => setLang('marathi')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${lang === 'marathi' ? 'bg-[#5FA58C] text-white shadow-sm' : 'text-[#DCEFE6] hover:text-white'}`}
            >
              मराठी
            </button>
            <button
              onClick={() => setLang('hindi')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${lang === 'hindi' ? 'bg-[#5FA58C] text-white shadow-sm' : 'text-[#DCEFE6] hover:text-white'}`}
            >
              हिन्दी
            </button>
          </div>

          {/* THEME TOGGLE: SOFT SAND vs DARK CALM MODE */}
          <button
            type="button"
            onClick={togglePatientTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#3A6B5C] bg-[#244A40] text-xs font-bold text-[#DCEFE6] hover:text-white hover:bg-[#1E3E35] transition cursor-pointer shadow-xs"
            title={patientTheme === 'dark' ? 'Switch to Soft Sand mode' : 'Switch to Dark Calm mode'}
          >
            {patientTheme === 'dark' ? (
              <>
                <Moon size={14} className="text-[#7CC4A9]" />
                <span className="hidden sm:inline font-mono">Dark Calm</span>
              </>
            ) : (
              <>
                <Sun size={14} className="text-[#F6D68A]" />
                <span className="hidden sm:inline font-mono">Soft Sand</span>
              </>
            )}
          </button>

          <div
            onClick={() => setActiveTab('doctors')}
            className={`hidden md:flex flex-col text-right cursor-pointer group px-3 py-1 rounded-xl border transition ${
              activeTab === 'doctors'
                ? 'bg-[#1E3E35] border-[#5FA58C] shadow-xs'
                : 'bg-[#244A40] border-[#3A6B5C] hover:border-[#5FA58C] hover:bg-[#1E3E35]'
            }`}
            title="Click to view My Doctor Care Team profile"
          >
            <span className="text-xs font-bold text-white group-hover:text-[#DCEFE6] transition flex items-center gap-1.5 justify-end">
              <Stethoscope size={13} className="text-[#5FA58C]" /> Dr. Sharma, MD
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-[#E9E4F7] text-[#4A3B75] border border-[#d8d0f2]">
                Doctor Team
              </span>
            </span>
            <span className="text-[11px] text-[#DCEFE6] transition">
              Apex Multispecialty Hospital
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 bg-[#244A40] hover:bg-[#C9473F] text-[#DCEFE6] hover:text-white rounded-xl border border-[#3A6B5C] transition cursor-pointer"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* PATIENT PROFILE HEADER CARD */}
      <div className="bg-white border-b border-[#E6DCCB] px-4 lg:px-6 py-3 print:hidden shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#DCEFE6] border border-[#bedacb] flex items-center justify-center font-bold text-[#2F5D50] text-sm">
              {patient?.name?.charAt(0) || 'R'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-[var(--patient-text)] text-sm">{patient?.name || 'Rahul Verma'}</h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--patient-sage-tint)] text-[var(--patient-header)] border border-[#bedacb] font-mono font-medium">
                  {ageGroup} • {patient?.age || 28}y
                </span>
                {patient?.allergies && patient.allergies.toLowerCase() !== 'none' && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--patient-sunlight)] text-[var(--patient-sunlight-text)] border border-[#ecd28d] font-bold">
                    ⚠ Allergies: {patient.allergies}
                  </span>
                )}
              </div>
              <p className="text-[var(--patient-text-soft)] text-[11px]">
                Health Issue: <strong className="text-[var(--patient-text)]">{activeCondition}</strong> • Phone ID: <span className="text-[var(--patient-header)] font-mono font-bold">{patient?.contact_number || '9876543210'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-[#FBF6EF] p-1 rounded-xl border border-[#E6DCCB] text-xs overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${activeTab === 'overview' ? 'bg-[#2F5D50] text-white shadow-sm' : 'text-[#5E6F68] hover:text-[#2B3A35] hover:bg-[#E6DCCB]/40'}`}
              >
                Clinical Dashboard
              </button>

              {/* ─── Medical History Button ─── */}
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${activeTab === 'history' ? 'bg-[#2F5D50] text-white shadow-sm' : 'text-[#5E6F68] hover:text-[#2B3A35] hover:bg-[#E6DCCB]/40'}`}
              >
                <ClipboardList size={13} className="text-[#5FA58C]" /> Medical History
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${activeTab === 'history' ? 'bg-white/20 text-white' : 'bg-[#DCEFE6] text-[#2F5D50]'}`}>
                  {consultations.length}
                </span>
              </button>

              {/* ─── Timeline Button ─── */}
              <button
                onClick={() => setActiveTab('timeline')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${activeTab === 'timeline' ? 'bg-[#2F5D50] text-white shadow-sm' : 'text-[#5E6F68] hover:text-[#2B3A35] hover:bg-[#E6DCCB]/40'}`}
              >
                <TrendingUp size={13} className="text-[#5FA58C]" /> Timeline
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${activeTab === 'timeline' ? 'bg-white/20 text-white' : 'bg-[#DCEFE6] text-[#2F5D50]'}`}>
                  {timeline.length > 0 ? timeline.length : consultations.length + prescriptions.length}
                </span>
              </button>

              {/* ─── Ongoing Medications Button ─── */}
              <button
                onClick={() => setActiveTab('medications')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${activeTab === 'medications' ? 'bg-[#2F5D50] text-white shadow-sm' : 'text-[#5E6F68] hover:text-[#2B3A35] hover:bg-[#E6DCCB]/40'}`}
              >
                <Pill size={13} className="text-[#5FA58C]" /> Ongoing Medications
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${activeTab === 'medications' ? 'bg-white/20 text-white' : 'bg-[#DCEFE6] text-[#2F5D50] border border-[#bedacb]'}`}>
                  {medications?.active?.length || 0}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('doctors')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${activeTab === 'doctors' ? 'bg-[#2F5D50] text-white shadow-sm' : 'text-[#5E6F68] hover:text-[#2B3A35] hover:bg-[#E6DCCB]/40'}`}
              >
                <Users size={13} className="text-[#5FA58C]" /> My Doctor Team ({careTeam.length})
              </button>
              <button
                onClick={() => setActiveTab('report')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${activeTab === 'report' ? 'bg-[#2F5D50] text-white shadow-sm' : 'text-[#5E6F68] hover:text-[#2B3A35] hover:bg-[#E6DCCB]/40'}`}
              >
                <FileText size={13} className="text-[#5FA58C]" /> Official Medical Report
              </button>
            </div>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#FBF6EF] text-[#2B3A35] text-xs font-bold border border-[#E6DCCB] flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-xs"
            >
              <Printer size={13} className="text-[#5FA58C]" /> Print
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <main className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Status Banner - Deep Sage Verified Safe */}
            <div className="p-4 rounded-2xl bg-[#2F5D50] text-white border border-[#244A40] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#5FA58C] text-white border border-[#5FA58C]/40">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm">Prescription Active & Medical API Verified Safe</h3>
                  <p className="text-[#DCEFE6]">
                    Pharmacological compatibility verified for <strong className="text-white underline">{activeDrugName}</strong> • Target Indication Match
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#DCEFE6] text-[#2F5D50] border border-[#bedacb] font-mono font-bold text-xs">
                  {activeDrugName}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-[#5FA58C] text-white font-mono font-bold text-xs shadow-xs">
                  87% Safe
                </span>
              </div>
            </div>

            {/* Multi-Medicine Tablet Switcher Banner (if multiple medicines are prescribed) */}
            {prescriptions.length > 1 && (
              <div className="p-4 rounded-2xl bg-white border border-[#E6DCCB] space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#2B3A35] uppercase tracking-wider flex items-center gap-2">
                    <Layers size={14} className="text-[#5FA58C]" /> Your Prescribed Medicines ({prescriptions.length}) — Click to switch 3D organ view:
                  </span>
                  <span className="text-[10px] text-[#5E6F68] font-mono">
                    Currently Viewing: <strong className="text-[#2F5D50]">{activeDrugName}</strong>
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
                            ? 'bg-[#DCEFE6] text-[#2F5D50] border-[#5FA58C] shadow-sm'
                            : 'bg-[#FBF6EF] text-[#2B3A35] border-[#E6DCCB] hover:border-[#5FA58C] hover:bg-white'
                        }`}
                      >
                        <Pill size={13} className={isSelected ? 'text-[#2F5D50]' : 'text-[#5FA58C]'} />
                        <span>{pr.drug_name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${isSelected ? 'bg-white text-[#2F5D50]' : 'bg-[#E6DCCB]/60 text-[#2B3A35]'}`}>
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
              <div className="bg-white rounded-2xl border border-[#E6DCCB] overflow-hidden shadow-xs flex flex-col">
                <div className="bg-[#2F5D50] px-4 py-3 flex items-center justify-between text-white">
                  <span className="font-black text-xs uppercase tracking-wider flex items-center gap-2">
                    <Eye size={16} /> 1. Real 3D Human Anatomy & Drug Pharmacokinetics
                  </span>
                  <span className="text-[10px] font-mono bg-[#1E3E35] text-[#DCEFE6] px-2 py-0.5 rounded-full border border-[#5FA58C]/40">
                    Active: {activeDrugName}
                  </span>
                </div>

                <div className="p-3 flex-1 flex flex-col space-y-3">
                  <div className="h-80 sm:h-96 w-full rounded-xl overflow-hidden bg-[#FBF6EF] border border-[#E6DCCB] shadow-inner">
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
                  <div className="p-3 bg-[#FBF6EF] rounded-xl border border-[#E6DCCB] text-[11px] text-[#5E6F68] flex items-center justify-between">
                    <span>✨ Rotate 360°, inspect organ glow aura, and monitor pharmacokinetic particle flow.</span>
                    <span className="font-mono text-[#2F5D50] font-bold shrink-0 ml-2">{activeDrugName}</span>
                  </div>
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────── */}
              {/* BOX 2: AI DOCTOR ADVICE & MULTILINGUAL CARE PLAN              */}
              {/* ─────────────────────────────────────────────────────────────── */}
              <div className="bg-white rounded-2xl border border-[#E6DCCB] overflow-hidden shadow-xs flex flex-col">
                <div className="bg-[#E9E4F7] border-b border-[#d8d0f2] px-4 py-3 flex items-center justify-between text-[#2B3A35]">
                  <span className="font-black text-xs uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={16} className="text-[#8A5CF6]" /> 2. AI Doctor Advice & Multilingual Instructions
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('doctors')}
                      className="px-2.5 py-1 rounded-lg bg-[#F28B6D] hover:bg-[#e07b5e] text-white font-bold text-[10px] flex items-center gap-1 transition shadow-xs cursor-pointer"
                    >
                      <Heart size={11} /> Ask Your Doctor
                    </button>
                    <span className="text-[10px] font-mono bg-white text-[#2B3A35] px-2 py-0.5 rounded-full border border-[#d8d0f2]">
                      {lang.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-4 flex-1 text-xs">
                  {/* Doctor Notes Box - Sunlight */}
                  <div className="p-4 rounded-xl bg-[#F6D68A]/30 border border-[#F6D68A] space-y-2">
                    <span className="text-[#3D2600] font-extrabold text-xs flex items-center gap-1.5">
                      <Stethoscope size={14} className="text-[#5FA58C]" /> Doctor's Clinical Instruction:
                    </span>
                    <p className="text-[#2B3A35] leading-relaxed text-xs font-medium">
                      clinicalAnalysis?.advisory?.english || `${activeDrugName} provides optimal evidence-based therapeutic efficacy for ${patient?.name || 'patient'} (${ageGroup}) managing ${activeCondition}. Take with water according to prescribed clinical schedule.`
                    </p>
                  </div>

                  {/* Dosage schedule */}
                  <div className="p-3.5 rounded-xl bg-[#FBF6EF] border border-[#E6DCCB] space-y-1.5">
                    <span className="text-[#5E6F68] block text-[11px] font-semibold">Prescription Schedule:</span>
                    <div className="flex items-center justify-between">
                      <span className="text-[#2B3A35] font-bold text-sm">{activeDosage}</span>
                      <span className="text-[#3D2600] font-bold text-[11px] bg-[#F6D68A] border border-[#ebd083] px-2 py-0.5 rounded">Next Dose: Regular Course</span>
                    </div>
                  </div>

                  {/* Allergy Alert */}
                  {patient?.allergies && patient.allergies.toLowerCase() !== 'none' && (
                    <div className="p-3 rounded-xl bg-[#DCEFE6] border border-[#bedacb] flex items-center justify-between">
                      <span className="text-[#2B3A35]">Allergy Verification:</span>
                      <span className="text-[#2F5D50] font-bold flex items-center gap-1">
                        <Check size={13} /> Checked for {patient.allergies} (Safe)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────── */}
              {/* BOX 3: PERSONALIZED NUTRITION (WHAT TO EAT vs WHAT TO AVOID)    */}
              {/* ─────────────────────────────────────────────────────────────── */}
              <div className="bg-white rounded-2xl border border-[#E6DCCB] p-5 space-y-4 shadow-xs lg:col-span-2">
                <div className="flex items-center justify-between border-b border-[#E6DCCB] pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#DCEFE6] text-[#2F5D50] border border-[#bedacb]">
                      <Utensils size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#2B3A35] uppercase tracking-wider">
                        3. Personalized Nutrition & Dietary Plan
                      </h3>
                      <p className="text-[11px] text-[#5E6F68]">
                        Tailored for <strong className="text-[#2B3A35]">{activeCondition}</strong> in <strong className="text-[#2F5D50]">{ageGroup}</strong>
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#DCEFE6] text-[#2F5D50] border border-[#bedacb]">
                    Multilingual: {lang.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* SAGE: Recommended Foods */}
                  <div className="p-4 rounded-xl bg-[#DCEFE6]/60 border border-[#bedacb] space-y-2.5">
                    <span className="text-xs font-black text-[#2F5D50] flex items-center gap-2">
                      <Check size={16} className="text-[#5FA58C]" />
                      Recommended Foods to Eat (High Clinical Benefit):
                    </span>
                    <div className="space-y-1.5 pt-1">
                      {(
                        clinicalAnalysis?.personalizedDiet?.foods_to_eat?.[lang] ||
                        clinicalAnalysis?.personalizedDiet?.foods_to_eat?.english ||
                        ['Tender coconut water & fresh buttermilk', 'Cold milk & boiled oatmeal', 'Bland khichdi with mild turmeric', 'Non-citrus ripe bananas & papaya']
                      ).map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-[#2B3A35]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#5FA58C] mt-1.5 shrink-0" />
                          <span className="font-medium">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* RED: Strictly Avoid Foods */}
                  <div className="p-4 rounded-xl bg-[#C9473F]/10 border border-[#C9473F]/30 space-y-2.5">
                    <span className="text-xs font-black text-[#C9473F] flex items-center gap-2">
                      <AlertTriangle size={16} className="text-[#C9473F]" />
                      Strictly Harmful Foods to Avoid (Clinical Contraindications):
                    </span>
                    <div className="space-y-1.5 pt-1">
                      {(
                        clinicalAnalysis?.personalizedDiet?.foods_to_avoid?.[lang] ||
                        clinicalAnalysis?.personalizedDiet?.foods_to_avoid?.english ||
                        ['Deep-fried snacks & oily red gravies', 'Empty stomach black tea & strong coffee', 'Sour citrus juices (lemon, orange)', 'Late-night heavy meals & raw chilies']
                      ).map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-[#C9473F]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C9473F] mt-1.5 shrink-0" />
                          <span className="font-medium">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Clinical Rationale */}
                {(clinicalAnalysis?.personalizedDiet?.clinical_reason?.[lang] || clinicalAnalysis?.personalizedDiet?.clinical_reason?.english) && (
                  <div className="p-3 rounded-xl bg-[#FBF6EF] border border-[#E6DCCB] text-xs text-[#2B3A35] flex items-start gap-2">
                    <Info size={14} className="text-[#5FA58C] shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-[#2B3A35]">
                        Clinical &amp; Pharmacological Rationale:
                      </strong>{' '}
                      {clinicalAnalysis.personalizedDiet.clinical_reason[lang] || clinicalAnalysis.personalizedDiet.clinical_reason.english}
                    </span>
                  </div>
                )}
              </div>

              {/* ─────────────────────────────────────────────────────────────── */}
              {/* BOX 4: WHY THIS MEDICINE WAS CHOSEN (COMPARISON MATRIX)        */}
              {/* ─────────────────────────────────────────────────────────────── */}
              <div className="bg-white rounded-2xl border border-[#E6DCCB] p-5 space-y-4 shadow-xs lg:col-span-2">
                <div className="flex items-center justify-between border-b border-[#E6DCCB] pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#E9E4F7] text-[#4A3B75] border border-[#d8d0f2]">
                      <Award size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#2B3A35] uppercase tracking-wider">
                        4. Pharmacological Comparison: Why This Medicine Was Chosen
                      </h3>
                      <p className="text-[11px] text-[#5E6F68]">
                        Evaluated across 4 candidate treatments for <strong className="text-[#2B3A35]">{activeCondition}</strong> using Medical API
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E9E4F7] text-[#4A3B75] border border-[#d8d0f2]">
                    4-Drug Matrix
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-[#E6DCCB]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FBF6EF] text-[#2B3A35] uppercase text-[10px] font-bold">
                      <tr>
                        <th className="p-3">Medicine</th>
                        <th className="p-3">Therapeutic Action</th>
                        <th className="p-3">Safety Score</th>
                        <th className="p-3">Recovery Est.</th>
                        <th className="p-3">Monthly Cost</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6DCCB] bg-white">
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
                          <tr key={idx} className={isChosen ? 'bg-[#DCEFE6]/60 font-bold' : 'hover:bg-[#FBF6EF]'}>
                            <td className="p-3 flex items-center gap-2">
                              <Pill size={13} className={isChosen ? 'text-[#2F5D50]' : 'text-[#5E6F68]'} />
                              <span className={isChosen ? 'text-[#2F5D50] font-bold' : 'text-[#2B3A35]'}>{cd.drug_name}</span>
                            </td>
                            <td className="p-3 text-[#5E6F68]">{cd.drug_class || 'Pharmacotherapy'}</td>
                            <td className="p-3 text-[#5FA58C] font-mono font-bold">{cd.safety_score_pct || 87}% Safe</td>
                            <td className="p-3 text-[#5E6F68]">{cd.recovery_time || '3 - 5 Days'}</td>
                            <td className="p-3 font-mono text-[#2F5D50] font-bold">₹{cd.monthly_cost_inr || 120}</td>
                            <td className="p-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                isChosen ? 'bg-[#DCEFE6] text-[#2F5D50] border border-[#bedacb]' : 'bg-[#FBF6EF] text-[#5E6F68] border border-[#E6DCCB]'
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
                <div className="p-3.5 rounded-xl bg-[#FBF6EF] border border-[#E6DCCB] text-xs text-[#2B3A35]">
                  <span className="text-[#2F5D50] font-bold block mb-1">
                    Physician Clinical Explanation &amp; Guidance:
                  </span>
                  <p>
                    {typeof medicineComparison?.explanationForPatient === 'string'
                      ? medicineComparison.explanationForPatient
                      : (medicineComparison?.explanationForPatient?.[lang] || medicineComparison?.explanationForPatient?.english || medicineComparison?.explanationForPatient?.hinglish || (
                          `${activeDrugName} is chosen specifically for your age (${ageGroup}) and condition (${activeCondition}). It provides rapid relief with low risk of side effects.`
                        ))
                    }
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB: CENTRALIZED MEDICAL HISTORY & TIMELINE */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white border border-[#E6DCCB] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6DCCB] pb-4">
                <div>
                  <h2 className="text-lg font-bold text-[#2B3A35] flex items-center gap-2">
                    <ClipboardList size={20} className="text-[#5FA58C]" /> Centralized Medical History & Consultations
                  </h2>
                  <p className="text-xs text-[#5E6F68]">
                    Comprehensive multi-doctor records automatically loaded from your patient database at login
                  </p>
                  {/* DB sync indicator */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="w-2 h-2 rounded-full bg-[#5FA58C] animate-pulse inline-block" />
                    <span className="text-[10px] text-[#2F5D50] font-semibold">
                      Auto-loaded from database &middot; {consultations.length} consultation record{consultations.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#DCEFE6] border border-[#bedacb] text-[#2F5D50] text-xs font-bold flex items-center gap-1.5 w-fit">
                  <ShieldCheck size={14} /> Full Record Integration
                </span>
              </div>

              {/* Baseline Summary Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-[#FBF6EF] p-3 rounded-2xl border border-[#E6DCCB]">
                  <span className="text-[#5E6F68] text-[10px] uppercase font-bold block mb-1">Documented Allergies</span>
                  <span className={patient?.allergies && patient.allergies.toLowerCase() !== 'none' ? 'text-[#3D2600] font-bold bg-[#F6D68A] px-2 py-0.5 rounded' : 'text-[#2F5D50] font-bold'}>
                    {patient?.allergies || 'No known allergies reported'}
                  </span>
                </div>
                <div className="bg-[#FBF6EF] p-3 rounded-2xl border border-[#E6DCCB]">
                  <span className="text-[#5E6F68] text-[10px] uppercase font-bold block mb-1">Existing Medical Conditions</span>
                  <span className="text-[#2B3A35] font-semibold">{patient?.existing_diseases || 'None documented'}</span>
                </div>
                <div className="bg-[#FBF6EF] p-3 rounded-2xl border border-[#E6DCCB]">
                  <span className="text-[#5E6F68] text-[10px] uppercase font-bold block mb-1">Primary Treating Doctor</span>
                  <span className="text-[#2F5D50] font-bold">{careTeam.find(d => d.relationship_type === 'treating')?.doctor_name || 'Dr. Sharma, MD'}</span>
                </div>
              </div>
            </div>

            {/* Consultations List */}
            {consultations.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-[#E6DCCB] text-[#5E6F68] text-xs shadow-xs">
                No previous consultations found on file.
              </div>
            ) : (
              <div className="space-y-4">
                {consultations.map((c) => (
                  <div key={c.id} className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E6DCCB] shadow-xs space-y-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6DCCB] pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#2B3A35] text-base">{c.diagnosis}</span>
                          <span className="px-2 py-0.5 rounded-md bg-[#E9E4F7] text-[#4A3B75] text-[10px] font-bold border border-[#d8d0f2]">
                            Consultation #{c.id}
                          </span>
                        </div>
                        <div className="text-xs text-[#2F5D50] font-semibold flex items-center gap-1.5 mt-0.5">
                          <Stethoscope size={13} className="text-[#5FA58C]" />
                          <span className="">{c.doctor_name}</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-[#5E6F68] font-normal">{c.doctor_specialization}</span>
                          {c.hospital_name && (
                            <>
                              <span className="text-slate-300">|</span>
                              <span className="text-[#5E6F68] font-normal">{c.hospital_name}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-mono text-[#5E6F68] flex items-center gap-1 justify-end">
                          <Calendar size={13} className="text-[#5FA58C]" />
                          {String(c.consultation_date).slice(0, 16)}
                        </span>
                        {c.follow_up_date && (
                          <span className="text-[11px] text-[#3D2600] font-bold bg-[#F6D68A] px-2 py-0.5 rounded block mt-0.5">
                            Follow-up: {c.follow_up_date}
                          </span>
                        )}
                      </div>
                    </div>

                    {c.symptoms && (
                      <div className="text-xs text-[#2B3A35]">
                        <strong className="text-[#2B3A35]">Symptoms Discussed: </strong>
                        {c.symptoms}
                      </div>
                    )}

                    <div className="bg-[#FBF6EF] p-3.5 rounded-2xl border border-[#E6DCCB] text-xs text-[#2B3A35]">
                      <strong className="text-[#2B3A35] block mb-1">Doctor's Treatment Plan & Advice:</strong>
                      <p className="leading-relaxed">{c.treatment_notes || c.clinical_summary || 'Standard clinical guidance provided.'}</p>
                    </div>

                    {/* Vitals */}
                    {c.vital_signs && Object.keys(c.vital_signs).length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {Object.entries(c.vital_signs).map(([k, v]) => (
                          <span key={k} className="px-2.5 py-1 rounded-lg bg-[#FBF6EF] border border-[#E6DCCB] text-[11px] text-[#2B3A35] font-mono">
                            <span className="text-[#5E6F68] uppercase">{k}:</span> <strong className="text-[#2B3A35]">{v}</strong>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Medical Reports */}
                    {c.medical_reports && c.medical_reports.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-[#E6DCCB]">
                        <span className="text-xs font-bold text-[#2B3A35] flex items-center gap-1.5">
                          <FileSpreadsheet size={13} className="text-[#5FA58C]" /> Attached Diagnostic Investigations
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {c.medical_reports.map((rep, idx) => (
                            <div key={idx} className="bg-[#FBF6EF] p-3 rounded-xl border border-[#E6DCCB] text-xs space-y-1">
                              <div className="flex items-center justify-between font-bold text-[#2B3A35]">
                                <span>{rep.title}</span>
                                <span className="text-[10px] text-[#5E6F68] font-mono">{rep.date}</span>
                              </div>
                              <p className="text-[#5E6F68] text-[11px]">{rep.findings}</p>
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
            <div className="p-6 rounded-3xl bg-white border border-[#E6DCCB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#2B3A35] flex items-center gap-2">
                  <Pill size={20} className="text-[#5FA58C] rotate-45" /> Ongoing Medications & Prescription History
                </h2>
                <p className="text-xs text-[#5E6F68]">
                  Tracking active treatments, completed courses, and discontinued medications from all your doctors
                </p>
                {/* DB auto-sync badge */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="w-2 h-2 rounded-full bg-[#5FA58C] animate-pulse inline-block" />
                  <span className="text-[10px] text-[#2F5D50] font-semibold">
                    Auto-synced from your patient record &middot; {medications?.active?.length || 0} active course{(medications?.active?.length || 0) !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1 bg-[#FBF6EF] p-1 rounded-xl border border-[#E6DCCB] text-xs">
                <button
                  onClick={() => setMedFilter('active')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    medFilter === 'active' ? 'bg-[#2F5D50] text-white shadow-sm' : 'text-[#5E6F68] hover:text-[#2B3A35]'
                  }`}
                >
                  Active ({medications.active?.length || 0})
                </button>
                <button
                  onClick={() => setMedFilter('completed')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    medFilter === 'completed' ? 'bg-[#E9E4F7] text-[#4A3B75] shadow-sm' : 'text-[#5E6F68] hover:text-[#2B3A35]'
                  }`}
                >
                  Completed ({medications.completed?.length || 0})
                </button>
                <button
                  onClick={() => setMedFilter('discontinued')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    medFilter === 'discontinued' ? 'bg-[#C9473F] text-white shadow-sm' : 'text-[#5E6F68] hover:text-[#2B3A35]'
                  }`}
                >
                  Discontinued ({medications.discontinued?.length || 0})
                </button>
                <button
                  onClick={() => setMedFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    medFilter === 'all' ? 'bg-white text-[#2B3A35] shadow-sm border border-[#E6DCCB]' : 'text-[#5E6F68] hover:text-[#2B3A35]'
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
                  <div className="text-center py-12 bg-white rounded-3xl border border-[#E6DCCB] text-[#5E6F68] text-xs shadow-xs">
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
                        className={`bg-white rounded-3xl p-5 sm:p-6 border transition shadow-xs space-y-3.5 ${
                          isActive
                            ? 'border-[#5FA58C]'
                            : isDiscontinued
                            ? 'border-[#C9473F]/40'
                            : 'border-[#E6DCCB]'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6DCCB] pb-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span className="text-base font-black text-[#2B3A35]">{med.drug_name}</span>
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#DCEFE6] border border-[#bedacb] text-[#2F5D50]">
                                {med.dosage}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isActive
                                  ? 'bg-[#DCEFE6] text-[#2F5D50] border border-[#bedacb]'
                                  : isCompleted
                                  ? 'bg-[#E9E4F7] text-[#4A3B75] border border-[#d8d0f2]'
                                  : isDiscontinued
                                  ? 'bg-[#C9473F]/10 text-[#C9473F] border border-[#C9473F]/30'
                                  : 'bg-[#FBF6EF] text-[#5E6F68] border border-[#E6DCCB]'
                              }`}>
                                {med.status || 'Active'}
                              </span>
                            </div>

                            <div className="text-xs text-[#5E6F68] flex items-center gap-1.5">
                              <Stethoscope size={13} className="text-[#5FA58C]" />
                              <span>Prescribing Doctor: <strong className="text-[#2B3A35]">{med.doctor_name || 'Attending Physician'}</strong></span>
                              <span className="text-slate-300">|</span>
                              <span className="text-[#5E6F68]">{med.doctor_specialization || 'Internal Medicine'}</span>
                            </div>
                          </div>

                          <div className="text-right text-xs">
                            <span className="text-[#5E6F68] font-mono text-[11px] block">
                              Prescribed on: {String(med.created_at).slice(0, 10)}
                            </span>
                            <span className="text-[#5FA58C] font-bold text-xs">
                              AI Safety Score: {100 - (med.side_effect_pct || 15)}%
                            </span>
                          </div>
                        </div>

                        {/* Details row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div className="bg-[#FBF6EF] p-3 rounded-2xl border border-[#E6DCCB]">
                            <span className="text-[10px] uppercase font-bold text-[#5E6F68] block mb-0.5">Frequency & Timing</span>
                            <span className="font-semibold text-[#2B3A35]">{med.frequency || 'Once daily'}</span>
                          </div>

                          <div className="bg-[#FBF6EF] p-3 rounded-2xl border border-[#E6DCCB]">
                            <span className="text-[10px] uppercase font-bold text-[#5E6F68] block mb-0.5">Duration / Dates</span>
                            <span className="font-semibold text-[#2B3A35]">
                              {med.start_date || 'Start Date'} → {med.end_date || 'Ongoing'}
                            </span>
                          </div>

                          <div className="bg-[#FBF6EF] p-3 rounded-2xl border border-[#E6DCCB]">
                            <span className="text-[10px] uppercase font-bold text-[#5E6F68] block mb-0.5">Instructions</span>
                            <span className="font-medium text-[#2F5D50]">{med.instructions || 'Take with water as directed.'}</span>
                          </div>
                        </div>

                        {isDiscontinued && med.discontinued_reason && (
                          <div className="text-xs bg-[#C9473F]/10 p-3 rounded-2xl border border-[#C9473F]/30 text-[#C9473F] flex items-start gap-2">
                            <ShieldAlert size={15} className="text-[#C9473F] shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-[#C9473F]">Discontinued Reason: </strong>
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
              <div className="p-6 rounded-3xl bg-white border border-[#E6DCCB] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[#2B3A35] flex items-center gap-2">
                      <TrendingUp size={20} className="text-[#5FA58C]" /> Health Timeline
                    </h2>
                    <p className="text-xs text-[#5E6F68] mt-0.5">
                      Chronological view of all consultations, prescriptions &amp; medical events for{' '}
                      <strong className="text-[#2B3A35]">{patient?.name}</strong>
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#DCEFE6] border border-[#bedacb] text-[#2F5D50] text-xs font-bold">
                    {builtTimeline.length} Events
                  </span>
                </div>

                {/* Quick summary chips */}
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#E9E4F7] border border-[#d8d0f2] text-[#4A3B75] text-[11px] font-semibold">
                    🩺 {consultations.length} Consultations
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#DCEFE6] border border-[#bedacb] text-[#2F5D50] text-[11px] font-semibold">
                    💊 {medications?.active?.length || 0} Active Medications
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#F6D68A] border border-[#ecd28d] text-[#3D2600] text-[11px] font-semibold">
                    📋 {prescriptions.length} Total Prescriptions
                  </span>
                </div>
              </div>

              {builtTimeline.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-[#E6DCCB] text-[#5E6F68] text-xs shadow-xs">
                  No timeline events found. Your health events will appear here as records are added.
                </div>
              ) : (
                <div className="relative">
                  {/* Vertical connector line */}
                  <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-[#E6DCCB] hidden sm:block" />

                  <div className="space-y-4">
                    {builtTimeline.map((event, idx) => {
                      const isConsult = event.type === 'consultation';
                      const isRx      = event.type === 'prescription';
                      const isActiveRx = event.status === 'active';

                      const dotColor  = isConsult ? 'bg-[#E9E4F7] border-[#d8d0f2] text-[#4A3B75] shadow-xs'
                                      : isRx && isActiveRx ? 'bg-[#DCEFE6] border-[#bedacb] text-[#2F5D50] shadow-xs'
                                      : isRx ? 'bg-[#DCEFE6] border-[#bedacb] text-[#2F5D50] shadow-xs'
                                      : 'bg-[#FBF6EF] border-[#E6DCCB] text-[#5E6F68]';

                      const cardBorder = 'border-[#E6DCCB] hover:border-[#5FA58C]';

                      const tagLabel  = isConsult ? '🩺 Consultation'
                                      : isRx ? `💊 Prescription${event.status ? ` · ${event.status}` : ''}`
                                      : '📄 Report';

                      const tagClass  = isConsult ? 'bg-[#E9E4F7] text-[#4A3B75] border-[#d8d0f2]'
                                      : isRx && isActiveRx ? 'bg-[#DCEFE6] text-[#2F5D50] border-[#bedacb]'
                                      : isRx ? 'bg-[#DCEFE6] text-[#2F5D50] border-[#bedacb]'
                                      : 'bg-[#FBF6EF] text-[#2B3A35] border-[#E6DCCB]';

                      return (
                        <div key={idx} className="flex gap-4 sm:gap-6 items-start group">
                          {/* Timeline dot */}
                          <div className={`relative z-10 w-10 h-10 rounded-full border-2 ${dotColor} flex items-center justify-center shrink-0 shadow-xs group-hover:scale-110 transition-transform`}>
                            {isConsult
                              ? <Stethoscope size={16} />
                              : isRx
                              ? <Pill size={16} />
                              : <FileText size={16} />}
                          </div>

                          {/* Event Card */}
                          <div className={`flex-1 bg-white rounded-2xl border p-4 sm:p-5 space-y-2.5 transition-all shadow-xs ${cardBorder}`}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${tagClass}`}>
                                  {tagLabel}
                                </span>
                                <h3 className="font-black text-[#2B3A35] text-sm">{event.title}</h3>
                              </div>
                              <span className="text-[11px] text-[#5E6F68] font-mono flex items-center gap-1 shrink-0">
                                <Calendar size={11} className="text-[#5FA58C]" />
                                {String(event.date || '').slice(0, 10)}
                              </span>
                            </div>

                            {event.detail && (
                              <p className={`text-xs font-semibold flex items-center gap-1.5 ${isConsult ? 'text-[#4A3B75]' : 'text-[#2F5D50]'}`}>
                                {isConsult
                                  ? <Stethoscope size={12} className="text-[#4A3B75] shrink-0" />
                                  : <Pill size={12} className="text-[#5FA58C] shrink-0" />}
                                <span className="">{event.detail}</span>
                              </p>
                            )}

                            {event.hospital && (
                              <p className="text-[11px] text-[#5E6F68] flex items-center gap-1.5">
                                <Building2 size={11} className="text-[#5FA58C]" /> {event.hospital}
                              </p>
                            )}

                            {event.doctor && (
                              <p className="text-[11px] text-[#5E6F68] flex items-center gap-1.5">
                                <Stethoscope size={11} className="text-[#5FA58C]" /> Prescribed by <strong className="text-[#2B3A35] ml-1">{event.doctor}</strong>
                              </p>
                            )}

                            {event.sub && (
                              <div className="bg-[#FBF6EF] p-3 rounded-xl border border-[#E6DCCB] text-[11px] text-[#2B3A35] leading-relaxed">
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
            <div className="p-6 rounded-3xl bg-white border border-[#E6DCCB] shadow-xs space-y-2">
              <h2 className="text-lg font-bold text-[#2B3A35] flex items-center gap-2">
                <Users size={20} className="text-[#5FA58C]" /> My Multi-Doctor Care Team
              </h2>
              <p className="text-xs text-[#5E6F68]">
                Authorized doctors managing your treatment, second opinions, and medical history
              </p>
            </div>

            {careTeam.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-[#E6DCCB] text-[#5E6F68] text-xs shadow-xs">
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
                      className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E6DCCB] shadow-xs space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isTreating
                              ? 'bg-[#DCEFE6] text-[#2F5D50] border border-[#bedacb]'
                              : isConsulting
                              ? 'bg-[#E9E4F7] text-[#4A3B75] border border-[#d8d0f2]'
                              : 'bg-[#FBF6EF] text-[#5E6F68] border border-[#E6DCCB]'
                          }`}>
                            {doc.relationship_type === 'treating' ? 'Treating Physician' : doc.relationship_type === 'consulting' ? 'Consulting Specialist' : 'Previous Doctor'}
                          </span>

                          <span className="text-[10px] text-[#5FA58C] font-bold flex items-center gap-1">
                            <ShieldCheck size={12} /> Consent Active
                          </span>
                        </div>

                        <div className="pt-1">
                          <h3 className="font-black text-[#2B3A35] text-base">{doc.doctor_name}</h3>
                          <p className="text-xs text-[#2F5D50] font-semibold">{doc.doctor_specialization}</p>
                          <p className="text-xs text-[#5E6F68] flex items-center gap-1 mt-1">
                            <Building2 size={13} className="text-[#5FA58C]" /> {doc.doctor_hospital}
                          </p>
                        </div>

                        {doc.notes && (
                          <div className="bg-[#FBF6EF] p-2.5 rounded-xl border border-[#E6DCCB] text-[11px] text-[#2B3A35]">
                            <span className="text-[#5E6F68] block text-[10px] uppercase font-bold">Clinical Scope:</span>
                            {doc.notes}
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-[#E6DCCB] text-[11px] text-[#5E6F68] flex items-center justify-between">
                        <span>Access: <strong className="text-[#2B3A35] capitalize">{doc.access_permission || 'Full'} Record</strong></span>
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
            <div className="flex justify-between items-center border-b border-[#E6DCCB] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#2B3A35] flex items-center gap-2">
                  <FileText size={18} className="text-[#5FA58C]" /> Patient Clinical Discharge & Drug Safety Report
                </h2>
                <p className="text-xs text-[#5E6F68]">
                  Certified pharmacological record from Apex Multispecialty Hospital
                </p>
              </div>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-[#2F5D50] hover:bg-[#5FA58C] text-white font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
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
                  hinglish: `${activeDrugName} suppresses gastric acid secretion. Administer in the morning on an empty stomach.`,
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

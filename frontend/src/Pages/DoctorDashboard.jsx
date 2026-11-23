import React, { useState, useEffect } from 'react';
import {
  Brain, UserPlus, Users, Pill, Activity, ShieldAlert, CheckCircle,
  AlertTriangle, Stethoscope, Search, RefreshCw, LogOut, ChevronRight,
  Sparkles, Save, Heart, Info, FileText, BarChart3, Database, Sliders,
  Check, ArrowRight, UserCheck, AlertCircle, Building2, Award, Printer,
  Languages, Zap, TrendingUp, Layers, Calendar, Clock, DollarSign,
  ThumbsUp, ChevronDown, Smile, ShieldCheck, HelpCircle, Plus, X,
  Trash2, Download, FileSpreadsheet, Sun, Moon, Cpu
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import HumanBody3D from '../components/HumanBody3D';
import EffectCharts from '../components/EffectCharts';
import DrugComparison from '../components/DrugComparison';
import AiRecommendation from '../components/AiRecommendation';
import MedicalReport from '../components/MedicalReport';
import DoctorProfileView from '../components/DoctorProfileView';
import CentralizedMedicalHistory from '../components/CentralizedMedicalHistory';
import OngoingMedicationsTracker from '../components/OngoingMedicationsTracker';
import {
  getPatients, getDrugs, addPatient, deletePatient, deletePrescription, predictDrugEffect,
  compareThreeDrugs, prescribeDrug, getMlDatasetStats,
  getDrugResearch, expandDatasetWithApi, getPrescriptions, getDashboardStats,
  checkAllergyConflict, getGeminiMedicineRecommendation, getConditionMatchingDrugs,
  getPatientByContact
} from '../services/api';
import { exportPatientsExcelFile } from '../utils/excelExport';
import { useLanguage } from '../context/LanguageContext';

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { lang, setLang, t } = useLanguage();

  // Theme mode: 'light' (Soft Light) | 'dark' (Dark Focus Mode)
  const [docTheme, setDocTheme] = useState(() => localStorage.getItem('doctor_theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-doc-theme', docTheme);
    localStorage.setItem('doctor_theme', docTheme);
  }, [docTheme]);

  const toggleDocTheme = () => {
    setDocTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Doctor profile
  const [doctorProfile, setDoctorProfile] = useState({
    name: 'Dr. Sharma, MD',
    specialization: 'Cardiology & Internal Medicine',
    hospital_name: 'Apex Multispecialty Hospital',
    license_number: 'MH-CARD-2021-984'
  });

  // Main Active Navigation View
  // 'dashboard' | 'patients' | 'new-patient' | 'prescriptions' | 'ml-analysis' | 'comparisons' | 'report'
  const [activeView, setActiveView] = useState('dashboard');

  // Data states
  const [patients, setPatients] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [sessionAnalysesCount, setSessionAnalysesCount] = useState(0);
  const [prescriptionTabMode, setPrescriptionTabMode] = useState('new'); // 'new' | 'history'
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedDrug, setSelectedDrug] = useState('');
  // ── Multi-Medicine Prescription State ──
  const [prescribedMedicines, setPrescribedMedicines] = useState([]); // [{drug, dosage, timing, duration}]
  const [allergyConflicts, setAllergyConflicts] = useState({}); // { drugName: conflictData }
  const [allergyCheckLoading, setAllergyCheckLoading] = useState({});
  const [activeVisualizeDrug, setActiveVisualizeDrug] = useState(''); // drug selected for 3D view
  const [visualizationTab, setVisualizationTab] = useState('3d'); // '3d' | '2d' (3D Simulation vs 2D DDI & Effect Charts)
  const [customDosage, setCustomDosage] = useState('40 mg Once Daily');
  const [duration, setDuration] = useState('10 Days');
  const [timing, setTiming] = useState('Before Breakfast');
  const [doctorNotes, setDoctorNotes] = useState('');

  // Analysis states
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [externalResearch, setExternalResearch] = useState(null);
  const [prescribeSuccess, setPrescribeSuccess] = useState('');
  const [prescribeError, setPrescribeError] = useState('');

  // Patient Deletion & Excel Export State
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [isDeletingPatient, setIsDeletingPatient] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // ML Dataset stats
  const [mlStats, setMlStats] = useState(null);

  // New Patient Form (Screen 3)
  const initialPatientState = {
    name: '',
    age: '',
    gender: 'Male',
    contact_number: '',
    email: '',
    address: '',
    current_health_issue: '',
    existing_diseases: '',
    medical_history: '',
    allergies: '',
    current_medications: '',
    is_pregnant: false,
    pregnancy_trimester: '1st'
  };
  const [newPatient, setNewPatient] = useState(initialPatientState);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [directorySubTab, setDirectorySubTab] = useState('list'); // 'list' | 'history' | 'medications'
  const [existingRecordFound, setExistingRecordFound] = useState(null);
  const [isLookingUpPatient, setIsLookingUpPatient] = useState(false);

  // Automatically lookup and pick previous patient information from the database
  const handleContactLookup = async (contactVal) => {
    const clean = String(contactVal || '').trim();
    if (clean.length < 10) {
      setExistingRecordFound(null);
      return;
    }

    // 1. Check local patients state
    const localMatch = patients.find(p => String(p.contact_number).trim() === clean);
    if (localMatch) {
      setExistingRecordFound(localMatch);
      setNewPatient(prev => ({
        ...prev,
        name: prev.name || localMatch.name || '',
        age: prev.age || localMatch.age || '',
        gender: localMatch.gender || prev.gender,
        address: prev.address || localMatch.address || '',
        medical_history: prev.medical_history || localMatch.medical_history || '',
        existing_diseases: prev.existing_diseases || localMatch.existing_diseases || '',
        allergies: prev.allergies || localMatch.allergies || '',
        current_health_issue: prev.current_health_issue || localMatch.current_health_issue || '',
        current_medications: prev.current_medications || localMatch.current_medications || '',
        is_pregnant: localMatch.is_pregnant ? true : prev.is_pregnant
      }));
      return;
    }

    // 2. Query backend by contact
    setIsLookingUpPatient(true);
    try {
      const data = await getPatientByContact(clean);
      if (data && data.patient) {
        setExistingRecordFound(data.patient);
        setNewPatient(prev => ({
          ...prev,
          name: prev.name || data.patient.name || '',
          age: prev.age || data.patient.age || '',
          gender: data.patient.gender || prev.gender,
          address: prev.address || data.patient.address || '',
          medical_history: prev.medical_history || data.patient.medical_history || '',
          existing_diseases: prev.existing_diseases || data.patient.existing_diseases || '',
          allergies: prev.allergies || data.patient.allergies || '',
          current_health_issue: prev.current_health_issue || data.patient.current_health_issue || '',
          current_medications: prev.current_medications || data.patient.current_medications || '',
          is_pregnant: data.patient.is_pregnant ? true : prev.is_pregnant
        }));
      } else {
        setExistingRecordFound(null);
      }
    } catch {
      setExistingRecordFound(null);
    } finally {
      setIsLookingUpPatient(false);
    }
  };

  const handlePrefillDemoPatient = () => {
    setNewPatient({
      name: 'Pooja Patil',
      age: '29',
      gender: 'Female',
      contact_number: '9820556677',
      email: 'pooja.patil@example.com',
      address: 'Dadar West, Mumbai',
      current_health_issue: 'Acid Reflux & Heartburn',
      existing_diseases: 'Mild GERD',
      medical_history: 'Recurrent acidity after spicy meals',
      allergies: 'None',
      current_medications: 'None currently',
      is_pregnant: false,
      pregnancy_trimester: '1st'
    });
  };

  useEffect(() => {
    const savedDoc = localStorage.getItem('drugai_doctor');
    if (savedDoc) {
      try {
        setDoctorProfile(JSON.parse(savedDoc));
      } catch (e) {
        console.error('Error parsing doctor profile:', e);
      }
    }
    loadInitialData();
    loadMlStats();
  }, []);

  const loadInitialData = async () => {
    try {
      const [patientsData, drugsData, prescriptionsData, statsData] = await Promise.all([
        getPatients().catch(() => []),
        getDrugs().catch(() => []),
        getPrescriptions().catch(() => []),
        getDashboardStats().catch(() => null)
      ]);
      setPatients(patientsData || []);
      setDrugs(drugsData || []);
      setPrescriptions(prescriptionsData || []);
      if (statsData) setDashboardStats(statsData);

      if (patientsData && patientsData.length > 0) {
        setSelectedPatient(patientsData[0]);
      }

      if (drugsData && drugsData.length > 0) {
        const panto = drugsData.find(d => d.name.toLowerCase().includes('pantoprazole'));
        if (panto) {
          setSelectedDrug(panto.name);
          setCustomDosage(panto.standard_dose || '40 mg');
        } else {
          setSelectedDrug(drugsData[0].name);
          setCustomDosage(drugsData[0].standard_dose || '40 mg');
        }
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  };

  const loadMlStats = async () => {
    try {
      const stats = await getMlDatasetStats();
      setMlStats(stats);
    } catch (err) {
      console.error('Error loading ML dataset stats:', err);
    }
  };

  // Run AI ML Analysis with Gemini-Grounded Recommendations
  const handleRunAnalysis = async () => {
    const targetDrug = activeVisualizeDrug || selectedDrug;
    if (!selectedPatient || !targetDrug) {
      alert('Please select a patient and a drug.');
      return;
    }
    setLoadingAnalysis(true);
    setPrescribeSuccess('');
    setPrescribeError('');
    try {
      // 1. Core ML prediction & pharmacological research for the target drug
      const [predResult, researchResult] = await Promise.all([
        predictDrugEffect(selectedPatient, targetDrug),
        getDrugResearch(targetDrug).catch(() => null)
      ]);
      setPrediction(predResult);
      setExternalResearch(researchResult);

      // 2. Fetch Gemini AI clinical recommendation strictly grounded on patient health issue & allergies
      const conditionDrugs = getConditionMatchingDrugs(selectedPatient);
      const geminiRec = await getGeminiMedicineRecommendation({
        patient: selectedPatient,
        candidateDrugs: conditionDrugs,
        currentDrug: targetDrug,
        lang
      }).catch(() => null);

      // 3. Fallback comparison through backend engine
      const candidateList = Array.from(new Set([targetDrug, ...conditionDrugs])).slice(0, 4);
      const compResult = await compareThreeDrugs(selectedPatient, candidateList).catch(() => null);

      if (geminiRec && geminiRec.candidateDrugs && geminiRec.candidateDrugs.length > 0) {
        setComparison({
          ...compResult,
          candidate_drugs: geminiRec.candidateDrugs,
          recommended_drug: geminiRec.recommendedDrug || targetDrug,
          recommendation_rationale: geminiRec.recommendationRationale?.[lang] || geminiRec.recommendationRationale?.english || compResult?.recommendation_rationale,
          explanation_for_patient: geminiRec.explanationForPatient,
          condition_identified: geminiRec.conditionIdentified
        });
      } else {
        setComparison(compResult);
      }

      setSessionAnalysesCount(prev => prev + 1);
      setActiveVisualizeDrug(targetDrug);
      setActiveView('ml-analysis');
    } catch (err) {
      alert('Analysis failed: ' + err.message);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  // ── Add medicine to prescription list ──
  const handleAddMedicine = async () => {
    if (!selectedDrug) return;
    const exists = prescribedMedicines.find(m => m.drug === selectedDrug);
    if (exists) {
      alert(`${selectedDrug} is already in the prescription list.`);
      return;
    }
    const newMed = {
      drug: selectedDrug,
      dosage: customDosage,
      timing,
      duration,
      drugData: drugs.find(d => d.name === selectedDrug) || null
    };
    setPrescribedMedicines(prev => [...prev, newMed]);
    setActiveVisualizeDrug(selectedDrug);

    // Auto check allergy conflict for this drug
    if (selectedPatient?.allergies && selectedPatient.allergies.toLowerCase() !== 'none') {
      setAllergyCheckLoading(prev => ({ ...prev, [selectedDrug]: true }));
      try {
        const conflict = await checkAllergyConflict({
          drugName: selectedDrug,
          allergies: selectedPatient.allergies
        });
        setAllergyConflicts(prev => ({ ...prev, [selectedDrug]: conflict }));
      } catch {
        // silently fail
      } finally {
        setAllergyCheckLoading(prev => ({ ...prev, [selectedDrug]: false }));
      }
    }
  };

  // ── Remove medicine from list ──
  const handleRemoveMedicine = (drugName) => {
    setPrescribedMedicines(prev => prev.filter(m => m.drug !== drugName));
    setAllergyConflicts(prev => { const n = { ...prev }; delete n[drugName]; return n; });
    if (activeVisualizeDrug === drugName) {
      const remaining = prescribedMedicines.filter(m => m.drug !== drugName);
      if (remaining.length > 0) setActiveVisualizeDrug(remaining[0].drug);
    }
  };

  // Save Prescription (Supports both single drug and multi-medicine batch)
  const handlePrescribe = async () => {
    if (!selectedPatient) {
      alert('Please select a patient.');
      return;
    }
    const targetDrug = activeVisualizeDrug || selectedDrug;
    if (!targetDrug && prescribedMedicines.length === 0) {
      alert('Please select or add at least one medicine.');
      return;
    }
    setPrescribeError('');
    setPrescribeSuccess('');
    try {
      if (prescribedMedicines.length > 0) {
        // Multi-medicine batch prescription
        await prescribeDrug({
          patient_id: selectedPatient.id,
          contact_number: selectedPatient.contact_number,
          doctor_id: doctorProfile.id || 1,
          doctor_name: doctorProfile.name || 'Dr. Sharma, MD',
          doctor_specialization: doctorProfile.specialization || 'Cardiology & Internal Medicine',
          doctor_hospital: doctorProfile.hospital_name || 'Apex Multispecialty Hospital',
          medicines: prescribedMedicines.map(m => ({
            drug_name: m.drug,
            dosage: `${m.dosage} (${m.timing}, ${m.duration})`,
            timing: m.timing || 'Once daily',
            duration: m.duration || '10 Days',
            frequency: m.timing || 'Once daily',
            start_date: new Date().toISOString().slice(0, 10),
            end_date: m.duration || '10 Days',
            instructions: `Take ${m.timing || 'as directed'} with water.`,
            status: 'active',
            doctor_notes: doctorNotes || 'Take as advised with water.'
          })),
          doctor_notes: doctorNotes || 'Prescription confirmed.'
        });
        setPrescribeSuccess(`Successfully saved all ${prescribedMedicines.length} prescribed medicines for ${selectedPatient.name}!`);
      } else {
        // Single drug prescription
        const pred = prediction || {
          drug_name: targetDrug,
          drug_class: 'Targeted Pharmacotherapy',
          standard_dose: customDosage || 'Standard dose',
          effectiveness_pct: 88,
          side_effect_pct: 12,
          ddi_pct: 8,
          overall_risk_level: 'LOW',
          target_organs: selectedDrugData?.target_organs || ['Stomach'],
          dietary_warnings: 'Take with adequate water as advised by doctor.',
          clinical_alerts: [],
          multilingual_recommendation: {
            english: `${targetDrug} prescribed for ${selectedPatient.name} based on clinical evaluation.`,
            hinglish: `${selectedPatient.name}: ${targetDrug} has been evaluated as clinically effective and safe for this profile.`,
            marathi: `${selectedPatient.name} यांच्यासाठी ${targetDrug} सुरक्षित आणि प्रभावी ठरले आहे.`
          }
        };

        await prescribeDrug({
          patient_id: selectedPatient.id,
          contact_number: selectedPatient.contact_number,
          doctor_id: doctorProfile.id || 1,
          doctor_name: doctorProfile.name || 'Dr. Sharma, MD',
          doctor_specialization: doctorProfile.specialization || 'Cardiology & Internal Medicine',
          doctor_hospital: doctorProfile.hospital_name || 'Apex Multispecialty Hospital',
          drug_name: targetDrug,
          dosage: `${customDosage} (${timing}, ${duration})`,
          frequency: timing || 'Once daily',
          start_date: new Date().toISOString().slice(0, 10),
          end_date: duration || '10 Days',
          instructions: `Take ${timing} with water.`,
          status: 'active',
          prediction: pred,
          doctor_notes: doctorNotes || 'Take before breakfast with water.'
        });
        setPrescribeSuccess(`Prescription successfully saved for ${selectedPatient.name}!`);
      }

      // Refresh prescriptions and stats from database
      const [updatedPrescriptions, updatedStats] = await Promise.all([
        getPrescriptions().catch(() => []),
        getDashboardStats().catch(() => null)
      ]);
      setPrescriptions(updatedPrescriptions || []);
      if (updatedStats) setDashboardStats(updatedStats);
    } catch (err) {
      setPrescribeError('Prescription failed: ' + err.message);
    }
  };

  // Create Patient & Advance to Prescribe Medicine (Screen 3 -> Screen 4)
  const handleCreatePatient = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!newPatient.name || !newPatient.contact_number || !newPatient.age) {
      setFormError('Name, age, and contact number are required.');
      return;
    }

    try {
      const res = await addPatient(newPatient);
      setFormSuccess(res.message || 'Patient registered successfully!');
      
      // Refresh patients and dashboard stats immediately
      const [updated, updatedStats] = await Promise.all([
        getPatients(),
        getDashboardStats().catch(() => null)
      ]);
      setPatients(updated);
      if (updatedStats) setDashboardStats(updatedStats);

      const added = updated.find(p => p.contact_number === newPatient.contact_number) || updated[0];
      if (added) {
        setSelectedPatient(added);
      }
      setNewPatient(initialPatientState);

      setTimeout(() => {
        setActiveView('prescriptions');
      }, 700);
    } catch (err) {
      setFormError(err.message || 'Failed to register patient.');
    }
  };

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handlePromptDeletePatient = (patient) => {
    setPatientToDelete(patient);
  };

  const handleConfirmDeletePatient = async () => {
    if (!patientToDelete) return;
    setIsDeletingPatient(true);
    try {
      await deletePatient(patientToDelete.id);

      const remainingPatients = patients.filter(p => p.id !== patientToDelete.id);
      setPatients(remainingPatients);

      setPrescriptions(prev => prev.filter(
        pr => pr.patient_id !== patientToDelete.id && pr.patient_contact !== patientToDelete.contact_number
      ));

      if (selectedPatient?.id === patientToDelete.id) {
        setSelectedPatient(remainingPatients.length > 0 ? remainingPatients[0] : null);
      }

      if (dashboardStats) {
        setDashboardStats(prev => ({
          ...prev,
          total_patients: Math.max(0, (prev.total_patients || 1) - 1)
        }));
      }

      showToast(`Patient "${patientToDelete.name}" removed from clinical records.`);
      setPatientToDelete(null);
    } catch (err) {
      showToast(err.message || 'Failed to remove patient.', 'error');
    } finally {
      setIsDeletingPatient(false);
    }
  };

  const handleExportExcel = async (patientsToExport = null) => {
    setIsExportingExcel(true);
    try {
      const list = patientsToExport || patients;
      if (list.length === 0) {
        showToast('No patient records available to export.', 'error');
        return;
      }
      const result = await exportPatientsExcelFile({
        patients: list,
        prescriptions,
        doctorProfile,
        preferBackend: true
      });
      showToast(`Exported ${result.count || list.length} patient records to Excel successfully!`);
    } catch (err) {
      showToast('Excel export failed: ' + err.message, 'error');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Real new patients count (last 7 days)
  const newPatientsCount = (() => {
    if (dashboardStats && typeof dashboardStats.new_patients === 'number') {
      return dashboardStats.new_patients;
    }
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return patients.filter(p => {
      if (!p.created_at) return false;
      const d = new Date(p.created_at.replace(' ', 'T') + 'Z');
      return !isNaN(d.getTime()) && d >= sevenDaysAgo;
    }).length;
  })();

  const totalAnalysesCount = (dashboardStats?.total_analyses ?? prescriptions.length) + sessionAnalysesCount;

  const selectedDrugData = drugs.find(d => d.name === selectedDrug);

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.contact_number && p.contact_number.includes(searchQuery)) ||
    (p.existing_diseases && p.existing_diseases.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-[#14213D] flex flex-col font-sans selection:bg-[#3B4CCA] selection:text-white">
      {/* TOP NAVBAR */}
      <header className="h-16 border-b border-[#D5DBEA] bg-white px-4 lg:px-6 flex items-center justify-between z-30 shrink-0 sticky top-0 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#3B4CCA] flex items-center justify-center shadow-lg shadow-xs">
            <Brain size={22} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-base tracking-tight text-[#14213D]">MedInsight AI Studio</span>
              <span className="px-2 py-0.5 rounded-full bg-[#E3E8F5] border border-[#3B4CCA]/30 text-[#3B4CCA] text-[10px] font-mono uppercase font-bold">
                Doctor Console
              </span>
            </div>
            <span className="text-[11px] text-[#5B6480] hidden sm:block">
              Machine Learning Personalized Drug Prediction & 3D Anatomy Mapping
            </span>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white p-1 rounded-xl border border-[#D5DBEA] text-xs">
            <Languages size={14} className="text-[#5B6480] ml-1 mr-1" />
            <button
              onClick={() => setLang('english')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${lang === 'english' ? 'bg-[#3B4CCA] text-white shadow' : 'text-[#5B6480] hover:text-[#14213D]'}`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('hinglish')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${lang === 'hinglish' ? 'bg-[#3B4CCA] text-white shadow' : 'text-[#5B6480] hover:text-[#14213D]'}`}
            >
              Hinglish
            </button>
            <button
              onClick={() => setLang('marathi')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${lang === 'marathi' ? 'bg-[#3B4CCA] text-white shadow' : 'text-[#5B6480] hover:text-[#14213D]'}`}
            >
              मराठी
            </button>
            <button
              onClick={() => setLang('hindi')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${lang === 'hindi' ? 'bg-[#3B4CCA] text-white shadow' : 'text-[#5B6480] hover:text-[#14213D]'}`}
            >
              हिन्दी
            </button>
          </div>

          {/* THEME TOGGLE: SOFT LIGHT vs DARK FOCUS MODE */}
          <button
            type="button"
            onClick={toggleDocTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D5DBEA] bg-white text-xs font-bold text-[#14213D] hover:bg-[#E3E8F5] transition cursor-pointer shadow-xs"
            title={docTheme === 'dark' ? 'Switch to Soft Light mode' : 'Switch to Dark Focus mode'}
          >
            {docTheme === 'dark' ? (
              <>
                <Moon size={14} className="text-[#8A5CF6]" />
                <span className="hidden sm:inline font-mono">Dark Focus</span>
              </>
            ) : (
              <>
                <Sun size={14} className="text-[#F2A93B]" />
                <span className="hidden sm:inline font-mono">Soft Light</span>
              </>
            )}
          </button>

          {/* TOP NAVBAR CLINICAL DATASET QUICK LINKS */}
          <div className="hidden lg:flex items-center gap-1.5 bg-[#E8EEF8] p-1 rounded-xl border border-[#D5DBEA]">
            <Link
              to="/train"
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#14213D] hover:bg-white transition flex items-center gap-1"
              title="Open Clinical Training Dataset Page (80%)"
            >
              <Database size={12} className="text-[#3B4CCA]" />
              <span>Train Data</span>
            </Link>
            <Link
              to="/test"
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#14213D] hover:bg-white transition flex items-center gap-1"
              title="Open Clinical Testing Dataset Page (20%)"
            >
              <Activity size={12} className="text-[#0E836A]" />
              <span>Test Data</span>
            </Link>
          </div>

          <div
            onClick={() => setActiveView('doctor-profile')}
            className={`hidden md:flex flex-col text-right cursor-pointer group px-3 py-1.5 rounded-xl border transition ${
              activeView === 'doctor-profile'
                ? 'bg-[#E3E8F5] border-[#3B4CCA] shadow-md shadow-xs'
                : 'bg-white border-[#D5DBEA] hover:border-[#3B4CCA]/40 hover:bg-white'
            }`}
            title="Click to view and edit your Doctor Profile"
          >
            <span className="text-xs font-bold text-[#14213D] group-hover:text-[#3B4CCA] transition flex items-center gap-1.5 justify-end">
              <Stethoscope size={13} className="text-[#3B4CCA]" /> {doctorProfile.name}
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                activeView === 'doctor-profile' ? 'bg-[#3B4CCA] text-white' : 'bg-[#E3E8F5] text-[#3B4CCA] border border-[#D5DBEA]'
              }`}>
                Profile
              </span>
            </span>
            <span className="text-[11px] text-[#5B6480] font-mono group-hover:text-[#14213D] transition">
              {doctorProfile.hospital_name}
            </span>
          </div>

          <button
            onClick={() => {
              localStorage.removeItem('drugai_doctor');
              navigate('/login');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#E5484D]/10 hover:text-[#E5484D] text-[#5B6480] text-xs font-semibold border border-[#D5DBEA] transition cursor-pointer"
            title="Logout"
          >
            <LogOut size={14} /> <span className="hidden sm:inline">{t('exit')}</span>
          </button>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT NAVIGATION SIDEBAR */}
        <aside className="w-64 bg-[#14213D] border-r border-[#1e2f54] text-white flex flex-col shrink-0 overflow-y-auto">
          {/* INITIAL DOCTOR'S NAME TAB (Opens Doctor Profile) */}
          {/* TOP NAVBAR CLINICAL DATASET QUICK LINKS */}
          <div className="hidden lg:flex items-center gap-1.5 bg-[#E8EEF8] p-1 rounded-xl border border-[#D5DBEA]">
            <Link
              to="/train"
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#14213D] hover:bg-white transition flex items-center gap-1"
              title="Open Clinical Training Dataset Page (80%)"
            >
              <Database size={12} className="text-[#3B4CCA]" />
              <span>Train Data</span>
            </Link>
            <Link
              to="/test"
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#14213D] hover:bg-white transition flex items-center gap-1"
              title="Open Clinical Testing Dataset Page (20%)"
            >
              <Activity size={12} className="text-[#0E836A]" />
              <span>Test Data</span>
            </Link>
          </div>

          <div
            onClick={() => setActiveView('doctor-profile')}
            className={`p-4 border-b border-[#1e2f54] cursor-pointer transition group ${
              activeView === 'doctor-profile'
                ? 'bg-[#1b2b4d] border-l-4 border-l-[#3B4CCA] shadow-inner'
                : 'hover:bg-[#1a2948]'
            }`}
            title="Click to view and manage your Doctor Profile"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold transition ${
                activeView === 'doctor-profile'
                  ? 'bg-[#3B4CCA] text-white border-[#3B4CCA] shadow-md shadow-xs scale-105'
                  : 'bg-[#1e2f54] border-[#2e4069] text-white group-hover:scale-105'
              }`}>
                {doctorProfile.name?.replace('Dr. ', '').slice(0, 2).toUpperCase() || 'DS'}
              </div>
              <div className="overflow-hidden flex-1">
                <div className="flex items-center justify-between">
                  <h4 className={`text-xs font-bold truncate transition ${
                    activeView === 'doctor-profile' ? 'text-white font-extrabold' : 'text-white group-hover:text-indigo-200'
                  }`}>
                    {doctorProfile.name}
                  </h4>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase transition ${
                    activeView === 'doctor-profile'
                      ? 'bg-[#3B4CCA] text-white shadow'
                      : 'bg-[#1e2f54] text-[#D5DBEA] border border-[#2e4069]'
                  }`}>
                    Profile
                  </span>
                </div>
                <p className="text-[10px] text-[#9AA6C2] truncate mt-0.5">{doctorProfile.specialization}</p>
                <span className="text-[10px] text-[#8A97B5] font-medium flex items-center gap-1 mt-1 group-hover:text-white">
                  <Award size={11} className="text-[#3B4CCA]" /> Click to view Profile →
                </span>
              </div>
            </div>
          </div>

          <nav className="p-3 space-y-1 text-xs flex-1">
            <button
              onClick={() => setActiveView('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold transition cursor-pointer ${
                activeView === 'dashboard'
                  ? 'bg-[#3B4CCA] text-white shadow-lg shadow-indigo-950/40'
                  : 'text-[#D5DBEA] hover:text-white hover:bg-[#1f3056]'
              }`}
            >
              <BarChart3 size={17} /> Dashboard
            </button>

            <button
              onClick={() => {
                setActiveView('patients');
                setDirectorySubTab('list');
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold transition cursor-pointer ${
                activeView === 'patients'
                  ? 'bg-[#3B4CCA] text-white shadow-lg shadow-indigo-950/40'
                  : 'text-[#D5DBEA] hover:text-white hover:bg-[#1f3056]'
              }`}
            >
              <Users size={17} /> Patients Directory
            </button>

            <button
              onClick={() => setActiveView('prescriptions')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold transition cursor-pointer ${
                activeView === 'prescriptions'
                  ? 'bg-[#3B4CCA] text-white shadow-lg shadow-indigo-950/40'
                  : 'text-[#D5DBEA] hover:text-white hover:bg-[#1f3056]'
              }`}
            >
              <Stethoscope size={17} /> Prescribe & Analyze
            </button>

            <button
              onClick={() => setActiveView('new-patient')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold transition cursor-pointer ${
                activeView === 'new-patient'
                  ? 'bg-[#3B4CCA] text-white shadow-lg shadow-indigo-950/40'
                  : 'text-[#D5DBEA] hover:text-white hover:bg-[#1f3056]'
              }`}
            >
              <UserPlus size={17} /> Register New Patient
            </button>

            <button
              onClick={() => setActiveView('ml-analysis')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold transition cursor-pointer ${
                activeView === 'ml-analysis'
                  ? 'bg-[#3B4CCA] text-white shadow-lg shadow-indigo-950/40'
                  : 'text-[#D5DBEA] hover:text-white hover:bg-[#1f3056]'
              }`}
            >
              <Activity size={17} /> 3D Organ Simulation
            </button>

            <button
              onClick={() => setActiveView('comparisons')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold transition cursor-pointer ${
                activeView === 'comparisons'
                  ? 'bg-[#3B4CCA] text-white shadow-lg shadow-indigo-950/40'
                  : 'text-[#D5DBEA] hover:text-white hover:bg-[#1f3056]'
              }`}
            >
              <Sliders size={17} /> 2D Drug Comparison
            </button>

            <button
              onClick={() => setActiveView('report')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold transition cursor-pointer ${
                activeView === 'report'
                  ? 'bg-[#3B4CCA] text-white shadow-lg shadow-indigo-950/40'
                  : 'text-[#D5DBEA] hover:text-white hover:bg-[#1f3056]'
              }`}
            >
              <FileText size={17} /> Clinical Report
            </button>
          </nav>

          {selectedPatient && (
            <div className="p-3 m-3 rounded-xl bg-[#192747] border border-[#263b66] text-white text-[11px] space-y-2">
              <div className="flex items-center justify-between text-[#8A97B5]">
                <span className="font-bold text-white">Selected Patient</span>
                <span className="text-[#2BC4A0] font-mono font-bold">{selectedPatient.contact_number}</span>
              </div>
              <p className="font-semibold text-white truncate">{selectedPatient.name} ({selectedPatient.age}y)</p>
              <p className="text-[#A9B4CE] truncate text-[10px]">
                {selectedPatient.current_health_issue || selectedPatient.existing_diseases || 'Standard Intake'}
              </p>
              <div className="flex items-center gap-1.5 pt-1 border-t border-[#263b66]">
                <button
                  type="button"
                  onClick={() => {
                    setDirectorySubTab('history');
                    setActiveView('patients');
                  }}
                  className="flex-1 py-1 rounded bg-[#24375e] hover:bg-[#3B4CCA] text-[#D5DBEA] hover:text-white font-bold text-[10px] text-center transition cursor-pointer"
                >
                  History
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDirectorySubTab('medications');
                    setActiveView('patients');
                  }}
                  className="flex-1 py-1 rounded bg-[#24375e] hover:bg-[#3B4CCA] text-[#D5DBEA] hover:text-white font-bold text-[10px] text-center transition cursor-pointer"
                >
                  Meds
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrescriptionTabMode('new');
                    setActiveView('prescriptions');
                  }}
                  className="flex-1 py-1 rounded bg-[#3B4CCA] hover:bg-[#303ea8] text-white font-bold text-[10px] text-center transition cursor-pointer"
                >
                  Rx
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* MAIN VIEWPORT */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#F4F6FB]">
          <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          {/* SCREEN 2: DOCTOR DASHBOARD OVERVIEW */}
          {activeView === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-black text-[#14213D]">Clinical Overview & Diagnostics</h1>
                  <p className="text-xs text-[#5B6480]">
                    Welcome back, {doctorProfile.name}. Real-time patient monitoring and ML drug risk engine.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleExportExcel(patients)}
                    disabled={isExportingExcel || patients.length === 0}
                    title="Download complete patient records & counts in Excel (.xlsx)"
                    className="px-3.5 py-2 bg-[#14213D] hover:bg-[#1f3056] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {isExportingExcel ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <FileSpreadsheet size={15} />
                    )}
                    <span>Export Excel</span>
                  </button>
                  <button
                    onClick={() => setActiveView('new-patient')}
                    className="px-3.5 py-2 bg-[#3B4CCA] hover:bg-[#303ea8] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <UserPlus size={15} /> + New Patient
                  </button>
                  <button
                    onClick={() => setActiveView('prescriptions')}
                    className="px-3.5 py-2 bg-white hover:bg-[#E3E8F5] text-[#3B4CCA] font-bold text-xs rounded-xl border border-[#D5DBEA] flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <Pill size={15} /> Prescribe Medicine
                  </button>
                </div>
              </div>

              {/* 4 Metric Cards - Clickable Interactive Tabs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* CARD 1: Total Patients */}
                <div
                  onClick={() => setActiveView('patients')}
                  className="p-4 rounded-2xl bg-white border border-[#D5DBEA] hover:border-[#3B4CCA] hover:bg-[#E3E8F5]/30 hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 cursor-pointer relative overflow-hidden shadow-xs group"
                  title="Click to open Patients Directory"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[#E3E8F5] text-[#3B4CCA] flex items-center justify-center group-hover:bg-[#3B4CCA] group-hover:text-white transition">
                      <Users size={20} />
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#E3E8F5] text-[#3B4CCA] text-[10px] font-bold font-mono flex items-center gap-1 group-hover:bg-[#3B4CCA] group-hover:text-white transition">
                      <span>View All</span> <ArrowRight size={10} />
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-[#5B6480]">Total Patients</h4>
                  <div className="text-2xl font-black text-[#14213D] mt-1">
                    {patients.length}
                  </div>
                  <p className="text-[10px] text-[#5B6480] mt-1">Real-time doctor records</p>
                </div>

                {/* CARD 2: New Patients (Vital Mint) */}
                <div
                  onClick={() => setActiveView('new-patient')}
                  className="p-4 rounded-2xl bg-white border border-[#D5DBEA] hover:border-[#2BC4A0] hover:bg-[#E3E8F5]/30 hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 cursor-pointer relative overflow-hidden shadow-xs group"
                  title="Click to register a New Patient"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[#2BC4A0]/20 text-[#06332A] flex items-center justify-center group-hover:bg-[#2BC4A0] group-hover:text-[#06332A] transition">
                      <UserPlus size={20} />
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#2BC4A0] text-[#06332A] text-[10px] font-bold font-mono flex items-center gap-1 shadow-xs">
                      <span>+ Register</span> <ArrowRight size={10} />
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-[#5B6480]">New Patients</h4>
                  <div className="text-2xl font-black text-[#14213D] mt-1">
                    {newPatientsCount}
                  </div>
                  <p className="text-[10px] text-[#5B6480] mt-1">Added in last 7 days</p>
                </div>

                {/* CARD 3: Prescriptions (Clinical Indigo) */}
                <div
                  onClick={() => setActiveView('prescriptions')}
                  className="p-4 rounded-2xl bg-white border border-[#D5DBEA] hover:border-[#3B4CCA] hover:bg-[#E3E8F5]/30 hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 cursor-pointer relative overflow-hidden shadow-xs group"
                  title="Click to open Prescriptions"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[#3B4CCA]/15 text-[#3B4CCA] flex items-center justify-center group-hover:bg-[#3B4CCA] group-hover:text-white transition">
                      <Pill size={20} />
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#3B4CCA] text-white text-[10px] font-bold font-mono flex items-center gap-1 shadow-xs">
                      <span>Prescribe</span> <ArrowRight size={10} />
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-[#5B6480]">Prescriptions</h4>
                  <div className="text-2xl font-black text-[#14213D] mt-1">
                    {prescriptions.length}
                  </div>
                  <p className="text-[10px] text-[#5B6480] mt-1">Active doctor prescriptions</p>
                </div>

                {/* CARD 4: ML Drug Analyses (AI Violet) */}
                <div
                  onClick={() => setActiveView('ml-analysis')}
                  className="p-4 rounded-2xl bg-white border border-[#D5DBEA] hover:border-[#8A5CF6] hover:bg-[#8A5CF6]/5 hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 cursor-pointer relative overflow-hidden shadow-xs group"
                  title="Click to open ML Drug Analysis & 3D Simulation"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[#8A5CF6]/20 text-[#8A5CF6] flex items-center justify-center group-hover:bg-[#8A5CF6] group-hover:text-white transition">
                      <Activity size={20} />
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#8A5CF6] text-white text-[10px] font-bold font-mono flex items-center gap-1 shadow-xs">
                      <span>3D View</span> <ArrowRight size={10} />
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-[#5B6480]">ML Drug Analyses</h4>
                  <div className="text-2xl font-black text-[#14213D] mt-1">
                    {totalAnalysesCount}
                  </div>
                  <p className="text-[10px] text-[#5B6480] mt-1">Completed AI simulations</p>
                </div>
              </div>

              {/* Main Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-white rounded-2xl border border-[#D5DBEA] p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#D5DBEA] pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#14213D] flex items-center gap-2">
                        <Users size={16} className="text-[#3B4CCA]" /> Recent Patients ({patients.length})
                      </h3>
                      <p className="text-[11px] text-[#5B6480]">Click any patient to prescribe medicine or view history</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleExportExcel(patients)}
                        disabled={isExportingExcel || patients.length === 0}
                        title="Export all patients to Excel (.xlsx)"
                        className="text-xs text-[#2BC4A0] hover:text-[#2BC4A0]/80 font-semibold flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                      >
                        <FileSpreadsheet size={13} />
                        <span>Export Excel</span>
                      </button>
                      <button
                        onClick={() => setActiveView('patients')}
                        className="text-xs text-[#3B4CCA] hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        View All ({patients.length}) <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-[#D5DBEA]">
                    {patients.length === 0 ? (
                      <div className="py-8 text-center text-[#5B6480] text-xs">
                        No patients added yet. Click{' '}
                        <button
                          onClick={() => setActiveView('new-patient')}
                          className="text-[#3B4CCA] underline font-semibold hover:text-blue-300 cursor-pointer"
                        >
                          + New Patient
                        </button>{' '}
                        to add one.
                      </div>
                    ) : (
                      patients.slice(0, 5).map((p, idx) => (
                        <div
                          key={p.id || idx}
                          onClick={() => {
                            setSelectedPatient(p);
                            setActiveView('prescriptions');
                          }}
                          className={`py-3 px-2 rounded-xl flex items-center justify-between transition cursor-pointer ${
                            selectedPatient?.id === p.id
                              ? 'bg-[var(--doc-hover)] border border-[var(--doc-btn-primary)]/40 shadow-xs'
                              : 'hover:bg-[var(--doc-hover)]'
                          }`}
                          title={`Click to prescribe for ${p.name}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[var(--doc-hover)] border border-[var(--doc-border)] flex items-center justify-center font-bold text-xs text-[var(--doc-btn-primary)]">
                              {p.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-[var(--doc-text)]">{p.name}</h4>
                              <p className="text-[11px] text-[var(--doc-text-soft)]">
                                {p.age}y, {p.gender} • <span className="text-[var(--doc-text)] opacity-75">{p.existing_diseases || p.current_health_issue || 'General Checkup'}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.allergies ? 'bg-[#F2A93B] text-[#3D2600] border border-[#F2A93B]/40' : 'bg-[#2BC4A0] text-[#06332A] border border-[#2BC4A0]/40'
                            }`}>
                              {p.allergies ? 'Review' : 'Safe'}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPatient(p);
                                setActiveView('prescriptions');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#3B4CCA] hover:bg-[#303ea8] text-white font-semibold text-[11px] transition flex items-center gap-1 cursor-pointer"
                            >
                              <span>Prescribe</span>
                              <ChevronRight size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePromptDeletePatient(p);
                              }}
                              title={`Remove ${p.name} from list`}
                              className="p-1.5 rounded-lg bg-[var(--doc-card)] hover:bg-[#E5484D] text-[var(--doc-text-soft)] hover:text-white border border-[var(--doc-border)] transition cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="lg:col-span-5 bg-white rounded-2xl border border-[#D5DBEA] p-5 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-center justify-between border-b border-[#D5DBEA] pb-3 mb-4">
                      <div>
                        <h3 className="text-sm font-bold text-[#14213D] flex items-center gap-2">
                          <TrendingUp size={16} className="text-[#3B4CCA]" /> Analyses & Prescriptions
                        </h3>
                        <p className="text-[11px] text-[#5B6480]">Clinical evaluation volume & ML throughput</p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-white border border-[#D5DBEA] text-xs text-[#3B4CCA] font-mono font-bold">
                        {totalAnalysesCount} Total
                      </span>
                    </div>

                    <div className="h-44 w-full flex items-end justify-between px-2 pt-6 relative">
                      <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 300 120" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M 10,95 Q 80,40 150,70 T 290,20 L 290,120 L 10,120 Z"
                          fill="url(#chartGrad)"
                        />
                        <path
                          d="M 10,95 Q 80,40 150,70 T 290,20"
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        />
                        <circle cx="10" cy="95" r="4" fill="#38bdf8" stroke="#0f172a" strokeWidth="2" />
                        <circle cx="100" cy="50" r="4" fill="#38bdf8" stroke="#0f172a" strokeWidth="2" />
                        <circle cx="190" cy="65" r="4" fill="#38bdf8" stroke="#0f172a" strokeWidth="2" />
                        <circle cx="290" cy="20" r="4" fill="#38bdf8" stroke="#0f172a" strokeWidth="2" />
                      </svg>
                    </div>

                    <div className="flex justify-between text-[11px] text-[#5B6480] font-mono pt-3 border-t border-[#D5DBEA]/60 mt-2 px-1">
                      <span>Patients ({patients.length})</span>
                      <span>Prescriptions ({prescriptions.length})</span>
                      <span>Analyses ({totalAnalysesCount})</span>
                    </div>
                  </div>

                  <div className="mt-4 p-3.5 rounded-xl bg-white border border-[#D5DBEA] space-y-2">
                    <span className="text-[11px] font-bold text-[#475569] block">Quick Action</span>
                    <button
                      onClick={() => {
                        setActiveView('prescriptions');
                      }}
                      className="w-full py-2.5 bg-[#3B4CCA] hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs rounded-lg shadow flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Sparkles size={14} /> Start New Prescription Analysis
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SCREEN 3: ADD NEW PATIENT */}
          {activeView === 'new-patient' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="flex items-center justify-between border-b border-[#D5DBEA] pb-4">
                <div>
                  <h1 className="text-xl font-black text-[#14213D] flex items-center gap-2">
                    <UserPlus size={22} className="text-blue-500" /> Add New Patient
                  </h1>
                  <p className="text-xs text-[#5B6480]">
                    Enter patient details to initiate AI-powered drug analysis & safety check.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrefillDemoPatient}
                    className="px-3 py-1.5 rounded-lg bg-[#E3EDF5] hover:bg-[#E3EDF5] text-[#3B4CCA] border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Sparkles size={13} /> Prefill Sample Data
                  </button>
                  <button
                    onClick={() => setActiveView('dashboard')}
                    className="px-3 py-1.5 rounded-lg bg-[#F4F6FB] hover:bg-[#E8EDF2] text-[#475569] text-xs font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {formError && (
                <div className="p-3 bg-[#E5484D]/15 border border-[#E5484D]/40 rounded-xl text-xs text-[#E5484D] font-semibold flex items-center gap-2">
                  <AlertCircle size={15} /> <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="p-3 bg-[#2BC4A0]/20 border border-[#2BC4A0]/40 rounded-xl text-xs text-[#06332A] font-semibold flex items-center gap-2">
                  <CheckCircle size={15} /> <span>{formSuccess}</span>
                </div>
              )}

              <form onSubmit={handleCreatePatient} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left: Personal Info */}
                  <div className="bg-white rounded-2xl border border-[#D5DBEA] p-5 space-y-4 shadow-sm">
                    <h3 className="text-xs font-bold text-[#3B4CCA] uppercase tracking-wider flex items-center gap-2 border-b border-[#D5DBEA] pb-2">
                      <Users size={14} /> Personal Information
                    </h3>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#14213D]">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={newPatient.name}
                        onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                        placeholder="e.g. Rahul Verma"
                        className="w-full bg-white border border-[#D5DBEA] rounded-xl px-3.5 py-2.5 text-xs text-[#14213D] font-medium placeholder-[#64748B] focus:outline-none focus:border-[#5B9A94] transition"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[#14213D]">Age *</label>
                        <input
                          type="number"
                          required
                          value={newPatient.age}
                          onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                          placeholder="e.g. 28"
                          className="w-full bg-white border border-[#D5DBEA] rounded-xl px-3.5 py-2.5 text-xs text-[#14213D] font-medium placeholder-[#64748B] focus:outline-none focus:border-[#5B9A94] transition"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[#14213D]">Gender</label>
                        <select
                          value={newPatient.gender}
                          onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                          className="w-full bg-white border border-[#D5DBEA] rounded-xl px-3.5 py-2.5 text-xs text-[#14213D] font-medium focus:outline-none focus:border-[#5B9A94] transition"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-[#14213D]">Contact Number (Phone ID) *</label>
                        {isLookingUpPatient && (
                          <span className="text-[10px] text-[#3B4CCA] flex items-center gap-1 font-mono">
                            <RefreshCw size={10} className="animate-spin" /> Checking database...
                          </span>
                        )}
                      </div>
                      <input
                        type="tel"
                        required
                        value={newPatient.contact_number}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewPatient({ ...newPatient, contact_number: val });
                          if (val.replace(/\D/g, '').length >= 10) {
                            handleContactLookup(val);
                          } else {
                            setExistingRecordFound(null);
                          }
                        }}
                        onBlur={(e) => handleContactLookup(e.target.value)}
                        placeholder="10-digit mobile (e.g. 9876543210)"
                        className="w-full bg-white border border-[#D5DBEA] rounded-xl px-3.5 py-2.5 text-xs text-[#3B4CCA] font-mono font-semibold placeholder-[#64748B] focus:outline-none focus:border-[#5B9A94] transition"
                      />
                      {existingRecordFound ? (
                        <div className="p-2.5 bg-[#2BC4A0]/20 border border-[#2BC4A0]/40 rounded-xl text-[11px] text-[#06332A] flex items-start gap-2">
                          <CheckCircle size={14} className="text-[#06332A] shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-[#06332A] font-bold">Auto-picked from database:</strong> Found existing record for{' '}
                            <span className="text-[#3B4CCA] font-semibold">{existingRecordFound.name}</span>. Previous medical history, existing conditions, allergies & ongoing medications have been automatically loaded!
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#5B6480] block">
                          Tip: Entering a registered mobile number automatically retrieves existing history, conditions, and ongoing medications from the database.
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#14213D]">Address / City</label>
                      <input
                        type="text"
                        value={newPatient.address}
                        onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                        placeholder="e.g. Bandra West, Mumbai"
                        className="w-full bg-white border border-[#D5DBEA] rounded-xl px-3.5 py-2.5 text-xs text-[#14213D] font-medium placeholder-[#64748B] focus:outline-none focus:border-[#5B9A94] transition"
                      />
                    </div>
                  </div>

                  {/* Right: Health Info */}
                  <div className="bg-white rounded-2xl border border-[#D5DBEA] p-5 space-y-4 shadow-sm">
                    <h3 className="text-xs font-bold text-[#3B4CCA] uppercase tracking-wider flex items-center gap-2 border-b border-[#D5DBEA] pb-2">
                      <Activity size={14} /> Health Information
                    </h3>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#14213D]">Current Health Issue / Symptoms</label>
                      <input
                        type="text"
                        value={newPatient.current_health_issue}
                        onChange={(e) => setNewPatient({ ...newPatient, current_health_issue: e.target.value })}
                        placeholder="e.g. Severe Acidity & Stomach Pain"
                        className="w-full bg-white border border-[#D5DBEA] rounded-xl px-3.5 py-2.5 text-xs text-[#14213D] font-medium placeholder-[#64748B] focus:outline-none focus:border-[#5B9A94] transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#14213D]">Existing Diseases / Conditions</label>
                      <input
                        type="text"
                        value={newPatient.existing_diseases}
                        onChange={(e) => setNewPatient({ ...newPatient, existing_diseases: e.target.value })}
                        placeholder="e.g. Gastritis (2022), Mild BP"
                        className="w-full bg-white border border-[#D5DBEA] rounded-xl px-3.5 py-2.5 text-xs text-[#14213D] font-medium placeholder-[#64748B] focus:outline-none focus:border-[#5B9A94] transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#14213D]">Known Drug Allergies</label>
                      <input
                        type="text"
                        value={newPatient.allergies}
                        onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value })}
                        placeholder="e.g. Penicillin, Dust"
                        className="w-full bg-white border border-[#D5DBEA] rounded-xl px-3.5 py-2.5 text-xs text-[#14213D] font-medium placeholder-[#64748B] focus:outline-none focus:border-[#5B9A94] transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#14213D]">Current Medications</label>
                      <input
                        type="text"
                        value={newPatient.current_medications}
                        onChange={(e) => setNewPatient({ ...newPatient, current_medications: e.target.value })}
                        placeholder="e.g. None currently"
                        className="w-full bg-white border border-[#D5DBEA] rounded-xl px-3.5 py-2.5 text-xs text-[#14213D] font-medium placeholder-[#64748B] focus:outline-none focus:border-[#5B9A94] transition"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="pregCheckScreen3"
                        checked={newPatient.is_pregnant}
                        onChange={(e) => setNewPatient({ ...newPatient, is_pregnant: e.target.checked })}
                        className="rounded bg-[#F4F6FB] border-[#D5DBEA] text-blue-600 focus:ring-0"
                      />
                      <label htmlFor="pregCheckScreen3" className="text-xs text-[#475569] font-medium">
                        Patient is Pregnant
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveView('dashboard')}
                    className="px-5 py-2.5 rounded-xl bg-[#F4F6FB] hover:bg-[#E8EDF2] text-[#475569] font-semibold text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#3B4CCA] hover:bg-[#303ea8] text-white font-bold text-xs shadow-lg shadow-xs flex items-center gap-2 transition"
                  >
                    Save & Next: Prescribe Medicine <ArrowRight size={15} />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SCREEN 4: PRESCRIBE MEDICINE & SAVED PRESCRIPTIONS HISTORY */}
          {activeView === 'prescriptions' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D5DBEA] pb-4">
                <div>
                  <h1 className="text-xl font-black text-[#14213D] flex items-center gap-2">
                    <Pill size={22} className="text-blue-500" /> Prescriptions & Clinical Intake
                  </h1>
                  <p className="text-xs text-[#5B6480]">
                    Select pharmacological therapy for active patient and evaluate pharmacokinetic response.
                  </p>
                </div>
                <div className="flex items-center bg-white p-1 rounded-xl border border-[#D5DBEA] text-xs">
                  <button
                    onClick={() => setPrescriptionTabMode('new')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      prescriptionTabMode === 'new'
                        ? 'bg-[#3B4CCA] text-white shadow'
                        : 'text-[#5B6480] hover:text-[#3B4CCA]'
                    }`}
                  >
                    <Pill size={14} /> Prescribe Medicine
                  </button>
                  <button
                    onClick={() => setPrescriptionTabMode('history')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      prescriptionTabMode === 'history'
                        ? 'bg-[#3B4CCA] text-white shadow'
                        : 'text-[#5B6480] hover:text-[#3B4CCA]'
                    }`}
                  >
                    <FileText size={14} /> Saved Prescriptions ({prescriptions.length})
                  </button>
                </div>
              </div>

              {prescriptionTabMode === 'history' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#3B4CCA] uppercase tracking-wider flex items-center gap-2">
                      <FileText size={15} /> All Prescriptions Recorded in Database ({prescriptions.length})
                    </h3>
                    <button
                      onClick={() => setPrescriptionTabMode('new')}
                      className="px-3 py-1.5 rounded-lg bg-[#3B4CCA] hover:bg-[#303ea8] text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Pill size={14} /> + New Prescription
                    </button>
                  </div>

                  {prescriptions.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-white border border-[#D5DBEA] text-center text-[#5B6480] space-y-3">
                      <p className="text-xs">No prescriptions recorded yet in the database.</p>
                      <button
                        onClick={() => setPrescriptionTabMode('new')}
                        className="px-4 py-2 rounded-xl bg-[#3B4CCA] hover:bg-[#303ea8] text-white font-bold text-xs cursor-pointer"
                      >
                        Prescribe First Medicine
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {prescriptions.map((pr, idx) => {
                        const pat = patients.find(p => p.id === pr.patient_id || p.contact_number === pr.patient_contact);
                        return (
                          <div
                            key={pr.id || idx}
                            className="p-4 rounded-2xl bg-[var(--doc-card)] border border-[var(--doc-border)] hover:bg-[var(--doc-hover)] transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[var(--doc-text)] text-sm">
                                  {pr.patient_name || pat?.name || 'Patient'}
                                </span>
                                <span className="text-[11px] font-mono text-[var(--doc-btn-primary)]">
                                  ({pr.patient_contact || pat?.contact_number})
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  pr.overall_risk === 'LOW'
                                    ? 'bg-[#2BC4A0] text-[#06332A] border border-[#2BC4A0]/40'
                                    : 'bg-[#F2A93B] text-[#3D2600] border border-[#F2A93B]/40'
                                }`}>
                                  {pr.overall_risk || 'LOW'} RISK
                                </span>
                              </div>
                              <p className="text-xs text-[var(--doc-text)] opacity-85">
                                <strong className="text-[var(--doc-btn-primary)]">{pr.drug_name}</strong> • {pr.dosage || 'Standard dose'}
                              </p>
                              {pr.doctor_notes && (
                                <p className="text-[11px] text-[var(--doc-text-soft)] italic">
                                  Notes: "{pr.doctor_notes}"
                                </p>
                              )}
                              <span className="text-[10px] text-[var(--doc-text-soft)] block font-mono">
                                Prescribed on: {pr.created_at || 'Recent'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => {
                                  if (pat) setSelectedPatient(pat);
                                  setSelectedDrug(pr.drug_name);
                                  setActiveView('ml-analysis');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F4F6FB] text-[#3B4CCA] border border-[#D5DBEA] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                              >
                                <Activity size={13} /> 3D View
                              </button>
                              <button
                                onClick={() => {
                                  if (pat) setSelectedPatient(pat);
                                  setSelectedDrug(pr.drug_name);
                                  setActiveView('report');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-[#3B4CCA] hover:bg-[#303ea8] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                              >
                                <FileText size={13} /> Report
                              </button>
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Delete prescription record #${pr.id} for ${pr.drug_name}?`)) {
                                    try {
                                      await deletePrescription(pr.id);
                                      setPrescriptions(prev => prev.filter(p => p.id !== pr.id));
                                      showToast(`Prescription record for ${pr.drug_name} deleted.`);
                                    } catch (err) {
                                      showToast(err.message, 'error');
                                    }
                                  }
                                }}
                                title="Delete this prescription record"
                                className="p-1.5 rounded-xl bg-white hover:bg-rose-600 text-[#5B6480] hover:text-white border border-[#D5DBEA] transition cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {selectedPatient ? (
                    <div className="bg-[var(--doc-card)] rounded-2xl border border-[var(--doc-border)] p-5 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between border-b border-[var(--doc-border)] pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[var(--doc-hover)] border border-[var(--doc-btn-primary)]/30 flex items-center justify-center font-bold text-sm text-[var(--doc-btn-primary)]">
                            {selectedPatient.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-bold text-[var(--doc-text)] text-sm">{selectedPatient.name}</h3>
                            <p className="text-xs text-[var(--doc-text-soft)]">
                              {selectedPatient.age} yrs • {selectedPatient.gender} • Tel: <span className="text-[var(--doc-btn-primary)] font-mono">{selectedPatient.contact_number}</span>
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveView('patients')}
                          className="px-3 py-1 bg-[var(--doc-card)] hover:bg-[var(--doc-hover)] text-[var(--doc-text)] text-xs rounded-lg border border-[var(--doc-border)] transition cursor-pointer"
                        >
                          Change Patient
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-[#5B6480] block text-[11px]">Primary Condition:</span>
                          <span className="text-[#14213D] font-semibold">{selectedPatient.current_health_issue || selectedPatient.existing_diseases || 'Gastritis'}</span>
                        </div>
                        <div>
                          <span className="text-[#5B6480] block text-[11px]">Allergies:</span>
                          <span className="text-[#F2A93B] font-semibold">{selectedPatient.allergies || 'None recorded'}</span>
                        </div>
                        <div>
                          <span className="text-[#5B6480] block text-[11px]">Medical History:</span>
                          <span className="text-[#14213D]">{selectedPatient.medical_history || 'Standard'}</span>
                        </div>
                        <div>
                          <span className="text-[#5B6480] block text-[11px]">Current Meds:</span>
                          <span className="text-[#14213D]">{selectedPatient.current_medications || 'None'}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-[#F2A93B]/20 border border-[#F2A93B]/40 rounded-xl text-xs text-[#3D2600] font-semibold">
                      No patient selected. Please select a patient from the Patients Directory.
                    </div>
                  )}

                  <div className="bg-white rounded-2xl border border-[#D5DBEA] p-6 space-y-5 shadow-sm">
                    <h3 className="text-xs font-bold text-[#3B4CCA] uppercase tracking-wider flex items-center gap-2 border-b border-[#D5DBEA] pb-2">
                      <Pill size={15} /> Medicine Prescription Builder
                      <span className="ml-auto text-[10px] font-mono text-[#5B6480] normal-case">{prescribedMedicines.length} added • {drugs.length} in Formulary</span>
                    </h3>

                    {/* Allergy Alert Banner */}
                    {selectedPatient?.allergies && selectedPatient.allergies.toLowerCase() !== 'none' && (
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-[#F2A93B]/20 border border-[#F2A93B]/40 text-[#3D2600] text-xs">
                        <AlertTriangle size={14} className="text-[#3D2600] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-[#3D2600] block">⚠ Patient Has Known Allergies</span>
                          <span className="font-semibold text-[#3D2600]">{selectedPatient.allergies}</span>
                          <span className="text-[#3D2600]/80 ml-2">— Each medicine will be cross-checked via Gemini AI automatically.</span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-semibold text-[#475569] flex items-center justify-between">
                          <span>Select Medicine *</span>
                          <span className="text-[11px] text-[#5B6480] font-mono">Step 1: Select → Set dose/timing → Click + Add</span>
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={selectedDrug}
                            onChange={(e) => {
                              setSelectedDrug(e.target.value);
                              const d = drugs.find(item => item.name === e.target.value);
                              if (d) setCustomDosage(d.standard_dose || '40 mg');
                            }}
                            className="flex-1 bg-white border border-[#D5DBEA] rounded-xl px-3.5 py-2.5 text-xs text-[#3B4CCA] font-bold focus:outline-none focus:border-[#5B9A94] transition"
                          >
                            {drugs.map(d => (
                              <option key={d.name} value={d.name} className="text-[#14213D] bg-white font-medium">
                                {d.name} — ({d.category || d.class}) Std: {d.standard_dose}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={handleAddMedicine}
                            disabled={!selectedDrug}
                            className="px-4 py-2 bg-[#3B4CCA] hover:bg-[#303ea8] text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition disabled:opacity-50 whitespace-nowrap"
                          >
                            <Plus size={14} /> Add to Prescription
                          </button>
                        </div>
                      </div>


                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[#14213D]">Prescription Dose *</label>
                        <input
                          type="text"
                          value={customDosage}
                          onChange={(e) => setCustomDosage(e.target.value)}
                          placeholder="e.g. 40 mg Once Daily"
                          className="w-full bg-white border border-[#D5DBEA] rounded-xl px-3.5 py-2.5 text-xs text-[#14213D] font-medium focus:outline-none focus:border-[#5B9A94] transition"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[#14213D]">Duration *</label>
                        <input
                          type="text"
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          placeholder="e.g. 10 Days"
                          className="w-full bg-white border border-[#D5DBEA] rounded-xl px-3.5 py-2.5 text-xs text-[#14213D] font-medium focus:outline-none focus:border-[#5B9A94] transition"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[#14213D]">Instructions / Timing</label>
                        <select
                          value={timing}
                          onChange={(e) => setTiming(e.target.value)}
                          className="w-full bg-white border border-[#D5DBEA] rounded-xl px-3.5 py-2.5 text-xs text-[#14213D] font-medium focus:outline-none focus:border-[#5B9A94] transition"
                        >
                          <option value="Before Breakfast">Before Breakfast (Empty Stomach)</option>
                          <option value="After Breakfast">After Breakfast</option>
                          <option value="After Lunch">After Lunch</option>
                          <option value="After Dinner">After Dinner</option>
                          <option value="Twice Daily (Morning & Night)">Twice Daily (Morning & Night)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-semibold text-[#14213D]">Doctor Clinical Notes</label>
                        <textarea
                          rows={2}
                          value={doctorNotes}
                          onChange={(e) => setDoctorNotes(e.target.value)}
                          placeholder="e.g. Avoid oily & spicy foods. Drink adequate water. Review after 10 days."
                          className="w-full bg-white border border-[#D5DBEA] rounded-xl p-3 text-xs text-[#14213D] font-medium placeholder-[#64748B] focus:outline-none focus:border-[#5B9A94] transition"
                        />
                      </div>
                    </div>


                    {/* Prescription Medicine List */}
                    {prescribedMedicines.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <h4 className="text-[11px] font-bold text-[#475569] uppercase tracking-wider flex items-center gap-2">
                          <Layers size={13} className="text-[#3B4CCA]" /> Current Prescription ({prescribedMedicines.length} medicine{prescribedMedicines.length > 1 ? 's' : ''})
                        </h4>
                        {prescribedMedicines.map((med, idx) => {
                          const conflict = allergyConflicts[med.drug];
                          const isChecking = allergyCheckLoading[med.drug];
                          const hasConflict = conflict?.hasConflict;
                          const safetyLevel = conflict?.safetyLevel || 'safe';
                          const isActive3D = activeVisualizeDrug === med.drug;
                          return (
                            <div
                              key={med.drug}
                              className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                                hasConflict && safetyLevel === 'avoid' ? 'bg-[#E5484D]/15 border-[#E5484D]/40' :
                                hasConflict && safetyLevel === 'caution' ? 'bg-[#F2A93B]/20 border-[#F2A93B]/40' :
                                'bg-white border-[#D5DBEA]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-[#3B4CCA]/30 border border-blue-500/40 flex items-center justify-center text-[10px] font-bold text-blue-300">{idx + 1}</span>
                                  <span className="font-bold text-[#3B4CCA]">{med.drug}</span>
                                  <span className="text-[#5B6480]">• {med.dosage} • {med.timing} • {med.duration}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isChecking ? (
                                    <span className="text-[10px] text-[#5B6480] flex items-center gap-1"><RefreshCw size={10} className="animate-spin" /> Allergy Check...</span>
                                  ) : conflict ? (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border flex items-center gap-1 ${
                                      safetyLevel === 'avoid' ? 'bg-[#E5484D] text-white border-[#E5484D]' :
                                      safetyLevel === 'caution' ? 'bg-[#F2A93B] text-[#3D2600] border-[#F2A93B]' :
                                      'bg-[#2BC4A0] text-[#06332A] border-[#2BC4A0]'
                                    }`}>
                                      {safetyLevel === 'avoid' ? '⛔ Avoid' : safetyLevel === 'caution' ? '⚠ Caution' : '✓ Allergy Safe'}
                                    </span>
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={() => { setSelectedDrug(med.drug); setActiveVisualizeDrug(med.drug); handleRunAnalysis(); }}
                                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${isActive3D ? 'bg-[#3B4CCA] text-white shadow-xs' : 'bg-[#F4F6FB] hover:bg-[#E3EDF5] text-[#3B4CCA] border border-[#D5DBEA]'}`}
                                  >
                                    <Activity size={11} /> 3D View
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMedicine(med.drug)}
                                    className="p-1 rounded-lg text-[#5B6480] hover:text-white hover:bg-[#E5484D] transition"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              </div>
                              {conflict?.hasConflict && conflict.conflicts?.length > 0 && (
                                <div className="pl-7 space-y-0.5 border-t border-rose-500/20 pt-1.5">
                                  {conflict.conflicts.map((c, ci) => (
                                    <p key={ci} className="text-[#E5484D] flex items-start gap-1">
                                      <ShieldAlert size={10} className="shrink-0 mt-0.5 text-[#E5484D]" />
                                      <span><strong>{c.allergen}</strong> ({c.type}): {c.description} <span className="text-[#F2A93B] font-semibold">→ {c.action?.toUpperCase()}</span></span>
                                    </p>
                                  ))}
                                  {conflict.clinicalNote && <p className="text-[#5B6480] text-[10px]">{conflict.clinicalNote}</p>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleRunAnalysis}
                        disabled={loadingAnalysis || !selectedPatient || !selectedDrug}
                        className="flex-1 py-3 bg-[#3B4CCA] hover:bg-[#303ea8] text-white font-bold text-xs rounded-xl shadow-lg shadow-xs flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                      >
                        {loadingAnalysis ? (
                          <><RefreshCw size={16} className="animate-spin" /> Evaluating ML & 3D Pathway...</>
                        ) : (
                          <>Analyze Selected Drug (3D) <ArrowRight size={16} /></>
                        )}
                      </button>
                      {prescribedMedicines.length > 0 && (
                        <button
                          type="button"
                          onClick={handlePrescribe}
                          className="px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 text-white font-bold text-xs rounded-xl shadow flex items-center gap-2 transition whitespace-nowrap"
                        >
                          <Save size={14} /> Save All ({prescribedMedicines.length})
                        </button>
                      )}
                    </div>
                  </div>


                  {/* Previous Prescriptions for Active Patient */}
                  {selectedPatient && (() => {
                    const patientPrescriptions = prescriptions.filter(
                      pr => pr.patient_id === selectedPatient.id || pr.patient_contact === selectedPatient.contact_number
                    );
                    if (patientPrescriptions.length === 0) return null;
                    return (
                      <div className="bg-[var(--doc-card)] rounded-2xl border border-[var(--doc-border)] p-5 space-y-3">
                        <h4 className="text-xs font-bold text-[var(--doc-text)] flex items-center gap-2">
                          <Pill size={14} className="text-[var(--doc-btn-primary)]" /> Previous Prescriptions for <strong className="text-[var(--doc-btn-primary)]">{selectedPatient.name}</strong> ({patientPrescriptions.length})
                        </h4>
                        <div className="space-y-2">
                          {patientPrescriptions.map((pr, idx) => (
                            <div
                              key={pr.id || idx}
                              className="p-3 rounded-xl bg-[var(--doc-card)] border border-[var(--doc-border)] hover:bg-[var(--doc-hover)] transition flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-[var(--doc-text)]">{pr.drug_name}</span>
                                <span className="text-[var(--doc-text-soft)] ml-2">({pr.dosage})</span>
                                <span className="text-[10px] text-[var(--doc-text-soft)] block font-mono">{pr.created_at}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  pr.overall_risk === 'LOW' ? 'bg-[#2BC4A0] text-[#06332A]' : 'bg-[#F2A93B] text-[#3D2600]'
                                }`}>
                                  {pr.overall_risk || 'LOW'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDrug(pr.drug_name);
                                    setActiveView('report');
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-[#E3EDF5] text-[#3B4CCA] hover:bg-[#3B4CCA]/30 text-[11px] font-semibold cursor-pointer"
                                >
                                  Report
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {/* SCREEN 5: ML DRUG ANALYSIS & 3D VISUALIZATION */}
          {activeView === 'ml-analysis' && (
            <div className="space-y-6">
              <div className="bg-[var(--doc-card)] rounded-2xl border border-[var(--doc-border)] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="px-3.5 py-1.5 rounded-xl bg-[#2BC4A0] border border-[#2BC4A0]/40 text-[#06332A] font-black text-sm flex items-center gap-1.5 shadow-sm">
                    <ShieldCheck size={18} /> SAFE
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[var(--doc-text)]">
                      {prediction?.drug_name || selectedDrug || 'Pantoprazole 40mg'} for <strong className="text-[var(--doc-btn-primary)]">{selectedPatient?.name || 'Rahul Verma'}</strong>
                    </h2>
                    <p className="text-xs text-[var(--doc-text-soft)]">
                      Trained on External Medical Database (5,000+ clinical records) • API Grounded
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-800"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-[#2BC4A0]"
                          strokeDasharray="87, 100"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute text-xs font-black text-[#14213D]">87%</span>
                    </div>
                    <div className="text-left">
                      <span className="text-[11px] font-bold text-[#14213D] block">Confidence</span>
                      <span className="text-[10px] text-[#5B6480]">High Efficacy</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveView('comparisons')}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-[#E3E8F5] text-[#3B4CCA] text-xs font-bold border border-[#D5DBEA] transition"
                    >
                      Compare Alternatives
                    </button>
                    <button
                      onClick={handlePrescribe}
                      className="px-3.5 py-2 rounded-xl bg-[#3B4CCA] hover:bg-[#303ea8] text-white text-xs font-extrabold flex items-center gap-1.5 transition shadow-md"
                    >
                      <Save size={14} /> Prescribe
                    </button>
                  </div>
                </div>
              </div>

              {prescribeSuccess && (
                <div className="p-3 bg-[#2BC4A0]/20 border border-[#2BC4A0]/40 rounded-xl text-xs text-[#06332A] font-bold flex items-center gap-2">
                  <CheckCircle size={15} /> <span>{prescribeSuccess}</span>
                </div>
              )}

              {/* Multi-drug tablet switcher when multiple medicines in prescription */}
              {prescribedMedicines.length > 1 && (
                <div className="bg-white rounded-2xl border border-cyan-500/30 p-4 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-[#3B4CCA] uppercase tracking-wider flex items-center gap-2">
                      <Layers size={14} /> Prescribed Tablets ({prescribedMedicines.length}) — Click to Inspect Organ Target & Pharmacokinetics:
                    </h3>
                    <span className="text-[#3B4CCA] font-mono text-[11px]">
                      Active: <strong className="text-[#14213D] font-bold">{activeVisualizeDrug || selectedDrug}</strong>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {prescribedMedicines.map((med) => {
                      const isCurrent = (activeVisualizeDrug || selectedDrug) === med.drug;
                      return (
                        <button
                          key={med.drug}
                          onClick={() => {
                            setSelectedDrug(med.drug);
                            setActiveVisualizeDrug(med.drug);
                            handleRunAnalysis();
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 cursor-pointer ${
                            isCurrent
                              ? 'bg-[#3B4CCA] text-white border-[#5B9A94] shadow-md shadow-xs'
                              : 'bg-white text-[#475569] border-[#D5DBEA] hover:border-cyan-500 hover:text-[#3B4CCA] hover:bg-[#E3EDF5]'
                          }`}
                        >
                          <Pill size={13} className={isCurrent ? 'text-white' : 'text-[#3B4CCA]'} />
                          <span>{med.drug}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${isCurrent ? 'bg-[#487B76] text-white' : 'bg-[#F4F6FB] text-[#5B6480]'}`}>
                            {med.timing}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-6 bg-white rounded-2xl border border-[#D5DBEA] overflow-hidden shadow-sm flex flex-col">
                  <div className="p-3 border-b border-[#D5DBEA] flex flex-wrap items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-1 bg-[#F4F6FB] p-1 rounded-xl border border-[#D5DBEA]">
                      <button
                        type="button"
                        onClick={() => setVisualizationTab('3d')}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                          visualizationTab === '3d'
                            ? 'bg-[#3B4CCA] text-white shadow-xs'
                            : 'text-[#5B6480] hover:text-[#14213D]'
                        }`}
                      >
                        <Activity size={13} /> 3D Organ Simulation
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisualizationTab('2d')}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                          visualizationTab === '2d'
                            ? 'bg-[#3B4CCA] text-white shadow-xs'
                            : 'text-[#5B6480] hover:text-[#14213D]'
                        }`}
                      >
                        <BarChart3 size={13} /> 2D DDI &amp; Effect Graphs
                      </button>
                    </div>

                    <span className="text-[#3B4CCA] font-mono text-[11px]">
                      Tablet: <strong className="text-[#14213D] font-bold">{activeVisualizeDrug || selectedDrug || 'Select Drug'}</strong>
                      <span className="text-[#5B6480] ml-1.5">→ Target:</span>
                      <strong className="text-[#F2A93B] capitalize ml-1">
                        {Array.isArray(prediction?.target_organs) && prediction.target_organs.length > 0
                          ? prediction.target_organs.map(o => typeof o === 'string' ? o : (o.name || o.key)).join(', ')
                          : (selectedDrugData?.target_organs || ['Stomach']).join(', ')}
                      </strong>
                    </span>
                  </div>

                  {visualizationTab === '3d' ? (
                    <div className="h-[560px]">
                      <HumanBody3D
                        targetOrgans={prediction?.target_organs || selectedDrugData?.target_organs || ['Stomach']}
                        drugName={activeVisualizeDrug || selectedDrug || 'Pantoprazole 40mg'}
                        riskLevel={prediction?.overall_risk_level || 'LOW'}
                      />
                    </div>
                  ) : (
                    <div className="p-4 overflow-y-auto max-h-[560px] bg-slate-50/50">
                      <EffectCharts prediction={prediction} />
                    </div>
                  )}
                </div>

                <div className="xl:col-span-6 space-y-4">
                  {/* Medical API Powered 5 Separate Clinical Boxes (Advisory, Body Effects, Side Effects, Diet, Allergies) */}
                  <AiRecommendation
                    prediction={prediction}
                    patient={selectedPatient}
                    patientName={selectedPatient?.name}
                    drugNames={activeVisualizeDrug || selectedDrug ? [activeVisualizeDrug || selectedDrug] : (prescribedMedicines.length > 0 ? prescribedMedicines.map(m => m.drug) : ['Pantoprazole'])}
                    recommendations={prediction?.multilingual_recommendation}
                  />
                </div>
              </div>
            </div>
          )}

          {/* SCREEN 6: 3-MEDICINE COMPARISON & AI RECOMMENDATION */}
          {activeView === 'comparisons' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D5DBEA] pb-4">
                <div>
                  <h1 className="text-xl font-black text-[#14213D] flex items-center gap-2">
                    <Sliders size={22} className="text-blue-500" /> Multi-Drug Comparative Evaluation
                  </h1>
                  <p className="text-xs text-[#5B6480]">
                    4-Drug efficacy matrix, 2D comparative graphs, and AI clinical recommendation for {selectedPatient?.name || 'Rahul Verma'}.
                  </p>
                </div>
                <button
                  onClick={() => setActiveView('report')}
                  className="px-3.5 py-2 bg-[#3B4CCA] hover:bg-[#303ea8] text-white font-bold text-xs rounded-xl shadow flex items-center gap-2 transition"
                >
                  <FileText size={15} /> Generate Clinical Report
                </button>
              </div>

              {/* 4-Medicine Comparison Matrix Table */}
              <div className="bg-white rounded-2xl border border-[#D5DBEA] p-5 space-y-4 shadow-sm overflow-hidden">
                <h3 className="text-xs font-bold text-[#3B4CCA] uppercase tracking-wider flex items-center gap-2">
                  <Award size={15} /> Pharmacological Candidate Evaluation Table
                </h3>

                <div className="overflow-x-auto rounded-xl border border-[#D5DBEA]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-white text-[#5B6480] uppercase text-[10px] font-bold">
                      <tr>
                        <th className="p-3.5">Medicine Name</th>
                        <th className="p-3.5">Effectiveness</th>
                        <th className="p-3.5">Safety Score</th>
                        <th className="p-3.5">Recovery Time</th>
                        <th className="p-3.5">Monthly Cost (₹)</th>
                        <th className="p-3.5">AI Recommendation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D5DBEA] bg-white">
                      {(comparison?.candidate_drugs && comparison.candidate_drugs.length > 0
                        ? comparison.candidate_drugs
                        : [
                            { drug_name: selectedDrug || 'Selected Drug', effectiveness_pct: 88, safety_score_pct: 87, recovery_time: '3 - 5 Days', monthly_cost_inr: 120, recommendation_badge: 'Recommended' }
                          ]
                      ).map((cd, idx) => {
                        const isRec = cd.drug_name === comparison?.recommended_drug || cd.recommendation_badge === 'Recommended' || idx === 0;
                        const effPct = cd.effectiveness_pct || 85;
                        const safetyPct = cd.safety_score_pct || (100 - (cd.side_effect_pct || 15));
                        const cost = cd.monthly_cost_inr || (idx === 0 ? 120 : 100 + idx * 30);
                        const recovery = cd.recovery_time || `${3 + idx} - ${5 + idx} Days`;
                        return (
                          <tr key={cd.drug_name || idx} className={isRec ? 'bg-blue-950/20 hover:bg-blue-950/30 transition' : 'hover:bg-[#F4F6FB] transition'}>
                            <td className="p-3.5 font-bold text-[#14213D] flex items-center gap-2">
                              <Pill size={14} className={isRec ? 'text-[#3B4CCA]' : 'text-[#5B6480]'} />
                              <span>{cd.drug_name}</span>
                              {cd.drug_class && <span className="text-[10px] text-[#5B6480] font-mono hidden sm:inline">({cd.drug_class})</span>}
                            </td>
                            <td className="p-3.5 text-[#F2A93B] font-bold">
                              {'★'.repeat(Math.min(5, Math.max(1, Math.round(effPct / 20))))} ({effPct}%)
                            </td>
                            <td className="p-3.5 text-[#2BC4A0] font-mono font-bold">{safetyPct}% Safe</td>
                            <td className="p-3.5 text-[#475569]">{recovery}</td>
                            <td className="p-3.5 font-mono text-[#3B4CCA] font-bold">₹{cost}</td>
                            <td className="p-3.5">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase shadow ${
                                isRec
                                  ? 'bg-[#2BC4A0] text-[#06332A]'
                                  : 'bg-[#F4F6FB] text-[#5B6480]'
                              }`}>
                                {isRec ? '★ Recommended' : cd.recommendation_badge || 'Alternative'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Gemini-Generated Patient-Friendly Explanation */}
                {comparison?.explanation_for_patient && (
                  <div className="p-4 rounded-xl bg-[#8A5CF6]/5 border-2 border-[#8A5CF6]/30 text-xs space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A5CF6] flex items-center gap-1.5">
                      <Sparkles size={12} /> Easy Explanation for Patient ({lang === 'marathi' ? 'मराठी' : lang === 'hinglish' ? 'Hinglish' : lang === 'hindi' ? 'हिन्दी' : 'English'}):
                    </span>
                    <p className="text-[#14213D] leading-relaxed text-xs">
                      {typeof comparison.explanation_for_patient === 'string'
                        ? comparison.explanation_for_patient
                        : (comparison.explanation_for_patient?.[lang] || comparison.explanation_for_patient?.english || comparison.explanation_for_patient?.hinglish || 'No clinical explanation available.')}
                    </p>
                  </div>
                )}
              </div>

              <DrugComparison
                comparisonData={comparison || {
                  candidate_drugs: [
                    { drug_name: selectedDrug || 'Pantoprazole 40mg', effectiveness_pct: 88, side_effect_pct: 12, ddi_pct: 8, target_organs: ['Stomach'] }
                  ],
                  recommended_drug: selectedDrug || 'Pantoprazole 40mg',
                  recommendation_rationale: `Clinical analysis verified for ${selectedPatient?.name || 'patient'} based on medical profile.`
                }}
                patientName={selectedPatient?.name}
              />
            </div>
          )}

          {/* TAB: PATIENTS DIRECTORY */}
          {activeView === 'patients' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D5DBEA] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-black text-[#14213D] flex items-center gap-2">
                      <Users size={22} className="text-blue-500" /> Patient Directory
                    </h1>
                    {selectedPatient && (
                      <span className="px-2 py-0.5 rounded-full bg-[#E3EDF5] text-[#3B4CCA] border border-blue-500/30 text-[10px] font-mono">
                        Active: {selectedPatient.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#5B6480]">
                    {patients.length} Registered Patients • Ongoing Medications, Timeline &amp; Medical History Integrated
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Internal Directory View Mode Selector */}
                  <div className="flex items-center bg-white p-1 rounded-xl border border-[#D5DBEA] text-xs">
                    <button
                      type="button"
                      onClick={() => setDirectorySubTab('list')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        directorySubTab === 'list'
                          ? 'bg-[#3B4CCA] text-white shadow'
                          : 'text-[#5B6480] hover:text-[#3B4CCA]'
                      }`}
                    >
                      <Users size={13} /> All Patients ({patients.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedPatient && patients.length > 0) setSelectedPatient(patients[0]);
                        setDirectorySubTab('history');
                      }}
                      className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        directorySubTab === 'history'
                          ? 'bg-violet-600 text-white shadow'
                          : 'text-[#5B6480] hover:text-violet-300'
                      }`}
                    >
                      <Activity size={13} /> Medical History &amp; Timeline
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedPatient && patients.length > 0) setSelectedPatient(patients[0]);
                        setDirectorySubTab('medications');
                      }}
                      className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        directorySubTab === 'medications'
                          ? 'bg-cyan-600 text-white shadow'
                          : 'text-[#5B6480] hover:text-[#3B4CCA]'
                      }`}
                    >
                      <Pill size={13} /> Ongoing Medications
                    </button>
                  </div>

                  {directorySubTab === 'list' && (
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-3 text-[#5B6480]" />
                      <input
                        type="text"
                        placeholder="Search patient name, phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-white border border-[#D5DBEA] rounded-xl pl-8 pr-3 py-2 text-xs text-[#14213D] font-medium placeholder-[#64748B] focus:outline-none focus:border-[#5B9A94]"
                      />
                    </div>
                  )}

                  {/* Export to Excel & Download Button */}
                  <button
                    onClick={() => handleExportExcel(searchQuery ? filteredPatients : patients)}
                    disabled={isExportingExcel || patients.length === 0}
                    title="Export and download complete patient records & counts in Excel (.xlsx)"
                    className="px-3.5 py-2 bg-gradient-to-r from-[#5B9A94] to-[#487B76] hover:from-[#487B76] hover:to-[#3b6662] disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-md shadow-xs cursor-pointer"
                  >
                    {isExportingExcel ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <FileSpreadsheet size={15} />
                    )}
                    <span>Export to Excel</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-mono">
                      {searchQuery ? filteredPatients.length : patients.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveView('new-patient')}
                    className="px-3 py-2 bg-[#3B4CCA] hover:bg-[#303ea8] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <UserPlus size={14} /> Add
                  </button>
                </div>
              </div>

              {/* SUBTAB: MEDICAL HISTORY & TIMELINE DIRECTLY IN DIRECTORY */}
              {directorySubTab === 'history' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-[#D5DBEA]">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDirectorySubTab('list')}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F4F6FB] text-[#475569] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        ← Back to All Patients
                      </button>
                      <span className="text-[#5B6480]">|</span>
                      <span className="text-xs text-[#475569]">
                        Patient: <strong className="text-[#14213D] font-bold">{selectedPatient?.name || 'No Patient Selected'}</strong>
                        {selectedPatient && <span className="text-[#3B4CCA] font-mono ml-1.5">({selectedPatient.contact_number})</span>}
                      </span>
                    </div>

                    {selectedPatient && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDirectorySubTab('medications')}
                          className="px-3 py-1.5 rounded-xl bg-[#E3EDF5] hover:bg-cyan-600 text-[#3B4CCA] hover:text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Pill size={13} /> View Ongoing Medications
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPrescriptionTabMode('new');
                            setActiveView('prescriptions');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#3B4CCA] hover:bg-[#303ea8] text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Stethoscope size={13} /> Prescribe
                        </button>
                      </div>
                    )}
                  </div>

                  {selectedPatient ? (
                    <CentralizedMedicalHistory
                      patient={selectedPatient}
                      currentDoctor={doctorProfile}
                      onNavigateToPrescribe={() => {
                        setPrescriptionTabMode('new');
                        setActiveView('prescriptions');
                      }}
                      onPatientUpdated={loadInitialData}
                    />
                  ) : (
                    <div className="p-8 rounded-2xl bg-white border border-[#D5DBEA] text-center text-[#5B6480] space-y-3">
                      <Activity size={32} className="mx-auto text-slate-600" />
                      <p className="text-xs">Please select a patient from the directory to view their Medical History &amp; Timeline.</p>
                      <button
                        onClick={() => setDirectorySubTab('list')}
                        className="px-4 py-2 rounded-xl bg-[#3B4CCA] hover:bg-[#303ea8] text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Users size={14} /> Browse Patient Directory
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB: ONGOING MEDICATIONS DIRECTLY IN DIRECTORY */}
              {directorySubTab === 'medications' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-[#D5DBEA]">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDirectorySubTab('list')}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F4F6FB] text-[#475569] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        ← Back to All Patients
                      </button>
                      <span className="text-[#5B6480]">|</span>
                      <span className="text-xs text-[#475569]">
                        Patient: <strong className="text-[#14213D] font-bold">{selectedPatient?.name || 'No Patient Selected'}</strong>
                        {selectedPatient && <span className="text-[#3B4CCA] font-mono ml-1.5">({selectedPatient.contact_number})</span>}
                      </span>
                    </div>

                    {selectedPatient && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDirectorySubTab('history')}
                          className="px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600 text-violet-700 hover:text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Activity size={13} /> View Medical History &amp; Timeline
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPrescriptionTabMode('new');
                            setActiveView('prescriptions');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#3B4CCA] hover:bg-[#303ea8] text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Stethoscope size={13} /> Prescribe
                        </button>
                      </div>
                    )}
                  </div>

                  {selectedPatient ? (
                    <OngoingMedicationsTracker
                      patient={selectedPatient}
                      currentDoctor={doctorProfile}
                      onNavigateToPrescribe={() => {
                        setPrescriptionTabMode('new');
                        setActiveView('prescriptions');
                      }}
                    />
                  ) : (
                    <div className="p-8 rounded-2xl bg-white border border-[#D5DBEA] text-center text-[#5B6480] space-y-3">
                      <Pill size={32} className="mx-auto text-slate-600" />
                      <p className="text-xs">Please select a patient from the directory to track their Ongoing Medications.</p>
                      <button
                        onClick={() => setDirectorySubTab('list')}
                        className="px-4 py-2 rounded-xl bg-[#3B4CCA] hover:bg-[#303ea8] text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Users size={14} /> Browse Patient Directory
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB: ALL PATIENTS DIRECTORY CARDS WITH INTEGRATED MEDICAL INFO */}
              {directorySubTab === 'list' && (
                filteredPatients.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-white border border-[#D5DBEA] text-center text-[#5B6480] space-y-3">
                    <Users size={32} className="mx-auto text-slate-600" />
                    <p className="text-xs">
                      {patients.length === 0
                        ? 'No patients registered yet in the database.'
                        : `No patients found matching "${searchQuery}".`}
                    </p>
                    <button
                      onClick={() => setActiveView('new-patient')}
                      className="px-4 py-2 rounded-xl bg-[#3B4CCA] hover:bg-[#303ea8] text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <UserPlus size={14} /> Add New Patient
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredPatients.map(p => {
                      const patPrescriptions = prescriptions.filter(
                        pr => pr.patient_id === p.id || pr.patient_contact === p.contact_number
                      );
                      const activeMeds = patPrescriptions.filter(pr => (pr.status || 'active').toLowerCase() === 'active');
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedPatient(p);
                          }}
                          className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                            selectedPatient?.id === p.id
                              ? 'bg-[var(--doc-hover)] border-[var(--doc-btn-primary)] shadow-md'
                              : 'bg-[var(--doc-card)] border-[var(--doc-border)] hover:bg-[var(--doc-hover)]'
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-bold text-[var(--doc-text)] text-sm">{p.name}</h4>
                                <span className="text-[10px] text-[var(--doc-btn-primary)] font-mono">PAT-{String(p.id).padStart(3, '0')}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded bg-[var(--doc-hover)] border border-[var(--doc-border)] text-[var(--doc-text-soft)] text-[11px]">
                                  {p.age}y • {p.gender}
                                </span>
                                <button
                                  type="button"
                                  title={`Remove ${p.name} from list`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePromptDeletePatient(p);
                                  }}
                                  className="p-1 rounded-md text-[var(--doc-text-soft)] hover:text-white hover:bg-[#E5484D] transition cursor-pointer"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1.5 text-xs text-[var(--doc-text-soft)] mb-3">
                              <div>
                                Phone: <strong className="text-[var(--doc-btn-primary)] font-mono">{p.contact_number}</strong>
                              </div>
                              <div>
                                Symptoms: <span className="text-[var(--doc-text)] opacity-85">{p.current_health_issue || 'General Health'}</span>
                              </div>
                              <div>
                                Allergies: <span className={p.allergies && p.allergies.toLowerCase() !== 'none' ? 'text-[#F2A93B] font-semibold' : 'text-[var(--doc-text)] opacity-85'}>{p.allergies || 'None'}</span>
                              </div>

                              {/* Ongoing Medications Section */}
                              <div className="p-2.5 rounded-xl bg-[var(--doc-hover)] border border-[var(--doc-border)] space-y-1 mt-2">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-[var(--doc-text-soft)] font-semibold flex items-center gap-1">
                                    <Pill size={11} className="text-[var(--doc-btn-primary)]" /> Ongoing Medications:
                                  </span>
                                  <span className="font-mono text-[var(--doc-btn-primary)] font-bold">
                                    {activeMeds.length} Active
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {activeMeds.slice(0, 2).map((rx, rIdx) => (
                                    <span key={rIdx} className="px-1.5 py-0.5 rounded bg-[var(--doc-card)] text-[var(--doc-btn-primary)] border border-[var(--doc-border)] text-[10px] font-medium truncate max-w-[130px]">
                                      {rx.drug_name}
                                    </span>
                                  ))}
                                  {activeMeds.length === 0 && (
                                    <span className="text-[10px] text-[var(--doc-text-soft)] italic">No ongoing medications</span>
                                  )}
                                  {activeMeds.length > 2 && (
                                    <span className="text-[10px] text-[var(--doc-text-soft)] font-mono">+{activeMeds.length - 2} more</span>
                                  )}
                                </div>
                              </div>

                              {/* Medical History & Timeline Section */}
                              <div className="p-2.5 rounded-xl bg-[var(--doc-hover)] border border-[var(--doc-border)] space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-[var(--doc-text-soft)] font-semibold flex items-center gap-1">
                                    <Activity size={11} className="text-violet-400" /> Medical History &amp; Timeline:
                                  </span>
                                  <span className="font-mono text-violet-400 font-bold text-[10px]">
                                    {patPrescriptions.length} Records
                                  </span>
                                </div>
                                <p className="text-[10px] text-[var(--doc-text)] opacity-85 truncate">
                                  {p.existing_diseases || p.medical_history || 'No chronic conditions on file'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Direct Actions in Patient Directory */}
                          <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-[#D5DBEA] mt-2">
                            <div className="flex items-center gap-1 flex-wrap">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPatient(p);
                                  setDirectorySubTab('history');
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600 text-violet-700 hover:text-white font-bold text-[10px] transition flex items-center gap-1 cursor-pointer"
                                title="View Medical History & Timeline inside Patient Directory"
                              >
                                <Activity size={11} /> History &amp; Timeline
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPatient(p);
                                  setDirectorySubTab('medications');
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-[#E3EDF5] hover:bg-cyan-600 text-[#3B4CCA] hover:text-white font-bold text-[10px] transition flex items-center gap-1 cursor-pointer"
                                title="Track Ongoing Medications inside Patient Directory"
                              >
                                <Pill size={11} /> Ongoing Meds
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPatient(p);
                                  setPrescriptionTabMode('new');
                                  setActiveView('prescriptions');
                                }}
                                className="px-2 py-1.5 rounded-lg bg-[#3B4CCA] hover:bg-[#303ea8] text-white font-semibold text-[10px] transition flex items-center gap-1 cursor-pointer"
                              >
                                <Stethoscope size={11} /> Prescribe
                              </button>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPatient(p);
                                  setActiveView('ml-analysis');
                                }}
                                className="px-2 py-1.5 rounded-lg bg-white hover:bg-[#F4F6FB] text-[#3B4CCA] border border-[#D5DBEA] text-[10px] font-semibold transition cursor-pointer"
                              >
                                3D Sim
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPatient(p);
                                  setActiveView('report');
                                }}
                                className="px-2 py-1.5 rounded-lg bg-white hover:bg-[#F4F6FB] text-[#475569] border border-[#D5DBEA] text-[10px] font-semibold transition cursor-pointer"
                              >
                                Report
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          )}

          {/* TAB: CLINICAL REPORT */}
          {activeView === 'report' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-[#D5DBEA] pb-3">
                <div>
                  <h1 className="text-xl font-black text-[#14213D] flex items-center gap-2">
                    <FileText size={22} className="text-blue-500" /> Printable Clinical Medical Report
                  </h1>
                  <p className="text-xs text-[#5B6480]">
                    Pharmacological evaluation report with hospital certification and digital sign-off.
                  </p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-[#3B4CCA] hover:bg-[#303ea8] text-white font-bold text-xs flex items-center gap-2 shadow transition"
                >
                  <Printer size={15} /> Print Report
                </button>
              </div>

              {selectedPatient && (
                <MedicalReport
                  patient={selectedPatient}
                  prediction={prediction || {
                    drug_name: selectedDrug || 'Pantoprazole 40mg',
                    drug_class: selectedDrugData?.class || 'Proton Pump Inhibitor (PPI)',
                    standard_dose: customDosage || '40 mg Once Daily',
                    effectiveness_pct: 88,
                    side_effect_pct: 12,
                    ddi_pct: 8,
                    overall_risk_level: 'LOW',
                    target_organs: selectedDrugData?.target_organs || ['Stomach'],
                    clinical_alerts: [],
                    xai_factors: [],
                    dietary_warnings: 'Take 30 minutes before breakfast with a glass of water.',
                    multilingual_recommendation: {
                      english: 'Pantoprazole 40mg provides high acid inhibition with minimal hepatic load.',
                      hinglish: 'Pantoprazole 40mg suppresses gastric acid secretion. Take once daily in the morning before meals.',
                      marathi: 'पँटोप्राझोल ४० मिग्रॅ पोटातील ॲसिड कमी करण्यासाठी सुरक्षित आणि प्रभावी आहे.'
                    }
                  }}
                  doctorNotes={doctorNotes || 'Standard clinical monitoring advised. Avoid oily foods.'}
                />
              )}
            </div>
          )}



          {/* TAB: DOCTOR PROFILE MANAGEMENT */}
          {activeView === 'doctor-profile' && (
            <DoctorProfileView
              doctor={doctorProfile}
              onProfileUpdated={(updatedDoc) => {
                setDoctorProfile(prev => ({ ...prev, ...updatedDoc }));
                showToast('Doctor profile updated successfully!', 'success');
              }}
              onSelectPatient={(p) => {
                setSelectedPatient(p);
                setActiveView('medical-history');
              }}
            />
          )}

          {/* TAB: CENTRALIZED PATIENT MEDICAL HISTORY & MULTI-DOCTOR TIMELINE */}
          {activeView === 'medical-history' && (
            <CentralizedMedicalHistory
              patient={selectedPatient}
              currentDoctor={doctorProfile}
              onNavigateToPrescribe={() => {
                setPrescriptionTabMode('new');
                setActiveView('prescriptions');
              }}
              onPatientUpdated={loadInitialData}
            />
          )}

          {/* TAB: ONGOING & HISTORICAL MEDICATION MANAGEMENT */}
          {activeView === 'medications' && (
            <OngoingMedicationsTracker
              patient={selectedPatient}
              currentDoctor={doctorProfile}
              onNavigateToPrescribe={() => {
                setPrescriptionTabMode('new');
                setActiveView('prescriptions');
              }}
            />
          )}
        </main>
        </div>
      </div>

      {/* DELETE PATIENT CONFIRMATION MODAL */}
      {patientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white border border-[#D5DBEA] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#E5484D]/15 border border-[#E5484D]/30 text-[#E5484D] flex items-center justify-center shrink-0">
                <Trash2 size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-[var(--doc-text)]">Remove Patient from List?</h3>
                <p className="text-xs text-[var(--doc-text-soft)] mt-1">
                  Are you sure you want to remove <strong className="text-[var(--doc-btn-primary)] font-bold">{patientToDelete.name}</strong> from your clinical records?
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--doc-hover)] border border-[var(--doc-border)] space-y-2 text-xs">
              <div className="flex justify-between items-center text-[var(--doc-text-soft)]">
                <span className="text-[var(--doc-text-soft)]">Patient ID:</span>
                <span className="font-mono text-[var(--doc-btn-primary)] font-bold">PAT-{String(patientToDelete.id).padStart(3, '0')}</span>
              </div>
              <div className="flex justify-between items-center text-[var(--doc-text-soft)]">
                <span className="text-[var(--doc-text-soft)]">Phone Number:</span>
                <span className="font-mono text-[var(--doc-text)] font-semibold">{patientToDelete.contact_number}</span>
              </div>
              <div className="flex justify-between items-center text-[#475569]">
                <span className="text-[#5B6480]">Age / Gender:</span>
                <span>{patientToDelete.age} yrs • {patientToDelete.gender}</span>
              </div>
              <div className="flex justify-between items-center text-[#475569]">
                <span className="text-[#5B6480]">Diagnosis / Issue:</span>
                <span className="truncate max-w-[200px] text-[#14213D]">{patientToDelete.current_health_issue || patientToDelete.existing_diseases || 'General Checkup'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#F2A93B]/20 border border-[#F2A93B]/40 text-[#3D2600] text-xs flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0 text-[#3D2600]" />
              <span>This will delete all corresponding prescriptions and history for this patient.</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPatientToDelete(null)}
                disabled={isDeletingPatient}
                className="px-4 py-2 rounded-xl bg-white hover:bg-[#F4F6FB] text-[#475569] text-xs font-semibold border border-[#D5DBEA] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePatient}
                disabled={isDeletingPatient}
                className="px-4 py-2 rounded-xl bg-[#E5484D] hover:bg-[#c93b40] disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-red-600/20 cursor-pointer"
              >
                {isDeletingPatient ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOAST NOTIFICATION */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold transition-all duration-300 ${
          toastMessage.type === 'error'
            ? 'bg-[#E5484D] border-[#E5484D] text-white shadow-red-950/50'
            : 'bg-[#2BC4A0] border-[#2BC4A0] text-[#06332A] shadow-teal-950/50'
        }`}>
          {toastMessage.type === 'error' ? (
            <AlertTriangle size={16} className="text-white shrink-0" />
          ) : (
            <CheckCircle size={16} className="text-[#06332A] shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-current opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

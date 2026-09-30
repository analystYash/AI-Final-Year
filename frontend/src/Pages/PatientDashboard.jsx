import React, { useState, useEffect } from 'react';
import {
  User, Pill, Calendar, AlertCircle, Heart, ShieldCheck,
  Languages, Utensils, Phone, LogOut, Activity, Eye, ChevronDown, Sparkles,
  FileText, Printer, Stethoscope, ChevronRight, Clock, Award, Sliders, CheckCircle, Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import HumanBody3D from '../components/HumanBody3D';
import EffectCharts from '../components/EffectCharts';
import MedicalReport from '../components/MedicalReport';
import DrugComparison from '../components/DrugComparison';
import { useLanguage } from '../context/LanguageContext';

export default function PatientDashboard() {
  const navigate = useNavigate();
  const { lang, setLang, t } = useLanguage();

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
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | '3d-view' | 'comparison' | 'advice' | 'report'
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  useEffect(() => {
    const storedPatient = localStorage.getItem('drugai_patient');
    const storedPrescriptions = localStorage.getItem('drugai_prescriptions');

    if (storedPatient) {
      try {
        setPatient(JSON.parse(storedPatient));
      } catch (e) {
        console.error(e);
      }
    }

    if (storedPrescriptions) {
      try {
        const parsed = JSON.parse(storedPrescriptions);
        setPrescriptions(parsed);
        if (parsed.length > 0) {
          setSelectedPrescription(parsed[0]);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('drugai_patient');
    localStorage.removeItem('drugai_prescriptions');
    navigate('/login');
  };

  const activeDrugName = selectedPrescription?.drug_name || 'Pantoprazole 40mg';
  const activeDosage = selectedPrescription?.dosage || '40 mg (Once Daily, 10 Days, Before Breakfast)';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* TOP HEADER */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-30 px-4 lg:px-6 py-3.5 flex items-center justify-between print:hidden backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <User size={22} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-tight text-white">DrugAI Health Portal</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                Patient View
              </span>
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:block">
              Personalized Medicine, AI Safety Guidance & 3D Anatomy Mapping
            </span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <Languages size={14} className="text-slate-400 ml-1 mr-1" />
            <button
              onClick={() => setLang('english')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${lang === 'english' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('hinglish')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${lang === 'hinglish' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Hinglish
            </button>
            <button
              onClick={() => setLang('marathi')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${lang === 'marathi' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              मराठी
            </button>
          </div>

          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-bold text-white flex items-center gap-1.5 justify-end">
              <Stethoscope size={13} className="text-cyan-400" /> Dr. Sharma, MD
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Apex Multispecialty Hospital
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 bg-slate-900 hover:bg-red-500/20 hover:text-red-400 text-slate-400 rounded-xl border border-slate-800 transition"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* PATIENT PROFILE HEADER CARD (Screen 7 Header) */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 lg:px-6 py-3 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-cyan-400 text-sm">
              {patient?.name?.charAt(0) || 'R'}
            </div>
            <div>
              <h2 className="font-black text-white text-sm">{patient?.name || 'Rahul Verma'}</h2>
              <p className="text-slate-400 text-[11px]">
                {patient?.age || 28} Years • {patient?.gender || 'Male'} • Phone ID: <span className="text-cyan-400 font-mono font-bold">{patient?.contact_number || '9876543210'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                All 4 Cards View
              </button>
              <button
                onClick={() => setActiveTab('report')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${activeTab === 'report' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                <FileText size={13} /> Official Report
              </button>
            </div>

            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold border border-slate-800 flex items-center gap-1.5 transition"
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
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Prescription Active & AI Verified Safe</h3>
                  <p className="text-slate-400">Targeting Gastric Healing with 87% Safety Margin</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-blue-600/20 text-cyan-400 border border-blue-500/30 font-mono font-bold text-xs">
                  {activeDrugName}
                </span>
              </div>
            </div>

            {/* =================================================================== */}
            {/* SCREEN 7: 4 DISTINCT COLORED MAIN CARDS                             */}
            {/* 🟦 1. Medical Condition (Blue)                                      */}
            {/* 🟩 2. 3D Body View (Green)                                          */}
            {/* 🟪 3. Comparison (Purple)                                          */}
            {/* 🟧 4. AI Doctor Advice (Orange)                                    */}
            {/* =================================================================== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* --------------------------------------------------------------- */}
              {/* 🟦 CARD 1: MEDICAL CONDITION & HISTORY (Blue Header)            */}
              {/* --------------------------------------------------------------- */}
              <div className="bg-slate-950 rounded-2xl border border-blue-500/40 overflow-hidden shadow-lg flex flex-col">
                <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-3 flex items-center justify-between text-white">
                  <span className="font-black text-xs uppercase tracking-wider flex items-center gap-2">
                    <Activity size={15} /> 1. Medical Condition & History
                  </span>
                  <span className="text-[10px] font-mono bg-blue-900/60 px-2 py-0.5 rounded-full border border-blue-400/30">
                    Active Intake
                  </span>
                </div>

                <div className="p-5 space-y-4 text-xs flex-1">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-slate-400 block text-[11px] font-semibold">Current Health Issue:</span>
                    <span className="text-white font-bold text-sm">
                      {patient?.current_health_issue || 'Severe Acidity & Stomach Pain'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-slate-400 block text-[11px] font-semibold">Medical History:</span>
                      <span className="text-slate-200">
                        {patient?.existing_diseases || 'Gastritis (2022), Mild BP'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-slate-400 block text-[11px] font-semibold">Known Allergies:</span>
                      <span className="text-amber-400 font-bold">
                        {patient?.allergies || 'Penicillin, Dust'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/20 space-y-2">
                    <span className="text-cyan-400 font-bold text-xs flex items-center gap-1.5">
                      <Pill size={14} /> Prescribed Therapy:
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-white font-extrabold text-sm">{activeDrugName}</span>
                      <span className="text-emerald-400 font-mono font-bold text-xs">87% Safe</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      <strong>Dosage:</strong> {activeDosage}
                    </p>
                  </div>
                </div>
              </div>

              {/* --------------------------------------------------------------- */}
              {/* 🟩 CARD 2: 3D BODY VIEW & TARGET ORGAN (Green Header)           */}
              {/* --------------------------------------------------------------- */}
              <div className="bg-slate-950 rounded-2xl border border-emerald-500/40 overflow-hidden shadow-lg flex flex-col">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 flex items-center justify-between text-white">
                  <span className="font-black text-xs uppercase tracking-wider flex items-center gap-2">
                    <Eye size={15} /> 2. Real 3D Human Anatomy & Target Organ
                  </span>
                  <span className="text-[10px] font-mono bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-400/30">
                    Stomach Highlighted
                  </span>
                </div>

                <div className="p-2 flex-1 flex flex-col">
                  <div className="h-80 sm:h-96 w-full rounded-xl overflow-hidden bg-slate-900/60 border border-slate-800">
                    <HumanBody3D
                      targetOrgans={['Stomach', 'Gastrointestinal System']}
                      drugName={activeDrugName}
                      riskLevel="LOW"
                    />
                  </div>
                  <div className="p-3 text-center text-[11px] text-slate-400">
                    ✨ Real 3D Anatomy: Drag to rotate 360°, inspect organs in Deep Scan mode, and view real-time drug dissolution.
                  </div>
                </div>
              </div>

              {/* --------------------------------------------------------------- */}
              {/* 🟪 CARD 3: MEDICINE COMPARISON MATRIX (Purple Header)          */}
              {/* --------------------------------------------------------------- */}
              <div className="bg-slate-950 rounded-2xl border border-purple-500/40 overflow-hidden shadow-lg flex flex-col">
                <div className="bg-gradient-to-r from-purple-700 to-indigo-600 px-4 py-3 flex items-center justify-between text-white">
                  <span className="font-black text-xs uppercase tracking-wider flex items-center gap-2">
                    <Sliders size={15} /> 3. Why This Medicine Was Chosen
                  </span>
                  <span className="text-[10px] font-mono bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-400/30">
                    4-Drug Matrix
                  </span>
                </div>

                <div className="p-4 space-y-3 flex-1 text-xs">
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5">Medicine</th>
                          <th className="p-2.5">Safety</th>
                          <th className="p-2.5">Cost</th>
                          <th className="p-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 bg-slate-950">
                        <tr className="bg-purple-950/20">
                          <td className="p-2.5 font-bold text-white">Pantoprazole</td>
                          <td className="p-2.5 text-emerald-400 font-mono font-bold">87%</td>
                          <td className="p-2.5 font-mono text-cyan-400">₹120</td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-black uppercase">
                              Chosen
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2.5 text-slate-300">Rabeprazole</td>
                          <td className="p-2.5 text-emerald-400 font-mono">84%</td>
                          <td className="p-2.5 font-mono text-slate-400">₹145</td>
                          <td className="p-2.5 text-slate-400 text-[10px]">Alternative</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 text-slate-300">Esomeprazole</td>
                          <td className="p-2.5 text-emerald-400 font-mono">89%</td>
                          <td className="p-2.5 font-mono text-slate-400">₹180</td>
                          <td className="p-2.5 text-slate-400 text-[10px]">Alternative</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 text-slate-300">Omeprazole</td>
                          <td className="p-2.5 text-emerald-400 font-mono">80%</td>
                          <td className="p-2.5 font-mono text-slate-400">₹85</td>
                          <td className="p-2.5 text-slate-400 text-[10px]">Alternative</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Pantoprazole 40mg is selected because it provides rapid acid relief with minimal side effects and safest profile for penicillin allergy.
                  </p>
                </div>
              </div>

              {/* --------------------------------------------------------------- */}
              {/* 🟧 CARD 4: AI DOCTOR ADVICE & CARE PLAN (Orange Header)         */}
              {/* --------------------------------------------------------------- */}
              <div className="bg-slate-950 rounded-2xl border border-amber-500/40 overflow-hidden shadow-lg flex flex-col">
                <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-3 flex items-center justify-between text-white">
                  <span className="font-black text-xs uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={15} /> 4. AI Doctor Advice & Care Plan
                  </span>
                  <span className="text-[10px] font-mono bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-400/30">
                    Multilingual
                  </span>
                </div>

                <div className="p-5 space-y-4 flex-1 text-xs">
                  {/* Multilingual Voice/Advice Box */}
                  <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/20 space-y-2">
                    <span className="text-amber-400 font-bold text-xs flex items-center gap-1.5">
                      <Info size={14} /> Personal Care Instructions:
                    </span>
                    <p className="text-slate-200 leading-relaxed text-xs">
                      {lang === 'marathi'
                        ? 'सकाळी रिकाम्या पोटी १ गोळी पाण्यासोबत घ्या. तिखट, तेलकट आणि मसालेदार जेवण टाळा. ३ दिवसांत आराम न पडल्यास डॉक्टरांशी संपर्क साधा.'
                        : (lang === 'hinglish'
                            ? 'Subah khali pet 1 tablet pani ke sath lein. Teekha, oily aur masaledar khana bilkul na khayein. Khoob pani piyein aur 10 din ka course poora karein.'
                            : 'Take 1 tablet daily in the morning on an empty stomach with a full glass of water. Avoid spicy and fried foods. Complete the 10-day course.')
                      }
                    </p>
                  </div>

                  {/* Dietary Dos & Don'ts */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                      <span className="text-emerald-400 font-bold block">✓ Recommended:</span>
                      <span className="text-slate-300 block">• Coconut water & buttermilk</span>
                      <span className="text-slate-300 block">• Light bland food (Khichdi)</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 space-y-1">
                      <span className="text-red-400 font-bold block">✗ Avoid:</span>
                      <span className="text-slate-300 block">• Tea, coffee, acidic citrus</span>
                      <span className="text-slate-300 block">• Late-night heavy dining</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: REPORT VIEW */}
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
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow transition"
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
                  english: 'Pantoprazole 40mg provides high acid inhibition with minimal hepatic load.',
                  hinglish: 'Pantoprazole 40mg pet me acid kam karta hai. Subah khali pet lein.',
                  marathi: 'पँटोप्राझोल ४० मिग्रॅ पोटातील ॲसिड कमी करण्यासाठी सुरक्षित आणि प्रभावी आहे.'
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

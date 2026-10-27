import React, { useState, useEffect } from 'react';
import {
  FileText, Activity, ShieldCheck, Users, Calendar, Clock, AlertTriangle,
  Plus, Check, ChevronDown, ChevronRight, Stethoscope, Award, Building2,
  Heart, Pill, FileSpreadsheet, Eye, Sparkles, AlertCircle, X, CheckCircle2,
  Trash2, UserPlus, Filter, ShieldAlert, ArrowUpRight
} from 'lucide-react';
import {
  getCentralizedMedicalHistory, recordConsultation, getDoctors,
  associatePatientDoctor, updateDoctorAssociation, removeDoctorAssociation
} from '../services/api';

export default function CentralizedMedicalHistory({
  patient,
  currentDoctor,
  onNavigateToPrescribe,
  onPatientUpdated
}) {
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // View modes: 'timeline' | 'consultations' | 'doctors' | 'reports'
  const [viewMode, setViewMode] = useState('timeline');

  // Filter by doctor in consultations / timeline
  const [filterDoctor, setFilterDoctor] = useState('all');

  // New Consultation Modal State
  const [isRecordingConsultation, setIsRecordingConsultation] = useState(false);
  const [consultationSubmitting, setConsultationSubmitting] = useState(false);
  const [newConsultation, setNewConsultation] = useState({
    diagnosis: '',
    symptoms: '',
    treatment_notes: '',
    clinical_summary: '',
    bp: '120/80',
    pulse: '74',
    temp: '98.6',
    spo2: '99',
    weight: '70',
    follow_up_date: '',
    report_title: '',
    report_type: 'Lab Test',
    report_findings: ''
  });

  // Associate Doctor Modal State
  const [isAssociatingDoctor, setIsAssociatingDoctor] = useState(false);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [associatingLoading, setAssociatingLoading] = useState(false);
  const [associationForm, setAssociationForm] = useState({
    doctor_id: '',
    relationship_type: 'consulting', // treating, consulting, previous, referral
    access_permission: 'full',       // full, view_only, emergency
    consent_status: 'granted',       // granted, pending, revoked
    notes: ''
  });

  const patientId = patient?.id;

  useEffect(() => {
    if (patientId) {
      loadHistory();
      loadDoctorsCatalog();
    }
  }, [patientId]);

  const loadHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getCentralizedMedicalHistory(patientId);
      setHistoryData(data);
    } catch (err) {
      console.error('Failed to load centralized medical history:', err);
      setError(err.message || 'Failed to load medical history.');
    } finally {
      setLoading(false);
    }
  };

  const loadDoctorsCatalog = async () => {
    try {
      const docs = await getDoctors();
      setAvailableDoctors(docs || []);
      if (docs && docs.length > 0) {
        setAssociationForm(prev => ({ ...prev, doctor_id: docs[0].id }));
      }
    } catch (err) {
      console.warn('Could not load doctors catalog:', err);
    }
  };

  const handleRecordConsultationSubmit = async (e) => {
    e.preventDefault();
    if (!newConsultation.diagnosis.trim()) {
      alert('Please enter a diagnosis.');
      return;
    }
    setConsultationSubmitting(true);
    setError('');
    try {
      const reports = [];
      if (newConsultation.report_title.trim()) {
        reports.push({
          title: newConsultation.report_title.trim(),
          type: newConsultation.report_type,
          findings: newConsultation.report_findings.trim() || 'Unremarkable clinical findings.',
          date: new Date().toISOString().slice(0, 10),
          doctor: currentDoctor?.name || 'Attending Physician'
        });
      }

      const vitals = {
        bp: newConsultation.bp ? `${newConsultation.bp} mmHg` : '120/80 mmHg',
        pulse: newConsultation.pulse ? `${newConsultation.pulse} bpm` : '72 bpm',
        temp: newConsultation.temp ? `${newConsultation.temp} F` : '98.6 F',
        spo2: newConsultation.spo2 ? `${newConsultation.spo2}%` : '99%',
        weight: newConsultation.weight ? `${newConsultation.weight} kg` : ''
      };

      await recordConsultation({
        patient_id: patientId,
        doctor_id: currentDoctor?.id || 1,
        doctor_name: currentDoctor?.name || 'Dr. Sharma, MD',
        doctor_specialization: currentDoctor?.specialization || 'Cardiology & Internal Medicine',
        hospital_name: currentDoctor?.hospital_name || 'Apex Multispecialty Hospital',
        diagnosis: newConsultation.diagnosis,
        symptoms: newConsultation.symptoms,
        treatment_notes: newConsultation.treatment_notes,
        clinical_summary: newConsultation.clinical_summary || `Clinical consultation for ${newConsultation.diagnosis}`,
        vital_signs: vitals,
        medical_reports: reports,
        follow_up_date: newConsultation.follow_up_date
      });

      setSuccessMessage('New consultation record successfully added to patient history without overwriting previous records!');
      setIsRecordingConsultation(false);
      setNewConsultation({
        diagnosis: '',
        symptoms: '',
        treatment_notes: '',
        clinical_summary: '',
        bp: '120/80',
        pulse: '74',
        temp: '98.6',
        spo2: '99',
        weight: '70',
        follow_up_date: '',
        report_title: '',
        report_type: 'Lab Test',
        report_findings: ''
      });
      await loadHistory();
    } catch (err) {
      setError(err.message || 'Failed to record consultation.');
    } finally {
      setConsultationSubmitting(false);
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  };

  const handleAssociateDoctorSubmit = async (e) => {
    e.preventDefault();
    if (!associationForm.doctor_id) {
      alert('Please select a doctor.');
      return;
    }
    setAssociatingLoading(true);
    try {
      const selectedDoc = availableDoctors.find(d => String(d.id) === String(associationForm.doctor_id));
      await associatePatientDoctor(patientId, {
        doctor_id: associationForm.doctor_id,
        doctor_name: selectedDoc?.name || '',
        doctor_specialization: selectedDoc?.specialization || '',
        doctor_hospital: selectedDoc?.hospital_name || '',
        relationship_type: associationForm.relationship_type,
        access_permission: associationForm.access_permission,
        consent_status: associationForm.consent_status,
        notes: associationForm.notes
      });
      setSuccessMessage(`Successfully associated ${selectedDoc?.name || 'doctor'} with ${patient?.name}.`);
      setIsAssociatingDoctor(false);
      await loadHistory();
    } catch (err) {
      setError(err.message || 'Failed to associate doctor.');
    } finally {
      setAssociatingLoading(false);
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  };

  const handleRemoveDoctor = async (docId, docName) => {
    if (!window.confirm(`Are you sure you want to remove ${docName} from ${patient?.name}'s care team?`)) {
      return;
    }
    try {
      await removeDoctorAssociation(patientId, docId);
      setSuccessMessage(`Doctor association for ${docName} removed.`);
      await loadHistory();
    } catch (err) {
      setError(err.message || 'Failed to remove doctor association.');
    }
  };

  const currentPatient = historyData?.patient || patient || {};
  const doctorsList = historyData?.associated_doctors || [];
  const consultationsList = historyData?.consultations || [];
  const timelineEvents = historyData?.timeline || [];
  const medicalReports = historyData?.medical_reports || [];
  const medicationsCounts = historyData?.medications?.counts || { active: 0, completed: 0, discontinued: 0, total: 0 };

  // Filtered consultations
  const filteredConsultations = filterDoctor === 'all'
    ? consultationsList
    : consultationsList.filter(c => String(c.doctor_id) === String(filterDoctor) || c.doctor_name.includes(filterDoctor));

  // Filtered timeline
  const filteredTimeline = filterDoctor === 'all'
    ? timelineEvents
    : timelineEvents.filter(e => e.doctor_name && (e.doctor_name.includes(filterDoctor) || String(e.doctor_id) === String(filterDoctor)));

  if (loading && !historyData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] text-slate-400 space-y-3">
        <Activity className="animate-spin text-blue-500" size={32} />
        <p className="text-sm font-medium">Aggregating centralized multi-doctor medical history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* NOTIFICATIONS */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl flex items-center gap-3 text-emerald-300 text-sm animate-fade-in shadow-lg">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 bg-red-950/60 border border-red-500/40 rounded-2xl flex items-center gap-3 text-red-300 text-sm animate-fade-in shadow-lg">
          <AlertCircle size={18} className="text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* CORE CLINICAL SUMMARY BANNER & CONSENT BADGE */}
      <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-black text-white">{currentPatient.name}</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-mono font-bold">
                PAT-{String(currentPatient.id).padStart(3, '0')}
              </span>
              <span className="px-3 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" />
                Consent Verified • Full Multi-Doctor Access
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>{currentPatient.age} Years • {currentPatient.gender}</span>
              <span>Blood Group: <strong className="text-white">{currentPatient.blood_group || 'O+'}</strong></span>
              <span className="font-mono">Contact: {currentPatient.contact_number}</span>
              {currentPatient.is_pregnant ? (
                <span className="text-pink-400 font-bold bg-pink-500/15 px-2 py-0.5 rounded-md border border-pink-500/30">
                  Pregnant ({currentPatient.pregnancy_trimester || '1st'} Trimester)
                </span>
              ) : null}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsAssociatingDoctor(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
            >
              <UserPlus size={14} className="text-blue-400" />
              Associate Doctor
            </button>

            <button
              onClick={() => setIsRecordingConsultation(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-600/30"
            >
              <Plus size={14} />
              Record New Consultation
            </button>
          </div>
        </div>

        {/* CLINICAL BASELINE GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Documented Allergies
            </span>
            <div className={`font-bold flex items-center gap-1.5 ${
              currentPatient.allergies && currentPatient.allergies.toLowerCase() !== 'none'
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}>
              {currentPatient.allergies && currentPatient.allergies.toLowerCase() !== 'none' ? (
                <AlertTriangle size={14} className="text-amber-400 shrink-0" />
              ) : (
                <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
              )}
              <span>{currentPatient.allergies || 'No known drug allergies reported'}</span>
            </div>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Existing Conditions
            </span>
            <span className="font-semibold text-slate-200">
              {currentPatient.existing_diseases || 'None documented'}
            </span>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Current Health Issue
            </span>
            <span className="font-bold text-cyan-300">
              {currentPatient.current_health_issue || 'General Examination'}
            </span>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Ongoing Active Meds
            </span>
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400">{medicationsCounts.active} Active</span>
              <span className="text-[11px] text-slate-400">({medicationsCounts.total} Total)</span>
            </div>
          </div>
        </div>
      </div>

      {/* MULTI-DOCTOR CARE TEAM STRIP */}
      <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-blue-400" />
            <h3 className="text-sm font-bold text-white">Multi-Doctor Care Team for {currentPatient.name}</h3>
            <span className="text-xs text-slate-400">({doctorsList.length} Associated Doctors)</span>
          </div>
          <button
            onClick={() => setIsAssociatingDoctor(true)}
            className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
          >
            <Plus size={13} /> Add Doctor
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {doctorsList.map((doc) => {
            const isTreating = doc.relationship_type === 'treating';
            const isConsulting = doc.relationship_type === 'consulting';
            const isPrevious = doc.relationship_type === 'previous';
            return (
              <div
                key={doc.doctor_id}
                className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex items-start justify-between gap-3 relative group"
              >
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{doc.doctor_name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      isTreating
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : isConsulting
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {doc.relationship_type || 'treating'}
                    </span>
                  </div>

                  <p className="text-slate-400 text-[11px]">{doc.doctor_specialization}</p>
                  <p className="text-slate-500 text-[10px] flex items-center gap-1">
                    <Building2 size={11} /> {doc.doctor_hospital}
                  </p>

                  <div className="pt-1 flex items-center gap-2 text-[10px]">
                    <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                      <ShieldCheck size={11} /> {doc.access_permission || 'Full'} Access
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400">Since {String(doc.associated_since).slice(0, 10)}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveDoctor(doc.doctor_id, doc.doctor_name)}
                  className="opacity-0 group-hover:opacity-100 transition text-slate-500 hover:text-red-400 p-1 cursor-pointer"
                  title="Remove doctor association"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* VIEW SELECTOR & FILTER HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              viewMode === 'timeline'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Activity size={14} />
            Unified Patient Timeline ({timelineEvents.length})
          </button>

          <button
            onClick={() => setViewMode('consultations')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              viewMode === 'consultations'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Stethoscope size={14} />
            Consultation Records ({consultationsList.length})
          </button>

          <button
            onClick={() => setViewMode('reports')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              viewMode === 'reports'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <FileSpreadsheet size={14} />
            Medical & Lab Reports ({medicalReports.length})
          </button>
        </div>

        {/* Doctor Filter Dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <Filter size={13} className="text-slate-400" />
          <span className="text-slate-400">Filter Doctor:</span>
          <select
            value={filterDoctor}
            onChange={(e) => setFilterDoctor(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer text-xs"
          >
            <option value="all">All Doctors ({doctorsList.length})</option>
            {doctorsList.map((d) => (
              <option key={d.doctor_id} value={d.doctor_name}>
                {d.doctor_name} ({d.relationship_type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. UNIFIED TIMELINE VIEW */}
      {viewMode === 'timeline' && (
        <div className="space-y-4">
          {filteredTimeline.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs bg-slate-900 rounded-3xl border border-slate-800">
              No medical events recorded matching current doctor filter.
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 space-y-6 before:content-[''] before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
              {filteredTimeline.map((item, idx) => {
                const isConsultation = item.type === 'consultation';
                return (
                  <div key={item.id || idx} className="relative group">
                    {/* Timeline Node Icon */}
                    <div className={`absolute -left-6 sm:-left-8 top-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-950 shadow-md ${
                      isConsultation
                        ? 'bg-blue-600 text-white'
                        : 'bg-cyan-500 text-slate-950'
                    }`}>
                      {isConsultation ? <Stethoscope size={12} /> : <Pill size={12} />}
                    </div>

                    {/* Timeline Card */}
                    <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-800 hover:border-slate-700 transition shadow-lg space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            isConsultation
                              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                              : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                          }`}>
                            {isConsultation ? 'Clinical Consultation' : 'Prescription Recorded'}
                          </span>
                          <span className="font-bold text-white text-sm">{item.title}</span>
                        </div>

                        <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                          <Clock size={12} className="text-blue-400" />
                          {String(item.date).slice(0, 16)}
                        </span>
                      </div>

                      {/* Doctor Attribution */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400">Doctor:</span>
                        <span className="font-bold text-cyan-300">{item.doctor_name}</span>
                        <span className="text-slate-500">|</span>
                        <span className="text-slate-400">{item.doctor_specialization}</span>
                        {item.hospital_name && (
                          <>
                            <span className="text-slate-500">|</span>
                            <span className="text-slate-400 text-[11px]">{item.hospital_name}</span>
                          </>
                        )}
                      </div>

                      {/* Details depending on type */}
                      {isConsultation ? (
                        <div className="space-y-2 text-xs">
                          {item.symptoms && (
                            <p className="text-slate-300">
                              <span className="text-slate-400 font-semibold">Symptoms: </span>
                              {item.symptoms}
                            </p>
                          )}
                          {item.treatment_notes && (
                            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 text-slate-200">
                              <span className="text-slate-400 font-semibold block mb-0.5">Treatment & Clinical Notes:</span>
                              {item.treatment_notes}
                            </div>
                          )}

                          {item.vital_signs && Object.keys(item.vital_signs).length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {Object.entries(item.vital_signs).map(([k, v]) => (
                                <span key={k} className="px-2.5 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono">
                                  <span className="text-slate-500 uppercase">{k}:</span> {v}
                                </span>
                              ))}
                            </div>
                          )}

                          {item.medical_reports && item.medical_reports.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                                <FileSpreadsheet size={12} /> Diagnostic Reports Linked:
                              </span>
                              {item.medical_reports.map((rep, rIdx) => (
                                <div key={rIdx} className="bg-slate-950/90 p-2.5 rounded-lg border border-slate-800 text-xs">
                                  <div className="font-bold text-white flex items-center justify-between">
                                    <span>{rep.title}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">{rep.date}</span>
                                  </div>
                                  <p className="text-[11px] text-slate-300 mt-0.5">{rep.findings}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs space-y-1.5">
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400">Dosage: <strong className="text-white">{item.dosage}</strong></span>
                            {item.frequency && <span className="text-slate-400">Frequency: <strong className="text-white">{item.frequency}</strong></span>}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              item.status === 'active'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {item.status || 'Active'}
                            </span>
                          </div>
                          {item.instructions && (
                            <p className="text-slate-300 text-[11px]">
                              <span className="text-slate-400">Instructions: </span>
                              {item.instructions}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. CONSULTATIONS LIST (Chronological - Most Recent First) */}
      {viewMode === 'consultations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Preserving all consultations across attending and consulting physicians chronologically.
            </span>
            <button
              onClick={() => setIsRecordingConsultation(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow"
            >
              <Plus size={13} /> Add Consultation
            </button>
          </div>

          {filteredConsultations.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs bg-slate-900 rounded-3xl border border-slate-800">
              No consultation records recorded matching current filter.
            </div>
          ) : (
            filteredConsultations.map((c) => (
              <div key={c.id} className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-base">{c.diagnosis}</span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 text-[10px] font-bold border border-blue-500/30">
                        Consultation #{c.id}
                      </span>
                    </div>
                    <div className="text-xs text-cyan-300 font-semibold flex items-center gap-1.5">
                      <Stethoscope size={13} className="text-cyan-400" />
                      {c.doctor_name}
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
                      <span className="text-[11px] text-amber-300 block mt-0.5">
                        Follow-up: {c.follow_up_date}
                      </span>
                    )}
                  </div>
                </div>

                {c.symptoms && (
                  <div className="text-xs text-slate-300">
                    <span className="text-slate-400 font-semibold">Reported Symptoms: </span>
                    {c.symptoms}
                  </div>
                )}

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-200 space-y-1">
                  <span className="text-slate-400 font-semibold block">Treatment Notes & Clinical Directive:</span>
                  <p className="leading-relaxed">{c.treatment_notes}</p>
                </div>

                {/* Vital Signs Row */}
                {c.vital_signs && Object.keys(c.vital_signs).length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {Object.entries(c.vital_signs).map(([k, v]) => (
                      <span key={k} className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono">
                        <span className="text-slate-500 uppercase">{k}:</span> <strong className="text-white">{v}</strong>
                      </span>
                    ))}
                  </div>
                )}

                {/* Medical Reports */}
                {c.medical_reports && c.medical_reports.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <FileSpreadsheet size={13} /> Attached Clinical Reports & Diagnostic Workup
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
            ))
          )}
        </div>
      )}

      {/* 3. MEDICAL & DIAGNOSTIC REPORTS VIEW */}
      {viewMode === 'reports' && (
        <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-amber-400" />
              Patient Diagnostic Reports & Laboratory Tests
            </h3>
            <span className="text-xs text-slate-400">Consolidated from all consultations</span>
          </div>

          {medicalReports.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No diagnostic reports attached to patient records yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {medicalReports.map((report, idx) => (
                <div key={idx} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-white text-sm">{report.title}</h4>
                      <span className="text-[11px] text-blue-400 font-semibold">{report.type || 'Diagnostic Investigation'}</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">{report.date}</span>
                  </div>

                  <div className="text-xs text-slate-300 bg-slate-900/90 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400 font-semibold block mb-0.5">Clinical Findings:</span>
                    <p>{report.findings}</p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Reviewed by: <strong className="text-slate-200">{report.doctor_name || 'Consultant'}</strong></span>
                    {report.hospital_name && <span>{report.hospital_name}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* RECORD NEW CONSULTATION MODAL */}
      {isRecordingConsultation && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                  <Stethoscope size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Record New Clinical Consultation</h3>
                  <p className="text-xs text-slate-400">
                    Recording encounter for <strong>{currentPatient.name}</strong> by <strong>{currentDoctor?.name || 'Dr. Sharma, MD'}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRecordingConsultation(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordConsultationSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Clinical Diagnosis *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acute Gastric Mucosal Irritation with Dyspepsia"
                  value={newConsultation.diagnosis}
                  onChange={(e) => setNewConsultation({ ...newConsultation, diagnosis: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Patient Reported Symptoms</label>
                <input
                  type="text"
                  placeholder="e.g. Retrosternal burning after dinner, mild bloating"
                  value={newConsultation.symptoms}
                  onChange={(e) => setNewConsultation({ ...newConsultation, symptoms: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Vitals row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">BP (mmHg)</label>
                  <input
                    type="text"
                    value={newConsultation.bp}
                    onChange={(e) => setNewConsultation({ ...newConsultation, bp: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Pulse (bpm)</label>
                  <input
                    type="text"
                    value={newConsultation.pulse}
                    onChange={(e) => setNewConsultation({ ...newConsultation, pulse: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Temp (F)</label>
                  <input
                    type="text"
                    value={newConsultation.temp}
                    onChange={(e) => setNewConsultation({ ...newConsultation, temp: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">SpO2 (%)</label>
                  <input
                    type="text"
                    value={newConsultation.spo2}
                    onChange={(e) => setNewConsultation({ ...newConsultation, spo2: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Weight (kg)</label>
                  <input
                    type="text"
                    value={newConsultation.weight}
                    onChange={(e) => setNewConsultation({ ...newConsultation, weight: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Treatment & Clinical Notes</label>
                <textarea
                  rows={3}
                  placeholder="Clinical assessment, pharmacological modifications, lifestyle guidance, and dietary precautions..."
                  value={newConsultation.treatment_notes}
                  onChange={(e) => setNewConsultation({ ...newConsultation, treatment_notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Optional Diagnostic Report */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-slate-300 font-semibold block text-[11px]">Attach Diagnostic Investigation / Report (Optional)</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Report Title (e.g. Endoscopy / Lipid Panel)"
                    value={newConsultation.report_title}
                    onChange={(e) => setNewConsultation({ ...newConsultation, report_title: e.target.value })}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                  />
                  <select
                    value={newConsultation.report_type}
                    onChange={(e) => setNewConsultation({ ...newConsultation, report_type: e.target.value })}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white cursor-pointer"
                  >
                    <option value="Lab Test">Lab Test / Biochemistry</option>
                    <option value="Endoscopy">Endoscopy</option>
                    <option value="Radiology">Ultrasound / X-Ray / CT</option>
                    <option value="Cardiology">ECG / Echo</option>
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="Key Findings (e.g. Mild mucosal redness, normal lumen)"
                  value={newConsultation.report_findings}
                  onChange={(e) => setNewConsultation({ ...newConsultation, report_findings: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Follow-up Date (Optional)</label>
                <input
                  type="date"
                  value={newConsultation.follow_up_date}
                  onChange={(e) => setNewConsultation({ ...newConsultation, follow_up_date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRecordingConsultation(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={consultationSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/30"
                >
                  {consultationSubmitting ? <Activity size={14} className="animate-spin" /> : <Check size={14} />}
                  Save Consultation Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSOCIATE DOCTOR MODAL */}
      {isAssociatingDoctor && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-blue-400" />
                <h3 className="text-base font-bold text-white">Associate Doctor with {currentPatient.name}</h3>
              </div>
              <button onClick={() => setIsAssociatingDoctor(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssociateDoctorSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select Doctor *</label>
                <select
                  value={associationForm.doctor_id}
                  onChange={(e) => setAssociationForm({ ...associationForm, doctor_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white cursor-pointer"
                  required
                >
                  {availableDoctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.specialization} ({d.hospital_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Relationship Role *</label>
                <select
                  value={associationForm.relationship_type}
                  onChange={(e) => setAssociationForm({ ...associationForm, relationship_type: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white cursor-pointer"
                >
                  <option value="treating">Treating Physician (Primary Attending Doctor)</option>
                  <option value="consulting">Consulting Specialist (Second Opinion / Co-care)</option>
                  <option value="previous">Previous Doctor (Historical Records)</option>
                  <option value="referral">Referral Specialist</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Medical Record Access</label>
                  <select
                    value={associationForm.access_permission}
                    onChange={(e) => setAssociationForm({ ...associationForm, access_permission: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white cursor-pointer"
                  >
                    <option value="full">Full Clinical History</option>
                    <option value="view_only">View Only (No Prescribe)</option>
                    <option value="emergency">Emergency Access</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Patient Consent</label>
                  <select
                    value={associationForm.consent_status}
                    onChange={(e) => setAssociationForm({ ...associationForm, consent_status: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white cursor-pointer"
                  >
                    <option value="granted">Consent Granted</option>
                    <option value="pending">Consent Pending</option>
                    <option value="revoked">Consent Revoked</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Clinical Association Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Referred for GI endoscopic evaluation and acid reflux management"
                  value={associationForm.notes}
                  onChange={(e) => setAssociationForm({ ...associationForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAssociatingDoctor(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={associatingLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/30"
                >
                  {associatingLoading ? <Activity size={14} className="animate-spin" /> : <Check size={14} />}
                  Confirm Association
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

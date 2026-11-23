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
    relationship_type: 'consulting',
    access_permission: 'full',
    consent_status: 'granted',
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
      await recordConsultation(patientId, {
        patient_id: patientId,
        doctor_id: currentDoctor?.id || 1,
        doctor_name: currentDoctor?.name || 'Dr. Sharma, MD',
        doctor_specialization: currentDoctor?.specialization || 'Cardiology & Internal Medicine',
        hospital_name: currentDoctor?.hospital_name || 'Apex Multispecialty Hospital',
        diagnosis: newConsultation.diagnosis,
        symptoms: newConsultation.symptoms,
        treatment_notes: newConsultation.treatment_notes,
        clinical_summary: newConsultation.clinical_summary || newConsultation.treatment_notes,
        vital_signs: {
          bp: newConsultation.bp,
          pulse: newConsultation.pulse,
          temp: newConsultation.temp,
          spo2: newConsultation.spo2,
          weight: newConsultation.weight
        },
        follow_up_date: newConsultation.follow_up_date,
        report_title: newConsultation.report_title,
        report_type: newConsultation.report_type,
        report_findings: newConsultation.report_findings
      });

      setSuccessMessage('New consultation successfully recorded in EHR timeline.');
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
      if (onPatientUpdated) onPatientUpdated();
    } catch (err) {
      setError(err.message || 'Failed to record consultation.');
    } finally {
      setConsultationSubmitting(false);
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  };

  const handleAssociateDoctorSubmit = async (e) => {
    e.preventDefault();
    if (!associationForm.doctor_id) {
      alert('Please select a doctor.');
      return;
    }
    setAssociatingLoading(true);
    setError('');
    try {
      await associatePatientDoctor(patientId, associationForm);
      setSuccessMessage('Doctor successfully associated with patient care team.');
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

  const filteredConsultations = filterDoctor === 'all'
    ? consultationsList
    : consultationsList.filter(c => String(c.doctor_id) === String(filterDoctor) || c.doctor_name.includes(filterDoctor));

  const filteredTimeline = filterDoctor === 'all'
    ? timelineEvents
    : timelineEvents.filter(e => e.doctor_name && (e.doctor_name.includes(filterDoctor) || String(e.doctor_id) === String(filterDoctor)));

  if (loading && !historyData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[250px] text-[#64748B] space-y-3">
        <Activity className="animate-spin text-[#5B9A94]" size={28} />
        <p className="text-xs font-medium">Aggregating centralized multi-doctor medical history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* NOTIFICATIONS */}
      {successMessage && (
        <div className="p-3 bg-[#DDECE2] border border-[#DDECE2] rounded-xl flex items-center gap-2.5 text-[#24593E] text-xs font-semibold shadow-xs">
          <CheckCircle2 size={16} className="text-[#24593E] shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {error && (
        <div className="p-3 bg-[#F3DEDE] border border-[#F3DEDE] rounded-xl flex items-center gap-2.5 text-[#962A2A] text-xs font-semibold shadow-xs">
          <AlertCircle size={16} className="text-[#962A2A] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* CORE CLINICAL SUMMARY BANNER */}
      <div className="bg-white rounded-xl p-5 border border-[#E8EDF2] shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E8EDF2] pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-[#334155]">{currentPatient.name}</h2>
              <span className="px-2 py-0.5 rounded-full bg-[#F8FAFC] border border-[#E8EDF2] text-[#7895AE] text-[10px] font-mono">
                PAT-{String(currentPatient.id).padStart(3, '0')}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#DDECE2] text-[#24593E] text-xs font-semibold flex items-center gap-1">
                <ShieldCheck size={13} /> Consent Verified • Multi-Doctor Access
              </span>
            </div>
            <div className="text-xs text-[#64748B] mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>{currentPatient.age} Years • {currentPatient.gender}</span>
              <span>Blood Group: <strong className="text-[#334155]">{currentPatient.blood_group || 'O+'}</strong></span>
              <span className="font-mono">Contact: {currentPatient.contact_number}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsAssociatingDoctor(true)}
              className="px-3 py-1.5 bg-white hover:bg-[#F8FAFC] text-[#334155] text-xs font-semibold rounded-lg border border-[#E8EDF2] flex items-center gap-1.5 transition cursor-pointer"
            >
              <UserPlus size={13} className="text-[#5B9A94]" />
              Associate Doctor
            </button>

            <button
              onClick={() => setIsRecordingConsultation(true)}
              className="px-3.5 py-1.5 bg-[#5B9A94] hover:bg-[#487B76] text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus size={14} /> Record Consultation
            </button>
          </div>
        </div>

        {/* CLINICAL BASELINE CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E8EDF2] space-y-1">
            <span className="text-[10px] font-semibold text-[#7895AE] uppercase block">
              Documented Allergies
            </span>
            <div className={`font-semibold flex items-center gap-1.5 ${
              currentPatient.allergies && currentPatient.allergies.toLowerCase() !== 'none'
                ? 'text-[#785200]'
                : 'text-[#24593E]'
            }`}>
              {currentPatient.allergies && currentPatient.allergies.toLowerCase() !== 'none' ? (
                <AlertTriangle size={13} className="shrink-0" />
              ) : (
                <ShieldCheck size={13} className="shrink-0" />
              )}
              <span>{currentPatient.allergies || 'No allergies recorded'}</span>
            </div>
          </div>

          <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E8EDF2] space-y-1">
            <span className="text-[10px] font-semibold text-[#7895AE] uppercase block">
              Existing Conditions
            </span>
            <span className="font-semibold text-[#334155] block truncate">
              {currentPatient.existing_diseases || 'None documented'}
            </span>
          </div>

          <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E8EDF2] space-y-1">
            <span className="text-[10px] font-semibold text-[#7895AE] uppercase block">
              Current Health Issue
            </span>
            <span className="font-semibold text-[#487B76] block truncate">
              {currentPatient.current_health_issue || 'General Examination'}
            </span>
          </div>

          <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E8EDF2] space-y-1">
            <span className="text-[10px] font-semibold text-[#7895AE] uppercase block">
              Ongoing Active Meds
            </span>
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#24593E]">{medicationsCounts.active} Active</span>
              <span className="text-[11px] text-[#7895AE]">({medicationsCounts.total} Total)</span>
            </div>
          </div>
        </div>
      </div>

      {/* MULTI-DOCTOR CARE TEAM */}
      <div className="bg-white rounded-xl p-5 border border-[#E8EDF2] shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#E8EDF2] pb-2">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-[#5B9A94]" />
            <h3 className="text-xs font-bold text-[#334155]">Multi-Doctor Care Team ({doctorsList.length})</h3>
          </div>
          <button
            onClick={() => setIsAssociatingDoctor(true)}
            className="text-xs text-[#5B9A94] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Plus size={12} /> Add Doctor
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {doctorsList.map((doc) => (
            <div
              key={doc.doctor_id}
              className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E8EDF2] flex items-start justify-between gap-3 text-xs group"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#334155]">{doc.doctor_name}</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase bg-[#EBF3F2] text-[#487B76]">
                    {doc.relationship_type || 'treating'}
                  </span>
                </div>
                <p className="text-[#64748B] text-[11px]">{doc.doctor_specialization}</p>
                <p className="text-[#7895AE] text-[10px] flex items-center gap-1">
                  <Building2 size={11} /> {doc.doctor_hospital}
                </p>
              </div>

              <button
                onClick={() => handleRemoveDoctor(doc.doctor_id, doc.doctor_name)}
                className="opacity-0 group-hover:opacity-100 transition text-[#7895AE] hover:text-[#962A2A] p-1 cursor-pointer"
                title="Remove doctor"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* TIMELINE & CONSULTATION VIEW TABS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8EDF2] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'timeline'
                ? 'bg-[#5B9A94] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#334155] hover:bg-white'
            }`}
          >
            <Activity size={13} />
            Unified Timeline ({timelineEvents.length})
          </button>

          <button
            onClick={() => setViewMode('consultations')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'consultations'
                ? 'bg-[#5B9A94] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#334155] hover:bg-white'
            }`}
          >
            <Stethoscope size={13} />
            Consultation Records ({consultationsList.length})
          </button>

          <button
            onClick={() => setViewMode('reports')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'reports'
                ? 'bg-[#5B9A94] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#334155] hover:bg-white'
            }`}
          >
            <FileSpreadsheet size={13} />
            Lab Reports ({medicalReports.length})
          </button>
        </div>

        {/* Doctor Filter */}
        <div className="flex items-center gap-2 text-xs">
          <Filter size={13} className="text-[#7895AE]" />
          <span className="text-[#64748B]">Filter Doctor:</span>
          <select
            value={filterDoctor}
            onChange={(e) => setFilterDoctor(e.target.value)}
            className="bg-white border border-[#E8EDF2] text-[#334155] rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-[#5B9A94]"
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

      {/* 1. TIMELINE VIEW */}
      {viewMode === 'timeline' && (
        <div className="space-y-4">
          {filteredTimeline.length === 0 ? (
            <div className="text-center py-10 text-[#64748B] text-xs bg-white rounded-xl border border-[#E8EDF2]">
              No medical events recorded matching current doctor filter.
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E8EDF2]">
              {filteredTimeline.map((item, idx) => {
                const isConsultation = item.type === 'consultation';
                return (
                  <div key={item.id || idx} className="relative">
                    <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs bg-[#5B9A94] text-white">
                      {isConsultation ? <Stethoscope size={10} /> : <Pill size={10} />}
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-[#E8EDF2] shadow-xs space-y-2">
                      <div className="flex items-center justify-between border-b border-[#E8EDF2] pb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            isConsultation ? 'bg-[#EBF3F2] text-[#487B76]' : 'bg-[#E3EDF5] text-[#2A517E]'
                          }`}>
                            {isConsultation ? 'Consultation' : 'Prescription'}
                          </span>
                          <strong className="text-xs text-[#334155]">{item.title}</strong>
                        </div>
                        <span className="text-[11px] font-mono text-[#7895AE] flex items-center gap-1">
                          <Clock size={11} /> {String(item.date).slice(0, 16)}
                        </span>
                      </div>

                      <div className="text-xs text-[#64748B]">
                        Attending: <strong className="text-[#334155]">{item.doctor_name}</strong> • {item.doctor_specialization}
                      </div>

                      {isConsultation ? (
                        <div className="space-y-1.5 text-xs">
                          {item.symptoms && (
                            <p className="text-[#64748B]"><strong className="text-[#334155]">Symptoms:</strong> {item.symptoms}</p>
                          )}
                          {item.treatment_notes && (
                            <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E8EDF2] text-[#334155]">
                              {item.treatment_notes}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-[#64748B]">
                          Dosage: <strong className="text-[#334155]">{item.dosage}</strong> • Status: {item.status || 'Active'}
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

      {/* 2. CONSULTATIONS VIEW */}
      {viewMode === 'consultations' && (
        <div className="space-y-3">
          {filteredConsultations.length === 0 ? (
            <div className="text-center py-10 text-[#64748B] text-xs bg-white rounded-xl border border-[#E8EDF2]">
              No consultation records found.
            </div>
          ) : (
            filteredConsultations.map((c) => (
              <div key={c.id} className="bg-white rounded-xl p-4 border border-[#E8EDF2] shadow-xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#E8EDF2] pb-2">
                  <div>
                    <h4 className="text-xs font-bold text-[#334155]">{c.diagnosis}</h4>
                    <span className="text-[11px] text-[#64748B]">Dr. {c.doctor_name} • {c.hospital_name}</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#7895AE]">
                    {String(c.consultation_date).slice(0, 10)}
                  </span>
                </div>

                {c.treatment_notes && (
                  <p className="text-xs text-[#64748B] bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E8EDF2]">
                    {c.treatment_notes}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 3. DIAGNOSTIC REPORTS VIEW */}
      {viewMode === 'reports' && (
        <div className="space-y-3">
          {medicalReports.length === 0 ? (
            <div className="text-center py-10 text-[#64748B] text-xs bg-white rounded-xl border border-[#E8EDF2]">
              No lab or diagnostic reports attached to patient records.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {medicalReports.map((report, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl border border-[#E8EDF2] shadow-xs space-y-2 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-[#334155]">{report.title}</h4>
                      <span className="text-[10px] text-[#5B9A94] font-semibold">{report.type || 'Lab Investigation'}</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#7895AE]">{report.date}</span>
                  </div>
                  <p className="text-[#64748B] bg-[#F8FAFC] p-2 rounded-lg border border-[#E8EDF2]">
                    {report.findings}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* RECORD NEW CONSULTATION MODAL */}
      {isRecordingConsultation && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8EDF2] rounded-xl max-w-lg w-full p-6 shadow-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E8EDF2] pb-3">
              <h3 className="text-sm font-bold text-[#334155] flex items-center gap-2">
                <Stethoscope size={16} className="text-[#5B9A94]" /> Record New Consultation
              </h3>
              <button onClick={() => setIsRecordingConsultation(false)} className="text-[#64748B] hover:text-[#334155]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordConsultationSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#334155] font-semibold mb-1">Clinical Diagnosis *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acute Gastritis with Dyspepsia"
                  value={newConsultation.diagnosis}
                  onChange={(e) => setNewConsultation({ ...newConsultation, diagnosis: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E8EDF2] rounded-lg px-3 py-2 text-[#334155]"
                />
              </div>

              <div>
                <label className="block text-[#334155] font-semibold mb-1">Reported Symptoms</label>
                <input
                  type="text"
                  placeholder="e.g. Burning stomach pain, bloating"
                  value={newConsultation.symptoms}
                  onChange={(e) => setNewConsultation({ ...newConsultation, symptoms: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E8EDF2] rounded-lg px-3 py-2 text-[#334155]"
                />
              </div>

              <div>
                <label className="block text-[#334155] font-semibold mb-1">Treatment &amp; Clinical Notes</label>
                <textarea
                  rows={2}
                  placeholder="Clinical assessment and dietary advice..."
                  value={newConsultation.treatment_notes}
                  onChange={(e) => setNewConsultation({ ...newConsultation, treatment_notes: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E8EDF2] rounded-lg px-3 py-2 text-[#334155]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E8EDF2]">
                <button
                  type="button"
                  onClick={() => setIsRecordingConsultation(false)}
                  className="px-4 py-2 bg-white text-[#64748B] font-semibold rounded-lg border border-[#E8EDF2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={consultationSubmitting}
                  className="px-4 py-2 bg-[#5B9A94] hover:bg-[#487B76] text-white font-semibold rounded-lg shadow-xs"
                >
                  {consultationSubmitting ? 'Saving...' : 'Save Encounter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSOCIATE DOCTOR MODAL */}
      {isAssociatingDoctor && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8EDF2] rounded-xl max-w-md w-full p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8EDF2] pb-3">
              <h3 className="text-sm font-bold text-[#334155] flex items-center gap-2">
                <UserPlus size={16} className="text-[#5B9A94]" /> Associate Doctor
              </h3>
              <button onClick={() => setIsAssociatingDoctor(false)} className="text-[#64748B] hover:text-[#334155]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssociateDoctorSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#334155] font-semibold mb-1">Select Doctor *</label>
                <select
                  value={associationForm.doctor_id}
                  onChange={(e) => setAssociationForm({ ...associationForm, doctor_id: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E8EDF2] rounded-lg px-3 py-2 text-[#334155]"
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
                <label className="block text-[#334155] font-semibold mb-1">Relationship Role</label>
                <select
                  value={associationForm.relationship_type}
                  onChange={(e) => setAssociationForm({ ...associationForm, relationship_type: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E8EDF2] rounded-lg px-3 py-2 text-[#334155]"
                >
                  <option value="treating">Treating Physician</option>
                  <option value="consulting">Consulting Specialist</option>
                  <option value="previous">Previous Doctor</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E8EDF2]">
                <button
                  type="button"
                  onClick={() => setIsAssociatingDoctor(false)}
                  className="px-4 py-2 bg-white text-[#64748B] font-semibold rounded-lg border border-[#E8EDF2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={associatingLoading}
                  className="px-4 py-2 bg-[#5B9A94] hover:bg-[#487B76] text-white font-semibold rounded-lg shadow-xs"
                >
                  {associatingLoading ? 'Associating...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

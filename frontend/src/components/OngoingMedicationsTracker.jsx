import React, { useState, useEffect } from 'react';
import {
  Pill, Clock, Calendar, AlertCircle, CheckCircle2, X, RefreshCw,
  Activity, ShieldAlert, AlertTriangle, Stethoscope, Building2,
  ChevronRight, Filter, Plus, FileText, Check, ShieldCheck
} from 'lucide-react';
import { getPatientMedications, updatePrescriptionStatus } from '../services/api';

export default function OngoingMedicationsTracker({
  patient,
  currentDoctor,
  onNavigateToPrescribe
}) {
  const [loading, setLoading] = useState(true);
  const [medData, setMedData] = useState(null);
  const [activeFilter, setActiveFilter] = useState('active'); // 'active' | 'completed' | 'discontinued' | 'historical' | 'all'
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Status Change Modal State
  const [statusModalMed, setStatusModalMed] = useState(null);
  const [newStatus, setNewStatus] = useState('completed');
  const [discontinuedReason, setDiscontinuedReason] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);

  const patientId = patient?.id;

  useEffect(() => {
    if (patientId) {
      loadMedications();
    }
  }, [patientId]);

  const loadMedications = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getPatientMedications(patientId);
      setMedData(data);
    } catch (err) {
      console.error('Failed to load medications:', err);
      setError(err.message || 'Failed to fetch medications.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStatusModal = (med, targetStatus) => {
    setStatusModalMed(med);
    setNewStatus(targetStatus || 'completed');
    setDiscontinuedReason(med.discontinued_reason || '');
    setDoctorNotes('');
  };

  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault();
    if (!statusModalMed) return;
    setStatusUpdating(true);
    setError('');
    try {
      await updatePrescriptionStatus(statusModalMed.id, {
        status: newStatus,
        discontinued_reason: newStatus === 'discontinued' ? (discontinuedReason || 'Medication discontinued per clinical advice.') : '',
        doctor_notes: doctorNotes
      });
      setSuccess(`Updated ${statusModalMed.drug_name} status to '${newStatus}'. Complete history preserved.`);
      setStatusModalMed(null);
      await loadMedications();
    } catch (err) {
      setError(err.message || 'Failed to update medication status.');
    } finally {
      setStatusUpdating(false);
      setTimeout(() => setSuccess(''), 4000);
    }
  };

  const counts = medData?.counts || { active: 0, completed: 0, discontinued: 0, historical: 0, total: 0 };
  const allMeds = medData?.all || [];

  const getFilteredList = () => {
    if (!medData) return [];
    if (activeFilter === 'active') return medData.active || [];
    if (activeFilter === 'completed') return medData.completed || [];
    if (activeFilter === 'discontinued') return medData.discontinued || [];
    if (activeFilter === 'historical') return medData.historical || [];
    return medData.all || [];
  };

  const currentList = getFilteredList();

  if (loading && !medData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] text-slate-400 space-y-3">
        <Activity className="animate-spin text-cyan-400" size={32} />
        <p className="text-sm font-medium">Tracking ongoing and multi-doctor medications...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SUCCESS / ERROR NOTIFICATIONS */}
      {success && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl flex items-center gap-3 text-emerald-300 text-sm animate-fade-in shadow-lg">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 bg-red-950/60 border border-red-500/40 rounded-2xl flex items-center gap-3 text-red-300 text-sm animate-fade-in shadow-lg">
          <AlertCircle size={18} className="text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TOP HEADER SUMMARY BAR */}
      <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
              <Pill size={22} className="rotate-45" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Ongoing & Historical Medication Management</h2>
              <p className="text-xs text-slate-400">
                Prescriptions prescribed across treating and consulting physicians for <strong>{patient?.name}</strong>
              </p>
            </div>
          </div>
        </div>

        {onNavigateToPrescribe && (
          <button
            onClick={onNavigateToPrescribe}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/30 shrink-0"
          >
            <Plus size={15} />
            Prescribe New Medication
          </button>
        )}
      </div>

      {/* FILTER TABS WITH LIVE COUNTS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setActiveFilter('active')}
          className={`p-3.5 rounded-2xl border transition text-left cursor-pointer ${
            activeFilter === 'active'
              ? 'bg-emerald-950/40 border-emerald-500/60 shadow-lg shadow-emerald-950/40'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-400">
            <span className="font-bold">Ongoing Active</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <p className="text-2xl font-black text-white mt-1">{counts.active}</p>
          <span className="text-[10px] text-slate-400">Currently taking</span>
        </button>

        <button
          onClick={() => setActiveFilter('completed')}
          className={`p-3.5 rounded-2xl border transition text-left cursor-pointer ${
            activeFilter === 'completed'
              ? 'bg-blue-950/40 border-blue-500/60 shadow-lg shadow-blue-950/40'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-blue-400">
            <span className="font-bold">Completed Courses</span>
            <Check size={14} />
          </div>
          <p className="text-2xl font-black text-white mt-1">{counts.completed}</p>
          <span className="text-[10px] text-slate-400">Therapy finished</span>
        </button>

        <button
          onClick={() => setActiveFilter('discontinued')}
          className={`p-3.5 rounded-2xl border transition text-left cursor-pointer ${
            activeFilter === 'discontinued'
              ? 'bg-red-950/40 border-red-500/60 shadow-lg shadow-red-950/40'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-red-400">
            <span className="font-bold">Discontinued</span>
            <ShieldAlert size={14} />
          </div>
          <p className="text-2xl font-black text-white mt-1">{counts.discontinued}</p>
          <span className="text-[10px] text-slate-400">Stopped with reason</span>
        </button>

        <button
          onClick={() => setActiveFilter('historical')}
          className={`p-3.5 rounded-2xl border transition text-left cursor-pointer ${
            activeFilter === 'historical'
              ? 'bg-purple-950/40 border-purple-500/60 shadow-lg shadow-purple-950/40'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-purple-400">
            <span className="font-bold">Historical</span>
            <Clock size={14} />
          </div>
          <p className="text-2xl font-black text-white mt-1">{counts.historical}</p>
          <span className="text-[10px] text-slate-400">Past medical logs</span>
        </button>

        <button
          onClick={() => setActiveFilter('all')}
          className={`p-3.5 rounded-2xl border transition text-left cursor-pointer col-span-2 sm:col-span-1 ${
            activeFilter === 'all'
              ? 'bg-slate-800 border-slate-600 shadow-lg'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-bold">Complete Archive</span>
            <FileText size={14} />
          </div>
          <p className="text-2xl font-black text-white mt-1">{counts.total}</p>
          <span className="text-[10px] text-slate-400">All recorded drugs</span>
        </button>
      </div>

      {/* MEDICATION CARDS LIST */}
      <div className="space-y-4">
        {currentList.length === 0 ? (
          <div className="text-center py-14 bg-slate-900 rounded-3xl border border-slate-800 text-slate-400 text-xs">
            No medications found under the <strong>'{activeFilter}'</strong> category.
          </div>
        ) : (
          currentList.map((med) => {
            const isActive = med.status === 'active';
            const isCompleted = med.status === 'completed';
            const isDiscontinued = med.status === 'discontinued';
            const isHistorical = med.status === 'historical';

            return (
              <div
                key={med.id}
                className={`bg-slate-900 rounded-3xl p-5 sm:p-6 border transition shadow-xl space-y-4 ${
                  isActive
                    ? 'border-emerald-500/30 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/20'
                    : isDiscontinued
                    ? 'border-red-500/30 bg-gradient-to-r from-slate-900 via-slate-900 to-red-950/20'
                    : 'border-slate-800'
                }`}
              >
                {/* Medicine Title & Status Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-lg font-black text-white">{med.drug_name}</span>
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

                    {/* Prescribing Doctor Attribution */}
                    <div className="text-xs text-slate-300 flex flex-wrap items-center gap-1.5">
                      <Stethoscope size={13} className="text-blue-400 shrink-0" />
                      <span>Prescribed by: <strong className="text-white">{med.doctor_name || 'Attending Physician'}</strong></span>
                      <span className="text-slate-500">|</span>
                      <span className="text-slate-400">{med.doctor_specialization || 'Internal Medicine'}</span>
                      {med.doctor_hospital && (
                        <>
                          <span className="text-slate-500">|</span>
                          <span className="text-slate-400 font-normal">{med.doctor_hospital}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* AI Prediction Ratings & Date */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 text-xs">
                    <span className="font-mono text-[11px] text-slate-400">
                      Rx Date: {String(med.created_at).slice(0, 10)}
                    </span>
                    <div className="flex items-center gap-2 font-bold">
                      <span className="text-emerald-400">Efficacy: {med.effectiveness_pct || 75}%</span>
                      <span className="text-slate-600">•</span>
                      <span className={med.overall_risk === 'HIGH' ? 'text-red-400' : 'text-slate-400'}>
                        Risk: {med.overall_risk || 'LOW'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Clinical Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Frequency & Timing
                    </span>
                    <span className="font-semibold text-white">{med.frequency || 'Once daily'}</span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Course Duration / Period
                    </span>
                    <span className="font-semibold text-slate-200">
                      {med.start_date || 'Start Date'} → {med.end_date || 'Ongoing'}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Clinical Instructions
                    </span>
                    <span className="font-medium text-cyan-300">
                      {med.instructions || 'Take with water as directed by physician.'}
                    </span>
                  </div>
                </div>

                {/* Doctor Notes & Discontinued Reason */}
                {med.doctor_notes && (
                  <div className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                    <span className="text-slate-400 font-semibold">Doctor Notes: </span>
                    {med.doctor_notes}
                  </div>
                )}

                {isDiscontinued && med.discontinued_reason && (
                  <div className="text-xs bg-red-950/40 p-3 rounded-2xl border border-red-500/30 text-red-200 flex items-start gap-2">
                    <ShieldAlert size={15} className="text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-red-300">Discontinuation Reason: </strong>
                      {med.discontinued_reason}
                    </div>
                  </div>
                )}

                {/* Actions Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/60">
                  <span className="text-[11px] text-slate-500 font-mono">Prescription Record ID #{med.id}</span>

                  <div className="flex items-center gap-2 text-xs">
                    {isActive && (
                      <>
                        <button
                          onClick={() => handleOpenStatusModal(med, 'completed')}
                          className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-xl font-bold transition cursor-pointer"
                        >
                          Mark Completed
                        </button>
                        <button
                          onClick={() => handleOpenStatusModal(med, 'discontinued')}
                          className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-xl font-bold transition cursor-pointer"
                        >
                          Discontinue Medicine
                        </button>
                      </>
                    )}

                    {(isCompleted || isDiscontinued || isHistorical) && (
                      <button
                        onClick={() => handleOpenStatusModal(med, 'active')}
                        className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-xl font-bold transition cursor-pointer"
                      >
                        Re-Activate Medication
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* UPDATE STATUS MODAL */}
      {statusModalMed && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Pill size={18} className="text-cyan-400" />
                Update Medication Status: {statusModalMed.drug_name}
              </h3>
              <button onClick={() => setStatusModalMed(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateStatusSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white cursor-pointer"
                >
                  <option value="active">Active (Ongoing Medication)</option>
                  <option value="completed">Completed (Finished Treatment Course)</option>
                  <option value="discontinued">Discontinued (Stopped / Replaced)</option>
                  <option value="historical">Historical (Archived Record)</option>
                </select>
              </div>

              {newStatus === 'discontinued' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Reason for Discontinuation *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. Mild allergic rash observed, replaced with alternative PPI therapy..."
                    value={discontinuedReason}
                    onChange={(e) => setDiscontinuedReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Doctor Follow-up Notes</label>
                <input
                  type="text"
                  placeholder="Optional clinical notes regarding this status change..."
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStatusModalMed(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={statusUpdating}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/30"
                >
                  {statusUpdating ? <Activity size={14} className="animate-spin" /> : <Check size={14} />}
                  Confirm Status Change
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

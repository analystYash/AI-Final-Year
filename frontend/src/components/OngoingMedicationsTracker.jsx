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
  onNavigateToPrescribe,
  onRefresh
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
      setSuccess(`Updated ${statusModalMed.drug_name} status to '${newStatus}'.`);
      setStatusModalMed(null);
      await loadMedications();
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.message || 'Failed to update medication status.');
    } finally {
      setStatusUpdating(false);
      setTimeout(() => setSuccess(''), 4000);
    }
  };

  const counts = medData?.counts || { active: 0, completed: 0, discontinued: 0, historical: 0, total: 0 };

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
      <div className="flex flex-col items-center justify-center min-h-[250px] text-[#64748B] space-y-3">
        <Activity className="animate-spin text-[#5B9A94]" size={28} />
        <p className="text-xs font-medium">Tracking ongoing and multi-doctor medications...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SUCCESS / ERROR NOTIFICATIONS */}
      {success && (
        <div className="p-3 bg-[#DDECE2] border border-[#DDECE2] rounded-xl flex items-center gap-2.5 text-[#24593E] text-xs font-semibold shadow-xs">
          <CheckCircle2 size={16} className="text-[#24593E] shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="p-3 bg-[#F3DEDE] border border-[#F3DEDE] rounded-xl flex items-center gap-2.5 text-[#962A2A] text-xs font-semibold shadow-xs">
          <AlertCircle size={16} className="text-[#962A2A] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TOP HEADER SUMMARY BAR */}
      <div className="bg-white rounded-xl p-5 border border-[#E8EDF2] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#EBF3F2] text-[#487B76] flex items-center justify-center">
              <Pill size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#334155]">Ongoing &amp; Historical Medication Management</h2>
              <p className="text-xs text-[#64748B]">
                Prescriptions prescribed across treating physicians for <strong>{patient?.name}</strong>
              </p>
            </div>
          </div>
        </div>

        {onNavigateToPrescribe && (
          <button
            onClick={onNavigateToPrescribe}
            className="px-3.5 py-2 bg-[#5B9A94] hover:bg-[#487B76] text-white font-semibold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
          >
            <Plus size={14} /> Prescribe New Medication
          </button>
        )}
      </div>

      {/* FILTER TABS WITH COUNTS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setActiveFilter('active')}
          className={`p-3 rounded-xl border transition text-left cursor-pointer ${
            activeFilter === 'active'
              ? 'bg-[#EBF3F2] border-[#5B9A94] text-[#487B76]'
              : 'bg-white border-[#E8EDF2] hover:bg-[#F8FAFC]'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#24593E]">Ongoing Active</span>
            <span className="w-2 h-2 rounded-full bg-[#24593E]"></span>
          </div>
          <p className="text-xl font-bold text-[#334155] mt-1">{counts.active}</p>
          <span className="text-[10px] text-[#7895AE]">Currently taking</span>
        </button>

        <button
          onClick={() => setActiveFilter('completed')}
          className={`p-3 rounded-xl border transition text-left cursor-pointer ${
            activeFilter === 'completed'
              ? 'bg-[#EBF3F2] border-[#5B9A94] text-[#487B76]'
              : 'bg-white border-[#E8EDF2] hover:bg-[#F8FAFC]'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#2A517E]">Completed</span>
            <Check size={13} className="text-[#2A517E]" />
          </div>
          <p className="text-xl font-bold text-[#334155] mt-1">{counts.completed}</p>
          <span className="text-[10px] text-[#7895AE]">Finished course</span>
        </button>

        <button
          onClick={() => setActiveFilter('discontinued')}
          className={`p-3 rounded-xl border transition text-left cursor-pointer ${
            activeFilter === 'discontinued'
              ? 'bg-[#EBF3F2] border-[#5B9A94] text-[#487B76]'
              : 'bg-white border-[#E8EDF2] hover:bg-[#F8FAFC]'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#962A2A]">Discontinued</span>
            <ShieldAlert size={13} className="text-[#962A2A]" />
          </div>
          <p className="text-xl font-bold text-[#334155] mt-1">{counts.discontinued}</p>
          <span className="text-[10px] text-[#7895AE]">Stopped with reason</span>
        </button>

        <button
          onClick={() => setActiveFilter('historical')}
          className={`p-3 rounded-xl border transition text-left cursor-pointer ${
            activeFilter === 'historical'
              ? 'bg-[#EBF3F2] border-[#5B9A94] text-[#487B76]'
              : 'bg-white border-[#E8EDF2] hover:bg-[#F8FAFC]'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#785200]">Historical</span>
            <Clock size={13} className="text-[#785200]" />
          </div>
          <p className="text-xl font-bold text-[#334155] mt-1">{counts.historical}</p>
          <span className="text-[10px] text-[#7895AE]">Archived logs</span>
        </button>

        <button
          onClick={() => setActiveFilter('all')}
          className={`p-3 rounded-xl border transition text-left cursor-pointer col-span-2 sm:col-span-1 ${
            activeFilter === 'all'
              ? 'bg-[#EBF3F2] border-[#5B9A94] text-[#487B76]'
              : 'bg-white border-[#E8EDF2] hover:bg-[#F8FAFC]'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#334155]">All Drugs</span>
            <FileText size={13} className="text-[#7895AE]" />
          </div>
          <p className="text-xl font-bold text-[#334155] mt-1">{counts.total}</p>
          <span className="text-[10px] text-[#7895AE]">Complete formulary</span>
        </button>
      </div>

      {/* MEDICATION CARDS LIST */}
      <div className="space-y-4">
        {currentList.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-[#E8EDF2] text-[#64748B] text-xs">
            No medications found under the <strong>'{activeFilter}'</strong> category.
          </div>
        ) : (
          currentList.map((med) => {
            const isActive = med.status === 'active';
            const isCompleted = med.status === 'completed';
            const isDiscontinued = med.status === 'discontinued';

            return (
              <div
                key={med.id}
                className="bg-white rounded-xl p-5 border border-[#E8EDF2] shadow-xs space-y-3"
              >
                {/* Title & Status Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8EDF2] pb-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-[#334155]">{med.drug_name}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#F8FAFC] border border-[#E8EDF2] text-[#334155]">
                        {med.dosage}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        isActive
                          ? 'bg-[#DDECE2] text-[#24593E] border border-[#DDECE2]'
                          : isCompleted
                          ? 'bg-[#E3EDF5] text-[#2A517E] border border-[#E3EDF5]'
                          : isDiscontinued
                          ? 'bg-[#F3DEDE] text-[#962A2A] border border-[#F3DEDE]'
                          : 'bg-[#F8FAFC] text-[#64748B]'
                      }`}>
                        {med.status || 'Active'}
                      </span>
                    </div>

                    <div className="text-xs text-[#64748B] flex flex-wrap items-center gap-1.5">
                      <Stethoscope size={13} className="text-[#5B9A94] shrink-0" />
                      <span>Prescribed by: <strong className="text-[#334155]">{med.doctor_name || 'Attending Physician'}</strong></span>
                      <span className="text-[#CBD5E1]">|</span>
                      <span>{med.doctor_specialization || 'Internal Medicine'}</span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 text-xs">
                    <span className="font-mono text-[11px] text-[#7895AE]">
                      Rx Date: {String(med.created_at || '').slice(0, 10)}
                    </span>
                    <div className="flex items-center gap-2 font-semibold">
                      <span className="text-[#24593E]">Efficacy: {med.effectiveness_pct || 75}%</span>
                      <span className="text-[#CBD5E1]">•</span>
                      <span className={med.overall_risk === 'HIGH' ? 'text-[#962A2A]' : 'text-[#64748B]'}>
                        Risk: {med.overall_risk || 'LOW'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E8EDF2]">
                    <span className="text-[10px] font-semibold text-[#7895AE] block">Frequency &amp; Timing</span>
                    <span className="font-semibold text-[#334155]">{med.frequency || 'Once daily'}</span>
                  </div>

                  <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E8EDF2]">
                    <span className="text-[10px] font-semibold text-[#7895AE] block">Duration Period</span>
                    <span className="font-semibold text-[#334155]">
                      {med.start_date || 'Start'} → {med.end_date || 'Ongoing'}
                    </span>
                  </div>

                  <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E8EDF2]">
                    <span className="text-[10px] font-semibold text-[#7895AE] block">Clinical Instructions</span>
                    <span className="font-medium text-[#487B76]">
                      {med.instructions || 'Take with water as directed.'}
                    </span>
                  </div>
                </div>

                {/* Doctor Notes */}
                {med.doctor_notes && (
                  <div className="text-xs text-[#64748B] bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E8EDF2]">
                    <strong className="text-[#334155]">Notes: </strong>{med.doctor_notes}
                  </div>
                )}

                {/* Discontinuation Reason */}
                {isDiscontinued && med.discontinued_reason && (
                  <div className="text-xs bg-[#F3DEDE] p-2.5 rounded-lg border border-[#F3DEDE] text-[#962A2A] flex items-start gap-2">
                    <ShieldAlert size={14} className="text-[#962A2A] shrink-0 mt-0.5" />
                    <div>
                      <strong>Discontinuation Reason: </strong>{med.discontinued_reason}
                    </div>
                  </div>
                )}

                {/* Actions Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E8EDF2]">
                  <span className="text-[11px] text-[#7895AE] font-mono">Prescription Record ID #{med.id}</span>

                  <div className="flex items-center gap-2 text-xs">
                    {isActive && (
                      <>
                        <button
                          onClick={() => handleOpenStatusModal(med, 'completed')}
                          className="px-2.5 py-1 bg-[#E3EDF5] hover:bg-[#2A517E] text-[#2A517E] hover:text-white rounded-md font-semibold transition cursor-pointer"
                        >
                          Mark Completed
                        </button>
                        <button
                          onClick={() => handleOpenStatusModal(med, 'discontinued')}
                          className="px-2.5 py-1 bg-[#F3DEDE] hover:bg-[#962A2A] text-[#962A2A] hover:text-white rounded-md font-semibold transition cursor-pointer"
                        >
                          Discontinue Medicine
                        </button>
                      </>
                    )}

                    {!isActive && (
                      <button
                        onClick={() => handleOpenStatusModal(med, 'active')}
                        className="px-2.5 py-1 bg-[#DDECE2] hover:bg-[#24593E] text-[#24593E] hover:text-white rounded-md font-semibold transition cursor-pointer"
                      >
                        Re-Activate
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8EDF2] rounded-xl max-w-md w-full p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8EDF2] pb-3">
              <h3 className="text-sm font-bold text-[#334155] flex items-center gap-2">
                <Pill size={16} className="text-[#5B9A94]" />
                Update Status: {statusModalMed.drug_name}
              </h3>
              <button onClick={() => setStatusModalMed(null)} className="text-[#64748B] hover:text-[#334155] cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateStatusSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#334155] font-semibold mb-1">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E8EDF2] rounded-lg px-3 py-2 text-[#334155] cursor-pointer"
                >
                  <option value="active">Active (Ongoing Medication)</option>
                  <option value="completed">Completed (Finished Treatment Course)</option>
                  <option value="discontinued">Discontinued (Stopped / Replaced)</option>
                  <option value="historical">Historical (Archived Record)</option>
                </select>
              </div>

              {newStatus === 'discontinued' && (
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Reason for Discontinuation *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. Mild allergic rash observed, replaced with alternative therapy..."
                    value={discontinuedReason}
                    onChange={(e) => setDiscontinuedReason(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#E8EDF2] rounded-lg px-3 py-2 text-[#334155]"
                  />
                </div>
              )}

              <div>
                <label className="block text-[#334155] font-semibold mb-1">Doctor Follow-up Notes</label>
                <input
                  type="text"
                  placeholder="Optional clinical notes regarding this status change..."
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E8EDF2] rounded-lg px-3 py-2 text-[#334155]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8EDF2]">
                <button
                  type="button"
                  onClick={() => setStatusModalMed(null)}
                  className="px-4 py-2 bg-white text-[#64748B] font-semibold rounded-lg border border-[#E8EDF2] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={statusUpdating}
                  className="px-4 py-2 bg-[#5B9A94] hover:bg-[#487B76] text-white font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
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

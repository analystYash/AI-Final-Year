import React, { useState, useEffect } from 'react';
import {
  User, Award, Building2, Phone, Mail, Calendar, Clock, Edit3,
  Save, X, CheckCircle2, ShieldCheck, Users, Pill, FileText,
  Activity, Stethoscope, ChevronRight, AlertCircle, Sparkles, MapPin
} from 'lucide-react';
import { getDoctorProfile, updateDoctorProfile } from '../services/api';

export default function DoctorProfileView({ doctor, onProfileUpdated, onSelectPatient }) {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  // Editable form state
  const [editForm, setEditForm] = useState({
    name: '',
    specialization: '',
    hospital_name: '',
    license_number: '',
    qualifications: '',
    experience_years: 10,
    phone: '',
    clinic_address: '',
    availability: '',
    bio: '',
    department: '',
    profile_picture: ''
  });

  const doctorId = doctor?.id || 1;

  useEffect(() => {
    fetchProfile();
  }, [doctorId]);

  const fetchProfile = async () => {
    setLoading(true);
    setSaveError('');
    try {
      const data = await getDoctorProfile(doctorId);
      setProfileData(data);
      if (data?.doctor) {
        setEditForm({
          name: data.doctor.name || '',
          specialization: data.doctor.specialization || '',
          hospital_name: data.doctor.hospital_name || '',
          license_number: data.doctor.license_number || '',
          qualifications: data.doctor.qualifications || 'MBBS, MD',
          experience_years: data.doctor.experience_years || 10,
          phone: data.doctor.phone || '+91 98201 12345',
          clinic_address: data.doctor.clinic_address || '',
          availability: data.doctor.availability || 'Mon - Fri, 09:00 AM - 04:00 PM',
          bio: data.doctor.bio || '',
          department: data.doctor.department || data.doctor.specialization || '',
          profile_picture: data.doctor.profile_picture || ''
        });
      }
    } catch (err) {
      console.error('Failed to load doctor profile:', err);
      setSaveError(err.message || 'Failed to fetch doctor profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const res = await updateDoctorProfile(doctorId, editForm);
      setSaveSuccess('Doctor profile updated successfully!');
      setIsEditing(false);
      // Update local storage doctor if currently logged in
      const currentStored = localStorage.getItem('drugai_doctor');
      if (currentStored) {
        try {
          const parsed = JSON.parse(currentStored);
          if (parsed.id === doctorId) {
            const merged = { ...parsed, ...res.doctor };
            localStorage.setItem('drugai_doctor', JSON.stringify(merged));
          }
        } catch (e) {
          console.error(e);
        }
      }
      if (onProfileUpdated) onProfileUpdated(res.doctor);
      await fetchProfile();
    } catch (err) {
      setSaveError(err.message || 'Failed to update profile.');
    } finally {
      setSaveLoading(false);
      setTimeout(() => setSaveSuccess(''), 4000);
    }
  };

  const doc = profileData?.doctor || doctor || {};
  const stats = profileData?.stats || {
    total_patients: profileData?.associated_patients?.length || 0,
    total_consultations: profileData?.consultations?.length || 0,
    total_prescriptions: profileData?.prescriptions?.length || 0,
    active_prescriptions: profileData?.prescriptions?.filter(p => p.status === 'active')?.length || 0,
    upcoming_appointments: profileData?.appointments?.filter(a => a.status === 'confirmed')?.length || 0
  };

  if (loading && !profileData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 space-y-3">
        <Activity className="animate-spin text-blue-500" size={32} />
        <p className="text-sm font-medium">Loading clinical practitioner profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SUCCESS / ERROR NOTIFICATIONS */}
      {saveSuccess && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl flex items-center gap-3 text-emerald-300 text-sm animate-fade-in shadow-lg">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}
      {saveError && (
        <div className="p-3.5 bg-red-950/60 border border-red-500/40 rounded-2xl flex items-center gap-3 text-red-300 text-sm animate-fade-in shadow-lg">
          <AlertCircle size={18} className="text-red-400 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* HEADER HERO PROFILE CARD */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/40 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar / Picture */}
            <div className="relative group">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-0.5 shadow-xl shadow-blue-600/20">
                <div className="w-full h-full bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center">
                  {doc.profile_picture ? (
                    <img src={doc.profile_picture} alt={doc.name} className="w-full h-full object-cover" />
                  ) : (
                    <Stethoscope size={44} className="text-cyan-400" />
                  )}
                </div>
              </div>
              <span className="absolute -bottom-2 -right-2 px-2 py-0.5 bg-emerald-500 text-slate-950 font-bold text-[10px] rounded-full shadow border-2 border-slate-900 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping"></span>
                Active
              </span>
            </div>

            {/* Profile Info */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{doc.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-mono font-bold">
                  DOC-{String(doc.id || doctorId).padStart(3, '0')}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center gap-1">
                  <ShieldCheck size={12} className="text-indigo-400" />
                  Verified Doctor
                </span>
              </div>

              <p className="text-sm font-semibold text-cyan-300 flex items-center gap-1.5">
                <Award size={16} className="text-cyan-400 shrink-0" />
                {doc.specialization || 'Cardiology & Internal Medicine'}
                <span className="text-slate-500">|</span>
                <span className="text-slate-300 font-normal">{doc.qualifications || 'MBBS, MD'}</span>
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-1">
                <span className="flex items-center gap-1">
                  <Building2 size={13} className="text-slate-400" />
                  {doc.hospital_name || 'Apex Multispecialty Hospital'}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={13} className="text-slate-400" />
                  {doc.experience_years || 10} Years Clinical Practice
                </span>
                <span className="flex items-center gap-1 font-mono text-slate-400">
                  <FileText size={13} />
                  Lic: {doc.license_number || 'MH-MED-2021'}
                </span>
              </div>
            </div>
          </div>

          {/* Edit Profile Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-lg ${
                isEditing
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
              }`}
            >
              {isEditing ? (
                <>
                  <X size={15} /> Cancel Editing
                </>
              ) : (
                <>
                  <Edit3 size={15} /> Edit Professional Profile
                </>
              )}
            </button>
          </div>
        </div>

        {/* CLINICAL STATS BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-8 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 rounded-2xl p-3.5 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Associated Patients</span>
              <Users size={15} className="text-blue-400" />
            </div>
            <p className="text-2xl font-black text-white mt-1">{stats.total_patients}</p>
            <span className="text-[10px] text-blue-400 font-medium">Under Care</span>
          </div>

          <div className="bg-slate-950/60 rounded-2xl p-3.5 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Total Consultations</span>
              <Activity size={15} className="text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-white mt-1">{stats.total_consultations}</p>
            <span className="text-[10px] text-emerald-400 font-medium">Clinical Records</span>
          </div>

          <div className="bg-slate-950/60 rounded-2xl p-3.5 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Active Medications</span>
              <Pill size={15} className="text-cyan-400" />
            </div>
            <p className="text-2xl font-black text-white mt-1">{stats.active_prescriptions}</p>
            <span className="text-[10px] text-cyan-400 font-medium">Currently Monitored</span>
          </div>

          <div className="bg-slate-950/60 rounded-2xl p-3.5 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Total Prescriptions</span>
              <FileText size={15} className="text-indigo-400" />
            </div>
            <p className="text-2xl font-black text-white mt-1">{stats.total_prescriptions}</p>
            <span className="text-[10px] text-indigo-400 font-medium">All Time Issued</span>
          </div>

          <div className="bg-slate-950/60 rounded-2xl p-3.5 border border-slate-800/80 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Appointments</span>
              <Calendar size={15} className="text-amber-400" />
            </div>
            <p className="text-2xl font-black text-white mt-1">{stats.upcoming_appointments}</p>
            <span className="text-[10px] text-amber-400 font-medium">Confirmed / Scheduled</span>
          </div>
        </div>
      </div>

      {/* EDIT PROFILE DRAWER / FORM */}
      {isEditing && (
        <form onSubmit={handleSave} className="bg-slate-900 rounded-3xl p-6 border border-blue-500/30 shadow-2xl space-y-5 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
                <Edit3 size={16} />
              </div>
              <h2 className="text-base font-bold text-white">Update Permitted Professional Information</h2>
            </div>
            <span className="text-xs text-slate-400">All updates are instantly synchronized to users database</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Doctor Full Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Clinical Specialization</label>
              <input
                type="text"
                value={editForm.specialization}
                onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Academic Qualifications</label>
              <input
                type="text"
                value={editForm.qualifications}
                onChange={(e) => setEditForm({ ...editForm, qualifications: e.target.value })}
                placeholder="e.g. MBBS, MD (Medicine), DM (Cardiology)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Clinical Experience (Years)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={editForm.experience_years}
                onChange={(e) => setEditForm({ ...editForm, experience_years: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Hospital / Clinic Center</label>
              <input
                type="text"
                value={editForm.hospital_name}
                onChange={(e) => setEditForm({ ...editForm, hospital_name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Medical License / Registration No.</label>
              <input
                type="text"
                value={editForm.license_number}
                onChange={(e) => setEditForm({ ...editForm, license_number: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Official Contact Phone</label>
              <input
                type="text"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="+91 98200 00000"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Consultation Availability Hours</label>
              <input
                type="text"
                value={editForm.availability}
                onChange={(e) => setEditForm({ ...editForm, availability: e.target.value })}
                placeholder="Mon - Fri, 09:00 AM - 04:00 PM"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Profile Avatar Image URL</label>
              <input
                type="text"
                value={editForm.profile_picture}
                onChange={(e) => setEditForm({ ...editForm, profile_picture: e.target.value })}
                placeholder="https://... (or leave empty for stethoscope icon)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-semibold mb-1.5">Clinic Room / Suite Location</label>
              <input
                type="text"
                value={editForm.clinic_address}
                onChange={(e) => setEditForm({ ...editForm, clinic_address: e.target.value })}
                placeholder="Cabin 402, 4th Floor, Apex Multispecialty Hospital, Mumbai"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-slate-300 font-semibold mb-1.5">Clinical Biography & Practitioner Summary</label>
              <textarea
                rows={2}
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                placeholder="Summary of clinical expertise, specialized treatments, and clinical focus..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveLoading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/30"
            >
              {saveLoading ? <Activity size={14} className="animate-spin" /> : <Save size={14} />}
              Save Profile Changes
            </button>
          </div>
        </form>
      )}

      {/* DOCTOR PROFESSIONAL INFORMATION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Stethoscope size={16} className="text-blue-400" />
            Clinical Practice Details
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Doctor Registration ID</span>
              <span className="font-mono font-bold text-white">DOC-{String(doc.id || doctorId).padStart(3, '0')}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Primary Specialization</span>
              <span className="font-semibold text-cyan-300">{doc.specialization}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Department</span>
              <span className="text-slate-200">{doc.department || doc.specialization}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Degrees & Qualifications</span>
              <span className="text-slate-200 font-medium">{doc.qualifications || 'MBBS, MD'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Medical License Number</span>
              <span className="font-mono text-emerald-400">{doc.license_number}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Experience in Practice</span>
              <span className="text-white font-bold">{doc.experience_years || 10} Years</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Building2 size={16} className="text-indigo-400" />
            Hospital & Availability
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Hospital / Medical Center</span>
              <span className="font-semibold text-white">{doc.hospital_name}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Clinic Suite / Room</span>
              <span className="text-slate-200 text-right max-w-xs">{doc.clinic_address || 'Consultant Wing'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Consultation Schedule</span>
              <span className="text-amber-300 font-semibold">{doc.availability || 'Mon - Fri, 09:00 AM - 04:00 PM'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Official Contact</span>
              <span className="text-slate-200 font-mono">{doc.phone || '+91 98201 12345'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Email Address</span>
              <span className="text-blue-400 font-mono">{doc.email}</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles size={16} className="text-amber-400" />
            Professional Biography
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {doc.bio || 'Senior medical specialist with demonstrated competence in evidence-based therapy, clinical pharmacology, patient-centric disease management, and artificial intelligence-assisted drug safety analysis.'}
          </p>
        </div>
      </div>
    </div>
  );
}

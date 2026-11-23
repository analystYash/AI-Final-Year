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
      console.warn('Could not load doctor profile from server:', err);
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
      setSaveSuccess('Doctor profile successfully updated!');
      setIsEditing(false);
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
      <div className="flex flex-col items-center justify-center min-h-[300px] text-[#64748B] space-y-3">
        <Activity className="animate-spin text-[#5B9A94]" size={28} />
        <p className="text-xs font-medium">Loading clinical practitioner profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SUCCESS / ERROR NOTIFICATIONS */}
      {saveSuccess && (
        <div className="p-3 bg-[#DDECE2] border border-[#DDECE2] rounded-xl flex items-center gap-2.5 text-[#24593E] text-xs font-semibold shadow-xs">
          <CheckCircle2 size={16} className="text-[#24593E] shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}
      {saveError && (
        <div className="p-3 bg-[#F3DEDE] border border-[#F3DEDE] rounded-xl flex items-center gap-2.5 text-[#962A2A] text-xs font-semibold shadow-xs">
          <AlertCircle size={16} className="text-[#962A2A] shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* HEADER HERO PROFILE CARD */}
      <div className="bg-white rounded-xl p-6 border border-[#E8EDF2] shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar / Picture */}
            <div className="relative group">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#EBF3F2] border border-[#5B9A94]/25 flex items-center justify-center overflow-hidden">
                {doc.profile_picture ? (
                  <img src={doc.profile_picture} alt={doc.name} className="w-full h-full object-cover" />
                ) : (
                  <Stethoscope size={36} className="text-[#5B9A94]" />
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 px-2 py-0.5 bg-[#DDECE2] text-[#24593E] font-semibold text-[10px] rounded-full border border-[#DDECE2] flex items-center gap-1">
                Active
              </span>
            </div>

            {/* Profile Info */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#334155]">{doc.name}</h1>
                <span className="px-2 py-0.5 rounded-full bg-[#F8FAFC] border border-[#E8EDF2] text-[#7895AE] text-[11px] font-mono font-medium">
                  DOC-{String(doc.id || doctorId).padStart(3, '0')}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#EBF3F2] border border-[#5B9A94]/20 text-[#487B76] text-[11px] font-semibold flex items-center gap-1">
                  <ShieldCheck size={12} className="text-[#5B9A94]" />
                  Verified Practitioner
                </span>
              </div>

              <p className="text-xs font-semibold text-[#5B9A94] flex items-center gap-1.5">
                <Award size={14} className="text-[#5B9A94] shrink-0" />
                {doc.specialization || 'Cardiology & Internal Medicine'}
                <span className="text-[#CBD5E1]">|</span>
                <span className="text-[#64748B] font-normal">{doc.qualifications || 'MBBS, MD'}</span>
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#64748B] pt-1">
                <span className="flex items-center gap-1">
                  <Building2 size={13} className="text-[#7895AE]" />
                  {doc.hospital_name || 'Apex Multispecialty Hospital'}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={13} className="text-[#7895AE]" />
                  {doc.experience_years || 10} Years Clinical Practice
                </span>
                <span className="flex items-center gap-1 font-mono text-[#7895AE]">
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
              className={`px-3.5 py-2 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
                isEditing
                  ? 'bg-white text-[#64748B] hover:bg-[#F8FAFC] border border-[#E8EDF2]'
                  : 'bg-[#5B9A94] hover:bg-[#487B76] text-white'
              }`}
            >
              {isEditing ? (
                <>
                  <X size={14} /> Cancel
                </>
              ) : (
                <>
                  <Edit3 size={14} /> Edit Profile
                </>
              )}
            </button>
          </div>
        </div>

        {/* CLINICAL STATS BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-[#E8EDF2]">
          <div className="bg-[#F8FAFC] rounded-lg p-3 border border-[#E8EDF2]">
            <div className="flex items-center justify-between text-[#64748B] text-xs">
              <span>Patients</span>
              <Users size={14} className="text-[#5B9A94]" />
            </div>
            <p className="text-xl font-bold text-[#334155] mt-1">{stats.total_patients}</p>
            <span className="text-[10px] text-[#7895AE]">Under Care</span>
          </div>

          <div className="bg-[#F8FAFC] rounded-lg p-3 border border-[#E8EDF2]">
            <div className="flex items-center justify-between text-[#64748B] text-xs">
              <span>Consultations</span>
              <Activity size={14} className="text-[#5B9A94]" />
            </div>
            <p className="text-xl font-bold text-[#334155] mt-1">{stats.total_consultations}</p>
            <span className="text-[10px] text-[#7895AE]">Recorded</span>
          </div>

          <div className="bg-[#F8FAFC] rounded-lg p-3 border border-[#E8EDF2]">
            <div className="flex items-center justify-between text-[#64748B] text-xs">
              <span>Active Meds</span>
              <Pill size={14} className="text-[#5B9A94]" />
            </div>
            <p className="text-xl font-bold text-[#334155] mt-1">{stats.active_prescriptions}</p>
            <span className="text-[10px] text-[#7895AE]">Monitored</span>
          </div>

          <div className="bg-[#F8FAFC] rounded-lg p-3 border border-[#E8EDF2]">
            <div className="flex items-center justify-between text-[#64748B] text-xs">
              <span>Prescriptions</span>
              <FileText size={14} className="text-[#5B9A94]" />
            </div>
            <p className="text-xl font-bold text-[#334155] mt-1">{stats.total_prescriptions}</p>
            <span className="text-[10px] text-[#7895AE]">Issued</span>
          </div>

          <div className="bg-[#F8FAFC] rounded-lg p-3 border border-[#E8EDF2] col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-[#64748B] text-xs">
              <span>Appointments</span>
              <Calendar size={14} className="text-[#5B9A94]" />
            </div>
            <p className="text-xl font-bold text-[#334155] mt-1">{stats.upcoming_appointments}</p>
            <span className="text-[10px] text-[#7895AE]">Scheduled</span>
          </div>
        </div>
      </div>

      {/* EDIT PROFILE FORM */}
      {isEditing && (
        <form onSubmit={handleSave} className="bg-white rounded-xl p-6 border border-[#E8EDF2] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8EDF2] pb-3">
            <h2 className="text-sm font-bold text-[#334155]">Update Professional Information</h2>
            <span className="text-xs text-[#64748B]">Changes are synchronized to hospital credentials</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-[#334155] font-semibold mb-1">Doctor Full Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#E8EDF2] rounded-lg px-3 py-2 text-[#334155] focus:outline-none focus:border-[#5B9A94]"
                required
              />
            </div>

            <div>
              <label className="block text-[#334155] font-semibold mb-1">Clinical Specialization</label>
              <input
                type="text"
                value={editForm.specialization}
                onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#E8EDF2] rounded-lg px-3 py-2 text-[#334155] focus:outline-none focus:border-[#5B9A94]"
                required
              />
            </div>

            <div>
              <label className="block text-[#334155] font-semibold mb-1">Academic Qualifications</label>
              <input
                type="text"
                value={editForm.qualifications}
                onChange={(e) => setEditForm({ ...editForm, qualifications: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#E8EDF2] rounded-lg px-3 py-2 text-[#334155] focus:outline-none focus:border-[#5B9A94]"
              />
            </div>

            <div>
              <label className="block text-[#334155] font-semibold mb-1">Experience (Years)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={editForm.experience_years}
                onChange={(e) => setEditForm({ ...editForm, experience_years: parseInt(e.target.value) || 0 })}
                className="w-full bg-[#F8FAFC] border border-[#E8EDF2] rounded-lg px-3 py-2 text-[#334155] focus:outline-none focus:border-[#5B9A94]"
              />
            </div>

            <div>
              <label className="block text-[#334155] font-semibold mb-1">Hospital / Medical Center</label>
              <input
                type="text"
                value={editForm.hospital_name}
                onChange={(e) => setEditForm({ ...editForm, hospital_name: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#E8EDF2] rounded-lg px-3 py-2 text-[#334155] focus:outline-none focus:border-[#5B9A94]"
              />
            </div>

            <div>
              <label className="block text-[#334155] font-semibold mb-1">Medical License No.</label>
              <input
                type="text"
                value={editForm.license_number}
                onChange={(e) => setEditForm({ ...editForm, license_number: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#E8EDF2] rounded-lg px-3 py-2 text-[#334155] focus:outline-none focus:border-[#5B9A94] font-mono"
              />
            </div>

            <div>
              <label className="block text-[#334155] font-semibold mb-1">Official Phone</label>
              <input
                type="text"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#E8EDF2] rounded-lg px-3 py-2 text-[#334155] focus:outline-none focus:border-[#5B9A94]"
              />
            </div>

            <div>
              <label className="block text-[#334155] font-semibold mb-1">Availability Schedule</label>
              <input
                type="text"
                value={editForm.availability}
                onChange={(e) => setEditForm({ ...editForm, availability: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#E8EDF2] rounded-lg px-3 py-2 text-[#334155] focus:outline-none focus:border-[#5B9A94]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[#334155] font-semibold mb-1">Clinic Room / Suite Location</label>
              <input
                type="text"
                value={editForm.clinic_address}
                onChange={(e) => setEditForm({ ...editForm, clinic_address: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#E8EDF2] rounded-lg px-3 py-2 text-[#334155] focus:outline-none focus:border-[#5B9A94]"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[#334155] font-semibold mb-1">Clinical Biography</label>
              <textarea
                rows={2}
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#E8EDF2] rounded-lg px-3 py-2 text-[#334155] focus:outline-none focus:border-[#5B9A94] text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8EDF2]">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-white hover:bg-[#F8FAFC] text-[#64748B] font-semibold text-xs rounded-lg border border-[#E8EDF2] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveLoading}
              className="px-4 py-2 bg-[#5B9A94] hover:bg-[#487B76] text-white font-semibold text-xs rounded-lg flex items-center gap-2 cursor-pointer shadow-xs"
            >
              {saveLoading ? <Activity size={14} className="animate-spin" /> : <Save size={14} />}
              Save Changes
            </button>
          </div>
        </form>
      )}

      {/* DOCTOR PROFESSIONAL INFORMATION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 border border-[#E8EDF2] shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-[#334155] uppercase tracking-wider flex items-center gap-2 border-b border-[#E8EDF2] pb-2">
            <Stethoscope size={15} className="text-[#5B9A94]" />
            Clinical Practice Details
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-[#E8EDF2]">
              <span className="text-[#64748B]">Registration ID</span>
              <span className="font-mono font-bold text-[#334155]">DOC-{String(doc.id || doctorId).padStart(3, '0')}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E8EDF2]">
              <span className="text-[#64748B]">Primary Specialization</span>
              <span className="font-semibold text-[#5B9A94]">{doc.specialization}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E8EDF2]">
              <span className="text-[#64748B]">Department</span>
              <span className="text-[#334155]">{doc.department || doc.specialization}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E8EDF2]">
              <span className="text-[#64748B]">Qualifications</span>
              <span className="text-[#334155] font-medium">{doc.qualifications || 'MBBS, MD'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E8EDF2]">
              <span className="text-[#64748B]">License Number</span>
              <span className="font-mono text-[#24593E] font-semibold">{doc.license_number}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#64748B]">Experience</span>
              <span className="text-[#334155] font-bold">{doc.experience_years || 10} Years</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#E8EDF2] shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-[#334155] uppercase tracking-wider flex items-center gap-2 border-b border-[#E8EDF2] pb-2">
            <Building2 size={15} className="text-[#7895AE]" />
            Hospital &amp; Availability
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-[#E8EDF2]">
              <span className="text-[#64748B]">Medical Center</span>
              <span className="font-semibold text-[#334155]">{doc.hospital_name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E8EDF2]">
              <span className="text-[#64748B]">Suite / Room</span>
              <span className="text-[#334155] text-right">{doc.clinic_address || 'Consultant Wing'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E8EDF2]">
              <span className="text-[#64748B]">Schedule</span>
              <span className="text-[#785200] font-semibold">{doc.availability || 'Mon - Fri, 09:00 AM - 04:00 PM'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E8EDF2]">
              <span className="text-[#64748B]">Contact</span>
              <span className="text-[#334155] font-mono">{doc.phone || '+91 98201 12345'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#64748B]">Email</span>
              <span className="text-[#2A517E] font-mono">{doc.email || 'dr.sharma@hospital.org'}</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 bg-white rounded-xl p-5 border border-[#E8EDF2] shadow-xs space-y-2">
          <h3 className="text-xs font-bold text-[#334155] uppercase tracking-wider flex items-center gap-2">
            <Sparkles size={15} className="text-[#5B9A94]" />
            Clinical Biography
          </h3>
          <p className="text-xs text-[#64748B] leading-relaxed">
            {doc.bio || 'Senior medical specialist with demonstrated competence in evidence-based therapy, clinical pharmacology, patient-centric disease management, and artificial intelligence-assisted drug safety analysis.'}
          </p>
        </div>
      </div>
    </div>
  );
}

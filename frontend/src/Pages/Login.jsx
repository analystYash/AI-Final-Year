import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, ShieldAlert, Lock, Phone, User, Stethoscope,
  KeyRound, ArrowRight, Activity, CheckCircle2, AlertTriangle, RefreshCw,
  Eye, EyeOff, Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  validatePatientAuth, sendPatientSecureOtp, verifyPatientSecureOtp,
  validateDoctorAuth, verifyDoctorPassword
} from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function Login() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Active top-level selection: 'patient' or 'doctor'
  const [selectedRole, setSelectedRole] = useState('doctor');

  // Common notification banners
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // =========================================================================
  // PATIENT AUTHENTICATION STATE
  // =========================================================================
  const [patientName, setPatientName] = useState('Rahul Verma');
  const [patientMobile, setPatientMobile] = useState('9876543210');
  const [patientId, setPatientId] = useState(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['1', '2', '3', '4', '5', '6']);
  const [otpVerified, setOtpVerified] = useState(false);
  const [devOtpNotice, setDevOtpNotice] = useState('123456');
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // =========================================================================
  // DOCTOR AUTHENTICATION STATE
  // =========================================================================
  const [doctorName, setDoctorName] = useState('Dr. Sharma, MD');
  const [doctorIdentifier, setDoctorIdentifier] = useState('dr.sharma@hospital.org');
  const [doctorPassword, setDoctorPassword] = useState('doctor123');
  const [showPassword, setShowPassword] = useState(false);

  // Cooldown timer countdown
  useEffect(() => {
    let timer;
    if (cooldownRemaining > 0) {
      timer = setInterval(() => {
        setCooldownRemaining((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  // =========================================================================
  // PATIENT AUTHENTICATION WORKFLOW HANDLERS
  // =========================================================================
  const handlePatientSendOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!patientName.trim()) {
      setErrorMessage('Patient Full Name is required.');
      return;
    }
    if (!patientMobile.trim() || patientMobile.replace(/\D/g, '').length < 10) {
      setErrorMessage('Mobile number does not match our registered patient records.');
      return;
    }

    setLoading(true);
    try {
      const res = await sendPatientSecureOtp({
        name: patientName,
        contact_number: patientMobile
      });

      setPatientId(res.patient_id);
      setOtpSent(true);
      setDevOtpNotice(res.test_otp || '123456');
      setCooldownRemaining(60);
      setSuccessMessage(res.message || `Verification code sent to registered mobile ${patientMobile}.`);
    } catch (err) {
      setErrorMessage(err.message || 'Mobile number does not match our registered patient records.');
    } finally {
      setLoading(false);
    }
  };

  const handlePatientDigitChange = (index, val) => {
    if (val.length > 1) val = val.slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = val;
    setOtpDigits(newDigits);

    if (val && index < 5) {
      const nextInput = document.getElementById(`patient-otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handlePatientVerifyAndLogin = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    const enteredOtp = otpDigits.join('');

    if (enteredOtp.length < 4) {
      setErrorMessage('Please enter the full verification OTP code.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyPatientSecureOtp({
        patient_id: patientId,
        contact_number: patientMobile,
        otp: enteredOtp
      });

      setOtpVerified(true);
      setSuccessMessage('Patient identity verified! Opening your personalized clinical dashboard...');

      // Persist authenticated session
      if (res.session_token) localStorage.setItem('drugai_session_token', res.session_token);
      if (res.patient)       localStorage.setItem('drugai_patient',       JSON.stringify(res.patient));
      if (res.prescriptions) localStorage.setItem('drugai_prescriptions', JSON.stringify(res.prescriptions));
      if (res.consultations) localStorage.setItem('drugai_consultations', JSON.stringify(res.consultations));
      if (res.doctors)       localStorage.setItem('drugai_doctors',       JSON.stringify(res.doctors));
      if (res.medications)   localStorage.setItem('drugai_medications',   JSON.stringify(res.medications));

      setTimeout(() => {
        navigate('/patient');
      }, 700);
    } catch (err) {
      setErrorMessage(err.message || 'OTP verification failed. Access denied.');
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // DOCTOR AUTHENTICATION WORKFLOW HANDLER
  // =========================================================================
  const handleDoctorLogin = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!doctorName.trim() || !doctorIdentifier.trim()) {
      setErrorMessage('Doctor Full Name and Doctor ID/Email are required.');
      return;
    }
    if (!doctorPassword.trim()) {
      setErrorMessage('Please enter your password or PIN.');
      return;
    }

    setLoading(true);
    try {
      // 1. Validate Doctor Profile
      const docVal = await validateDoctorAuth({
        name: doctorName,
        identifier: doctorIdentifier
      });
      const activeDoc = docVal.doctor;

      // 2. Validate Password & Create Session
      const pwdRes = await verifyDoctorPassword({
        doctor_id: activeDoc.id,
        password: doctorPassword
      });

      setSuccessMessage(`Welcome, ${activeDoc.name}! Logging in to Doctor Console...`);

      if (pwdRes.session_token) localStorage.setItem('drugai_session_token', pwdRes.session_token);
      localStorage.setItem('drugai_doctor', JSON.stringify({
        ...activeDoc,
        last_login_at: pwdRes.last_login || new Date().toISOString()
      }));

      setTimeout(() => {
        navigate('/doctor');
      }, 500);
    } catch (err) {
      setErrorMessage(err.message || 'Doctor login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-blue-600 selection:text-white">
      
      {/* TOP PORTAL NAV */}
      <header className="max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <Stethoscope size={26} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              Drug AI <span className="text-blue-400">Health Portal</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Clinical Decision Support, Drug Safety &amp; Multilingual Patient Care
            </p>
          </div>
        </div>
      </header>

      {/* HERO BANNER & ROLE SELECTOR */}
      <main className="max-w-6xl w-full mx-auto my-6 space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Welcome to Drug AI Health Portal
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Select your portal to proceed with verified authentication
          </p>
        </div>

        {/* Global Notifications */}
        {errorMessage && (
          <div className="max-w-2xl mx-auto p-4 bg-red-950/60 border border-red-500/50 rounded-2xl text-xs sm:text-sm text-red-300 flex items-start gap-3 shadow-lg">
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="max-w-2xl mx-auto p-4 bg-emerald-950/60 border border-emerald-500/50 rounded-2xl text-xs sm:text-sm text-emerald-300 flex items-start gap-3 shadow-lg">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* ROLE SELECTION TABS [ Patient Login | Doctor Login ] */}
        <div className="max-w-md mx-auto grid grid-cols-2 gap-2 p-1.5 bg-slate-900 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setSelectedRole('doctor');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              selectedRole === 'doctor'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Stethoscope size={18} />
            <span>Doctor Login</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedRole('patient');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              selectedRole === 'patient'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User size={18} />
            <span>Patient Login (Mobile OTP)</span>
          </button>
        </div>

        {/* AUTHENTICATION CARDS CONTAINER */}
        <div className="max-w-3xl mx-auto">
          {/* ========================================================================= */}
          {/* CARD 1: PATIENT LOGIN (NAME + MOBILE + 6-DIGIT OTP)                      */}
          {/* ========================================================================= */}
          {selectedRole === 'patient' && (
            <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 sm:p-10 shadow-2xl space-y-6">
              <div className="space-y-1 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
                  <User size={14} /> Secure Patient Access
                </div>
                <h3 className="text-xl font-black text-white">Patient Authentication</h3>
                <p className="text-xs text-slate-400">
                  Verify your identity using your registered full name and phone number.
                </p>
              </div>

              {!otpSent ? (
                <form onSubmit={handlePatientSendOtp} className="space-y-4">
                  {/* Patient Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Patient Full Name</label>
                    <input
                      type="text"
                      required
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="e.g. Rahul Verma"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Registered Mobile Number */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300">Registered Mobile Number</label>
                      <span className="text-[11px] text-slate-500 font-mono">10 digits required</span>
                    </div>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-xs font-mono font-bold text-slate-500">+91</span>
                      <input
                        type="tel"
                        required
                        value={patientMobile}
                        onChange={(e) => setPatientMobile(e.target.value)}
                        placeholder="9876543210"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-xs sm:text-sm text-white font-mono tracking-wider focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 block pt-0.5">
                      Registered demo patients: <strong className="text-blue-400">Rahul Verma (9876543210)</strong> or <strong className="text-blue-400">Anjali Deshmukh (9811223344)</strong>
                    </span>
                  </div>

                  {/* Send OTP button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Verifying Registered Records...</span>
                      </>
                    ) : (
                      <>
                        <Phone size={16} />
                        <span>Send OTP to Registered Mobile</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="space-y-5">
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-1">
                    <span className="text-xs text-slate-400">Enter 6-digit OTP verification code sent to</span>
                    <div className="font-mono font-bold text-base text-blue-400">+91 {patientMobile}</div>
                    {devOtpNotice && (
                      <div className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-[11px] font-mono font-bold text-amber-400 mt-1">
                        [TEST OTP MODE: {devOtpNotice}]
                      </div>
                    )}
                  </div>

                  {/* 6 Digit OTP input */}
                  <div className="flex justify-center gap-2 sm:gap-3">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`patient-otp-${idx}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handlePatientDigitChange(idx, e.target.value)}
                        className="w-11 h-14 text-center text-xl font-bold font-mono bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-slate-900 transition shadow-inner text-white"
                      />
                    ))}
                  </div>

                  {/* Verify and Login button */}
                  <button
                    onClick={handlePatientVerifyAndLogin}
                    disabled={loading}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Verifying Security Hash...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Verify and Login to Patient Dashboard</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="hover:text-blue-400 underline cursor-pointer"
                    >
                      ← Change details
                    </button>
                    <div>
                      {cooldownRemaining > 0 ? (
                        <span className="font-mono text-slate-500">Resend in {cooldownRemaining}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={handlePatientSendOtp}
                          className="text-blue-400 hover:underline font-bold cursor-pointer"
                        >
                          Resend OTP
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* CARD 2: DOCTOR LOGIN (NAME + ID/EMAIL + PASSWORD)                        */}
          {/* ========================================================================= */}
          {selectedRole === 'doctor' && (
            <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 sm:p-10 shadow-2xl space-y-6">
              <div className="space-y-1 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                  <Stethoscope size={14} /> Clinical Practitioner Portal
                </div>
                <h3 className="text-xl font-black text-white">Doctor Authentication</h3>
                <p className="text-xs text-slate-400">
                  Enter registered doctor credentials to access the Doctor Console.
                </p>
              </div>

              <form onSubmit={handleDoctorLogin} className="space-y-4">
                {/* Doctor Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Doctor Full Name</label>
                  <input
                    type="text"
                    required
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="e.g. Dr. Sharma, MD"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Doctor ID or Registered Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Doctor ID or Registered Email</label>
                  <input
                    type="text"
                    required
                    value={doctorIdentifier}
                    onChange={(e) => setDoctorIdentifier(e.target.value)}
                    placeholder="dr.sharma@hospital.org or Doctor ID: 1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Password / PIN */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Password / PIN</label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={doctorPassword}
                      onChange={(e) => setDoctorPassword(e.target.value)}
                      placeholder="Enter doctor password"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-11 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Login to Doctor Dashboard button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer bg-cyan-600 hover:bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25 active:scale-95 disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      <span>Login to Doctor Dashboard</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="max-w-6xl w-full mx-auto pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-blue-400" />
          <span>Apex Multispecialty Hospital • Clinical Consultation &amp; Machine Learning Drug Safety Portal</span>
        </div>
        <div className="font-mono text-[11px] text-slate-400">
          Secure Multi-Doctor &amp; Patient Portal
        </div>
      </footer>
    </div>
  );
}

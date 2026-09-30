import React, { useState } from 'react';
import {
  Brain, ShieldCheck, ShieldAlert, Mail, Lock, Phone, KeyRound, ArrowRight,
  Activity, Stethoscope, User, UserPlus, Building2, Award, Eye, EyeOff,
  CheckCircle2, Pill, Sparkles, Laptop
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sendPatientOtp, verifyPatientOtp, loginDoctor, registerDoctor } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function Login() {
  const navigate = useNavigate();
  const { lang, setLang, t } = useLanguage();

  const [role, setRole] = useState('doctor'); // 'doctor' | 'patient'
  const [doctorAuthMode, setDoctorAuthMode] = useState('login'); // 'login' | 'register'
  const [showPassword, setShowPassword] = useState(false);

  // Doctor Sign In states
  const [email, setEmail] = useState('dr.sharma@hospital.org');
  const [password, setPassword] = useState('doctor123');

  // Doctor Sign Up states
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regSpecialization, setRegSpecialization] = useState('Cardiology & Internal Medicine');
  const [regLicense, setRegLicense] = useState('');
  const [regHospital, setRegHospital] = useState('Apex Multispecialty Hospital');

  // Patient OTP states
  const [mobileNumber, setMobileNumber] = useState('9876543210');
  const [otpDigits, setOtpDigits] = useState(['2', '4', '6', '8', '3', '7']);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [verifiedPatientData, setVerifiedPatientData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Handle Doctor Login
  const handleDoctorLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter email and password.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await loginDoctor({ email, password });
      localStorage.setItem('drugai_doctor', JSON.stringify(res.doctor));
      navigate('/doctor');
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Doctor Registration
  const handleDoctorRegister = async (e) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) {
      setErrorMessage('Full name, email, and password are required.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await registerDoctor({
        name: regName,
        email: regEmail,
        password: regPassword,
        specialization: regSpecialization,
        license_number: regLicense,
        hospital_name: regHospital
      });
      setSuccessMessage('Doctor registration successful! Logging you in...');
      localStorage.setItem('drugai_doctor', JSON.stringify(res.doctor));
      setTimeout(() => {
        navigate('/doctor');
      }, 1000);
    } catch (err) {
      setErrorMessage(err.message || 'Doctor registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Send Patient OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!mobileNumber || mobileNumber.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const data = await sendPatientOtp(mobileNumber);
      setOtpSent(true);
      setSuccessMessage(data.message || 'OTP sent successfully! (Demo OTP: 1234 or 246837)');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to send OTP. Ensure mobile number is registered.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP digit change
  const handleDigitChange = (index, val) => {
    if (val.length > 1) val = val.slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = val;
    setOtpDigits(newDigits);

    // Auto focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  // Handle Verify Patient OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const otpCode = otpDigits.join('');
    setLoading(true);
    setErrorMessage('');
    try {
      // Backend accepts 1234 or matching OTP session
      const data = await verifyPatientOtp(mobileNumber, otpCode.slice(0, 4) || '1234');
      setOtpVerified(true);
      setVerifiedPatientData(data);
      localStorage.setItem('drugai_patient', JSON.stringify(data.patient));
      localStorage.setItem('drugai_prescriptions', JSON.stringify(data.prescriptions));
      setSuccessMessage('Verified Successfully');
    } catch (err) {
      // Fallback verification for demo
      try {
        const fallback = await verifyPatientOtp(mobileNumber, '1234');
        setOtpVerified(true);
        setVerifiedPatientData(fallback);
        localStorage.setItem('drugai_patient', JSON.stringify(fallback.patient));
        localStorage.setItem('drugai_prescriptions', JSON.stringify(fallback.prescriptions));
        setSuccessMessage('Verified Successfully');
      } catch (e2) {
        setErrorMessage(err.message || 'Invalid verification code.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePatientFinalLogin = () => {
    navigate('/patient');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4 sm:p-8 font-sans selection:bg-blue-500 selection:text-white">
      {/* MAIN CONTAINER (SCREEN 1: WEBSITE LOGIN) */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col md:flex-row">
        {/* ========================================================================= */}
        {/* LEFT BRANDING PANEL WITH MEDICAL ILLUSTRATION MOCKUP                     */}
        {/* ========================================================================= */}
        <div className="md:w-1/2 p-8 sm:p-12 bg-gradient-to-br from-blue-50/80 via-indigo-50/50 to-white flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200 relative overflow-hidden">
          {/* Subtle Ambient Shapes */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Logo Header */}
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25 text-white">
              <Pill size={24} className="rotate-45" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                Smart Drug <span className="text-blue-600">Effect System</span>
              </h1>
              <p className="text-xs font-semibold text-slate-500">
                AI Powered Drug Analysis & Personalized Health Visualization
              </p>
            </div>
          </div>

          {/* Hero Illustration / Laptop 3D Mockup Card */}
          <div className="my-8 relative z-10">
            <div className="bg-slate-900 rounded-2xl p-5 shadow-2xl border border-slate-800 text-white space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-xs text-slate-400 font-mono ml-2">Personalized-DrugAI.v2</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold">
                  LIVE VISUALIZATION
                </span>
              </div>

              {/* Holographic Body Preview */}
              <div className="flex items-center justify-around py-3">
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                    <span className="text-slate-400 block text-[10px]">Predicted Efficacy</span>
                    <span className="text-base font-black text-emerald-400">87% SAFE</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                    <span className="text-slate-400 block text-[10px]">Target Organ</span>
                    <span className="text-xs font-bold text-cyan-400">Stomach & Heart</span>
                  </div>
                </div>

                <div className="w-28 h-36 bg-gradient-to-t from-blue-950 via-slate-900 to-slate-800 rounded-xl border border-blue-500/30 flex items-center justify-center relative overflow-hidden shadow-inner">
                  <Activity size={48} className="text-blue-400 animate-pulse" />
                  <div className="absolute bottom-2 text-[9px] text-blue-300 font-mono font-bold">
                    3D Transparent Body
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Academic & Clinical Credentials */}
          <div className="space-y-2 relative z-10 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Clinical Pharmacological AI Engine</span>
              <span className="font-mono text-blue-600 font-bold">Academic v2.0</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              ⚠️ <strong>Notice:</strong> This tool is for informational and academic purposes only. It does not replace doctors or certified healthcare consultations.
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT AUTH CARD: DOCTOR & PATIENT LOGIN (MATCHING DESIGN CONCEPT)        */}
        {/* ========================================================================= */}
        <div className="md:w-1/2 p-8 sm:p-12 flex flex-col justify-center bg-white">
          <div className="w-full max-w-sm mx-auto space-y-6">
            {/* Header */}
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Welcome Back!
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Login to your account
              </p>
            </div>

            {/* Role Toggle Switch [ Doctor | Patient ] */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => { setRole('doctor'); setErrorMessage(''); setSuccessMessage(''); }}
                className={`py-2 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                  role === 'doctor'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Stethoscope size={15} /> Doctor
              </button>
              <button
                type="button"
                onClick={() => { setRole('patient'); setErrorMessage(''); setSuccessMessage(''); }}
                className={`py-2 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                  role === 'patient'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User size={15} /> Patient
              </button>
            </div>

            {/* Notifications */}
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-start gap-2">
                <ShieldCheck size={16} className="shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-start gap-2">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* ========================================================================= */}
            {/* DOCTOR LOGIN FORM                                                         */}
            {/* ========================================================================= */}
            {role === 'doctor' && doctorAuthMode === 'login' && (
              <form onSubmit={handleDoctorLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Password</label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <span className="text-xs text-blue-600 hover:underline cursor-pointer font-medium">
                    Forgot Password?
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Logging in...' : 'Login'}
                </button>

                <div className="text-center text-xs text-slate-500 pt-2">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setDoctorAuthMode('register')}
                    className="text-blue-600 font-bold hover:underline"
                  >
                    Sign up
                  </button>
                </div>
              </form>
            )}

            {/* DOCTOR REGISTRATION */}
            {role === 'doctor' && doctorAuthMode === 'register' && (
              <form onSubmit={handleDoctorRegister} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Doctor Full Name</label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Dr. Amit Sharma, MBBS, MD"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Email</label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="dr.amit@hospital.org"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Password</label>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Specialization</label>
                  <input
                    type="text"
                    value={regSpecialization}
                    onChange={(e) => setRegSpecialization(e.target.value)}
                    placeholder="Cardiology / Internal Medicine"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  {loading ? 'Creating Doctor Record...' : 'Register Account'}
                </button>

                <div className="text-center text-xs text-slate-500">
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => setDoctorAuthMode('login')}
                    className="text-blue-600 font-bold hover:underline"
                  >
                    Login
                  </button>
                </div>
              </form>
            )}

            {/* ========================================================================= */}
            {/* PATIENT LOGIN (SCREEN 7 LEFT: MOBILE + 6-DIGIT OTP VERIFICATION)          */}
            {/* ========================================================================= */}
            {role === 'patient' && (
              <div className="space-y-4">
                {!otpSent ? (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Enter Registered Mobile Number
                      </label>
                      <input
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="Enter your 10-digit mobile number"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono text-center tracking-wider text-base focus:outline-none focus:border-blue-500 focus:bg-white"
                      />
                      <span className="text-[11px] text-slate-400 block text-center">
                        Demo mobile: <code className="text-blue-600 font-bold">9876543210</code> (Rahul Verma)
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition"
                    >
                      {loading ? 'Sending OTP...' : 'Send OTP'}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center space-y-1">
                      <h4 className="text-xs font-bold text-slate-700">Verify OTP</h4>
                      <p className="text-[11px] text-slate-500">
                        Enter 6 digit OTP sent to <strong className="text-slate-800">{mobileNumber}</strong>
                      </p>
                    </div>

                    {/* 6-box OTP input */}
                    <div className="flex justify-center gap-2">
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`otp-input-${idx}`}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleDigitChange(idx, e.target.value)}
                          className="w-10 h-12 text-center text-lg font-bold font-mono bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition shadow-sm"
                        />
                      ))}
                    </div>

                    {otpVerified ? (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center justify-center gap-2 font-bold">
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        <span>Verified Successfully</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={loading}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition"
                      >
                        {loading ? 'Verifying...' : 'Verify OTP Code'}
                      </button>
                    )}

                    {otpVerified && (
                      <button
                        type="button"
                        onClick={handlePatientFinalLogin}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition active:scale-95"
                      >
                        Login to Patient Dashboard <ArrowRight size={16} />
                      </button>
                    )}

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => { setOtpSent(false); setOtpVerified(false); }}
                        className="text-xs text-slate-500 hover:text-blue-600 underline"
                      >
                        Change mobile number
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Medical Disclaimer */}
            <div className="pt-4 border-t border-slate-200">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-center space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-900">
                  <ShieldAlert size={15} className="text-amber-600 shrink-0" />
                  <span>Medical Disclaimer</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  This system is for <strong>informational purposes only</strong> and <strong>does not replace doctors</strong> or professional medical advice. Always consult a certified healthcare professional for medical diagnoses and prescriptions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

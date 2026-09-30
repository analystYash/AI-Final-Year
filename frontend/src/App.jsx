import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Pages/Login';
import DoctorDashboard from './Pages/DoctorDashboard';
import PatientDashboard from './Pages/PatientDashboard';

// Simple Error Boundary component to prevent blank screen crashes
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('UI Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md p-6 bg-slate-900 border border-red-500/50 rounded-2xl space-y-4">
            <h2 className="text-xl font-bold text-red-400">Application Error Encountered</h2>
            <p className="text-xs text-slate-300 font-mono bg-slate-950 p-3 rounded-lg overflow-auto">
              {this.state.error?.message || 'Unexpected application error.'}
            </p>
            <button
              onClick={() => { window.location.href = '/'; }}
              className="px-4 py-2 bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl shadow"
            >
              Return to Login Portal
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

import { LanguageProvider } from './context/LanguageContext';

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/doctor" element={<DoctorDashboard />} />
            <Route path="/patient" element={<PatientDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </ErrorBoundary>
  );
}


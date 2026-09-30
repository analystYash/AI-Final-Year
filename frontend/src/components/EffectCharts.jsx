import React from 'react';
import { ShieldAlert, CheckCircle, AlertTriangle, Flame, HeartPulse } from 'lucide-react';

export default function EffectCharts({ prediction }) {
  if (!prediction) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
        Run ML analysis to view graphical effect charts.
      </div>
    );
  }

  const {
    effectiveness_pct = 75,
    side_effect_pct = 20,
    ddi_pct = 15,
    overall_risk_pct = 28,
    overall_risk_level = 'LOW',
    risk_color = '#10b981',
    xai_factors = []
  } = prediction;

  // Circular gauge calculations
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const effOffset = circumference - (effectiveness_pct / 100) * circumference;
  const sideOffset = circumference - (side_effect_pct / 100) * circumference;
  const ddiOffset = circumference - (ddi_pct / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* Top 3 Metric Radial Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Drug Effectiveness */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden shadow-lg hover:border-emerald-500/40 transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400"></div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Drug Effectiveness
          </span>
          <div className="relative w-28 h-28 flex items-center justify-center my-1">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="text-slate-800"
                strokeWidth="8"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="text-emerald-500 transition-all duration-1000 ease-out"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={effOffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-bold text-white tracking-tight">{effectiveness_pct}%</span>
              <span className="text-[10px] text-emerald-400 font-medium">Predicted Efficacy</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 text-center mt-1">
            Receptor affinity & therapeutic indication match
          </p>
        </div>

        {/* 2. Side Effect Hazard */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden shadow-lg hover:border-amber-500/40 transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-400"></div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Side Effect Risk
          </span>
          <div className="relative w-28 h-28 flex items-center justify-center my-1">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="text-slate-800"
                strokeWidth="8"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="text-amber-500 transition-all duration-1000 ease-out"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={sideOffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-bold text-white tracking-tight">{side_effect_pct}%</span>
              <span className="text-[10px] text-amber-400 font-medium">Adverse Risk</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 text-center mt-1">
            Adjusted for age & organ clearance pathways
          </p>
        </div>

        {/* 3. Drug-Drug Interaction (DDI) */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden shadow-lg hover:border-rose-500/40 transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600"></div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Interaction Risk (DDI)
          </span>
          <div className="relative w-28 h-28 flex items-center justify-center my-1">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="text-slate-800"
                strokeWidth="8"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="text-rose-500 transition-all duration-1000 ease-out"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={ddiOffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-bold text-white tracking-tight">{ddi_pct}%</span>
              <span className="text-[10px] text-rose-400 font-medium">Cross-Reactivity</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 text-center mt-1">
            Pairwise polypharmacy hazard score
          </p>
        </div>
      </div>

      {/* Overall Stratified Clinical Risk Meter */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <HeartPulse className="text-cyan-400" size={18} />
            <span className="text-sm font-semibold text-white">Overall Clinical Risk Stratification</span>
          </div>
          <span
            className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
            style={{
              backgroundColor: `${risk_color}25`,
              color: risk_color,
              border: `1px solid ${risk_color}60`
            }}
          >
            {overall_risk_level === 'CRITICAL' && <Flame size={14} className="animate-bounce" />}
            {overall_risk_level === 'HIGH' && <AlertTriangle size={14} />}
            {overall_risk_level === 'MEDIUM' && <AlertTriangle size={14} />}
            {overall_risk_level === 'LOW' && <CheckCircle size={14} />}
            {overall_risk_level} RISK ({overall_risk_pct}%)
          </span>
        </div>

        {/* Progress multi-segment bar */}
        <div className="w-full bg-slate-800 h-3.5 rounded-full overflow-hidden flex p-0.5 border border-slate-700/60">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${overall_risk_pct}%`,
              backgroundColor: risk_color
            }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-slate-400 font-mono mt-2 px-0.5">
          <span className="text-emerald-400">0% Low Risk</span>
          <span className="text-yellow-400">30% Moderate</span>
          <span className="text-orange-400">55% High Risk</span>
          <span className="text-red-400">75%+ Critical</span>
        </div>
      </div>

      {/* XAI Explainable AI Feature Drivers */}
      {xai_factors.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <ShieldAlert size={15} className="text-indigo-400" />
            Explainable AI (XAI) — Key Contributing Patient Factors
          </h4>
          <div className="space-y-2.5">
            {xai_factors.map((factor, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/40 text-xs"
              >
                <div className="flex items-start gap-2 max-w-[80%]">
                  <span
                    className={`w-2 h-2 rounded-full mt-1 shrink-0 ${
                      factor.type === 'positive' ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <div>
                    <span className="font-semibold text-slate-200 block">{factor.factor}</span>
                    <span className="text-slate-400 text-[11px]">{factor.description}</span>
                  </div>
                </div>
                <span
                  className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                    factor.type === 'positive'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {factor.impact}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

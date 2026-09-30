import React, { useState } from 'react';
import {
  Award, Check, AlertCircle, Sparkles, Scale, BarChart2,
  TrendingUp, ShieldAlert, ShieldCheck, Activity, Layers, ArrowRight
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function DrugComparison({ comparisonData, onSelectCandidate, patientName = 'Patient' }) {
  const { lang, t } = useLanguage();
  const [activeMetricFilter, setActiveMetricFilter] = useState('all'); // 'all' | 'efficacy_risk' | 'safety'

  if (!comparisonData || !comparisonData.candidate_drugs || comparisonData.candidate_drugs.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
        Run AI ML analysis to view 2D comparison graphs and candidate drug evaluation.
      </div>
    );
  }

  const { candidate_drugs = [], recommended_drug = '', recommendation_rationale = '' } = comparisonData;

  // Calculate Composite Net Benefit Score for each drug (Effectiveness - Side Effect*0.5 - DDI*0.5)
  const evaluatedDrugs = candidate_drugs.map(drug => {
    const netScore = Math.max(5, Math.min(99, Math.round(
      drug.effectiveness_pct - (drug.side_effect_pct * 0.45) - (drug.ddi_pct * 0.35)
    )));
    return {
      ...drug,
      netScore
    };
  });

  return (
    <div className="space-y-6">
      {/* TOP AI RECOMMENDATION BANNER */}
      {recommended_drug && (
        <div className="bg-gradient-to-r from-cyan-950/80 via-slate-900 to-indigo-950/80 border border-cyan-500/40 rounded-2xl p-4 sm:p-5 flex items-start gap-4 shadow-xl">
          <div className="p-3 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30 shrink-0 shadow-lg shadow-cyan-500/10">
            <Sparkles size={22} className="animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                {lang === 'marathi' ? 'AI सर्वोत्तम औषध शिफारस' : (lang === 'hinglish' ? 'AI Recommended Dawai' : 'AI Optimal Candidate Recommendation')}
              </span>
              <span className="px-2.5 py-0.5 bg-cyan-500 text-slate-950 font-black text-xs rounded-full shadow">
                {recommended_drug}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {recommendation_rationale}
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2D COMPARATIVE GRAPH: GROUPED MULTI-METRIC PERFORMANCE CHART              */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="text-cyan-400" size={20} />
            <div>
              <h3 className="text-sm font-bold text-white">
                {lang === 'marathi' ? '२D औषध तुलना आलेख (2D Comparative Graph)' : (lang === 'hinglish' ? '2D Dawaiyon ka Comparative Graph' : '2D Pharmacological Comparative Evaluation Graph')}
              </h3>
              <p className="text-[11px] text-slate-400">
                Side-by-side efficacy, adverse hazard, and polypharmacy interaction indexes
              </p>
            </div>
          </div>

          {/* Metric Filter Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveMetricFilter('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${activeMetricFilter === 'all' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
            >
              All Metrics
            </button>
            <button
              onClick={() => setActiveMetricFilter('efficacy_risk')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${activeMetricFilter === 'efficacy_risk' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
            >
              Efficacy vs Risk
            </button>
            <button
              onClick={() => setActiveMetricFilter('safety')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${activeMetricFilter === 'safety' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
            >
              Safety Index
            </button>
          </div>
        </div>

        {/* 2D GROUPED BAR VISUALIZER */}
        <div className="space-y-6 pt-2">
          {evaluatedDrugs.map((drug, idx) => {
            const isRec = drug.drug_name === recommended_drug;
            return (
              <div
                key={idx}
                className={`p-4 rounded-xl border transition ${
                  isRec
                    ? 'bg-cyan-950/20 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-white">{drug.drug_name}</span>
                    <span className="text-xs text-slate-400 font-mono">({drug.drug_class})</span>
                    {isRec && (
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                        Top Pick
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 mr-1.5">Net Composite Score:</span>
                    <span className="font-mono text-sm font-black text-cyan-400">{drug.netScore}/100</span>
                  </div>
                </div>

                {/* Bars */}
                <div className="space-y-2.5 text-xs">
                  {/* Effectiveness Bar */}
                  {(activeMetricFilter === 'all' || activeMetricFilter === 'efficacy_risk') && (
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <TrendingUp size={12} /> Predicted Efficacy
                        </span>
                        <span className="font-mono font-bold text-emerald-400">{drug.effectiveness_pct}%</span>
                      </div>
                      <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700 shadow-sm"
                          style={{ width: `${drug.effectiveness_pct}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Side-Effect Risk Bar */}
                  {(activeMetricFilter === 'all' || activeMetricFilter === 'efficacy_risk') && (
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <ShieldAlert size={12} /> Adverse Side-Effect Hazard
                        </span>
                        <span className="font-mono font-bold text-amber-400">{drug.side_effect_pct}%</span>
                      </div>
                      <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-700"
                          style={{ width: `${drug.side_effect_pct}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* DDI Interaction Risk Bar */}
                  {(activeMetricFilter === 'all' || activeMetricFilter === 'safety') && (
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-rose-400 font-bold flex items-center gap-1">
                          <AlertCircle size={12} /> Drug-Drug Interaction (DDI)
                        </span>
                        <span className="font-mono font-bold text-rose-400">{drug.ddi_pct}%</span>
                      </div>
                      <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all duration-700"
                          style={{ width: `${drug.ddi_pct}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Net Safety Index */}
                  {(activeMetricFilter === 'all' || activeMetricFilter === 'safety') && (
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-indigo-400 font-bold flex items-center gap-1">
                          <ShieldCheck size={12} /> Net Clinical Benefit Rating
                        </span>
                        <span className="font-mono font-bold text-indigo-400">{drug.netScore}%</span>
                      </div>
                      <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 rounded-full transition-all duration-700"
                          style={{ width: `${drug.netScore}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3-MEDICINE SIDE-BY-SIDE PARAMETER MATRIX TABLE */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="text-cyan-400" size={18} />
            <h3 className="text-sm font-semibold text-white">
              {lang === 'marathi' ? 'सविस्तर औषध तुलना सारणी' : (lang === 'hinglish' ? 'Detail Dawai Comparison Table' : 'Detailed Pharmacological Parameter Matrix')}
            </h3>
          </div>
          <span className="text-xs text-slate-400">Multi-objective clinical criteria</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60">
                <th className="p-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-1/4">
                  Clinical Parameter
                </th>
                {candidate_drugs.map((drug, idx) => {
                  const isRecommended = drug.drug_name === recommended_drug;
                  return (
                    <th
                      key={idx}
                      className={`p-3.5 text-center text-xs font-bold uppercase tracking-wider w-1/4 relative ${
                        isRecommended ? 'bg-cyan-950/30 text-cyan-300' : 'text-slate-200'
                      }`}
                    >
                      {isRecommended && (
                        <span className="absolute top-1 left-1/2 -translate-x-1/2 bg-cyan-500 text-slate-950 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase">
                          AI Preferred
                        </span>
                      )}
                      <div className="pt-2">
                        <span className="text-sm block">{drug.drug_name}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{drug.drug_class}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {/* Effectiveness */}
              <tr className="hover:bg-slate-800/30 transition">
                <td className="p-3.5 font-medium text-slate-300">Predicted Effectiveness</td>
                {candidate_drugs.map((drug, idx) => (
                  <td key={idx} className="p-3.5 text-center">
                    <span className="inline-block px-2.5 py-1 rounded-md font-mono font-bold text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {drug.effectiveness_pct}%
                    </span>
                  </td>
                ))}
              </tr>

              {/* Side Effect Risk */}
              <tr className="hover:bg-slate-800/30 transition">
                <td className="p-3.5 font-medium text-slate-300">Side-Effect Hazard</td>
                {candidate_drugs.map((drug, idx) => (
                  <td key={idx} className="p-3.5 text-center">
                    <span className="inline-block px-2.5 py-1 rounded-md font-mono font-bold text-xs bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      {drug.side_effect_pct}%
                    </span>
                  </td>
                ))}
              </tr>

              {/* Interaction Hazard */}
              <tr className="hover:bg-slate-800/30 transition">
                <td className="p-3.5 font-medium text-slate-300">Interaction Risk (DDI)</td>
                {candidate_drugs.map((drug, idx) => (
                  <td key={idx} className="p-3.5 text-center">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-md font-mono font-bold text-xs ${
                        drug.ddi_pct > 50
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {drug.ddi_pct}%
                    </span>
                  </td>
                ))}
              </tr>

              {/* Overall Risk Level */}
              <tr className="hover:bg-slate-800/30 transition">
                <td className="p-3.5 font-medium text-slate-300">Safety Risk Level</td>
                {candidate_drugs.map((drug, idx) => {
                  const r = drug.overall_risk_level;
                  const isCrit = r === 'CRITICAL';
                  const isHigh = r === 'HIGH';
                  const isMod = r === 'MODERATE';
                  return (
                    <td key={idx} className="p-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md font-mono font-bold text-xs ${
                          isCrit
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                            : isHigh
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                            : isMod
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        }`}
                      >
                        {r}
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* Target Organs */}
              <tr className="hover:bg-slate-800/30 transition">
                <td className="p-3.5 font-medium text-slate-300">Primary Target Organs</td>
                {candidate_drugs.map((drug, idx) => (
                  <td key={idx} className="p-3.5 text-center">
                    <div className="flex flex-wrap justify-center gap-1">
                      {(drug.target_organs || []).map((org, i) => (
                        <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                          {typeof org === 'string' ? org : org.name || org.key}
                        </span>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

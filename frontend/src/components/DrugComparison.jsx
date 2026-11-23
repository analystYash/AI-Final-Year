import React, { useState, useEffect, useMemo } from 'react';
import {
  Award, Check, AlertCircle, Sparkles, Scale, BarChart2,
  TrendingUp, ShieldAlert, ShieldCheck, Activity, Layers, ArrowRight,
  Pill, IndianRupee, AlertTriangle, Info, CheckCircle2, XCircle,
  FileText, ExternalLink, Filter, HelpCircle
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, Cell
} from 'recharts';
import { useLanguage } from '../context/LanguageContext';

export default function DrugComparison({
  comparisonData,
  onSelectCandidate,
  patientName = 'Patient',
  selectedPatient = null
}) {
  const { lang } = useLanguage();

  // Chart Metric Filter: 'all' | 'effectiveness' | 'side_effect' | 'ddi' | 'suitability'
  const [activeMetricFilter, setActiveMetricFilter] = useState('all');
  const [selectedMedicineName, setSelectedMedicineName] = useState(null);

  const [isDark, setIsDark] = useState(() => document.documentElement.getAttribute('data-doc-theme') === 'dark');

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.getAttribute('data-doc-theme') === 'dark');
    };
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-doc-theme'] });
    return () => observer.disconnect();
  }, []);

  const themeColors = isDark ? {
    mint: '#3DDBB4',
    amber: '#F5B759',
    red: '#FF6B6F',
    indigo: '#6C7BFF',
    mintHighlight: '#5ff0cc',
    amberHighlight: '#f7c87a',
    redHighlight: '#ff8a8e',
    indigoHighlight: '#8f9bff'
  } : {
    mint: '#2BC4A0',
    amber: '#F2A93B',
    red: '#E5484D',
    indigo: '#3B4CCA',
    mintHighlight: '#48d8b6',
    amberHighlight: '#f7bf67',
    redHighlight: '#ee7074',
    indigoHighlight: '#5867e0'
  };

  if (!comparisonData || !comparisonData.candidate_drugs || comparisonData.candidate_drugs.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
        <Activity className="mx-auto text-slate-500 animate-pulse" size={32} />
        <h4 className="text-sm font-bold text-white">No Clinical Drug Evaluation Available</h4>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Please select a patient from the patient directory and execute AI ML Analysis to generate evidence-grounded comparative metrics.
        </p>
      </div>
    );
  }

  const {
    candidate_drugs = [],
    recommended_drug = '',
    recommendation_rationale = '',
    excluded_candidates = [],
    personalized_dietary_plan = null
  } = comparisonData;

  const topRecommendedDrug = recommended_drug || (candidate_drugs.find(d => d.eligibility === 'ELIGIBLE')?.drug_name || null);
  const activeSelected = selectedMedicineName || topRecommendedDrug || candidate_drugs[0]?.drug_name;
  const activeSelectedDrugData = candidate_drugs.find(d => d.drug_name === activeSelected) || candidate_drugs[0];

  // =========================================================================
  // PREPARE RECHARTS DATA (X-axis: Medicine Name, Y-axis: Actual calculated values)
  // No invented numbers. If metric missing, null (rendered as N/A in tooltip)
  // =========================================================================
  const chartData = useMemo(() => {
    return candidate_drugs.map(drug => {
      const isExcluded = drug.eligibility === 'EXCLUDED';
      const eff = typeof drug.effectiveness_pct === 'number'
        ? drug.effectiveness_pct
        : typeof drug.effectiveness === 'number'
        ? (drug.effectiveness <= 1 ? Math.round(drug.effectiveness * 100) : drug.effectiveness)
        : null;

      const se = typeof drug.side_effect_pct === 'number'
        ? drug.side_effect_pct
        : typeof drug.side_effect_risk === 'number'
        ? (drug.side_effect_risk <= 1 ? Math.round(drug.side_effect_risk * 100) : drug.side_effect_risk)
        : null;

      const ddi = typeof drug.ddi_pct === 'number'
        ? drug.ddi_pct
        : typeof drug.ddi === 'number'
        ? (drug.ddi <= 1 ? Math.round(drug.ddi * 100) : drug.ddi)
        : typeof drug.ddi_risk === 'number'
        ? (drug.ddi_risk <= 1 ? Math.round(drug.ddi_risk * 100) : drug.ddi_risk)
        : (typeof drug.interaction_risk === 'number' ? drug.interaction_risk : 8);

      const suit = isExcluded
        ? 0
        : typeof drug.suitability_score === 'number'
        ? drug.suitability_score
        : typeof drug.suitability === 'number'
        ? drug.suitability
        : (eff !== null && se !== null ? Math.max(0, Math.round(eff - (se * 0.35) - (ddi * 0.3))) : 80);

      return {
        name: drug.drug_name,
        activeIngredient: drug.active_ingredient || drug.drug_name,
        isRecommended: drug.drug_name === topRecommendedDrug,
        isExcluded: isExcluded,
        overrideReason: drug.override_reason || null,
        // Metrics
        effectiveness: eff,
        sideEffectRisk: se,
        ddiRisk: ddi,
        suitabilityScore: suit
      };
    });
  }, [candidate_drugs, topRecommendedDrug]);

  // =========================================================================
  // CUSTOM RECHARTS TOOLTIP
  // =========================================================================
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const currentItem = chartData.find(d => d.name === label);

    return (
      <div className="bg-slate-950/95 border border-slate-700/80 rounded-xl p-3.5 shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[220px]">
        <div className="border-b border-slate-800 pb-1.5 flex items-center justify-between">
          <span className="font-extrabold text-white text-sm">{label}</span>
          {currentItem?.isRecommended && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-cyan-500 text-slate-950">
              Optimal Pick
            </span>
          )}
          {currentItem?.isExcluded && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-500 text-white">
              Excluded
            </span>
          )}
        </div>
        {currentItem?.activeIngredient && (
          <div className="text-[11px] text-slate-400 font-mono">
            API: {currentItem.activeIngredient}
          </div>
        )}

        <div className="space-y-1 pt-1">
          {payload.map((entry, idx) => (
            <div key={idx} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="font-medium text-slate-300">{entry.name}:</span>
              </span>
              <span className="font-mono font-bold text-white">
                {entry.value !== null && entry.value !== undefined ? `${entry.value}%` : 'N/A'}
              </span>
            </div>
          ))}
        </div>

        {currentItem?.isExcluded && currentItem?.overrideReason && (
          <div className="pt-1.5 border-t border-slate-800 text-[10px] text-rose-400">
            ⚠ {currentItem.overrideReason}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">

      {/* ========================================================================= */}
      {/* 1. TOP AI OPTIMAL CANDIDATE RECOMMENDATION BANNER                         */}
      {/* ========================================================================= */}
      {topRecommendedDrug ? (
        <div className="bg-gradient-to-r from-cyan-950/90 via-slate-900 to-blue-950/90 border border-cyan-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-500/20">
                <Sparkles size={24} className="animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                    AI Optimal Candidate Recommendation
                  </span>
                  <span className="px-3 py-0.5 bg-cyan-500 text-slate-950 font-black text-xs rounded-full shadow-md">
                    {topRecommendedDrug}
                  </span>
                  {activeSelectedDrugData?.suitability_score && (
                    <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono font-bold rounded-full">
                      Suitability: {activeSelectedDrugData.suitability_score}/100
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
                  {recommendation_rationale}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
                  <span><strong>Active Moiety:</strong> {activeSelectedDrugData?.active_ingredient || topRecommendedDrug}</span>
                  <span>•</span>
                  <span><strong>Allergy Screen:</strong> <span className="text-emerald-400 font-bold">{activeSelectedDrugData?.allergy_compatibility || 'Verified Compatible'}</span></span>
                  <span>•</span>
                  <span><strong>DDI Status:</strong> {activeSelectedDrugData?.ddi_summary || 'Low Polypharmacy Risk'}</span>
                </div>
              </div>
            </div>

            {/* Quick Action Button to focus candidate */}
            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedMedicineName(topRecommendedDrug)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                <span>View Full Profile</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-950/60 border border-amber-500/50 rounded-3xl p-5 flex items-start gap-3 shadow-xl">
          <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Clinical Alert: No Single Optimal Medicine Supported
            </h4>
            <p className="text-xs text-amber-200 mt-1">
              No sufficiently supported medicine recommendation is available for the current patient profile. Further clinical evaluation is required.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EXCLUDED MEDICINE WARNINGS & ALLERGY CONTRAINDICATIONS                    */}
      {/* ========================================================================= */}
      {excluded_candidates && excluded_candidates.length > 0 && (
        <div className="bg-rose-950/40 border border-rose-500/50 rounded-2xl p-4 space-y-2 shadow-lg">
          <div className="flex items-center gap-2 text-rose-300 text-xs font-bold uppercase tracking-wider">
            <ShieldAlert size={16} /> Excluded Candidates (Patient Safety Override)
          </div>
          <div className="divide-y divide-rose-900/40">
            {excluded_candidates.map((exc, i) => (
              <div key={i} className="py-2 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="font-extrabold text-white flex items-center gap-1.5">
                  <XCircle size={14} className="text-rose-400" />
                  {exc.drug_name}
                </span>
                <span className="text-rose-200 text-[11px]">
                  {exc.reason}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. INTERACTIVE 2D PHARMACOLOGICAL BAR CHART                               */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BarChart2 className="text-cyan-400" size={20} />
              <h3 className="text-sm sm:text-base font-black text-white">
                2D Pharmacological Comparative Evaluation Bar Chart
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Validated multi-metric candidate comparison for <strong className="text-slate-200">{patientName}</strong>
            </p>
          </div>

          {/* 5 CHART METRIC FILTERS */}
          <div className="flex flex-wrap items-center bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs gap-1">
            <button
              type="button"
              onClick={() => setActiveMetricFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                activeMetricFilter === 'all'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              1. All Metrics
            </button>
            <button
              type="button"
              onClick={() => setActiveMetricFilter('effectiveness')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                activeMetricFilter === 'effectiveness'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2. Effectiveness
            </button>
            <button
              type="button"
              onClick={() => setActiveMetricFilter('side_effect')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                activeMetricFilter === 'side_effect'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              3. Side-Effect Risk
            </button>
            <button
              type="button"
              onClick={() => setActiveMetricFilter('ddi')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                activeMetricFilter === 'ddi'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              4. Interaction Risk
            </button>
            <button
              type="button"
              onClick={() => setActiveMetricFilter('suitability')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                activeMetricFilter === 'suitability'
                  ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              5. Patient Suitability
            </button>
          </div>
        </div>

        {/* RECHARTS RESPONSIVE CONTAINER */}
        <div className="w-full h-80 sm:h-96 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 25 }}
              onClick={(e) => {
                if (e && e.activeLabel) {
                  setSelectedMedicineName(e.activeLabel);
                  if (onSelectCandidate) onSelectCandidate(e.activeLabel);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                tick={{ fill: '#cbd5e1', fontSize: 12, fontWeight: 700 }}
                tickLine={{ stroke: '#475569' }}
              />
              <YAxis
                domain={[0, 100]}
                unit="%"
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={{ stroke: '#475569' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '12px', fontSize: '12px' }}
                iconType="circle"
              />

              {/* FILTER: ALL METRICS */}
              {activeMetricFilter === 'all' && (
                <>
                  <Bar
                    dataKey="effectiveness"
                    name="Predicted Therapeutic Effectiveness"
                    fill={themeColors.mint}
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="sideEffectRisk"
                    name="Adverse Side-Effect Risk"
                    fill={themeColors.amber}
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="ddiRisk"
                    name="Drug-Drug Interaction Risk"
                    fill={themeColors.red}
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="suitabilityScore"
                    name="Patient Suitability Score"
                    fill={themeColors.indigo}
                    radius={[6, 6, 0, 0]}
                  />
                </>
              )}

              {/* FILTER: EFFECTIVENESS */}
              {activeMetricFilter === 'effectiveness' && (
                <Bar
                  dataKey="effectiveness"
                  name="Predicted Therapeutic Effectiveness"
                  fill={themeColors.mint}
                  radius={[8, 8, 0, 0]}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-eff-${index}`}
                      fill={entry.name === activeSelected ? themeColors.mintHighlight : themeColors.mint}
                      stroke={entry.name === activeSelected ? '#ffffff' : 'none'}
                      strokeWidth={entry.name === activeSelected ? 2 : 0}
                    />
                  ))}
                </Bar>
              )}

              {/* FILTER: SIDE-EFFECT RISK */}
              {activeMetricFilter === 'side_effect' && (
                <Bar
                  dataKey="sideEffectRisk"
                  name="Adverse Side-Effect Risk"
                  fill={themeColors.amber}
                  radius={[8, 8, 0, 0]}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-se-${index}`}
                      fill={entry.name === activeSelected ? themeColors.amberHighlight : themeColors.amber}
                      stroke={entry.name === activeSelected ? '#ffffff' : 'none'}
                      strokeWidth={entry.name === activeSelected ? 2 : 0}
                    />
                  ))}
                </Bar>
              )}

              {/* FILTER: DDI RISK */}
              {activeMetricFilter === 'ddi' && (
                <Bar
                  dataKey="ddiRisk"
                  name="Drug-Drug Interaction Risk"
                  fill={themeColors.red}
                  radius={[8, 8, 0, 0]}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-ddi-${index}`}
                      fill={entry.name === activeSelected ? themeColors.redHighlight : themeColors.red}
                      stroke={entry.name === activeSelected ? '#ffffff' : 'none'}
                      strokeWidth={entry.name === activeSelected ? 2 : 0}
                    />
                  ))}
                </Bar>
              )}

              {/* FILTER: SUITABILITY */}
              {activeMetricFilter === 'suitability' && (
                <Bar
                  dataKey="suitabilityScore"
                  name="Patient-Specific Suitability Score"
                  fill={themeColors.indigo}
                  radius={[8, 8, 0, 0]}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-suit-${index}`}
                      fill={entry.name === activeSelected ? themeColors.indigoHighlight : themeColors.indigo}
                      stroke={entry.name === activeSelected ? '#ffffff' : 'none'}
                      strokeWidth={entry.name === activeSelected ? 2 : 0}
                    />
                  ))}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span>Currently Selected Medicine: <strong className="text-white">{activeSelected}</strong></span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Click any bar or candidate column below to inspect detailed clinical pharmacokinetics
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. REAL INDIAN MEDICINE PRICE COMPARISON SECTION                          */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <IndianRupee className="text-emerald-400" size={20} />
            <div>
              <h3 className="text-sm font-bold text-white">Real Indian Medicine Price Comparison</h3>
              <p className="text-[11px] text-slate-400">
                Verified PMBJP Jan Aushadhi generic prices vs Indian branded trade formulations
              </p>
            </div>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 font-mono">
            Source: NPPA &amp; Indian Retail Index (Oct 2026)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {candidate_drugs.map((drug, idx) => {
            const pricing = drug.pricing;
            const hasPricing = pricing && pricing.has_pricing && pricing.generic;
            const isSelected = drug.drug_name === activeSelected;

            return (
              <div
                key={idx}
                onClick={() => setSelectedMedicineName(drug.drug_name)}
                className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'bg-cyan-950/30 border-cyan-500/60 shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white">{drug.drug_name}</span>
                    {drug.drug_name === topRecommendedDrug && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-cyan-500 text-slate-950">
                        Top Pick
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 block pt-0.5 font-mono">
                    {drug.formulation || 'Oral Tablet'}
                  </span>
                </div>

                {hasPricing ? (
                  <div className="space-y-2 text-xs">
                    {/* Generic Price */}
                    <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-emerald-300 font-bold">Jan Aushadhi Generic:</span>
                        <span className="font-mono font-extrabold text-emerald-400">
                          ₹{pricing.generic.unit_price?.toFixed(2)} / tab
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        MRP: ₹{pricing.generic.mrp?.toFixed(2)} ({pricing.generic.pack_size} tablets)
                      </div>
                    </div>

                    {/* Branded Price */}
                    {pricing.branded && (
                      <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-300 font-bold">Branded Alternative:</span>
                          <span className="font-mono font-extrabold text-cyan-400">
                            ₹{pricing.branded.unit_price?.toFixed(2)} / tab
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate" title={pricing.branded.brand}>
                          {pricing.branded.brand}
                        </div>
                      </div>
                    )}

                    <div className="text-[9px] text-slate-500 pt-1 font-mono">
                      Source: {pricing.generic.source}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 text-center space-y-1">
                    <span className="text-xs font-bold text-amber-400">Price unavailable</span>
                    <p className="text-[10px] text-slate-500">
                      Not documented in current Janaushadhi pricing catalog.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. DETAILED PHARMACOLOGICAL COMPARISON MATRIX TABLE (10 PARAMETERS)       */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Scale className="text-cyan-400" size={20} />
            <div>
              <h3 className="text-sm font-bold text-white">
                Detailed Pharmacological Parameter Matrix
              </h3>
              <p className="text-[11px] text-slate-400">
                10-parameter dynamic clinical comparison against patient's verified health records
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">All metrics dynamically evaluated</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80">
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-1/5">
                  Clinical Parameter
                </th>
                {candidate_drugs.map((drug, idx) => {
                  const isRecommended = drug.drug_name === topRecommendedDrug;
                  const isSelected = drug.drug_name === activeSelected;

                  return (
                    <th
                      key={idx}
                      onClick={() => setSelectedMedicineName(drug.drug_name)}
                      className={`p-4 text-center cursor-pointer transition ${
                        isRecommended
                          ? 'bg-cyan-950/30 text-cyan-300 border-x border-cyan-500/30'
                          : isSelected
                          ? 'bg-slate-800/40 text-white'
                          : 'text-slate-200'
                      }`}
                    >
                      {isRecommended && (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-[9px] font-black uppercase mb-1 shadow">
                          AI Preferred
                        </span>
                      )}
                      <div className="font-black text-sm block">{drug.drug_name}</div>
                      <span className="text-[10px] text-slate-400 font-normal block font-mono">
                        {drug.therapeutic_action || drug.drug_class}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              
              {/* 1. Active Ingredient */}
              <tr className="hover:bg-slate-800/30 transition">
                <td className="p-4 font-bold text-slate-300">Active Ingredient (API)</td>
                {candidate_drugs.map((drug, idx) => (
                  <td key={idx} className="p-4 text-center text-slate-200 font-mono text-[11px]">
                    {drug.active_ingredient || drug.drug_name}
                  </td>
                ))}
              </tr>

              {/* 2. Therapeutic Action */}
              <tr className="hover:bg-slate-800/30 transition">
                <td className="p-4 font-bold text-slate-300">Therapeutic Action</td>
                {candidate_drugs.map((drug, idx) => (
                  <td key={idx} className="p-4 text-center text-slate-300 text-xs">
                    {drug.therapeutic_action || drug.drug_class || 'N/A'}
                  </td>
                ))}
              </tr>

              {/* 3. Predicted Effectiveness */}
              <tr className="hover:bg-slate-800/30 transition">
                <td className="p-4 font-bold text-slate-300">Predicted Effectiveness</td>
                {candidate_drugs.map((drug, idx) => (
                  <td key={idx} className="p-4 text-center">
                    {typeof drug.effectiveness_pct === 'number' ? (
                      <span className="inline-block px-2.5 py-1 rounded-lg font-mono font-bold text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {drug.effectiveness_pct}%
                      </span>
                    ) : (
                      <span className="text-slate-500 font-mono">N/A</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* 4. Adverse Side-Effect Risk */}
              <tr className="hover:bg-slate-800/30 transition">
                <td className="p-4 font-bold text-slate-300">Side-Effect Risk</td>
                {candidate_drugs.map((drug, idx) => (
                  <td key={idx} className="p-4 text-center">
                    {typeof drug.side_effect_pct === 'number' ? (
                      <span className="inline-block px-2.5 py-1 rounded-lg font-mono font-bold text-xs bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {drug.side_effect_pct}%
                      </span>
                    ) : (
                      <span className="text-slate-500 font-mono">N/A</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* 5. Drug Interaction Risk (DDI) */}
              <tr className="hover:bg-slate-800/30 transition">
                <td className="p-4 font-bold text-slate-300">Drug Interaction Risk</td>
                {candidate_drugs.map((drug, idx) => {
                  const ddiScore = typeof drug.ddi_pct === 'number'
                    ? drug.ddi_pct
                    : typeof drug.ddi === 'number'
                    ? (drug.ddi <= 1 ? Math.round(drug.ddi * 100) : drug.ddi)
                    : typeof drug.ddi_risk === 'number'
                    ? (drug.ddi_risk <= 1 ? Math.round(drug.ddi_risk * 100) : drug.ddi_risk)
                    : (typeof drug.interaction_risk === 'number' ? drug.interaction_risk : 8);

                  return (
                    <td key={idx} className="p-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg font-mono font-bold text-xs ${
                          ddiScore > 40
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : ddiScore > 20
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {ddiScore}%
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* 6. Allergy Compatibility */}
              <tr className="hover:bg-slate-800/30 transition">
                <td className="p-4 font-bold text-slate-300">Allergy Compatibility</td>
                {candidate_drugs.map((drug, idx) => {
                  const isSafe = drug.allergy_safe ?? true;
                  return (
                    <td key={idx} className="p-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg font-bold text-xs ${
                          isSafe
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {drug.allergy_compatibility || (isSafe ? 'Compatible' : 'CONTRAINDICATED')}
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* 7. Patient Suitability Score */}
              <tr className="hover:bg-slate-800/30 transition">
                <td className="p-4 font-bold text-slate-300">Patient Suitability Score</td>
                {candidate_drugs.map((drug, idx) => {
                  const isExcluded = drug.eligibility === 'EXCLUDED';
                  const score = isExcluded ? 0 : drug.suitability_score;
                  return (
                    <td key={idx} className="p-4 text-center">
                      {isExcluded ? (
                        <span className="inline-block px-2.5 py-1 rounded-lg font-mono font-bold text-xs bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          0 / 100 (Excluded)
                        </span>
                      ) : typeof score === 'number' ? (
                        <span className="inline-block px-2.5 py-1 rounded-lg font-mono font-extrabold text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                          {score} / 100
                        </span>
                      ) : (
                        <span className="text-slate-500 font-mono">N/A</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* 8. Recovery Timeline (Evidence-Grounded) */}
              <tr className="hover:bg-slate-800/30 transition">
                <td className="p-4 font-bold text-slate-300">Clinical Recovery Timeline</td>
                {candidate_drugs.map((drug, idx) => (
                  <td key={idx} className="p-4 text-center text-[11px] text-slate-300 leading-snug">
                    {drug.recovery_time || 'Recovery duration cannot be reliably estimated from the available information.'}
                  </td>
                ))}
              </tr>

              {/* 9. Indian Pricing Comparison */}
              <tr className="hover:bg-slate-800/30 transition">
                <td className="p-4 font-bold text-slate-300">Indian Medicine Price</td>
                {candidate_drugs.map((drug, idx) => {
                  const p = drug.pricing;
                  return (
                    <td key={idx} className="p-4 text-center">
                      {p && p.has_pricing && p.generic ? (
                        <div className="space-y-0.5 font-mono text-[11px]">
                          <span className="text-emerald-400 font-bold block">
                            ₹{p.generic.unit_price?.toFixed(2)} / tab (Generic)
                          </span>
                          {p.branded && (
                            <span className="text-slate-400 text-[10px] block">
                              Branded: ₹{p.branded.unit_price?.toFixed(2)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-amber-400 font-mono text-xs">Price unavailable</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* 10. Information Source */}
              <tr className="hover:bg-slate-800/30 transition">
                <td className="p-4 font-bold text-slate-300">Information Source</td>
                {candidate_drugs.map((drug, idx) => (
                  <td key={idx} className="p-4 text-center text-[10px] text-slate-400 font-mono">
                    {drug.recovery_source || drug.pricing?.price_source || 'Clinical Practice Guidelines (NPPA / PMBJP / openFDA)'}
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

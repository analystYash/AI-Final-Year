import React, { useState, useEffect, useCallback } from 'react';
import {
  Languages, ShieldCheck, AlertOctagon, Utensils, MessageSquareText,
  Sparkles, RefreshCw, AlertTriangle, Check, User, Clock,
  ShieldAlert, Info, Zap, Activity, Heart, Brain
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getGeminiDrugAnalysis } from '../services/api';

const ORGAN_ICON_MAP = {
  stomach: '🫁', liver: '🫀', heart: '❤️', brain: '🧠', kidneys: '🫘', lungs: '🫁'
};

const SEVERITY_CONFIG = {
  mild:     { color: 'text-amber-400',  bg: 'bg-amber-500/10  border-amber-500/30',  label: 'Mild' },
  moderate: { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', label: 'Moderate' },
  severe:   { color: 'text-rose-400',   bg: 'bg-rose-500/10   border-rose-500/30',   label: 'Severe' }
};

export default function AiRecommendation({
  recommendations, recommendation, prediction,
  patientName = 'Patient', patient = null,
  drugNames = null
}) {
  const { lang } = useLanguage();
  const [activeLang, setActiveLang] = useState(lang || 'english');
  const [geminiData, setGeminiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('advisory'); // 'advisory' | 'body' | 'side' | 'allergy'

  // Sync language
  useEffect(() => { if (lang) setActiveLang(lang); }, [lang]);

  const drugs = drugNames
    ? (Array.isArray(drugNames) ? drugNames : [drugNames])
    : [prediction?.drug_name].filter(Boolean);

  // Auto-fetch Gemini analysis when patient/drug changes
  const fetchGeminiAnalysis = useCallback(async () => {
    if (!patient || drugs.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const result = await getGeminiDrugAnalysis({ drugNames: drugs, patient, lang: activeLang });
      setGeminiData(result);
    } catch (e) {
      setError('AI analysis unavailable: ' + (e.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [patient, drugs.join(','), activeLang]);

  useEffect(() => {
    fetchGeminiAnalysis();
  }, [fetchGeminiAnalysis]);

  // Fallback legacy recommendation
  const recObj = recommendations || recommendation || prediction?.multilingual_recommendation;
  const legacyText = recObj ? (recObj[activeLang] || recObj.english || '') : '';
  const dietary = prediction?.dietary_warnings || '';

  // Age group label
  const ageNum = parseInt(patient?.age || '30');
  const ageGroup = ageNum < 12 ? '👶 Pediatric' : ageNum < 18 ? '🧒 Adolescent' : ageNum >= 60 ? '👴 Elderly' : '🧑 Adult';

  const TABS = [
    { id: 'advisory', label: 'AI Advisory', icon: <Sparkles size={13} /> },
    { id: 'body',     label: 'Body Effects', icon: <Activity size={13} /> },
    { id: 'side',     label: 'Side Effects', icon: <AlertTriangle size={13} /> },
    { id: 'diet',     label: 'Personalized Food', icon: <Utensils size={13} /> },
    { id: 'allergy',  label: 'Allergy Check', icon: <ShieldAlert size={13} /> },
  ];

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageSquareText size={18} className="text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">AI Clinical Analysis</h3>
          {patient && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 font-mono flex items-center gap-1">
              <User size={9} /> {ageGroup} • {patient.age}y
            </span>
          )}
          {patient?.allergies && patient.allergies.toLowerCase() !== 'none' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono flex items-center gap-1">
              <AlertTriangle size={9} /> Allergies: {patient.allergies}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <div className="flex items-center bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/60">
            <Languages size={12} className="text-slate-400 ml-1 mr-1" />
            {['english', 'hinglish', 'marathi'].map(l => (
              <button
                key={l}
                onClick={() => setActiveLang(l)}
                className={`px-2 py-1 rounded-lg text-[10px] font-medium transition ${
                  activeLang === l ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                {l === 'english' ? 'EN' : l === 'hinglish' ? 'Hinglish' : 'मराठी'}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={fetchGeminiAnalysis}
            disabled={loading}
            title="Refresh AI Analysis"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 border border-slate-700 transition"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex border-b border-slate-800 bg-slate-950/50">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold transition ${
              activeTab === tab.id
                ? 'text-cyan-400 border-b-2 border-cyan-500 bg-slate-950/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-6 flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">
            Gemini AI analyzing {drugs.join(', ')} for {patient?.name || patientName}...
          </span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="p-3 m-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
          <AlertOctagon size={14} /> {error}
          <button onClick={fetchGeminiAnalysis} className="ml-auto text-rose-300 underline text-[11px]">Retry</button>
        </div>
      )}

      {/* Tab Content */}
      {!loading && (
        <div className="p-4 space-y-3">

          {/* ── TAB: AI ADVISORY ── */}
          {activeTab === 'advisory' && (
            <div className="space-y-3">
              {/* Gemini Advisory */}
              {geminiData?.advisory ? (
                <div className="bg-gradient-to-r from-blue-950/60 to-slate-950 rounded-xl border border-blue-500/30 p-4 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Sparkles size={12} /> Gemini AI Clinical Advisory — {ageGroup}
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                    {geminiData.advisory[activeLang] || geminiData.advisory.english}
                  </p>
                </div>
              ) : legacyText ? (
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                  {legacyText}
                </div>
              ) : null}

              {/* Age-Specific Warning */}
              {geminiData?.ageSpecificWarning && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 text-xs">
                  <Info size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-indigo-300 block">Age-Specific Note ({ageGroup}):</span>
                    <span>{geminiData.ageSpecificWarning}</span>
                  </div>
                </div>
              )}

              {/* Drug Interactions (if multiple drugs) */}
              {geminiData?.interactions && drugs.length > 1 && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-200 text-xs">
                  <Zap size={14} className="text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-purple-300 block">Drug-Drug Interactions ({drugs.length} medicines):</span>
                    <span>{geminiData.interactions}</span>
                  </div>
                </div>
              )}

              {/* Dietary */}
              {dietary && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
                  <Utensils size={14} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-amber-300">Dietary Precaution:</span>
                    <span>{dietary}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: BODY EFFECTS ── */}
          {activeTab === 'body' && (
            <div className="space-y-2">
              {geminiData?.bodyEffects?.length > 0 ? (
                <>
                  <p className="text-[11px] text-slate-400">
                    How <span className="text-cyan-400 font-semibold">{drugs.join(', ')}</span> affects the body —
                    personalized for <span className="text-amber-400">{ageGroup}</span> patient:
                  </p>
                  {geminiData.bodyEffects.map((effect, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-lg shrink-0">{ORGAN_ICON_MAP[effect.organ] || '💊'}</span>
                      <div>
                        <span className="font-bold text-white text-xs block">{effect.title}</span>
                        <span className="text-[11px] text-slate-400">{effect.description}</span>
                        {effect.organ && (
                          <span className="mt-1 inline-block text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 capitalize">
                            Target: {effect.organ}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="p-4 text-center text-slate-500 text-xs">
                  {!geminiData ? 'Run analysis to see body effects.' : 'No specific body effect data returned.'}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: SIDE EFFECTS ── */}
          {activeTab === 'side' && (
            <div className="space-y-2">
              {geminiData?.sideEffects?.length > 0 ? (
                <>
                  <p className="text-[11px] text-slate-400">
                    Possible side effects for <span className="text-amber-400">{ageGroup}</span> patient:
                  </p>
                  {geminiData.sideEffects.map((se, idx) => {
                    const sev = SEVERITY_CONFIG[se.severity?.toLowerCase()] || SEVERITY_CONFIG.mild;
                    return (
                      <div key={idx} className={`flex items-start justify-between p-2.5 rounded-xl border ${sev.bg}`}>
                        <div className="space-y-0.5">
                          <span className={`font-semibold text-xs ${sev.color}`}>{se.effect}</span>
                          {se.ageNote && (
                            <p className="text-[10px] text-slate-400 flex items-center gap-1">
                              <User size={9} /> {se.ageNote}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className={`text-[10px] font-mono font-bold ${sev.color}`}>{se.incidence || '—'}</span>
                          <span className={`block text-[9px] px-1.5 py-0.5 rounded font-bold ${sev.bg} ${sev.color}`}>{sev.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="p-4 text-center text-slate-500 text-xs">
                  {!geminiData ? 'Run analysis to see side effects.' : 'No side effect data available.'}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: PERSONALIZED DIET & FOOD (MULTILINGUAL) ── */}
          {activeTab === 'diet' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Utensils size={13} className="text-emerald-400" />
                  Personalized Nutrition for <span className="text-white font-bold">{patient?.current_health_issue || 'Health Condition'}</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold">
                  {ageGroup}
                </span>
              </div>

              {/* Foods To Eat */}
              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-400" />
                  {activeLang === 'marathi' ? 'खाण्यासाठी शिफारस केलेले अन्न (Foods to Eat):' :
                   activeLang === 'hinglish' ? 'Yeh Khana Chahiye (Recommended Foods):' :
                   'Recommended Foods to Eat:'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                  {(geminiData?.personalizedDiet?.foodsToEat?.[activeLang] ||
                    geminiData?.personalizedDiet?.foodsToEat?.english ||
                    ['Coconut water & light khichdi', 'Boiled vegetables & oats', 'Adequate water & buttermilk', 'Non-citrus fresh fruits']
                  ).map((food, fi) => (
                    <div key={fi} className="flex items-start gap-1.5 text-xs text-slate-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      <span>{food}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Foods To Avoid */}
              <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-rose-400" />
                  {activeLang === 'marathi' ? 'काटेकोरपणे टाळायचे पदार्थ (Foods to Avoid):' :
                   activeLang === 'hinglish' ? 'Yeh Bilkul Na Khayein (Strictly Avoid):' :
                   'Strictly Harmful Foods to Avoid:'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                  {(geminiData?.personalizedDiet?.foodsToAvoid?.[activeLang] ||
                    geminiData?.personalizedDiet?.foodsToAvoid?.english ||
                    ['Deep fried & oily spicy foods', 'Excess coffee & tea on empty stomach', 'Sour citrus & carbonated drinks', 'Late night heavy meals']
                  ).map((avoid, ai) => (
                    <div key={ai} className="flex items-start gap-1.5 text-xs text-rose-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                      <span>{avoid}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clinical Dietary Reason */}
              {(geminiData?.personalizedDiet?.clinicalReason?.[activeLang] || geminiData?.personalizedDiet?.clinicalReason?.english) && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
                  <Info size={13} className="text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>{activeLang === 'marathi' ? 'वैद्यकीय कारण:' : activeLang === 'hinglish' ? 'Doctor ki Salah:' : 'Clinical Rationale:'}</strong>{' '}
                    {geminiData.personalizedDiet.clinicalReason[activeLang] || geminiData.personalizedDiet.clinicalReason.english}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: ALLERGY CHECK ── */}
          {activeTab === 'allergy' && (
            <div className="space-y-2">
              {patient?.allergies && patient.allergies.toLowerCase() !== 'none' ? (
                <>
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                    <span>Patient has known allergies: <strong className="text-amber-300">{patient.allergies}</strong></span>
                  </div>

                  {geminiData?.allergyWarnings?.length > 0 ? (
                    geminiData.allergyWarnings.map((aw, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <ShieldAlert size={14} className="text-rose-400" />
                          <span className="font-bold text-rose-300">Allergen: {aw.allergen}</span>
                        </div>
                        <p className="text-slate-300 pl-5">{aw.risk}</p>
                        <p className="text-cyan-300 pl-5 font-semibold">
                          Recommendation: {aw.recommendation}
                        </p>
                      </div>
                    ))
                  ) : geminiData ? (
                    <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs">
                      <Check size={14} className="text-emerald-400" />
                      No direct allergy conflicts detected for {drugs.join(', ')} with patient allergies.
                    </div>
                  ) : (
                    <div className="p-3 text-slate-500 text-xs text-center">Run analysis to check allergy conflicts.</div>
                  )}

                  {/* Drug allergy cross-reference table */}
                  <div className="bg-slate-950 rounded-xl border border-slate-800 p-3 text-[11px] space-y-1.5">
                    <span className="text-slate-400 font-bold uppercase text-[10px] block">Cross-Reference: Prescription vs Allergies</span>
                    {drugs.map(drug => (
                      <div key={drug} className="flex items-center justify-between py-1 border-b border-slate-800/60 last:border-0">
                        <span className="text-cyan-400 font-semibold">{drug}</span>
                        <span className="text-slate-400">vs</span>
                        <span className="text-amber-400">{patient.allergies}</span>
                        {geminiData?.allergyWarnings?.some(w =>
                          w.allergen && patient.allergies?.toLowerCase().includes(w.allergen.toLowerCase())
                        ) ? (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9px] font-bold">⚠ Review</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">✓ Clear</span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  No known allergies recorded for this patient. Safe to proceed.
                </div>
              )}
            </div>
          )}

          {/* Safety disclaimer */}
          <div className="flex items-center gap-2 p-3 bg-slate-950/40 rounded-xl border border-slate-800/60 text-[11px] text-slate-400 mt-2">
            <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
            <span>
              <strong>Decision-Support Tool:</strong> This Gemini AI analysis provides clinical guidance. Final prescription is the sole responsibility of the licensed physician.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

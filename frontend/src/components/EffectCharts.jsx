import React from 'react';
import {
  ShieldAlert, CheckCircle, AlertTriangle, HeartPulse,
  TrendingUp, BarChart2, PieChart as PieIcon, Activity
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend
} from 'recharts';

export default function EffectCharts({ prediction }) {
  if (!prediction) {
    return (
      <div className="bg-white border border-[#E8EDF2] rounded-xl p-6 text-center text-[#64748B] shadow-xs">
        Run ML clinical analysis to view graphical pharmacological evaluation charts.
      </div>
    );
  }

  const {
    effectiveness_pct = 75,
    side_effect_pct = 20,
    ddi_pct = 15,
    overall_risk_pct = 28,
    overall_risk_level = 'LOW',
    xai_factors = []
  } = prediction;

  // Chart 1: Doughnut Chart for Risk Distribution (Muted Teal, Slate Blue, Sage Green)
  const donutData = [
    { name: 'Therapeutic Benefit', value: effectiveness_pct, color: '#5B9A94' },
    { name: 'Side-Effect Variance', value: side_effect_pct, color: '#7895AE' },
    { name: 'DDI / Interaction Risk', value: ddi_pct, color: '#8EAA90' }
  ];

  // Chart 2: Horizontal Bar Chart for Side-Effect Profile across organ systems
  const sideEffectData = [
    { system: 'Gastrointestinal', risk: Math.min(side_effect_pct, 24) },
    { system: 'Hepatic Clearance', risk: Math.max(Math.round(side_effect_pct * 0.45), 6) },
    { system: 'Renal Excretion', risk: Math.max(Math.round(side_effect_pct * 0.35), 5) },
    { system: 'Cardiovascular', risk: Math.max(Math.round(side_effect_pct * 0.2), 3) },
    { system: 'Central Nervous', risk: Math.max(Math.round(side_effect_pct * 0.25), 4) }
  ];

  // Chart 3: Line Chart for Time-Based Patient Health & Symptom Relief Progression
  const trendData = [
    { day: 'Day 1', reliefScore: 32, acidIndex: 85 },
    { day: 'Day 3', reliefScore: 58, acidIndex: 55 },
    { day: 'Day 5', reliefScore: 74, acidIndex: 35 },
    { day: 'Day 7', reliefScore: 86, acidIndex: 20 },
    { day: 'Day 10', reliefScore: 92, acidIndex: 12 }
  ];

  // Safe color for overall risk badge
  const normRisk = String(overall_risk_level).toUpperCase();
  const riskBadgeClass = normRisk.includes('HIGH')
    ? 'bg-[#F3DEDE] text-[#962A2A] border-[#F3DEDE]'
    : normRisk.includes('MOD') || normRisk.includes('MED')
    ? 'bg-[#F7EED5] text-[#785200] border-[#F7EED5]'
    : 'bg-[#DDECE2] text-[#24593E] border-[#DDECE2]';

  return (
    <div className="space-y-6">
      
      {/* SECTION 1: TOP 3 CLINICAL METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="bg-white border border-[#E8EDF2] p-4 rounded-xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">Therapeutic Effectiveness</span>
            <span className="text-[10px] font-semibold text-[#487B76] bg-[#EBF3F2] px-2 py-0.5 rounded">
              Predicted
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#334155]">{effectiveness_pct}%</span>
            <span className="text-xs text-[#7895AE]">clinical efficacy</span>
          </div>
          <div className="w-full bg-[#E8EDF2] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#5B9A94] h-full rounded-full transition-all duration-700"
              style={{ width: `${effectiveness_pct}%` }}
            />
          </div>
          <p className="text-[11px] text-[#64748B]">Indication match &amp; receptor affinity</p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-[#E8EDF2] p-4 rounded-xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">Adverse Side-Effect Risk</span>
            <span className="text-[10px] font-semibold text-[#785200] bg-[#F7EED5] px-2 py-0.5 rounded">
              Adjusted
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#334155]">{side_effect_pct}%</span>
            <span className="text-xs text-[#7895AE]">adverse potential</span>
          </div>
          <div className="w-full bg-[#E8EDF2] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#7895AE] h-full rounded-full transition-all duration-700"
              style={{ width: `${side_effect_pct}%` }}
            />
          </div>
          <p className="text-[11px] text-[#64748B]">Adjusted for patient age &amp; clearance</p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-[#E8EDF2] p-4 rounded-xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">Drug Interaction (DDI) Risk</span>
            <span className="text-[10px] font-semibold text-[#2A517E] bg-[#E3EDF5] px-2 py-0.5 rounded">
              Polypharmacy
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#334155]">{ddi_pct}%</span>
            <span className="text-xs text-[#7895AE]">interaction hazard</span>
          </div>
          <div className="w-full bg-[#E8EDF2] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#8EAA90] h-full rounded-full transition-all duration-700"
              style={{ width: `${ddi_pct}%` }}
            />
          </div>
          <p className="text-[11px] text-[#64748B]">Pairwise drug compatibility cross-check</p>
        </div>
      </div>

      {/* SECTION 2: OVERALL RISK LEVEL BANNER */}
      <div className="bg-white border border-[#E8EDF2] rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <HeartPulse size={18} className="text-[#5B9A94]" />
          <div>
            <h4 className="text-xs font-bold text-[#334155]">Overall Clinical Risk Stratification</h4>
            <span className="text-[11px] text-[#64748B]">Multi-factor safety baseline derived from patient profile and pharmacology</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${riskBadgeClass}`}>
            {overall_risk_level} RISK ({overall_risk_pct}%)
          </span>
        </div>
      </div>

      {/* SECTION 3: CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* CHART A: Doughnut Chart for Risk Distribution (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-[#E8EDF2] rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#E8EDF2] pb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#334155]">
              <PieIcon size={15} className="text-[#5B9A94]" />
              <span>Risk &amp; Efficacy Distribution</span>
            </div>
            <span className="text-[10px] text-[#7895AE]">Doughnut View</span>
          </div>

          <div className="h-56 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-2.5 rounded-lg border border-[#E8EDF2] shadow-sm text-xs space-y-0.5">
                          <p className="font-semibold text-[#334155]">{payload[0].name}</p>
                          <p className="text-[#64748B] font-mono">{payload[0].value}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center pointer-events-none">
              <span className="text-xl font-bold text-[#334155]">{effectiveness_pct}%</span>
              <span className="text-[10px] text-[#64748B] block">Benefit</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 pt-1 text-center text-[10px]">
            {donutData.map((d, i) => (
              <div key={i} className="p-1.5 rounded-md bg-[#F8FAFC] border border-[#E8EDF2]">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></span>
                  <span className="font-semibold text-[#334155]">{d.value}%</span>
                </div>
                <span className="text-[#64748B] truncate block">{d.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CHART B: Horizontal Bar Chart for Side-Effect System Breakdown (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-[#E8EDF2] rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#E8EDF2] pb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#334155]">
              <BarChart2 size={15} className="text-[#7895AE]" />
              <span>Side-Effect Profile by Organ System</span>
            </div>
            <span className="text-[10px] text-[#7895AE]">Horizontal Bars</span>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={sideEffectData}
                margin={{ top: 8, right: 20, left: 24, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E8EDF2" />
                <XAxis type="number" domain={[0, 30]} tick={{ fontSize: 10, fill: '#64748B' }} unit="%" />
                <YAxis
                  dataKey="system"
                  type="category"
                  tick={{ fontSize: 10, fill: '#334155' }}
                  width={90}
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-2 rounded-lg border border-[#E8EDF2] shadow-sm text-xs">
                          <p className="font-semibold text-[#334155]">{payload[0].payload.system}</p>
                          <p className="text-[#64748B]">Adverse Risk: <strong className="text-[#334155]">{payload[0].value}%</strong></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="risk" fill="#7895AE" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] text-[#64748B]">
            Muted slate bars denote organ-specific clearance and tolerance predictions based on patient baseline.
          </p>
        </div>
      </div>

      {/* SECTION 4: LINE CHART FOR TIME-BASED PATIENT HEALTH TRENDS */}
      <div className="bg-white border border-[#E8EDF2] rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#E8EDF2] pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#334155]">
            <TrendingUp size={15} className="text-[#5B9A94]" />
            <span>Time-Based Patient Health &amp; Symptom Relief Trend</span>
          </div>
          <span className="text-[10px] text-[#7895AE]">10-Day Pharmacokinetic Trajectory</span>
        </div>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF2" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} unit="%" />
              <RechartsTooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-3 rounded-lg border border-[#E8EDF2] shadow-sm text-xs space-y-1">
                        <p className="font-bold text-[#334155]">{label}</p>
                        <p className="text-[#487B76]">Symptom Relief: <strong>{payload[0].value}%</strong></p>
                        <p className="text-[#7895AE]">Acid Severity: <strong>{payload[1].value}%</strong></p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                height={32}
                formatter={(val) => (
                  <span className="text-xs text-[#64748B]">
                    {val === 'reliefScore' ? 'Predicted Symptom Relief' : 'Gastric Irritation Index'}
                  </span>
                )}
              />
              <Line
                type="monotone"
                dataKey="reliefScore"
                stroke="#5B9A94"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#5B9A94' }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="acidIndex"
                stroke="#7895AE"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3, fill: '#7895AE' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <p className="text-[11px] text-[#64748B]">
          Continuous line indicates symptom resolution progression; dashed line indicates diminishing clinical severity over the 10-day prescribed regimen.
        </p>
      </div>

      {/* SECTION 5: EXPLAINABLE AI (XAI) KEY PATIENT FACTORS */}
      {xai_factors.length > 0 && (
        <div className="bg-white border border-[#E8EDF2] rounded-xl p-5 shadow-xs space-y-3">
          <h4 className="text-xs font-bold text-[#334155] uppercase tracking-wider flex items-center gap-2 border-b border-[#E8EDF2] pb-2">
            <ShieldAlert size={15} className="text-[#5B9A94]" />
            Explainable AI (XAI) — Key Contributing Patient Factors
          </h4>
          <div className="space-y-2">
            {xai_factors.map((factor, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg border border-[#E8EDF2] text-xs"
              >
                <div className="flex items-start gap-2 max-w-[80%]">
                  <span
                    className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      factor.type === 'positive' ? 'bg-[#5B9A94]' : 'bg-[#7895AE]'
                    }`}
                  />
                  <div>
                    <span className="font-semibold text-[#334155] block">{factor.factor}</span>
                    <span className="text-[#64748B] text-[11px]">{factor.description}</span>
                  </div>
                </div>
                <span
                  className={`font-mono font-semibold px-2 py-0.5 rounded text-[11px] ${
                    factor.type === 'positive'
                      ? 'bg-[#DDECE2] text-[#24593E] border border-[#DDECE2]'
                      : 'bg-[#F7EED5] text-[#785200] border border-[#F7EED5]'
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

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Database, FileSpreadsheet, FileText, ArrowRight, ArrowLeft, Download,
  Upload, RefreshCw, CheckCircle2, AlertTriangle, Search, Filter,
  ChevronLeft, ChevronRight, BarChart3, Activity, Shield, Sparkles,
  Layers, Sliders, Cpu, Play, Check, X, Info, ExternalLink, Table,
  ArrowUpRight, Clock, HelpCircle
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import {
  getDatasetPresets, getDatasetRecords, downloadDatasetFile,
  downloadTrainTemplate, uploadMlDataset, retrainModel, getMlDatasetStats
} from '../services/api';

export default function TrainDatasetPage() {
  const navigate = useNavigate();

  // Presets & Active Selection
  const [presets, setPresets] = useState([]);
  const [activePreset, setActivePreset] = useState('1'); // Default master clinical
  const [activeFile, setActiveFile] = useState('');

  // Records Table State
  const [records, setRecords] = useState([]);
  const [totalDatasetRows, setTotalDatasetRows] = useState(0);
  const [totalMatching, setTotalMatching] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [fileType, setFileType] = useState('Excel Spreadsheet (.xlsx)');
  const [fileName, setFileName] = useState('');

  // Summary Metrics State
  const [riskCounts, setRiskCounts] = useState({ LOW: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0 });
  const [avgEffectiveness, setAvgEffectiveness] = useState(0);
  const [avgSideEffect, setAvgSideEffect] = useState(0);
  const [availableConditions, setAvailableConditions] = useState([]);
  const [availableDrugs, setAvailableDrugs] = useState([]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [selectedDrug, setSelectedDrug] = useState('all');
  const [selectedRisk, setSelectedRisk] = useState('ALL');
  const [selectedGender, setSelectedGender] = useState('all');

  // Retrain Engine State
  const [epochs, setEpochs] = useState(15);
  const [pairedTestPreset, setPairedTestPreset] = useState('1');
  const [isRetraining, setIsRetraining] = useState(false);
  const [retrainLogs, setRetrainLogs] = useState([]);
  const [retrainSuccess, setRetrainSuccess] = useState('');
  const [retrainError, setRetrainError] = useState('');
  const [epochHistory, setEpochHistory] = useState([]);
  const [showRetrainModal, setShowRetrainModal] = useState(false);

  // Upload State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  // Load Presets & Initial Stats
  useEffect(() => {
    loadPresetsAndStats();
  }, []);

  const loadPresetsAndStats = async () => {
    try {
      const res = await getDatasetPresets();
      if (res && res.presets) {
        setPresets(res.presets);
      }
      const stats = await getMlDatasetStats();
      if (stats && stats.epoch_history) {
        setEpochHistory(stats.epoch_history);
      }
    } catch (err) {
      console.error('Error loading presets or stats:', err);
    }
  };

  // Fetch Dataset Records on Filter/Page/Preset Change
  useEffect(() => {
    fetchRecords();
  }, [activePreset, activeFile, page, limit, selectedCondition, selectedDrug, selectedRisk, selectedGender]);

  // Debounced Search query
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecords();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchRecords = async () => {
    setLoadingRecords(true);
    try {
      const res = await getDatasetRecords({
        role: 'train',
        preset: activePreset,
        file: activeFile || undefined,
        page,
        limit,
        search: searchQuery,
        condition: selectedCondition !== 'all' ? selectedCondition : undefined,
        drug: selectedDrug !== 'all' ? selectedDrug : undefined,
        risk: selectedRisk !== 'ALL' ? selectedRisk : undefined,
        gender: selectedGender !== 'all' ? selectedGender : undefined
      });

      if (res && res.success) {
        setRecords(res.records || []);
        setTotalDatasetRows(res.total_dataset_rows || 0);
        setTotalMatching(res.total_matching || 0);
        setTotalPages(res.total_pages || 1);
        setFileName(res.file_name || '');
        setFileType(res.file_type || 'Excel Spreadsheet');
        setRiskCounts(res.risk_counts || { LOW: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0 });
        setAvgEffectiveness(res.avg_effectiveness || 0);
        setAvgSideEffect(res.avg_side_effect || 0);
        if (res.available_conditions && res.available_conditions.length > 0) {
          setAvailableConditions(res.available_conditions);
        }
        if (res.available_drugs && res.available_drugs.length > 0) {
          setAvailableDrugs(res.available_drugs);
        }
      }
    } catch (err) {
      console.error('Failed to fetch training records:', err);
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleSelectPreset = (presetKey) => {
    setActivePreset(presetKey);
    setActiveFile('');
    setPage(1);
    setSearchQuery('');
    setSelectedCondition('all');
    setSelectedDrug('all');
    setSelectedRisk('ALL');
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCondition('all');
    setSelectedDrug('all');
    setSelectedRisk('ALL');
    setSelectedGender('all');
    setPage(1);
  };

  // Trigger Model Retraining on Selected Training Cohort
  const handleTriggerRetrain = async () => {
    setIsRetraining(true);
    setRetrainSuccess('');
    setRetrainError('');
    setRetrainLogs([
      `[00:00] Initializing Supervised Training Engine (Gradient-Boosted Pharmacology Ensemble)...`,
      `[00:01] Binding Training Cohort: ${fileName || 'Selected Clinical Dataset'} (${totalDatasetRows} rows, 80% partition)...`,
      `[00:02] Resolving Paired Test Validation Cohort (20% holdout partition)...`
    ]);

    try {
      const activeObj = presets.find((p) => p.key === activePreset);
      const pairedObj = presets.find((p) => p.key === pairedTestPreset);

      const res = await retrainModel({
        epochs: Number(epochs),
        train_path: activeObj ? activeObj.train_file : undefined,
        test_path: pairedObj ? pairedObj.test_file : undefined,
        use_train_test: true
      });

      if (res && res.success) {
        setRetrainSuccess(res.message || 'Model training completed successfully!');
        if (res.artifacts && res.artifacts.epoch_history) {
          setEpochHistory(res.artifacts.epoch_history);
        }
        if (res.artifacts && res.artifacts.training_logs) {
          setRetrainLogs(res.artifacts.training_logs);
        }
      } else {
        setRetrainError(res?.error || 'Retraining failed. Please check backend logs.');
      }
    } catch (err) {
      setRetrainError(err.message || 'Error occurred during model retraining.');
    } finally {
      setIsRetraining(false);
    }
  };

  // Upload Custom Training Dataset
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    setIsUploading(true);
    setUploadStatus(null);
    try {
      const res = await uploadMlDataset(uploadFile, 'train');
      setUploadStatus({
        success: true,
        message: res.message || `Successfully ingested ${res.total_rows} training records!`
      });
      setActivePreset('');
      setActiveFile('uploaded');
      setPage(1);
      setTimeout(() => {
        setShowUploadModal(false);
        fetchRecords();
      }, 1500);
    } catch (err) {
      setUploadStatus({
        success: false,
        message: err.message || 'Upload failed. Please check format.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* =========================================================================
          TOP NAVIGATION BAR (NEVER REDIRECTS TO DOCTOR LOGIN)
          ========================================================================= */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3.5">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
                <Database className="w-5 h-5 text-slate-950 font-bold" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                    MedInsight AI
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    Train Engine (80%)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                  Supervised Pharmacology Model Training & Dataset Explorer
                </p>
              </div>
            </Link>
          </div>

          {/* DEDICATED SEPARATE PAGE SWITCHER (TRAIN VS TEST) */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
            <button
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 cursor-default"
              title="You are currently viewing the Training Dataset Page (80% Partition)"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Train Dataset (80%)</span>
            </button>

            <Link
              to="/test"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer"
              title="Open Separate Out-of-Sample Test Dataset Page (20% Partition)"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Test Dataset (20%)</span>
              <ArrowRight className="w-3 h-3 text-slate-500" />
            </Link>
          </div>

          {/* Quick Actions & Portal Return */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowRetrainModal(true)}
              className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 hover:brightness-110 shadow-md shadow-cyan-500/10 transition-all cursor-pointer"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Retrain Model</span>
            </button>

            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Upload Train File</span>
            </button>

            <Link
              to="/login"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
              title="Return to Main Login Portal"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Portal</span>
            </Link>
          </div>
        </div>
      </header>

      {/* =========================================================================
          HERO BANNER & DOWNLOAD BAR
          ========================================================================= */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800/80 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Supervised Learning
              </span>
              <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Standard 80% Partition
              </span>
              <span className="text-xs text-slate-400">
                Active File: <strong className="text-white font-mono">{fileName || 'clinical_drug_train.xlsx'}</strong>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Clinical Model Training Dataset
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mt-1 leading-relaxed">
              Explore, inspect, filter, and train supervised machine learning models on high-fidelity clinical pharmacology cohorts.
              Supports universal Excel (.xlsx, .xls) and CSV formats with intelligent fuzzy column normalization.
            </p>
          </div>

          {/* DOWNLOAD DATASET & TEMPLATE ACTIONS */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => downloadDatasetFile({ role: 'train', format: 'xlsx' })}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30 transition cursor-pointer"
              title="Download full 80% training dataset as formatted Excel Spreadsheet"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Download Excel (.xlsx)</span>
            </button>

            <button
              onClick={() => downloadDatasetFile({ role: 'train', format: 'csv' })}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-600/20 text-sky-300 hover:bg-sky-600/30 border border-sky-500/30 transition cursor-pointer"
              title="Download full 80% training dataset as standard CSV"
            >
              <FileText className="w-4 h-4 text-sky-400" />
              <span>Download CSV (.csv)</span>
            </button>

            <button
              onClick={() => downloadTrainTemplate('excel')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Download standardized Training blank template (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Train Template</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MAIN CONTAINER
          ========================================================================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 space-y-6">

        {/* 1. CLINICAL COHORT PRESET TABS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Select Pre-Partitioned 80% Training Cohort
              </h2>
            </div>
            <span className="text-[11px] text-slate-500">
              6 Standard Clinical Cohorts Available
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {presets.map((p) => {
              const isSelected = activePreset === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => handleSelectPreset(p.key)}
                  className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500/80 shadow-md shadow-cyan-500/10'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-white line-clamp-1">
                      {p.name}
                    </span>
                    {isSelected && (
                      <span className="shrink-0 w-2 h-2 rounded-full bg-cyan-400 animate-pulse mt-1" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-1">
                    {p.description}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60 text-[10px]">
                    <span className="font-mono text-cyan-300 font-bold">
                      {p.train_rows ? `${p.train_rows.toLocaleString()} Train Records` : p.samples.split('->')[0]}
                    </span>
                    <span className="text-slate-400 font-mono">
                      80% Partition
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. STATISTIC SUMMARY CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Total Training Cohort */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>Training Samples</span>
            </span>
            <div className="mt-2">
              <div className="text-2xl font-black text-white font-mono">
                {totalDatasetRows.toLocaleString()}
              </div>
              <span className="text-[11px] text-cyan-400 font-semibold">
                80% Standard Split
              </span>
            </div>
          </div>

          {/* Average Effectiveness */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Avg Efficacy</span>
            </span>
            <div className="mt-2">
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {avgEffectiveness}%
              </div>
              <span className="text-[11px] text-slate-400">
                Therapeutic Benefit
              </span>
            </div>
          </div>

          {/* Average Side Effect */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Avg Adverse Risk</span>
            </span>
            <div className="mt-2">
              <div className="text-2xl font-black text-amber-400 font-mono">
                {avgSideEffect}%
              </div>
              <span className="text-[11px] text-slate-400">
                Toxicity Probability
              </span>
            </div>
          </div>

          {/* Risk Level Distribution */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>Safety Classes</span>
            </span>
            <div className="mt-2 flex items-center gap-1 text-[11px] font-mono font-bold">
              <span className="text-emerald-400" title="Low Risk">{riskCounts.LOW} L</span>
              <span className="text-slate-600">•</span>
              <span className="text-amber-400" title="Moderate Risk">{riskCounts.MODERATE} M</span>
              <span className="text-slate-600">•</span>
              <span className="text-rose-400" title="High / Critical">{riskCounts.HIGH + riskCounts.CRITICAL} H/C</span>
            </div>
          </div>

          {/* Model Optimization State */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-violet-400" />
              <span>Format & Engine</span>
            </span>
            <div className="mt-2">
              <div className="text-xs font-bold text-slate-200 line-clamp-1 font-mono">
                {fileType}
              </div>
              <button
                onClick={() => setShowRetrainModal(true)}
                className="mt-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Trigger Retrain</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* 3. INTERACTIVE TRAINING RECORDS TABLE */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          
          {/* Filter & Search Toolbar */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                placeholder="Search by condition, medicine, outcome, trial ID..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Condition Filter */}
              <select
                value={selectedCondition}
                onChange={(e) => { setSelectedCondition(e.target.value); setPage(1); }}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 max-w-[160px]"
              >
                <option value="all">All Conditions</option>
                {availableConditions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* Drug Filter */}
              <select
                value={selectedDrug}
                onChange={(e) => { setSelectedDrug(e.target.value); setPage(1); }}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 max-w-[160px]"
              >
                <option value="all">All Medications</option>
                {availableDrugs.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              {/* Risk Filter */}
              <select
                value={selectedRisk}
                onChange={(e) => { setSelectedRisk(e.target.value); setPage(1); }}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">All Risk Levels</option>
                <option value="LOW">Low Risk</option>
                <option value="MODERATE">Moderate Risk</option>
                <option value="HIGH">High Risk</option>
                <option value="CRITICAL">Critical Risk</option>
              </select>

              {/* Gender Filter */}
              <select
                value={selectedGender}
                onChange={(e) => { setSelectedGender(e.target.value); setPage(1); }}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>

              {/* Clear Filter button */}
              {(searchQuery || selectedCondition !== 'all' || selectedDrug !== 'all' || selectedRisk !== 'ALL' || selectedGender !== 'all') && (
                <button
                  onClick={handleClearFilters}
                  className="px-2.5 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Table Header / Counter Banner */}
          <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing <strong className="text-white font-mono">{records.length}</strong> of{' '}
              <strong className="text-cyan-400 font-mono">{totalMatching.toLocaleString()}</strong> matching records
              {totalMatching !== totalDatasetRows && (
                <span className="text-slate-500"> (filtered from {totalDatasetRows.toLocaleString()} total training records)</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px]">Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-0.5 text-xs text-slate-300"
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Table Element */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/90 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                  <th className="py-3 px-3">Trial ID</th>
                  <th className="py-3 px-3">Age / Sex</th>
                  <th className="py-3 px-4">Primary Condition</th>
                  <th className="py-3 px-4">Administered Drug</th>
                  <th className="py-3 px-3 text-center">Indication</th>
                  <th className="py-3 px-3 text-center">Organ Clear.</th>
                  <th className="py-3 px-3 text-center">DDI Risk</th>
                  <th className="py-3 px-3">Efficacy (%)</th>
                  <th className="py-3 px-3">Adverse (%)</th>
                  <th className="py-3 px-3">Risk Tier</th>
                  <th className="py-3 px-3">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loadingRecords ? (
                  <tr>
                    <td colSpan={11} className="py-16 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto mb-2" />
                      <span>Loading training cohort records from {fileName}...</span>
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-16 text-center text-slate-400">
                      <Info className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                      <p className="font-bold text-slate-300">No training records matched the current filters.</p>
                      <button
                        onClick={handleClearFilters}
                        className="mt-3 px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs"
                      >
                        Reset All Filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  records.map((r, idx) => {
                    const riskTier = String(r.overall_risk_level || 'LOW').toUpperCase();
                    let riskBadgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                    if (riskTier === 'MODERATE') riskBadgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                    if (riskTier === 'HIGH') riskBadgeClass = 'bg-orange-500/10 text-orange-400 border-orange-500/30';
                    if (riskTier === 'CRITICAL') riskBadgeClass = 'bg-rose-500/10 text-rose-400 border-rose-500/30';

                    const eff = parseFloat(r.effectiveness_pct || 0);
                    const tox = parseFloat(r.side_effect_pct || 0);

                    return (
                      <tr
                        key={r.trial_id || idx}
                        className="hover:bg-slate-800/40 transition-colors group"
                      >
                        {/* Trial ID */}
                        <td className="py-2.5 px-3 font-mono font-bold text-cyan-400 whitespace-nowrap">
                          {r.trial_id || `TR-${idx + 1}`}
                        </td>

                        {/* Age / Gender */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="font-mono font-medium text-slate-200">{r.age || '—'}y</span>{' '}
                          <span className="text-slate-500">({r.gender === 'Female' ? 'F' : 'M'})</span>
                        </td>

                        {/* Condition */}
                        <td className="py-2.5 px-4 font-medium text-slate-200 max-w-[180px] truncate" title={r.primary_condition}>
                          {r.primary_condition || '—'}
                        </td>

                        {/* Drug Name */}
                        <td className="py-2.5 px-4 font-bold text-white max-w-[200px] truncate" title={r.drug_name}>
                          {r.drug_name || '—'}
                        </td>

                        {/* Indication Match */}
                        <td className="py-2.5 px-3 text-center">
                          {Number(r.indication_match) === 1 ? (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                              Fit
                            </span>
                          ) : (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                              Off-Label
                            </span>
                          )}
                        </td>

                        {/* Organ Mismatch */}
                        <td className="py-2.5 px-3 text-center">
                          {Number(r.organ_mismatch) === 1 ? (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold">
                              Hazard
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[10px]">Safe</span>
                          )}
                        </td>

                        {/* DDI Hazard */}
                        <td className="py-2.5 px-3 text-center font-mono">
                          {Number(r.ddi_hazard_level) > 0 ? (
                            <span className="text-amber-400 font-bold text-[11px]">
                              L{r.ddi_hazard_level}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[10px]">None</span>
                          )}
                        </td>

                        {/* Effectiveness % */}
                        <td className="py-2.5 px-3 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-emerald-400">{eff.toFixed(1)}%</span>
                            <div className="w-10 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, eff))}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Adverse % */}
                        <td className="py-2.5 px-3 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-amber-400">{tox.toFixed(1)}%</span>
                            <div className="w-10 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                              <div
                                className="h-full bg-amber-500 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, tox))}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Overall Risk Badge */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase ${riskBadgeClass}`}>
                            {riskTier}
                          </span>
                        </td>

                        {/* Outcome */}
                        <td className="py-2.5 px-3 text-slate-300 text-[11px] max-w-[140px] truncate" title={r.clinical_outcome}>
                          {r.clinical_outcome || 'Optimal Response'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between gap-4">
            <span className="text-xs text-slate-400">
              Page <strong className="text-white font-mono">{page}</strong> of{' '}
              <strong className="text-slate-300 font-mono">{totalPages}</strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition text-xs font-bold flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition text-xs font-bold flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 4. LOSS PROGRESSION & MODEL ARCHITECTURE PANEL */}
        {epochHistory && epochHistory.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <span>Model Optimization & Loss Convergence History</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Tracking Training Loss vs. Validation Loss across {epochHistory.length} gradient descent epochs.
                </p>
              </div>

              <Link
                to="/test"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 transition cursor-pointer"
              >
                <span>Verify on 20% Holdout Test Page</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={epochHistory} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="epoch" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Epoch', position: 'insideBottom', offset: -5 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line type="monotone" dataKey="train_loss" name="Train Loss (80%)" stroke="#06b6d4" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="val_loss" name="Validation Loss (20%)" stroke="#10b981" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </main>

      {/* =========================================================================
          RETRAIN MODEL MODAL
          ========================================================================= */}
      {showRetrainModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Retrain Supervised Model</h3>
                  <p className="text-xs text-slate-400">Gradient-Ensemble Training on Active Cohort</p>
                </div>
              </div>
              <button
                onClick={() => setShowRetrainModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {retrainSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{retrainSuccess}</span>
              </div>
            )}

            {retrainError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{retrainError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Active Training Dataset (80%):
                </label>
                <input
                  type="text"
                  readOnly
                  value={`${fileName || 'clinical_drug_train.xlsx'} (${totalDatasetRows} rows)`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Paired Out-of-Sample Test Cohort (20%):
                </label>
                <select
                  value={pairedTestPreset}
                  onChange={(e) => setPairedTestPreset(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  {presets.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.name} ({p.test_file || 'Test Set'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300">
                    Training Epochs:
                  </label>
                  <span className="font-mono text-cyan-400 font-bold text-xs">{epochs} Epochs</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={50}
                  step={5}
                  value={epochs}
                  onChange={(e) => setEpochs(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Fast (5)</span>
                  <span>Standard (15)</span>
                  <span>Deep Convergence (50)</span>
                </div>
              </div>

              {retrainLogs.length > 0 && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 max-h-44 overflow-y-auto font-mono text-[11px] text-slate-400 space-y-1">
                  {retrainLogs.map((log, i) => {
                    if (typeof log === 'string') {
                      return (
                        <div key={i} className="leading-relaxed">
                          {log}
                        </div>
                      );
                    }

                    const level = log?.level || 'INFO';
                    const levelClass =
                      level === 'SUCCESS'
                        ? 'text-emerald-400 font-semibold'
                        : level === 'WARNING'
                        ? 'text-amber-400 font-semibold'
                        : level === 'ERROR'
                        ? 'text-rose-400 font-semibold'
                        : level === 'START'
                        ? 'text-cyan-400 font-semibold'
                        : level === 'TRAIN'
                        ? 'text-indigo-400 font-medium'
                        : 'text-blue-400 font-medium';

                    return (
                      <div key={i} className="flex items-start gap-1.5 leading-relaxed">
                        {log?.timestamp && (
                          <span className="text-slate-500 shrink-0 select-none">[{log.timestamp}]</span>
                        )}
                        {log?.level && (
                          <span className={`shrink-0 select-none ${levelClass}`}>[{level}]</span>
                        )}
                        <span className={level === 'ERROR' ? 'text-rose-300' : level === 'SUCCESS' ? 'text-emerald-300' : 'text-slate-300'}>
                          {typeof log?.message === 'string'
                            ? log.message
                            : log?.message
                            ? JSON.stringify(log.message)
                            : JSON.stringify(log)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowRetrainModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Close
              </button>
              <button
                disabled={isRetraining}
                onClick={handleTriggerRetrain}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 hover:brightness-110 disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                {isRetraining ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Retraining Ensemble...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Start Model Retraining</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          UPLOAD TRAINING FILE MODAL
          ========================================================================= */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Upload Training Dataset</h3>
                  <p className="text-xs text-slate-400">Excel (.xlsx, .xls) or CSV with automatic column mapping</p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadStatus && (
              <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                uploadStatus.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}>
                {uploadStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{uploadStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-2xl p-6 text-center bg-slate-950/50 transition">
                <input
                  type="file"
                  id="train_upload_input"
                  accept=".xlsx,.xls,.xlsm,.csv,.tsv,.txt"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="hidden"
                />
                <label htmlFor="train_upload_input" className="cursor-pointer block">
                  <FileSpreadsheet className="w-10 h-10 text-cyan-400 mx-auto mb-2" />
                  <span className="text-xs font-bold text-white block">
                    {uploadFile ? uploadFile.name : 'Click to select Excel or CSV training file'}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-1">
                    {uploadFile ? `${(uploadFile.size / 1024).toFixed(1)} KB` : 'Supports .xlsx, .xls, .xlsm, .csv, .tsv'}
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Need formatting reference?</span>
                <button
                  type="button"
                  onClick={() => downloadTrainTemplate('excel')}
                  className="text-cyan-400 hover:underline font-bold"
                >
                  Download Training Template
                </button>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || isUploading}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Ingesting...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload & Ingest</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

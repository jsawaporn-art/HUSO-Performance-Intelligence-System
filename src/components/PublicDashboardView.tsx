import React, { useState, useMemo, useEffect } from 'react';
import {
  LayoutDashboard,
  Target,
  Award,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Search,
  Filter,
  ArrowUpRight,
  Building2,
  Calendar,
  LogIn,
  Layers,
  Sparkles,
  BarChart3,
  TrendingUp,
  Share2,
  Check,
  ExternalLink,
  ShieldCheck,
  Clock,
  X,
  GraduationCap,
  Radio,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Indicator,
  MonthlyProgress,
  StrategicIssue,
  Department,
  Target as IndicatorTarget,
  TrafficLightStatus,
} from '../types';
import { BridgeImprovement } from '../types/bridge';
import {
  STANDARD_REPORTING_PERIODS,
  getReportingPeriodInfo,
  getPublicStrategyPerformanceSummary,
  PublicStrategyPerformanceSummary,
  formatStrategyTitle,
} from '../lib/reportingPeriodUtils';
import { PublicStrategyOverview } from './PublicStrategyOverview';
import { PublicBridgeDashboard } from './bridge/PublicBridgeDashboard';
import { HusoLogo } from './HusoLogo';

interface PublicDashboardViewProps {
  indicators: Indicator[];
  monthlyProgressList: MonthlyProgress[];
  strategies: StrategicIssue[];
  departments: Department[];
  targets: IndicatorTarget[];
  selectedYear: string;
  onChangeYear: (year: string) => void;
  availableYears: string[];
  onGoToLogin: () => void;
  isEmbedMode?: boolean;
  tokenError?: string | null;
  shareToken?: string | null;
  bridgeImprovements?: BridgeImprovement[];
}

export const PublicDashboardView: React.FC<PublicDashboardViewProps> = ({
  indicators,
  monthlyProgressList,
  strategies,
  departments,
  targets,
  selectedYear,
  onChangeYear,
  availableYears,
  onGoToLogin,
  isEmbedMode = false,
  tokenError = null,
  shareToken = null,
  bridgeImprovements = [],
}) => {
  const [activeModuleTab, setActiveModuleTab] = useState<'KPI_KVI' | 'BRIDGE'>('KPI_KVI');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Q2');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [selectedStatusClassification, setSelectedStatusClassification] = useState<string>('ALL');
  const [copiedLink, setCopiedLink] = useState(false);

  // Real-time Firestore state for Bridge Improvements filtered by Lifecycle Status
  const [liveBridgeImprovements, setLiveBridgeImprovements] = useState<BridgeImprovement[]>(
    bridgeImprovements || []
  );

  // Subscribe to Firestore 'bridgeImprovements' collection in real-time
  useEffect(() => {
    // Sync initial state from props (if any) while applying lifecycle filters
    if (bridgeImprovements && bridgeImprovements.length > 0) {
      const initialFiltered = bridgeImprovements.filter((item) => {
        if (item.isDeleted === true) return false;
        const overall = (item.overallStatus || '').toUpperCase();
        if (overall === 'DRAFT' || overall === 'CANCELLED') return false;
        if (selectedYear && selectedYear !== 'ALL' && item.fiscalYear) {
          if (String(item.fiscalYear) !== String(selectedYear)) return false;
        }
        return true;
      });
      setLiveBridgeImprovements(initialFiltered);
    }

    try {
      const q = query(collection(db, 'bridgeImprovements'));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const items: BridgeImprovement[] = [];
          const targetFy = selectedYear && selectedYear !== 'ALL' ? String(selectedYear) : null;

          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as BridgeImprovement;
            // 1. Filter out soft-deleted items
            if (data.isDeleted === true) return;

            // 2. Filter out DRAFT items (Lifecycle Stage: must be submitted/active)
            const overall = (data.overallStatus || data.lifecycleStatus || '').toUpperCase();
            if (overall === 'DRAFT') return;

            // 3. Filter out CANCELLED items
            if (overall === 'CANCELLED') return;

            // 4. Match Fiscal Year
            if (targetFy && data.fiscalYear) {
              if (String(data.fiscalYear) !== targetFy) return;
            }

            items.push({ ...data, id: docSnap.id });
          });

          // Sort by createdAt descending
          items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setLiveBridgeImprovements(items);
        },
        (error) => {
          console.warn('Firestore onSnapshot error for bridgeImprovements:', error);
        }
      );

      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    } catch (err) {
      console.warn('Firestore bridgeImprovements listener initialization failed:', err);
    }
  }, [bridgeImprovements, selectedYear]);

  const periodInfo = useMemo(() => getReportingPeriodInfo(selectedPeriod), [selectedPeriod]);

  // Central Single Source of Truth Summary
  const summary: PublicStrategyPerformanceSummary = useMemo(() => {
    return getPublicStrategyPerformanceSummary(
      selectedYear,
      selectedPeriod,
      selectedType,
      selectedDeptId,
      indicators,
      targets,
      monthlyProgressList,
      strategies
    );
  }, [
    selectedYear,
    selectedPeriod,
    selectedType,
    selectedDeptId,
    indicators,
    targets,
    monthlyProgressList,
    strategies,
  ]);

  // Filter Indicators for List View below the overview
  const filteredIndicators = useMemo(() => {
    return summary.indicatorDetails.filter((item) => {
      // 1. Search Query
      const matchSearch =
        !searchTerm.trim() ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.departmentName && item.departmentName.toLowerCase().includes(searchTerm.toLowerCase()));

      // 2. Strategy Filter (from dropdown or chart click)
      const matchStrategy =
        selectedStrategyId === 'ALL' || item.strategyId === selectedStrategyId;

      // 3. Status Classification Filter (from legends or bar segment click)
      const matchClassification =
        selectedStatusClassification === 'ALL' ||
        item.classification === selectedStatusClassification;

      return matchSearch && matchStrategy && matchClassification;
    });
  }, [summary.indicatorDetails, searchTerm, selectedStrategyId, selectedStatusClassification]);

  const handleCopyShareLink = () => {
    const publicUrl =
      window.location.origin +
      '/public/dashboard' +
      (shareToken ? `?token=${encodeURIComponent(shareToken)}` : '');
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleClearAllFilters = () => {
    setSelectedStrategyId('ALL');
    setSelectedStatusClassification('ALL');
    setSelectedType('ALL');
    setSelectedDeptId('ALL');
    setSearchTerm('');
  };

  const getStatusBadge = (status: TrafficLightStatus, classification: string) => {
    if (classification === 'ACHIEVED' || status === 'ON_TRACK') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          บรรลุเป้าหมาย (On Track)
        </span>
      );
    }
    if (classification === 'NOT_ACHIEVED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          ไม่บรรลุเป้าหมาย (Not Achieved)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
        <span className="w-2 h-2 rounded-full bg-slate-400" />
        ยังไม่รายงาน/รอประเมิน
      </span>
    );
  };

  // If token is explicitly invalid or revoked
  if (tokenError) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/40 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-white">ลิงก์การเข้าถึงหมดอายุหรือถูกยกเลิก</h2>
            <p className="text-xs text-rose-300 leading-relaxed">
              {tokenError ||
                'URL Token สำหรับเข้าถึงแดชบอร์ดสาธารณะนี้ไม่ถูกต้อง หมดอายุ หรือถูกยกเลิกการเผยแพร่แล้ว'}
            </p>
          </div>
          <p className="text-xs text-slate-400">
            กรุณาติดต่อผู้ดูแลระบบ คณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏยะลา เพื่อขอรับลิงก์การเข้าถึงใหม่
          </p>
          <div className="pt-2">
            <button
              onClick={onGoToLogin}
              className="inline-flex items-center justify-center space-x-2 w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>ไปยังหน้าเข้าสู่ระบบบุคลากร</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col selection:bg-amber-500 selection:text-white ${
        isEmbedMode ? 'p-0' : ''
      }`}
    >
      {/* Top Header */}
      {!isEmbedMode && (
        <header className="sticky top-0 z-40 bg-slate-950 border-b border-slate-800 text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <HusoLogo variant="badge" size="md" className="shadow-lg shadow-black/20" />
                <div>
                  <div className="flex items-center space-x-2">
                    <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight leading-tight">
                      HUSO Performance Intelligence System
                    </h1>
                    <span className="hidden md:inline-block px-2 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                      Public Dashboard
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium hidden sm:block">
                    คณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏยะลา (แผนยุทธศาสตร์ พ.ศ. 2569 - 2575)
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2.5">
                {/* Year Selector */}
                <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline font-semibold">ปีงบฯ:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => onChangeYear(e.target.value)}
                    className="bg-transparent font-bold text-amber-400 focus:outline-none cursor-pointer"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y} className="bg-slate-900 text-white">
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Copy Link */}
                <button
                  onClick={handleCopyShareLink}
                  title="คัดลอกลิงก์แดชบอร์ดสาธารณะ"
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-bold hidden sm:inline">คัดลอกแล้ว</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="hidden sm:inline">แชร์ลิงก์</span>
                    </>
                  )}
                </button>

                {/* Login Button */}
                <button
                  onClick={onGoToLogin}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md transition cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>เข้าสู่ระบบบุคลากร</span>
                </button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Embed Minimal Top Bar */}
      {isEmbedMode && (
        <div className="bg-slate-950 text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 text-[11px] font-black bg-amber-500 text-slate-950 rounded">
              HUSO
            </span>
            <span className="text-xs font-bold text-slate-200">
              Public Dashboard - มหาวิทยาลัยราชภัฏยะลา
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-medium">ปีงบฯ {selectedYear}</span>
            <button
              onClick={onGoToLogin}
              className="text-[11px] text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              เข้าสู่ระบบ <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-7">
        {/* Module Switcher Tabs (KPI/KVI vs BRIDGE Model) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-1.5 shadow-sm flex flex-col sm:flex-row items-stretch gap-1.5">
          <button
            onClick={() => setActiveModuleTab('KPI_KVI')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeModuleTab === 'KPI_KVI'
                ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/40'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>ผลการดำเนินงานตามยุทธศาสตร์ (KPI & KVI)</span>
          </button>

          <button
            onClick={() => setActiveModuleTab('BRIDGE')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeModuleTab === 'BRIDGE'
                ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-500/40'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>ผลการปรับปรุงกระบวนการ BRIDGE Model (EdPEx)</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                activeModuleTab === 'BRIDGE'
                  ? 'bg-white/20 text-white'
                  : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
              }`}
            >
              {liveBridgeImprovements.length}
            </span>
          </button>
        </div>

        {/* BRIDGE Model Tab Content */}
        {activeModuleTab === 'BRIDGE' ? (
          <PublicBridgeDashboard
            improvements={liveBridgeImprovements}
            departments={departments}
            selectedYear={selectedYear}
          />
        ) : (
          <>
            {/* Banner Overview */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 space-y-4 max-w-3xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ภาพรวมผลการดำเนินงาน คณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏยะลา</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
              รายงานผลการขับเคลื่อนแผนยุทธศาสตร์ <br />
              <span className="text-amber-400">ปีงบประมาณ พ.ศ. {selectedYear}</span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              แดชบอร์ดแสดงผลความก้าวหน้าตัวชี้วัดผลการดำเนินงานหลัก (KPI) และตัวชี้วัดคุณค่าสำคัญ (KVI)
              ที่ได้รับการอนุมัติและเผยแพร่อย่างเป็นทางการ เพื่อความโปร่งใสและการบริหารจัดการที่เป็นเลิศ
            </p>
          </div>

          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-12 translate-y-12">
            <BarChart3 className="w-96 h-96 text-amber-500" />
          </div>
        </div>

        {/* Reporting Period Selector Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                เลือกรอบการรายงาน (Reporting Period):
              </span>
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                {periodInfo.label}
              </span>
            </div>
            <span className="text-xs text-slate-400">
              ช่วงเวลา: {periodInfo.dateRangeText} ประจำปีงบประมาณ {selectedYear}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {STANDARD_REPORTING_PERIODS.map((p) => {
              const isActive = selectedPeriod === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => setSelectedPeriod(p.key)}
                  className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-md ring-2 ring-amber-400/50'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs font-black ${isActive ? 'text-slate-950' : 'text-slate-900'}`}>
                      {p.shortLabel}
                    </span>
                    {isActive && <Check className="w-3.5 h-3.5 text-slate-950" />}
                  </div>
                  <div className="mt-1">
                    <div
                      className={`text-[11px] font-bold leading-tight truncate ${
                        isActive ? 'text-slate-900' : 'text-slate-700'
                      }`}
                    >
                      {p.label.split('(')[0].trim()}
                    </div>
                    <div
                      className={`text-[10px] ${
                        isActive ? 'text-slate-800 font-medium' : 'text-slate-400'
                      }`}
                    >
                      {p.dateRangeText}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4 Summary Stat Cards (Synced with Single Source of Truth) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>ตัวชี้วัดเผยแพร่ทั้งหมด</span>
              <Target className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {summary.overallTotals.totalIndicators}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
              <span>KPI: {summary.overallTotals.kpiCount}</span>
              <span>•</span>
              <span>KVI: {summary.overallTotals.kviCount}</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>บรรลุเป้าหมาย (On Track)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600">
              {summary.overallTotals.achievedCount}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium">
              ร้อยละ {summary.overallTotals.achievedPercent}% ของตัวชี้วัดทั้งหมด
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>ไม่บรรลุเป้าหมาย (Not Achieved)</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-black text-rose-600">
              {summary.overallTotals.notAchievedCount}
            </div>
            <div className="text-[11px] text-rose-600 font-medium">
              ร้อยละ {summary.overallTotals.notAchievedPercent}% ของตัวชี้วัดทั้งหมด
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>ยังไม่รายงาน/รอประเมิน</span>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-600">
              {summary.overallTotals.notReportedCount}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              ร้อยละ {summary.overallTotals.notReportedPercent}% ของตัวชี้วัดทั้งหมด
            </div>
          </div>
        </div>

        {/* SECTION 1: Strategic Issue Performance Overview (100% Stacked Bar + Table + Trend Graph) */}
        <PublicStrategyOverview
          summary={summary}
          selectedStrategyFilter={selectedStrategyId}
          selectedStatusClassification={selectedStatusClassification}
          onSelectStrategyFilter={(stratId) => setSelectedStrategyId(stratId)}
          onSelectStatusClassification={(status) => setSelectedStatusClassification(status)}
          onClearFilters={handleClearAllFilters}
        />

        {/* Filter Controls Bar for Indicator List */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อตัวชี้วัด, รหัส, หน่วยงาน..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:bg-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Strategy Filter */}
            <select
              value={selectedStrategyId}
              onChange={(e) => setSelectedStrategyId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:border-amber-500 focus:outline-none cursor-pointer max-w-[240px] truncate"
            >
              <option value="ALL">ยุทธศาสตร์ทั้งหมด ({strategies.length})</option>
              {strategies.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatStrategyTitle(s.code, s.name)}
                </option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:border-amber-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">ประเภทตัวชี้วัดทั้งหมด</option>
              <option value="KPI">KPI (ตัวชี้วัดผลงาน)</option>
              <option value="KVI">KVI (ตัวชี้วัดคุณค่า)</option>
            </select>

            {/* Department Filter */}
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:border-amber-500 focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              <option value="ALL">หน่วยงานทั้งหมด ({departments.length})</option>
              {departments.map((d) => (
                <option key={d.departmentId} value={d.departmentId}>
                  {d.departmentName}
                </option>
              ))}
            </select>

            {/* Clear Filter Button */}
            {(selectedStrategyId !== 'ALL' ||
              selectedStatusClassification !== 'ALL' ||
              selectedType !== 'ALL' ||
              selectedDeptId !== 'ALL' ||
              searchTerm.trim() !== '') && (
              <button
                onClick={handleClearAllFilters}
                className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer"
                title="ล้างตัวกรองทั้งหมด"
              >
                <X className="w-3.5 h-3.5" />
                <span>ล้าง</span>
              </button>
            )}
          </div>
        </div>

        {/* Indicator Cards List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
            <span>
              รายการตัวชี้วัดที่เผยแพร่ ({filteredIndicators.length} รายการ จากทั้งหมด{' '}
              {summary.overallTotals.totalIndicators} รายการ)
            </span>
            <span className="text-slate-400">รอบรายงาน: {periodInfo.label}</span>
          </div>

          {summary.overallTotals.totalIndicators === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">
                  ยังไม่มีข้อมูลตัวชี้วัดที่ได้รับอนุมัติให้เผยแพร่
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  ขณะนี้อยู่ระหว่างการจัดทำและประเมินผลตัวชี้วัดประจำปีงบประมาณ {selectedYear}{' '}
                  ข้อมูลจะปรากฏที่นี่เมื่อได้รับการอนุมัติอย่างเป็นทางการ
                </p>
              </div>
            </div>
          ) : filteredIndicators.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
              <Layers className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">
                ไม่พบข้อมูลตัวชี้วัดที่ตรงกับเงื่อนไข
              </p>
              <p className="text-xs text-slate-400">
                กรุณาลองเปลี่ยนคำค้นหาหรือตัวกรองยุทธศาสตร์/สถานะ/หน่วยงาน
              </p>
              <button
                onClick={handleClearAllFilters}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>ล้างตัวกรองทั้งหมด</span>
              </button>
            </div>
          ) : (
            filteredIndicators.map((ind) => (
              <div
                key={ind.indicatorId}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          ind.type === 'KPI'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                        }`}
                      >
                        {ind.type}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-500">
                        {ind.code}
                      </span>
                      <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                        • {ind.departmentName || 'ส่วนกลาง'}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {ind.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {ind.description || 'ไม่มีคำอธิบายเพิ่มเติม'}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center sm:flex-col sm:items-end gap-2">
                    {getStatusBadge(ind.status, ind.classification)}
                    <span className="text-[10px] text-slate-400">
                      รอบรายงาน: {ind.periodMonthName}
                    </span>
                  </div>
                </div>

                {/* Progress Bar & Details */}
                <div className="pt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div className="md:col-span-8 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-500">ความก้าวหน้าการดำเนินงาน</span>
                      <span className="text-slate-800">
                        {ind.achievementPercent !== null ? `${ind.achievementPercent}%` : 'ยังไม่มีผล'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          ind.classification === 'ACHIEVED'
                            ? 'bg-emerald-500'
                            : ind.classification === 'NOT_ACHIEVED'
                            ? 'bg-rose-500'
                            : 'bg-slate-300'
                        }`}
                        style={{
                          width: `${
                            ind.achievementPercent !== null
                              ? Math.min(100, Math.max(0, ind.achievementPercent))
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-4 flex items-center justify-end space-x-6 text-xs">
                    <div className="text-right">
                      <div className="text-slate-400 font-semibold text-[10px]">เป้าหมายรอบนี้</div>
                      <div className="font-extrabold text-slate-800">
                        {ind.targetValue} {ind.unit || ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-400 font-semibold text-[10px]">ผลงานสะสม</div>
                      <div className="font-extrabold text-slate-800">
                        {ind.actualValue} {ind.unit || ''}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
          </>
        )}
      </main>

      {/* Public Footer */}
      {!isEmbedMode && (
        <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 text-xs text-center mt-12">
          <div className="max-w-7xl mx-auto px-4 space-y-1">
            <p className="text-white font-bold">
              HUSO Performance Intelligence System | คณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏยะลา
            </p>
            <p className="text-slate-400">
              แผนยุทธศาสตร์การบริหารองค์กร พ.ศ. 2569 - 2575 & กระบวนการ BRIDGE Model (EdPEx) | ข้อมูลสำหรับเผยแพร่สาธารณะ (Read-Only)
            </p>
          </div>
        </footer>
      )}
    </div>
  );
};

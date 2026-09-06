import React, { useState, useMemo, useEffect } from 'react';
import {
  BridgeImprovement,
  BRIDGE_STEPS,
  BridgeStep,
  HUSO_MASTER_COURSES,
} from '../../types/bridge';
import { Department } from '../../types';
import {
  Sparkles,
  Building2,
  GraduationCap,
  Layers,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  TrendingUp,
  Award,
  ChevronRight,
  ArrowUpRight,
  Eye,
  X,
  Target,
  BarChart3,
  Lightbulb,
  ShieldCheck,
  Radio,
  RefreshCw,
} from 'lucide-react';
import { bridgeService } from '../../lib/bridgeService';

interface PublicBridgeDashboardProps {
  improvements: BridgeImprovement[];
  departments: Department[];
  selectedYear: string;
}

export const PublicBridgeDashboard: React.FC<PublicBridgeDashboardProps> = ({
  improvements: initialImprovements,
  departments,
  selectedYear,
}) => {
  // Live real-time state via Firestore onSnapshot / bridgeService.subscribe
  const [liveImprovements, setLiveImprovements] = useState<BridgeImprovement[]>(initialImprovements || []);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);

  // Filter controls
  const [selectedOwnerType, setSelectedOwnerType] = useState<'ALL' | 'DEPARTMENT' | 'COURSE'>('ALL');
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('ALL');
  const [selectedStep, setSelectedStep] = useState<string>('ALL');
  const [selectedStatusGroup, setSelectedStatusGroup] = useState<'ALL' | 'IN_PROGRESS' | 'COMPLETED' | 'BEST_PRACTICE'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItemForView, setSelectedItemForView] = useState<BridgeImprovement | null>(null);

  // Subscribe to real-time updates from Firestore
  useEffect(() => {
    // If props update, set initial state
    if (initialImprovements && initialImprovements.length > 0) {
      setLiveImprovements(initialImprovements);
    }

    // Connect onSnapshot listener for real-time synchronization
    try {
      const unsubscribe = bridgeService.subscribe(
        (data) => {
          setLiveImprovements(data || []);
          setIsLiveConnected(true);
        },
        selectedYear !== 'ALL' ? selectedYear : undefined
      );

      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    } catch (err) {
      console.warn('Real-time subscription fallback to props:', err);
    }
  }, [initialImprovements, selectedYear]);

  // Enforce Visibility Rules:
  // HIDE: DRAFT, isDeleted === true, CANCELLED, REJECTED
  // SHOW: SUBMITTED, IN_PROGRESS, ON_TRACK, DELAYED, WAITING_FOR_DECISION, COMPLETED, BEST_PRACTICE, SCALE_UP
  const publicEligibleImprovements = useMemo(() => {
    const source = liveImprovements.length > 0 ? liveImprovements : (initialImprovements || []);
    return source.filter((item) => {
      // 1. Exclude soft-deleted
      if (item.isDeleted === true) return false;

      // 2. Exclude drafts & cancelled
      const overall = (item.overallStatus || '').toUpperCase();
      const status = (item.status || '').toUpperCase();
      const approval = (item.approvalStatus || '').toUpperCase();

      if (overall === 'DRAFT' || status === 'DRAFT' || approval === 'DRAFT') return false;
      if (overall === 'CANCELLED' || status === 'CANCELLED') return false;
      if (approval === 'REJECTED') return false;

      // 3. Fiscal year match
      if (selectedYear && selectedYear !== 'ALL' && item.fiscalYear) {
        if (String(item.fiscalYear) !== String(selectedYear)) {
          return false;
        }
      }

      return true;
    });
  }, [liveImprovements, initialImprovements, selectedYear]);

  // Apply user interactive filters
  const filteredImprovements = useMemo(() => {
    return publicEligibleImprovements.filter((item) => {
      // 1. Owner Type Filter
      if (selectedOwnerType !== 'ALL' && item.ownerType !== selectedOwnerType) {
        return false;
      }

      // 2. Specific Unit/Course Filter
      if (selectedOwnerId !== 'ALL' && item.ownerId !== selectedOwnerId) {
        return false;
      }

      // 3. Step Filter
      if (selectedStep !== 'ALL' && item.currentBridgeStep !== selectedStep) {
        return false;
      }

      // 4. Status Group Filter
      const isCompleted = item.currentBridgeStep === 'E' || item.overallStatus === 'COMPLETED' || (item.currentProgressPercentage || 0) >= 100;
      const isBP = item.isBestPractice || item.isInnovationCandidate || item.edpexReplicableToOtherDepts || item.overallStatus === 'BEST_PRACTICE' || item.overallStatus === 'SCALED';

      if (selectedStatusGroup === 'COMPLETED' && !isCompleted) return false;
      if (selectedStatusGroup === 'IN_PROGRESS' && isCompleted) return false;
      if (selectedStatusGroup === 'BEST_PRACTICE' && !isBP) return false;

      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = item.title?.toLowerCase().includes(q);
        const ownerMatch = item.ownerNameSnapshot?.toLowerCase().includes(q);
        const domainMatch = item.workDomain?.toLowerCase().includes(q);
        const codeMatch = item.improvementId?.toLowerCase().includes(q);
        const issueMatch = item.issueDetails?.toLowerCase().includes(q);
        return titleMatch || ownerMatch || domainMatch || codeMatch || issueMatch;
      }

      return true;
    });
  }, [publicEligibleImprovements, selectedOwnerType, selectedOwnerId, selectedStep, selectedStatusGroup, searchQuery]);

  // Real-time Summary Metrics
  const metrics = useMemo(() => {
    const total = publicEligibleImprovements.length;
    const completed = publicEligibleImprovements.filter(
      (i) => i.currentBridgeStep === 'E' || i.overallStatus === 'COMPLETED' || (i.currentProgressPercentage || 0) >= 100
    ).length;
    const inProgress = publicEligibleImprovements.filter(
      (i) => i.currentBridgeStep !== 'E' && i.overallStatus !== 'COMPLETED' && (i.currentProgressPercentage || 0) < 100
    ).length;
    const bestPractices = publicEligibleImprovements.filter(
      (i) => i.isBestPractice || i.isInnovationCandidate || i.edpexReplicableToOtherDepts || i.overallStatus === 'BEST_PRACTICE' || i.overallStatus === 'SCALED'
    ).length;

    // Step distribution
    const stepCounts: Record<string, number> = { B: 0, R: 0, I: 0, D: 0, G: 0, E: 0 };
    publicEligibleImprovements.forEach((i) => {
      const st = i.currentBridgeStep || 'B';
      if (stepCounts[st] !== undefined) {
        stepCounts[st] += 1;
      }
    });

    return { total, completed, inProgress, bestPractices, stepCounts };
  }, [publicEligibleImprovements]);

  // Available entity options based on selectedOwnerType
  const entityOptions = useMemo(() => {
    if (selectedOwnerType === 'DEPARTMENT') {
      return departments.map((d) => ({
        id: d.departmentId || d.id || '',
        name: d.departmentName || d.name || '',
      }));
    }
    if (selectedOwnerType === 'COURSE') {
      return HUSO_MASTER_COURSES.map((c) => ({
        id: c.id,
        name: `${c.name} (${c.degree})`,
      }));
    }
    return [
      ...departments.map((d) => ({
        id: d.departmentId || d.id || '',
        name: `[หน่วยงาน] ${d.departmentName || d.name || ''}`,
      })),
      ...HUSO_MASTER_COURSES.map((c) => ({
        id: c.id,
        name: `[หลักสูตร] ${c.name} (${c.degree})`,
      })),
    ];
  }, [selectedOwnerType, departments]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Real-time Live Badge */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/60 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                BRIDGE Model Process Improvement
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                EdPEx Category 6: Operations Focus
              </span>
            </div>

            {/* Live Real-time Status Indicator */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-bold shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>ข้อมูลเรียลไทม์ (Live onSnapshot)</span>
            </div>
          </div>

          <div className="max-w-3xl space-y-2">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
              ผลการดำเนินงานปรับปรุงกระบวนการตาม BRIDGE Model
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              การขับเคลื่อนคุณภาพการศึกษาสู่ความเป็นเลิศตามกรอบ EdPEx ของคณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏยะลา ผ่านกระบวนการ 6 ขั้นตอน (Build &bull; Review &bull; Improve &bull; Drive &bull; Grow &bull; Excellence)
            </p>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-4 border-t border-indigo-900/50">
            <div
              onClick={() => setSelectedStatusGroup('ALL')}
              className={`border rounded-2xl p-4 space-y-1 backdrop-blur-sm transition-all cursor-pointer ${
                selectedStatusGroup === 'ALL'
                  ? 'bg-indigo-950/90 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-[11px] font-semibold text-slate-400">ประเด็นทั้งหมด</div>
              <div className="text-2xl sm:text-3xl font-black text-white">{metrics.total}</div>
              <div className="text-[10px] text-indigo-400 font-medium">ทุกสถานะที่กำลังขับเคลื่อน</div>
            </div>

            <div
              onClick={() => setSelectedStatusGroup('IN_PROGRESS')}
              className={`border rounded-2xl p-4 space-y-1 backdrop-blur-sm transition-all cursor-pointer ${
                selectedStatusGroup === 'IN_PROGRESS'
                  ? 'bg-amber-950/90 border-amber-500 shadow-md ring-2 ring-amber-500/20'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-[11px] font-semibold text-slate-400">อยู่ระหว่างขับเคลื่อน</div>
              <div className="text-2xl sm:text-3xl font-black text-amber-400">{metrics.inProgress}</div>
              <div className="text-[10px] text-amber-400/90 font-medium">กำลังดำเนินการตามแผน (Active)</div>
            </div>

            <div
              onClick={() => setSelectedStatusGroup('COMPLETED')}
              className={`border rounded-2xl p-4 space-y-1 backdrop-blur-sm transition-all cursor-pointer ${
                selectedStatusGroup === 'COMPLETED'
                  ? 'bg-emerald-950/90 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-[11px] font-semibold text-slate-400">ปรับปรุงสำเร็จ</div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">{metrics.completed}</div>
              <div className="text-[10px] text-emerald-400/90 font-medium">บรรลุผลลัพธ์และเกณฑ์ 100%</div>
            </div>

            <div
              onClick={() => setSelectedStatusGroup('BEST_PRACTICE')}
              className={`border rounded-2xl p-4 space-y-1 backdrop-blur-sm transition-all cursor-pointer ${
                selectedStatusGroup === 'BEST_PRACTICE'
                  ? 'bg-purple-950/90 border-purple-500 shadow-md ring-2 ring-purple-500/20'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-[11px] font-semibold text-slate-400">แนวปฏิบัติที่ดี / ขยายผล</div>
              <div className="text-2xl sm:text-3xl font-black text-purple-400">{metrics.bestPractices}</div>
              <div className="text-[10px] text-purple-400/90 font-medium">Best Practice & Scaling</div>
            </div>
          </div>
        </div>
      </div>

      {/* 6-Stage BRIDGE Progress Visualizer Pipeline */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              สัดส่วนความก้าวหน้าตามขั้นตอน BRIDGE Model (6 ขั้นตอน)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              คลิกขั้นตอนด้านล่างเพื่อกรองดูประเด็นในแต่ละขั้นตอนแบบเรียลไทม์
            </p>
          </div>
          {selectedStep !== 'ALL' && (
            <button
              onClick={() => setSelectedStep('ALL')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <X className="w-3.5 h-3.5" />
              ล้างตัวกรองขั้นตอน (แสดงทั้งหมด)
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {(['B', 'R', 'I', 'D', 'G', 'E'] as BridgeStep[]).map((stepKey) => {
            const step = BRIDGE_STEPS[stepKey];
            const count = metrics.stepCounts[stepKey] || 0;
            const isSelected = selectedStep === stepKey;

            return (
              <button
                key={stepKey}
                onClick={() => setSelectedStep(isSelected ? 'ALL' : stepKey)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 shadow-md ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center ${step.badgeBg} ${step.badgeText}`}
                  >
                    {stepKey}
                  </span>
                  <span className="text-base font-black text-slate-900 dark:text-white">
                    {count}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {step.name}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {stepKey === 'B' && 'ระบุปัญหา/ลูกค้า'}
                    {stepKey === 'R' && 'วิเคราะห์สาเหตุ'}
                    {stepKey === 'I' && 'ออกแบบนวัตกรรม'}
                    {stepKey === 'D' && 'นำแผนไปปฏิบัติ'}
                    {stepKey === 'G' && 'ประเมินผลลัพธ์'}
                    {stepKey === 'E' && 'ขยายผลองค์กร'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Owner Type Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              ประเภทหน่วยงาน
            </label>
            <select
              value={selectedOwnerType}
              onChange={(e) => {
                setSelectedOwnerType(e.target.value as any);
                setSelectedOwnerId('ALL');
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">ทั้งหมด (8 หน่วยงาน + 18 หลักสูตร)</option>
              <option value="DEPARTMENT">หน่วยงานสำนักงานคณะ (8 หน่วยงาน)</option>
              <option value="COURSE">หลักสูตรการศึกษา (18 หลักสูตร)</option>
            </select>
          </div>

          {/* Specific Entity Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              เลือกหน่วยงาน/หลักสูตร
            </label>
            <select
              value={selectedOwnerId}
              onChange={(e) => setSelectedOwnerId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">ทุกหน่วยงาน/หลักสูตร</option>
              {entityOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="sm:col-span-1 lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              ค้นหาประเด็น
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อประเด็น, รหัส, ปัญหา, หรือผลลัพธ์..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Active Filters Bar */}
        {(selectedOwnerType !== 'ALL' || selectedOwnerId !== 'ALL' || selectedStep !== 'ALL' || selectedStatusGroup !== 'ALL' || searchQuery) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            <span className="font-semibold">ตัวกรองที่เลือก:</span>
            {selectedOwnerType !== 'ALL' && (
              <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-md font-medium">
                {selectedOwnerType === 'DEPARTMENT' ? 'หน่วยงาน' : 'หลักสูตร'}
              </span>
            )}
            {selectedOwnerId !== 'ALL' && (
              <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-md font-medium">
                {entityOptions.find((e) => e.id === selectedOwnerId)?.name}
              </span>
            )}
            {selectedStep !== 'ALL' && (
              <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-md font-medium">
                ขั้น {selectedStep}: {BRIDGE_STEPS[selectedStep as BridgeStep]?.name}
              </span>
            )}
            {selectedStatusGroup !== 'ALL' && (
              <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-md font-medium">
                สถานะ: {selectedStatusGroup === 'IN_PROGRESS' ? 'อยู่ระหว่างขับเคลื่อน' : selectedStatusGroup === 'COMPLETED' ? 'ปรับปรุงสำเร็จ' : 'Best Practice'}
              </span>
            )}
            {searchQuery && (
              <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-md font-medium">
                ค้นหา: &quot;{searchQuery}&quot;
              </span>
            )}
            <button
              onClick={() => {
                setSelectedOwnerType('ALL');
                setSelectedOwnerId('ALL');
                setSelectedStep('ALL');
                setSelectedStatusGroup('ALL');
                setSearchQuery('');
              }}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold ml-auto cursor-pointer"
            >
              ล้างทั้งหมด
            </button>
          </div>
        )}
      </div>

      {/* Improvements List Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 px-1">
          <span>รายการประเด็นปรับปรุงกระบวนการ ({filteredImprovements.length} รายการ)</span>
          <span>คลิกที่รายการเพื่อดูรายละเอียดผลลัพธ์ (ข้อมูลเปิดเผยสาธารณะ)</span>
        </div>

        {filteredImprovements.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
              ไม่พบประเด็นปรับปรุงตามเงื่อนไขที่เลือก
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              ลองปรับเปลี่ยนตัวกรองหน่วยงาน ขั้นตอน BRIDGE หรือคำค้นหา
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredImprovements.map((item) => {
              const step = BRIDGE_STEPS[item.currentBridgeStep || 'B'];
              const isBestPractice = item.isBestPractice || item.isInnovationCandidate || item.edpexReplicableToOtherDepts;
              const isCompleted = item.currentBridgeStep === 'E' || item.overallStatus === 'COMPLETED' || (item.currentProgressPercentage || 0) >= 100;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItemForView(item)}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-2.5">
                    {/* Header badges */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md text-[11px]">
                          {item.improvementId}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${step.badgeBg} ${step.badgeText}`}
                        >
                          ขั้น {item.currentBridgeStep}: {step.name}
                        </span>
                      </div>

                      {isBestPractice && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                          <Award className="w-3 h-3" />
                          Best Practice
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug line-clamp-2">
                      {item.title}
                    </h4>

                    {/* Owner & Domain */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                        {item.ownerType === 'DEPARTMENT' ? (
                          <Building2 className="w-3.5 h-3.5 text-blue-500" />
                        ) : (
                          <GraduationCap className="w-3.5 h-3.5 text-purple-500" />
                        )}
                        {item.ownerNameSnapshot}
                      </span>
                      <span>&bull;</span>
                      <span className="text-slate-500">{item.workDomain}</span>
                    </div>

                    {/* Brief description */}
                    {item.issueDetails && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {item.issueDetails}
                      </p>
                    )}
                  </div>

                  {/* Footer Stats & Actions */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isCompleted ? 'bg-emerald-500' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${item.currentProgressPercentage || 0}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                          {item.currentProgressPercentage || 0}%
                        </span>
                      </div>

                      {item.relatedIndicatorName && (
                        <span className="hidden sm:inline-block text-[10px] text-slate-500 truncate max-w-[140px]" title={item.relatedIndicatorName}>
                          {item.relatedIndicatorName}
                        </span>
                      )}
                    </div>

                    <div className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform text-xs">
                      <span>ดูรายละเอียด</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Read-Only Public Detail Modal (Strictly Cleansed of PII) */}
      {selectedItemForView && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-start justify-between gap-4 shrink-0">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono font-bold text-amber-400 bg-amber-500/20 px-2.5 py-0.5 rounded-md">
                    {selectedItemForView.improvementId}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md font-bold bg-indigo-500/30 text-indigo-200">
                    ขั้น {selectedItemForView.currentBridgeStep}: {BRIDGE_STEPS[selectedItemForView.currentBridgeStep || 'B']?.name}
                  </span>
                  <span className="text-slate-300">
                    ปีงบประมาณ {selectedItemForView.fiscalYear || selectedYear}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                  {selectedItemForView.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                  <span>{selectedItemForView.ownerNameSnapshot}</span>
                  <span>&bull;</span>
                  <span>{selectedItemForView.workDomain}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedItemForView(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-slate-800 dark:text-slate-200 text-xs">
              {/* Section 1: ประเด็นปัญหาและความต้องการของลูกค้า (Step B) */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 space-y-2 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-[10px]">
                    B
                  </span>
                  ประเด็นปัญหาและความต้องการของผู้รับบริการ/ผู้มีส่วนได้ส่วนเสีย
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {selectedItemForView.issueDetails || 'ไม่ได้ระบุรายละเอียดประเด็นปัญหา'}
                </p>
                {selectedItemForView.customerNeed && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">ความต้องการของผู้รับบริการ:</span>{' '}
                    {selectedItemForView.customerNeed}
                  </div>
                )}
              </div>

              {/* Section 2: การวิเคราะห์สาเหตุและ Gap (Step R) */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 space-y-2 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                    R
                  </span>
                  การวิเคราะห์ช่องว่าง (Gap) และสาเหตุที่แท้จริง (Root Cause)
                </div>
                {selectedItemForView.gapIdentified && (
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">ช่องว่างกระบวนการ (Gap):</span>{' '}
                    <p className="text-slate-600 dark:text-slate-300 mt-0.5">{selectedItemForView.gapIdentified}</p>
                  </div>
                )}
                {selectedItemForView.probableCauses && (
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">สาเหตุที่เป็นไปได้:</span>{' '}
                    <p className="text-slate-600 dark:text-slate-300 mt-0.5">{selectedItemForView.probableCauses}</p>
                  </div>
                )}
              </div>

              {/* Section 3: แนวทางปรับปรุงและเป้าหมายความสำเร็จ (Step I) */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 space-y-2 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 rounded-lg bg-purple-600 text-white font-bold flex items-center justify-center text-[10px]">
                    I
                  </span>
                  แนวทางการปรับปรุงกระบวนการและเป้าหมาย (Improvement & Target)
                </div>
                {selectedItemForView.improvementApproach && (
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {selectedItemForView.improvementApproach}
                  </p>
                )}
                {selectedItemForView.expectedOutcome && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">ผลลัพธ์ที่คาดหวัง:</span>{' '}
                    {selectedItemForView.expectedOutcome}
                  </div>
                )}
                {selectedItemForView.targetValue && (
                  <div className="text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">ค่าเป้าหมายความสำเร็จ:</span>{' '}
                    {selectedItemForView.targetValue}
                  </div>
                )}
              </div>

              {/* Section 4 & 5: การประเมินผลลัพธ์ EdPEx (Step G & E) */}
              <div className="bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl p-4 space-y-2 border border-emerald-200 dark:border-emerald-800">
                <div className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  ผลลัพธ์การประเมินและผลกระทบ (EdPEx Evaluation & Impact)
                </div>
                {selectedItemForView.edpexResultImprovementDetail ? (
                  <p className="text-emerald-800 dark:text-emerald-200 leading-relaxed">
                    {selectedItemForView.edpexResultImprovementDetail}
                  </p>
                ) : (
                  <p className="text-slate-500 italic">อยู่ระหว่างการสรุปผลการประเมินรอบสิ้นสุด</p>
                )}

                {selectedItemForView.edpexCustomerBenefitDetail && (
                  <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200">
                    <span className="font-semibold">ประโยชน์ที่ลูกค้าได้รับ:</span>{' '}
                    {selectedItemForView.edpexCustomerBenefitDetail}
                  </div>
                )}

                {selectedItemForView.edpexReplicableToOtherDepts && (
                  <div className="pt-1 text-purple-700 dark:text-purple-300 font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>สามารถขยายผลเป็น Best Practice สู่หน่วยงานอื่นได้</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500">
                คณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏยะลา
              </span>
              <button
                onClick={() => setSelectedItemForView(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

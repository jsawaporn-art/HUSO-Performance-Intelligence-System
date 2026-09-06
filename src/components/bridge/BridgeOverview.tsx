import React, { useState, useMemo } from 'react';
import {
  BridgeImprovement,
  BRIDGE_STEPS,
  BridgeStep,
  BridgePriority,
  BridgeStatus,
} from '../../types/bridge';
import { getPriorityConfig } from '../../lib/bridgePriorityUtils';
import { Department, Indicator, StrategicIssue, User } from '../../types';
import {
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Award,
  Sparkles,
  TrendingUp,
  Building2,
  GraduationCap,
  Users,
  Search,
  BarChart3,
  Layers,
  ChevronRight,
  ArrowUpRight,
  HelpCircle,
  Trash2,
  RefreshCw,
  ListOrdered,
  AlertCircle,
  BookOpen,
} from 'lucide-react';

interface BridgeOverviewProps {
  improvements: BridgeImprovement[];
  departments: Department[];
  indicators?: Indicator[];
  strategies?: StrategicIssue[];
  currentUser: User | null;
  onOpenCreateWizard: () => void;
  onSelectImprovement: (item: BridgeImprovement) => void;
  onOpenAiSummary?: (item: BridgeImprovement) => void;
  onNavigateToTab?: (tabKey: string) => void;
  onStartOperation?: (item: BridgeImprovement) => void;
  onDeleteImprovement?: (item: BridgeImprovement, autoRenumber?: boolean) => Promise<void> | void;
  onRenumberImprovements?: (fiscalYear: number | string) => Promise<void> | void;
}

export const BridgeOverview: React.FC<BridgeOverviewProps> = ({
  improvements,
  departments,
  indicators = [],
  strategies = [],
  currentUser,
  onOpenCreateWizard,
  onSelectImprovement,
  onOpenAiSummary,
  onNavigateToTab,
  onStartOperation,
  onDeleteImprovement,
  onRenumberImprovements,
}) => {
  // Filters
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedDeptOrCourse, setSelectedDeptOrCourse] = useState<string>('ALL');
  const [selectedDomain, setSelectedDomain] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedStep, setSelectedStep] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Delete & Renumber States
  const [itemToDelete, setItemToDelete] = useState<BridgeImprovement | null>(null);
  const [autoRenumberOnDelete, setAutoRenumberOnDelete] = useState<boolean>(true);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showRenumberModal, setShowRenumberModal] = useState<boolean>(false);
  const [isRenumbering, setIsRenumbering] = useState<boolean>(false);

  const canDelete =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'EXECUTIVE' ||
    currentUser?.role === 'STAFF';

  // Active filter computation
  const filteredItems = useMemo(() => {
    return improvements.filter((item) => {
      if (selectedYear !== 'ALL' && String(item.fiscalYear) !== selectedYear) return false;
      if (selectedDeptOrCourse !== 'ALL' && item.ownerId !== selectedDeptOrCourse) return false;
      if (selectedDomain !== 'ALL' && item.workDomain !== selectedDomain) return false;
      if (selectedStatus !== 'ALL' && item.overallStatus !== selectedStatus) return false;
      if (selectedPriority !== 'ALL' && item.priority !== selectedPriority) return false;
      if (selectedStep !== 'ALL' && item.currentBridgeStep !== selectedStep) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchId = item.improvementId?.toLowerCase().includes(q);
        const matchOwner = item.ownerNameSnapshot?.toLowerCase().includes(q);
        const matchDetails = item.issueDetails?.toLowerCase().includes(q);
        if (!matchTitle && !matchId && !matchOwner && !matchDetails) return false;
      }
      return true;
    });
  }, [improvements, selectedYear, selectedDeptOrCourse, selectedDomain, selectedStatus, selectedPriority, selectedStep, searchQuery]);

  // Executive Metrics Cards Calculation
  const totalCount = improvements.length;
  const inProgressCount = improvements.filter((i) => i.overallStatus === 'IN_PROGRESS' || i.overallStatus === 'SUBMITTED').length;
  const completedCount = improvements.filter((i) => i.overallStatus === 'COMPLETED' || i.overallStatus === 'SCALED' || i.overallStatus === 'BEST_PRACTICE').length;
  const delayedCount = improvements.filter((i) => {
    if (i.overallStatus === 'COMPLETED' || i.overallStatus === 'CLOSED') return false;
    if (!i.targetEndDate) return false;
    return new Date(i.targetEndDate).getTime() < Date.now();
  }).length;
  const pendingDecisionsCount = improvements.filter((i) => i.executiveDecisionNeededNotes || i.progressReports?.some((r) => r.requiresExecutiveDecision)).length;
  const customerImpactCount = improvements.filter((i) => i.affectedGroupType === 'CUSTOMER' || i.affectedGroupType === 'BOTH').length;
  const kpiLinkedCount = improvements.filter((i) => i.relatedIndicatorId).length;
  const readyToScaleCount = improvements.filter((i) => i.overallStatus === 'SCALED' || i.evaluationResult === 'พร้อมขยายผล').length;
  const innovationCount = improvements.filter((i) => i.isInnovationCandidate || i.isBestPractice || i.evaluationResult === 'เสนอเป็นนวัตกรรม' || i.evaluationResult === 'เสนอเป็นแนวปฏิบัติที่ดี').length;

  // Step Distribution
  const stepCounts: Record<BridgeStep, number> = {
    B: improvements.filter((i) => i.currentBridgeStep === 'B').length,
    R: improvements.filter((i) => i.currentBridgeStep === 'R').length,
    I: improvements.filter((i) => i.currentBridgeStep === 'I').length,
    D: improvements.filter((i) => i.currentBridgeStep === 'D').length,
    G: improvements.filter((i) => i.currentBridgeStep === 'G').length,
    E: improvements.filter((i) => i.currentBridgeStep === 'E').length,
  };

  // Unique lists for dropdowns
  const uniqueDomains = Array.from(new Set(improvements.map((i) => i.workDomain).filter(Boolean)));

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold tracking-wide border border-blue-400/30">
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              EdPEx & Continuous Process Improvement
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              ระบบติดตามและปรับปรุงกระบวนการทำงานตาม BRIDGE Model
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              เครื่องมือบันทึกและขับเคลื่อนการแก้ปัญหา โอกาสพัฒนา ความต้องการของผู้รับบริการ
              และการยกระดับสู่นวัตกรรมและแนวปฏิบัติที่ดีของคณะมนุษยศาสตร์และสังคมศาสตร์
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="bridge-btn-add-issue"
              onClick={onOpenCreateWizard}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/20 transition-all transform hover:-translate-y-0.5"
            >
              <Plus className="w-5 h-5" />
              เพิ่มประเด็นปรับปรุงใหม่
            </button>
            <button
              id="bridge-btn-my-tasks"
              onClick={() => onNavigateToTab?.('bridge_my_tasks')}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium border border-white/10 transition-all backdrop-blur-sm"
            >
              <Users className="w-4 h-4" />
              งานที่ฉันรับผิดชอบ
            </button>
            <button
              id="bridge-btn-manual"
              onClick={() => onNavigateToTab?.('manual')}
              title="เปิดดูคู่มือขั้นตอนการกรอกข้อมูล BRIDGE Model เริ่มจากตรงไหน - จบที่ตรงไหน"
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium border border-white/10 transition-all backdrop-blur-sm"
            >
              <BookOpen className="w-4 h-4 text-blue-300" />
              คู่มือ BRIDGE Model
            </button>
          </div>
        </div>

        {/* BRIDGE Pipeline 6-Step Visual Bar */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              ท่อลำเลียงการพัฒนาคุณภาพกระบวนการ (BRIDGE Model Pipeline)
            </div>
            <span className="text-xs text-slate-400">คลิกที่ขั้นเพื่อกรองข้อมูล</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {(['B', 'R', 'I', 'D', 'G', 'E'] as BridgeStep[]).map((stepCode) => {
              const step = BRIDGE_STEPS[stepCode];
              const count = stepCounts[stepCode];
              const isSelected = selectedStep === stepCode;
              return (
                <button
                  key={stepCode}
                  id={`bridge-step-card-${stepCode}`}
                  onClick={() => setSelectedStep(isSelected ? 'ALL' : stepCode)}
                  className={`flex flex-col p-3 rounded-2xl transition-all text-left border ${
                    isSelected
                      ? 'bg-white text-slate-900 border-white shadow-lg ring-2 ring-amber-400'
                      : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-xl font-black text-sm ${
                        isSelected ? 'bg-slate-900 text-white' : 'bg-white/20 text-white'
                      }`}
                    >
                      {stepCode}
                    </span>
                    <span className={`text-lg font-black ${isSelected ? 'text-blue-600' : 'text-amber-400'}`}>
                      {count}
                    </span>
                  </div>
                  <div className="text-xs font-bold truncate">{step.name}</div>
                  <div className={`text-[11px] truncate mt-0.5 ${isSelected ? 'text-slate-600' : 'text-slate-400'}`}>
                    {step.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-600" />
            ประเด็นทั้งหมด
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">{totalCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">ทุกหน่วยงาน/หลักสูตร</div>
        </div>

        {/* In Progress */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600" />
            กำลังดำเนินการ
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">{inProgressCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">อยู่ระหว่างมาตรการ</div>
        </div>

        {/* Completed */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            สำเร็จแล้ว
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{completedCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">บรรลุผลลัพธ์</div>
        </div>

        {/* Delayed */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            งานล่าช้า
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 mt-2">{delayedCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">เกินกำหนดสิ้นสุด</div>
        </div>

        {/* Executive Decisions */}
        <div
          onClick={() => onNavigateToTab?.('bridge_decisions')}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm cursor-pointer hover:border-purple-300 transition-all"
        >
          <div className="text-xs font-medium text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-purple-600" />
            รอผู้บริหารตัดสินใจ
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 mt-2">{pendingDecisionsCount}</div>
          <div className="text-[11px] text-purple-500 font-medium mt-1">ดูรายการ &rarr;</div>
        </div>

        {/* Innovations & Best Practices */}
        <div
          onClick={() => onNavigateToTab?.('bridge_innovations')}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm cursor-pointer hover:border-amber-300 transition-all"
        >
          <div className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-600" />
            นวัตกรรม / Best Practice
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">{innovationCount}</div>
          <div className="text-[11px] text-amber-500 font-medium mt-1">คลังความรู้ &rarr;</div>
        </div>
      </div>

      {/* Secondary Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">กระทบลูกค้า/ผู้รับบริการ (VOC)</div>
            <div className="text-xl font-bold text-blue-950 dark:text-blue-100 mt-1">{customerImpactCount} ประเด็น</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">เชื่อมโยง KPI/KVI คณะ</div>
            <div className="text-xl font-bold text-indigo-950 dark:text-indigo-100 mt-1">{kpiLinkedCount} ประเด็น</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">พร้อมขยายผล (Scale & Grow)</div>
            <div className="text-xl font-bold text-emerald-950 dark:text-emerald-100 mt-1">{readyToScaleCount} ประเด็น</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar & Search */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="bridge-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อประเด็น, รหัส BRG, หน่วยงาน, หรือรายละเอียด..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Year */}
            <select
              id="bridge-filter-year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
            >
              <option value="ALL">ทุกปีงบประมาณ</option>
              <option value="2569">ปีงบประมาณ 2569</option>
              <option value="2570">ปีงบประมาณ 2570</option>
            </select>

            {/* Department / Course */}
            <select
              id="bridge-filter-dept"
              value={selectedDeptOrCourse}
              onChange={(e) => setSelectedDeptOrCourse(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium max-w-[180px] truncate"
            >
              <option value="ALL">ทุกหน่วยงาน/หลักสูตร</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            {/* Domain */}
            <select
              id="bridge-filter-domain"
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium max-w-[180px] truncate"
            >
              <option value="ALL">ทุกด้านงาน/กระบวนการ</option>
              {uniqueDomains.map((dm) => (
                <option key={dm} value={dm}>
                  {dm}
                </option>
              ))}
            </select>

            {/* Status */}
            <select
              id="bridge-filter-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
            >
              <option value="ALL">ทุกสถานะ</option>
              <option value="DRAFT">ร่าง (Draft)</option>
              <option value="IN_PROGRESS">กำลังดำเนินการ</option>
              <option value="COMPLETED">สำเร็จแล้ว</option>
              <option value="SCALED">ขยายผลแล้ว</option>
              <option value="BEST_PRACTICE">แนวปฏิบัติที่ดี</option>
            </select>

            {/* Priority Filter */}
            <select
              id="bridge-filter-priority"
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
            >
              <option value="ALL">ทุกระดับความสำคัญ</option>
              <option value="CRITICAL">เร่งด่วนวิกฤต (Critical)</option>
              <option value="HIGH">สำคัญสูง (High)</option>
              <option value="MEDIUM">ปานกลาง (Medium)</option>
              <option value="LOW">ทั่วไป (Low)</option>
            </select>

            {/* Reset */}
            {(selectedYear !== 'ALL' ||
              selectedDeptOrCourse !== 'ALL' ||
              selectedDomain !== 'ALL' ||
              selectedStatus !== 'ALL' ||
              selectedPriority !== 'ALL' ||
              selectedStep !== 'ALL' ||
              searchQuery) && (
              <button
                onClick={() => {
                  setSelectedYear('ALL');
                  setSelectedDeptOrCourse('ALL');
                  setSelectedDomain('ALL');
                  setSelectedStatus('ALL');
                  setSelectedPriority('ALL');
                  setSelectedStep('ALL');
                  setSearchQuery('');
                }}
                className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-semibold hover:bg-rose-100"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Issues Table / Cards List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-slate-900 dark:text-white text-base">
              รายการประเด็นปรับปรุงกระบวนการทำงาน
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold">
              {filteredItems.length} รายการ
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onRenumberImprovements && canDelete && (
              <button
                id="btn-open-renumber-modal"
                onClick={() => setShowRenumberModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer shadow-sm"
                title="รันและจัดระเบียบเลขรหัส BRG ใหม่ให้เรียงลำดับต่อเนื่องกัน"
              >
                <ListOrdered className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>รันเลขรหัส BRG ใหม่ (Auto Renumber)</span>
              </button>
            )}
            <div className="text-xs text-slate-400 hidden md:block">
              แสดงผลตามการกรองล่าสุด
            </div>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <HelpCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <div className="text-base font-bold text-slate-800 dark:text-slate-200">ยังไม่พบประเด็นปรับปรุงงาน</div>
              <div className="text-xs text-slate-500 max-w-sm mx-auto">
                เริ่มต้นบันทึกประเด็นปัญหา โอกาสพัฒนา หรือความต้องการของลูกค้าเพื่อเริ่มกระบวนการ BRIDGE
              </div>
            </div>
            <button
              onClick={onOpenCreateWizard}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              เพิ่มประเด็นแรกของหน่วยงาน
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredItems.map((item, index) => {
              const stepInfo = BRIDGE_STEPS[item.currentBridgeStep || 'B'];
              const priorityConfig = getPriorityConfig(item.priority);
              const isOverdue =
                item.targetEndDate &&
                item.overallStatus !== 'COMPLETED' &&
                item.overallStatus !== 'CLOSED' &&
                new Date(item.targetEndDate).getTime() < Date.now();

              return (
                <div
                  key={item.id}
                  id={`bridge-item-row-${item.improvementId}`}
                  onClick={() => onSelectImprovement(item)}
                  className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Row Sequence Badge */}
                    <span className="text-xs font-black text-slate-400 dark:text-slate-500 w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                      #{index + 1}
                    </span>

                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {/* Improvement ID */}
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-lg border border-blue-200/50 dark:border-blue-900/50">
                          {item.improvementId}
                        </span>

                        {/* Priority Tag */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-xs font-bold ${priorityConfig.badgeBg} ${priorityConfig.badgeText} ${priorityConfig.borderColor}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${priorityConfig.dotColor}`} />
                          {priorityConfig.thaiLabel}
                        </span>

                        {/* BRIDGE Step Badge */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg font-bold text-xs ${stepInfo.badgeBg} ${stepInfo.badgeText}`}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stepInfo.color }} />
                          ขั้น {item.currentBridgeStep} : {stepInfo.name}
                        </span>

                        {/* Owner Type & Name */}
                        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                          {item.ownerType === 'COURSE' ? <GraduationCap className="w-3.5 h-3.5 text-purple-500" /> : <Building2 className="w-3.5 h-3.5 text-blue-500" />}
                          {item.ownerNameSnapshot}
                        </span>

                        {/* Work Domain */}
                        <span className="text-slate-400">&bull;</span>
                        <span className="text-slate-500 dark:text-slate-400">{item.workDomain}</span>

                        {/* Issue Type */}
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {item.issueType}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug hover:text-blue-600 transition-colors">
                        {item.title}
                      </h3>

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {item.issueDetails}
                      </p>

                      {/* Meta tags */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                        <div>
                          ผู้รับผิดชอบหลัก: <span className="font-medium text-slate-700 dark:text-slate-300">{item.primaryResponsiblePersonName || '-'}</span>
                        </div>
                        {item.relatedIndicatorName && (
                          <div className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1 truncate max-w-xs">
                            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{item.relatedIndicatorName}</span>
                          </div>
                        )}
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-bold">
                            <AlertTriangle className="w-3.5 h-3.5" /> เกินกำหนด
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side: Progress Bar & Actions */}
                  <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                    <div className="w-32 sm:w-36 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-500">ความก้าวหน้า</span>
                        <span className="text-slate-900 dark:text-white font-bold">{item.currentProgressPercentage || 0}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(item.currentProgressPercentage || 0, 100)}%`,
                            backgroundColor: stepInfo.color,
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {(item.overallStatus === 'DRAFT' || item.lifecycleStatus === 'DRAFT') && onStartOperation && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            await onStartOperation(item);
                          }}
                          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
                          title="เริ่มดำเนินการและเปลี่ยนสถานะเป็น In Progress"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">เริ่มดำเนินการ</span>
                        </button>
                      )}
                      {onOpenAiSummary && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenAiSummary(item);
                          }}
                          className="px-2.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1 border border-amber-300/40 transition-all cursor-pointer"
                          title="สรุปผลประเด็นด้วย AI & รายงานผู้บริหาร"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span className="hidden sm:inline">สรุปผล AI</span>
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectImprovement(item);
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        ดูรายละเอียด
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      {canDelete && onDeleteImprovement && (
                        <button
                          id={`btn-delete-item-${item.improvementId}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemToDelete(item);
                          }}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                          title="ลบประเด็นนี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Item Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  ยืนยันการลบประเด็นปรับปรุงงาน?
                </h3>
                <div className="text-xs text-slate-500 font-mono">{itemToDelete.improvementId}</div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2">
                {itemToDelete.title}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                หน่วยงาน: {itemToDelete.ownerNameSnapshot}
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              รายการนี้จะถูกย้ายไปยังถังขยะ (Soft Delete) และผู้ดูแลระบบสามารถกู้คืนได้ภายหลัง
            </p>

            {/* Auto Renumber Option */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRenumberOnDelete}
                onChange={(e) => setAutoRenumberOnDelete(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                รันและจัดระเบียบเลขรหัส BRG ของรายการที่เหลือใหม่อัตโนมัติ (เช่น BRG-2569-0001, 0002... เรียงต่อเนื่องไม่มีช่องว่าง)
              </span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!onDeleteImprovement || !itemToDelete) return;
                  setIsDeleting(true);
                  try {
                    await onDeleteImprovement(itemToDelete, autoRenumberOnDelete);
                    setItemToDelete(null);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'กำลังลบ...' : 'ยืนยันการลบ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Auto Renumber Modal */}
      {showRenumberModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center">
                <ListOrdered className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  รันและจัดระเบียบเลขรหัส BRG ใหม่
                </h3>
                <div className="text-xs text-slate-500">ปีงบประมาณ {selectedYear !== 'ALL' ? selectedYear : '2569'}</div>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              ระบบจะจัดลำดับและรันเลขรหัสของประเด็นปรับปรุงงานทั้งหมดที่ยังเปิดใช้งานอยู่ใหม่อัตโนมัติ (เช่น BRG-{selectedYear !== 'ALL' ? selectedYear : '2569'}-0001, 0002, 0003...) โดยเรียงตามวันที่สร้าง ทำให้รหัสเรียงต่อเนื่องกันอย่างสมบูรณ์
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRenumberModal(false)}
                disabled={isRenumbering}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!onRenumberImprovements) return;
                  setIsRenumbering(true);
                  try {
                    const targetYear = selectedYear !== 'ALL' ? selectedYear : 2569;
                    await onRenumberImprovements(targetYear);
                    setShowRenumberModal(false);
                  } finally {
                    setIsRenumbering(false);
                  }
                }}
                disabled={isRenumbering}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRenumbering ? 'animate-spin' : ''}`} />
                <span>{isRenumbering ? 'กำลังประมวลผล...' : 'ยืนยันการรันเลขใหม่'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

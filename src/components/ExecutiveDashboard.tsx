import React, { useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import {
  Filter,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Award,
  FileCheck,
  TrendingUp,
  Activity,
  Layers,
  Building2,
  ListFilter,
  ArrowUpRight,
  PlusCircle,
  Download,
  Calendar,
  Sparkles,
  Clock,
} from 'lucide-react';
import {
  Indicator,
  MonthlyProgress,
  StrategicIssue,
  Department,
  SystemConfig,
  TrafficLightStatus,
  IndicatorType,
  Target,
} from '../types';
import { ActiveTab } from './Sidebar';
import { INITIAL_CONFIG, INITIAL_STRATEGIES, INITIAL_DEPARTMENTS } from '../mockData';
import {
  STANDARD_REPORTING_PERIODS,
  getReportingPeriodInfo,
  normalizeReportingPeriod,
  getDeduplicatedProgress,
  calculateAchievementAndTrafficLight,
} from '../lib/reportingPeriodUtils';

interface ExecutiveDashboardProps {
  indicators: Indicator[];
  monthlyProgressList: MonthlyProgress[];
  strategies?: StrategicIssue[];
  departments?: Department[];
  systemConfig?: SystemConfig;
  targets?: Target[];
  selectedYear: string;
  onSelectTab?: (tab: ActiveTab) => void;
  onOpenDirectiveModal?: (indicatorId: string) => void;
}

const TRAFFIC_COLORS = {
  ON_TRACK: '#10b981', // emerald-500
  WATCH: '#f59e0b', // amber-500
  RISK: '#f97316', // orange-500
  CRITICAL: '#ef4444', // rose-500
  NO_DATA: '#94a3b8', // slate-400
};

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  indicators,
  monthlyProgressList,
  strategies = INITIAL_STRATEGIES,
  departments = INITIAL_DEPARTMENTS,
  systemConfig = INITIAL_CONFIG,
  targets = [],
  selectedYear,
  onSelectTab,
  onOpenDirectiveModal,
}) => {
  // Global Filters
  const [filterPeriod, setFilterPeriod] = useState<string>('Q2');
  const [filterType, setFilterType] = useState<IndicatorType | 'ALL'>('ALL');
  const [filterStrategy, setFilterStrategy] = useState<string>('ALL');
  const [filterDepartment, setFilterDepartment] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<TrafficLightStatus | 'ALL'>('ALL');

  const periodInfo = useMemo(() => getReportingPeriodInfo(filterPeriod), [filterPeriod]);

  // 1. Filter Active Indicators
  const activeIndicators = useMemo(() => {
    return indicators.filter((i) => {
      if (i.status === 'DELETED') return false;
      if (filterType !== 'ALL' && i.type !== filterType) return false;
      if (filterStrategy !== 'ALL' && i.strategyId !== filterStrategy) return false;
      if (
        filterDepartment !== 'ALL' &&
        i.departmentId !== filterDepartment &&
        i.responsibleDepartmentId !== filterDepartment
      ) {
        return false;
      }
      return true;
    });
  }, [indicators, filterType, filterStrategy, filterDepartment]);

  // 2. Fetch Deduplicated Progress matching selectedYear and filterPeriod
  const periodDeduplicatedProgress = useMemo(() => {
    const rawList = getDeduplicatedProgress(monthlyProgressList, selectedYear, filterPeriod);

    return rawList.filter((p) => {
      const parentInd = activeIndicators.find((i) => i.indicatorId === p.indicatorId);
      if (!parentInd) return false;
      if (filterStatus !== 'ALL' && p.status !== filterStatus) return false;
      return true;
    });
  }, [monthlyProgressList, selectedYear, filterPeriod, activeIndicators, filterStatus]);

  // 3. Complete list of indicator evaluations in selected period (reported & unreported)
  const fullEvaluationList = useMemo(() => {
    return activeIndicators.map((ind) => {
      const prg = periodDeduplicatedProgress.find((p) => p.indicatorId === ind.indicatorId);
      const tgt = targets.find((t) => t.indicatorId === ind.indicatorId && t.fiscalYear === selectedYear);

      let cumulativeTarget = ind.baseline || 10;
      if (tgt) {
        if (filterPeriod === 'Q1') cumulativeTarget = tgt.q1Target || tgt.monthlyTargets[2] || cumulativeTarget;
        else if (filterPeriod === 'Q2') cumulativeTarget = tgt.q2Target || tgt.cumulativeTargets?.[5] || tgt.monthlyTargets[5] || cumulativeTarget;
        else if (filterPeriod === 'Q3') cumulativeTarget = tgt.q3Target || tgt.cumulativeTargets?.[8] || tgt.monthlyTargets[8] || cumulativeTarget;
        else if (filterPeriod === 'Q4' || filterPeriod === 'ANNUAL') cumulativeTarget = tgt.annualTarget || tgt.q4Target || cumulativeTarget;
        else if (filterPeriod === 'NINE_MONTH') cumulativeTarget = tgt.q3Target || tgt.cumulativeTargets?.[8] || cumulativeTarget;
      }

      const calc = prg
        ? calculateAchievementAndTrafficLight(ind, prg.targetCumulative || cumulativeTarget, prg.actualCumulative, systemConfig)
        : calculateAchievementAndTrafficLight(ind, cumulativeTarget, 0, systemConfig);

      return {
        indicator: ind,
        progress: prg,
        targetCumulative: prg?.targetCumulative || cumulativeTarget,
        actualCumulative: prg ? prg.actualCumulative : null,
        achievementPercent: prg ? calc.achievementPercent : null,
        achievementDisplay: prg ? calc.achievementDisplay : 'ยังไม่รายงาน',
        status: prg ? calc.status : 'NO_DATA',
        statusLabel: prg ? calc.statusLabel : 'ยังไม่ประเมิน',
        statusColorClass: prg ? calc.statusColorClass : 'bg-slate-100 text-slate-500 border-slate-200',
        verificationStatus: prg?.verificationStatus || 'NOT_REPORTED',
      };
    });
  }, [activeIndicators, periodDeduplicatedProgress, targets, selectedYear, filterPeriod, systemConfig]);

  // 4. Calculations for 6 Primary Dashboard KPI Cards
  const cardStats = useMemo(() => {
    // Card 1: Total Indicators
    const totalCount = activeIndicators.length;
    const kpiCount = activeIndicators.filter((i) => i.type === 'KPI').length;
    const kviCount = activeIndicators.filter((i) => i.type === 'KVI').length;

    // Card 2: Reporting Status
    const reportedCount = periodDeduplicatedProgress.length;
    const unreportedCount = Math.max(0, totalCount - reportedCount);
    const waitingReviewCount = periodDeduplicatedProgress.filter(
      (p) => p.verificationStatus === 'SUBMITTED' || p.verificationStatus === 'REVISION'
    ).length;
    const approvedVerifiedCount = periodDeduplicatedProgress.filter(
      (p) => p.verificationStatus === 'APPROVED' || p.verificationStatus === 'VERIFIED'
    ).length;

    // Card 3: Overall Achievement %
    let totalAch = 0;
    let validAchCount = 0;
    periodDeduplicatedProgress.forEach((p) => {
      if (typeof p.achievementPercent === 'number' && !isNaN(p.achievementPercent)) {
        totalAch += Math.min(p.achievementPercent, systemConfig?.scoreCap ?? 120);
        validAchCount++;
      }
    });
    const avgAchievement = validAchCount > 0 ? Math.round((totalAch / validAchCount) * 10) / 10 : 0;

    // Card 4: Traffic Light
    const onTrack = periodDeduplicatedProgress.filter((p) => p.status === 'ON_TRACK').length;
    const watch = periodDeduplicatedProgress.filter((p) => p.status === 'WATCH').length;
    const risk = periodDeduplicatedProgress.filter((p) => p.status === 'RISK').length;
    const critical = periodDeduplicatedProgress.filter((p) => p.status === 'CRITICAL').length;
    const notAssessed = totalCount - (onTrack + watch + risk + critical);

    return {
      totalCount,
      kpiCount,
      kviCount,
      reportedCount,
      unreportedCount,
      waitingReviewCount,
      approvedVerifiedCount,
      avgAchievement,
      onTrack,
      watch,
      risk,
      critical,
      notAssessed: Math.max(0, notAssessed),
    };
  }, [activeIndicators, periodDeduplicatedProgress, systemConfig]);

  // 5. Strategy Progress Data for Card 5 & Bar Chart
  const strategyData = useMemo(() => {
    return strategies.map((strat) => {
      const stratInds = activeIndicators.filter((i) => i.strategyId === strat.id || i.strategyName === strat.name);
      const total = stratInds.length;
      const reported = periodDeduplicatedProgress.filter((p) =>
        stratInds.some((i) => i.indicatorId === p.indicatorId)
      );

      let sumAch = 0;
      let countAch = 0;
      reported.forEach((p) => {
        if (typeof p.achievementPercent === 'number') {
          sumAch += p.achievementPercent;
          countAch++;
        }
      });
      const avgAch = countAch > 0 ? Math.round((sumAch / countAch) * 10) / 10 : 0;

      const onTrack = reported.filter((p) => p.status === 'ON_TRACK').length;
      const watch = reported.filter((p) => p.status === 'WATCH').length;
      const risk = reported.filter((p) => p.status === 'RISK').length;
      const critical = reported.filter((p) => p.status === 'CRITICAL').length;

      return {
        strategyId: strat.id,
        code: strat.code || strat.name.slice(0, 8),
        name: strat.name,
        total,
        reportedCount: reported.length,
        avgAchievement: avgAch,
        onTrack,
        watch,
        risk,
        critical,
      };
    });
  }, [strategies, activeIndicators, periodDeduplicatedProgress]);

  // 6. Department Progress Data for Card 6 & Bar Chart
  const departmentData = useMemo(() => {
    return departments.map((dept) => {
      const deptInds = activeIndicators.filter(
        (i) => i.departmentId === dept.departmentId || i.responsibleDepartmentId === dept.departmentId
      );
      const total = deptInds.length;
      const reported = periodDeduplicatedProgress.filter((p) =>
        deptInds.some((i) => i.indicatorId === p.indicatorId)
      );

      let sumAch = 0;
      let countAch = 0;
      reported.forEach((p) => {
        if (typeof p.achievementPercent === 'number') {
          sumAch += p.achievementPercent;
          countAch++;
        }
      });
      const avgAch = countAch > 0 ? Math.round((sumAch / countAch) * 10) / 10 : 0;

      return {
        deptId: dept.departmentId,
        name: dept.name || dept.departmentName,
        total,
        reportedCount: reported.length,
        unreportedCount: Math.max(0, total - reported.length),
        avgAchievement: avgAch,
      };
    }).filter((d) => d.total > 0);
  }, [departments, activeIndicators, periodDeduplicatedProgress]);

  // 7. Donut Chart Data
  const donutData = useMemo(() => {
    return [
      { name: 'On Track (>=100%)', value: cardStats.onTrack, color: TRAFFIC_COLORS.ON_TRACK },
      { name: 'Watch (80%-<100%)', value: cardStats.watch, color: TRAFFIC_COLORS.WATCH },
      { name: 'Risk (60%-<80%)', value: cardStats.risk, color: TRAFFIC_COLORS.RISK },
      { name: 'Critical (<60%)', value: cardStats.critical, color: TRAFFIC_COLORS.CRITICAL },
      { name: 'ยังไม่ประเมิน', value: cardStats.notAssessed, color: TRAFFIC_COLORS.NO_DATA },
    ].filter((d) => d.value > 0);
  }, [cardStats]);

  // 8. Trend Comparison across Q1, Q2, Q3, Q4, 9M, ANNUAL
  const periodTrendData = useMemo(() => {
    return STANDARD_REPORTING_PERIODS.map((period) => {
      const dedup = getDeduplicatedProgress(monthlyProgressList, selectedYear, period.key);
      let sum = 0;
      let count = 0;
      dedup.forEach((p) => {
        if (typeof p.achievementPercent === 'number') {
          sum += p.achievementPercent;
          count++;
        }
      });
      const avg = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
      return {
        period: period.shortLabel,
        avgAchievement: avg,
        reportedCount: dedup.length,
      };
    });
  }, [monthlyProgressList, selectedYear]);

  // 9. Table 1: Critical / Risk / Urgent Indicators
  const urgentIndicators = useMemo(() => {
    return fullEvaluationList.filter(
      (item) => item.status === 'CRITICAL' || item.status === 'RISK' || (item.achievementPercent !== null && item.achievementPercent < 80)
    );
  }, [fullEvaluationList]);

  // 10. Table 2: Unreported Indicators
  const unreportedIndicators = useMemo(() => {
    return fullEvaluationList.filter((item) => !item.progress);
  }, [fullEvaluationList]);

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-300">
              <Filter className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-slate-900">ตัวกรองข้อมูลผู้บริหาร (Executive Filters)</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">ปีงบประมาณ:</span>
            <span className="text-xs font-extrabold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
              {selectedYear}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
          {/* Filter 1: Reporting Period */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">รอบรายงาน (Reporting Period)</label>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-amber-900 text-xs rounded-xl px-2.5 py-2 font-bold focus:bg-white focus:outline-none"
            >
              {STANDARD_REPORTING_PERIODS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label} ({p.dateRangeText})
                </option>
              ))}
            </select>
          </div>

          {/* Filter 2: Indicator Type */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">ประเภทตัวชี้วัด</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as IndicatorType | 'ALL')}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-2.5 py-2 font-medium focus:bg-white focus:outline-none"
            >
              <option value="ALL">ทั้งหมด (KPI + KVI)</option>
              <option value="KPI">เฉพาะ KPI</option>
              <option value="KVI">เฉพาะ KVI</option>
            </select>
          </div>

          {/* Filter 3: Strategy */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">ประเด็นยุทธศาสตร์</label>
            <select
              value={filterStrategy}
              onChange={(e) => setFilterStrategy(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-2.5 py-2 font-medium focus:bg-white focus:outline-none truncate"
            >
              <option value="ALL">ทุกประเด็นยุทธศาสตร์</option>
              {strategies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 4: Department */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">หน่วยงานรับผิดชอบ</label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-2.5 py-2 font-medium focus:bg-white focus:outline-none truncate"
            >
              <option value="ALL">ทุกหน่วยงาน</option>
              {departments.map((d) => (
                <option key={d.departmentId} value={d.departmentId}>
                  {d.name || d.departmentName}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 5: Traffic Light */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">สถานะ Traffic Light</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as TrafficLightStatus | 'ALL')}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-2.5 py-2 font-medium focus:bg-white focus:outline-none"
            >
              <option value="ALL">ทุกสถานะ</option>
              <option value="ON_TRACK">🟢 On Track (&gt;= 100%)</option>
              <option value="WATCH">🟡 Watch (80%-&lt;100%)</option>
              <option value="RISK">🟠 Risk (60%-&lt;80%)</option>
              <option value="CRITICAL">🔴 Critical (&lt; 60%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 6 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: จำนวนตัวชี้วัดทั้งหมด */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">จำนวนตัวชี้วัดทั้งหมด</span>
            <span className="p-1 rounded-lg bg-amber-50 text-amber-700">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            {cardStats.totalCount} <span className="text-xs text-slate-500 font-normal">ตัวชี้วัด</span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              KPI: {cardStats.kpiCount}
            </span>
            <span className="font-semibold text-sky-900 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
              KVI: {cardStats.kviCount}
            </span>
            <span className="text-slate-400 font-medium">รวม 100%</span>
          </div>
        </div>

        {/* Card 2: สถานะการรายงาน */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">สถานะการรายงานรอบ {periodInfo.shortLabel}</span>
            <span className="p-1 rounded-lg bg-emerald-50 text-emerald-700">
              <FileCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-800">{cardStats.reportedCount}</span>
            <span className="text-xs text-slate-400 font-medium">รายงานแล้ว ({Math.round((cardStats.reportedCount / (cardStats.totalCount || 1)) * 100)}%)</span>
          </div>
          <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-1 text-[11px] text-center">
            <div className="bg-slate-50 p-1 rounded text-slate-600">
              ยังไม่รายงาน: <strong className="text-rose-600">{cardStats.unreportedCount}</strong>
            </div>
            <div className="bg-amber-50 p-1 rounded text-amber-800">
              รอตรวจ: <strong>{cardStats.waitingReviewCount}</strong>
            </div>
            <div className="bg-emerald-50 p-1 rounded text-emerald-800">
              รับรองแล้ว: <strong>{cardStats.approvedVerifiedCount}</strong>
            </div>
          </div>
        </div>

        {/* Card 3: ร้อยละความสำเร็จภาพรวม */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">ร้อยละความสำเร็จภาพรวม</span>
            <span className="p-1 rounded-lg bg-amber-50 text-amber-700">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-black text-amber-800">{cardStats.avgAchievement}%</div>
            <div className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
              รอบ {periodInfo.label}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 space-y-1">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-amber-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, cardStats.avgAchievement)}%` }}
              ></div>
            </div>
            <div className="text-[10px] text-slate-400 text-right">เกณฑ์เป้าหมายขั้นต่ำ 80%</div>
          </div>
        </div>

        {/* Card 4: Traffic Light */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">สถานะ Traffic Light (รอบ {periodInfo.shortLabel})</span>
            <span className="p-1 rounded-lg bg-indigo-50 text-indigo-700">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded-lg">
              <div className="text-base font-black text-emerald-800">{cardStats.onTrack}</div>
              <div className="text-[9px] font-bold text-emerald-700">On Track</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-1.5 rounded-lg">
              <div className="text-base font-black text-amber-800">{cardStats.watch}</div>
              <div className="text-[9px] font-bold text-amber-700">Watch</div>
            </div>
            <div className="bg-orange-50 border border-orange-200 p-1.5 rounded-lg">
              <div className="text-base font-black text-orange-800">{cardStats.risk}</div>
              <div className="text-[9px] font-bold text-orange-700">Risk</div>
            </div>
            <div className="bg-rose-50 border border-rose-200 p-1.5 rounded-lg">
              <div className="text-base font-black text-rose-800">{cardStats.critical}</div>
              <div className="text-[9px] font-bold text-rose-700">Critical</div>
            </div>
          </div>
          <div className="pt-1 text-[10px] text-slate-400 text-center">
            ยังไม่ประเมิน / ขาดข้อมูล: <strong className="text-slate-600">{cardStats.notAssessed}</strong> ตัวชี้วัด
          </div>
        </div>

        {/* Card 5: ความก้าวหน้าตามยุทธศาสตร์ */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">ความก้าวหน้าตามยุทธศาสตร์</span>
            <span className="p-1 rounded-lg bg-sky-50 text-sky-700">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div className="space-y-1.5 max-h-[88px] overflow-y-auto pr-1">
            {strategyData.slice(0, 3).map((st) => (
              <div key={st.strategyId} className="flex items-center justify-between text-xs">
                <span className="text-slate-700 truncate max-w-[170px] font-medium" title={st.name}>
                  {st.name}
                </span>
                <span className="font-bold text-amber-800">{st.avgAchievement}%</span>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex justify-between">
            <span>ทั้งหมด {strategies.length} ยุทธศาสตร์</span>
            <span className="font-semibold text-amber-800">ดูรายละเอียดในกราฟด้านล่าง</span>
          </div>
        </div>

        {/* Card 6: ความก้าวหน้ารายหน่วยงาน */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">ความก้าวหน้ารายหน่วยงาน</span>
            <span className="p-1 rounded-lg bg-purple-50 text-purple-700">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="space-y-1.5 max-h-[88px] overflow-y-auto pr-1">
            {departmentData.slice(0, 3).map((dp) => (
              <div key={dp.deptId} className="flex items-center justify-between text-xs">
                <span className="text-slate-700 truncate max-w-[160px] font-medium" title={dp.name}>
                  {dp.name}
                </span>
                <span className="text-[11px] text-slate-500">
                  {dp.reportedCount}/{dp.total} (<strong className="text-amber-800">{dp.avgAchievement}%</strong>)
                </span>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex justify-between">
            <span>ทั้งหมด {departmentData.length} หน่วยงาน</span>
            <span className="font-semibold text-amber-800">อัปเดตแบบ Real-time</span>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Donut Traffic Light */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">
              1. สัดส่วนสถานะ Traffic Light (รอบ {periodInfo.label})
            </h4>
            <span className="text-[10px] text-slate-400">Total: {cardStats.totalCount}</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: any) => [`${value} ตัวชี้วัด`, name]}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Bar ร้อยละความสำเร็จรายหน่วยงาน */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">
              2. ร้อยละความสำเร็จเฉลี่ยรายหน่วยงาน (รอบ {periodInfo.shortLabel})
            </h4>
            <span className="text-[10px] text-slate-400">เป้าหมาย 100%</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" />
                <YAxis domain={[0, 120]} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value: any) => [`${value}%`, 'ความสำเร็จ']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="avgAchievement" fill="#b45309" radius={[6, 6, 0, 0]} name="ร้อยละความสำเร็จ" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Bar ความก้าวหน้ารายยุทธศาสตร์ */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">
              3. ร้อยละความสำเร็จตามประเด็นยุทธศาสตร์ (รอบ {periodInfo.shortLabel})
            </h4>
            <span className="text-[10px] text-slate-400">{strategies.length} ยุทธศาสตร์</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={strategyData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="code" tick={{ fontSize: 10 }} interval={0} />
                <YAxis domain={[0, 120]} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value: any, name: any, item: any) => [`${value}%`, item.payload.name]}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="avgAchievement" fill="#d97706" radius={[6, 6, 0, 0]} name="ความสำเร็จเฉลี่ย" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4 & 5: Trend Comparison across Q1..ANNUAL */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">
              4. แนวโน้มผลสำเร็จเปรียบเทียบตามรอบรายงาน (Q1–ANNUAL)
            </h4>
            <span className="text-[10px] text-amber-800 font-bold">ปีงบประมาณ {selectedYear}</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={periodTrendData} margin={{ top: 10, right: 20, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="period" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                <YAxis domain={[0, 120]} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value: any) => [`${value}%`, 'ความสำเร็จเฉลี่ย']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="avgAchievement"
                  stroke="#b45309"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#b45309', strokeWidth: 2, stroke: '#fff' }}
                  name="ความสำเร็จเฉลี่ย (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Two Actionable Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table 1: Urgent Indicators (Critical / Risk) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h4 className="text-sm font-bold text-slate-900">
                ตัวชี้วัดที่ต้องเร่งรัด (Critical / Risk ในรอบ {periodInfo.shortLabel})
              </h4>
            </div>
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
              {urgentIndicators.length} รายการ
            </span>
          </div>

          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {urgentIndicators.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                ไม่มีตัวชี้วัดที่อยู่ในสถานะ Critical หรือ Risk ในรอบนี้ 🎉
              </div>
            ) : (
              urgentIndicators.map((item) => (
                <div
                  key={item.indicator.indicatorId}
                  className="p-3 bg-rose-50/50 border border-rose-200 rounded-xl space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-rose-900">{item.indicator.code}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${item.statusColorClass}`}>
                      {item.status === 'CRITICAL' ? '🔴 Critical' : '🟠 Risk'} ({item.achievementDisplay})
                    </span>
                  </div>
                  <div className="font-semibold text-slate-800">{item.indicator.name}</div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>หน่วยงาน: {item.indicator.departmentName || item.indicator.responsibleDepartmentName}</span>
                    {onOpenDirectiveModal && (
                      <button
                        onClick={() => onOpenDirectiveModal(item.indicator.indicatorId)}
                        className="text-amber-800 font-bold hover:underline cursor-pointer"
                      >
                        + มอบหมายข้อสั่งการ
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Table 2: Unreported Indicators */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <h4 className="text-sm font-bold text-slate-900">
                ตัวชี้วัดที่ยังไม่รายงานผล (รอบ {periodInfo.shortLabel})
              </h4>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
              {unreportedIndicators.length} รายการ
            </span>
          </div>

          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {unreportedIndicators.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                รายงานผลครบถ้วนทุกตัวชี้วัดแล้วในรอบนี้ 👏
              </div>
            ) : (
              unreportedIndicators.map((item) => (
                <div
                  key={item.indicator.indicatorId}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-800">{item.indicator.code}</span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded">
                      ยังไม่รายงาน
                    </span>
                  </div>
                  <div className="font-medium text-slate-700">{item.indicator.name}</div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>หน่วยงาน: {item.indicator.departmentName || item.indicator.responsibleDepartmentName}</span>
                    {onSelectTab && (
                      <button
                        onClick={() => onSelectTab('progress')}
                        className="text-amber-800 font-bold hover:underline cursor-pointer"
                      >
                        บันทึกผลงาน &rarr;
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

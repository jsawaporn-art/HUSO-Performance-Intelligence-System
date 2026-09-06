import { MonthlyProgress, Indicator, Target, SystemConfig, TrafficLightStatus, ReportingPeriod, VerificationStatus } from '../types';
import { INITIAL_CONFIG } from '../mockData';

export interface ReportingPeriodInfo {
  key: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'NINE_MONTH' | 'ANNUAL';
  code: string;
  label: string;
  shortLabel: string;
  dateRangeText: string;
  startDate: string; // MM-DD
  endDate: string; // MM-DD
  targetMonthIndex: number; // 0-based month index (2 for Dec, 5 for Mar, 8 for Jun, 11 for Sep)
  equivalentMonths: number[]; // Months in fiscal year (1=Oct..12=Sep)
}

export type PeriodWorkflowStatus = 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'APPROVED' | 'REVISION';

export interface PeriodStatusBadgeInfo {
  status: PeriodWorkflowStatus;
  label: string;
  badgeText: string;
  iconSymbol: string;
  colorClass: string;
  buttonClass: string;
}

export const STANDARD_REPORTING_PERIODS: ReportingPeriodInfo[] = [
  {
    key: 'Q1',
    code: 'Q1',
    label: 'ไตรมาส 1 (Q1)',
    shortLabel: 'Q1',
    dateRangeText: '1 ต.ค. – 31 ธ.ค.',
    startDate: '10-01',
    endDate: '12-31',
    targetMonthIndex: 2, // Month 3 (Dec)
    equivalentMonths: [1, 2, 3],
  },
  {
    key: 'Q2',
    code: 'Q2',
    label: 'ไตรมาส 2 (Q2)',
    shortLabel: 'Q2',
    dateRangeText: '1 ม.ค. – 31 มี.ค.',
    startDate: '01-01',
    endDate: '03-31',
    targetMonthIndex: 5, // Month 6 (Mar)
    equivalentMonths: [4, 5, 6],
  },
  {
    key: 'Q3',
    code: 'Q3',
    label: 'ไตรมาส 3 (Q3)',
    shortLabel: 'Q3',
    dateRangeText: '1 เม.ย. – 30 มิ.ย.',
    startDate: '04-01',
    endDate: '06-30',
    targetMonthIndex: 8, // Month 9 (Jun)
    equivalentMonths: [7, 8, 9],
  },
  {
    key: 'Q4',
    code: 'Q4',
    label: 'ไตรมาส 4 (Q4)',
    shortLabel: 'Q4',
    dateRangeText: '1 ก.ค. – 30 ก.ย.',
    startDate: '07-01',
    endDate: '09-30',
    targetMonthIndex: 11, // Month 12 (Sep)
    equivalentMonths: [10, 11, 12],
  },
  {
    key: 'NINE_MONTH',
    code: '9M',
    label: 'ผลสะสม 9 เดือน (9M)',
    shortLabel: '9M',
    dateRangeText: '1 ต.ค. – 30 มิ.ย.',
    startDate: '10-01',
    endDate: '06-30',
    targetMonthIndex: 8, // Month 9 (Jun)
    equivalentMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  },
  {
    key: 'ANNUAL',
    code: 'ANNUAL',
    label: 'ผลสะสม 1 ปี / สิ้นปีงบประมาณ (ANNUAL)',
    shortLabel: 'ANNUAL',
    dateRangeText: '1 ต.ค. – 30 ก.ย.',
    startDate: '10-01',
    endDate: '09-30',
    targetMonthIndex: 11, // Month 12 (Sep)
    equivalentMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
];

export function getReportingPeriodInfo(periodKey: string): ReportingPeriodInfo {
  const found = STANDARD_REPORTING_PERIODS.find(
    (p) => p.key === periodKey || p.code === periodKey || p.shortLabel === periodKey
  );
  return found || STANDARD_REPORTING_PERIODS[0];
}

/**
 * Normalizes any legacy or modern period identifier into one of standard 6 keys
 */
export function normalizeReportingPeriod(rawPeriod?: string, month?: number): 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'NINE_MONTH' | 'ANNUAL' {
  if (!rawPeriod && typeof month === 'number') {
    if (month <= 3) return 'Q1';
    if (month <= 6) return 'Q2';
    if (month <= 9) return 'Q3';
    return 'Q4';
  }
  const upper = (rawPeriod || '').toUpperCase().trim();
  if (upper === 'Q1' || upper === 'ROUND_3M' || upper === '3M') return 'Q1';
  if (upper === 'Q2' || upper === 'ROUND_6M' || upper === '6M') return 'Q2';
  if (upper === 'Q3') return 'Q3';
  if (upper === 'Q4') return 'Q4';
  if (upper === '9M' || upper === 'NINE_MONTH' || upper === 'ROUND_9M') return 'NINE_MONTH';
  if (upper === 'ANNUAL' || upper === '1Y' || upper === 'ROUND_1Y' || upper === 'YEAR') return 'ANNUAL';
  return 'Q1';
}

/**
 * Generates the standardized Composite Unique Result Key
 */
export function generateResultKey(fiscalYear: string, indicatorId: string, reportingPeriod: string): string {
  const normPeriod = normalizeReportingPeriod(reportingPeriod);
  return `${fiscalYear}_${indicatorId}_${normPeriod}`;
}

/**
 * Returns the status badge & visual configuration for a given workflow status
 */
export function getPeriodStatusBadgeInfo(verificationStatus?: VerificationStatus | string): PeriodStatusBadgeInfo {
  const status = (verificationStatus || 'NOT_STARTED').toUpperCase() as PeriodWorkflowStatus;

  switch (status) {
    case 'APPROVED':
      return {
        status: 'APPROVED',
        label: 'รับรองแล้ว ✓',
        badgeText: 'รับรองแล้ว',
        iconSymbol: '🟢',
        colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        buttonClass: 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold',
      };
    case 'VERIFIED':
      return {
        status: 'VERIFIED',
        label: 'ตรวจสอบแล้ว',
        badgeText: 'ผ่านตรวจ',
        iconSymbol: '🟣',
        colorClass: 'bg-purple-100 text-purple-800 border-purple-300',
        buttonClass: 'border-purple-400 bg-purple-50 text-purple-900 font-bold',
      };
    case 'SUBMITTED':
      return {
        status: 'SUBMITTED',
        label: 'ส่งตรวจแล้ว',
        badgeText: 'รอตรวจ',
        iconSymbol: '🔵',
        colorClass: 'bg-sky-100 text-sky-800 border-sky-300',
        buttonClass: 'border-sky-400 bg-sky-50 text-sky-900 font-bold',
      };
    case 'DRAFT':
      return {
        status: 'DRAFT',
        label: 'ฉบับร่าง',
        badgeText: 'ร่าง',
        iconSymbol: '🟡',
        colorClass: 'bg-amber-100 text-amber-800 border-amber-300',
        buttonClass: 'border-amber-400 bg-amber-50 text-amber-900 font-medium',
      };
    case 'REVISION':
      return {
        status: 'REVISION',
        label: 'ส่งกลับแก้ไข',
        badgeText: 'แก้ไข',
        iconSymbol: '🟠',
        colorClass: 'bg-orange-100 text-orange-800 border-orange-300',
        buttonClass: 'border-orange-400 bg-orange-50 text-orange-900 font-bold',
      };
    case 'NOT_STARTED':
    default:
      return {
        status: 'NOT_STARTED',
        label: 'ยังไม่เริ่ม',
        badgeText: 'ยังไม่เริ่ม',
        iconSymbol: '⚪',
        colorClass: 'bg-slate-100 text-slate-500 border-slate-200',
        buttonClass: 'border-slate-200 bg-white text-slate-600',
      };
  }
}

/**
 * Calculates cumulative actual from previous periods based on aggregationMethod
 */
export function calculateCumulativeFromPeriods(
  currentPeriod: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'NINE_MONTH' | 'ANNUAL',
  currentPeriodActual: number,
  allIndicatorProgress: MonthlyProgress[],
  aggregationMethod: 'SUM' | 'LATEST_VALUE' | 'AVERAGE' | 'MANUAL_CUMULATIVE' = 'SUM',
  indicatorUnit?: string
): { cumulativeActual: number; calculationNotes: string } {
  // Determine if unit indicates non-summable percentages or scores
  const isPercentUnit = indicatorUnit?.includes('%') || indicatorUnit?.includes('ร้อยละ') || indicatorUnit?.toLowerCase().includes('score');
  const method = isPercentUnit && aggregationMethod === 'SUM' ? 'LATEST_VALUE' : aggregationMethod;

  if (method === 'MANUAL_CUMULATIVE') {
    return {
      cumulativeActual: currentPeriodActual,
      calculationNotes: 'ป้อนผลสะสมด้วยตนเอง (Manual Cumulative)',
    };
  }

  // Gather actuals of previous periods
  const q1Record = allIndicatorProgress.find((p) => normalizeReportingPeriod(p.reportingPeriod as string, p.month) === 'Q1');
  const q2Record = allIndicatorProgress.find((p) => normalizeReportingPeriod(p.reportingPeriod as string, p.month) === 'Q2');
  const q3Record = allIndicatorProgress.find((p) => normalizeReportingPeriod(p.reportingPeriod as string, p.month) === 'Q3');
  const q4Record = allIndicatorProgress.find((p) => normalizeReportingPeriod(p.reportingPeriod as string, p.month) === 'Q4');

  const q1Val = currentPeriod === 'Q1' ? currentPeriodActual : (q1Record?.actualMonthly ?? 0);
  const q2Val = currentPeriod === 'Q2' ? currentPeriodActual : (q2Record?.actualMonthly ?? 0);
  const q3Val = currentPeriod === 'Q3' ? currentPeriodActual : (q3Record?.actualMonthly ?? 0);
  const q4Val = currentPeriod === 'Q4' ? currentPeriodActual : (q4Record?.actualMonthly ?? 0);

  if (method === 'LATEST_VALUE') {
    return {
      cumulativeActual: currentPeriodActual,
      calculationNotes: `ใช้ค่าผลสำเร็จล่าสุดของรอบที่เลือก (${currentPeriodActual})`,
    };
  }

  if (method === 'AVERAGE') {
    let vals: number[] = [];
    if (currentPeriod === 'Q1') vals = [q1Val];
    else if (currentPeriod === 'Q2') vals = [q1Val, q2Val];
    else if (currentPeriod === 'Q3' || currentPeriod === 'NINE_MONTH') vals = [q1Val, q2Val, q3Val];
    else vals = [q1Val, q2Val, q3Val, q4Val];

    const nonZero = vals.filter((v) => v !== 0);
    const avg = nonZero.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : currentPeriodActual;
    const rounded = Math.round(avg * 10) / 10;
    return {
      cumulativeActual: rounded,
      calculationNotes: `ค่าเฉลี่ยสะสม ${vals.length} รอบ: ${rounded}`,
    };
  }

  // Default: SUM
  if (currentPeriod === 'Q1') {
    return {
      cumulativeActual: q1Val,
      calculationNotes: `ผลรวมสะสม Q1 = ${q1Val}`,
    };
  }
  if (currentPeriod === 'Q2') {
    const sum = Math.round((q1Val + q2Val) * 10) / 10;
    return {
      cumulativeActual: sum,
      calculationNotes: `ผลรวมสะสม Q1 (${q1Val}) + Q2 (${q2Val}) = ${sum}`,
    };
  }
  if (currentPeriod === 'Q3' || currentPeriod === 'NINE_MONTH') {
    const sum = Math.round((q1Val + q2Val + q3Val) * 10) / 10;
    return {
      cumulativeActual: sum,
      calculationNotes: `ผลรวมสะสม Q1 (${q1Val}) + Q2 (${q2Val}) + Q3 (${q3Val}) = ${sum}`,
    };
  }
  // Q4 or ANNUAL
  const sum = Math.round((q1Val + q2Val + q3Val + q4Val) * 10) / 10;
  return {
    cumulativeActual: sum,
    calculationNotes: `ผลรวมสะสม Q1 (${q1Val}) + Q2 (${q2Val}) + Q3 (${q3Val}) + Q4 (${q4Val}) = ${sum}`,
  };
}

/**
 * Calculation of Achievement & Traffic Light status according to strict standardized rules:
 * - Green (ON_TRACK): >= 100%
 * - Yellow (WATCH): 80% - <100%
 * - Orange (RISK): 60% - <80%
 * - Red (CRITICAL): < 60%
 * - White/Gray (NO_DATA): Missing or Target <= 0
 */
export function calculateAchievementAndTrafficLight(
  indicator: Indicator | undefined,
  cumulativeTarget: number,
  cumulativeActual: number,
  config: SystemConfig = INITIAL_CONFIG
): {
  achievementPercent: number | null;
  achievementDisplay: string;
  status: TrafficLightStatus;
  statusLabel: string;
  statusColorClass: string;
  variance: number;
  varianceText: string;
  isCalculable: boolean;
} {
  if (!indicator || cumulativeTarget === undefined || cumulativeTarget === null || isNaN(cumulativeTarget) || cumulativeTarget <= 0) {
    // If target is missing or <= 0
    return {
      achievementPercent: null,
      achievementDisplay: 'ยังไม่สามารถคำนวณได้',
      status: 'NO_DATA',
      statusLabel: 'ยังไม่สามารถประเมินได้',
      statusColorClass: 'bg-slate-100 text-slate-600 border-slate-300',
      variance: 0,
      varianceText: 'ไม่มีค่าเป้าหมายที่กำหนด',
      isCalculable: false,
    };
  }

  let achievement = 0;
  let variance = cumulativeActual - cumulativeTarget;
  let varianceText = '';

  const dir = (indicator.direction || 'MORE_IS_BETTER').toUpperCase();

  if (dir === 'MORE_IS_BETTER' || dir === 'POSITIVE') {
    achievement = (cumulativeActual / cumulativeTarget) * 100;
    variance = cumulativeActual - cumulativeTarget;
    varianceText =
      variance >= 0
        ? `สูงกว่าเป้าหมาย +${variance.toFixed(1)} ${indicator.unit || ''}`
        : `ต่ำกว่าเป้าหมาย ${variance.toFixed(1)} ${indicator.unit || ''}`;
  } else if (dir === 'LESS_IS_BETTER' || dir === 'NEGATIVE') {
    variance = cumulativeTarget - cumulativeActual;
    if (cumulativeActual <= 0) {
      achievement = 100;
      varianceText = `บรรลุผลสูงสุด (0 ${indicator.unit || ''})`;
    } else {
      achievement = (cumulativeTarget / cumulativeActual) * 100;
      varianceText =
        variance >= 0
          ? `เร็วกว่า/ดีกว่าเป้าหมาย ${variance.toFixed(1)} ${indicator.unit || ''}`
          : `เกินเป้าหมาย ${Math.abs(variance).toFixed(1)} ${indicator.unit || ''}`;
    }
  } else if (dir === 'EXACT_TARGET') {
    achievement = cumulativeActual === cumulativeTarget ? 100 : 50;
    varianceText = cumulativeActual === cumulativeTarget ? 'ตรงตามเป้าหมาย' : `ต่างจากเป้าหมาย ${Math.abs(variance).toFixed(1)} ${indicator.unit || ''}`;
  } else {
    // MILESTONE
    achievement = Math.min(100, (cumulativeActual / (cumulativeTarget || 5)) * 100);
    varianceText = `ระดับขั้นความสำเร็จ ${cumulativeActual} / ${cumulativeTarget}`;
  }

  // Cap achievement if configured (e.g. 120 or raw)
  const roundedAch = Math.round(achievement * 10) / 10;

  // System thresholds
  const onTrackTh = config?.thresholds?.onTrack ?? 100;
  const watchTh = config?.thresholds?.watch ?? 80;
  const riskTh = config?.thresholds?.risk ?? 60;

  let status: TrafficLightStatus = 'CRITICAL';
  let statusLabel = 'Critical (< 60%)';
  let statusColorClass = 'bg-rose-100 text-rose-800 border-rose-300';

  if (roundedAch >= onTrackTh) {
    status = 'ON_TRACK';
    statusLabel = 'On Track (>= 100%)';
    statusColorClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
  } else if (roundedAch >= watchTh) {
    status = 'WATCH';
    statusLabel = 'Watch (80% - <100%)';
    statusColorClass = 'bg-amber-100 text-amber-800 border-amber-300';
  } else if (roundedAch >= riskTh) {
    status = 'RISK';
    statusLabel = 'Risk (60% - <80%)';
    statusColorClass = 'bg-orange-100 text-orange-800 border-orange-300';
  } else {
    status = 'CRITICAL';
    statusLabel = 'Critical (< 60%)';
    statusColorClass = 'bg-rose-100 text-rose-800 border-rose-300';
  }

  return {
    achievementPercent: roundedAch,
    achievementDisplay: `${roundedAch.toFixed(1)}%`,
    status,
    statusLabel,
    statusColorClass,
    variance,
    varianceText,
    isCalculable: true,
  };
}

/**
 * Filter and Deduplicate Progress Records:
 * Enforces (fiscalYear + indicatorId + reportingPeriod) unique constraint.
 * Picks the latest active record (by version, verification rank APPROVED > VERIFIED > SUBMITTED > DRAFT, or lastModified).
 */
export function getDeduplicatedProgress(
  allProgress: MonthlyProgress[],
  fiscalYear?: string,
  reportingPeriod?: string
): MonthlyProgress[] {
  const normTargetPeriod = reportingPeriod ? normalizeReportingPeriod(reportingPeriod) : null;

  // Filter records matching year and status != DELETED
  const relevant = allProgress.filter((p) => {
    if (fiscalYear && p.fiscalYear !== fiscalYear) return false;
    const pPeriod = normalizeReportingPeriod(p.reportingPeriod as string, p.month);
    if (normTargetPeriod && pPeriod !== normTargetPeriod) return false;
    return true;
  });

  // Group by Unique Key: fiscalYear + indicatorId + reportingPeriod
  const map = new Map<string, MonthlyProgress>();

  for (const p of relevant) {
    const pPeriod = normalizeReportingPeriod(p.reportingPeriod as string, p.month);
    const key = generateResultKey(p.fiscalYear || '2569', p.indicatorId, pPeriod);

    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...p, reportingPeriod: pPeriod, resultKey: key });
    } else {
      // Comparison logic:
      // 1. Higher verification status priority: APPROVED > VERIFIED > SUBMITTED > REVISION > DRAFT
      // 2. Higher version number
      // 3. More recent lastModified / loggedDate
      const statusRank: Record<string, number> = {
        APPROVED: 5,
        VERIFIED: 4,
        SUBMITTED: 3,
        REVISION: 2,
        DRAFT: 1,
      };

      const existingRank = statusRank[existing.verificationStatus] || 0;
      const currentRank = statusRank[p.verificationStatus] || 0;

      let replace = false;
      if (currentRank > existingRank) {
        replace = true;
      } else if (currentRank === existingRank) {
        const existingVer = existing.version || 1;
        const currentVer = p.version || 1;
        if (currentVer > existingVer) {
          replace = true;
        } else if (currentVer === existingVer) {
          const existingTime = new Date(existing.lastModified || existing.loggedDate || 0).getTime();
          const currentTime = new Date(p.lastModified || p.loggedDate || 0).getTime();
          if (currentTime > existingTime) {
            replace = true;
          }
        }
      }

      if (replace) {
        map.set(key, { ...p, reportingPeriod: pPeriod, resultKey: key });
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Dry Run Analysis for Legacy Data:
 * Calculates stats on existing monthlyProgress records without mutating them.
 */
export interface LegacyDryRunResult {
  totalMonthlyRecords: number;
  q1MappableCount: number;
  q2MappableCount: number;
  q3MappableCount: number;
  q4MappableCount: number;
  nineMonthMappableCount: number;
  annualMappableCount: number;
  duplicateKeyCount: number;
  verifiedCount: number;
  approvedCount: number;
  hasBothVerifiedAndApproved: { indicatorId: string; indicatorCode: string; period: string }[];
  duplicateGroups: { key: string; count: number; items: MonthlyProgress[] }[];
}

export function analyzeLegacyProgressData(allProgress: MonthlyProgress[]): LegacyDryRunResult {
  const result: LegacyDryRunResult = {
    totalMonthlyRecords: allProgress.length,
    q1MappableCount: 0,
    q2MappableCount: 0,
    q3MappableCount: 0,
    q4MappableCount: 0,
    nineMonthMappableCount: 0,
    annualMappableCount: 0,
    duplicateKeyCount: 0,
    verifiedCount: 0,
    approvedCount: 0,
    hasBothVerifiedAndApproved: [],
    duplicateGroups: [],
  };

  const groupMap = new Map<string, MonthlyProgress[]>();

  for (const p of allProgress) {
    if (p.verificationStatus === 'VERIFIED') result.verifiedCount++;
    if (p.verificationStatus === 'APPROVED') result.approvedCount++;

    const pPeriod = normalizeReportingPeriod(p.reportingPeriod as string, p.month);
    if (pPeriod === 'Q1') result.q1MappableCount++;
    else if (pPeriod === 'Q2') result.q2MappableCount++;
    else if (pPeriod === 'Q3') result.q3MappableCount++;
    else if (pPeriod === 'Q4') result.q4MappableCount++;
    else if (pPeriod === 'NINE_MONTH') result.nineMonthMappableCount++;
    else if (pPeriod === 'ANNUAL') result.annualMappableCount++;

    const key = generateResultKey(p.fiscalYear || '2569', p.indicatorId, pPeriod);
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key)!.push(p);
  }

  for (const [key, items] of groupMap.entries()) {
    if (items.length > 1) {
      result.duplicateKeyCount += items.length - 1;
      result.duplicateGroups.push({ key, count: items.length, items });

      const hasVer = items.some((i) => i.verificationStatus === 'VERIFIED');
      const hasApp = items.some((i) => i.verificationStatus === 'APPROVED');
      if (hasVer && hasApp) {
        const sample = items[0];
        result.hasBothVerifiedAndApproved.push({
          indicatorId: sample.indicatorId,
          indicatorCode: sample.indicatorCode,
          period: sample.reportingPeriod as string,
        });
      }
    }
  }

  return result;
}

export type StrategicOverallStatus = 'ON_TRACK' | 'WATCH' | 'RISK' | 'CRITICAL' | 'NOT_ASSESSED';

export interface StrategyPerformanceItem {
  strategyId: string;
  strategyCode: string;
  strategyName: string;
  displayTitle: string;
  totalIndicators: number;
  achievedCount: number;
  achievedPercent: number;
  notAchievedCount: number;
  notAchievedPercent: number;
  notReportedCount: number;
  notReportedPercent: number;
  overallStatus: StrategicOverallStatus;
  overallStatusLabel: string;
  overallStatusBadgeClass: string;
  overallStatusColor: string;
  hasIndicators: boolean;
  emptyReasonText?: string;
  lastUpdatedDate?: string;
  indicatorIds: string[];
}

export interface PublicIndicatorMetric {
  indicatorId: string;
  code: string;
  name: string;
  description?: string;
  type: 'KPI' | 'KVI';
  strategyId: string;
  strategyName?: string;
  departmentId: string;
  departmentName: string;
  responsibleDepartmentId?: string;
  responsibleDepartmentName?: string;
  unit: string;
  targetValue: number;
  actualValue: number;
  achievementPercent: number | null;
  status: TrafficLightStatus;
  classification: 'ACHIEVED' | 'NOT_ACHIEVED' | 'NOT_REPORTED';
  periodMonthName: string;
  hasApprovedProgress: boolean;
  lastModified?: string;
  progressRecord?: MonthlyProgress;
}

export interface PublicStrategyPerformanceSummary {
  fiscalYear: string;
  reportingPeriod: string;
  reportingPeriodInfo: ReportingPeriodInfo;
  indicatorType: string;
  departmentId: string;
  strategies: StrategyPerformanceItem[];
  overallTotals: {
    totalIndicators: number;
    achievedCount: number;
    achievedPercent: number;
    notAchievedCount: number;
    notAchievedPercent: number;
    notReportedCount: number;
    notReportedPercent: number;
    kpiCount: number;
    kviCount: number;
    evaluatedCount: number;
  };
  indicatorDetails: PublicIndicatorMetric[];
  trendData: {
    periodKey: string;
    periodCode: string;
    periodLabel: string;
    periodShortLabel: string;
    hasAnyApprovedData: boolean;
    strategies: Record<
      string,
      {
        achievedPercent: number | null;
        achievedCount: number;
        notAchievedCount: number;
        notReportedCount: number;
        totalIndicators: number;
        hasData: boolean;
      }
    >;
  }[];
}

/**
 * Format Strategy Display Title cleanly
 */
export function formatStrategyTitle(code?: string, name?: string): string {
  if (!name && !code) return 'ไม่ระบุยุทธศาสตร์';
  if (!name) return code || '';
  const cleanName = name.trim();
  const cleanCode = (code || '').trim();
  if (!cleanCode) return cleanName;
  if (cleanName.startsWith(cleanCode) || cleanName.startsWith('ยุทธศาสตร์ที่')) {
    return cleanName;
  }
  return `${cleanCode}: ${cleanName}`;
}

/**
 * Distribute percentages with exact 1 decimal precision summing to 100.0%
 */
export function distributePercentages(
  aCount: number,
  uCount: number,
  rCount: number,
  total: number
): { aPct: number; uPct: number; rPct: number } {
  if (total <= 0) {
    return { aPct: 0, uPct: 0, rPct: 0 };
  }

  let aPct = Math.round((aCount / total) * 1000) / 10;
  let uPct = Math.round((uCount / total) * 1000) / 10;
  let rPct = Math.round((rCount / total) * 1000) / 10;

  const currentSum = Math.round((aPct + uPct + rPct) * 10) / 10;
  const diff = Math.round((100.0 - currentSum) * 10) / 10;

  if (diff !== 0) {
    // Adjust the group with the highest count that is > 0
    if (aCount >= uCount && aCount >= rCount && aCount > 0) {
      aPct = Math.round((aPct + diff) * 10) / 10;
    } else if (uCount >= aCount && uCount >= rCount && uCount > 0) {
      uPct = Math.round((uPct + diff) * 10) / 10;
    } else if (rCount > 0) {
      rPct = Math.round((rPct + diff) * 10) / 10;
    }
  }

  return { aPct, uPct, rPct };
}

/**
 * Helper to compute overall strategy status
 */
export function computeStrategyOverallStatus(
  achievedPercent: number,
  totalIndicators: number,
  evaluatedCount: number
): {
  status: StrategicOverallStatus;
  label: string;
  badgeClass: string;
  color: string;
} {
  if (totalIndicators === 0 || evaluatedCount === 0) {
    return {
      status: 'NOT_ASSESSED',
      label: 'ยังไม่สามารถประเมินได้',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-300',
      color: '#94a3b8',
    };
  }

  if (achievedPercent >= 80) {
    return {
      status: 'ON_TRACK',
      label: '🟢 ON TRACK (≥80%)',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      color: '#10b981',
    };
  }
  if (achievedPercent >= 60) {
    return {
      status: 'WATCH',
      label: '🟡 WATCH (60–79.9%)',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      color: '#f59e0b',
    };
  }
  if (achievedPercent >= 40) {
    return {
      status: 'RISK',
      label: '🟠 RISK (40–59.9%)',
      badgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
      color: '#f97316',
    };
  }
  return {
    status: 'CRITICAL',
    label: '🔴 CRITICAL (<40%)',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    color: '#ef4444',
  };
}

/**
 * CENTRAL SINGLE SOURCE OF TRUTH:
 * getPublicStrategyPerformanceSummary
 *
 * Computes all strategy-level and overall public metrics according to strict requirements:
 * - Only APPROVED, ACTIVE, and PUBLIC items.
 * - Strict deduplication by (fiscalYear + indicatorId + reportingPeriod) with latest version.
 * - Classified into Achieved (>=100% or ON_TRACK), Not Achieved (<100%), and Not Reported/Unassessed.
 * - Trend line data with `null` for periods without data.
 */
export function getPublicStrategyPerformanceSummary(
  fiscalYear: string = '2569',
  reportingPeriod: string = 'Q2',
  indicatorType: string = 'ALL',
  departmentId: string = 'ALL',
  allIndicators: Indicator[],
  allTargets: Target[],
  allProgressList: MonthlyProgress[],
  allStrategies: { id: string; code?: string; name?: string; fiscalYear?: string }[],
  systemConfig: SystemConfig = INITIAL_CONFIG
): PublicStrategyPerformanceSummary {
  const normPeriod = normalizeReportingPeriod(reportingPeriod);
  const periodInfo = getReportingPeriodInfo(normPeriod);

  // 1. Filter active & public indicators
  const activePublicIndicators = allIndicators.filter((ind) => {
    if (ind.status === 'DELETED') return false;
    if (ind.isActive === false) return false;
    if ((ind as any).isPublic === false) return false;
    if (indicatorType !== 'ALL' && ind.type !== indicatorType) return false;
    if (departmentId !== 'ALL') {
      const matchDept =
        ind.departmentId === departmentId ||
        ind.responsibleDepartmentId === departmentId ||
        (ind as any).id === departmentId;
      if (!matchDept) return false;
    }
    return true;
  });

  // 2. Filter strategies relevant for this fiscal year (or all if year matches)
  const relevantStrategies = allStrategies.filter(
    (s) => !s.fiscalYear || s.fiscalYear === fiscalYear || s.fiscalYear === 'ALL'
  );

  // Fallback: if no strategy matches fiscalYear, use all unique strategies
  const strategyList = relevantStrategies.length > 0 ? relevantStrategies : allStrategies;

  // 3. Deduplicate and filter ONLY APPROVED progress records for the selected period
  const deduplicatedApprovedProgress = getDeduplicatedProgress(
    allProgressList.filter((p) => p.verificationStatus === 'APPROVED'),
    fiscalYear,
    normPeriod
  );

  const progressByIndicatorId = new Map<string, MonthlyProgress>();
  for (const prog of deduplicatedApprovedProgress) {
    progressByIndicatorId.set(prog.indicatorId, prog);
  }

  // 4. Classify each indicator
  const indicatorMetrics: PublicIndicatorMetric[] = activePublicIndicators.map((ind) => {
    const prog = progressByIndicatorId.get(ind.indicatorId);
    const targetObj = allTargets.find(
      (t) => t.indicatorId === ind.indicatorId && t.fiscalYear === fiscalYear
    );

    // Target for period or annual
    let cumulativeTarget = 0;
    if (targetObj) {
      if (normPeriod === 'Q1') cumulativeTarget = targetObj.q1Target || (targetObj.annualTarget ? targetObj.annualTarget * 0.25 : 0);
      else if (normPeriod === 'Q2') cumulativeTarget = targetObj.q2Target || (targetObj.annualTarget ? targetObj.annualTarget * 0.5 : 0);
      else if (normPeriod === 'Q3' || normPeriod === 'NINE_MONTH') cumulativeTarget = targetObj.q3Target || (targetObj.annualTarget ? targetObj.annualTarget * 0.75 : 0);
      else cumulativeTarget = targetObj.annualTarget || targetObj.q4Target || 100;
    }
    if (cumulativeTarget <= 0) {
      cumulativeTarget = ind.baseline || 100;
    }

    const actualVal = prog ? (prog.actualCumulative ?? prog.actualMonthly ?? 0) : 0;

    // Check if progress is approved and calculable
    let hasApprovedProgress = !!prog;
    let achievementPercent: number | null = null;
    let status: TrafficLightStatus = 'NO_DATA';
    let classification: 'ACHIEVED' | 'NOT_ACHIEVED' | 'NOT_REPORTED' = 'NOT_REPORTED';

    if (prog) {
      if (typeof prog.achievementPercent === 'number' && !isNaN(prog.achievementPercent)) {
        achievementPercent = prog.achievementPercent;
      } else {
        const calc = calculateAchievementAndTrafficLight(ind, cumulativeTarget, actualVal, systemConfig);
        achievementPercent = calc.achievementPercent;
      }

      status = prog.status || 'NO_DATA';

      // Classification rule:
      // Achieved: >= 100% or ON_TRACK
      // Not Achieved: < 100% (WATCH, RISK, CRITICAL)
      // Not Reported: NO_DATA or uncalculable
      if (achievementPercent !== null && achievementPercent >= 100 || status === 'ON_TRACK') {
        classification = 'ACHIEVED';
        status = 'ON_TRACK';
      } else if (achievementPercent !== null && achievementPercent < 100 && status !== 'NO_DATA') {
        classification = 'NOT_ACHIEVED';
      } else {
        classification = 'NOT_REPORTED';
        status = 'NO_DATA';
      }
    } else {
      classification = 'NOT_REPORTED';
      status = 'NO_DATA';
    }

    return {
      indicatorId: ind.indicatorId,
      code: ind.code,
      name: ind.name,
      description: ind.description || ind.operationalDef,
      type: ind.type,
      strategyId: ind.strategyId,
      strategyName: ind.strategyName,
      departmentId: ind.departmentId || ind.responsibleDepartmentId || 'DEP-001',
      departmentName: ind.departmentName || ind.responsibleDepartmentName || 'ส่วนกลาง',
      responsibleDepartmentId: ind.responsibleDepartmentId,
      responsibleDepartmentName: ind.responsibleDepartmentName,
      unit: ind.unit || '',
      targetValue: cumulativeTarget,
      actualValue: actualVal,
      achievementPercent,
      status,
      classification,
      periodMonthName: prog?.monthNameTh || periodInfo.label,
      hasApprovedProgress,
      lastModified: prog?.lastModified || prog?.loggedDate,
      progressRecord: prog,
    };
  });

  // 5. Aggregate by Strategy
  const strategyItems: StrategyPerformanceItem[] = strategyList.map((strat) => {
    const stratIndicators = indicatorMetrics.filter((m) => m.strategyId === strat.id);
    const total = stratIndicators.length;
    const indicatorIds = stratIndicators.map((i) => i.indicatorId);

    const stratCode = strat.code || '';
    const stratName = strat.name || '';
    const displayTitle = formatStrategyTitle(stratCode, stratName);

    if (total === 0) {
      const overall = computeStrategyOverallStatus(0, 0, 0);
      return {
        strategyId: strat.id,
        strategyCode: stratCode,
        strategyName: stratName,
        displayTitle,
        totalIndicators: 0,
        achievedCount: 0,
        achievedPercent: 0,
        notAchievedCount: 0,
        notAchievedPercent: 0,
        notReportedCount: 0,
        notReportedPercent: 0,
        overallStatus: overall.status,
        overallStatusLabel: overall.label,
        overallStatusBadgeClass: overall.badgeClass,
        overallStatusColor: overall.color,
        hasIndicators: false,
        emptyReasonText: 'ยังไม่มีตัวชี้วัดที่เผยแพร่ในยุทธศาสตร์นี้',
        indicatorIds: [],
      };
    }

    const achievedCount = stratIndicators.filter((m) => m.classification === 'ACHIEVED').length;
    const notAchievedCount = stratIndicators.filter((m) => m.classification === 'NOT_ACHIEVED').length;
    const notReportedCount = stratIndicators.filter((m) => m.classification === 'NOT_REPORTED').length;
    const evaluatedCount = achievedCount + notAchievedCount;

    const { aPct, uPct, rPct } = distributePercentages(
      achievedCount,
      notAchievedCount,
      notReportedCount,
      total
    );

    const overall = computeStrategyOverallStatus(aPct, total, evaluatedCount);

    // Find newest lastModified among indicators in strategy
    let lastUpdatedDate: string | undefined = undefined;
    const validDates = stratIndicators
      .map((i) => i.lastModified)
      .filter((d): d is string => !!d);
    if (validDates.length > 0) {
      validDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      lastUpdatedDate = validDates[0];
    }

    return {
      strategyId: strat.id,
      strategyCode: stratCode,
      strategyName: stratName,
      displayTitle,
      totalIndicators: total,
      achievedCount,
      achievedPercent: aPct,
      notAchievedCount,
      notAchievedPercent: uPct,
      notReportedCount,
      notReportedPercent: rPct,
      overallStatus: overall.status,
      overallStatusLabel: overall.label,
      overallStatusBadgeClass: overall.badgeClass,
      overallStatusColor: overall.color,
      hasIndicators: true,
      lastUpdatedDate,
      indicatorIds,
    };
  });

  // 6. Overall Totals
  const totalIndicators = indicatorMetrics.length;
  const totalAchieved = indicatorMetrics.filter((m) => m.classification === 'ACHIEVED').length;
  const totalNotAchieved = indicatorMetrics.filter((m) => m.classification === 'NOT_ACHIEVED').length;
  const totalNotReported = indicatorMetrics.filter((m) => m.classification === 'NOT_REPORTED').length;
  const evaluatedCount = totalAchieved + totalNotAchieved;

  const { aPct: overallAPct, uPct: overallUPct, rPct: overallRPct } = distributePercentages(
    totalAchieved,
    totalNotAchieved,
    totalNotReported,
    totalIndicators
  );

  const kpiCount = indicatorMetrics.filter((m) => m.type === 'KPI').length;
  const kviCount = indicatorMetrics.filter((m) => m.type === 'KVI').length;

  // 7. Trend Data across 6 periods (Q1, Q2, Q3, Q4, 9M, ANNUAL)
  const trendData = STANDARD_REPORTING_PERIODS.map((period) => {
    // Approved progress for this specific period
    const approvedInPeriod = getDeduplicatedProgress(
      allProgressList.filter((p) => p.verificationStatus === 'APPROVED'),
      fiscalYear,
      period.key
    );

    const hasAnyApprovedData = approvedInPeriod.length > 0;
    const progressMap = new Map<string, MonthlyProgress>();
    for (const prog of approvedInPeriod) {
      progressMap.set(prog.indicatorId, prog);
    }

    const strategiesObj: Record<
      string,
      {
        achievedPercent: number | null;
        achievedCount: number;
        notAchievedCount: number;
        notReportedCount: number;
        totalIndicators: number;
        hasData: boolean;
      }
    > = {};

    for (const strat of strategyList) {
      const stratIndicators = activePublicIndicators.filter((i) => i.strategyId === strat.id);
      const total = stratIndicators.length;

      if (total === 0) {
        strategiesObj[strat.id] = {
          achievedPercent: null,
          achievedCount: 0,
          notAchievedCount: 0,
          notReportedCount: 0,
          totalIndicators: 0,
          hasData: false,
        };
        continue;
      }

      let achCount = 0;
      let notAchCount = 0;
      let unrepCount = 0;
      let hasRecordInStrat = false;

      for (const ind of stratIndicators) {
        const prog = progressMap.get(ind.indicatorId);
        if (prog) {
          hasRecordInStrat = true;
          const ach = typeof prog.achievementPercent === 'number' ? prog.achievementPercent : 0;
          if (ach >= 100 || prog.status === 'ON_TRACK') {
            achCount++;
          } else {
            notAchCount++;
          }
        } else {
          unrepCount++;
        }
      }

      // If no approved records exist in this period for this strategy, return null (do NOT return 0!)
      if (!hasRecordInStrat) {
        strategiesObj[strat.id] = {
          achievedPercent: null,
          achievedCount: 0,
          notAchievedCount: 0,
          notReportedCount: total,
          totalIndicators: total,
          hasData: false,
        };
      } else {
        const pct = Math.round((achCount / total) * 1000) / 10;
        strategiesObj[strat.id] = {
          achievedPercent: pct,
          achievedCount: achCount,
          notAchievedCount: notAchCount,
          notReportedCount: unrepCount,
          totalIndicators: total,
          hasData: true,
        };
      }
    }

    return {
      periodKey: period.key,
      periodCode: period.code,
      periodLabel: period.label,
      periodShortLabel: period.shortLabel,
      hasAnyApprovedData,
      strategies: strategiesObj,
    };
  });

  return {
    fiscalYear,
    reportingPeriod: normPeriod,
    reportingPeriodInfo: periodInfo,
    indicatorType,
    departmentId,
    strategies: strategyItems,
    overallTotals: {
      totalIndicators,
      achievedCount: totalAchieved,
      achievedPercent: overallAPct,
      notAchievedCount: totalNotAchieved,
      notAchievedPercent: overallUPct,
      notReportedCount: totalNotReported,
      notReportedPercent: overallRPct,
      kpiCount,
      kviCount,
      evaluatedCount,
    },
    indicatorDetails: indicatorMetrics,
    trendData,
  };
}

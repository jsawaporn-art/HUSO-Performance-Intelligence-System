import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileEdit,
  Save,
  Send,
  Upload,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  Link2,
  HelpCircle,
  Lock,
  ShieldAlert,
  RotateCcw,
  Check,
  Info,
  Calendar,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  History,
  Unlock,
  Eye,
  CheckSquare,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  Indicator,
  MonthlyProgress,
  Target,
  User,
  SystemConfig,
  TrafficLightStatus,
  VerificationStatus,
} from '../types';
import { INITIAL_CONFIG } from '../mockData';
import {
  STANDARD_REPORTING_PERIODS,
  ReportingPeriodInfo,
  getReportingPeriodInfo,
  normalizeReportingPeriod,
  generateResultKey,
  calculateAchievementAndTrafficLight,
  getPeriodStatusBadgeInfo,
  calculateCumulativeFromPeriods,
  PeriodWorkflowStatus,
} from '../lib/reportingPeriodUtils';

interface MonthlyProgressLoggerProps {
  indicators: Indicator[];
  targets?: Target[];
  monthlyProgressList: MonthlyProgress[];
  evidenceList?: any[];
  systemConfig?: SystemConfig;
  selectedYear: string;
  currentUser: User;
  onSaveProgress: (progress: Partial<MonthlyProgress>) => void;
  onUnlockProgress?: (progressId: string, reason: string) => void;
  onUploadEvidence?: (evidence: any) => void;
  onCreateEvidence?: (evidence: any) => void;
}

export const MonthlyProgressLogger: React.FC<MonthlyProgressLoggerProps> = ({
  indicators,
  targets = [],
  monthlyProgressList,
  evidenceList = [],
  systemConfig = INITIAL_CONFIG,
  selectedYear,
  currentUser,
  onSaveProgress,
  onUnlockProgress,
  onUploadEvidence,
  onCreateEvidence,
}) => {
  const activeIndicators = useMemo(
    () => indicators.filter((i) => i.status !== 'DELETED'),
    [indicators]
  );

  const [selectedIndId, setSelectedIndId] = useState<string>(
    activeIndicators[0]?.indicatorId || ''
  );
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Q2');

  const activeInd = useMemo(
    () => activeIndicators.find((i) => i.indicatorId === selectedIndId),
    [activeIndicators, selectedIndId]
  );

  const activeTarget = useMemo(
    () => targets.find((t) => t.indicatorId === selectedIndId && t.fiscalYear === selectedYear),
    [targets, selectedIndId, selectedYear]
  );

  const normPeriod = normalizeReportingPeriod(selectedPeriod);
  const periodInfo: ReportingPeriodInfo = useMemo(
    () => getReportingPeriodInfo(normPeriod),
    [normPeriod]
  );

  // All progress records for the active indicator in this fiscal year
  const indAllProgress = useMemo(() => {
    return monthlyProgressList.filter(
      (p) => p.indicatorId === selectedIndId && p.fiscalYear === selectedYear
    );
  }, [monthlyProgressList, selectedIndId, selectedYear]);

  // Existing progress for the selected period
  const existingProgress = useMemo(() => {
    return indAllProgress.find((p) => {
      const pPeriod = normalizeReportingPeriod(p.reportingPeriod as string, p.month);
      return pPeriod === normPeriod;
    });
  }, [indAllProgress, normPeriod]);

  // Target for Cumulative & Isolated Period
  const cumulativeTargetValue = useMemo(() => {
    if (!activeInd) return 0;
    if (activeTarget) {
      if (normPeriod === 'Q1') return activeTarget.q1Target || activeTarget.monthlyTargets[2] || activeInd.baseline || 10;
      if (normPeriod === 'Q2') return activeTarget.q2Target || activeTarget.cumulativeTargets?.[5] || activeTarget.monthlyTargets[5] || activeInd.baseline || 20;
      if (normPeriod === 'Q3') return activeTarget.q3Target || activeTarget.cumulativeTargets?.[8] || activeTarget.monthlyTargets[8] || activeInd.baseline || 30;
      if (normPeriod === 'Q4' || normPeriod === 'ANNUAL') return activeTarget.annualTarget || activeTarget.q4Target || activeInd.baseline || 40;
      if (normPeriod === 'NINE_MONTH') return activeTarget.q3Target || activeTarget.cumulativeTargets?.[8] || activeInd.baseline || 30;
    }
    return activeInd.baseline > 0 ? activeInd.baseline : 10;
  }, [activeInd, activeTarget, normPeriod]);

  const periodTargetValue = useMemo(() => {
    if (!activeInd) return 0;
    if (activeTarget) {
      if (normPeriod === 'Q1') return activeTarget.q1Target || activeTarget.monthlyTargets[2] || (cumulativeTargetValue / 4);
      if (normPeriod === 'Q2') return activeTarget.q2Target || activeTarget.monthlyTargets[5] || (cumulativeTargetValue / 4);
      if (normPeriod === 'Q3') return activeTarget.q3Target || activeTarget.monthlyTargets[8] || (cumulativeTargetValue / 4);
      if (normPeriod === 'Q4') return activeTarget.q4Target || activeTarget.monthlyTargets[11] || (cumulativeTargetValue / 4);
      if (normPeriod === 'NINE_MONTH') return activeTarget.q3Target || (cumulativeTargetValue * 0.75);
      if (normPeriod === 'ANNUAL') return activeTarget.annualTarget || cumulativeTargetValue;
    }
    return cumulativeTargetValue;
  }, [activeInd, activeTarget, normPeriod, cumulativeTargetValue]);

  // Form Fields State
  const [actualMonthly, setActualMonthly] = useState<number>(0);
  const [actualCumulative, setActualCumulative] = useState<number>(0);
  const [isManualCumulative, setIsManualCumulative] = useState<boolean>(false);
  const [summary, setSummary] = useState<string>('');
  const [problems, setProblems] = useState<string>('');
  const [cause, setCause] = useState<string>('');
  const [solution, setSolution] = useState<string>('');
  const [fastTrackMeasure, setFastTrackMeasure] = useState<string>('');

  // Evidence Inputs
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [driveUrl, setDriveUrl] = useState('');

  // Collapsible Previous Periods Reference
  const [isPreviousPeriodsOpen, setIsPreviousPeriodsOpen] = useState(false);

  // Auto-Save Status
  const [autoSaveStatus, setAutoSaveStatus] = useState<'IDLE' | 'SAVING' | 'SAVED' | 'ERROR'>('IDLE');
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<Date | null>(null);

  // Unsaved Changes Guard
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [pendingPeriodSwitch, setPendingPeriodSwitch] = useState<string | null>(null);
  const [pendingIndicatorSwitch, setPendingIndicatorSwitch] = useState<string | null>(null);
  const [isGuardModalOpen, setIsGuardModalOpen] = useState<boolean>(false);

  // Admin Unlock Modal
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState<boolean>(false);
  const [unlockReason, setUnlockReason] = useState<string>('');

  // Track initial snapshot to detect unsaved changes
  const initialSnapshotRef = useRef<string>('');

  // Load Form Data when indicator or period changes
  useEffect(() => {
    if (!selectedIndId) return;

    if (existingProgress) {
      setActualMonthly(existingProgress.actualMonthly ?? 0);
      setActualCumulative(existingProgress.actualCumulative ?? existingProgress.actualMonthly ?? 0);
      setSummary(existingProgress.summary || '');
      setProblems(existingProgress.problems || '');
      setCause(existingProgress.cause || '');
      setSolution(existingProgress.solution || '');
      setFastTrackMeasure(existingProgress.fastTrackMeasure || '');
      setIsManualCumulative(existingProgress.aggregationMethod === 'MANUAL_CUMULATIVE');
      if (existingProgress.lastModified) {
        setLastSavedTimestamp(new Date(existingProgress.lastModified));
      }
    } else {
      // Clean slate for new period
      setActualMonthly(0);
      // Compute automatic initial cumulative from previous periods
      const agg = activeInd?.aggregationMethod || 'SUM';
      const autoCumul = calculateCumulativeFromPeriods(normPeriod, 0, indAllProgress, agg, activeInd?.unit);
      setActualCumulative(autoCumul.cumulativeActual);
      setSummary('');
      setProblems('');
      setCause('');
      setSolution('');
      setFastTrackMeasure('');
      setIsManualCumulative(false);
      setLastSavedTimestamp(null);
    }

    setEvidenceTitle('');
    setDriveUrl('');
    setAutoSaveStatus('IDLE');
    setHasUnsavedChanges(false);

    // Save snapshot of initial state
    const snap = JSON.stringify({
      actualMonthly: existingProgress?.actualMonthly ?? 0,
      actualCumulative: existingProgress?.actualCumulative ?? 0,
      summary: existingProgress?.summary || '',
      problems: existingProgress?.problems || '',
      cause: existingProgress?.cause || '',
      solution: existingProgress?.solution || '',
      fastTrackMeasure: existingProgress?.fastTrackMeasure || '',
    });
    initialSnapshotRef.current = snap;
  }, [selectedIndId, normPeriod, selectedYear, existingProgress, activeInd, indAllProgress]);

  // Check for unsaved changes against snapshot
  useEffect(() => {
    if (!initialSnapshotRef.current) return;
    const currentSnap = JSON.stringify({
      actualMonthly,
      actualCumulative,
      summary,
      problems,
      cause,
      solution,
      fastTrackMeasure,
    });
    setHasUnsavedChanges(currentSnap !== initialSnapshotRef.current);
  }, [actualMonthly, actualCumulative, summary, problems, cause, solution, fastTrackMeasure]);

  // Recalculate automatic cumulative actual when period actual changes
  const handlePeriodActualChange = (val: number) => {
    setActualMonthly(val);
    if (!isManualCumulative) {
      const agg = activeInd?.aggregationMethod || 'SUM';
      const autoCumul = calculateCumulativeFromPeriods(normPeriod, val, indAllProgress, agg, activeInd?.unit);
      setActualCumulative(autoCumul.cumulativeActual);
    }
  };

  // Perform Calculation for Achievement % and Traffic Light Status
  const calculationResult = useMemo(() => {
    return calculateAchievementAndTrafficLight(
      activeInd,
      cumulativeTargetValue,
      actualCumulative,
      systemConfig
    );
  }, [activeInd, cumulativeTargetValue, actualCumulative, systemConfig]);

  // Status computation for all 6 periods for the current indicator
  const periodStatuses: Record<string, { badge: ReturnType<typeof getPeriodStatusBadgeInfo>; progress?: MonthlyProgress }> = useMemo(() => {
    const map: Record<string, { badge: ReturnType<typeof getPeriodStatusBadgeInfo>; progress?: MonthlyProgress }> = {};
    for (const p of STANDARD_REPORTING_PERIODS) {
      const found = indAllProgress.find((item) => {
        const itemPeriod = normalizeReportingPeriod(item.reportingPeriod as string, item.month);
        return itemPeriod === p.key;
      });
      const badge = getPeriodStatusBadgeInfo(found?.verificationStatus);
      map[p.key] = { badge, progress: found };
    }
    return map;
  }, [indAllProgress]);

  // Completion Count (X out of 6)
  const completedPeriodsCount = useMemo(() => {
    return Object.values(periodStatuses).filter(
      (p) => (p as { badge: ReturnType<typeof getPeriodStatusBadgeInfo> }).badge.status !== 'NOT_STARTED'
    ).length;
  }, [periodStatuses]);

  // Is Current Record Locked?
  const currentVerificationStatus: VerificationStatus = existingProgress?.verificationStatus || 'DRAFT';
  const isApproved = currentVerificationStatus === 'APPROVED';
  const isVerified = currentVerificationStatus === 'VERIFIED';
  const isSubmitted = currentVerificationStatus === 'SUBMITTED';

  // Helper to check user roles from single role or combined rolesDisplay
  const hasRole = (roleToCheck: string) => {
    if (currentUser.role === roleToCheck) return true;
    if (currentUser.rolesDisplay && currentUser.rolesDisplay.includes(roleToCheck)) return true;
    return false;
  };

  const isUserAdminOrReviewer =
    hasRole('ADMIN') ||
    hasRole('EXECUTIVE') ||
    hasRole('REVIEWER') ||
    currentUser.role === 'ADMIN' ||
    currentUser.role === 'EXECUTIVE' ||
    currentUser.role === 'REVIEWER';

  // Permission check: Who can enter/edit progress reports in KPI/KVI
  // - OWNER and REVIEWER are granted primary permissions to report and record KPI/KVI performance
  // - ADMIN and EXECUTIVE have universal oversight and editing rights
  // - DATA_SUPPORT can enter and submit supporting data
  // - Only pure VIEWER / PUBLIC_VIEWER accounts without edit roles are restricted to read-only
  const isUserAllowedToEdit = useMemo(() => {
    // 1. ADMIN, EXECUTIVE, and REVIEWER have full permission across all KPI/KVI indicators
    if (
      currentUser.role === 'ADMIN' ||
      currentUser.role === 'EXECUTIVE' ||
      currentUser.role === 'REVIEWER' ||
      hasRole('ADMIN') ||
      hasRole('EXECUTIVE') ||
      hasRole('REVIEWER')
    ) {
      return true;
    }

    // 2. OWNER and DATA_SUPPORT have direct permission to enter and record KPI/KVI progress
    if (
      currentUser.role === 'OWNER' ||
      currentUser.role === 'DATA_SUPPORT' ||
      hasRole('OWNER') ||
      hasRole('DATA_SUPPORT')
    ) {
      return true;
    }

    // 3. Block read-only viewer accounts if they don't hold any editing role
    if (
      (currentUser.role === 'VIEWER' || currentUser.role === 'PUBLIC_VIEWER') &&
      !(hasRole('OWNER') || hasRole('REVIEWER') || hasRole('ADMIN') || hasRole('EXECUTIVE') || hasRole('DATA_SUPPORT'))
    ) {
      return false;
    }

    if (!activeInd) return false;
    if (activeInd.responsibleDepartmentId && activeInd.responsibleDepartmentId === currentUser.departmentId) return true;
    if (activeInd.departmentId === currentUser.departmentId) return true;
    if (activeInd.primaryOwnerId === currentUser.userId) return true;
    if (activeInd.dataSupporterIds && activeInd.dataSupporterIds.includes(currentUser.userId)) return true;
    if (activeInd.ownerMain && activeInd.ownerMain.includes(currentUser.fullName)) return true;
    if (activeInd.ownerCo && activeInd.ownerCo.includes(currentUser.fullName)) return true;
    return false;
  }, [currentUser, activeInd]);

  // Locked state logic:
  // - If APPROVED: locked for everyone unless Admin/Reviewer clicks "เปิดรอบเพื่อแก้ไข"
  // - If VERIFIED / SUBMITTED: locked for non-admins/reviewers
  const isFormLocked = isApproved || (!isUserAdminOrReviewer && (isVerified || isSubmitted)) || !isUserAllowedToEdit;

  // Auto-Save Draft to Firestore (debounced 35 seconds if form is dirty and not locked)
  useEffect(() => {
    if (isFormLocked || !hasUnsavedChanges || !activeInd) return;

    const timer = setTimeout(() => {
      setAutoSaveStatus('SAVING');
      const targetMonthEquivalent = periodInfo.targetMonthIndex + 1;
      const resultKey = generateResultKey(selectedYear, activeInd.indicatorId, normPeriod);

      onSaveProgress({
        fiscalYear: selectedYear,
        month: targetMonthEquivalent,
        monthNameTh: periodInfo.label,
        quarter: (normPeriod.startsWith('Q') ? normPeriod : 'Q4') as 'Q1' | 'Q2' | 'Q3' | 'Q4',
        reportingPeriod: normPeriod,
        resultKey,
        indicatorId: activeInd.indicatorId,
        indicatorCode: activeInd.code,
        indicatorName: activeInd.name,
        indicatorType: activeInd.type,
        targetMonthly: periodTargetValue,
        targetCumulative: cumulativeTargetValue,
        actualMonthly,
        actualCumulative,
        achievementPercent: calculationResult.achievementPercent ?? 0,
        status: calculationResult.status,
        variance: calculationResult.variance,
        varianceText: calculationResult.varianceText,
        summary,
        problems,
        cause,
        solution,
        fastTrackMeasure,
        verificationStatus: existingProgress?.verificationStatus === 'REVISION' ? 'REVISION' : 'DRAFT',
        ownerName: currentUser.fullName,
        loggerName: currentUser.fullName,
        loggedDate: existingProgress?.loggedDate || new Date().toISOString(),
        version: existingProgress?.version || 1,
        aggregationMethod: isManualCumulative ? 'MANUAL_CUMULATIVE' : (activeInd.aggregationMethod || 'SUM'),
      });

      setAutoSaveStatus('SAVED');
      setLastSavedTimestamp(new Date());
      setHasUnsavedChanges(false);
      initialSnapshotRef.current = JSON.stringify({
        actualMonthly,
        actualCumulative,
        summary,
        problems,
        cause,
        solution,
        fastTrackMeasure,
      });
    }, 35000);

    return () => clearTimeout(timer);
  }, [
    isFormLocked,
    hasUnsavedChanges,
    actualMonthly,
    actualCumulative,
    summary,
    problems,
    cause,
    solution,
    fastTrackMeasure,
    activeInd,
    periodInfo,
    selectedYear,
    normPeriod,
    periodTargetValue,
    cumulativeTargetValue,
    calculationResult,
    currentUser,
    existingProgress,
    isManualCumulative,
    onSaveProgress,
  ]);

  // Save / Submit Action
  const handleSave = (targetStatus: 'DRAFT' | 'SUBMITTED') => {
    if (!activeInd) return;
    if (!isUserAllowedToEdit) {
      alert(
        `คุณไม่มีสิทธิ์บันทึกผลตัวชี้วัดของหน่วยงาน ${activeInd.departmentName || activeInd.responsibleDepartmentName} (สิทธิ์ปัจจุบัน: ${currentUser.role} / ${currentUser.departmentName})`
      );
      return;
    }

    if (isFormLocked && !isUserAdminOrReviewer) {
      alert('ข้อมูลรอบนี้ถูกส่งหรือรับรองแล้ว ไม่สามารถแก้ไขได้โดยตรง กรุณาประสานงานผู้ดูแลระบบหรือผู้ตรวจสอบ');
      return;
    }

    // Required fields check on SUBMIT
    if (targetStatus === 'SUBMITTED') {
      if (actualMonthly === undefined || isNaN(actualMonthly)) {
        alert('กรุณากรอกผลสำเร็จในรอบที่เลือก (Period Actual)');
        return;
      }
      if (calculationResult.status === 'CRITICAL' || calculationResult.status === 'RISK') {
        if (!problems.trim()) {
          alert('เนื่องจากสถานะผลงานอยู่ในเกณฑ์เตือน/วิกฤต กรุณาระบุปัญหาและอุปสรรคเพื่อเสนอต่อผู้บริหาร');
          return;
        }
      }
    }

    setAutoSaveStatus('SAVING');
    const targetMonthEquivalent = periodInfo.targetMonthIndex + 1;
    const resultKey = generateResultKey(selectedYear, activeInd.indicatorId, normPeriod);

    onSaveProgress({
      fiscalYear: selectedYear,
      month: targetMonthEquivalent,
      monthNameTh: periodInfo.label,
      quarter: (normPeriod.startsWith('Q') ? normPeriod : 'Q4') as 'Q1' | 'Q2' | 'Q3' | 'Q4',
      reportingPeriod: normPeriod,
      resultKey,
      indicatorId: activeInd.indicatorId,
      indicatorCode: activeInd.code,
      indicatorName: activeInd.name,
      indicatorType: activeInd.type,
      targetMonthly: periodTargetValue,
      targetCumulative: cumulativeTargetValue,
      actualMonthly,
      actualCumulative,
      achievementPercent: calculationResult.achievementPercent ?? 0,
      status: calculationResult.status,
      variance: calculationResult.variance,
      varianceText: calculationResult.varianceText,
      summary,
      problems,
      cause,
      solution,
      fastTrackMeasure,
      verificationStatus: targetStatus,
      ownerName: currentUser.fullName,
      loggerName: currentUser.fullName,
      loggedDate: existingProgress?.loggedDate || new Date().toISOString(),
      version: existingProgress?.version || 1,
      aggregationMethod: isManualCumulative ? 'MANUAL_CUMULATIVE' : (activeInd.aggregationMethod || 'SUM'),
    });

    if (evidenceTitle && driveUrl && onCreateEvidence) {
      onCreateEvidence({
        indicatorId: activeInd.indicatorId,
        progressId: existingProgress?.progressId || `PRG-${resultKey}`,
        title: evidenceTitle,
        driveUrl,
        ownerName: currentUser.fullName,
      });
      setEvidenceTitle('');
      setDriveUrl('');
    }

    setAutoSaveStatus('SAVED');
    setLastSavedTimestamp(new Date());
    setHasUnsavedChanges(false);
    initialSnapshotRef.current = JSON.stringify({
      actualMonthly,
      actualCumulative,
      summary,
      problems,
      cause,
      solution,
      fastTrackMeasure,
    });
  };

  // Safe Period Switch with Unsaved Guard
  const handleRequestPeriodSwitch = (targetPeriod: string) => {
    if (targetPeriod === normPeriod) return;
    if (hasUnsavedChanges) {
      setPendingPeriodSwitch(targetPeriod);
      setIsGuardModalOpen(true);
    } else {
      setSelectedPeriod(targetPeriod);
    }
  };

  // Safe Indicator Switch with Unsaved Guard
  const handleRequestIndicatorSwitch = (indId: string) => {
    if (indId === selectedIndId) return;
    if (hasUnsavedChanges) {
      setPendingIndicatorSwitch(indId);
      setIsGuardModalOpen(true);
    } else {
      setSelectedIndId(indId);
    }
  };

  // Guard Actions
  const handleGuardSaveDraftAndSwitch = () => {
    handleSave('DRAFT');
    setIsGuardModalOpen(false);
    if (pendingPeriodSwitch) {
      setSelectedPeriod(pendingPeriodSwitch);
      setPendingPeriodSwitch(null);
    }
    if (pendingIndicatorSwitch) {
      setSelectedIndId(pendingIndicatorSwitch);
      setPendingIndicatorSwitch(null);
    }
  };

  const handleGuardDiscardAndSwitch = () => {
    setIsGuardModalOpen(false);
    setHasUnsavedChanges(false);
    if (pendingPeriodSwitch) {
      setSelectedPeriod(pendingPeriodSwitch);
      setPendingPeriodSwitch(null);
    }
    if (pendingIndicatorSwitch) {
      setSelectedIndId(pendingIndicatorSwitch);
      setPendingIndicatorSwitch(null);
    }
  };

  const handleGuardCancel = () => {
    setIsGuardModalOpen(false);
    setPendingPeriodSwitch(null);
    setPendingIndicatorSwitch(null);
  };

  // Unlock Action
  const handleConfirmUnlock = () => {
    if (!unlockReason.trim()) {
      alert('กรุณาระบุเหตุผลในการขอเปิดรอบเพื่อแก้ไขข้อมูล');
      return;
    }
    if (existingProgress && onUnlockProgress) {
      onUnlockProgress(existingProgress.progressId, unlockReason.trim());
      setIsUnlockModalOpen(false);
      setUnlockReason('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Unsaved Changes Guard Modal */}
      {isGuardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-3 text-amber-600">
              <span className="p-2 bg-amber-100 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </span>
              <div>
                <h4 className="text-base font-bold text-slate-900">แจ้งเตือนข้อมูลที่ยังไม่ได้บันทึก</h4>
                <p className="text-xs text-slate-500">Unsaved Changes Protection</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 p-3 rounded-xl border border-slate-200">
              มีข้อมูลผลการดำเนินงานที่ถูกแก้ไขและยังไม่ได้บันทึกลงระบบ ต้องการบันทึกเป็นฉบับร่างก่อนเปลี่ยนรอบรายงานหรือไม่?
            </p>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleGuardSaveDraftAndSwitch}
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>1. บันทึกฉบับร่างและเปลี่ยนรอบ (Save Draft & Switch)</span>
              </button>

              <button
                type="button"
                onClick={handleGuardDiscardAndSwitch}
                className="w-full py-2 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl border border-rose-200 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>2. ไม่บันทึกและเปลี่ยนรอบ (Discard & Switch)</span>
              </button>

              <button
                type="button"
                onClick={handleGuardCancel}
                className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                3. ยกเลิก (Cancel)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Unlock Modal */}
      {isUnlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-sky-700">
              <span className="p-2 bg-sky-100 rounded-xl">
                <Unlock className="w-6 h-6" />
              </span>
              <div>
                <h4 className="text-base font-bold text-slate-900">เปิดรอบเพื่อแก้ไขข้อมูล (Unlock Period)</h4>
                <p className="text-xs text-slate-500">สำหรับผู้ดูแลระบบและผู้รับรอง (Admin / Reviewer)</p>
              </div>
            </div>

            <div className="bg-sky-50 border border-sky-200 p-3 rounded-xl text-xs text-sky-950 space-y-1">
              <div className="font-bold">
                ตัวชี้วัด: [{activeInd?.code}] {activeInd?.name}
              </div>
              <div>
                รอบรายงาน: <strong>{periodInfo.label}</strong> | เวอร์ชันปัจจุบัน: <strong>v{existingProgress?.version || 1}</strong>
              </div>
              <p className="text-[11px] text-sky-800 mt-1">
                การเปิดรอบจะปรับสถานะเป็น <strong>ฉบับร่าง (DRAFT)</strong> และเพิ่มเวอร์ชันเป็น <strong>v{(existingProgress?.version || 1) + 1}</strong> พร้อมบันทึกประวัติการแก้ไขลง Activity Log
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                เหตุผลและความจำเป็นในการขอแก้ไขข้อมูล <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="ระบุเหตุผล เช่น ได้รับตัวเลขผลงานเพิ่มเติมจากงานการเงิน, ปรับปรุงเอกสารหลักฐาน..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none"
              ></textarea>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsUnlockModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmUnlock}
                className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow transition cursor-pointer flex items-center gap-1.5"
              >
                <Unlock className="w-4 h-4" />
                <span>ยืนยันเปิดรอบแก้ไข</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-300">
              <FileEdit className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              บันทึกผลการดำเนินงาน (Performance Result Entry)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            บันทึกผลสัมฤทธิ์ตาม 6 รอบมาตรฐาน (Q1–Q4, 9M, 1 ปี), วิเคราะห์ปัญหาอุปสรรค, เสนอมาตรการเร่งรัด และจัดเก็บถาวรใน Cloud Firestore
          </p>
        </div>

        {/* Action Header Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Locked Badge or Unlock Button */}
          {isApproved && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-2 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>รับรองผลแล้ว (Approved v{existingProgress?.version || 1})</span>
              </span>

              {isUserAdminOrReviewer && onUnlockProgress && (
                <button
                  type="button"
                  onClick={() => setIsUnlockModalOpen(true)}
                  className="flex items-center space-x-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 transition shadow-sm cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>เปิดรอบเพื่อแก้ไข</span>
                </button>
              )}
            </div>
          )}

          {!isApproved && isVerified && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-800 bg-purple-50 border border-purple-300 px-3 py-2 rounded-xl">
              <CheckSquare className="w-4 h-4 text-purple-600" />
              <span>ผ่านการตรวจสอบแล้ว (Verified)</span>
            </span>
          )}

          {!isApproved && isSubmitted && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-800 bg-sky-50 border border-sky-300 px-3 py-2 rounded-xl">
              <Clock className="w-4 h-4 text-sky-600" />
              <span>ส่งตรวจแล้ว (รอ Reviewer ตรวจสอบ)</span>
            </span>
          )}

          {/* Save Draft Button */}
          <button
            type="button"
            onClick={() => handleSave('DRAFT')}
            disabled={isFormLocked && !isUserAdminOrReviewer}
            className={`flex items-center space-x-1.5 text-xs font-bold px-4 py-2.5 rounded-xl border transition ${
              !isFormLocked || isUserAdminOrReviewer
                ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 shadow-sm cursor-pointer'
                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
            }`}
          >
            <Save className="w-4 h-4 text-amber-700" />
            <span>บันทึกฉบับร่าง (Save Draft)</span>
          </button>

          {/* Submit Button */}
          <button
            type="button"
            onClick={() => handleSave('SUBMITTED')}
            disabled={isFormLocked && !isUserAdminOrReviewer}
            className={`flex items-center space-x-1.5 text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition ${
              !isFormLocked || isUserAdminOrReviewer
                ? 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
                : 'bg-slate-300 text-slate-500 shadow-none cursor-not-allowed opacity-60'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>ส่งข้อมูลเพื่อตรวจสอบ</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Reporting Periods & Indicator List */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
          {/* Standard 6 Reporting Periods Selection Box */}
          <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-700" />
                เลือกรอบการรายงานผล:
              </span>
              <span className="text-[10px] font-bold text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded-full">
                ปีงบฯ {selectedYear}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
              {STANDARD_REPORTING_PERIODS.map((period) => {
                const isSelected = normPeriod === period.key;
                const statusData = periodStatuses[period.key];
                const badge = statusData?.badge || getPeriodStatusBadgeInfo('NOT_STARTED');

                return (
                  <button
                    key={period.key}
                    type="button"
                    onClick={() => handleRequestPeriodSwitch(period.key)}
                    className={`py-2 px-2 rounded-xl text-left border transition flex flex-col justify-between min-h-[58px] cursor-pointer ${
                      isSelected
                        ? 'bg-amber-600 text-white border-amber-700 shadow-md ring-2 ring-amber-400/40'
                        : 'bg-white text-slate-800 border-slate-200 hover:bg-amber-100/50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-extrabold text-xs">{period.shortLabel}</span>
                      <span className="text-xs leading-none" title={badge.label}>
                        {badge.iconSymbol}
                      </span>
                    </div>

                    <div className="flex items-center justify-between w-full mt-1">
                      <span
                        className={`text-[9px] font-medium truncate ${
                          isSelected ? 'text-amber-100' : 'text-slate-500'
                        }`}
                      >
                        {badge.badgeText}
                      </span>
                      <span
                        className={`text-[8px] opacity-75 font-mono ${
                          isSelected ? 'text-white' : 'text-slate-400'
                        }`}
                      >
                        {period.startDate.replace('-', '/')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Fiscal Year Completion Progress Summary */}
            <div className="pt-1.5 border-t border-amber-200/80">
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-950 mb-1">
                <span>ความก้าวหน้ารายรอบของตัวชี้วัดนี้:</span>
                <span className="text-amber-800 font-extrabold">{completedPeriodsCount} จาก 6 รอบ</span>
              </div>
              <div className="w-full bg-amber-200/60 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(completedPeriodsCount / 6) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Indicator Selection List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
              <span>รายการตัวชี้วัด ({activeIndicators.length})</span>
              <span className="text-[10px] text-slate-500 font-medium">รอบ {periodInfo.shortLabel}</span>
            </div>

            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {activeIndicators.map((ind) => {
                const isSelected = ind.indicatorId === selectedIndId;
                const prg = monthlyProgressList.find((p) => {
                  if (p.indicatorId !== ind.indicatorId || p.fiscalYear !== selectedYear) return false;
                  const pPeriod = normalizeReportingPeriod(p.reportingPeriod as string, p.month);
                  return pPeriod === normPeriod;
                });

                return (
                  <button
                    key={ind.indicatorId}
                    type="button"
                    onClick={() => handleRequestIndicatorSwitch(ind.indicatorId)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold shadow-sm ring-1 ring-amber-300'
                        : 'bg-slate-50/80 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-amber-800 font-extrabold">{ind.code}</span>
                      {prg ? (
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                              prg.verificationStatus === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : prg.verificationStatus === 'VERIFIED'
                                ? 'bg-purple-100 text-purple-800 border-purple-300'
                                : prg.verificationStatus === 'SUBMITTED'
                                ? 'bg-sky-100 text-sky-800 border-sky-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}
                          >
                            {prg.verificationStatus === 'APPROVED'
                              ? 'รับรองแล้ว'
                              : prg.verificationStatus === 'VERIFIED'
                              ? 'ผ่านตรวจ'
                              : prg.verificationStatus === 'SUBMITTED'
                              ? 'รอตรวจ'
                              : 'ร่าง'}
                          </span>

                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                              prg.status === 'ON_TRACK'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : prg.status === 'WATCH'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : prg.status === 'RISK'
                                ? 'bg-orange-100 text-orange-800 border-orange-300'
                                : prg.status === 'CRITICAL'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : 'bg-slate-100 text-slate-600 border-slate-300'
                            }`}
                          >
                            {prg.achievementPercent !== undefined ? `${prg.achievementPercent}%` : '-'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">ยังไม่บันทึก</span>
                      )}
                    </div>
                    <div className="line-clamp-2 leading-snug font-medium text-slate-800">{ind.name}</div>
                    <div className="mt-1 text-[10px] text-slate-500 font-normal truncate">
                      {ind.departmentName || ind.responsibleDepartmentName}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Entry Form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm lg:col-span-2 space-y-5">
          {activeInd ? (
            <div className="space-y-5">
              {/* Persistence & Save Status Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs">
                <div className="flex items-center space-x-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    {autoSaveStatus === 'SAVING' ? (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    ) : null}
                    <span
                      className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                        autoSaveStatus === 'SAVING'
                          ? 'bg-amber-500'
                          : autoSaveStatus === 'SAVED' || lastSavedTimestamp
                          ? 'bg-emerald-500'
                          : 'bg-slate-400'
                      }`}
                    ></span>
                  </span>

                  <span className="font-semibold text-slate-800">
                    {autoSaveStatus === 'SAVING' ? (
                      <span className="text-amber-800 font-bold">⏳ กำลังบันทึกฉบับร่างลง Firestore...</span>
                    ) : lastSavedTimestamp ? (
                      <span className="text-slate-700">
                        ☁️ บันทึกลง Cloud Firestore ล่าสุด: <strong>{lastSavedTimestamp.toLocaleTimeString('th-TH')}</strong>
                        {hasUnsavedChanges && (
                          <span className="ml-2 text-amber-700 font-bold">• มีการแก้ไขใหม่ที่ยังไม่ได้กดบันทึก</span>
                        )}
                      </span>
                    ) : (
                      <span>พร้อมบันทึกผลงานรอบ {periodInfo.shortLabel}</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isUserAllowedToEdit && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      สิทธิ์รายงานผล: {currentUser.role}
                    </span>
                  )}

                  {existingProgress?.version && existingProgress.version > 1 && (
                    <span className="text-[10px] font-bold text-sky-900 bg-sky-100 px-2 py-0.5 rounded-full border border-sky-200">
                      เวอร์ชัน {existingProgress.version}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsPreviousPeriodsOpen(!isPreviousPeriodsOpen)}
                    className="flex items-center space-x-1 text-[11px] font-bold text-amber-800 bg-amber-100/70 hover:bg-amber-200/70 px-2.5 py-1 rounded-lg border border-amber-300 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{isPreviousPeriodsOpen ? 'ซ่อนผลรอบก่อนหน้า' : 'ดูผลรอบก่อนหน้า'}</span>
                    {isPreviousPeriodsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Collapsible Reference Box: Previous Periods */}
              {isPreviousPeriodsOpen && (
                <div className="bg-amber-50/50 border border-amber-200 p-4 rounded-xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                    <span className="flex items-center gap-1.5">
                      <History className="w-4 h-4 text-amber-700" />
                      ประวัติผลการดำเนินงานรอบก่อนหน้าของตัวชี้วัดนี้ ({selectedYear})
                    </span>
                    <span className="text-[10px] text-amber-800 font-normal">โหมดอ่านอ้างอิง (Read-only)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    {STANDARD_REPORTING_PERIODS.filter((p) => p.key !== normPeriod).map((p) => {
                      const prg = indAllProgress.find((item) => {
                        const itemPeriod = normalizeReportingPeriod(item.reportingPeriod as string, item.month);
                        return itemPeriod === p.key;
                      });

                      return (
                        <div key={p.key} className="bg-white p-3 rounded-lg border border-amber-200 shadow-2xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{p.shortLabel}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                prg?.status === 'ON_TRACK'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : prg?.status === 'WATCH'
                                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                                  : prg?.status === 'RISK'
                                  ? 'bg-orange-100 text-orange-800 border-orange-300'
                                  : prg?.status === 'CRITICAL'
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}
                            >
                              {prg ? `${prg.achievementPercent}%` : 'ไม่มีข้อมูล'}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-600">
                            ผลเฉพาะรอบ: <strong>{prg?.actualMonthly ?? '-'}</strong> | ผลสะสม: <strong>{prg?.actualCumulative ?? '-'}</strong> {activeInd.unit}
                          </div>

                          {prg?.summary && (
                            <p className="text-[10px] text-slate-500 line-clamp-2 italic bg-slate-50 p-1 rounded">
                              "{prg.summary}"
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Indicator Header Info */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-amber-900 font-mono bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                      {activeInd.code}
                    </span>
                    <span className="text-xs font-bold text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded">
                      ประเภท: {activeInd.type}
                    </span>
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      ทิศทาง: {activeInd.direction}
                    </span>
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      วิธีคำนวณสะสม: {activeInd.aggregationMethod || 'SUM (ผลรวมสะสม)'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 font-medium bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    เป้าหมายสะสมรอบ {periodInfo.shortLabel}:{' '}
                    <strong className="text-amber-800 font-extrabold text-sm">{cumulativeTargetValue}</strong> {activeInd.unit}
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">{activeInd.name}</h3>

                <div className="text-xs text-slate-500 flex flex-wrap gap-x-4">
                  <span>
                    หน่วยงานรับผิดชอบ: <strong className="text-slate-700">{activeInd.departmentName || activeInd.responsibleDepartmentName}</strong>
                  </span>
                  <span>
                    ผู้รับผิดชอบหลัก: <strong className="text-slate-700">{activeInd.primaryOwnerName || activeInd.ownerMain}</strong>
                  </span>
                  {existingProgress?.unlockedBy && (
                    <span className="text-sky-700 font-medium">
                      (ปลดล็อกโดย {existingProgress.unlockedBy}: {existingProgress.unlockReason})
                    </span>
                  )}
                </div>
              </div>

              {/* 4 Standard Performance Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                {/* Field 1: Period Actual */}
                <div className="space-y-1 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <label className="text-xs font-bold text-slate-800 leading-tight">
                        ผลสำเร็จในรอบที่เลือก (Period Actual) <span className="text-rose-600">*</span>
                      </label>
                      <span
                        title="ผลการดำเนินงานที่เกิดขึ้นเฉพาะในรอบการรายงานที่กำลังเลือก (เช่น หากเลือก Q2 ให้กรอกเฉพาะผลงานที่เกิดขึ้นใน Q2)"
                        className="text-amber-600 hover:text-amber-800 cursor-help"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-2">
                      ผลการดำเนินงานเฉพาะในรอบ {periodInfo.shortLabel}
                    </p>
                  </div>

                  <div className="mt-2">
                    <input
                      type="number"
                      step="0.1"
                      disabled={isFormLocked && !isUserAdminOrReviewer}
                      required
                      value={actualMonthly}
                      onChange={(e) => handlePeriodActualChange(Number(e.target.value))}
                      placeholder="0.0"
                      className="w-full bg-slate-50 border border-slate-300 text-amber-950 text-base font-black rounded-lg p-2 focus:bg-white focus:border-amber-500 focus:outline-none text-center shadow-inner disabled:bg-slate-100 disabled:text-slate-500"
                    />
                    <div className="text-center text-[10px] text-slate-400 mt-1">หน่วย: {activeInd.unit}</div>
                  </div>
                </div>

                {/* Field 2: Cumulative Actual */}
                <div className="space-y-1 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <label className="text-xs font-bold text-slate-800 leading-tight">
                        ผลสำเร็จสะสม (Cumulative Actual) <span className="text-rose-600">*</span>
                      </label>
                      <span
                        title="ผลการดำเนินงานสะสมตั้งแต่เริ่มปีงบประมาณจนถึงสิ้นสุดรอบที่เลือก (เช่น หากเลือก Q2 ให้รวมผลสำเร็จตั้งแต่ Q1 ถึง Q2)"
                        className="text-amber-600 hover:text-amber-800 cursor-help"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-2">
                      ผลสะสมตั้งแต่ต้นปีงบฯ ถึงสิ้นสุด {periodInfo.shortLabel}
                    </p>
                  </div>

                  <div className="mt-2">
                    <input
                      type="number"
                      step="0.1"
                      disabled={isFormLocked && !isUserAdminOrReviewer}
                      required
                      value={actualCumulative}
                      onChange={(e) => {
                        setIsManualCumulative(true);
                        setActualCumulative(Number(e.target.value));
                      }}
                      placeholder="0.0"
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-base font-black rounded-lg p-2 focus:bg-white focus:border-amber-500 focus:outline-none text-center shadow-inner disabled:bg-slate-100 disabled:text-slate-500"
                    />
                    <div className="text-center text-[10px] text-slate-400 mt-1">
                      {isManualCumulative ? '✏️ กำหนดค่าสะสมเอง' : '⚡ คำนวณสะสมอัตโนมัติ'}
                    </div>
                  </div>
                </div>

                {/* Field 3: Achievement Percentage (Read-only) */}
                <div className="space-y-1 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <label className="text-xs font-bold text-slate-800 leading-tight">
                        ร้อยละความสำเร็จ (Achievement %)
                      </label>
                      <span
                        title="ร้อยละของผลสำเร็จสะสมเมื่อเปรียบเทียบกับค่าเป้าหมายสะสมของรอบที่เลือก&#10;สูตร: (Cumulative Actual ÷ Cumulative Target) × 100"
                        className="text-amber-600 hover:text-amber-800 cursor-help"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-2">
                      (ผลสะสม ÷ เป้าหมายสะสม) × 100
                    </p>
                  </div>

                  <div className="mt-2">
                    <div className="text-base font-black text-amber-900 p-2 text-center bg-amber-50 rounded-lg border border-amber-200 shadow-2xs min-h-[40px] flex items-center justify-center">
                      {calculationResult.achievementDisplay}
                    </div>
                    <div className="text-center text-[10px] text-slate-400 mt-1">คำนวณอัตโนมัติ (Read-only)</div>
                  </div>
                </div>

                {/* Field 4: Traffic Light Status (Read-only) */}
                <div className="space-y-1 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <label className="text-xs font-bold text-slate-800 leading-tight">
                        สถานะ Traffic Light
                      </label>
                      <span
                        title="สถานะความก้าวหน้าเมื่อเปรียบเทียบร้อยละความสำเร็จกับเกณฑ์ของระบบ&#10;🟢 On Track (>= 100%)&#10;🟡 Watch (80% - <100%)&#10;🟠 Risk (60% - <80%)&#10;🔴 Critical (< 60%)"
                        className="text-amber-600 hover:text-amber-800 cursor-help"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-2">
                      สถานะเกณฑ์ 4 ระดับ
                    </p>
                  </div>

                  <div className="mt-2">
                    <div
                      className={`text-xs font-black p-2 text-center rounded-lg border shadow-2xs min-h-[40px] flex items-center justify-center ${calculationResult.statusColorClass}`}
                    >
                      {calculationResult.status === 'ON_TRACK' && '🟢 On Track'}
                      {calculationResult.status === 'WATCH' && '🟡 Watch'}
                      {calculationResult.status === 'RISK' && '🟠 Risk'}
                      {calculationResult.status === 'CRITICAL' && '🔴 Critical'}
                      {calculationResult.status === 'NO_DATA' && '⚪ ยังไม่ประเมิน'}
                    </div>
                    <div className="text-center text-[10px] text-slate-400 mt-1">{calculationResult.statusLabel}</div>
                  </div>
                </div>
              </div>

              {/* Summary Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  สรุปผลการดำเนินงานในรอบที่เลือก ({periodInfo.label})
                </label>
                <textarea
                  rows={2}
                  disabled={isFormLocked && !isUserAdminOrReviewer}
                  placeholder={`รายละเอียดการดำเนินงาน กิจกรรม โครงการ หรือผลสัมฤทธิ์เฉพาะในรอบ ${periodInfo.label}...`}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:bg-white focus:border-amber-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                ></textarea>
              </div>

              {/* Root Cause & Fast Track Analysis */}
              <div className="space-y-3 bg-amber-50/50 p-4 rounded-xl border border-amber-200">
                <div className="flex items-center space-x-2 text-xs font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>การวิเคราะห์ปัญหา อุปสรรค และมาตรการเร่งรัด (Root Cause & Fast Track)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">ปัญหาและอุปสรรค</label>
                    <textarea
                      rows={2}
                      disabled={isFormLocked && !isUserAdminOrReviewer}
                      placeholder="ระบุปัญหาที่พบในการดำเนินงานในรอบนี้..."
                      value={problems}
                      onChange={(e) => setProblems(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">สาเหตุที่แท้จริง (Cause)</label>
                    <textarea
                      rows={2}
                      disabled={isFormLocked && !isUserAdminOrReviewer}
                      placeholder="สาเหตุหลักที่ทำให้ไม่เป็นไปตามเป้าหมาย..."
                      value={cause}
                      onChange={(e) => setCause(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                    ></textarea>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">แนวทางแก้ไข (Solution)</label>
                    <textarea
                      rows={2}
                      disabled={isFormLocked && !isUserAdminOrReviewer}
                      placeholder="แนวทางการแก้ไขของหน่วยงาน..."
                      value={solution}
                      onChange={(e) => setSolution(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-amber-900 mb-1 font-semibold">
                      มาตรการเร่งรัดเสนอผู้บริหาร (Fast-Track Measure)
                    </label>
                    <textarea
                      rows={2}
                      disabled={isFormLocked && !isUserAdminOrReviewer}
                      placeholder="ข้อเสนอมาตรการเร่งรัดที่ต้องการให้ผู้บริหารสนับสนุน..."
                      value={fastTrackMeasure}
                      onChange={(e) => setFastTrackMeasure(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                    ></textarea>
                  </div>
                </div>
              </div>

              {/* Evidence Upload Section */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center space-x-2 text-xs font-bold text-sky-800">
                  <FileCheck className="w-4 h-4 text-sky-600" />
                  <span>แนบไฟล์หลักฐานประกอบ / ลิงก์ Google Drive</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">ชื่อเอกสารหลักฐาน</label>
                    <input
                      type="text"
                      disabled={isFormLocked && !isUserAdminOrReviewer}
                      placeholder={`เช่น รายงานผลงาน_${activeInd.code}_${periodInfo.shortLabel}.pdf`}
                      value={evidenceTitle}
                      onChange={(e) => setEvidenceTitle(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">ลิงก์ Google Drive / URL เอกสาร</label>
                    <input
                      type="url"
                      disabled={isFormLocked && !isUserAdminOrReviewer}
                      placeholder="https://drive.google.com/file/d/..."
                      value={driveUrl}
                      onChange={(e) => setDriveUrl(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs font-medium">
              กรุณาเลือกตัวชี้วัดทางซ้ายมือ
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

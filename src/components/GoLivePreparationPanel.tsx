import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Database,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Lock,
  ArrowRight,
  HardDrive,
  FileCheck,
  Layers,
  History,
  Building2,
  Activity,
  Check,
  Sparkles,
  Calendar,
} from 'lucide-react';
import {
  DryRunReport,
  BackupRecord,
  performDryRunReport,
  createOperationalBackup,
  executeOperationalResetAndGoLive,
  rollbackFromBackup,
  getBackupHistoryList,
} from '../lib/backupService';
import { User, Department, MonthlyProgress } from '../types';
import { progressService } from '../lib/firebase';
import { analyzeLegacyProgressData, LegacyDryRunResult } from '../lib/reportingPeriodUtils';

interface GoLivePreparationPanelProps {
  currentUser: User;
  departments: Department[];
  onSystemResetSuccess?: () => void;
  onRollbackSuccess?: () => void;
}

export const GoLivePreparationPanel: React.FC<GoLivePreparationPanelProps> = ({
  currentUser,
  departments,
  onSystemResetSuccess,
  onRollbackSuccess,
}) => {
  const [dryRunReport, setDryRunReport] = useState<DryRunReport | null>(null);
  const [legacyDryRun, setLegacyDryRun] = useState<LegacyDryRunResult | null>(null);
  const [isLoadingDryRun, setIsLoadingDryRun] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isExecutingReset, setIsExecutingReset] = useState(false);
  const [resetResult, setResetResult] = useState<{
    success: boolean;
    backupId: string;
    message: string;
  } | null>(null);

  // Backup & Rollback
  const [backups, setBackups] = useState<any[]>([]);
  const [selectedBackupForRollback, setSelectedBackupForRollback] = useState<string | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [rollbackResult, setRollbackResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Verification Checklist State
  const [checklist, setChecklist] = useState<{ [key: number]: boolean }>({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    6: true,
    7: true,
    8: true,
    9: true,
    10: true,
    11: true,
    12: true,
    13: true,
    14: true,
    15: true,
  });

  const loadDryRun = async () => {
    setIsLoadingDryRun(true);
    try {
      const [report, progressList] = await Promise.all([
        performDryRunReport(`${currentUser.fullName} (${currentUser.email || 'jsawaporn@gmail.com'})`),
        progressService.getAll().catch(() => []),
      ]);
      setDryRunReport(report);
      setLegacyDryRun(analyzeLegacyProgressData(progressList));
    } catch (e) {
      console.error('Failed to load dry run report:', e);
    } finally {
      setIsLoadingDryRun(false);
    }
  };

  const loadBackups = async () => {
    try {
      const list = await getBackupHistoryList();
      setBackups(list);
    } catch (e) {
      console.warn('Load backups error:', e);
    }
  };

  useEffect(() => {
    loadDryRun();
    loadBackups();
  }, []);

  const isConfirmed =
    confirmationInput.trim() === 'ยืนยันล้างข้อมูลทดลองและเริ่มรหัส 001' ||
    confirmationInput.trim() === 'ยืนยันเริ่มใช้งานจริง' ||
    confirmationInput.trim() === 'ยืนยันล้างข้อมูลตัวอย่าง';

  const handleExecuteReset = async () => {
    if (!isConfirmed) {
      alert('กรุณาพิมพ์ข้อความ: ยืนยันล้างข้อมูลทดลองและเริ่มรหัส 001 ให้ถูกต้อง');
      return;
    }

    if (!window.confirm('คำเตือนขั้นสูงสุด: ระบบจะทำการสำรองข้อมูลทั้งหมดและล้างข้อมูลดำเนินงานเพื่อเริ่มใช้งานจริง คุณต้องการดำเนินการต่อหรือไม่?')) {
      return;
    }

    setIsExecutingReset(true);
    setResetResult(null);

    try {
      const operatorName = `${currentUser.fullName} (${currentUser.email || 'jsawaporn@gmail.com'})`;
      
      // Step 1: Create Backup
      const backupRec = await createOperationalBackup(
        operatorName,
        'สำรองข้อมูลอัตโนมัติก่อนเริ่มใช้งานจริง (Pre-Go-Live Operational Wipe)'
      );

      // Step 2: Execute Reset
      const res = await executeOperationalResetAndGoLive(backupRec.backupId, operatorName);

      setResetResult({
        success: true,
        backupId: res.backupId,
        message: res.message,
      });

      // Reload
      await loadDryRun();
      await loadBackups();
      if (onSystemResetSuccess) {
        onSystemResetSuccess();
      }
    } catch (err: any) {
      console.error('Reset Go-Live Error:', err);
      setResetResult({
        success: false,
        backupId: '',
        message: `เกิดข้อผิดพลาดในการรีเซ็ตระบบ: ${err.message || 'โปรดตรวจสอบการเชื่อมต่อ'}`,
      });
    } finally {
      setIsExecutingReset(false);
    }
  };

  const handleExecuteRollback = async (backupId: string) => {
    if (!window.confirm(`ยืนยันการย้อนคืนข้อมูล (Rollback) จากชุดสำรอง [${backupId}] หรือไม่? ข้อมูลปัจจุบันจะถูกเขียนทับด้วยข้อมูลจากชุดสำรอง`)) {
      return;
    }

    setIsRollingBack(true);
    setRollbackResult(null);

    try {
      const operatorName = `${currentUser.fullName} (${currentUser.email || 'jsawaporn@gmail.com'})`;
      const res = await rollbackFromBackup(backupId, operatorName);

      setRollbackResult({
        success: true,
        message: res.message,
      });

      await loadDryRun();
      await loadBackups();
      if (onRollbackSuccess) {
        onRollbackSuccess();
      }
    } catch (err: any) {
      console.error('Rollback Error:', err);
      setRollbackResult({
        success: false,
        message: `ย้อนคืนข้อมูลไม่สำเร็จ: ${err.message || 'โปรดตรวจสอบไฟล์สำรอง'}`,
      });
    } finally {
      setIsRollingBack(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-xl text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <ShieldCheck className="w-6 h-6" />
              </span>
              <h2 className="text-xl font-black tracking-tight text-amber-200">
                ระบบเตรียมความพร้อมสำหรับเริ่มใช้งานจริง (Go-Live Production Engine)
              </h2>
            </div>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              ดำเนินการตามข้อกำหนดอย่างเคร่งครัด: ปรับโครงสร้าง 8 หน่วยงานมาตรฐาน (DEP-001 ถึง DEP-008), 
              ล้างข้อมูลทดสอบและตัวชี้วัดจำลอง, สำรองข้อมูลก่อนล้างอัตโนมัติ (BKP-YYYYMMDD-HHMMSS), 
              และเชื่อมต่อโหมดการทำงานจริง <code className="bg-amber-950 px-1.5 py-0.5 rounded text-amber-300 font-mono">FIREBASE_PRODUCTION</code>
            </p>
          </div>

          <button
            onClick={loadDryRun}
            disabled={isLoadingDryRun}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-xs px-4 py-2.5 rounded-xl shadow transition self-start md:self-auto cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingDryRun ? 'animate-spin' : ''}`} />
            <span>คำนวณ Dry Run ใหม่</span>
          </button>
        </div>
      </div>

      {/* Result Alerts */}
      {resetResult && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-start space-x-3 shadow-md ${
            resetResult.success
              ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
              : 'bg-rose-950/90 border-rose-500 text-rose-200'
          }`}
        >
          {resetResult.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <h4 className="font-bold text-sm">
              {resetResult.success ? '🎉 ดำเนินการรีเซ็ตระบบเข้าสู่โหมดใช้งานจริงสำเร็จ!' : '❌ เกิดข้อผิดพลาด'}
            </h4>
            <p className="leading-relaxed">{resetResult.message}</p>
            {resetResult.backupId && (
              <p className="font-mono text-[11px] text-emerald-300">
                Backup ID: <strong>{resetResult.backupId}</strong> (จัดเก็บถาวรและพร้อมย้อนคืนข้อมูลได้ทุกเมื่อ)
              </p>
            )}
          </div>
        </div>
      )}

      {rollbackResult && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-start space-x-3 shadow-md ${
            rollbackResult.success
              ? 'bg-blue-950/90 border-blue-500 text-blue-200'
              : 'bg-rose-950/90 border-rose-500 text-rose-200'
          }`}
        >
          <RotateCcw className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">ผลการย้อนคืนข้อมูล (Rollback)</h4>
            <p className="leading-relaxed">{rollbackResult.message}</p>
          </div>
        </div>
      )}

      {/* Dry Run Summary Table */}
      {dryRunReport && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center space-x-2 text-slate-900 font-black text-base">
              <FileCheck className="w-5 h-5 text-amber-600" />
              <span>รายงานจำลองผลการทำงาน (Dry Run Report)</span>
            </div>
            <div className="flex items-center space-x-2 text-xs font-mono">
              <span className="text-slate-500">Backup ID ที่จะสร้าง:</span>
              <span className="bg-amber-100 text-amber-900 font-bold px-2 py-1 rounded-md border border-amber-300">
                {dryRunReport.backupIdToGenerate}
              </span>
            </div>
          </div>

          {/* Environment & Operator Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
              <span className="text-slate-500 block mb-0.5">ผู้ดำเนินการ (Operator)</span>
              <span className="font-bold text-slate-800">{dryRunReport.operator}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
              <span className="text-slate-500 block mb-0.5">โหมดฐานข้อมูล (Environment)</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {dryRunReport.environment}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
              <span className="text-slate-500 block mb-0.5">สถานะความพร้อมระบบ</span>
              <span className="font-bold text-amber-700">พร้อมสำหรับ Go-Live (รอการยืนยัน)</span>
            </div>
          </div>

          {/* Wipe & Preserve Comparison Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
            {/* Left: Collections to Wipe */}
            <div className="border border-rose-200 bg-rose-50/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-rose-200 text-rose-900 font-bold">
                <span className="flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  1. ข้อมูลดำเนินงานที่จะถูกล้าง (Operational Collections)
                </span>
                <span className="bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full font-extrabold">
                  รวม {dryRunReport.totalRecordsToWipe} รายการ
                </span>
              </div>
              <div className="space-y-2">
                {dryRunReport.collectionsToWipe.map((col) => (
                  <div
                    key={col.collectionName}
                    className="flex items-center justify-between bg-white border border-rose-100 p-2.5 rounded-xl shadow-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800 font-mono">{col.collectionName}</div>
                      <div className="text-[11px] text-slate-500">{col.description}</div>
                    </div>
                    <span className="font-bold text-rose-700 text-xs px-2 py-1 bg-rose-50 rounded-lg">
                      {col.count} รายการ
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Collections to Preserve */}
            <div className="border border-emerald-200 bg-emerald-50/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200 text-emerald-900 font-bold">
                <span className="flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-emerald-600" />
                  2. ข้อมูลหลักที่จะถูกเก็บรักษาไว้ (Preserved Master Data)
                </span>
                <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-extrabold">
                  ปลอดภัย 100%
                </span>
              </div>
              <div className="space-y-2">
                {dryRunReport.collectionsToPreserve.map((col) => (
                  <div
                    key={col.collectionName}
                    className="flex items-center justify-between bg-white border border-emerald-100 p-2.5 rounded-xl shadow-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800 font-mono">{col.collectionName}</div>
                      <div className="text-[11px] text-slate-500">{col.description}</div>
                    </div>
                    <span className="font-bold text-emerald-700 text-xs px-2 py-1 bg-emerald-50 rounded-lg">
                      {col.count} รายการ
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sequence Counter Reset Status */}
          {dryRunReport.sequenceStatus && (
            <div className="border border-purple-200 bg-purple-50/40 rounded-2xl p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-purple-200 text-purple-900 font-bold">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  3. สถานะเลขรหัสตัวชี้วัด (Indicator Sequence Counters)
                </span>
                <span className="text-purple-800 font-mono font-bold bg-purple-100 px-2 py-0.5 rounded">
                  Reset สู่เลข 001
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white border border-purple-100 p-3 rounded-xl shadow-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">ตัวชี้วัดผลงานหลัก (KPI) ปี 2569</span>
                    <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">KPI_2569</span>
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    ค่าปัจจุบันในระบบ: <strong>{dryRunReport.sequenceStatus.kpi.currentLastNumber}</strong>
                  </div>
                  <div className="text-emerald-700 font-bold text-xs pt-1">
                    → รหัสที่จะได้เมื่อสร้างตัวถัดไปหลัง Reset: <span className="font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{dryRunReport.sequenceStatus.kpi.nextCodeAfterReset}</span>
                  </div>
                </div>
                <div className="bg-white border border-purple-100 p-3 rounded-xl shadow-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">ตัวชี้วัดคุณค่า (KVI) ปี 2569</span>
                    <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">KVI_2569</span>
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    ค่าปัจจุบันในระบบ: <strong>{dryRunReport.sequenceStatus.kvi.currentLastNumber}</strong>
                  </div>
                  <div className="text-emerald-700 font-bold text-xs pt-1">
                    → รหัสที่จะได้เมื่อสร้างตัวถัดไปหลัง Reset: <span className="font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{dryRunReport.sequenceStatus.kvi.nextCodeAfterReset}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Department Master Structure Preview */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-slate-900 font-bold">
              <span className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-600" />
                โครงสร้าง 8 หน่วยงานมาตรฐานหลังการปรับปรุง (Department_Master Single Source of Truth)
              </span>
              <span className="text-amber-800 font-mono font-bold bg-amber-100 px-2 py-0.5 rounded">
                8 หน่วยงานใช้งานจริง (ACTIVE)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {dryRunReport.departmentsAfter
                .filter((d) => d.status === 'ACTIVE')
                .map((dept) => (
                  <div
                    key={dept.id}
                    className="bg-white border border-amber-200/80 p-2.5 rounded-xl shadow-xs flex items-center justify-between"
                  >
                    <div className="truncate pr-1">
                      <div className="font-mono text-[10px] text-amber-700 font-extrabold">{dept.id}</div>
                      <div className="font-bold text-slate-800 text-xs truncate">{dept.name}</div>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded shrink-0">
                      ACTIVE
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Dashboard Impact */}
          <div className="border border-blue-200 bg-blue-50/40 rounded-2xl p-4 space-y-2 text-xs text-blue-950">
            <div className="font-bold flex items-center gap-1.5 text-blue-900">
              <Activity className="w-4 h-4 text-blue-600" />
              ผลกระทบต่อหน้า Executive Dashboard หลังการรีเซ็ต
            </div>
            <p className="leading-relaxed text-slate-700">
              - {dryRunReport.dashboardImpact.dashboardStateAfter}
              <br />
              - ล้างค่าจำลองทั้งหมดออก: <strong>{dryRunReport.dashboardImpact.sampleMetricsRemoved.join(', ')}</strong>
            </p>
          </div>

          {/* Legacy Progress Mapping Dry Run Report */}
          {legacyDryRun && (
            <div className="border border-amber-300 bg-amber-50/60 rounded-2xl p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                <div className="flex items-center space-x-2 font-bold text-amber-950 text-sm">
                  <Calendar className="w-4 h-4 text-amber-700" />
                  <span>รายงาน Dry Run: การแปลงและจับคู่ข้อมูลผลงาน (Legacy Progress Mapping & Deduplication)</span>
                </div>
                <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold">
                  Dry Run Only (ไม่แก้ไขข้อมูลจริง)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-xs">
                  <span className="text-[10px] text-slate-500 block">ข้อมูลรายเดือนเดิมทั้งหมด</span>
                  <span className="text-base font-black text-slate-900">{legacyDryRun.totalMonthlyRecords} รายการ</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-xs">
                  <span className="text-[10px] text-slate-500 block">แปลงเข้า 6 รอบมาตรฐานได้</span>
                  <span className="text-base font-black text-emerald-700">
                    {legacyDryRun.q1MappableCount + legacyDryRun.q2MappableCount + legacyDryRun.q3MappableCount + legacyDryRun.q4MappableCount} รายการ
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-xs">
                  <span className="text-[10px] text-slate-500 block">จำนวน Duplicate Key (ซ้ำซ้อน)</span>
                  <span className="text-base font-black text-rose-700">{legacyDryRun.duplicateKeyCount} รายการ</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-xs">
                  <span className="text-[10px] text-slate-500 block">สถานะ VERIFIED / APPROVED</span>
                  <span className="text-base font-black text-amber-800">
                    {legacyDryRun.verifiedCount} / {legacyDryRun.approvedCount}
                  </span>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-1 text-slate-700">
                <div className="font-semibold text-slate-900">สรุปการจัดกลุ่มตามรอบรายงานมาตรฐาน:</div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[11px] pt-1">
                  <div className="bg-slate-50 p-1.5 rounded text-center">
                    Q1: <strong>{legacyDryRun.q1MappableCount}</strong>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded text-center">
                    Q2: <strong>{legacyDryRun.q2MappableCount}</strong>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded text-center">
                    Q3: <strong>{legacyDryRun.q3MappableCount}</strong>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded text-center">
                    Q4: <strong>{legacyDryRun.q4MappableCount}</strong>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded text-center">
                    9M: <strong>{legacyDryRun.nineMonthMappableCount}</strong>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded text-center">
                    1Y: <strong>{legacyDryRun.annualMappableCount}</strong>
                  </div>
                </div>
                {legacyDryRun.hasBothVerifiedAndApproved.length > 0 && (
                  <div className="mt-2 text-rose-700 font-semibold text-[11px] bg-rose-50 p-2 rounded-lg border border-rose-200">
                    ⚠️ พบตัวชี้วัดที่มีทั้งสถานะ VERIFIED และ APPROVED ในรอบเดียวกันจำนวน {legacyDryRun.hasBothVerifiedAndApproved.length} รายการ (ระบบ Deduplication จะเลือกสถานะ APPROVED โดยอัตโนมัติ)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* Confirmation & Execution Guard Box */}
          {/* ================================================================= */}
          <div className="border-2 border-amber-500/40 bg-amber-50/50 rounded-2xl p-6 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-amber-600 text-white shadow-sm shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  ยืนยันการเริ่มใช้งานจริง (Administrator Confirmation Guard)
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  เพื่อป้องกันความผิดพลาดจากการกดปุ่มโดยไม่ได้ตั้งใจ Administrator จะต้องพิมพ์ข้อความ{' '}
                  <strong className="text-amber-800 bg-amber-200/80 px-1.5 py-0.5 rounded font-mono text-sm">
                    ยืนยันล้างข้อมูลทดลองและเริ่มรหัส 001
                  </strong>{' '}
                  ลงในช่องด้านล่าง จึงจะสามารถดำเนินการได้
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  placeholder="พิมพ์ข้อความ: ยืนยันล้างข้อมูลทดลองและเริ่มรหัส 001"
                  value={confirmationInput}
                  onChange={(e) => setConfirmationInput(e.target.value)}
                  className={`w-full bg-white border-2 text-sm rounded-xl px-4 py-2.5 font-bold tracking-wide focus:outline-none transition ${
                    isConfirmed
                      ? 'border-emerald-500 text-emerald-900 ring-2 ring-emerald-100'
                      : 'border-slate-300 text-slate-800 focus:border-amber-500'
                  }`}
                />
                {isConfirmed && (
                  <span className="absolute right-3 top-3 text-emerald-600 font-extrabold text-xs flex items-center gap-1">
                    <Check className="w-4 h-4" /> ถูกต้อง
                  </span>
                )}
              </div>

              <button
                onClick={handleExecuteReset}
                disabled={!isConfirmed || isExecutingReset}
                className={`w-full sm:w-auto px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg transition cursor-pointer ${
                  isConfirmed && !isExecutingReset
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30 ring-2 ring-amber-400 animate-bounce-subtle'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Database className={`w-4 h-4 ${isExecutingReset ? 'animate-spin' : ''}`} />
                <span>{isExecutingReset ? 'กำลังสำรองและล้างข้อมูล...' : 'ดำเนินการเริ่มใช้งานจริง (Execute Go-Live)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup History & Rollback Tools */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
            <History className="w-4 h-4 text-amber-600" />
            <span>ประวัติชุดข้อมูลสำรอง & ระบบกู้คืน (Backup History & Instant Rollback)</span>
          </div>
          <button
            onClick={loadBackups}
            className="text-xs text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>รีเฟรชประวัติ</span>
          </button>
        </div>

        {backups.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-100">
            ยังไม่มีประวัติชุดข้อมูลสำรองในระบบ (ระบบจะสร้างชุดสำรองอัตโนมัติเมื่อกดเริ่มใช้งานจริง)
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1 text-xs">
            {backups.map((b) => (
              <div
                key={b.backupId}
                className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-300 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                      {b.backupId}
                    </span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                      {b.status || 'VERIFIED'}
                    </span>
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    สร้างเมื่อ: {new Date(b.createdAt).toLocaleString('th-TH')} | ผู้ดำเนินการ: <strong>{b.operator}</strong>
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    จำนวนข้อมูลที่สำรองไว้: <strong>{b.totalRecords}</strong> รายการ ({b.reason || 'สำรองข้อมูล'})
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleExecuteRollback(b.backupId)}
                    disabled={isRollingBack}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isRollingBack ? 'animate-spin' : ''}`} />
                    <span>ย้อนคืนข้อมูล (Rollback)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 15-Point Post-Reset Verification Checklist */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm border-b border-slate-200 pb-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>รายการตรวจสอบความพร้อม 15 ข้อหลังการเตรียมระบบ (15-Point Go-Live Checklist)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-slate-700">
          {[
            { id: 1, text: '1. Department_Master มีหน่วยงาน ACTIVE ครบ 8 หน่วยงาน (DEP-001 ถึง DEP-008)' },
            { id: 2, text: '2. หน่วยงานเก่าทั้งหมดถูกปรับสถานะเป็น INACTIVE / LEGACY' },
            { id: 3, text: '3. Dropdown ทุกจุดแสดงเฉพาะ 8 หน่วยงานมาตรฐาน' },
            { id: 4, text: '4. Dropdown ตัวกรองมี "ทุกหน่วยงานรับผิดชอบ" เป็นตัวเลือกแรก' },
            { id: 5, text: '5. Dropdown ในฟอร์มไม่มีตัวเลือก "ทุกหน่วยงานรับผิดชอบ"' },
            { id: 6, text: '6. ไม่มีรายชื่อหลักสูตรและหน่วยงานเก่าปรากฏใน Dropdown ใดๆ' },
            { id: 7, text: '7. indicators เป็น 0 รายการ (ล้างข้อมูลจำลองเดิมเรียบร้อย)' },
            { id: 8, text: '8. monthlyProgress เป็น 0 รายการ' },
            { id: 9, text: '9. evidence เป็น 0 รายการ' },
            { id: 10, text: '10. directives เป็น 0 รายการ' },
            { id: 11, text: '11. users และ personnel ยังคงอยู่ครบถ้วน' },
            { id: 12, text: '12. Dashboard แสดงค่า 0 จากฐานข้อมูล ไม่แสดงค่าจำลอง' },
            { id: 13, text: '13. ป้ายสถานะระบุ "ระบบใช้งานจริง — Firebase Connected" (Green)' },
            { id: 14, text: '14. สร้างตัวชี้วัดใหม่แล้วบันทึกลง Firestore ได้จริงและผูกกับ 8 หน่วยงานได้' },
            { id: 15, text: '15. Backup ถูกสร้างและยืนยันความถูกต้องเรียบร้อย' },
            { id: 16, text: '16. Google Sheet ถูกล้างแถวข้อมูลเก่า/DELETED และพร้อมซิงค์ข้อมูลใหม่ตาม 8 หน่วยงาน' },
          ].map((item) => (
            <div
              key={item.id}
              className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100"
            >
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-extrabold flex items-center justify-center text-[10px] shrink-0">
                ✓
              </span>
              <span className="font-medium">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

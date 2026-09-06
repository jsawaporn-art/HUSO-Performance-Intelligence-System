import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Lock,
  ExternalLink,
  MessageSquare,
  FileCheck,
  Unlock,
  Eye,
  Calendar,
  Clock,
  UserCheck,
} from 'lucide-react';
import { MonthlyProgress, VerificationStatus, User, Indicator } from '../types';
import {
  STANDARD_REPORTING_PERIODS,
  getReportingPeriodInfo,
  normalizeReportingPeriod,
  getPeriodStatusBadgeInfo,
  getDeduplicatedProgress,
} from '../lib/reportingPeriodUtils';

interface VerificationWorkflowProps {
  indicators?: Indicator[];
  monthlyProgressList: MonthlyProgress[];
  evidenceList?: any[];
  currentUser: User;
  onVerifyProgress: (
    progressId: string,
    status: VerificationStatus,
    comment?: string
  ) => void;
  onUnlockProgress?: (progressId: string, reason: string) => void;
}

export const VerificationWorkflow: React.FC<VerificationWorkflowProps> = ({
  indicators = [],
  monthlyProgressList,
  evidenceList = [],
  currentUser,
  onVerifyProgress,
  onUnlockProgress,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('SUBMITTED');
  const [filterPeriod, setFilterPeriod] = useState<string>('ALL');
  const [selectedProgressId, setSelectedProgressId] = useState<string | null>(null);
  const [reviewerComment, setReviewerComment] = useState('');

  // Admin Unlock Modal State
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');

  // Deduplicate records to show the most up-to-date and highest-ranked verification state per resultKey
  const deduplicatedList = useMemo(() => {
    return getDeduplicatedProgress(monthlyProgressList);
  }, [monthlyProgressList]);

  const filteredItems = useMemo(() => {
    return deduplicatedList.filter((p) => {
      const matchStatus = filterStatus === 'ALL' || p.verificationStatus === filterStatus;
      const pPeriod = normalizeReportingPeriod(p.reportingPeriod as string, p.month);
      const matchPeriod = filterPeriod === 'ALL' || pPeriod === filterPeriod;
      return matchStatus && matchPeriod;
    });
  }, [deduplicatedList, filterStatus, filterPeriod]);

  const selectedItem = useMemo(() => {
    if (!selectedProgressId) return filteredItems[0] || null;
    return deduplicatedList.find((p) => p.progressId === selectedProgressId) || null;
  }, [selectedProgressId, filteredItems, deduplicatedList]);

  const canVerify =
    currentUser.role === 'REVIEWER' ||
    currentUser.role === 'EXECUTIVE' ||
    currentUser.role === 'ADMIN';

  const isUserAdminOrReviewer =
    currentUser.role === 'ADMIN' ||
    currentUser.role === 'EXECUTIVE' ||
    currentUser.role === 'REVIEWER';

  const handleAction = (status: VerificationStatus) => {
    if (!selectedItem) return;
    if (!canVerify) {
      alert(
        `เฉพาะผู้ใช้งานที่มีสิทธิ์ REVIEWER, EXECUTIVE หรือ ADMIN เท่านั้นที่มีสิทธิ์รับรองหรือส่งกลับแก้ไขข้อมูล (สิทธิ์ปัจจุบันของคุณ: ${currentUser.role})`
      );
      return;
    }

    onVerifyProgress(selectedItem.progressId, status, reviewerComment);
    setReviewerComment('');
    alert(`อัปเดตสถานะการรับรองเป็น "${status}" เรียบร้อยแล้ว`);
  };

  const handleConfirmUnlock = () => {
    if (!selectedItem) return;
    if (!unlockReason.trim()) {
      alert('กรุณาระบุเหตุผลในการขอเปิดรอบเพื่อแก้ไขข้อมูล');
      return;
    }
    if (onUnlockProgress) {
      onUnlockProgress(selectedItem.progressId, unlockReason.trim());
      setIsUnlockModalOpen(false);
      setUnlockReason('');
    }
  };

  const itemPeriodInfo = selectedItem
    ? getReportingPeriodInfo(normalizeReportingPeriod(selectedItem.reportingPeriod as string, selectedItem.month))
    : null;

  return (
    <div className="space-y-6">
      {/* Admin Unlock Modal */}
      {isUnlockModalOpen && selectedItem && (
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
                ตัวชี้วัด: [{selectedItem.indicatorCode}] {selectedItem.indicatorName}
              </div>
              <div>
                รอบรายงาน: <strong>{itemPeriodInfo?.label}</strong> | เวอร์ชันปัจจุบัน: <strong>v{selectedItem.version || 1}</strong>
              </div>
              <p className="text-[11px] text-sky-800 mt-1">
                การเปิดรอบจะเปลี่ยนสถานะเป็น <strong>ฉบับร่าง (DRAFT)</strong> และเพิ่มเวอร์ชันเป็น <strong>v{(selectedItem.version || 1) + 1}</strong> พร้อมบันทึกประวัติการแก้ไข
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
            <span className="p-1.5 rounded-lg bg-purple-100 text-purple-800 border border-purple-300">
              <CheckSquare className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              ระบบตรวจสอบและรับรองข้อมูล (Verification Workflow)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            กระบวนการตรวจสอบความถูกต้องของผลสัมฤทธิ์รายรอบ (Q1–Q4, 9M, ANNUAL) และรับรองผลโดย Reviewer / Executive
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Filter */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <span className="text-[10px] font-bold text-slate-500 px-1.5">รอบ:</span>
            {['ALL', 'Q1', 'Q2', 'Q3', 'Q4', 'NINE_MONTH', 'ANNUAL'].map((prd) => (
              <button
                key={prd}
                type="button"
                onClick={() => setFilterPeriod(prd)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filterPeriod === prd
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {prd === 'ALL' ? 'ทุกรอบ' : prd === 'NINE_MONTH' ? '9M' : prd}
              </button>
            ))}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            {['SUBMITTED', 'VERIFIED', 'APPROVED', 'REVISION', 'ALL'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  filterStatus === st
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'SUBMITTED'
                  ? 'รอตรวจ'
                  : st === 'VERIFIED'
                  ? 'ผ่านตรวจ'
                  : st === 'APPROVED'
                  ? 'รับรองแล้ว'
                  : st === 'REVISION'
                  ? 'ส่งกลับแก้ไข'
                  : 'ทั้งหมด'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Item List */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
            <span>รายการที่ต้องพิจารณา ({filteredItems.length})</span>
            <span className="text-[10px] text-slate-400 font-medium">แยกตามรอบรายงาน</span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                ไม่มีรายการในเงื่อนไขการกรองที่เลือก
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = selectedItem?.progressId === item.progressId;
                const pInfo = getReportingPeriodInfo(
                  normalizeReportingPeriod(item.reportingPeriod as string, item.month)
                );
                const badge = getPeriodStatusBadgeInfo(item.verificationStatus);

                return (
                  <button
                    key={item.progressId}
                    type="button"
                    onClick={() => {
                      setSelectedProgressId(item.progressId);
                      setReviewerComment(item.reviewerComment || '');
                    }}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold shadow-xs ring-1 ring-amber-300'
                        : 'bg-slate-50/80 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-amber-800 font-extrabold">{item.indicatorCode}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-extrabold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                          {pInfo.shortLabel}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${badge.colorClass}`}>
                          {badge.badgeText}
                        </span>
                      </div>
                    </div>

                    <div className="line-clamp-1 font-bold text-slate-800">{item.indicatorName}</div>

                    <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                      <span>ผลเฉพาะรอบ: <strong>{item.actualMonthly}</strong> | ผลสะสม: <strong>{item.actualCumulative}</strong></span>
                      <span className="font-bold text-slate-700">{item.achievementPercent}%</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Details & Decision Controls */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm lg:col-span-2 space-y-5">
          {selectedItem ? (
            <div className="space-y-5 text-xs">
              {/* Top Banner */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-amber-900 font-mono bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                      {selectedItem.indicatorCode}
                    </span>
                    <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                      รอบ: {itemPeriodInfo?.label}
                    </span>
                    <span className="text-xs font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                      เวอร์ชัน: v{selectedItem.version || 1}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500">
                    ผู้รายงาน: <strong className="text-slate-800">{selectedItem.loggerName || selectedItem.ownerName}</strong> (บันทึกเมื่อ {new Date(selectedItem.loggedDate).toLocaleDateString('th-TH')})
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">{selectedItem.indicatorName}</h3>

                {selectedItem.unlockedBy && (
                  <div className="text-[11px] text-sky-800 bg-sky-50 border border-sky-200 p-2 rounded-lg">
                    <strong>ประวัติการปลดล็อก:</strong> ปลดล็อกโดย {selectedItem.unlockedBy} ({selectedItem.unlockReason})
                  </div>
                )}
              </div>

              {/* Numerical Metrics Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[11px] font-semibold">เป้าหมายสะสมรอบ:</span>
                  <div className="text-sm font-extrabold text-slate-800 mt-1">
                    {selectedItem.targetCumulative ?? selectedItem.targetMonthly}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[11px] font-semibold">ผลสำเร็จเฉพาะรอบ ({itemPeriodInfo?.shortLabel}):</span>
                  <div className="text-sm font-extrabold text-amber-900 mt-1">
                    {selectedItem.actualMonthly}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[11px] font-semibold">ผลสำเร็จสะสม (Cumulative):</span>
                  <div className="text-sm font-extrabold text-slate-900 mt-1">
                    {selectedItem.actualCumulative ?? selectedItem.actualMonthly}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[11px] font-semibold">ร้อยละความสำเร็จ:</span>
                  <div className="text-sm font-extrabold text-emerald-800 mt-1">
                    {selectedItem.achievementPercent}%
                  </div>
                </div>
              </div>

              {/* Summary Description */}
              {selectedItem.summary && (
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                  <strong className="text-amber-900 font-bold">สรุปผลการดำเนินงานในรอบ:</strong>
                  <p className="text-slate-700 text-xs leading-relaxed">{selectedItem.summary}</p>
                </div>
              )}

              {/* Problems, Cause, Solutions */}
              {(selectedItem.problems || selectedItem.cause || selectedItem.solution || selectedItem.fastTrackMeasure) && (
                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 space-y-3">
                  <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    <span>การวิเคราะห์ปัญหาและมาตรการเร่งรัด</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {selectedItem.problems && (
                      <div className="bg-white p-2.5 rounded-lg border border-amber-200">
                        <strong className="text-rose-700 font-bold">ปัญหาและอุปสรรค:</strong>
                        <p className="text-slate-700 mt-1">{selectedItem.problems}</p>
                      </div>
                    )}

                    {selectedItem.cause && (
                      <div className="bg-white p-2.5 rounded-lg border border-amber-200">
                        <strong className="text-slate-800 font-bold">สาเหตุที่แท้จริง:</strong>
                        <p className="text-slate-700 mt-1">{selectedItem.cause}</p>
                      </div>
                    )}

                    {selectedItem.solution && (
                      <div className="bg-white p-2.5 rounded-lg border border-amber-200">
                        <strong className="text-slate-800 font-bold">แนวทางแก้ไข:</strong>
                        <p className="text-slate-700 mt-1">{selectedItem.solution}</p>
                      </div>
                    )}

                    {selectedItem.fastTrackMeasure && (
                      <div className="bg-white p-2.5 rounded-lg border border-amber-200">
                        <strong className="text-amber-900 font-bold">มาตรการเร่งรัดเสนอผู้บริหาร:</strong>
                        <p className="text-slate-700 mt-1">{selectedItem.fastTrackMeasure}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Reviewer Comment Input */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800">
                  ข้อคิดเห็น / ข้อเสนอแนะจากผู้ตรวจสอบ (Reviewer Comment)
                </label>
                <textarea
                  rows={3}
                  placeholder="ระบุข้อคิดเห็นหรือข้อเสนอแนะในการปรับปรุงข้อมูล..."
                  value={reviewerComment}
                  onChange={(e) => setReviewerComment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-3 focus:bg-white focus:border-amber-500 focus:outline-none text-xs"
                ></textarea>
              </div>

              {/* Permission note if cannot verify */}
              {!canVerify && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-900 text-xs flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    โหมดเรียกดูข้อมูล: สิทธิ์ปัจจุบันของคุณคือ <strong>{currentUser.role}</strong> ({currentUser.departmentName}) — เฉพาะผู้ตรวจสอบ (Reviewer/Executive/Admin) เท่านั้นที่สามารถเปลี่ยนสถานะอนุมัติได้
                  </span>
                </div>
              )}

              {/* Workflow Decision Buttons */}
              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                {/* Admin Unlock Button if APPROVED */}
                {selectedItem.verificationStatus === 'APPROVED' && isUserAdminOrReviewer && onUnlockProgress ? (
                  <button
                    type="button"
                    onClick={() => setIsUnlockModalOpen(true)}
                    className="flex items-center space-x-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 transition cursor-pointer"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>เปิดรอบเพื่อแก้ไข (Unlock Period)</span>
                  </button>
                ) : (
                  <div></div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAction('REVISION')}
                    disabled={!canVerify}
                    className={`flex items-center space-x-1.5 text-xs font-bold px-4 py-2.5 rounded-xl border transition ${
                      canVerify
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-300 cursor-pointer'
                        : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <RotateCcw className="w-4 h-4 text-rose-600" />
                    <span>ส่งกลับแก้ไข (Return)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAction('VERIFIED')}
                    disabled={!canVerify}
                    className={`flex items-center space-x-1.5 text-xs font-bold px-4 py-2.5 rounded-xl border transition ${
                      canVerify
                        ? 'bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-300 cursor-pointer'
                        : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <FileCheck className="w-4 h-4 text-purple-600" />
                    <span>ผ่านการตรวจ (Verified)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAction('APPROVED')}
                    disabled={!canVerify}
                    className={`flex items-center space-x-1.5 text-xs font-bold px-4 py-2.5 rounded-xl shadow transition ${
                      canVerify
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                        : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>รับรองผลการประเมิน (Approve)</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800">ระบบตรวจสอบและรับรองข้อมูลพร้อมใช้งาน</h4>
                <p className="text-slate-500 text-xs max-w-md mx-auto">
                  เลือกรายการทางซ้ายมือเพื่อตรวจสอบผลสัมฤทธิ์รายรอบ รายละเอียดการดำเนินงาน และอนุมัติรับรองผล
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

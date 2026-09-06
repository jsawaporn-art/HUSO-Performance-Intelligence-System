import React, { useState, useMemo } from 'react';
import {
  BridgeImprovement,
  BRIDGE_STEPS,
  BridgeStep,
} from '../../types/bridge';
import { User } from '../../types';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileEdit,
  ChevronRight,
  Send,
  Sparkles,
  Calendar,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

interface BridgeMyTasksProps {
  improvements: BridgeImprovement[];
  currentUser: User | null;
  onSelectImprovement: (item: BridgeImprovement) => void;
  onOpenReportModal: (item: BridgeImprovement) => void;
  onOpenEditModal: (item: BridgeImprovement) => void;
}

export const BridgeMyTasks: React.FC<BridgeMyTasksProps> = ({
  improvements,
  currentUser,
  onSelectImprovement,
  onOpenReportModal,
  onOpenEditModal,
}) => {
  const [filterMode, setFilterMode] = useState<
    'ALL' | 'PRIMARY' | 'CO_RESPONSIBLE' | 'PENDING_REPORT' | 'DELAYED' | 'COMPLETED'
  >('ALL');

  const currentUserId = currentUser?.userId || '';

  // Filter user's tasks
  const myTasks = useMemo(() => {
    return improvements.filter((item) => {
      const isPrimary = item.primaryResponsiblePersonId === currentUserId || item.recordedById === currentUserId;
      const isCo = item.coResponsiblePersonIds?.includes(currentUserId) || item.dataSupportPersonIds?.includes(currentUserId);
      const isReviewer = item.reviewerPersonId === currentUserId || item.approverPersonId === currentUserId;

      // If user is admin/executive, allow viewing all tasks or their own
      const matchesUser = isPrimary || isCo || isReviewer || currentUser?.role === 'ADMIN' || currentUser?.role === 'EXECUTIVE';

      if (!matchesUser) return false;

      const isOverdue =
        item.targetEndDate &&
        item.overallStatus !== 'COMPLETED' &&
        item.overallStatus !== 'CLOSED' &&
        new Date(item.targetEndDate).getTime() < Date.now();

      if (filterMode === 'PRIMARY' && !isPrimary) return false;
      if (filterMode === 'CO_RESPONSIBLE' && !isCo) return false;
      if (filterMode === 'PENDING_REPORT' && item.overallStatus === 'COMPLETED') return false;
      if (filterMode === 'DELAYED' && !isOverdue) return false;
      if (filterMode === 'COMPLETED' && item.overallStatus !== 'COMPLETED' && item.overallStatus !== 'SCALED' && item.overallStatus !== 'BEST_PRACTICE') return false;

      return true;
    });
  }, [improvements, currentUserId, currentUser?.role, filterMode]);

  const primaryCount = improvements.filter((i) => i.primaryResponsiblePersonId === currentUserId).length;
  const pendingReportCount = improvements.filter((i) => (i.primaryResponsiblePersonId === currentUserId || currentUser?.role === 'ADMIN') && i.overallStatus !== 'COMPLETED').length;
  const delayedCount = improvements.filter((i) => {
    if (i.overallStatus === 'COMPLETED') return false;
    return i.targetEndDate && new Date(i.targetEndDate).getTime() < Date.now();
  }).length;

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-blue-600" />
            งานที่ฉันรับผิดชอบ (My Assigned Tasks)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ติดตาม บันทึกผลความก้าวหน้า และส่งรายงานประเด็นปรับปรุงงานที่คุณเป็นผู้รับผิดชอบ
          </p>
        </div>
      </div>

      {/* Quick Summary Filter Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setFilterMode('ALL')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filterMode === 'ALL'
              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="text-xs text-slate-500 font-medium">งานทั้งหมดของฉัน</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{myTasks.length}</div>
        </button>

        <button
          onClick={() => setFilterMode('PENDING_REPORT')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filterMode === 'PENDING_REPORT'
              ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="text-xs text-amber-600 font-medium">ต้องรายงานผล</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{pendingReportCount}</div>
        </button>

        <button
          onClick={() => setFilterMode('DELAYED')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filterMode === 'DELAYED'
              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="text-xs text-rose-600 font-medium">งานเกินกำหนด</div>
          <div className="text-2xl font-bold text-rose-600 mt-1">{delayedCount}</div>
        </button>

        <button
          onClick={() => setFilterMode('COMPLETED')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filterMode === 'COMPLETED'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="text-xs text-emerald-600 font-medium">เสร็จสิ้นแล้ว</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {improvements.filter((i) => i.overallStatus === 'COMPLETED').length}
          </div>
        </button>
      </div>

      {/* Task List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
        {myTasks.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 opacity-80" />
            <div className="text-base font-bold text-slate-700 dark:text-slate-200">
              ไม่มีงานค้างในหมวดนี้
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              คุณได้จัดการประเด็นความรับผิดชอบครบถ้วนเรียบร้อยแล้ว
            </p>
          </div>
        ) : (
          myTasks.map((item) => {
            const step = BRIDGE_STEPS[item.currentBridgeStep || 'B'];
            const isOverdue =
              item.targetEndDate &&
              item.overallStatus !== 'COMPLETED' &&
              new Date(item.targetEndDate).getTime() < Date.now();

            return (
              <div
                key={item.id}
                className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                      {item.improvementId}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md font-bold ${step.badgeBg} ${step.badgeText}`}>
                      ขั้น {item.currentBridgeStep}: {step.name}
                    </span>
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {item.ownerNameSnapshot}
                    </span>
                    {isOverdue && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 font-bold text-[10px]">
                        เกินกำหนดเสร็จ
                      </span>
                    )}
                  </div>

                  <h3
                    onClick={() => onSelectImprovement(item)}
                    className="font-bold text-slate-900 dark:text-white text-base hover:text-blue-600 cursor-pointer"
                  >
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-1">
                    {item.improvementApproach || item.issueDetails}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      กำหนดเสร็จ: {item.targetEndDate || '-'}
                    </span>
                    <span>&bull;</span>
                    <span>ความก้าวหน้า: {item.currentProgressPercentage || 0}%</span>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onOpenReportModal(item)}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all"
                  >
                    บันทึกผลความก้าวหน้า
                  </button>

                  <button
                    onClick={() => onOpenEditModal(item)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    title="แก้ไขข้อมูล"
                  >
                    <FileEdit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onSelectImprovement(item)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    title="ดูรายละเอียด"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

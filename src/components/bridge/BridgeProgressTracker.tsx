import React, { useState } from 'react';
import {
  BridgeImprovement,
  BridgeProgressUpdate,
  BRIDGE_STEPS,
} from '../../types/bridge';
import { User } from '../../types';
import { bridgeService } from '../../lib/bridgeService';
import { getStoredGoogleUser } from '../../lib/googleAuth';
import { sendGmailMessage } from '../../lib/googleGmail';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Send,
  FileCheck,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Building2,
  Calendar,
  Layers,
  HelpCircle,
  MessageSquare,
  Trash2,
  Mail,
  MailCheck,
  Check,
  ExternalLink,
} from 'lucide-react';

interface BridgeProgressTrackerProps {
  improvements: BridgeImprovement[];
  currentUser: User | null;
  onSelectImprovement: (item: BridgeImprovement) => void;
  onOpenAiSummary?: (item: BridgeImprovement) => void;
  onRefresh: () => void;
}

export const BridgeProgressTracker: React.FC<BridgeProgressTrackerProps> = ({
  improvements,
  currentUser,
  onSelectImprovement,
  onOpenAiSummary,
  onRefresh,
}) => {
  const [selectedImprovementId, setSelectedImprovementId] = useState<string>(
    improvements[0]?.id || ''
  );
  const [isRecordingReport, setIsRecordingReport] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // New Report Form State
  const [periodName, setPeriodName] = useState<string>('ครั้งที่ 1 (15 มกราคม 2569)');
  const [completedTasksSummary, setCompletedTasksSummary] = useState<string>('');
  const [periodAchievement, setPeriodAchievement] = useState<string>('');
  const [cumulativeResult, setCumulativeResult] = useState<string>('');
  const [progressPercentage, setProgressPercentage] = useState<number>(50);
  const [beforeImprovementResult, setBeforeImprovementResult] = useState<string>('');
  const [afterImprovementResult, setAfterImprovementResult] = useState<string>('');
  const [quantitativeData, setQuantitativeData] = useState<string>('');
  const [qualitativeData, setQualitativeData] = useState<string>('');
  const [customerImpactFeedback, setCustomerImpactFeedback] = useState<string>('');
  const [remainingProblems, setRemainingProblems] = useState<string>('');
  const [nextSteps, setNextSteps] = useState<string>('');
  const [requiresExecutiveDecision, setRequiresExecutiveDecision] = useState<boolean>(false);
  const [decisionTopic, setDecisionTopic] = useState<string>('');
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);

  // Email Notification Settings (Optional - In-App Dashboard & Firebase logging are primary)
  const [notifyAdminsEmail, setNotifyAdminsEmail] = useState<boolean>(false);
  const [recipientEmailsText, setRecipientEmailsText] = useState<string>(
    'jsawaporn@gmail.com, executive@huso.yru.ac.th'
  );
  const [emailDeliveryNotice, setEmailDeliveryNotice] = useState<{
    show: boolean;
    topic: string;
    progressPercentage: number;
    recipients: string[];
    method: string;
    directUrl: string;
    mailtoLink: string;
  } | null>(null);

  const activeImprovement = improvements.find((i) => i.id === selectedImprovementId) || improvements[0];

  const handleDeleteProgressReport = async (reportId: string, periodName: string) => {
    if (!activeImprovement) return;
    const confirmDelete = window.confirm(
      `คุณต้องการลบประวัติการรายงานความก้าวหน้ารอบ "${periodName}" ใช่หรือไม่?\n\nการดำเนินการนี้จะปรับปรุงค่าร้อยละความก้าวหน้าสะสมตามรอบที่เหลืออยู่โดยอัตโนมัติ`
    );
    if (!confirmDelete) return;

    setDeletingReportId(reportId);
    try {
      const operator = {
        userId: currentUser?.userId || 'USER-01',
        userName: currentUser?.fullName || 'ผู้ดูแลระบบ',
        role: currentUser?.role || 'OWNER',
      };
      await bridgeService.deleteProgressReport(activeImprovement.id, reportId, operator);
      onRefresh();
    } catch (err: any) {
      alert(`ไม่สามารถลบรายงานได้: ${err.message || err}`);
    } finally {
      setDeletingReportId(null);
    }
  };

  const handleSaveProgressReport = async () => {
    if (!activeImprovement) return;
    if (!completedTasksSummary.trim()) {
      alert('กรุณาระบุสิ่งที่ดำเนินการแล้วในรอบนี้');
      return;
    }

    setIsSubmitting(true);
    try {
      const operator = {
        userId: currentUser?.userId || 'USER-01',
        userName: currentUser?.fullName || 'ผู้รายงานผล',
        role: currentUser?.role || 'OWNER',
      };

      const reportPayload = {
        periodName,
        completedTasksSummary,
        periodAchievement,
        cumulativeResult,
        progressPercentage: Number(progressPercentage) || 0,
        beforeImprovementResult,
        afterImprovementResult,
        quantitativeData,
        qualitativeData,
        customerImpactFeedback,
        remainingProblems,
        nextSteps,
        requiresExecutiveDecision,
        decisionTopic: requiresExecutiveDecision ? decisionTopic : undefined,
        reportedById: operator.userId,
        reportedByName: operator.userName,
        status: 'SUBMITTED' as const,
      };

      await bridgeService.addProgressReport(activeImprovement.id, reportPayload, operator);

      // Email Notification Dispatch via SMTP backend and Gmail API
      const parsedRecipients = recipientEmailsText
        .split(',')
        .map((e) => e.trim())
        .filter((e) => e.length > 0 && e.includes('@'));

      if (notifyAdminsEmail && parsedRecipients.length > 0) {
        const progressInt = Number(progressPercentage) || 0;
        const emailSubject = `📊 [HUSO BRIDGE] รายงานความก้าวหน้ารอบใหม่: [${activeImprovement.improvementId}] ${activeImprovement.title} (${progressInt}%)`;
        const directUrl = `${window.location.origin}${window.location.pathname}?tab=bridge_progress&item=${activeImprovement.id}`;
        
        const plainBody = `เรียน คณะผู้บริหารและผู้ดูแลระบบ HUSO BRIDGE System\n\nข้าพเจ้า ${operator.userName} ได้บันทึกรายงานความก้าวหน้าการปรับปรุงงานรอบใหม่ในระบบ HUSO BRIDGE:\n\n- ประเด็น: [${activeImprovement.improvementId}] ${activeImprovement.title}\n- รอบการรายงาน: ${periodName}\n- ความก้าวหน้ารวม: ${progressInt}%\n- หน่วยงาน/หลักสูตร: ${activeImprovement.ownerNameSnapshot || 'คณะมนุษยศาสตร์ฯ'}\n\nสิ่งที่ดำเนินการแล้วในรอบนี้:\n${completedTasksSummary}\n\n${periodAchievement ? `ผลสำเร็จสำคัญ:\n${periodAchievement}\n` : ''}${customerImpactFeedback ? `ผลต่อผู้รับบริการ:\n${customerImpactFeedback}\n` : ''}\nสามารถเปิดดูรายละเอียดฉบับเต็มได้ที่:\n${directUrl}\n\nจึงเรียนมาเพื่อโปรดทราบ`;

        let dispatchMethod = 'SMTP_BACKEND';

        // 1. If signed in with Google Workspace, also send via Gmail API directly
        const googleUser = getStoredGoogleUser();
        if (googleUser && googleUser.accessToken) {
          try {
            for (const rec of parsedRecipients) {
              await sendGmailMessage(googleUser.accessToken, {
                to: rec,
                subject: emailSubject,
                bodyText: plainBody,
              });
            }
            dispatchMethod = 'GMAIL_API_DIRECT';
          } catch (gErr) {
            console.warn('Direct Gmail API progress dispatch fallback to SMTP:', gErr);
          }
        }

        // 2. Dispatch to Backend SMTP mailer
        try {
          await bridgeService.notifyProgressSubmission({
            improvementId: activeImprovement.improvementId,
            improvementTitle: activeImprovement.title,
            periodName,
            progressPercentage: progressInt,
            completedTasksSummary,
            periodAchievement,
            customerImpactFeedback,
            nextSteps,
            requiresExecutiveDecision,
            decisionTopic,
            reportedByName: operator.userName,
            departmentName: activeImprovement.ownerNameSnapshot,
            recipientEmails: parsedRecipients,
            directUrl,
          });
        } catch (mailErr) {
          console.warn('Backend SMTP progress mailer warning:', mailErr);
        }

        const mailtoUrl = `mailto:${encodeURIComponent(parsedRecipients.join(','))}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(plainBody)}`;

        setEmailDeliveryNotice({
          show: true,
          topic: `${activeImprovement.improvementId}: ${activeImprovement.title}`,
          progressPercentage: progressInt,
          recipients: parsedRecipients,
          method: dispatchMethod,
          directUrl,
          mailtoLink: mailtoUrl,
        });
      }

      setIsRecordingReport(false);
      // Reset fields
      setCompletedTasksSummary('');
      setPeriodAchievement('');
      setCustomerImpactFeedback('');
      onRefresh();
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-amber-600" />
            ติดตามผลการปรับปรุงงานและรายงานรอบเวลา
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            บันทึกผลงานตามรอบเวลา เปรียบเทียบผลลัพธ์ก่อน-หลัง และสรุปผลสัมฤทธิ์อย่างเป็นระบบ (Real-Time In-App Tracking)
          </p>
        </div>

        {activeImprovement && (
          <button
            onClick={() => setIsRecordingReport(!isRecordingReport)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {isRecordingReport ? 'ปิดฟอร์มรายงาน' : 'บันทึกผลรอบใหม่'}
          </button>
        )}
      </div>

      {/* Email Delivery Confirmation Alert */}
      {emailDeliveryNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in text-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <MailCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-emerald-900 dark:text-emerald-200">
                ส่งการแจ้งเตือนความก้าวหน้า ({emailDeliveryNotice.progressPercentage}%) ถึงผู้บริหารและผู้ดูแลระบบทางอีเมลเรียบร้อยแล้ว
              </div>
              <div className="text-emerald-700 dark:text-emerald-400 text-[11px] mt-0.5">
                ผู้รับ: {emailDeliveryNotice.recipients.join(', ')} ({emailDeliveryNotice.method === 'GMAIL_API_DIRECT' ? 'ส่งตรงผ่านระบบ Gmail API' : 'ส่งผ่านระบบอีเมล SMTP เซิร์ฟเวอร์'})
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={emailDeliveryNotice.mailtoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              เปิดในโปรแกรมเมล
            </a>
            <button
              onClick={() => setEmailDeliveryNotice(null)}
              className="p-1.5 rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Selector & Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Issues Selector */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-bold uppercase text-slate-400">เลือกประเด็นที่ต้องการติดตาม</div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-[700px] overflow-y-auto">
            {improvements.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">ไม่มีรายการประเด็น</div>
            ) : (
              improvements.map((item) => {
                const isSelected = item.id === activeImprovement?.id;
                const step = BRIDGE_STEPS[item.currentBridgeStep || 'B'];
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedImprovementId(item.id);
                      setIsRecordingReport(false);
                    }}
                    className={`w-full p-4 text-left transition-colors flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-blue-600'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {item.improvementId}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded font-bold ${step.badgeBg} ${step.badgeText}`}>
                          ขั้น {item.currentBridgeStep}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {item.ownerNameSnapshot}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-slate-700 dark:text-slate-300">
                        {item.currentProgressPercentage || 0}%
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Active Item Progress & History */}
        <div className="lg:col-span-8 space-y-6">
          {activeImprovement ? (
            <>
              {/* Active Item Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                      {activeImprovement.improvementId}
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                      {activeImprovement.title}
                    </h2>
                    <div className="text-xs text-slate-500 mt-0.5">
                      หน่วยงาน/หลักสูตร: <span className="font-semibold text-slate-700 dark:text-slate-300">{activeImprovement.ownerNameSnapshot}</span> | ผู้รับผิดชอบหลัก: <span className="font-semibold text-slate-700 dark:text-slate-300">{activeImprovement.primaryResponsiblePersonName}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectImprovement(activeImprovement)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    ดูรายละเอียดเต็ม &rarr;
                  </button>
                </div>

                {/* Progress Bar Display */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-600 dark:text-slate-300">ความก้าวหน้ารวมล่าสุด</span>
                    <span className="text-blue-600 dark:text-blue-400 text-sm font-black">
                      {activeImprovement.currentProgressPercentage || 0}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all"
                      style={{ width: `${Math.min(activeImprovement.currentProgressPercentage || 0, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Action Buttons Bar */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsRecordingReport(!isRecordingReport)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isRecordingReport ? 'ปิดฟอร์มรายงาน' : 'บันทึกผลรอบใหม่'}</span>
                    </button>
                    {onOpenAiSummary && (
                      <button
                        onClick={() => onOpenAiSummary(activeImprovement)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>✨ AI สรุปผลประเด็น & รายงานผู้บริหาร</span>
                      </button>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500">
                    รอบรายงานสะสม: <strong>{activeImprovement.progressReports?.length || 0} รอบ</strong> (อยู่ภายใต้รหัส {activeImprovement.improvementId})
                  </div>
                </div>
              </div>

              {/* Record Progress Form Modal / Panel */}
              {isRecordingReport && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border-2 border-blue-500 shadow-xl space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                      <Plus className="w-4 h-4 text-blue-600" />
                      บันทึกผลการดำเนินงานรอบใหม่
                    </h3>
                    <span className="text-xs text-slate-400">ผู้รายงาน: {currentUser?.fullName || 'ผู้รับผิดชอบ'}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        ครั้งที่และวันที่การรายงาน
                      </label>
                      <input
                        type="text"
                        value={periodName}
                        onChange={(e) => setPeriodName(e.target.value)}
                        placeholder="เช่น ครั้งที่ 1 (15 ม.ค. 2569)"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        ร้อยละความก้าวหน้ารวม ({progressPercentage}%)
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={progressPercentage}
                        onChange={(e) => setProgressPercentage(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 mt-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      สิ่งที่ดำเนินการแล้วในรอบนี้ (Tasks Completed) <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={completedTasksSummary}
                      onChange={(e) => setCompletedTasksSummary(e.target.value)}
                      placeholder="ระบุกิจกรรมที่ได้ปฏิบัติจริง การปรับปรุงกระบวนการ หรือการประสานงาน..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        ผลสำเร็จในรอบนี้ (Achievement)
                      </label>
                      <input
                        type="text"
                        value={periodAchievement}
                        onChange={(e) => setPeriodAchievement(e.target.value)}
                        placeholder="เช่น จัดทำคู่มือ SOP เสร็จสมบูรณ์"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        ผลที่เกิดกับลูกค้า / ผู้รับบริการ (Customer Impact)
                      </label>
                      <input
                        type="text"
                        value={customerImpactFeedback}
                        onChange={(e) => setCustomerImpactFeedback(e.target.value)}
                        placeholder="เช่น นักศึกษาได้รับเอกสารเร็วขึ้นภายในวันเดียว"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                  </div>

                  {/* Optional Email Notification Card */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-750 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={notifyAdminsEmail}
                        onChange={(e) => setNotifyAdminsEmail(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <Mail className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      ส่งสำเนาแจ้งเตือนทางอีเมลเพิ่มเติม (ตัวเลือกเสริม - ไม่จำเป็นต้องตั้งค่า SMTP)
                    </label>

                    {notifyAdminsEmail && (
                      <div className="space-y-1 pl-5">
                        <div className="text-[11px] text-slate-600 dark:text-slate-400">
                          ระบุอีเมลผู้รับ (คั่นด้วยจุลภาค ,):
                        </div>
                        <input
                          type="text"
                          value={recipientEmailsText}
                          onChange={(e) => setRecipientEmailsText(e.target.value)}
                          placeholder="jsawaporn@gmail.com, executive@huso.yru.ac.th"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    )}
                  </div>

                  {/* Request Decision Toggle */}
                  <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-purple-950 dark:text-purple-200">
                      <input
                        type="checkbox"
                        checked={requiresExecutiveDecision}
                        onChange={(e) => setRequiresExecutiveDecision(e.target.checked)}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      ต้องการส่งประเด็นให้ผู้บริหารตัดสินใจ / มอบหมายงานเพิ่มเติม
                    </label>

                    {requiresExecutiveDecision && (
                      <input
                        type="text"
                        value={decisionTopic}
                        onChange={(e) => setDecisionTopic(e.target.value)}
                        placeholder="ระบุหัวข้อที่ต้องการให้ผู้บริหารตัดสินใจ..."
                        className="w-full px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-800 text-xs"
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsRecordingReport(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProgressReport}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isSubmitting ? 'กำลังบันทึกและส่งแจ้งเตือน...' : 'บันทึกรายงานรอบนี้'}
                    </button>
                  </div>
                </div>
              )}

              {/* Progress Reports History Timeline */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  ประวัติการรายงานความก้าวหน้าตามรอบเวลา (Report Timeline)
                </h3>

                {!activeImprovement.progressReports || activeImprovement.progressReports.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 space-y-1">
                    <Clock className="w-8 h-8 mx-auto opacity-40" />
                    <div>ยังไม่มีประวัติการรายงานรอบเวลา</div>
                    <div className="text-[11px]">กดปุ่ม "บันทึกผลรอบใหม่" เพื่อเริ่มรายงานผล</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeImprovement.progressReports.map((rpt, idx) => {
                      const currentReportId = rpt.reportId || `RPT-${idx}`;
                      const isDeleting = deletingReportId === currentReportId;
                      return (
                        <div
                          key={currentReportId}
                          className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2 text-xs relative group transition-all hover:border-slate-300 dark:hover:border-slate-700"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-blue-600 dark:text-blue-400">
                                {rpt.periodName}
                              </span>
                              {rpt.progressPercentage !== undefined && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-[10px] font-bold">
                                  {rpt.progressPercentage}%
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] text-slate-400">
                                ผู้รายงาน: {rpt.reportedByName || 'ผู้รับผิดชอบ'}
                              </span>
                              <button
                                onClick={() => handleDeleteProgressReport(currentReportId, rpt.periodName)}
                                disabled={isDeleting}
                                title="ลบรายงานรอบนี้"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                            {rpt.completedTasksSummary}
                          </div>

                          {rpt.periodAchievement && (
                            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-[11px]">
                              <strong>ผลสำเร็จสำคัญ:</strong> {rpt.periodAchievement}
                            </div>
                          )}

                          {rpt.customerImpactFeedback && (
                            <div className="text-[11px] text-slate-500">
                              <strong>ผลต่อผู้รับบริการ:</strong> {rpt.customerImpactFeedback}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
              กรุณาเลือกประเด็นจากรายการทางซ้ายเพื่อเริ่มบันทึกและติดตามความก้าวหน้า
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


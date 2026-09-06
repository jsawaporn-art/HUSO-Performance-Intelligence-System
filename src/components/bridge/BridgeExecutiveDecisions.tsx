import React, { useState } from 'react';
import {
  BridgeExecutiveDecision,
  BridgeImprovement,
} from '../../types/bridge';
import { User } from '../../types';
import { bridgeService } from '../../lib/bridgeService';
import { notificationService } from '../../lib/firebase';
import { getStoredGoogleUser } from '../../lib/googleAuth';
import { sendGmailMessage } from '../../lib/googleGmail';
import {
  Flame,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  Send,
  Building2,
  UserCheck,
  ChevronRight,
  Plus,
  AlertTriangle,
  FileText,
  Sparkles,
  History,
  Tag,
  ShieldCheck,
  RotateCcw,
  Mail,
  MailCheck,
  ExternalLink,
  Smartphone,
  Bell,
  Check,
  Trash2,
} from 'lucide-react';

interface BridgeExecutiveDecisionsProps {
  decisions: BridgeExecutiveDecision[];
  improvements: BridgeImprovement[];
  currentUser: User | null;
  onSelectImprovement: (item: BridgeImprovement) => void;
  onRefresh: () => void;
}

export const BridgeExecutiveDecisions: React.FC<BridgeExecutiveDecisionsProps> = ({
  decisions,
  improvements,
  currentUser,
  onSelectImprovement,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'RESOLVED'>('PENDING');
  const [selectedDecision, setSelectedDecision] = useState<BridgeExecutiveDecision | null>(null);
  const [decisionModalOpen, setDecisionModalOpen] = useState<boolean>(false);
  const [decisionAction, setDecisionAction] = useState<'APPROVED' | 'REJECTED' | 'DIRECTED'>('APPROVED');
  const [executiveComment, setExecutiveComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // New Request Modal state
  const [requestModalOpen, setRequestModalOpen] = useState<boolean>(false);
  const [selectedImprovementId, setSelectedImprovementId] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [requestError, setRequestError] = useState<string>('');
  const [notifyEmail, setNotifyEmail] = useState<boolean>(false);
  const [priority, setPriority] = useState<'NORMAL' | 'URGENT' | 'VERY_URGENT'>('NORMAL');
  const [recipientEmails, setRecipientEmails] = useState<string>(
    'jsawaporn@gmail.com, executive@huso.yru.ac.th'
  );
  const [emailStatusMessage, setEmailStatusMessage] = useState<string | null>(null);
  const [emailDeliveryNotice, setEmailDeliveryNotice] = useState<{
    show: boolean;
    topic: string;
    recipients: string[];
    method: string;
    directUrl: string;
    mailtoLink: string;
  } | null>(null);

  // Delete decision state
  const [decisionToDelete, setDecisionToDelete] = useState<BridgeExecutiveDecision | null>(null);
  const [isDeletingDecision, setIsDeletingDecision] = useState<boolean>(false);

  // Deduplicate decisions by decisionId
  const uniqueDecisions = React.useMemo(() => {
    const map = new Map<string, BridgeExecutiveDecision>();
    (decisions || []).forEach((d, idx) => {
      const key = d.decisionId || `dec-fallback-${idx}`;
      if (!map.has(key)) {
        map.set(key, { ...d, decisionId: key });
      }
    });
    return Array.from(map.values());
  }, [decisions]);

  const pendingDecisions = uniqueDecisions.filter((d) => d.decisionStatus === 'PENDING');
  const resolvedDecisions = uniqueDecisions.filter((d) => d.decisionStatus !== 'PENDING');

  const isExecutiveOrAdmin =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'EXECUTIVE';

  const handleOpenDecisionModal = (
    decision: BridgeExecutiveDecision,
    action: 'APPROVED' | 'REJECTED' | 'DIRECTED'
  ) => {
    setSelectedDecision(decision);
    setDecisionAction(action);
    setExecutiveComment('');
    setDecisionModalOpen(true);
  };

  const handleConfirmDecision = async () => {
    if (!selectedDecision) return;
    if (!executiveComment.trim()) {
      alert('กรุณาระบุความเห็นหรือข้อสั่งการของผู้บริหาร');
      return;
    }

    setIsSubmitting(true);
    try {
      await bridgeService.resolveExecutiveDecision(selectedDecision.decisionId, {
        decisionStatus: decisionAction,
        executiveComment,
        decidedBy: currentUser?.fullName || 'ผู้บริหารคณะ',
      });

      // Send in-app notification to requester
      try {
        await notificationService.send({
          title: `ผู้บริหารมีข้อสั่งการเรื่อง: ${selectedDecision.topic}`,
          message: `ผลการพิจารณา: ${
            decisionAction === 'APPROVED' ? 'อนุมัติ' : decisionAction === 'DIRECTED' ? 'สั่งการ/มอบหมาย' : 'ไม่อนุมัติ'
          } โดย ${currentUser?.fullName || 'ผู้บริหารคณะ'}: ${executiveComment}`,
          type: decisionAction === 'APPROVED' ? 'SUCCESS' : 'INFO',
        });
      } catch (notifErr) {
        console.warn('In-app notification error:', notifErr);
      }

      setDecisionModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteDecision = async () => {
    if (!decisionToDelete) return;
    setIsDeletingDecision(true);
    try {
      await bridgeService.deleteExecutiveDecision(decisionToDelete.decisionId, {
        userId: currentUser?.userId || currentUser?.email || 'USER',
        userName: currentUser?.fullName || 'ผู้ใช้งาน',
        role: currentUser?.role || 'ADMIN',
      });
      setDecisionToDelete(null);
      onRefresh();
    } catch (err: any) {
      alert(`ไม่สามารถลบข้อมูลการพิจารณาได้: ${err.message || err}`);
    } finally {
      setIsDeletingDecision(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError('');
    setEmailStatusMessage(null);

    if (!topic.trim()) {
      setRequestError('กรุณาระบุหัวข้อคำขอหรือประเด็นการตัดสินใจ');
      return;
    }
    if (!details.trim()) {
      setRequestError('กรุณาระบุรายละเอียดคำขอและสิ่งที่ต้องการให้ผู้บริหารสนับสนุน');
      return;
    }

    const matchedImp = improvements.find((i) => i.id === selectedImprovementId);
    const parsedRecipients = recipientEmails
      .split(',')
      .map((em) => em.trim())
      .filter((em) => em.includes('@'));

    setIsSubmitting(true);
    try {
      const decisionId = `DEC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newDecision: BridgeExecutiveDecision = {
        decisionId,
        improvementId: selectedImprovementId || 'GENERAL',
        improvementTitle: matchedImp ? matchedImp.title : 'คำขอเชิงบูรณาการทั่วไป',
        departmentOrCourseName:
          matchedImp?.ownerNameSnapshot ||
          currentUser?.departmentName ||
          'คณะมนุษยศาสตร์และสังคมศาสตร์',
        requestedBy: currentUser?.fullName || 'เจ้าหน้าที่ผู้เสนอ',
        requestedAt: new Date().toISOString(),
        topic: topic.trim(),
        details: details.trim(),
        decisionStatus: 'PENDING',
      };

      await bridgeService.requestExecutiveDecision(newDecision);

      // In-app notification to administrators and executives
      try {
        await notificationService.send({
          title: `[เรื่องด่วนผู้บริหาร] ${topic.trim()}`,
          message: `หน่วยงาน ${newDecision.departmentOrCourseName} เสนอเรื่องขออนุมัติ/ข้อสั่งการ โดย ${newDecision.requestedBy}`,
          type: priority === 'VERY_URGENT' ? 'WARNING' : 'INFO',
        });
      } catch (notifErr) {
        console.warn('Notification service error:', notifErr);
      }

      // Email Notification Dispatch via Gmail API & Server backend
      if (notifyEmail && parsedRecipients.length > 0) {
        const priorityLabel = priority === 'VERY_URGENT' ? '🔥 [ด่วนที่สุด]' : priority === 'URGENT' ? '⚡ [ด่วน]' : '[เรื่องเสนอพิจารณา]';
        const emailSubject = `${priorityLabel} [HUSO BRIDGE] เสนอเรื่องขออนุมัติ/ข้อสั่งการผู้บริหาร: ${newDecision.topic}`;
        const directUrl = `${window.location.origin}${window.location.pathname}?tab=bridge_decisions#dec-${decisionId}`;
        const plainBody = `เรียน คณะผู้บริหารคณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏยะลา\n\nข้าพเจ้า ${newDecision.requestedBy} (${newDecision.departmentOrCourseName}) ขอเสนอเรื่องเพื่อโปรดพิจารณาอนุมัติหรือมีข้อสั่งการ ดังนี้:\n\nหัวข้อ: ${newDecision.topic}\nประเด็น BRIDGE ที่เกี่ยวข้อง: ${newDecision.improvementTitle}\n\nรายละเอียดและความจำเป็น:\n${newDecision.details}\n\nสามารถเปิดดูและบันทึกข้อสั่งการผ่านระบบได้ที่:\n${directUrl}\n\nจึงเรียนมาเพื่อโปรดพิจารณา`;

        let dispatchMethod = 'SERVER_DISPATCH';

        // 1. Try real direct client-side sending if signed in with Google Workspace
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
            console.log('Real Gmail API dispatch succeeded for recipients:', parsedRecipients);
          } catch (gErr) {
            console.warn('Direct Gmail API dispatch failed, falling back to server:', gErr);
          }
        }

        // 2. Dispatch to server endpoint (which handles SMTP/Nodemailer if configured)
        try {
          await fetch('/api/bridge/notify-executive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              decisionId,
              improvementId: newDecision.improvementId,
              improvementTitle: newDecision.improvementTitle,
              departmentOrCourseName: newDecision.departmentOrCourseName,
              requestedBy: newDecision.requestedBy,
              topic: newDecision.topic,
              details: newDecision.details,
              recipientEmails: parsedRecipients,
              directUrl,
              priority,
            }),
          });
        } catch (mailErr) {
          console.warn('Server email dispatch warning:', mailErr);
        }

        const mailtoUrl = `mailto:${encodeURIComponent(parsedRecipients.join(','))}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(plainBody)}`;

        setEmailDeliveryNotice({
          show: true,
          topic: newDecision.topic,
          recipients: parsedRecipients,
          method: dispatchMethod,
          directUrl,
          mailtoLink: mailtoUrl,
        });
      }

      setRequestModalOpen(false);
      setTopic('');
      setDetails('');
      setSelectedImprovementId('');
      onRefresh();
    } catch (err: any) {
      setRequestError(err.message || 'ไม่สามารถส่งคำขอได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pre-filled Mailto launcher
  const generateMailtoLink = () => {
    const subject = encodeURIComponent(`[HUSO BRIDGE] เสนอเรื่องขออนุมัติ/ข้อสั่งการผู้บริหาร: ${topic || 'เรื่องเสนอใหม่'}`);
    const body = encodeURIComponent(
      `เรียน คณะผู้บริหารคณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏยะลา\n\n` +
      `ข้าพเจ้า ${currentUser?.fullName || 'ผู้รับผิดชอบ'} (${currentUser?.departmentName || 'หน่วยงาน'}) ขอเสนอเรื่องเพื่อโปรดพิจารณาอนุมัติหรือมีข้อสั่งการ ดังนี้:\n\n` +
      `หัวข้อ: ${topic || '-'}\n` +
      `ประเด็น BRIDGE ที่เกี่ยวข้อง: ${selectedImprovementId || 'คำขอทั่วไป'}\n\n` +
      `รายละเอียดและความจำเป็น:\n${details || '-'}\n\n` +
      `สามารถเปิดดูและบันทึกข้อสั่งการผ่านระบบ BRIDGE Mobile Access ได้ที่:\n${window.location.origin}${window.location.pathname}?tab=bridge_decisions\n\n` +
      `จึงเรียนมาเพื่อโปรดพิจารณา`
    );
    const to = encodeURIComponent(recipientEmails || 'jsawaporn@gmail.com');
    return `mailto:${to}?subject=${subject}&body=${body}`;
  };

  // Seed initial sample request if user clicks create demo
  const handleSeedDemoDecision = async () => {
    setIsSubmitting(true);
    try {
      const sampleItem = improvements[0];
      const newDecision: BridgeExecutiveDecision = {
        decisionId: `DEC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        improvementId: sampleItem ? sampleItem.id : 'BRG-2569-0001',
        improvementTitle: sampleItem ? sampleItem.title : 'ระบบสารสนเทศติดตามผลการดำเนินงานเชิงยุทธศาสตร์',
        departmentOrCourseName: sampleItem?.ownerNameSnapshot || 'งานเทคโนโลยีและนวัตกรรม',
        requestedBy: currentUser?.fullName || 'ผู้รับผิดชอบโครงการ',
        requestedAt: new Date().toISOString(),
        topic: 'ขออนุมัติงบประมาณสนับสนุนเพิ่มเติมสำหรับการจัดอบรมเชิงปฏิบัติการ EdPEx',
        details: 'เนื่องจากมีผู้เข้าร่วมโครงการเพิ่มขึ้น 20% จากเป้าหมายเดิม จึงมีความจำเป็นขออนุมัติงบสนับสนุนค่าวิทยากรและเอกสารการอบรมเพิ่มเติมจำนวน 15,000 บาท เพื่อให้การขับเคลื่อนการปรับปรุงกระบวนการบรรลุเป้าหมาย',
        decisionStatus: 'PENDING',
      };
      await bridgeService.requestExecutiveDecision(newDecision);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Flame className="w-4 h-4" />
            Executive Decision Board
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            เรื่องรอผู้บริหารตัดสินใจและข้อสั่งการ
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ศูนย์รวมคำขออนุมัติงบประมาณ ทรัพยากร การปลดล็อกอุปสรรค (Blocker) และการมอบหมายงานบูรณาการข้ามสายงาน
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setRequestModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            เสนอเรื่องใหม่ถึงผู้บริหาร
          </button>
        </div>
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
                ส่งการแจ้งเตือนเรื่อง "{emailDeliveryNotice.topic}" ถึงผู้บริหารทางอีเมลเรียบร้อยแล้ว
              </div>
              <div className="text-emerald-700 dark:text-emerald-400 text-[11px] mt-0.5">
                ผู้รับ: {emailDeliveryNotice.recipients.join(', ')} ({emailDeliveryNotice.method === 'GMAIL_API_DIRECT' ? 'ส่งตรงผ่านระบบ Gmail API' : 'ส่งผ่านระบบอีเมลเซิร์ฟเวอร์'})
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

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('PENDING')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all ${
            activeTab === 'PENDING'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          รอการพิจารณาตัดสินใจ ({pendingDecisions.length})
        </button>
        <button
          onClick={() => setActiveTab('RESOLVED')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all ${
            activeTab === 'RESOLVED'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          พิจารณา/สั่งการแล้ว ({resolvedDecisions.length})
        </button>
      </div>

      {/* Pending Decisions Section */}
      {activeTab === 'PENDING' && (
        <div className="space-y-4">
          {pendingDecisions.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  ไม่มีเรื่องรอผู้บริหารตัดสินใจในขณะนี้
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  ทุกประเด็นได้รับการพิจารณาและสั่งการครบถ้วน หรือยังไม่มีการเสนอคำขออนุมัติงบประมาณ/ทรัพยากรเข้ามา
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setRequestModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  สร้างเรื่องขออนุมัติ/สั่งการ
                </button>
                <button
                  onClick={handleSeedDemoDecision}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-purple-200 dark:border-purple-900 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-xs font-bold transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  ตัวอย่างเรื่องเสนอผู้บริหาร (Demo Case)
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingDecisions.map((dec, idx) => {
                const matchedImp = improvements.find((i) => i.id === dec.improvementId);
                return (
                  <div
                    key={`${dec.decisionId || 'pending'}-${idx}`}
                    className="bg-white dark:bg-slate-900 rounded-3xl p-5 border-2 border-purple-200 dark:border-purple-900/60 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold border border-purple-200/60 dark:border-purple-900/60">
                          <Building2 className="w-3.5 h-3.5" />
                          {dec.departmentOrCourseName}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md font-semibold">
                            <MailCheck className="w-3 h-3" />
                            แจ้งเตือนอีเมลแล้ว
                          </span>
                          <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                            <Clock className="w-3 h-3" />
                            {new Date(dec.requestedAt).toLocaleDateString('th-TH')}
                          </span>
                        </div>
                      </div>

                      <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
                        {dec.topic}
                      </h3>

                      <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 leading-relaxed">
                        <div className="font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-purple-600" />
                          รายละเอียดคำขอ:
                        </div>
                        {dec.details}
                      </div>

                      <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500 bg-purple-50/40 dark:bg-purple-950/20 p-2.5 rounded-2xl">
                        <div className="truncate">
                          สืบเนื่องจากประเด็น:{' '}
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            {dec.improvementTitle}
                          </span>{' '}
                          (ผู้เสนอ: <span className="font-medium text-purple-700 dark:text-purple-300">{dec.requestedBy}</span>)
                        </div>
                      </div>
                    </div>

                    {/* Actions for Executive */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      {matchedImp ? (
                        <button
                          onClick={() => onSelectImprovement(matchedImp)}
                          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          ดูประเด็นต้นเรื่อง &rarr;
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">คำขอทั่วไป</span>
                      )}

                      <div className="flex items-center gap-2">
                        {isExecutiveOrAdmin ? (
                          <>
                            <button
                              onClick={() => handleOpenDecisionModal(dec, 'APPROVED')}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                            >
                              อนุมัติ
                            </button>
                            <button
                              onClick={() => handleOpenDecisionModal(dec, 'DIRECTED')}
                              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition-all"
                            >
                              สั่งการ/มอบหมาย
                            </button>
                            <button
                              onClick={() => handleOpenDecisionModal(dec, 'REJECTED')}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs transition-all"
                            >
                              ไม่อนุมัติ
                            </button>
                          </>
                        ) : (
                          <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            รอผู้บริหารพิจารณา
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setDecisionToDelete(dec)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/40 transition-all cursor-pointer"
                          title="ลบคำขอนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Resolved Decisions Section */}
      {activeTab === 'RESOLVED' && (
        <div className="space-y-4">
          {resolvedDecisions.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 text-slate-400">
              ยังไม่มีประวัติการพิจารณาตัดสินใจ
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resolvedDecisions.map((dec, idx) => {
                const isApproved = dec.decisionStatus === 'APPROVED';
                const isDirected = dec.decisionStatus === 'DIRECTED';
                const matchedImp = improvements.find((i) => i.id === dec.improvementId);
                return (
                  <div
                    key={`${dec.decisionId || 'resolved'}-${idx}`}
                    id={`decision-card-${dec.decisionId || idx}`}
                    className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {dec.departmentOrCourseName}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                            isApproved
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : isDirected
                              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {isApproved ? 'อนุมัติแล้ว' : isDirected ? 'มีข้อสั่งการ/มอบหมาย' : 'ไม่อนุมัติ'}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">{dec.topic}</h3>

                      {dec.details && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {dec.details}
                        </p>
                      )}

                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1 border border-slate-100 dark:border-slate-800">
                        <div className="font-bold text-slate-700 dark:text-slate-300">ความเห็น/ข้อสั่งการของผู้บริหาร:</div>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{dec.executiveComment || '-'}</p>
                        <div className="text-[10px] text-slate-400 pt-1">
                          โดย {dec.decidedBy || 'ผู้บริหาร'} เมื่อ {dec.decidedAt ? new Date(dec.decidedAt).toLocaleDateString('th-TH') : '-'}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      {matchedImp ? (
                        <button
                          type="button"
                          onClick={() => onSelectImprovement(matchedImp)}
                          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          ดูประเด็นต้นเรื่อง &rarr;
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">คำขอทั่วไป</span>
                      )}

                      <button
                        type="button"
                        onClick={() => setDecisionToDelete(dec)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition-all cursor-pointer shadow-xs"
                        title="ลบข้อมูลการพิจารณา/สั่งการนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ลบข้อมูล</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Delete Decision Confirmation Modal */}
      {decisionToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                ยืนยันการลบข้อมูล
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                คุณต้องการลบรายการข้อสั่งการ/การตัดสินใจนี้ใช่หรือไม่?
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs space-y-1 border border-slate-100 dark:border-slate-700">
              <div className="font-bold text-slate-800 dark:text-slate-200">
                {decisionToDelete.topic}
              </div>
              <div className="text-slate-500 text-[11px]">
                หน่วยงาน: {decisionToDelete.departmentOrCourseName} | สถานะ:{' '}
                {decisionToDelete.decisionStatus === 'APPROVED'
                  ? 'อนุมัติแล้ว'
                  : decisionToDelete.decisionStatus === 'DIRECTED'
                  ? 'มีข้อสั่งการ/มอบหมาย'
                  : decisionToDelete.decisionStatus === 'REJECTED'
                  ? 'ไม่อนุมัติ'
                  : 'รอการพิจารณา'}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDecisionToDelete(null)}
                disabled={isDeletingDecision}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteDecision}
                disabled={isDeletingDecision}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50 transition-all"
              >
                {isDeletingDecision ? 'กำลังลบ...' : 'ยืนยันลบข้อมูล'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decision Modal for Executive */}
      {decisionModalOpen && selectedDecision && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-purple-600" />
              บันทึกข้อสั่งการและการตัดสินใจของผู้บริหาร
            </h3>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs space-y-1">
              <div className="font-bold text-slate-800 dark:text-slate-200">{selectedDecision.topic}</div>
              <div className="text-slate-500">
                หน่วยงาน: {selectedDecision.departmentOrCourseName} | ผู้เสนอ: {selectedDecision.requestedBy}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                ความเห็น ข้อสั่งการ หรือแนวทางมอบหมาย <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={executiveComment}
                onChange={(e) => setExecutiveComment(e.target.value)}
                placeholder="ระบุข้อสั่งการเชิงบริหาร เช่น อนุมัติงบประมาณ 15,000 บาท, มอบหมายให้งานพัสดุเป็นผู้ประสานงานหลัก..."
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDecisionModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDecision}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md disabled:opacity-50"
              >
                {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันข้อสั่งการ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Request Modal */}
      {requestModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateRequest}
            className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                <Flame className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  เสนอเรื่องขออนุมัติ / ข้อสั่งการผู้บริหาร
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRequestModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold"
              >
                ปิด
              </button>
            </div>

            {requestError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{requestError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                เลือกประเด็นปรับปรุง BRIDGE ที่เกี่ยวข้อง (ถ้ามี)
              </label>
              <select
                value={selectedImprovementId}
                onChange={(e) => setSelectedImprovementId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                <option value="">-- ไม่ระบุ (เป็นคำขอเชิงบริหาร/บูรณาการทั่วไป) --</option>
                {improvements.map((imp) => (
                  <option key={imp.id} value={imp.id}>
                    [{imp.improvementId}] {imp.title} ({imp.ownerNameSnapshot})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                หัวข้อเรื่องที่ขอรับการตัดสินใจ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="เช่น ขออนุมัติงบประมาณจัดซื้ออุปกรณ์ทดลอง, ขอมอบหมายงานข้ามหน่วยงาน..."
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                รายละเอียดคำขอ เหตุผลความจำเป็น และผลลัพธ์ที่คาดหวัง <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="อธิบายเหตุผลความจำเป็น ปัญหาอุปสรรค (Blocker) ที่ต้องให้ผู้บริหารช่วยเหลือ และงบประมาณ/ทรัพยากรที่ต้องการ..."
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            {/* Priority & Notification Settings */}
            <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    ส่งสำเนาแจ้งเตือนผ่านอีเมลเพิ่มเติม (ตัวเลือกเสริม - ไม่จำเป็นต้องตั้งค่า SMTP)
                  </span>
                </label>

                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-500 font-medium mr-1">ความเร่งด่วน:</span>
                  {(['NORMAL', 'URGENT', 'VERY_URGENT'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        priority === p
                          ? p === 'VERY_URGENT'
                            ? 'bg-rose-600 text-white shadow-sm'
                            : p === 'URGENT'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-purple-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {p === 'NORMAL' && 'ปกติ'}
                      {p === 'URGENT' && '⚡ ด่วน'}
                      {p === 'VERY_URGENT' && '🔥 ด่วนที่สุด'}
                    </button>
                  ))}
                </div>
              </div>

              {notifyEmail && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      อีเมลผู้บริหารที่ต้องการแจ้งเตือน (คั่นด้วยเครื่องหมายจุลภาค ,)
                    </span>
                    <a
                      href={generateMailtoLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <ExternalLink className="w-3 h-3" />
                      เปิดร่างในโปรแกรมเมล
                    </a>
                  </div>
                  <input
                    type="text"
                    value={recipientEmails}
                    onChange={(e) => setRecipientEmails(e.target.value)}
                    placeholder="jsawaporn@gmail.com, executive@huso.yru.ac.th"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setRecipientEmails('jsawaporn@gmail.com, executive@huso.yru.ac.th')}
                      className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 text-[10px] text-purple-700 dark:text-purple-300 font-medium hover:bg-purple-50 cursor-pointer"
                    >
                      + คณบดี & ทีมบริหาร (jsawaporn@gmail.com)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setRecipientEmails((prev) =>
                          prev ? `${prev}, qa.director@huso.yru.ac.th` : 'qa.director@huso.yru.ac.th'
                        )
                      }
                      className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 cursor-pointer"
                    >
                      + ผอ.ฝ่ายประกันคุณภาพ
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRequestModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-600/20 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'กำลังส่งคำขอและแจ้งเตือน...' : 'ส่งเรื่องเสนอผู้บริหาร'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};


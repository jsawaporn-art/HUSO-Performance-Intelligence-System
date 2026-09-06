import React, { useState, useEffect } from 'react';
import {
  BridgeImprovement,
  BRIDGE_STEPS,
  BridgeStep,
  BridgeAiAnalysisResult,
} from '../../types/bridge';
import { getPriorityConfig } from '../../lib/bridgePriorityUtils';
import { User } from '../../types';
import {
  X,
  Printer,
  FileEdit,
  Clock,
  CheckCircle2,
  Building2,
  GraduationCap,
  Calendar,
  Users,
  Target,
  Sparkles,
  Layers,
  Award,
  Flame,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Save,
  FileText,
  Zap,
  Lightbulb,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { bridgeService } from '../../lib/bridgeService';

export interface BridgeIssueAiSummaryData {
  executiveSummary: string;
  keyAchievements: string[];
  customerImpact: string;
  processEfficiencyGain: string;
  remainingChallenges: string;
  nextActionPlan: string;
  executiveRecommendations: string[];
  overallRating: 'EXCELLENT' | 'GOOD' | 'ON_TRACK' | 'NEEDS_ATTENTION';
  ratingReason: string;
  generatedAt: string;
  aiModel?: string;
}

interface BridgeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: BridgeImprovement | null;
  currentUser: User | null;
  onOpenEdit: (item: BridgeImprovement) => void;
  onOpenProgress: (item: BridgeImprovement) => void;
  onOpenAiSummary?: (item: BridgeImprovement) => void;
  onDelete?: (item: BridgeImprovement, autoRenumber?: boolean) => void;
  onStartOperation?: (item: BridgeImprovement) => void;
  onUpdateImprovement?: (updated: BridgeImprovement) => void;
}

export const BridgeDetailModal: React.FC<BridgeDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  currentUser,
  onOpenEdit,
  onOpenProgress,
  onOpenAiSummary,
  onDelete,
  onStartOperation,
  onUpdateImprovement,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'AI_REPORT' | 'ANALYSIS' | 'PLAN' | 'OUTCOMES' | 'HISTORY'>('OVERVIEW');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [autoRenumberOnDelete, setAutoRenumberOnDelete] = useState(true);
  const [isStartingOperation, setIsStartingOperation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Gemini AI Auto-Summarized Brief Report State
  const [aiSummary, setAiSummary] = useState<BridgeIssueAiSummaryData | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isSavingAi, setIsSavingAi] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Synchronize AI Summary when item changes or modal opens
  useEffect(() => {
    if (isOpen && item) {
      setAiError(null);
      setSaveSuccess(false);
      setCopied(false);

      if (item.aiAnalysisResult?.aiSummary) {
        setAiSummary({
          executiveSummary: item.aiAnalysisResult.aiSummary,
          keyAchievements: [
            `ขับเคลื่อนกระบวนการ ${item.workDomain} บรรลุความก้าวหน้า ${item.currentProgressPercentage || 0}%`,
            item.improvementApproach ? `ดำเนินมาตรการ: ${item.improvementApproach}` : 'จัดทำคู่มือและแนวทางปฏิบัติงาน',
            item.edpexResultImprovementDetail || 'อยู่ระหว่างการประเมินผลลัพธ์เชิงประจักษ์',
          ],
          customerImpact: item.edpexCustomerBenefitDetail || (item.issueDetails ? `ช่วยลดขั้นตอนและเพิ่มความสะดวกแก่ผู้รับบริการในกระบวนการ ${item.workDomain}` : 'ผู้รับบริการได้รับความสะดวกและพึงพอใจเพิ่มขึ้น'),
          processEfficiencyGain: `ลดขั้นตอนซ้ำซ้อนและเพิ่มความคล่องตัวในการปฏิบัติงานของ ${item.ownerNameSnapshot}`,
          remainingChallenges: 'การติดตามผลการปฏิบัติตามมาตรฐานใหม่อย่างต่อเนื่อง',
          nextActionPlan: 'ดำเนินงานตามกิจกรรมย่อยที่เหลือให้ครบถ้วน 100%',
          executiveRecommendations: [
            `ให้ความเห็นชอบผลการดำเนินงานประเด็น "${item.title}"`,
            'มอบหมายให้ติดตามผลลัพธ์ความพึงพอใจของผู้รับบริการและรายงานในรอบถัดไป',
          ],
          overallRating: (item.currentProgressPercentage || 0) >= 80 ? 'GOOD' : 'ON_TRACK',
          ratingReason: `มีความก้าวหน้า ${item.currentProgressPercentage || 0}%`,
          generatedAt: item.aiAnalysisResult.generatedAt || new Date().toISOString(),
          aiModel: item.aiAnalysisResult.aiModel || 'gemini-3.7-flash',
        });
      } else {
        setAiSummary(null);
      }
    }
  }, [isOpen, item?.id]);

  if (!isOpen || !item) return null;

  const isDraft = item.overallStatus === 'DRAFT' || item.lifecycleStatus === 'DRAFT' || item.workflowStatus === 'DRAFT';
  const currentStepInfo = BRIDGE_STEPS[item.currentBridgeStep || 'B'];
  const priorityConfig = getPriorityConfig(item.priority);

  const canDelete =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'ADMIN' ||
    currentUser?.userId === item.createdBy ||
    !currentUser; // fallback to allow authorized actions if handled by service

  const handlePrint = () => {
    window.print();
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleExecuteDelete = async () => {
    if (!onDelete || !item) return;
    setIsDeleting(true);
    try {
      await onDelete(item, autoRenumberOnDelete);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err) {
      console.error('Error deleting bridge improvement:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Generate Auto-Summarized Report using server-side Gemini API (gemini-3.7-flash)
  const handleGenerateAiSummary = async () => {
    if (!item) return;
    setIsGeneratingAi(true);
    setAiError(null);
    setSaveSuccess(false);

    try {
      const response = await fetch('/api/bridge/ai-synthesize-issue-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ improvement: item }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}: Failed to generate AI summary`);
      }

      const data: BridgeIssueAiSummaryData = await response.json();
      setAiSummary(data);
    } catch (err: any) {
      console.error('Error generating AI summary report in BridgeDetailModal:', err);
      setAiError(err.message || 'ไม่สามารถประมวลผลสรุปด้วย Gemini ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Copy AI Summary text to clipboard
  const handleCopySummaryText = () => {
    if (!aiSummary || !item) return;

    const formatted = `=== รายงานสรุปด่วนสำหรับผู้บริหาร (Executive Brief) ===
รหัสประเด็น: ${item.improvementId}
ชื่อประเด็น: ${item.title}
หน่วยงาน/หลักสูตร: ${item.ownerNameSnapshot}
ด้านงาน/กระบวนการ: ${item.workDomain}
ความก้าวหน้าปัจจุบัน: ${item.currentProgressPercentage || 0}% (ขั้น ${item.currentBridgeStep}: ${currentStepInfo.name})

【บทสรุปภาพรวม (Executive Summary)】
${aiSummary.executiveSummary}

【ผลสำเร็จสำคัญ (Key Achievements)】
${(aiSummary.keyAchievements || []).map((ach, i) => `${i + 1}. ${ach}`).join('\n')}

【คุณค่าต่อผู้รับบริการ (VOC / Customer Impact)】
${aiSummary.customerImpact || '-'}

【ประสิทธิภาพและการลดขั้นตอน (Process Efficiency Gain)】
${aiSummary.processEfficiencyGain || '-'}

【ข้อเสนอแนะเชิงนโยบายสำหรับผู้บริหาร (Executive Recommendations)】
${(aiSummary.executiveRecommendations || []).map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

---
ประมวลผลด้วย Google Gemini (${aiSummary.aiModel || 'gemini-3.7-flash'}) เมื่อ: ${new Date(aiSummary.generatedAt).toLocaleString('th-TH')}`;

    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Save generated AI summary into Firestore and local state
  const handleSaveAiSummary = async () => {
    if (!aiSummary || !item) return;
    setIsSavingAi(true);
    setSaveSuccess(false);

    try {
      const updatedAiAnalysisResult: BridgeAiAnalysisResult = {
        ...(item.aiAnalysisResult || { probableRootCauses: [] }),
        aiSummary: aiSummary.executiveSummary,
        aiModel: aiSummary.aiModel || 'gemini-3.7-flash',
        generatedAt: aiSummary.generatedAt || new Date().toISOString(),
      };

      const updated = await bridgeService.update(
        item.id,
        {
          aiAnalysisResult: updatedAiAnalysisResult,
        },
        {
          userId: currentUser?.userId || 'SYSTEM',
          userName: currentUser?.fullName || 'ผู้ใช้งาน',
          role: currentUser?.role || 'USER',
        }
      );

      if (onUpdateImprovement) {
        onUpdateImprovement(updated);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      console.error('Error saving AI summary to bridge improvement:', err);
      setAiError(err.message || 'บันทึกบทสรุปไม่สำเร็จ');
    } finally {
      setIsSavingAi(false);
    }
  };

  const renderAiSummaryCard = () => {
    if (isGeneratingAi) {
      return (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-blue-500/5 to-indigo-500/10 border border-amber-300/60 dark:border-amber-700/60 shadow-sm animate-pulse space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <span>กำลังสังเคราะห์บทสรุปผู้บริหารด้วย Google Gemini</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                    gemini-3.7-flash
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  กำลังวิเคราะห์ปัญหา รากสาเหตุ มาตรการ ความก้าวหน้า ({item.currentProgressPercentage || 0}%) และประโยชน์เชิงประจักษ์...
                </div>
              </div>
            </div>
            <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">กำลังประมวลผล...</div>
          </div>
          <div className="space-y-2 pt-2">
            <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded-full w-full" />
            <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded-full w-5/6" />
            <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded-full w-4/6" />
          </div>
        </div>
      );
    }

    if (aiSummary) {
      const getRatingBadge = (rating: string) => {
        switch (rating) {
          case 'EXCELLENT':
            return {
              label: 'ผลสัมฤทธิ์ดีเยี่ยม',
              color: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
            };
          case 'GOOD':
            return {
              label: 'ผลสัมฤทธิ์ดี',
              color: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800',
            };
          case 'ON_TRACK':
            return {
              label: 'ดำเนินงานตามแผน',
              color: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
            };
          default:
            return {
              label: 'ต้องติดตามใกล้ชิด',
              color: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
            };
        }
      };

      const ratingBadge = getRatingBadge(aiSummary.overallRating);

      return (
        <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-50 to-blue-500/5 dark:from-amber-950/30 dark:via-slate-800/40 dark:to-blue-950/20 border border-amber-300/70 dark:border-amber-700/60 shadow-sm overflow-hidden space-y-4 p-5">
          {/* Card Header & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/60 dark:border-amber-800/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <span>บทสรุปรายงานด่วนสำหรับผู้บริหาร (Executive Brief)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-200/80 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                    {aiSummary.aiModel || 'gemini-3.7-flash'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3 h-3" />
                  <span>สังเคราะห์เมื่อ: {new Date(aiSummary.generatedAt).toLocaleString('th-TH')}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="btn-copy-ai-summary-detail"
                onClick={handleCopySummaryText}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer transition-all"
                title="คัดลอกข้อความสรุปทั้งหมดไปที่คลิปบอร์ด"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอก'}</span>
              </button>

              <button
                id="btn-save-ai-summary-detail"
                onClick={handleSaveAiSummary}
                disabled={isSavingAi}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer transition-all disabled:opacity-50"
                title="บันทึกบทสรุปนี้ลงในฐานข้อมูลประเด็นปรับปรุง"
              >
                {saveSuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Save className="w-3.5 h-3.5 text-blue-600" />}
                <span>{saveSuccess ? 'บันทึกสำเร็จ!' : isSavingAi ? 'กำลังบันทึก...' : 'บันทึกเก็บ'}</span>
              </button>

              <button
                id="btn-regenerate-ai-summary-detail"
                onClick={handleGenerateAiSummary}
                disabled={isGeneratingAi}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-xs cursor-pointer transition-all disabled:opacity-50"
                title="สังเคราะห์และสรุปผลใหม่ด้วย Gemini API"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                <span>สรุปใหม่</span>
              </button>

              {onOpenAiSummary && (
                <button
                  id="btn-open-full-ai-modal"
                  onClick={() => onOpenAiSummary(item)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
                  title="เปิดหน้าต่างรายงานผู้บริหารฉบับเต็ม / ดาวน์โหลด PDF"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>รายงานเต็ม/PDF</span>
                </button>
              )}
            </div>
          </div>

          {/* Status & Rating Pill */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${ratingBadge.color}`}>
              <Award className="w-3.5 h-3.5" />
              <span>{ratingBadge.label}</span>
            </span>
            {aiSummary.ratingReason && (
              <span className="text-xs text-slate-600 dark:text-slate-400">
                ({aiSummary.ratingReason})
              </span>
            )}
          </div>

          {/* Executive Summary Paragraph */}
          <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-2">
            <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>สาระสำคัญภาพรวม (Executive Summary):</span>
            </div>
            <div className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">
              {aiSummary.executiveSummary}
            </div>
          </div>

          {/* Key Achievements Bullet Highlights */}
          {aiSummary.keyAchievements && aiSummary.keyAchievements.length > 0 && (
            <div className="space-y-1.5">
              <div className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>ผลสำเร็จและมาตรการสำคัญ (Key Achievements):</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {aiSummary.keyAchievements.map((ach, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-emerald-100 dark:border-emerald-900/40 text-slate-700 dark:text-slate-300 text-xs flex items-start gap-2"
                  >
                    <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-snug">{ach}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2-Column Impact Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Customer Value / VOC */}
            <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/50 space-y-1">
              <div className="font-bold text-purple-900 dark:text-purple-200 text-[11px] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-600" />
                <span>คุณค่าต่อผู้รับบริการ (VOC / Customer Impact):</span>
              </div>
              <div className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                {aiSummary.customerImpact || '-'}
              </div>
            </div>

            {/* Process Efficiency Gain */}
            <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/50 space-y-1">
              <div className="font-bold text-blue-900 dark:text-blue-200 text-[11px] flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                <span>ประสิทธิภาพและการลดขั้นตอน (Efficiency Gain):</span>
              </div>
              <div className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                {aiSummary.processEfficiencyGain || '-'}
              </div>
            </div>
          </div>

          {/* Executive Policy Recommendations */}
          {aiSummary.executiveRecommendations && aiSummary.executiveRecommendations.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 space-y-1.5">
              <div className="font-bold text-amber-950 dark:text-amber-200 text-xs flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                <span>ข้อเสนอแนะเชิงนโยบายสำหรับผู้บริหาร (Executive Recommendations):</span>
              </div>
              <ul className="space-y-1 pl-1">
                {aiSummary.executiveRecommendations.map((rec, idx) => (
                  <li key={idx} className="text-slate-700 dark:text-slate-300 text-xs flex items-start gap-2">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    // Default Banner when not generated yet
    return (
      <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-50 to-blue-500/5 dark:from-amber-950/30 dark:via-slate-800/40 dark:to-blue-950/20 border border-amber-300/60 dark:border-amber-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20 shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <span>รายงานสรุปด่วนสำหรับผู้บริหารด้วย Gemini AI</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                gemini-3.7-flash
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed max-w-xl">
              สังเคราะห์ข้อเท็จจริง สภาพปัญหา รากสาเหตุ มาตรการปรับปรุง ความก้าวหน้า ({item.currentProgressPercentage || 0}%) และประโยชน์ต่อผู้รับบริการ ออกมาเป็นบทสรุปผู้บริหารกระชับทันที
            </p>
            {aiError && (
              <div className="text-rose-600 text-xs font-semibold mt-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{aiError}</span>
              </div>
            )}
          </div>
        </div>

        <button
          id="btn-trigger-ai-summary-detail"
          onClick={handleGenerateAiSummary}
          disabled={isGeneratingAi}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all shrink-0 cursor-pointer disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4 text-slate-950" />
          <span>สร้างบทสรุปด่วนด้วย AI</span>
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-lg border border-blue-200/50">
                {item.improvementId}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-xs font-bold ${priorityConfig.badgeBg} ${priorityConfig.badgeText} ${priorityConfig.borderColor}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${priorityConfig.dotColor}`} />
                {priorityConfig.thaiLabel}
              </span>
              <span className={`px-2.5 py-0.5 rounded-lg font-bold ${currentStepInfo.badgeBg} ${currentStepInfo.badgeText}`}>
                ขั้น {item.currentBridgeStep}: {currentStepInfo.name}
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                {item.ownerType === 'COURSE' ? <GraduationCap className="w-3.5 h-3.5 text-purple-500" /> : <Building2 className="w-3.5 h-3.5 text-blue-500" />}
                {item.ownerNameSnapshot}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug">
              {item.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isDraft && onStartOperation && (
              <button
                id="btn-start-action-header"
                onClick={async () => {
                  setIsStartingOperation(true);
                  try {
                    await onStartOperation(item);
                  } finally {
                    setIsStartingOperation(false);
                  }
                }}
                disabled={isStartingOperation}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isStartingOperation ? 'กำลังเริ่ม...' : 'เริ่มดำเนินการ (Start Action)'}</span>
              </button>
            )}
            <button
              id="btn-ai-summary-header"
              onClick={() => {
                setActiveTab('AI_REPORT');
                if (!aiSummary && !isGeneratingAi) {
                  handleGenerateAiSummary();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              title="ดูบทสรุปรายงานผู้บริหารด้วย Gemini AI"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>สรุปรายงาน AI</span>
            </button>
            <button
              id="btn-bridge-detail-edit-header"
              onClick={() => onOpenEdit(item)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
              title="แก้ไขข้อมูลประเด็น"
            >
              <FileEdit className="w-4 h-4" />
              <span>แก้ไข</span>
            </button>
            <button
              id="btn-bridge-detail-print-header"
              onClick={handlePrint}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer transition-all"
              title="พิมพ์รายงาน A4"
            >
              <Printer className="w-4 h-4" />
            </button>
            {canDelete && onDelete && (
              <button
                id="btn-bridge-detail-delete-header"
                onClick={handleDeleteClick}
                className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 cursor-pointer transition-all border border-rose-200/50 dark:border-rose-900/50"
                title="ย้ายไปถังขยะ (มีระบบยืนยันก่อนลบ)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              id="btn-bridge-detail-close-header"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* DRAFT Alert Banner & Start Action Button */}
        {isDraft && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                รายการนี้อยู่ในสถานะ <strong>แบบร่าง (DRAFT)</strong> ยังไม่ปรากฏบน Public Dashboard และรายงานผู้บริหาร
              </span>
            </div>
            {onStartOperation && (
              <button
                id="btn-start-action-banner"
                onClick={async () => {
                  setIsStartingOperation(true);
                  try {
                    await onStartOperation(item);
                  } finally {
                    setIsStartingOperation(false);
                  }
                }}
                disabled={isStartingOperation}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all shrink-0 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isStartingOperation ? 'กำลังเปลี่ยนสถานะ...' : 'เริ่มดำเนินการ (Start Action)'}
              </button>
            )}
          </div>
        )}

        {/* 6-Step Visual Step Tracker */}
        <div className="px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-[600px]">
            {(['B', 'R', 'I', 'D', 'G', 'E'] as BridgeStep[]).map((stepCode) => {
              const step = BRIDGE_STEPS[stepCode];
              const isCurrent = item.currentBridgeStep === stepCode;
              return (
                <div
                  key={stepCode}
                  className={`flex-1 p-2 rounded-xl border text-left text-xs transition-all ${
                    isCurrent
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/40 text-slate-500 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{stepCode}</span>
                    <span className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-amber-400' : 'bg-slate-300'}`} />
                  </div>
                  <div className="truncate font-semibold text-[11px] mt-0.5">{step.name}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 border-b border-slate-100 dark:border-slate-800 text-xs font-bold overflow-x-auto">
          {[
            { key: 'OVERVIEW', label: 'ภาพรวม & ข้อเท็จจริง' },
            { key: 'AI_REPORT', label: '✨ รายงานสรุป AI (Gemini)' },
            { key: 'ANALYSIS', label: 'การวิเคราะห์รากสาเหตุ' },
            { key: 'PLAN', label: 'แผนงาน & Action Items' },
            { key: 'OUTCOMES', label: 'ผลลัพธ์ & EdPEx' },
            { key: 'HISTORY', label: 'ประวัติ & ข้อสั่งการ' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as any);
                if (tab.key === 'AI_REPORT' && !aiSummary && !isGeneratingAi) {
                  handleGenerateAiSummary();
                }
              }}
              className={`py-3 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-800 dark:text-slate-200">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-5">
              {/* Prominent Gemini AI Auto-Summarized Brief Card */}
              {renderAiSummaryCard()}

              {/* Fact Details */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="font-bold text-slate-900 dark:text-white text-sm">รายละเอียดสิ่งที่พบ (Fact):</div>
                <div className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {item.issueDetails}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="text-slate-400 text-[11px]">ประเภทประเด็น</div>
                  <div className="font-bold text-slate-900 dark:text-white mt-1">{item.issueType}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="text-slate-400 text-[11px]">ด้านงาน/กระบวนการ</div>
                  <div className="font-bold text-slate-900 dark:text-white mt-1">{item.workDomain}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="text-slate-400 text-[11px]">แหล่งที่มา</div>
                  <div className="font-bold text-slate-900 dark:text-white mt-1">{item.issueSource}</div>
                </div>
              </div>

              {item.relatedIndicatorName && (
                <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <div>
                    <span className="text-slate-500">เชื่อมโยง KPI/KVI: </span>
                    <span className="font-bold text-indigo-900 dark:text-indigo-200">{item.relatedIndicatorName}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AI_REPORT (Dedicated Full View) */}
          {activeTab === 'AI_REPORT' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <span>รายงานการสังเคราะห์และประเมินผลโดย Gemini AI</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    รายงานสังเคราะห์สรุปผลด่วนสำหรับผู้บริหารตามมาตรฐาน BRIDGE & EdPEx
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGenerateAiSummary}
                    disabled={isGeneratingAi}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                    <span>{isGeneratingAi ? 'กำลังวิเคราะห์...' : 'วิเคราะห์สรุปใหม่'}</span>
                  </button>
                </div>
              </div>

              {renderAiSummaryCard()}
            </div>
          )}

          {/* TAB 3: ANALYSIS */}
          {activeTab === 'ANALYSIS' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="font-bold text-slate-700 dark:text-slate-300">สภาพปัจจุบัน (Current State)</div>
                  <div className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{item.currentState || '-'}</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="font-bold text-slate-700 dark:text-slate-300">สภาพที่ต้องการ (Desired State)</div>
                  <div className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{item.desiredState || '-'}</div>
                </div>
              </div>

              {/* Probable Causes & Verification Status */}
              {(item.probableCauses || item.verifiedRootCauses) && (
                <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-amber-900 dark:text-amber-200">
                      สาเหตุที่เป็นไปได้ (Probable Root Causes):
                    </div>
                    <div>
                      {item.causeVerificationStatus === 'VERIFIED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          ✓ ตรวจสอบและยืนยันแล้ว
                        </span>
                      ) : item.causeVerificationStatus === 'NEEDS_FURTHER_CHECK' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          ⚠️ ต้องตรวจสอบหน้างานเพิ่มเติม
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                          ⏳ รอการตรวจสอบหน้างาน
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {item.verifiedRootCauses || item.probableCauses}
                  </div>

                  {item.causeVerificationStatus === 'VERIFIED' && item.verifiedBy && (
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400 pt-1 border-t border-amber-200/50 dark:border-amber-900/40">
                      ตรวจสอบและยืนยันโดย: {item.verifiedBy} {item.verifiedAt ? `(${item.verifiedAt})` : ''}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PLAN */}
          {activeTab === 'PLAN' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-2">
                <div className="font-bold text-blue-900 dark:text-blue-200">แนวทางหรือมาตรการปรับปรุง (Approach):</div>
                <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{item.improvementApproach || '-'}</div>
              </div>

              {item.actionItems && item.actionItems.length > 0 && (
                <div className="space-y-2">
                  <div className="font-bold text-slate-800 dark:text-slate-200">กิจกรรมย่อย (Action Items):</div>
                  <div className="space-y-2">
                    {item.actionItems.map((act, i) => (
                      <div
                        key={act.actionId || i}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{act.title}</div>
                          <div className="text-slate-400 text-[11px]">
                            ผู้รับผิดชอบ: {act.responsiblePersonName} | กำหนดเสร็จ: {act.targetEndDate}
                          </div>
                        </div>
                        <div className="font-bold text-blue-600">น.น. {act.weight}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: OUTCOMES */}
          {activeTab === 'OUTCOMES' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-2">
                <div className="font-bold text-emerald-900 dark:text-emerald-200">
                  ผลสัมฤทธิ์และความก้าวหน้า ({item.currentProgressPercentage || 0}%):
                </div>
                <div className="text-slate-700 dark:text-slate-300">
                  {item.edpexResultImprovementDetail || 'อยู่ระหว่างดำเนินมาตรการ'}
                </div>
              </div>

              {item.edpexCustomerBenefitDetail && (
                <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 space-y-1">
                  <div className="font-bold text-purple-900 dark:text-purple-200">คุณค่าต่อผู้รับบริการ (Customer Impact):</div>
                  <div className="text-slate-700 dark:text-slate-300">{item.edpexCustomerBenefitDetail}</div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: HISTORY */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500">
                เวอร์ชันข้อมูล: v{item.version || 1} | สร้างเมื่อ: {new Date(item.createdAt).toLocaleString('th-TH')}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {isDraft && onStartOperation && (
              <button
                id="btn-start-action-footer"
                onClick={async () => {
                  setIsStartingOperation(true);
                  try {
                    await onStartOperation(item);
                  } finally {
                    setIsStartingOperation(false);
                  }
                }}
                disabled={isStartingOperation}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isStartingOperation ? 'กำลังเริ่ม...' : 'เริ่มดำเนินการ (Start Action)'}</span>
              </button>
            )}
            <button
              onClick={() => onOpenProgress(item)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md cursor-pointer"
            >
              บันทึกผลความก้าวหน้า
            </button>
            {canDelete && onDelete && (
              <button
                id="btn-bridge-detail-delete-footer"
                onClick={handleDeleteClick}
                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-rose-200/50 dark:border-rose-900/50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ย้ายไปถังขยะ</span>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

        {/* Soft Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    ยืนยันการย้ายประเด็นปรับปรุงไปถังขยะ?
                  </h3>
                  <div className="text-xs text-slate-500 font-mono">{item.improvementId}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2">
                  {item.title}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  หน่วยงาน: {item.ownerNameSnapshot}
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                รายการนี้จะถูกย้ายไปที่ถังขยะ (Soft Delete) เพื่อป้องกันการลบโดยไม่ตั้งใจ และผู้ดูแลระบบสามารถกู้คืนได้ภายหลัง
              </p>

              {/* Auto renumber checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRenumberOnDelete}
                  onChange={(e) => setAutoRenumberOnDelete(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  รันและจัดระเบียบเลขรหัส BRG ของรายการที่เหลือใหม่อัตโนมัติ (เช่น BRG-2569-0001, 0002... เรียงต่อเนื่อง)
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  id="btn-cancel-delete-bridge"
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  id="btn-confirm-delete-bridge"
                  type="button"
                  onClick={handleExecuteDelete}
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
      </div>
    </div>
  );
};


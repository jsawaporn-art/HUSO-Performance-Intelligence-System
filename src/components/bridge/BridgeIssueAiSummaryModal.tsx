import React, { useState, useEffect, useRef } from 'react';
import {
  BridgeImprovement,
  BRIDGE_STEPS,
  BridgeStep,
} from '../../types/bridge';
import { getPriorityConfig } from '../../lib/bridgePriorityUtils';
import { User } from '../../types';
import {
  X,
  Sparkles,
  Printer,
  Download,
  Copy,
  Check,
  RefreshCw,
  Award,
  Building2,
  GraduationCap,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Save,
  Layers,
  ChevronRight,
  ShieldCheck,
  Send,
  HelpCircle,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
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

interface BridgeIssueAiSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: BridgeImprovement | null;
  currentUser: User | null;
  onUpdateImprovement?: (updated: BridgeImprovement) => void;
}

export const BridgeIssueAiSummaryModal: React.FC<BridgeIssueAiSummaryModalProps> = ({
  isOpen,
  onClose,
  item,
  currentUser,
  onUpdateImprovement,
}) => {
  const [summaryData, setSummaryData] = useState<BridgeIssueAiSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'SUMMARY_VIEW' | 'PRINT_PREVIEW'>('SUMMARY_VIEW');

  // Signatures for Print/PDF
  const [submitterName, setSubmitterName] = useState<string>(currentUser?.fullName || 'ผู้รับผิดชอบหลัก');
  const [submitterPosition, setSubmitterPosition] = useState<string>('ผู้รับผิดชอบประเด็นปรับปรุง');
  const [approverName, setApproverName] = useState<string>('ผศ.สวพร จันทรสกุล');
  const [approverPosition, setApproverPosition] = useState<string>('คณบดีคณะมนุษยศาสตร์และสังคมศาสตร์');

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Auto-generate or load when opening modal with a new item
  useEffect(() => {
    if (isOpen && item) {
      // If item already has a stored executive AI summary or cached analysis
      if (item.aiAnalysisResult?.aiSummary) {
        setSummaryData({
          executiveSummary: item.aiAnalysisResult.aiSummary || `ประเด็นปรับปรุง "${item.title}" [${item.improvementId}] ของ ${item.ownerNameSnapshot} มีความก้าวหน้า ${item.currentProgressPercentage || 0}%`,
          keyAchievements: [
            `ขับเคลื่อนกระบวนการ ${item.workDomain} บรรลุความก้าวหน้า ${item.currentProgressPercentage || 0}%`,
            item.improvementApproach ? `ดำเนินมาตรการ: ${item.improvementApproach}` : 'จัดทำคู่มือและแนวทางปฏิบัติงาน',
            item.edpexResultImprovementDetail || 'อยู่ระหว่างการประเมินผลลัพธ์เชิงประจักษ์',
          ],
          customerImpact: item.edpexCustomerBenefitDetail || 'ผู้รับบริการได้รับความสะดวกและรวดเร็วยิ่งขึ้น',
          processEfficiencyGain: `ลดขั้นตอนซ้ำซ้อนและเพิ่มความคล่องตัวในการปฏิบัติงานของ ${item.ownerNameSnapshot}`,
          remainingChallenges: 'การติดตามผลการปฏิบัติตามมาตรฐานใหม่อย่างต่อเนื่อง',
          nextActionPlan: 'ดำเนินงานตามกิจกรรมย่อยที่เหลือให้ครบถ้วน 100%',
          executiveRecommendations: [
            `ให้ความเห็นชอบผลการดำเนินงานประเด็น "${item.title}"`,
            'มอบหมายให้ติดตามผลลัพธ์ความพึงพอใจและรายงานในรอบถัดไป',
          ],
          overallRating: (item.currentProgressPercentage || 0) >= 80 ? 'GOOD' : 'ON_TRACK',
          ratingReason: `มีความก้าวหน้า ${item.currentProgressPercentage || 0}%`,
          generatedAt: item.aiAnalysisResult.generatedAt || new Date().toISOString(),
          aiModel: item.aiAnalysisResult.aiModel || 'gemini-3.7-flash',
        });
      } else {
        handleGenerateAiSummary();
      }

      setSubmitterName(item.primaryResponsiblePersonName || currentUser?.fullName || 'ผู้รับผิดชอบหลัก');
    }
  }, [isOpen, item?.id]);

  if (!isOpen || !item) return null;

  const currentStepInfo = BRIDGE_STEPS[item.currentBridgeStep || 'B'];
  const priorityConfig = getPriorityConfig(item.priority);

  // Call Server-side Gemini Synthesis API
  const handleGenerateAiSummary = async () => {
    if (!item) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/bridge/ai-synthesize-issue-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ improvement: item }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'ไม่สามารถประมวลผลสรุปด้วย AI ได้');
      }

      const data: BridgeIssueAiSummaryData = await response.json();
      setSummaryData(data);
    } catch (err: any) {
      console.warn('AI Summary Generation fallback:', err);
      // Fallback synthesis from item state
      setSummaryData({
        executiveSummary: `ประเด็นปรับปรุงงาน "${item.title}" [${item.improvementId}] ของ ${item.ownerNameSnapshot} มีความก้าวหน้ารวม ${item.currentProgressPercentage || 0}% โดยได้ดำเนินการขับเคลื่อนตามขั้นตอน BRIDGE Model ในขั้น ${item.currentBridgeStep} (${currentStepInfo.name}) เพื่อแก้ไขปัญหาในด้าน ${item.workDomain}`,
        keyAchievements: [
          `มีความก้าวหน้ารวม ${item.currentProgressPercentage || 0}% ในกระบวนการ ${item.workDomain}`,
          item.improvementApproach ? `ดำเนินมาตรการ: ${item.improvementApproach}` : 'จัดทำมาตรฐานขั้นตอนการทำงาน (SOP)',
          item.edpexResultImprovementDetail || 'ผลการดำเนินงานเป็นไปตามแผนงานที่กำหนด',
        ],
        customerImpact: item.edpexCustomerBenefitDetail || 'ผู้รับบริการได้รับความสะดวกรวดเร็วและลดข้อผิดพลาดในกระบวนการ',
        processEfficiencyGain: `ลดขั้นตอนซ้ำซ้อนและเพิ่มความคล่องตัวในการปฏิบัติงานของ ${item.ownerNameSnapshot}`,
        remainingChallenges: 'การติดตามผลการปฏิบัติงานของบุคลากรให้เป็นมาตรฐานเดียวกันอย่างยั่งยืน',
        nextActionPlan: 'ดำเนินงานตามกิจกรรมย่อยที่เหลือและสรุปผลการประเมินความพึงพอใจรอบสุดท้าย',
        executiveRecommendations: [
          `ให้ความเห็นชอบและสนับสนุนการขับเคลื่อนประเด็น "${item.title}" ให้แล้วเสร็จตามแผน`,
          'ติดตามผลลัพธ์เชิงปริมาณและสถิติข้อร้องเรียนอย่างต่อเนื่อง',
        ],
        overallRating: (item.currentProgressPercentage || 0) >= 80 ? 'GOOD' : 'ON_TRACK',
        ratingReason: `มีความก้าวหน้ารวม ${item.currentProgressPercentage || 0}%`,
        generatedAt: new Date().toISOString(),
        aiModel: 'heuristic-local-synthesis',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Copy Summary text to Clipboard
  const handleCopyText = () => {
    if (!summaryData || !item) return;

    const formattedText = `=====================================================
รายงานสรุปผลการปรับปรุงงานตาม BRIDGE Model (Executive Brief)
คณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏยะลา
=====================================================
รหัสประเด็น: ${item.improvementId}
ชื่อประเด็น: ${item.title}
หน่วยงาน/หลักสูตร: ${item.ownerNameSnapshot} (${item.ownerType === 'COURSE' ? 'หลักสูตร' : 'หน่วยงาน'})
ด้านงาน/กระบวนการ: ${item.workDomain}
ความก้าวหน้า: ${item.currentProgressPercentage || 0}% (ขั้น ${item.currentBridgeStep}: ${currentStepInfo.name})
ความสำคัญ: ${priorityConfig.thaiLabel}

1. บทสรุปภาพรวมสำหรับผู้บริหาร (Executive Summary):
${summaryData.executiveSummary}

2. ผลสำเร็จที่สำคัญ (Key Achievements):
${summaryData.keyAchievements.map((ach, idx) => `  ${idx + 1}. ${ach}`).join('\n')}

3. ประโยชน์และคุณค่าต่อผู้รับบริการ (Customer Impact):
${summaryData.customerImpact}

4. ประสิทธิภาพและความคล่องตัวในกระบวนการ (Efficiency Gains):
${summaryData.processEfficiencyGain}

5. ปัญหาอุปสรรคและแผนงานก้าวต่อไป (Next Action Plan):
${summaryData.remainingChallenges ? `อุปสรรค: ${summaryData.remainingChallenges}\n` : ''}ก้าวต่อไป: ${summaryData.nextActionPlan}

6. ข้อเสนอแนะเชิงนโยบายสำหรับผู้บริหาร (Executive Recommendations):
${summaryData.executiveRecommendations.map((rec, idx) => `  ${idx + 1}. ${rec}`).join('\n')}

ระดับผลการดำเนินงาน: ${summaryData.overallRating} (${summaryData.ratingReason})
วันที่ประมวลผล: ${new Date(summaryData.generatedAt).toLocaleString('th-TH')}
=====================================================`;

    navigator.clipboard.writeText(formattedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Save AI summary to Firestore
  const handleSaveToIssue = async () => {
    if (!summaryData || !item) return;
    setIsSaving(true);
    try {
      const operator = {
        userId: currentUser?.userId || 'USER-01',
        userName: currentUser?.fullName || 'ผู้ใช้งาน',
        role: currentUser?.role || 'STAFF',
      };

      const updated = await bridgeService.update(
        item.id,
        {
          aiExecutiveSummary: summaryData,
          aiSummary: summaryData.executiveSummary,
          aiAnalysisResult: {
            ...item.aiAnalysisResult,
            probableRootCauses: item.aiAnalysisResult?.probableRootCauses || [],
            aiSummary: summaryData.executiveSummary,
            problemSummary: summaryData.executiveSummary,
            suggestedActions: summaryData.keyAchievements,
            confidence: summaryData.overallRating === 'EXCELLENT' ? 'HIGH' : 'MEDIUM',
            generatedAt: summaryData.generatedAt,
            aiModel: summaryData.aiModel || 'gemini-3.7-flash',
          },
          edpexCustomerBenefitDetail: summaryData.customerImpact || item.edpexCustomerBenefitDetail,
          edpexResultImprovementDetail: summaryData.keyAchievements.join(', ') || item.edpexResultImprovementDetail,
        },
        operator
      );

      if (onUpdateImprovement) {
        onUpdateImprovement(updated);
      }
      alert('✅ บันทึกข้อความสรุป AI ลงในประเด็นปรับปรุงงานเรียบร้อยแล้ว');
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาดในการบันทึก: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // High Quality PDF Download
  const handleDownloadPdf = async () => {
    const printEl = printAreaRef.current;
    if (!printEl) return;

    setIsGeneratingPdf(true);
    try {
      const canvas = await toPng(printEl, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const img = new Image();
      img.src = canvas;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const imgWidth = pdfWidth;
      const imgHeight = (img.height * pdfWidth) / img.width;

      if (imgHeight <= pdfHeight) {
        pdf.addImage(canvas, 'PNG', 0, 0, imgWidth, imgHeight);
      } else {
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(canvas, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(canvas, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;
        }
      }

      pdf.save(`Executive_Summary_${item.improvementId}_${item.title.slice(0, 20)}.pdf`);
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      alert('เกิดข้อผิดพลาดในการดาวน์โหลด PDF กรุณาใช้ปุ่มพิมพ์รายงานแทน');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Native Print with Clean Layout
  const handlePrint = () => {
    setIsPrinting(true);
    document.body.classList.add('printing-executive-report');

    // Create an isolated printable iframe
    const printElement = printAreaRef.current;
    if (!printElement) {
      window.print();
      document.body.classList.remove('printing-executive-report');
      setIsPrinting(false);
      return;
    }

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document;
    if (!frameDoc) {
      window.print();
      document.body.classList.remove('printing-executive-report');
      setIsPrinting(false);
      return;
    }

    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>รายงานสรุปผลผู้บริหาร - ${item.improvementId} ${item.title}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            body {
              font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: #0f172a;
              background: #ffffff;
              margin: 0;
              padding: 0;
              font-size: 11pt;
              line-height: 1.5;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            * {
              box-sizing: border-box;
            }
            .break-inside-avoid {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
          </style>
        </head>
        <body>
          ${printElement.innerHTML}
        </body>
      </html>
    `);
    frameDoc.close();

    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
        document.body.classList.remove('printing-executive-report');
        setIsPrinting(false);
      }, 1500);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[94vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-slate-50/80 dark:bg-slate-800/60">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold border border-amber-300/40">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                AI Executive Summary & Brief
              </span>
              <span className="font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-lg border border-blue-200/50">
                {item.improvementId}
              </span>
              <span className={`px-2.5 py-0.5 rounded-lg font-bold text-xs ${currentStepInfo.badgeBg} ${currentStepInfo.badgeText}`}>
                ขั้น {item.currentBridgeStep}: {currentStepInfo.name}
              </span>
              <span className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1">
                {item.ownerType === 'COURSE' ? <GraduationCap className="w-3.5 h-3.5 text-purple-500" /> : <Building2 className="w-3.5 h-3.5 text-blue-500" />}
                {item.ownerNameSnapshot}
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
              {item.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleGenerateAiSummary}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              title="ประมวลผลสรุปใหม่ด้วย AI"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'กำลังประมวลผล...' : 'AI สรุปผลใหม่'}</span>
            </button>

            <button
              onClick={handleCopyText}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
              title="คัดลอกข้อความสรุปทั้งหมด"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              title="ดาวน์โหลดเป็นไฟล์ PDF"
            >
              <Download className={`w-3.5 h-3.5 ${isGeneratingPdf ? 'animate-bounce' : ''}`} />
              <span>{isGeneratingPdf ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              title="สั่งพิมพ์รายงานผู้บริหาร A4"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์รายงาน</span>
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Toggle Navigation */}
        <div className="flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('SUMMARY_VIEW')}
              className={`py-3 border-b-2 transition-all cursor-pointer ${
                activeTab === 'SUMMARY_VIEW'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              แก้ไขและตรวจสอบเนื้อหา (Edit & Review)
            </button>
            <button
              onClick={() => setActiveTab('PRINT_PREVIEW')}
              className={`py-3 border-b-2 transition-all cursor-pointer ${
                activeTab === 'PRINT_PREVIEW'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              ตัวอย่างรายงานผู้บริหาร A4 (Executive A4 Layout)
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-500">
            <span>ความก้าวหน้า: <strong className="text-blue-600">{item.currentProgressPercentage || 0}%</strong></span>
            <span>&bull;</span>
            <span>รายงานสะสม: <strong>{item.progressReports?.length || 0} รอบ</strong></span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-800 dark:text-slate-200 bg-slate-50/40 dark:bg-slate-900">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center animate-spin">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                AI กำลังประมวลผลและสังเคราะห์รายงานสรุปผู้บริหาร...
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                วิเคราะห์ข้อเท็จจริง แผนงาน รายงานติดตามผลรายรอบ และประโยชน์ต่อผู้รับบริการตามหลักธรรมาภิบาลและ EdPEx
              </p>
            </div>
          ) : activeTab === 'SUMMARY_VIEW' && summaryData ? (
            /* Editable Summary View */
            <div className="space-y-5">
              {/* Executive Summary Narrative */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    1. บทสรุปภาพรวมสำหรับผู้บริหาร (Executive Summary)
                  </label>
                  <span className="text-[11px] text-slate-400">แก้ไขข้อความได้โดยตรง</span>
                </div>
                <textarea
                  rows={4}
                  value={summaryData.executiveSummary}
                  onChange={(e) => setSummaryData({ ...summaryData, executiveSummary: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 leading-relaxed focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Achievements & Efficiency Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Key Achievements */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
                  <div className="font-bold text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    2. ผลสำเร็จเชิงประจักษ์ (Key Achievements)
                  </div>
                  <div className="space-y-1.5">
                    {summaryData.keyAchievements.map((ach, idx) => (
                      <input
                        key={idx}
                        type="text"
                        value={ach}
                        onChange={(e) => {
                          const updated = [...summaryData.keyAchievements];
                          updated[idx] = e.target.value;
                          setSummaryData({ ...summaryData, keyAchievements: updated });
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200"
                      />
                    ))}
                  </div>
                </div>

                {/* Customer & Efficiency Impact */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
                  <div className="font-bold text-purple-800 dark:text-purple-300 text-xs flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    3. ผลกระทบต่อผู้รับบริการ & การลดความสูญเปล่า (VOC & Lean)
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-[11px] text-slate-500 font-semibold">คุณค่าต่อผู้รับบริการ:</span>
                      <textarea
                        rows={2}
                        value={summaryData.customerImpact}
                        onChange={(e) => setSummaryData({ ...summaryData, customerImpact: e.target.value })}
                        className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 font-semibold">การเพิ่มประสิทธิภาพ/ความคล่องตัว:</span>
                      <input
                        type="text"
                        value={summaryData.processEfficiencyGain}
                        onChange={(e) => setSummaryData({ ...summaryData, processEfficiencyGain: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommendations & Next Steps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Next Action Plan */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
                  <div className="font-bold text-blue-800 dark:text-blue-300 text-xs flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-600" />
                    4. ข้อจำกัดและแผนงานก้าวต่อไป (Next Steps)
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-[11px] text-slate-500">ปัญหา/อุปสรรคที่ยังคงอยู่:</span>
                      <input
                        type="text"
                        value={summaryData.remainingChallenges}
                        onChange={(e) => setSummaryData({ ...summaryData, remainingChallenges: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500">ก้าวต่อไป:</span>
                      <input
                        type="text"
                        value={summaryData.nextActionPlan}
                        onChange={(e) => setSummaryData({ ...summaryData, nextActionPlan: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Executive Recommendations */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
                  <div className="font-bold text-amber-800 dark:text-amber-300 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    5. ข้อเสนอแนะเชิงนโยบายสำหรับผู้บริหาร (Executive Recommendations)
                  </div>
                  <div className="space-y-1.5">
                    {summaryData.executiveRecommendations.map((rec, idx) => (
                      <input
                        key={idx}
                        type="text"
                        value={rec}
                        onChange={(e) => {
                          const updated = [...summaryData.executiveRecommendations];
                          updated[idx] = e.target.value;
                          setSummaryData({ ...summaryData, executiveRecommendations: updated });
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Periodic Reports History for this Main Issue */}
              <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    ประวัติการรายงานตามรอบเวลาของประเด็นนี้ ({item.progressReports?.length || 0} รอบ)
                  </div>
                  <span className="text-[11px] text-slate-500">
                    รายงานทั้งหมดถูกจัดเก็บอยู่ภายใต้รหัสหลัก {item.improvementId}
                  </span>
                </div>

                {item.progressReports && item.progressReports.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {item.progressReports.map((rpt, idx) => (
                      <div
                        key={rpt.reportId || idx}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between font-bold text-blue-600">
                          <span>{rpt.periodName}</span>
                          <span className="text-[11px] text-slate-500">{rpt.progressPercentage}%</span>
                        </div>
                        <div className="text-slate-600 dark:text-slate-300 text-[11px] line-clamp-1">
                          {rpt.completedTasksSummary}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 py-2 text-center">
                    ยังไม่มีการบันทึกรายงานตามรอบเวลา (สามารถกดบันทึกผลได้จากเมนู "ติดตามผลการปรับปรุงงาน")
                  </div>
                )}
              </div>

              {/* Sign-off configuration */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                <div className="font-bold text-slate-900 dark:text-white text-xs">
                  รายนามสำหรับลงนามในเอกสารรายงานสรุปผู้บริหาร:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">ผู้จัดทำ/ผู้รายงานผล:</label>
                    <input
                      type="text"
                      value={submitterName}
                      onChange={(e) => setSubmitterName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs mb-1"
                    />
                    <input
                      type="text"
                      value={submitterPosition}
                      onChange={(e) => setSubmitterPosition(e.target.value)}
                      placeholder="ตำแหน่ง"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">ผู้บริหารผู้พิจารณา/คณบดี:</label>
                    <input
                      type="text"
                      value={approverName}
                      onChange={(e) => setApproverName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs mb-1"
                    />
                    <input
                      type="text"
                      value={approverPosition}
                      onChange={(e) => setApproverPosition(e.target.value)}
                      placeholder="ตำแหน่ง"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Clean A4 Printable Layout Container */
            <div className="flex justify-center py-2">
              <div
                id="bridge-issue-summary-report-paper"
                ref={printAreaRef}
                className="bg-white text-slate-900 p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-200 w-full max-w-[800px] min-h-[1050px] space-y-6 text-xs leading-relaxed"
                style={{ fontFamily: "'Sarabun', -apple-system, sans-serif" }}
              >
                {/* Official University Executive Header */}
                <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">
                      คณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏยะลา
                    </div>
                    <h1 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                      บันทึกข้อความสรุปผลการปรับปรุงงานตาม BRIDGE Model (Executive Brief)
                    </h1>
                    <div className="text-[11px] text-slate-600">
                      ระบบติดตามและปรับปรุงกระบวนการทำงานเพื่อความเป็นเลิศ (EdPEx Quality Management)
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="font-mono font-bold text-sm bg-slate-100 px-3 py-1 rounded-lg border border-slate-300">
                        {item.improvementId}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        ปีงบประมาณ {item.fiscalYear || '2569'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Meta information box */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">หน่วยงาน / หลักสูตร</div>
                    <div className="font-bold text-slate-900 truncate mt-0.5">{item.ownerNameSnapshot}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">ด้านงาน / กระบวนการ</div>
                    <div className="font-bold text-slate-900 truncate mt-0.5">{item.workDomain}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">ขั้นตอน BRIDGE</div>
                    <div className="font-bold text-blue-700 mt-0.5">ขั้น {item.currentBridgeStep}: {currentStepInfo.name}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">ความก้าวหน้า</div>
                    <div className="font-bold text-emerald-700 mt-0.5">{item.currentProgressPercentage || 0}%</div>
                  </div>
                </div>

                {/* Progress bar line */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                    <span>ความก้าวหน้ารวมของประเด็น</span>
                    <span>{item.currentProgressPercentage || 0}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${Math.min(item.currentProgressPercentage || 0, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Section 1: Executive Summary */}
                <div className="space-y-1.5 break-inside-avoid">
                  <div className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1">
                    ๑. สรุปภาพรวมและผลการดำเนินงาน (Executive Summary)
                  </div>
                  <div className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {summaryData?.executiveSummary}
                  </div>
                </div>

                {/* Section 2: Key Achievements */}
                <div className="space-y-1.5 break-inside-avoid">
                  <div className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1">
                    ๒. ผลสำเร็จเชิงประจักษ์ที่เกิดขึ้น (Key Achievements)
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-800 pl-1">
                    {summaryData?.keyAchievements.map((ach, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {ach}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Section 3: Customer Impact & Efficiency */}
                <div className="space-y-1.5 break-inside-avoid">
                  <div className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1">
                    ๓. คุณค่าต่อผู้รับบริการและการเพิ่มประสิทธิภาพ (Customer Impact & Lean)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="font-semibold text-slate-900 text-[11px]">ผลต่อผู้รับบริการ (VOC):</div>
                      <div className="text-slate-700 mt-1">{summaryData?.customerImpact}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="font-semibold text-slate-900 text-[11px]">ประสิทธิภาพกระบวนการ:</div>
                      <div className="text-slate-700 mt-1">{summaryData?.processEfficiencyGain}</div>
                    </div>
                  </div>
                </div>

                {/* Section 4: Executive Recommendations */}
                <div className="space-y-1.5 break-inside-avoid">
                  <div className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1">
                    ๔. ข้อเสนอแนะเชิงนโยบายเพื่อพิจารณาสั่งการ (Executive Recommendations)
                  </div>
                  <ul className="list-decimal list-inside space-y-1 text-slate-800 pl-1">
                    {summaryData?.executiveRecommendations.map((rec, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Section 5: Signature Blocks */}
                <div className="pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-center break-inside-avoid">
                  <div className="space-y-8">
                    <div className="text-[11px] text-slate-600">ลงชื่อผู้รายงาน / ผู้รับผิดชอบ</div>
                    <div className="space-y-1">
                      <div className="border-b border-slate-400 w-44 mx-auto" />
                      <div className="font-bold text-slate-900">({submitterName})</div>
                      <div className="text-[11px] text-slate-500">{submitterPosition}</div>
                      <div className="text-[10px] text-slate-400">วันที่ ......./......./.......</div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="text-[11px] text-slate-600">ความเห็นและข้อสั่งการของผู้บริหาร</div>
                    <div className="space-y-1">
                      <div className="border-b border-slate-400 w-44 mx-auto" />
                      <div className="font-bold text-slate-900">({approverName})</div>
                      <div className="text-[11px] text-slate-500">{approverPosition}</div>
                      <div className="text-[10px] text-slate-400">วันที่ ......./......./.......</div>
                    </div>
                  </div>
                </div>

                {/* Footer notes */}
                <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>เอกสารสังเคราะห์ด้วยระบบ AI BRIDGE Model และข้อมูลรายงานผลการดำเนินงานจริง</span>
                  <span>พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH')}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveToIssue}
              disabled={isSaving || !summaryData}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกสรุปผลลงในประเด็นนี้'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

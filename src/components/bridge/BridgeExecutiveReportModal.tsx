import React, { useState, useMemo, useRef } from 'react';
import {
  BridgeImprovement,
  BRIDGE_STEPS,
  BridgeStep,
  BridgeExecutiveDecision,
  BridgeLifecycleStatus,
} from '../../types/bridge';
import { Department, Indicator, Personnel, User } from '../../types';
import {
  FileText,
  Download,
  Printer,
  Copy,
  Check,
  X,
  Sparkles,
  Award,
  Clock,
  Layers,
  Building2,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  Send,
  UserCheck,
  ShieldAlert,
  Calendar,
  Settings,
  ChevronDown,
  Eye,
  AlertCircle,
  QrCode,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

interface BridgeExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  improvements: BridgeImprovement[];
  departments: Department[];
  indicators: Indicator[];
  personnelList?: Personnel[];
  users?: User[];
  decisions?: BridgeExecutiveDecision[];
  currentUser: User | null;
  selectedYear: string;
}

export const BridgeExecutiveReportModal: React.FC<BridgeExecutiveReportModalProps> = ({
  isOpen,
  onClose,
  improvements,
  departments,
  indicators,
  personnelList = [],
  users = [],
  decisions = [],
  currentUser,
  selectedYear,
}) => {
  // Document Configuration Options
  const [fiscalYear, setFiscalYear] = useState<string>(selectedYear || '2569');
  const [reportPeriod, setReportPeriod] = useState<string>('ไตรมาสที่ 2 (รอบ 6 เดือน)');
  const [facultyName, setFacultyName] = useState<string>('คณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏยะลา');
  const [customReportTitle, setCustomReportTitle] = useState<string>(
    'รายงานผลการติดตามและปรับปรุงกระบวนการทำงานตาม BRIDGE Model'
  );
  const [reportDocNumber, setReportDocNumber] = useState<string>(
    `BRG-RPT-${selectedYear || '2569'}-${String(Math.floor(Math.random() * 900) + 100).padStart(4, '0')}`
  );
  const [reportScope, setReportScope] = useState<'ALL' | 'DEPARTMENT' | 'COURSE'>('ALL');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('ALL');
  const [selectedStepFilter, setSelectedStepFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL_ACTIVE');
  const [reportDetailLevel, setReportDetailLevel] = useState<'SUMMARY_AND_DETAILS' | 'EXECUTIVE_SUMMARY_ONLY'>('SUMMARY_AND_DETAILS');
  const [executiveRemarks, setExecutiveRemarks] = useState<string>(
    'ผลการดำเนินงานปรับปรุงกระบวนการตาม BRIDGE Model ในรอบระยะเวลานี้ มีความก้าวหน้าตามแผนงาน และมีการขับเคลื่อนเชื่อมโยงสู่เป้าหมายของคณะ ขอเสนอผู้บริหารพิจารณาให้ความเห็นชอบและสั่งการตามข้อเสนอ'
  );

  // Selected Issue IDs checklist
  const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(new Set());
  const [isChecklistInitialized, setIsChecklistInitialized] = useState<boolean>(false);

  // Sign-off Roles & Names (Configurable with Dean and Assoc Dean defaults)
  const defaultDean = personnelList.find(p => p.position?.includes('คณบดี') || p.administrativePosition?.includes('คณบดี'))?.fullName || 'ผศ.สวพร จันทรสกุล';
  const defaultAssocDean = personnelList.find(p => p.position?.includes('รองคณบดี') || p.administrativePosition?.includes('รองคณบดี'))?.fullName || 'ผศ.ดร.เกรียงศักดิ์ สมณะ';
  
  const [submitterName, setSubmitterName] = useState<string>(currentUser?.fullName || defaultAssocDean);
  const [submitterPosition, setSubmitterPosition] = useState<string>('รองคณบดีฝ่ายบริหารและประกันคุณภาพ');
  const [approverName, setApproverName] = useState<string>(defaultDean);
  const [approverPosition, setApproverPosition] = useState<string>('คณบดีคณะมนุษยศาสตร์และสังคมศาสตร์');

  // UI state
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'PREVIEW' | 'CONFIG'>('PREVIEW');
  const printRef = useRef<HTMLDivElement>(null);

  // Filter Improvements based on Configuration
  // EXCLUDES: DRAFT, CANCELLED, isDeleted === true
  // INCLUDES: IN_PROGRESS, DELAYED, WAITING_FOR_DECISION, COMPLETED, VERIFIED, BEST_PRACTICE, SCALE_UP
  const eligibleImprovements = useMemo(() => {
    return improvements.filter((item) => {
      // 1. Exclude deleted
      if (item.isDeleted === true) return false;

      // 2. Exclude DRAFT and CANCELLED
      const lifecycle = (item.lifecycleStatus || item.workflowStatus || item.overallStatus || '').toUpperCase();
      if (lifecycle === 'DRAFT' || lifecycle === 'CANCELLED') return false;

      // 3. Fiscal Year match
      if (fiscalYear !== 'ALL' && String(item.fiscalYear) !== fiscalYear) return false;

      // 4. Status Filter
      if (selectedStatusFilter !== 'ALL_ACTIVE') {
        if (selectedStatusFilter === 'IN_PROGRESS' && lifecycle !== 'IN_PROGRESS') return false;
        if (selectedStatusFilter === 'DELAYED' && lifecycle !== 'DELAYED') return false;
        if (selectedStatusFilter === 'WAITING_FOR_DECISION' && lifecycle !== 'WAITING_FOR_DECISION') return false;
        if (selectedStatusFilter === 'COMPLETED' && lifecycle !== 'COMPLETED') return false;
        if (selectedStatusFilter === 'VERIFIED' && lifecycle !== 'VERIFIED') return false;
        if (selectedStatusFilter === 'BEST_PRACTICE_SCALE') {
          const isBp = lifecycle === 'BEST_PRACTICE' || lifecycle === 'SCALE_UP' || item.isBestPractice || item.isInnovationCandidate;
          if (!isBp) return false;
        }
      }

      // 5. Scope filter
      if (reportScope === 'DEPARTMENT' && item.ownerType !== 'DEPARTMENT') return false;
      if (reportScope === 'COURSE' && item.ownerType !== 'COURSE') return false;
      if (selectedEntityId !== 'ALL' && item.ownerId !== selectedEntityId) return false;

      // 6. Step filter
      if (selectedStepFilter !== 'ALL' && item.currentBridgeStep !== selectedStepFilter) return false;

      return true;
    });
  }, [improvements, fiscalYear, selectedStatusFilter, reportScope, selectedEntityId, selectedStepFilter]);

  // Initialize selected issue IDs once data is loaded or filtered
  useMemo(() => {
    if (!isChecklistInitialized && eligibleImprovements.length > 0) {
      const ids = new Set(eligibleImprovements.map(i => i.id));
      setSelectedIssueIds(ids);
      setIsChecklistInitialized(true);
    }
  }, [eligibleImprovements, isChecklistInitialized]);

  // Actual items included in the report (based on checklist)
  const reportItems = useMemo(() => {
    return eligibleImprovements.filter(item => selectedIssueIds.has(item.id));
  }, [eligibleImprovements, selectedIssueIds]);

  // Statistical calculations
  const stats = useMemo(() => {
    const total = reportItems.length;
    const completed = reportItems.filter(
      (i) => (i.currentProgressPercentage || 0) >= 100 || i.lifecycleStatus === 'COMPLETED' || i.overallStatus === 'COMPLETED' || i.currentBridgeStep === 'E'
    ).length;
    const inProgress = reportItems.filter(
      (i) => (i.currentProgressPercentage || 0) < 100 && i.lifecycleStatus !== 'COMPLETED' && i.overallStatus !== 'COMPLETED'
    ).length;
    const bestPractices = reportItems.filter(
      (i) => i.isBestPractice || i.isInnovationCandidate || i.edpexReplicableToOtherDepts || i.lifecycleStatus === 'BEST_PRACTICE' || i.lifecycleStatus === 'SCALE_UP'
    ).length;

    const stepCounts: Record<BridgeStep, number> = { B: 0, R: 0, I: 0, D: 0, G: 0, E: 0 };
    reportItems.forEach((i) => {
      const st = i.currentBridgeStep || 'B';
      if (stepCounts[st] !== undefined) stepCounts[st] += 1;
    });

    const avgProgress = total > 0
      ? Math.round(reportItems.reduce((acc, curr) => acc + (curr.currentProgressPercentage || 0), 0) / total)
      : 0;

    return { total, completed, inProgress, bestPractices, stepCounts, avgProgress };
  }, [reportItems]);

  // Relevant Decisions requested
  const pendingDecisions = useMemo(() => {
    const map = new Map<string, BridgeExecutiveDecision>();
    (decisions || []).forEach((d, idx) => {
      const isRelated = reportItems.some(i => i.id === d.improvementId || i.improvementId === d.improvementId);
      if (isRelated || d.decisionStatus === 'PENDING') {
        const key = d.decisionId || `dec-rep-${idx}`;
        if (!map.has(key)) {
          map.set(key, { ...d, decisionId: key });
        }
      }
    });
    return Array.from(map.values());
  }, [decisions, reportItems]);

  // Toggle single item in checklist
  const toggleIssue = (id: string) => {
    const next = new Set(selectedIssueIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIssueIds(next);
  };

  // Select all / Deselect all
  const selectAllIssues = () => {
    setSelectedIssueIds(new Set(eligibleImprovements.map(i => i.id)));
  };
  const deselectAllIssues = () => {
    setSelectedIssueIds(new Set());
  };

  // Generate and Download PDF using jsPDF + html-to-image
  const handleDownloadPdf = async () => {
    if (!printRef.current || reportItems.length === 0) return;
    setIsGeneratingPdf(true);

    try {
      const element = printRef.current;
      
      // Use html-to-image with options to bypass external CSS oklch font parsing
      const dataUrl = await toPng(element, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
        fontEmbedCSS: '',
        skipFonts: true,
      });

      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve, reject) => {
        img.onload = () => resolve(true);
        img.onerror = (e) => reject(e);
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pdfWidth;
      const imgHeight = (img.height * pdfWidth) / img.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Add remaining pages if content overflows A4
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`รายงาน_BRIDGE_${reportDocNumber}_${fiscalYear}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      if (confirm('ระบบพบข้อผิดพลาดในการดาวน์โหลด PDF อัตโนมัติ ต้องการเปิดหน้าต่างสั่งพิมพ์ (Save as PDF) แทนหรือไม่?')) {
        handleNativePrint();
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Handle Native Browser Print cleanly with isolated iframe to bypass modal & preview container constraints
  const handleNativePrint = () => {
    if (reportItems.length === 0) return;
    setIsPrinting(true);

    // If currently on config tab, switch to preview first
    if (activeTab !== 'PREVIEW') {
      setActiveTab('PREVIEW');
    }

    setTimeout(() => {
      try {
        const printElement = printRef.current;
        if (!printElement) {
          document.body.classList.add('printing-executive-report');
          window.print();
          setTimeout(() => {
            document.body.classList.remove('printing-executive-report');
            setIsPrinting(false);
          }, 1000);
          return;
        }

        // Create an isolated hidden iframe
        const existingFrame = document.getElementById('bridge-print-frame');
        if (existingFrame && existingFrame.parentNode) {
          existingFrame.parentNode.removeChild(existingFrame);
        }

        const iframe = document.createElement('iframe');
        iframe.id = 'bridge-print-frame';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.zIndex = '-9999';
        iframe.setAttribute('aria-hidden', 'true');

        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
        if (!iframeDoc) {
          document.body.classList.add('printing-executive-report');
          window.print();
          setTimeout(() => {
            document.body.classList.remove('printing-executive-report');
            setIsPrinting(false);
          }, 1000);
          return;
        }

        // Collect all stylesheets from main document
        const styleNodes = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
          .map((el) => el.outerHTML)
          .join('\n');

        iframeDoc.open();
        iframeDoc.write(`
          <!DOCTYPE html>
          <html lang="th">
            <head>
              <meta charset="utf-8" />
              <title>${customReportTitle || 'BRIDGE Executive Report'} - ${reportDocNumber}</title>
              ${styleNodes}
              <style>
                @page {
                  size: A4 portrait;
                  margin: 10mm 12mm;
                }
                *, *::before, *::after {
                  box-sizing: border-box;
                }
                html, body {
                  background: #ffffff !important;
                  color: #0f172a !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  font-family: Sarabun, "Noto Sans Thai", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                #bridge-executive-report-paper {
                  width: 100% !important;
                  max-width: 100% !important;
                  box-shadow: none !important;
                  border: none !important;
                  padding: 0 !important;
                  margin: 0 !important;
                }
                .no-print {
                  display: none !important;
                }
              </style>
            </head>
            <body>
              <div style="width: 100%; background: #ffffff; padding: 0; margin: 0;">
                ${printElement.outerHTML}
              </div>
            </body>
          </html>
        `);
        iframeDoc.close();

        // Allow rendering of stylesheets and images before triggering print
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (err) {
            console.error('Iframe print error, falling back to window.print():', err);
            document.body.classList.add('printing-executive-report');
            window.print();
            setTimeout(() => {
              document.body.classList.remove('printing-executive-report');
            }, 1000);
          } finally {
            setIsPrinting(false);
            setTimeout(() => {
              if (iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
              }
            }, 4000);
          }
        }, 350);
      } catch (e) {
        console.error('Print execution failed:', e);
        document.body.classList.add('printing-executive-report');
        window.print();
        setTimeout(() => {
          document.body.classList.remove('printing-executive-report');
          setIsPrinting(false);
        }, 1000);
      }
    }, activeTab !== 'PREVIEW' ? 200 : 50);
  };

  // Copy Executive Summary text to clipboard
  const handleCopySummaryText = () => {
    const text = `
=== ${customReportTitle} ===
เลขที่เอกสาร: ${reportDocNumber}
ประจำปีงบประมาณ: พ.ศ. ${fiscalYear}
รอบการรายงาน: ${reportPeriod}
${facultyName}

[สรุปภาพรวมผลการดำเนินงาน]
- ประเด็นการปรับปรุงทั้งหมด: ${stats.total} ประเด็น
- ปรับปรุงสำเร็จแล้ว (Completed): ${stats.completed} ประเด็น (${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%)
- อยู่ระหว่างดำเนินการ (In-Progress): ${stats.inProgress} ประเด็น
- ขยายผล / แนวปฏิบัติที่ดี (Best Practice): ${stats.bestPractices} ประเด็น
- ความก้าวหน้าเฉลี่ยรวม: ${stats.avgProgress}%

[การกระจายตามขั้นตอน BRIDGE]
- B (Build & Align): ${stats.stepCounts.B} ประเด็น
- R (Review & Record): ${stats.stepCounts.R} ประเด็น
- I (Improve & Implement): ${stats.stepCounts.I} ประเด็น
- D (Drive & Innovation): ${stats.stepCounts.D} ประเด็น
- G (Grow & Generalize): ${stats.stepCounts.G} ประเด็น
- E (Excellence & EdPEx): ${stats.stepCounts.E} ประเด็น

[ข้อเสนอและความเห็น]
${executiveRemarks}

[สายการลงนาม]
1. ผู้เสนอรายงาน: ${submitterName} (${submitterPosition})
2. ผู้อนุมัติ: ${approverName} (${approverPosition})
    `.trim();

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-3xl w-full max-w-6xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden my-auto">
        {/* Modal Top Control Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 shrink-0 no-print">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  ระบบจัดทำเอกสารรายงานเสนอผู้บริหาร (BRIDGE Executive Report)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  มาตรฐานแบบฟอร์ม A4
                </span>
              </div>
              <p className="text-xs text-slate-400">
                เอกสารทางการพร้อมส่งออก PDF และสายการลงนาม 2 ฝ่าย (ผู้เสนอ &bull; รองคณบดี &rarr; ผู้อนุมัติ &bull; คณบดี)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* 3 Distinct Actions as Required */}
            {/* 1. ดูตัวอย่างรายงาน */}
            <button
              onClick={() => setActiveTab('PREVIEW')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer text-xs flex items-center gap-1.5 ${
                activeTab === 'PREVIEW' ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>ดูตัวอย่างรายงาน</span>
            </button>

            <button
              onClick={() => setActiveTab('CONFIG')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer text-xs flex items-center gap-1.5 ${
                activeTab === 'CONFIG' ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>ตั้งค่าตัวกรอง ({reportItems.length})</span>
            </button>

            {/* 2. สั่งพิมพ์เอกสาร */}
            <button
              onClick={handleNativePrint}
              disabled={isPrinting || isGeneratingPdf || reportItems.length === 0}
              title="พิมพ์เอกสาร A4 (Print)"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 transition cursor-pointer text-xs flex items-center gap-1.5 active:scale-95"
            >
              {isPrinting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <span className="hidden sm:inline">กำลังเปิดหน้าต่างพิมพ์...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 text-blue-400" />
                  <span className="hidden sm:inline">สั่งพิมพ์เอกสาร</span>
                </>
              )}
            </button>

            {/* 3. ดาวน์โหลด PDF */}
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || reportItems.length === 0}
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 text-slate-950 disabled:text-slate-400 text-xs font-black shadow-lg transition cursor-pointer flex items-center gap-2"
            >
              {isGeneratingPdf ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>กำลังสร้าง PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลด PDF</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/70 dark:bg-slate-950">
          {activeTab === 'CONFIG' ? (
            /* CONFIGURATION PANEL */
            <div className="max-w-4xl mx-auto space-y-6 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-300 dark:border-slate-800 shadow-md">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-amber-500" />
                  ตั้งค่ารายละเอียดเอกสารรายงานและตัวกรองสถานะ
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  กำหนดข้อมูลหัวเอกสาร รอบการรายงาน ตัวกรองสถานะประเด็น และรายชื่อผู้ลงนาม
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {/* Year */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ปีงบประมาณ พ.ศ.
                  </label>
                  <select
                    value={fiscalYear}
                    onChange={(e) => setFiscalYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold focus:outline-none"
                  >
                    <option value="2569">2569</option>
                    <option value="2570">2570</option>
                    <option value="2571">2571</option>
                    <option value="ALL">ทุกปีงบประมาณ</option>
                  </select>
                </div>

                {/* Period */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    รอบการรายงาน (Period)
                  </label>
                  <input
                    type="text"
                    value={reportPeriod}
                    onChange={(e) => setReportPeriod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium focus:outline-none"
                    placeholder="เช่น ไตรมาสที่ 2 (รอบ 6 เดือน)"
                  />
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    สถานะประเด็นปรับปรุงงาน
                  </label>
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium focus:outline-none"
                  >
                    <option value="ALL_ACTIVE">ทุกรายการที่เริ่มดำเนินการแล้ว (Active)</option>
                    <option value="IN_PROGRESS">กำลังดำเนินการ (IN_PROGRESS)</option>
                    <option value="DELAYED">ล่าช้า (DELAYED)</option>
                    <option value="WAITING_FOR_DECISION">รอผู้บริหารตัดสินใจ (WAITING_FOR_DECISION)</option>
                    <option value="COMPLETED">ดำเนินการเสร็จ (COMPLETED)</option>
                    <option value="VERIFIED">รับรองผลแล้ว (VERIFIED)</option>
                    <option value="BEST_PRACTICE_SCALE">แนวปฏิบัติที่ดี/ขยายผล (BEST_PRACTICE / SCALE_UP)</option>
                  </select>
                </div>

                {/* Scope */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ขอบเขตหน่วยงาน
                  </label>
                  <select
                    value={reportScope}
                    onChange={(e) => {
                      setReportScope(e.target.value as any);
                      setSelectedEntityId('ALL');
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium focus:outline-none"
                  >
                    <option value="ALL">ทุกหน่วยงานและหลักสูตร</option>
                    <option value="DEPARTMENT">เฉพาะหน่วยงานสำนักงานคณะ (8 หน่วยงาน)</option>
                    <option value="COURSE">เฉพาะหลักสูตรการศึกษา (18 หลักสูตร)</option>
                  </select>
                </div>

                {/* Specific Step */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ขั้นตอน BRIDGE
                  </label>
                  <select
                    value={selectedStepFilter}
                    onChange={(e) => setSelectedStepFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium focus:outline-none"
                  >
                    <option value="ALL">ทุกขั้นตอน (B, R, I, D, G, E)</option>
                    <option value="B">ขั้น B – Build & Align</option>
                    <option value="R">ขั้น R – Review & Record</option>
                    <option value="I">ขั้น I – Improve & Implement</option>
                    <option value="D">ขั้น D – Drive & Innovation</option>
                    <option value="G">ขั้น G – Grow & Generalize</option>
                    <option value="E">ขั้น E – Excellence & EdPEx</option>
                  </select>
                </div>

                {/* Report Detail Level */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ระดับความละเอียดของรายงาน
                  </label>
                  <select
                    value={reportDetailLevel}
                    onChange={(e) => setReportDetailLevel(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium focus:outline-none"
                  >
                    <option value="SUMMARY_AND_DETAILS">สรุปภาพรวม + รายละเอียดประเด็นทั้งหมด</option>
                    <option value="EXECUTIVE_SUMMARY_ONLY">เฉพาะบทสรุปผู้บริหารและสถิติภาพรวม</option>
                  </select>
                </div>
              </div>

              {/* Title & Organization Header */}
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                      หน่วยงานต้นสังกัด / สถาบัน
                    </label>
                    <input
                      type="text"
                      value={facultyName}
                      onChange={(e) => setFacultyName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                      ชื่อเรื่องของรายงาน
                    </label>
                    <input
                      type="text"
                      value={customReportTitle}
                      onChange={(e) => setCustomReportTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                    บทสรุปผู้บริหาร / ข้อสังเกตและข้อเสนอแนะเชิงนโยบาย (Executive Commentary)
                  </label>
                  <textarea
                    rows={3}
                    value={executiveRemarks}
                    onChange={(e) => setExecutiveRemarks(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Sign-off Config */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-3">
                <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                  <span>สายการลงนามและผู้บริหารที่เกี่ยวข้อง (Sign-off Workflow)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Submitter */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <span className="font-black text-blue-600 dark:text-blue-400 block">
                      1. ผู้เสนอรายงาน (Submitter)
                    </span>
                    <div>
                      <label className="text-[10px] text-slate-500 block">ชื่อ-นามสกุล</label>
                      <input
                        type="text"
                        value={submitterName}
                        onChange={(e) => setSubmitterName(e.target.value)}
                        className="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">ตำแหน่ง</label>
                      <input
                        type="text"
                        value={submitterPosition}
                        onChange={(e) => setSubmitterPosition(e.target.value)}
                        className="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Approver */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <span className="font-black text-amber-600 dark:text-amber-400 block">
                      2. ผู้อนุมัติ/สั่งการ (Approver - คณบดี)
                    </span>
                    <div>
                      <label className="text-[10px] text-slate-500 block">ชื่อ-นามสกุล</label>
                      <input
                        type="text"
                        value={approverName}
                        onChange={(e) => setApproverName(e.target.value)}
                        className="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">ตำแหน่ง</label>
                      <input
                        type="text"
                        value={approverPosition}
                        onChange={(e) => setApproverPosition(e.target.value)}
                        className="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Checklist Selection of Issues */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 dark:text-white text-xs">
                    เลือกประเด็นที่ต้องการให้ปรากฏในรายงาน ({reportItems.length} จาก {eligibleImprovements.length} รายการที่กำลังดำเนินการ)
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={selectAllIssues}
                      className="text-blue-600 hover:underline font-bold cursor-pointer"
                    >
                      เลือกทั้งหมด
                    </button>
                    <span>|</span>
                    <button
                      onClick={deselectAllIssues}
                      className="text-slate-500 hover:underline cursor-pointer"
                    >
                      ยกเลิกทั้งหมด
                    </button>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
                  {eligibleImprovements.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 space-y-1">
                      <AlertCircle className="w-6 h-6 text-amber-500 mx-auto" />
                      <div className="font-bold">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</div>
                      <div className="text-[11px] text-slate-400">กรุณาตรวจสอบสถานะ ปีงบประมาณ รอบรายงาน และตัวกรอง</div>
                    </div>
                  ) : (
                    eligibleImprovements.map((item) => {
                      const isChecked = selectedIssueIds.has(item.id);
                      return (
                        <label
                          key={item.id}
                          className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleIssue(item.id)}
                            className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-blue-600 text-[11px]">
                                {item.improvementId}
                              </span>
                              <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                {item.title}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                ขั้น {item.currentBridgeStep}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {item.ownerNameSnapshot} &bull; {item.workDomain} &bull; ความก้าวหน้า {item.currentProgressPercentage || 0}%
                            </div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setActiveTab('PREVIEW')}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition cursor-pointer"
                >
                  กลับไปดูตัวอย่างเอกสาร (View Preview) &rarr;
                </button>
              </div>
            </div>
          ) : (
            /* A4 PAPER PREVIEW */
            <div className="flex justify-center">
              {reportItems.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center max-w-lg w-full border border-slate-300 dark:border-slate-800 shadow-xl space-y-4 my-8">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      ไม่พบข้อมูลตามเงื่อนไขที่เลือก
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      กรุณาตรวจสอบสถานะ ปีงบประมาณ รอบรายงาน และตัวกรอง เพื่อจัดทำเอกสารเสนอผู้บริหาร
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('CONFIG')}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                  >
                    ปรับแต่งตัวกรองและเลือกประเด็น
                  </button>
                </div>
              ) : (
                <div
                  ref={printRef}
                  id="bridge-executive-report-paper"
                  className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 p-8 sm:p-12 shadow-2xl rounded-sm font-sans space-y-6 text-xs leading-normal print:shadow-none print:p-0 print:m-0 print:max-w-none"
                  style={{
                    boxSizing: 'border-box',
                    fontFamily: 'Sarabun, "Noto Sans Thai", sans-serif',
                  }}
                >
                  {/* Official Header with Garuda / University Typography */}
                  <div className="border-b-2 border-slate-900 pb-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-black text-base">
                          HUSO
                        </div>
                        <div>
                          <div className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                            {facultyName}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            การติดตามและปรับปรุงกระบวนการทำงานตาม BRIDGE Model (EdPEx Category 6)
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right text-[11px] space-y-0.5">
                          <div className="font-mono font-bold text-slate-900">
                            เลขที่เอกสาร: {reportDocNumber}
                          </div>
                          <div className="text-slate-500 text-[10px]">
                            วันที่จัดทำ: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-center pt-2">
                      <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                        {customReportTitle}
                      </h1>
                      <div className="text-xs font-bold text-slate-700 mt-0.5">
                        ประจำปีงบประมาณ พ.ศ. {fiscalYear} | {reportPeriod}
                      </div>
                    </div>
                  </div>

                  {/* SECTION 1: บทสรุปภาพรวมสำหรับผู้บริหาร (Executive Summary & Key Metrics) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                      <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded bg-slate-900 text-white flex items-center justify-center text-[10px]">1</span>
                        บทสรุปภาพรวมสำหรับผู้บริหาร (Executive Summary & Key Metrics)
                      </h2>
                      <span className="text-[10px] font-semibold text-slate-500">
                        รวมทั้งสิ้น {stats.total} ประเด็นที่กำลังดำเนินการ
                      </span>
                    </div>

                    {/* Summary Metric Cards in Print-friendly Grid */}
                    <div className="grid grid-cols-4 gap-3 text-center">
                      <div className="p-2.5 rounded-lg border border-slate-300 bg-slate-50">
                        <div className="text-[10px] text-slate-500 font-medium">ประเด็นทั้งหมด</div>
                        <div className="text-xl font-black text-slate-900">{stats.total}</div>
                        <div className="text-[9px] text-slate-400">ประเด็นปรับปรุง</div>
                      </div>
                      <div className="p-2.5 rounded-lg border border-emerald-300 bg-emerald-50">
                        <div className="text-[10px] text-emerald-800 font-medium">ปรับปรุงสำเร็จ (100%)</div>
                        <div className="text-xl font-black text-emerald-700">{stats.completed}</div>
                        <div className="text-[9px] text-emerald-600">
                          {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% ของทั้งหมด
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg border border-amber-300 bg-amber-50">
                        <div className="text-[10px] text-amber-800 font-medium">อยู่ระหว่างดำเนินการ</div>
                        <div className="text-xl font-black text-amber-700">{stats.inProgress}</div>
                        <div className="text-[9px] text-amber-600">ความก้าวหน้าเฉลี่ย {stats.avgProgress}%</div>
                      </div>
                      <div className="p-2.5 rounded-lg border border-purple-300 bg-purple-50">
                        <div className="text-[10px] text-purple-800 font-medium">ขยายผล / Best Practice</div>
                        <div className="text-xl font-black text-purple-700">{stats.bestPractices}</div>
                        <div className="text-[9px] text-purple-600">ระดับคณะ / เครือข่าย</div>
                      </div>
                    </div>

                    {/* 6 BRIDGE Steps Proportion Bar */}
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2">
                      <div className="text-[10px] font-bold text-slate-700">
                        สัดส่วนการขับเคลื่อนตามกระบวนการ 6 ขั้นตอนของ BRIDGE Model:
                      </div>
                      <div className="grid grid-cols-6 gap-1.5 text-center text-[10px]">
                        {(['B', 'R', 'I', 'D', 'G', 'E'] as BridgeStep[]).map((st) => (
                          <div key={st} className="p-1.5 bg-white border border-slate-200 rounded">
                            <div className="font-bold text-slate-800">ขั้น {st}</div>
                            <div className="font-black text-sm text-slate-900">{stats.stepCounts[st]}</div>
                            <div className="text-[9px] text-slate-400 truncate">
                              {st === 'B' && 'Align'}
                              {st === 'R' && 'Review'}
                              {st === 'I' && 'Improve'}
                              {st === 'D' && 'Drive'}
                              {st === 'G' && 'Grow'}
                              {st === 'E' && 'EdPEx'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Executive Commentary */}
                    {executiveRemarks && (
                      <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-slate-800 text-[11px] leading-relaxed">
                        <span className="font-bold text-amber-950">ข้อสังเกตและข้อเสนอแนะเชิงนโยบาย: </span>
                        {executiveRemarks}
                      </div>
                    )}
                  </div>

                  {/* SECTION 2: ตารางรายการประเด็นปรับปรุงกระบวนการ (Improvement Items Table) */}
                  {reportDetailLevel === 'SUMMARY_AND_DETAILS' && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                        <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded bg-slate-900 text-white flex items-center justify-center text-[10px]">2</span>
                          รายการประเด็นปรับปรุงกระบวนการทำงาน (Improvement Items Table)
                        </h2>
                      </div>

                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                          <tr className="border-b-2 border-slate-800 bg-slate-100 text-slate-900 font-bold">
                            <th className="py-2 px-2 w-16">รหัส</th>
                            <th className="py-2 px-2">ชื่อประเด็น / ปัญหาที่พบ</th>
                            <th className="py-2 px-2 w-32">หน่วยงาน/หลักสูตร</th>
                            <th className="py-2 px-2 w-28">ผู้รับผิดชอบ</th>
                            <th className="py-2 px-1.5 w-14 text-center">ขั้น</th>
                            <th className="py-2 px-1.5 w-16 text-right">ก้าวหน้า</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {reportItems.map((item, idx) => {
                            const isComplete = (item.currentProgressPercentage || 0) >= 100;
                            return (
                              <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                <td className="py-2 px-2 font-mono font-bold text-slate-900 align-top">
                                  {item.improvementId}
                                </td>
                                <td className="py-2 px-2 align-top space-y-0.5">
                                <div className="font-bold text-slate-900 leading-tight">
                                  {item.title}
                                </div>
                                {item.issueDetails && (
                                  <div className="text-slate-500 text-[9px] line-clamp-1">
                                    {item.issueDetails}
                                  </div>
                                )}
                                {item.improvementApproach && (
                                  <div className="text-blue-900 font-medium text-[9px] line-clamp-1">
                                    แนวทาง: {item.improvementApproach}
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-2 text-slate-700 align-top leading-tight">
                                {item.ownerNameSnapshot}
                              </td>
                              <td className="py-2 px-2 text-slate-700 align-top leading-tight">
                                {item.primaryResponsiblePersonName}
                              </td>
                              <td className="py-2 px-1.5 text-center font-bold align-top">
                                <span className="inline-block px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 text-[9px]">
                                  {item.currentBridgeStep}
                                </span>
                              </td>
                              <td className="py-2 px-1.5 text-right font-black align-top">
                                <span className={isComplete ? 'text-emerald-700' : 'text-slate-900'}>
                                  {item.currentProgressPercentage || 0}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* SECTION 3: เรื่องเสนอเพื่อพิจารณา / ข้อสั่งการจากผู้บริหาร (Decisions Needed) */}
                {pendingDecisions.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                      <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded bg-slate-900 text-white flex items-center justify-center text-[10px]">3</span>
                        เรื่องเสนอเพื่อพิจารณา / ข้อสั่งการจากผู้บริหาร (Matters for Executive Decision)
                      </h2>
                    </div>

                    <div className="space-y-1.5">
                      {pendingDecisions.map((dec, idx) => (
                        <div key={`${dec.decisionId || 'dec'}-${idx}`} className="p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-[10px] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">&bull; {dec.topic}</span>
                            <span className="text-slate-500 font-medium">หน่วยงาน: {dec.departmentOrCourseName}</span>
                          </div>
                          <div className="text-slate-600">{dec.details}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SECTION 4: สายการลงนาม 2 ฝ่ายตามมาตรฐานที่ระบุ (Sign-off Section) */}
                <div className="pt-6 border-t-2 border-slate-800 space-y-4 break-inside-avoid">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[11px]">
                    {/* 1. ผู้เสนอ: รองคณบดีฝ่ายบริหารและประกันคุณภาพ */}
                    <div className="p-4 border border-slate-300 rounded-xl space-y-4 text-center">
                      <div className="space-y-8 pt-4">
                        <div className="text-slate-700">
                          ลงชื่อ ................................................................ ผู้เสนอ
                        </div>
                        <div className="font-bold text-slate-900">
                          ({submitterName || '................................................'})
                        </div>
                        <div className="text-slate-600 font-medium">
                          {submitterPosition || 'รองคณบดีฝ่ายบริหารและประกันคุณภาพ'}
                        </div>
                        <div className="text-slate-500 text-[10px]">
                          วันที่ ........../........../..........
                        </div>
                      </div>
                    </div>

                    {/* 2. ความเห็นของคณบดี: เช็คบ็อกซ์และลงชื่อผู้อนุมัติ */}
                    <div className="p-4 border border-slate-300 rounded-xl space-y-3">
                      <div className="font-bold text-slate-900 border-b border-slate-200 pb-1">
                        ความเห็นของคณบดี
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-800 py-1">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-3.5 h-3.5 border border-slate-500 rounded-sm"></span>
                          <span>อนุมัติ</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-3.5 h-3.5 border border-slate-500 rounded-sm"></span>
                          <span>เห็นชอบให้ดำเนินการต่อ</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-3.5 h-3.5 border border-slate-500 rounded-sm"></span>
                          <span>เห็นชอบให้ขยายผล</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-3.5 h-3.5 border border-slate-500 rounded-sm"></span>
                          <span>ให้ทบทวน/ปรับปรุง</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-3.5 h-3.5 border border-slate-500 rounded-sm"></span>
                          <span>ไม่อนุมัติ</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-3.5 h-3.5 border border-slate-500 rounded-sm"></span>
                          <span>อื่น ๆ ................................</span>
                        </div>
                      </div>

                      <div className="space-y-4 pt-3 text-center">
                        <div className="text-slate-700">
                          ลงชื่อ ................................................................ ผู้อนุมัติ
                        </div>
                        <div className="font-bold text-slate-900">
                          ({approverName || '................................................'})
                        </div>
                        <div className="text-slate-600 font-medium">
                          {approverPosition || 'คณบดีคณะมนุษยศาสตร์และสังคมศาสตร์'}
                        </div>
                        <div className="text-slate-500 text-[10px]">
                          วันที่ ........../........../..........
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer page note */}
                <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] text-slate-400">
                  <span>ระบบบริหารจัดการและติดตามกระบวนการตาม BRIDGE Model (EdPEx Category 6)</span>
                  <span>หน้า 1 / 1 &bull; เอกสารเสนอผู้บริหาร</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  </div>
);
};

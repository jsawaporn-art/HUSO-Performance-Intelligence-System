import React, { useState, useRef } from 'react';
import {
  BridgeImprovement,
  BRIDGE_STEPS,
} from '../../types/bridge';
import { Department } from '../../types';
import {
  Printer,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  Building2,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  Sparkles,
  Download,
} from 'lucide-react';

interface BridgePrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportTitle: string;
  reportKey: string;
  data: BridgeImprovement[];
  fiscalYear: string;
  selectedDeptName: string;
  departments: Department[];
}

export const BridgePrintPreviewModal: React.FC<BridgePrintPreviewModalProps> = ({
  isOpen,
  onClose,
  reportTitle,
  reportKey,
  data,
  fiscalYear,
  selectedDeptName,
  departments,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const nowThai = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handlePrint = () => {
    // Isolated iframe print
    const printElement = printAreaRef.current;
    if (!printElement) {
      window.print();
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
      return;
    }

    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle} - ประจำปีงบประมาณ ${fiscalYear}</title>
          <style>
            @page {
              size: A4 ${orientation};
              margin: 12mm 15mm 12mm 15mm;
            }
            body {
              font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: #1e293b;
              background: #ffffff;
              margin: 0;
              padding: 0;
              font-size: 11pt;
              line-height: 1.4;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 6px 8px;
              text-align: left;
              font-size: 9.5pt;
            }
            th {
              background-color: #f1f5f9 !important;
              font-weight: bold;
              color: #0f172a;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header-box {
              border-bottom: 2px solid #0284c7;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .badge {
              display: inline-block;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 8pt;
              font-weight: bold;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
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
      }, 2000);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900 text-slate-100 rounded-2xl w-full max-w-6xl shadow-2xl border border-slate-700 flex flex-col max-h-[95vh] overflow-hidden">
        {/* Modal Top Bar */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                ตัวอย่างก่อนพิมพ์ (Print Preview) - A4
              </h2>
              <p className="text-xs text-slate-400">
                {reportTitle} | ประจำปีงบประมาณ {fiscalYear} ({data.length} รายการ)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700 text-xs">
              <button
                onClick={() => setZoomLevel((z) => Math.max(60, z - 15))}
                className="p-1.5 hover:bg-slate-700 rounded text-slate-300 transition-colors"
                title="ย่อขนาด (Zoom Out)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono text-[11px] text-slate-300 font-bold">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(140, z + 15))}
                className="p-1.5 hover:bg-slate-700 rounded text-slate-300 transition-colors"
                title="ขยายขนาด (Zoom In)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Orientation Toggle */}
            <div className="hidden sm:flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700 text-xs">
              <button
                onClick={() => setOrientation('portrait')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                  orientation === 'portrait' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                แนวตั้ง
              </button>
              <button
                onClick={() => setOrientation('landscape')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                  orientation === 'landscape' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                แนวนอน
              </button>
            </div>

            {/* Print Action */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์เอกสาร (Print)</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - Scrollable Canvas */}
        <div className="flex-1 overflow-auto bg-slate-950/60 p-4 sm:p-8 flex justify-center items-start">
          <div
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out',
            }}
            className="w-full max-w-5xl"
          >
            {/* A4 Paper Canvas */}
            <div
              ref={printAreaRef}
              className="bg-white text-slate-900 p-8 sm:p-12 shadow-2xl rounded-sm border border-slate-300 min-h-[297mm] text-[13px] leading-relaxed mx-auto font-sans"
              style={{
                width: orientation === 'landscape' ? '297mm' : '210mm',
                maxWidth: '100%',
              }}
            >
              {/* Header Box */}
              <div className="header-box border-b-2 border-blue-600 pb-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                      คณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏยะลา
                    </h1>
                    <p className="text-sm text-slate-600 font-medium mt-0.5">
                      ระบบติดตามและบริหารงานคุณภาพ BRIDGE (BRIDGE Performance Framework)
                    </p>
                    <div className="mt-2 text-base font-bold text-blue-900">
                      {reportTitle}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs text-slate-500 space-y-1">
                      <div>
                        <span className="font-bold text-slate-700">ปีงบประมาณ:</span> {fiscalYear}
                      </div>
                      <div>
                        <span className="font-bold text-slate-700">หน่วยงาน:</span> {selectedDeptName}
                      </div>
                      <div>
                        <span className="font-bold text-slate-700">วันที่พิมพ์:</span> {nowThai}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Stats Row */}
              <div className="grid grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 mb-6 text-center text-xs">
                <div>
                  <div className="text-slate-500 font-medium">จำนวนประเด็นทั้งหมด</div>
                  <div className="text-lg font-bold text-slate-900">{data.length} รายการ</div>
                </div>
                <div>
                  <div className="text-slate-500 font-medium">ดำเนินการเสร็จสิ้น (100%)</div>
                  <div className="text-lg font-bold text-emerald-600">
                    {data.filter((d) => (d.currentProgressPercentage || 0) >= 100 || d.overallStatus === 'COMPLETED').length} รายการ
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 font-medium">กำลังดำเนินการ</div>
                  <div className="text-lg font-bold text-blue-600">
                    {data.filter((d) => d.overallStatus === 'IN_PROGRESS' || (!d.overallStatus && (d.currentProgressPercentage || 0) < 100)).length} รายการ
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 font-medium">นวัตกรรม/Best Practice</div>
                  <div className="text-lg font-bold text-amber-600">
                    {data.filter((d) => d.isInnovationCandidate || d.isBestPractice || d.evaluationResult === 'พร้อมขยายผล').length} รายการ
                  </div>
                </div>
              </div>

              {/* Main Report Table */}
              {data.length === 0 ? (
                <div className="text-center py-16 text-slate-400 border border-dashed border-slate-300 rounded-lg">
                  ไม่พบข้อมูลประเด็นปรับปรุงงานตามเงื่อนไขที่เลือก
                </div>
              ) : (
                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold">
                      <th className="border border-slate-300 px-2 py-2 text-center w-12">ลำดับ</th>
                      <th className="border border-slate-300 px-2 py-2 text-center w-28">รหัสประเด็น</th>
                      <th className="border border-slate-300 px-3 py-2 text-left">ชื่อประเด็นปรับปรุงงาน / รายละเอียด</th>
                      <th className="border border-slate-300 px-2 py-2 text-left w-36">หน่วยงาน / ผู้รับผิดชอบ</th>
                      <th className="border border-slate-300 px-2 py-2 text-center w-24">ขั้น BRIDGE</th>
                      <th className="border border-slate-300 px-2 py-2 text-center w-20">ความก้าวหน้า</th>
                      <th className="border border-slate-300 px-2 py-2 text-center w-24">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item, idx) => {
                      const stepInfo = BRIDGE_STEPS[item.currentBridgeStep || 'B'] || BRIDGE_STEPS.B;
                      const progress = item.currentProgressPercentage || 0;
                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50/50">
                          <td className="border border-slate-300 px-2 py-2 text-center text-slate-500 font-mono">
                            {idx + 1}
                          </td>
                          <td className="border border-slate-300 px-2 py-2 text-center font-mono font-bold text-blue-900">
                            {item.improvementId}
                          </td>
                          <td className="border border-slate-300 px-3 py-2">
                            <div className="font-bold text-slate-900">{item.title}</div>
                            {item.issueDetails && (
                              <div className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                                {item.issueDetails}
                              </div>
                            )}
                            {item.relatedIndicatorName && (
                              <div className="text-[10px] text-blue-700 mt-1">
                                🎯 เชื่อมโยง KPI: {item.relatedIndicatorName}
                              </div>
                            )}
                          </td>
                          <td className="border border-slate-300 px-2 py-2">
                            <div className="font-medium text-slate-800">{item.ownerNameSnapshot || '-'}</div>
                            <div className="text-[11px] text-slate-500">{item.primaryResponsiblePersonName || '-'}</div>
                          </td>
                          <td className="border border-slate-300 px-2 py-2 text-center">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              {stepInfo.code} - {stepInfo.nameTh}
                            </span>
                          </td>
                          <td className="border border-slate-300 px-2 py-2 text-center">
                            <div className="font-bold text-slate-900 font-mono">{progress}%</div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                              <div
                                className={`h-full ${
                                  progress >= 100
                                    ? 'bg-emerald-500'
                                    : progress >= 50
                                    ? 'bg-blue-500'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                              />
                            </div>
                          </td>
                          <td className="border border-slate-300 px-2 py-2 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                progress >= 100 || item.overallStatus === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.overallStatus === 'DRAFT'
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {item.overallStatus === 'COMPLETED'
                                ? 'เสร็จสิ้น'
                                : item.overallStatus === 'DRAFT'
                                ? 'ร่าง'
                                : 'กำลังดำเนินการ'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* Signature / Footer */}
              <div className="mt-12 pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <div className="text-slate-500 mb-10">ผู้จัดทำรายงาน</div>
                  <div className="font-bold text-slate-900">...........................................................</div>
                  <div className="text-slate-600 mt-1">(...........................................................)</div>
                  <div className="text-slate-500 mt-0.5">ตำแหน่ง ..................................................</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-10">ผู้รับรองรายงาน / หัวหน้าส่วนงาน</div>
                  <div className="font-bold text-slate-900">...........................................................</div>
                  <div className="text-slate-600 mt-1">(...........................................................)</div>
                  <div className="text-slate-500 mt-0.5">ตำแหน่ง ..................................................</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

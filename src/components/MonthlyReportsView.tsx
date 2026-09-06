import React, { useState, useMemo } from 'react';
import { FileText, Printer, Download, ExternalLink, Plus, CheckCircle2, FileDown, Calendar, Filter, Sparkles } from 'lucide-react';
import { MonthlyReport, Indicator, MonthlyProgress, Target, Department } from '../types';
import { HusoLogo } from './HusoLogo';
import {
  STANDARD_REPORTING_PERIODS,
  getReportingPeriodInfo,
  normalizeReportingPeriod,
  getDeduplicatedProgress,
  calculateAchievementAndTrafficLight,
} from '../lib/reportingPeriodUtils';

interface MonthlyReportsViewProps {
  reports: MonthlyReport[];
  indicators: Indicator[];
  monthlyProgressList: MonthlyProgress[];
  targets?: Target[];
  departments?: Department[];
  selectedYear: string;
  onGenerateReport: (fiscalYear: string, month: number) => void;
}

export const MonthlyReportsView: React.FC<MonthlyReportsViewProps> = ({
  reports,
  indicators,
  monthlyProgressList,
  targets = [],
  departments = [],
  selectedYear,
  onGenerateReport,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Q2');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [activeReport, setActiveReport] = useState<MonthlyReport | null>(null);

  const activeIndicators = useMemo(() => indicators.filter((i) => i.status !== 'DELETED'), [indicators]);
  const periodInfo = useMemo(() => getReportingPeriodInfo(selectedPeriod), [selectedPeriod]);

  // Retrieve deduplicated progress records for the selected period
  const deduplicatedRecords = useMemo(() => {
    return getDeduplicatedProgress(monthlyProgressList, selectedYear, selectedPeriod);
  }, [monthlyProgressList, selectedYear, selectedPeriod]);

  // Combine indicators with their corresponding progress result for complete reporting
  const reportRows = useMemo(() => {
    return activeIndicators.map((ind) => {
      const prg = deduplicatedRecords.find((p) => p.indicatorId === ind.indicatorId);
      const tgt = targets.find((t) => t.indicatorId === ind.indicatorId && t.fiscalYear === selectedYear);

      let cumulativeTarget = ind.baseline || 10;
      if (tgt) {
        if (selectedPeriod === 'Q1') cumulativeTarget = tgt.q1Target || tgt.monthlyTargets[2] || cumulativeTarget;
        else if (selectedPeriod === 'Q2') cumulativeTarget = tgt.q2Target || tgt.cumulativeTargets?.[5] || tgt.monthlyTargets[5] || cumulativeTarget;
        else if (selectedPeriod === 'Q3') cumulativeTarget = tgt.q3Target || tgt.cumulativeTargets?.[8] || tgt.monthlyTargets[8] || cumulativeTarget;
        else if (selectedPeriod === 'Q4' || selectedPeriod === 'ANNUAL') cumulativeTarget = tgt.annualTarget || tgt.q4Target || cumulativeTarget;
        else if (selectedPeriod === 'NINE_MONTH') cumulativeTarget = tgt.q3Target || tgt.cumulativeTargets?.[8] || cumulativeTarget;
      }

      const calc = prg
        ? calculateAchievementAndTrafficLight(ind, prg.targetCumulative || cumulativeTarget, prg.actualCumulative)
        : calculateAchievementAndTrafficLight(ind, cumulativeTarget, 0);

      return {
        indicator: ind,
        progress: prg,
        targetCumulative: prg?.targetCumulative || cumulativeTarget,
        actualCumulative: prg ? prg.actualCumulative : null,
        achievementPercent: prg ? calc.achievementPercent : null,
        achievementDisplay: prg ? calc.achievementDisplay : 'ยังไม่รายงาน',
        status: prg ? calc.status : 'NO_DATA',
        statusLabel: prg ? calc.statusLabel : 'ยังไม่รายงาน',
        statusColorClass: prg ? calc.statusColorClass : 'bg-slate-100 text-slate-500 border-slate-200',
        verificationStatus: prg?.verificationStatus || 'NOT_REPORTED',
      };
    });
  }, [activeIndicators, deduplicatedRecords, targets, selectedYear, selectedPeriod]);

  // Summary Metrics
  const summaryStats = useMemo(() => {
    const total = activeIndicators.length;
    const reported = deduplicatedRecords.length;
    const approvedOrVerified = deduplicatedRecords.filter(
      (p) => p.verificationStatus === 'APPROVED' || p.verificationStatus === 'VERIFIED'
    ).length;

    const onTrack = deduplicatedRecords.filter((p) => p.status === 'ON_TRACK').length;
    const watch = deduplicatedRecords.filter((p) => p.status === 'WATCH').length;
    const risk = deduplicatedRecords.filter((p) => p.status === 'RISK').length;
    const critical = deduplicatedRecords.filter((p) => p.status === 'CRITICAL').length;

    let totalAch = 0;
    let validAchCount = 0;
    deduplicatedRecords.forEach((p) => {
      if (typeof p.achievementPercent === 'number' && !isNaN(p.achievementPercent)) {
        totalAch += p.achievementPercent;
        validAchCount++;
      }
    });

    const avgAchievement = validAchCount > 0 ? Math.round((totalAch / validAchCount) * 10) / 10 : 0;

    return {
      total,
      reported,
      approvedOrVerified,
      onTrack,
      watch,
      risk,
      critical,
      avgAchievement,
    };
  }, [activeIndicators, deduplicatedRecords]);

  const handleGenerate = () => {
    const targetMonthEquivalent = periodInfo.targetMonthIndex + 1;
    onGenerateReport(selectedYear, targetMonthEquivalent);
    alert(`ประมวลผลรายงานความก้าวหน้าผลการดำเนินงานรอบ ${periodInfo.label} ปีงบประมาณ ${selectedYear} เรียบร้อยแล้ว`);
  };

  const handleExportPDF = (rep?: MonthlyReport) => {
    if (rep) {
      setActiveReport(rep);
    }
    setShowPrintModal(true);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handleDownloadReportText = (rep?: MonthlyReport) => {
    const reportContent = `===================================================================
รายงานความก้าวหน้าผลการดำเนินงานตามแผนยุทธศาสตร์ (KPI / KVI)
คณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏยะลา
รอบการรายงาน: ${periodInfo.label} (${periodInfo.dateRangeText}) ปีงบประมาณ ${selectedYear}
===================================================================

1. สรุปภาพรวม:
- ตัวชี้วัดทั้งหมด: ${summaryStats.total} ตัวชี้วัด
- รายงานผลแล้ว: ${summaryStats.reported} ตัวชี้วัด (${Math.round((summaryStats.reported / (summaryStats.total || 1)) * 100)}%)
- ตรวจสอบ/รับรองแล้ว: ${summaryStats.approvedOrVerified} ตัวชี้วัด
- ร้อยละความสำเร็จเฉลี่ย: ${summaryStats.avgAchievement}%
- On Track: ${summaryStats.onTrack} | Watch: ${summaryStats.watch} | Risk: ${summaryStats.risk} | Critical: ${summaryStats.critical}

2. รายการตัวชี้วัดและผลการดำเนินงาน:
${reportRows
  .map(
    (r) =>
      `- [${r.indicator.code}] ${r.indicator.name}
   หน่วยงาน: ${r.indicator.departmentName || r.indicator.responsibleDepartmentName}
   เป้าหมายสะสม: ${r.targetCumulative} ${r.indicator.unit} | ผลงานสะสม: ${r.actualCumulative !== null ? r.actualCumulative : '-'} | ร้อยละ: ${r.achievementDisplay} | สถานะ: ${r.statusLabel} (${r.verificationStatus})`
  )
  .join('\n\n')}

===================================================================
สร้างจากระบบ HUSO Performance Management System เมื่อ ${new Date().toLocaleString('th-TH')}
`;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HUSO_Progress_Report_${selectedYear}_${selectedPeriod}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Title & Controls Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-300">
              <FileText className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              รายงานความก้าวหน้าผลการดำเนินงาน (Performance Reports)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            ประมวลผล สรุปภาพรวม และส่งออกรายงานผลการดำเนินงาน (Export PDF Report) เสนอที่ประชุมคณะกรรมการบริหารคณะฯ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 6 Standard Reporting Periods Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Calendar className="w-4 h-4 text-amber-600" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-transparent text-amber-900 text-xs font-bold focus:outline-none cursor-pointer"
            >
              {STANDARD_REPORTING_PERIODS.map((period) => (
                <option key={period.key} value={period.key}>
                  {period.label} ({period.dateRangeText})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerate}
            className="flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ประมวลผลออกรายงานรอบนี้</span>
          </button>

          <button
            onClick={() => handleExportPDF()}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-md transition cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-amber-400" />
            <span>Export Report (PDF)</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards for the Selected Period */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-500">ตัวชี้วัดทั้งหมด / รายงานแล้ว</span>
          <div className="text-xl font-black text-slate-900">
            {summaryStats.reported} <span className="text-xs text-slate-400 font-normal">/ {summaryStats.total}</span>
          </div>
          <div className="text-[10px] text-amber-800 font-semibold">
            รอบ {periodInfo.shortLabel} ({periodInfo.dateRangeText})
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-500">ร้อยละความสำเร็จเฉลี่ย</span>
          <div className="text-xl font-black text-amber-800">{summaryStats.avgAchievement}%</div>
          <div className="text-[10px] text-slate-500">
            รับรองแล้ว {summaryStats.approvedOrVerified} รายการ
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-500">สถานะ On Track / Watch</span>
          <div className="text-xl font-black text-emerald-700">
            🟢 {summaryStats.onTrack} <span className="text-amber-600 text-sm font-bold ml-1">🟡 {summaryStats.watch}</span>
          </div>
          <div className="text-[10px] text-slate-500">บรรลุเป้าหมาย / เฝ้าระวัง</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-500">สถานะ Risk / Critical</span>
          <div className="text-xl font-black text-rose-700">
            🟠 {summaryStats.risk} <span className="text-rose-800 text-sm font-bold ml-1">🔴 {summaryStats.critical}</span>
          </div>
          <div className="text-[10px] text-slate-500">ต้องการมาตรการเร่งรัด</div>
        </div>
      </div>

      {/* Main Table for the Selected Period */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">
              ตารางสรุปผลการดำเนินงานรอบ {periodInfo.label} (ปีงบประมาณ {selectedYear})
            </h3>
          </div>
          <button
            onClick={() => handleDownloadReportText()}
            className="flex items-center space-x-1 text-xs font-semibold text-slate-600 hover:text-amber-800 bg-slate-50 hover:bg-amber-50 px-3 py-1.5 rounded-lg border border-slate-200 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ดาวน์โหลดสรุป (.txt)</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3 w-28">รหัส</th>
                <th className="p-3 min-w-[240px]">ชื่อตัวชี้วัด</th>
                <th className="p-3 w-40">หน่วยงานรับผิดชอบ</th>
                <th className="p-3 text-center w-28">เป้าหมายสะสม</th>
                <th className="p-3 text-center w-28">ผลงานสะสม</th>
                <th className="p-3 text-center w-28">% ความสำเร็จ</th>
                <th className="p-3 text-center w-36">สถานะ Traffic Light</th>
                <th className="p-3 text-center w-32">สถานะการรับรอง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportRows.map((r) => (
                <tr key={r.indicator.indicatorId} className="hover:bg-slate-50/70 transition">
                  <td className="p-3 font-mono font-bold text-amber-900">{r.indicator.code}</td>
                  <td className="p-3">
                    <div className="font-semibold text-slate-800">{r.indicator.name}</div>
                    <div className="text-[10px] text-slate-500 font-normal">
                      ประเภท: {r.indicator.type} | หน่วย: {r.indicator.unit}
                    </div>
                  </td>
                  <td className="p-3 text-slate-600">
                    {r.indicator.departmentName || r.indicator.responsibleDepartmentName}
                  </td>
                  <td className="p-3 text-center font-semibold text-slate-800">
                    {r.targetCumulative}
                  </td>
                  <td className="p-3 text-center font-bold text-amber-950">
                    {r.actualCumulative !== null ? r.actualCumulative : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="p-3 text-center font-extrabold text-slate-900">
                    {r.achievementDisplay}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${r.statusColorClass}`}>
                      {r.status === 'ON_TRACK' && '🟢 On Track'}
                      {r.status === 'WATCH' && '🟡 Watch'}
                      {r.status === 'RISK' && '🟠 Risk'}
                      {r.status === 'CRITICAL' && '🔴 Critical'}
                      {r.status === 'NO_DATA' && '⚪ ยังไม่ประเมิน'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                        r.verificationStatus === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.verificationStatus === 'VERIFIED'
                          ? 'bg-sky-100 text-sky-800'
                          : r.verificationStatus === 'SUBMITTED'
                          ? 'bg-amber-100 text-amber-800'
                          : r.verificationStatus === 'DRAFT'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-rose-50 text-rose-500'
                      }`}
                    >
                      {r.verificationStatus === 'APPROVED' && 'อนุมัติรับรองแล้ว'}
                      {r.verificationStatus === 'VERIFIED' && 'ตรวจสอบแล้ว'}
                      {r.verificationStatus === 'SUBMITTED' && 'รอตรวจสอบ'}
                      {r.verificationStatus === 'DRAFT' && 'แบบร่าง'}
                      {r.verificationStatus === 'NOT_REPORTED' && 'ยังไม่รายงาน'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Preview / Export PDF Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-6 shadow-2xl text-slate-800 space-y-4 my-8 print:p-0 print:border-none print:shadow-none">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 print:hidden">
              <div className="flex items-center space-x-2">
                <FileDown className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-amber-900">
                  ส่งออกรายงานความก้าวหน้าผลการดำเนินงาน (Export PDF Report)
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>พิมพ์ / บันทึกเป็น PDF (Print to PDF)</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Document Box */}
            <div id="printable-report" className="bg-white text-slate-900 p-8 rounded-xl border border-slate-200 shadow-inner text-xs leading-relaxed space-y-4 font-sans print:border-none print:shadow-none print:p-0">
              <div className="flex items-center justify-between border-b pb-4 gap-4">
                <div className="flex items-center gap-3">
                  <HusoLogo variant="badge" size="lg" className="border border-slate-200 shadow-none" />
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                      รายงานความก้าวหน้าผลการดำเนินงานตามแผนยุทธศาสตร์ (KPI / KVI)
                    </h2>
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-700">
                      คณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏยะลา
                    </h3>
                    <p className="text-[11px] text-amber-800 font-bold mt-0.5">
                      รอบการรายงาน: {periodInfo.label} ({periodInfo.dateRangeText}) ปีงบประมาณ {selectedYear}
                    </p>
                  </div>
                </div>
                <div className="hidden sm:block text-right text-[10px] text-slate-500 font-mono">
                  <div>HUSO Performance Intelligence</div>
                  <div>เอกสารรายงานผลอย่างเป็นทางการ</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-sm text-amber-900">1. สรุปภาพรวมการดำเนินงาน</h4>
                <p className="text-slate-700 leading-relaxed">
                  ในรอบ {periodInfo.label} ปีงบประมาณ {selectedYear} คณะมนุษยศาสตร์และสังคมศาสตร์ มีตัวชี้วัดกำกับการดำเนินงานตามแผนยุทธศาสตร์จำนวนทั้งสิ้น {activeIndicators.length} ตัวชี้วัด โดยมีการบันทึกรายงานผลการดำเนินงานแล้วจำนวน {summaryStats.reported} ตัวชี้วัด และมีผลการบรรลุเป้าหมายเฉลี่ยคิดเป็นร้อยละ {summaryStats.avgAchievement}% มีสถานะ On Track {summaryStats.onTrack} ตัวชี้วัด, Watch {summaryStats.watch} ตัวชี้วัด, Risk {summaryStats.risk} ตัวชี้วัด และ Critical {summaryStats.critical} ตัวชี้วัด
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sm text-amber-900 mb-2">2. ตารางสรุปผลการดำเนินงานรายตัวชี้วัด (รอบ {periodInfo.shortLabel})</h4>
                <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-800">
                      <th className="border border-slate-300 p-2">รหัส</th>
                      <th className="border border-slate-300 p-2">ชื่อตัวชี้วัด</th>
                      <th className="border border-slate-300 p-2">หน่วยงานรับผิดชอบ</th>
                      <th className="border border-slate-300 p-2 text-center">เป้าหมายสะสม</th>
                      <th className="border border-slate-300 p-2 text-center">ผลงานสะสม</th>
                      <th className="border border-slate-300 p-2 text-center">% ความสำเร็จ</th>
                      <th className="border border-slate-300 p-2 text-center">สถานะ</th>
                      <th className="border border-slate-300 p-2 text-center">การรับรอง</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportRows.map((r) => (
                      <tr key={r.indicator.indicatorId} className="hover:bg-slate-50">
                        <td className="border border-slate-300 p-2 font-mono font-bold text-amber-900">{r.indicator.code}</td>
                        <td className="border border-slate-300 p-2">{r.indicator.name}</td>
                        <td className="border border-slate-300 p-2 text-slate-600">{r.indicator.departmentName || r.indicator.responsibleDepartmentName}</td>
                        <td className="border border-slate-300 p-2 text-center">{r.targetCumulative}</td>
                        <td className="border border-slate-300 p-2 text-center font-semibold">{r.actualCumulative !== null ? r.actualCumulative : '-'}</td>
                        <td className="border border-slate-300 p-2 text-center font-bold">{r.achievementDisplay}</td>
                        <td className="border border-slate-300 p-2 text-center text-[10px] font-bold">
                          {r.status === 'ON_TRACK' && '🟢 On Track'}
                          {r.status === 'WATCH' && '🟡 Watch'}
                          {r.status === 'RISK' && '🟠 Risk'}
                          {r.status === 'CRITICAL' && '🔴 Critical'}
                          {r.status === 'NO_DATA' && '⚪ ยังไม่ประเมิน'}
                        </td>
                        <td className="border border-slate-300 p-2 text-center text-[10px]">
                          {r.verificationStatus}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-6 border-t border-slate-200 grid grid-cols-2 text-center text-[11px] text-slate-600">
                <div>
                  <p>ผู้รายงาน: งานแผนและประกันคุณภาพ คณะมนุษยศาสตร์และสังคมศาสตร์</p>
                  <p>วันที่พิมพ์รายงาน: {new Date().toLocaleDateString('th-TH')}</p>
                </div>
                <div>
                  <p>รับรองรายงาน: คณบดีคณะมนุษยศาสตร์และสังคมศาสตร์</p>
                  <p>ระบบ HUSO Performance Management System</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

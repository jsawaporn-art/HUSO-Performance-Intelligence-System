import React, { useState, useMemo } from 'react';
import {
  BridgeImprovement,
  BRIDGE_STEPS,
  BridgeExecutiveDecision,
} from '../../types/bridge';
import { Department, Indicator, Personnel, User } from '../../types';
import {
  FileText,
  Printer,
  Download,
  Search,
  Filter,
  Building2,
  GraduationCap,
  Layers,
  Award,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  CheckCircle2,
  Sparkles,
  Send,
  Eye,
} from 'lucide-react';
import { BridgeExecutiveReportModal } from './BridgeExecutiveReportModal';
import { BridgePrintPreviewModal } from './BridgePrintPreviewModal';

interface BridgeReportsProps {
  improvements: BridgeImprovement[];
  departments: Department[];
  indicators: Indicator[];
  personnelList?: Personnel[];
  users?: User[];
  decisions?: BridgeExecutiveDecision[];
  currentUser: User | null;
  selectedYear?: string;
  onSelectImprovement: (item: BridgeImprovement) => void;
}

export const BridgeReports: React.FC<BridgeReportsProps> = ({
  improvements,
  departments,
  indicators,
  personnelList = [],
  users = [],
  decisions = [],
  currentUser,
  selectedYear = '2569',
  onSelectImprovement,
}) => {
  const [selectedReportKey, setSelectedReportKey] = useState<string>('RPT_01');
  const [filterYear, setFilterYear] = useState<string>(selectedYear || '2569');
  const [filterDept, setFilterDept] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExecutiveReportModalOpen, setIsExecutiveReportModalOpen] = useState<boolean>(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState<boolean>(false);

  const reportTypes = [
    { key: 'RPT_01', title: '1. ทะเบียนประเด็นปรับปรุงงานทั้งหมด', desc: 'Master Registry of all improvements' },
    { key: 'RPT_02', title: '2. รายงานประเด็นแยกตามหน่วยงาน', desc: 'By Administrative Department' },
    { key: 'RPT_03', title: '3. รายงานประเด็นแยกตามหลักสูตร', desc: 'By Academic Program/Course' },
    { key: 'RPT_04', title: '4. รายงานประเด็นแยกตามด้านงาน/กระบวนการ', desc: 'By Work Domain' },
    { key: 'RPT_05', title: '5. รายงานประเด็นตามกลุ่มลูกค้า (VOC)', desc: 'By Customer & Stakeholder Group' },
    { key: 'RPT_06', title: '6. รายงานประเด็นที่เชื่อมโยง KPI/KVI', desc: 'Linked to Strategic KPI/KVI' },
    { key: 'RPT_07', title: '7. รายงานติดตามความก้าวหน้ารายบุคคล', desc: 'By Primary Responsible Person' },
    { key: 'RPT_08', title: '8. รายงานประเด็นล่าช้าเกินกำหนด', desc: 'Overdue & Delayed Tasks' },
    { key: 'RPT_09', title: '9. รายงานเปรียบเทียบผลก่อน-หลังปรับปรุง', desc: 'Before vs After Improvements' },
    { key: 'RPT_10', title: '10. รายงานนวัตกรรมและ Best Practice', desc: 'Innovations & Best Practices' },
    { key: 'RPT_11', title: '11. รายงานสรุปผลประจำปีสำหรับผู้บริหาร', desc: 'Annual Executive Summary' },
    { key: 'RPT_12', title: '12. รายงานสำหรับ Management Review', desc: 'Management Review Meeting Brief' },
    { key: 'RPT_13', title: '13. รายงานการปรับปรุงตามเกณฑ์ EdPEx', desc: 'EdPEx Process Excellence Alignment' },
  ];

  // Filter items based on active report
  const filteredData = useMemo(() => {
    return improvements.filter((item) => {
      if (filterYear !== 'ALL' && String(item.fiscalYear) !== filterYear) return false;
      if (filterDept !== 'ALL' && item.ownerId !== filterDept) return false;

      if (selectedReportKey === 'RPT_02' && item.ownerType !== 'DEPARTMENT') return false;
      if (selectedReportKey === 'RPT_03' && item.ownerType !== 'COURSE') return false;
      if (selectedReportKey === 'RPT_06' && !item.relatedIndicatorId) return false;
      if (selectedReportKey === 'RPT_08') {
        const isOverdue =
          item.targetEndDate &&
          item.overallStatus !== 'COMPLETED' &&
          new Date(item.targetEndDate).getTime() < Date.now();
        if (!isOverdue) return false;
      }
      if (selectedReportKey === 'RPT_10') {
        if (!item.isInnovationCandidate && !item.isBestPractice && item.evaluationResult !== 'พร้อมขยายผล') {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.title?.toLowerCase().includes(q) ||
          item.improvementId?.toLowerCase().includes(q) ||
          item.ownerNameSnapshot?.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [improvements, selectedReportKey, filterYear, filterDept, searchQuery]);

  const activeReport = reportTypes.find((r) => r.key === selectedReportKey);

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-blue-600" />
            ศูนย์รายงานและเอกสารสรุปผล (BRIDGE Reports Center)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            รายงาน 13 รูปแบบพร้อมพิมพ์และส่งออกสำหรับการทบทวนและประเมินคุณภาพ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsExecutiveReportModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>จัดทำเอกสารรายงานเสนอผู้บริหาร (PDF)</span>
          </button>

          <button
            onClick={() => setIsPrintPreviewOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>ดูตัวอย่างก่อนพิมพ์ (Print Preview)</span>
          </button>

          <button
            onClick={() => setIsPrintPreviewOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer border border-slate-700"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์รายงาน (Print)</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs print:hidden">
        <div className="flex items-center gap-2 min-w-[160px]">
          <span className="text-slate-500 font-bold">ปีงบประมาณ:</span>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold focus:outline-none"
          >
            <option value="2569">2569</option>
            <option value="2570">2570</option>
            <option value="2571">2571</option>
            <option value="ALL">ทุกปีงบประมาณ</option>
          </select>
        </div>

        <div className="flex items-center gap-2 min-w-[200px]">
          <span className="text-slate-500 font-bold">หน่วยงาน:</span>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium focus:outline-none max-w-[220px]"
          >
            <option value="ALL">ทุกหน่วยงาน/หลักสูตร</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อประเด็น, รหัส, ผู้รับผิดชอบ..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: 13 Reports Menu */}
        <div className="lg:col-span-4 space-y-2 print:hidden">
          <div className="text-xs font-bold uppercase text-slate-400">เลือกรูปแบบรายงาน</div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-[650px] overflow-y-auto">
            {reportTypes.map((rpt) => {
              const isSelected = selectedReportKey === rpt.key;
              return (
                <button
                  key={rpt.key}
                  onClick={() => setSelectedReportKey(rpt.key)}
                  className={`w-full p-3.5 text-left transition-all ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border-l-4 border-blue-600'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs'
                  }`}
                >
                  <div className="text-xs truncate">{rpt.title}</div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{rpt.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Report Paper Display (Print-ready) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Paper Container */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
            {/* Report Header */}
            <div className="border-b border-slate-200 dark:border-slate-700 pb-4 text-center space-y-1">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                คณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏยะลา
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {activeReport?.title}
              </h2>
              <div className="text-xs text-slate-500">
                ระบบติดตามและปรับปรุงกระบวนการทำงานตาม BRIDGE Model | ประจำปีงบประมาณ พ.ศ. {filterYear}
              </div>
              <div className="text-[11px] text-slate-400">
                พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH')} โดย: {currentUser?.fullName || 'ผู้ดูแลระบบ'}
              </div>
            </div>

            {/* Summary Count Header */}
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl print:bg-transparent">
              <div>
                จำนวนประเด็นที่พบ: <span className="font-bold text-slate-900 dark:text-white">{filteredData.length}</span> รายการ
              </div>
              <div>สถานะ: ครอบคลุมทุกขั้น BRIDGE</div>
            </div>

            {/* Table of Results */}
            {filteredData.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                ไม่พบข้อมูลประเด็นในเงื่อนไขรายงานนี้
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold bg-slate-50/50 dark:bg-slate-800/30">
                      <th className="py-2.5 px-3">รหัส</th>
                      <th className="py-2.5 px-3">ชื่อประเด็นปรับปรุง</th>
                      <th className="py-2.5 px-3">หน่วยงาน/หลักสูตร</th>
                      <th className="py-2.5 px-3">ผู้รับผิดชอบ</th>
                      <th className="py-2.5 px-3 text-center">ขั้น BRIDGE</th>
                      <th className="py-2.5 px-3 text-right">ความก้าวหน้า</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredData.map((item) => {
                      const step = BRIDGE_STEPS[item.currentBridgeStep || 'B'];
                      return (
                        <tr
                          key={item.id}
                          onClick={() => onSelectImprovement(item)}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 cursor-pointer"
                        >
                          <td className="py-3 px-3 font-mono font-bold text-blue-600">
                            {item.improvementId}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 dark:text-white">{item.title}</div>
                            <div className="text-[11px] text-slate-400 line-clamp-1">{item.issueDetails}</div>
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                            {item.ownerNameSnapshot}
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                            {item.primaryResponsiblePersonName}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${step.badgeBg} ${step.badgeText}`}>
                              {item.currentBridgeStep}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                            {item.currentProgressPercentage || 0}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bridge Executive Report Modal */}
      <BridgeExecutiveReportModal
        isOpen={isExecutiveReportModalOpen}
        onClose={() => setIsExecutiveReportModalOpen(false)}
        improvements={improvements}
        departments={departments}
        indicators={indicators}
        personnelList={personnelList}
        users={users}
        decisions={decisions}
        currentUser={currentUser}
        selectedYear={filterYear}
      />

      {/* Bridge Print Preview Modal */}
      <BridgePrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        reportTitle={activeReport?.title || 'รายงานประเด็นปรับปรุงงาน'}
        reportKey={selectedReportKey}
        data={filteredData}
        fiscalYear={filterYear}
        selectedDeptName={
          filterDept === 'ALL'
            ? 'ทุกหน่วยงาน/หลักสูตร'
            : departments.find((d) => d.id === filterDept)?.name || filterDept
        }
        departments={departments}
      />
    </div>
  );
};

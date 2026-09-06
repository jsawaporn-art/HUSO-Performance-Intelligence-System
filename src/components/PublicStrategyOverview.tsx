import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
} from 'recharts';
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  BarChart3,
  Filter,
  X,
  Calendar,
  Clock,
  Info,
  ChevronRight,
} from 'lucide-react';
import {
  PublicStrategyPerformanceSummary,
  StrategyPerformanceItem,
  StrategicOverallStatus,
} from '../lib/reportingPeriodUtils';

interface PublicStrategyOverviewProps {
  summary: PublicStrategyPerformanceSummary;
  selectedStrategyFilter: string;
  selectedStatusClassification: string;
  onSelectStrategyFilter: (strategyId: string) => void;
  onSelectStatusClassification: (classification: string) => void;
  onClearFilters: () => void;
}

const STRATEGY_LINE_COLORS = [
  '#0284c7', // sky-600
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#6366f1', // indigo-500
];

export const PublicStrategyOverview: React.FC<PublicStrategyOverviewProps> = ({
  summary,
  selectedStrategyFilter,
  selectedStatusClassification,
  onSelectStrategyFilter,
  onSelectStatusClassification,
  onClearFilters,
}) => {
  const [hoveredStrategyId, setHoveredStrategyId] = useState<string | null>(null);
  const [activeTooltipItem, setActiveTooltipItem] = useState<{
    strategy: StrategyPerformanceItem;
    segment?: 'ACHIEVED' | 'NOT_ACHIEVED' | 'NOT_REPORTED';
  } | null>(null);

  const { strategies, overallTotals, reportingPeriodInfo, trendData, fiscalYear } = summary;

  // Prepare data for Trend Line Chart
  const trendChartData = trendData.map((t) => {
    const point: Record<string, any> = {
      periodLabel: t.periodShortLabel || t.periodCode,
      fullPeriodLabel: t.periodLabel,
    };

    strategies.forEach((strat) => {
      const stratData = t.strategies[strat.strategyId];
      if (stratData && stratData.hasData && stratData.achievedPercent !== null) {
        point[strat.strategyId] = stratData.achievedPercent;
      } else {
        point[strat.strategyId] = null; // null for gaps
      }
      point[`${strat.strategyId}_details`] = stratData;
    });

    return point;
  });

  const getOverallStatusBadge = (status: StrategicOverallStatus, label: string) => {
    switch (status) {
      case 'ON_TRACK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {label}
          </span>
        );
      case 'WATCH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            {label}
          </span>
        );
      case 'RISK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-300">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            {label}
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            {label}
          </span>
        );
      case 'NOT_ASSESSED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            {label}
          </span>
        );
    }
  };

  const hasAnyFilterActive =
    selectedStrategyFilter !== 'ALL' || selectedStatusClassification !== 'ALL';

  return (
    <div className="space-y-8" id="public-strategy-overview-section">
      {/* 1. Main Strategy Achievement Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-7 space-y-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                ภาพรวมการบรรลุตัวชี้วัดรายยุทธศาสตร์
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              แสดงสัดส่วนตัวชี้วัดที่บรรลุและไม่บรรลุเป้าหมาย จำแนกตามประเด็นยุทธศาสตร์ ในปีงบประมาณ{' '}
              <strong className="text-slate-800 font-semibold">{fiscalYear}</strong> และรอบรายงาน{' '}
              <strong className="text-amber-700 font-semibold">{reportingPeriodInfo.label}</strong>
            </p>
          </div>

          {/* Interactive Legends */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            <button
              onClick={() =>
                onSelectStatusClassification(
                  selectedStatusClassification === 'ACHIEVED' ? 'ALL' : 'ACHIEVED'
                )
              }
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                selectedStatusClassification === 'ACHIEVED'
                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm font-bold'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
              title="คลิกเพื่อกรองเฉพาะตัวชี้วัดที่บรรลุเป้าหมาย"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block border border-white" />
              <span>บรรลุเป้าหมาย (≥100%)</span>
              <span className="font-mono font-bold ml-1">({overallTotals.achievedCount})</span>
            </button>

            <button
              onClick={() =>
                onSelectStatusClassification(
                  selectedStatusClassification === 'NOT_ACHIEVED' ? 'ALL' : 'NOT_ACHIEVED'
                )
              }
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                selectedStatusClassification === 'NOT_ACHIEVED'
                  ? 'bg-rose-500 text-white border-rose-600 shadow-sm font-bold'
                  : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
              }`}
              title="คลิกเพื่อกรองเฉพาะตัวชี้วัดที่ไม่บรรลุเป้าหมาย"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block border border-white" />
              <span>ไม่บรรลุเป้าหมาย (&lt;100%)</span>
              <span className="font-mono font-bold ml-1">({overallTotals.notAchievedCount})</span>
            </button>

            <button
              onClick={() =>
                onSelectStatusClassification(
                  selectedStatusClassification === 'NOT_REPORTED' ? 'ALL' : 'NOT_REPORTED'
                )
              }
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                selectedStatusClassification === 'NOT_REPORTED'
                  ? 'bg-slate-700 text-white border-slate-800 shadow-sm font-bold'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
              title="คลิกเพื่อกรองเฉพาะตัวชี้วัดที่ยังไม่รายงาน/ยังประเมินไม่ได้"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block border border-white" />
              <span>ยังไม่รายงาน/ยังประเมินไม่ได้</span>
              <span className="font-mono font-bold ml-1">({overallTotals.notReportedCount})</span>
            </button>
          </div>
        </div>

        {/* Active Filter Indicator / Clear Button */}
        {hasAnyFilterActive && (
          <div className="flex items-center justify-between bg-amber-50/80 border border-amber-200 rounded-2xl px-4 py-2.5 text-xs text-amber-900">
            <div className="flex items-center space-x-2 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-bold">กำลังกรองการแสดงผล:</span>
              {selectedStrategyFilter !== 'ALL' && (
                <span className="bg-white px-2 py-0.5 rounded-lg border border-amber-300 font-semibold shadow-xs">
                  {strategies.find((s) => s.strategyId === selectedStrategyFilter)?.displayTitle ||
                    selectedStrategyFilter}
                </span>
              )}
              {selectedStatusClassification !== 'ALL' && (
                <span className="bg-white px-2 py-0.5 rounded-lg border border-amber-300 font-semibold shadow-xs">
                  สถานะ:{' '}
                  {selectedStatusClassification === 'ACHIEVED'
                    ? 'บรรลุเป้าหมาย'
                    : selectedStatusClassification === 'NOT_ACHIEVED'
                    ? 'ไม่บรรลุเป้าหมาย'
                    : 'ยังไม่รายงาน/ยังประเมินไม่ได้'}
                </span>
              )}
            </div>
            <button
              onClick={onClearFilters}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold transition text-xs cursor-pointer shadow-xs"
            >
              <X className="w-3 h-3" />
              <span>ล้างตัวกรอง</span>
            </button>
          </div>
        )}

        {/* 100% Horizontal Stacked Bar Chart */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
            <span>ประเด็นยุทธศาสตร์</span>
            <span>สัดส่วนความสำเร็จ 100% (Horizontal Stacked Bar)</span>
          </div>

          <div className="space-y-3.5">
            {strategies.map((strat, index) => {
              const isSelected = selectedStrategyFilter === strat.strategyId;
              const isHovered = hoveredStrategyId === strat.strategyId;

              if (!strat.hasIndicators || strat.totalIndicators === 0) {
                return (
                  <div
                    key={strat.strategyId}
                    className="p-3.5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-slate-700">
                        {strat.displayTitle}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {strat.emptyReasonText || 'ยังไม่มีตัวชี้วัดที่เผยแพร่ในยุทธศาสตร์นี้'}
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 px-2 py-0.5 bg-slate-200/60 rounded-md">
                        ไม่มีข้อมูล
                      </span>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={strat.strategyId}
                  onMouseEnter={() => setHoveredStrategyId(strat.strategyId)}
                  onMouseLeave={() => {
                    setHoveredStrategyId(null);
                    setActiveTooltipItem(null);
                  }}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isSelected
                      ? 'border-amber-400 bg-amber-50/40 shadow-sm'
                      : isHovered
                      ? 'border-slate-300 bg-slate-50/70 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {/* Top Bar: Title, Count, Status Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                    <button
                      onClick={() =>
                        onSelectStrategyFilter(isSelected ? 'ALL' : strat.strategyId)
                      }
                      className="text-left group flex items-center space-x-1.5 cursor-pointer"
                    >
                      <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-amber-700 transition">
                        {strat.displayTitle}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition" />
                    </button>

                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-slate-500 font-medium">
                        ตัวชี้วัดทั้งหมด <strong className="text-slate-800">{strat.totalIndicators}</strong> ตัว
                      </span>
                      {getOverallStatusBadge(strat.overallStatus, strat.overallStatusLabel)}
                    </div>
                  </div>

                  {/* 100% Stacked Bar */}
                  <div className="relative w-full h-8 bg-slate-100 rounded-xl overflow-hidden flex shadow-inner border border-slate-200">
                    {/* Green Segment: Achieved */}
                    {strat.achievedCount > 0 && (
                      <button
                        onClick={() => {
                          onSelectStrategyFilter(strat.strategyId);
                          onSelectStatusClassification('ACHIEVED');
                        }}
                        onMouseEnter={() =>
                          setActiveTooltipItem({ strategy: strat, segment: 'ACHIEVED' })
                        }
                        style={{ width: `${strat.achievedPercent}%` }}
                        className="h-full bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center justify-center text-white text-[11px] font-extrabold px-1 truncate cursor-pointer relative group"
                        title={`บรรลุ ${strat.achievedCount} ตัว (${strat.achievedPercent}%) - คลิกเพื่อกรอง`}
                      >
                        {strat.achievedPercent >= 12 && (
                          <span className="drop-shadow-xs truncate">
                            {strat.achievedPercent}%
                          </span>
                        )}
                      </button>
                    )}

                    {/* Red Segment: Not Achieved */}
                    {strat.notAchievedCount > 0 && (
                      <button
                        onClick={() => {
                          onSelectStrategyFilter(strat.strategyId);
                          onSelectStatusClassification('NOT_ACHIEVED');
                        }}
                        onMouseEnter={() =>
                          setActiveTooltipItem({ strategy: strat, segment: 'NOT_ACHIEVED' })
                        }
                        style={{ width: `${strat.notAchievedPercent}%` }}
                        className="h-full bg-rose-500 hover:bg-rose-600 transition-colors flex items-center justify-center text-white text-[11px] font-extrabold px-1 truncate cursor-pointer relative group"
                        title={`ไม่บรรลุ ${strat.notAchievedCount} ตัว (${strat.notAchievedPercent}%) - คลิกเพื่อกรอง`}
                      >
                        {strat.notAchievedPercent >= 12 && (
                          <span className="drop-shadow-xs truncate">
                            {strat.notAchievedPercent}%
                          </span>
                        )}
                      </button>
                    )}

                    {/* Gray Segment: Not Reported / Unassessed */}
                    {strat.notReportedCount > 0 && (
                      <button
                        onClick={() => {
                          onSelectStrategyFilter(strat.strategyId);
                          onSelectStatusClassification('NOT_REPORTED');
                        }}
                        onMouseEnter={() =>
                          setActiveTooltipItem({ strategy: strat, segment: 'NOT_REPORTED' })
                        }
                        style={{ width: `${strat.notReportedPercent}%` }}
                        className="h-full bg-slate-400 hover:bg-slate-500 transition-colors flex items-center justify-center text-white text-[11px] font-extrabold px-1 truncate cursor-pointer relative group"
                        title={`ยังไม่รายงาน ${strat.notReportedCount} ตัว (${strat.notReportedPercent}%) - คลิกเพื่อกรอง`}
                      >
                        {strat.notReportedPercent >= 12 && (
                          <span className="drop-shadow-xs truncate">
                            {strat.notReportedPercent}%
                          </span>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Segment Details & Counts */}
                  <div className="flex flex-wrap items-center justify-between pt-1.5 text-[11px] text-slate-500 gap-2">
                    <div className="flex items-center space-x-3 flex-wrap">
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        บรรลุ: {strat.achievedCount} ตัว ({strat.achievedPercent}%)
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        ไม่บรรลุ: {strat.notAchievedCount} ตัว ({strat.notAchievedPercent}%)
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        ยังไม่รายงาน: {strat.notReportedCount} ตัว ({strat.notReportedPercent}%)
                      </span>
                    </div>

                    {strat.lastUpdatedDate && (
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          อัปเดตล่าสุด:{' '}
                          {new Date(strat.lastUpdatedDate).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Summary Table beneath the Chart */}
        <div className="pt-6 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-amber-600" />
              <span>ตารางสรุปผลการบรรลุตัวชี้วัดจำแนกตามยุทธศาสตร์</span>
            </h3>
            <span className="text-xs text-slate-400">
              ประจำปีงบประมาณ {fiscalYear} ({reportingPeriodInfo.label})
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3 px-4">ประเด็นยุทธศาสตร์</th>
                  <th className="py-3 px-3 text-center">ตัวชี้วัดทั้งหมด</th>
                  <th className="py-3 px-3 text-center text-emerald-700">บรรลุ (ตัว)</th>
                  <th className="py-3 px-3 text-center text-emerald-700">ร้อยละบรรลุ</th>
                  <th className="py-3 px-3 text-center text-rose-700">ไม่บรรลุ (ตัว)</th>
                  <th className="py-3 px-3 text-center text-rose-700">ร้อยละไม่บรรลุ</th>
                  <th className="py-3 px-3 text-center text-slate-600">ยังไม่รายงาน (ตัว)</th>
                  <th className="py-3 px-3 text-center text-slate-600">ร้อยละยังไม่รายงาน</th>
                  <th className="py-3 px-4 text-center">สถานะภาพรวม</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {strategies.map((strat) => (
                  <tr
                    key={strat.strategyId}
                    onClick={() =>
                      onSelectStrategyFilter(
                        selectedStrategyFilter === strat.strategyId ? 'ALL' : strat.strategyId
                      )
                    }
                    className={`hover:bg-amber-50/40 transition-colors cursor-pointer ${
                      selectedStrategyFilter === strat.strategyId ? 'bg-amber-50 font-semibold' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{strat.displayTitle}</div>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                      {strat.totalIndicators}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700">
                      {strat.achievedCount}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700 bg-emerald-50/40">
                      {strat.hasIndicators ? `${strat.achievedPercent}%` : '-'}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-rose-700">
                      {strat.notAchievedCount}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-rose-700 bg-rose-50/40">
                      {strat.hasIndicators ? `${strat.notAchievedPercent}%` : '-'}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-600">
                      {strat.notReportedCount}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-600 bg-slate-50">
                      {strat.hasIndicators ? `${strat.notReportedPercent}%` : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getOverallStatusBadge(strat.overallStatus, strat.overallStatusLabel)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-950">
                  <td className="py-3.5 px-4 text-amber-400">
                    รวมทั้งสิ้น ({strategies.length} ยุทธศาสตร์)
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono text-sm">
                    {overallTotals.totalIndicators}
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono text-sm text-emerald-400">
                    {overallTotals.achievedCount}
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono text-sm text-emerald-400 bg-emerald-950/40">
                    {overallTotals.achievedPercent}%
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono text-sm text-rose-400">
                    {overallTotals.notAchievedCount}
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono text-sm text-rose-400 bg-rose-950/40">
                    {overallTotals.notAchievedPercent}%
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono text-sm text-slate-300">
                    {overallTotals.notReportedCount}
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono text-sm text-slate-300 bg-slate-800/40">
                    {overallTotals.notReportedPercent}%
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-500 text-slate-950">
                      รวมทุกยุทธศาสตร์
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex items-start space-x-2 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>หมายเหตุเกณฑ์สถานะภาพรวมยุทธศาสตร์:</strong> 🟢 <strong>ON TRACK</strong> (ร้อยละบรรลุ ≥80%),{' '}
              🟡 <strong>WATCH</strong> (ร้อยละบรรลุ 60–79.9%),{' '}
              🟠 <strong>RISK</strong> (ร้อยละบรรลุ 40–59.9%),{' '}
              🔴 <strong>CRITICAL</strong> (ร้อยละบรรลุ &lt;40%),{' '}
              ⚪ <strong>ยังไม่สามารถประเมินได้</strong> (ไม่มีตัวชี้วัดหรือยังไม่มีรายงานผล)
              <br />
              <span className="text-slate-400">
                *เกณฑ์นี้เป็นการประเมินสถานะภาพรวมของประเด็นยุทธศาสตร์ตามสัดส่วนจำนวนตัวชี้วัดที่บรรลุเป้าหมาย ไม่ใช่เกณฑ์ Traffic Light รายตัวชี้วัดเดี่ยว
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* 3. Strategic Trend Line Graph */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                แนวโน้มร้อยละการบรรลุตัวชี้วัดรายยุทธศาสตร์
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              เปรียบเทียบแนวโน้มร้อยละความสำเร็จของแต่ละยุทธศาสตร์ตลอด 6 รอบรายงาน (Q1, Q2, Q3, Q4, ผลสะสม 9 เดือน, สิ้นปีงบประมาณ)
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400">แกน Y: 0 – 100%</span>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trendChartData}
              margin={{ top: 15, right: 30, left: 0, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="periodLabel"
                stroke="#64748b"
                tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }}
                tickMargin={10}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(val) => `${val}%`}
                stroke="#64748b"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickCount={6}
              />
              <RechartsTooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const currentPoint = payload[0]?.payload;
                  return (
                    <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xl border border-slate-700 text-xs space-y-2 max-w-sm">
                      <div className="font-extrabold text-amber-400 border-b border-slate-700 pb-1.5 flex items-center justify-between">
                        <span>รอบรายงาน: {currentPoint?.fullPeriodLabel || label}</span>
                        <span className="text-slate-400 font-normal">ปีงบฯ {fiscalYear}</span>
                      </div>
                      <div className="space-y-1.5">
                        {payload.map((entry: any) => {
                          const stratId = entry.dataKey;
                          const strat = strategies.find((s) => s.strategyId === stratId);
                          const details = currentPoint?.[`${stratId}_details`];
                          const val = entry.value;

                          if (!strat) return null;

                          return (
                            <div
                              key={stratId}
                              className="flex items-center justify-between space-x-3 text-[11px]"
                            >
                              <div className="flex items-center space-x-1.5 truncate max-w-[200px]">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-slate-200 truncate">{strat.displayTitle}</span>
                              </div>
                              <div className="font-mono font-bold text-right shrink-0">
                                {val !== null && val !== undefined ? (
                                  <span className="text-emerald-400">{val}%</span>
                                ) : (
                                  <span className="text-slate-500 font-normal">ยังไม่มีผล</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }}
              />
              <RechartsLegend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => {
                  const strat = strategies.find((s) => s.strategyId === value);
                  return (
                    <span className="text-xs font-semibold text-slate-700 mr-2">
                      {strat?.displayTitle || value}
                    </span>
                  );
                }}
              />

              {strategies.map((strat, idx) => (
                <Line
                  key={strat.strategyId}
                  type="monotone"
                  dataKey={strat.strategyId}
                  name={strat.strategyId}
                  stroke={STRATEGY_LINE_COLORS[idx % STRATEGY_LINE_COLORS.length]}
                  strokeWidth={selectedStrategyFilter === strat.strategyId ? 4 : 2.5}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 7 }}
                  connectNulls={false} // CRITICAL: Do NOT connect nulls so missing/future periods show gaps instead of false 0%
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  BridgeImprovement,
  BRIDGE_STEPS,
} from '../../types/bridge';
import { User } from '../../types';
import {
  Award,
  Sparkles,
  ArrowUpRight,
  Search,
  BookOpen,
  Share2,
  CheckCircle2,
  Building2,
  GraduationCap,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface BridgeInnovationsBestPracticesProps {
  improvements: BridgeImprovement[];
  currentUser: User | null;
  onSelectImprovement: (item: BridgeImprovement) => void;
}

export const BridgeInnovationsBestPractices: React.FC<BridgeInnovationsBestPracticesProps> = ({
  improvements,
  currentUser,
  onSelectImprovement,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'INNOVATION' | 'BEST_PRACTICE' | 'SCALED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const candidates = useMemo(() => {
    return improvements.filter((item) => {
      const isInnov = item.isInnovationCandidate || item.evaluationResult === 'เสนอเป็นนวัตกรรม';
      const isBP = item.isBestPractice || item.evaluationResult === 'เสนอเป็นแนวปฏิบัติที่ดี';
      const isScaled = (item.scalingTargetDepartmentsOrCourses && item.scalingTargetDepartmentsOrCourses.length > 0) || item.evaluationResult === 'พร้อมขยายผล';

      if (!isInnov && !isBP && !isScaled) return false;

      if (filterType === 'INNOVATION' && !isInnov) return false;
      if (filterType === 'BEST_PRACTICE' && !isBP) return false;
      if (filterType === 'SCALED' && !isScaled) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.title?.toLowerCase().includes(q) ||
          item.improvementApproach?.toLowerCase().includes(q) ||
          item.ownerNameSnapshot?.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [improvements, filterType, searchQuery]);

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Award className="w-6 h-6 text-amber-600" />
            คลังนวัตกรรมและแนวปฏิบัติที่ดี (Innovations & Best Practices)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            รวบรวมแนวคิด นวัตกรรมการทำงาน และแนวปฏิบัติที่เป็นเลิศเพื่อการขยายผลตามเกณฑ์ EdPEx
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: 'ALL', label: 'ทั้งหมด', count: candidates.length },
          { key: 'INNOVATION', label: 'นวัตกรรมการทำงาน', count: improvements.filter((i) => i.isInnovationCandidate).length },
          { key: 'BEST_PRACTICE', label: 'แนวปฏิบัติที่ดี (Best Practice)', count: improvements.filter((i) => i.isBestPractice).length },
          { key: 'SCALED', label: 'ผลงานพร้อมขยายผล', count: improvements.filter((i) => i.evaluationResult === 'พร้อมขยายผล').length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterType(tab.key as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              filterType === tab.key
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <span>{tab.label}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Grid of Knowledge Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {candidates.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-2">
            <BookOpen className="w-8 h-8 mx-auto opacity-50" />
            <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
              ยังไม่มีรายการนวัตกรรมหรือ Best Practice ที่ผ่านการรับรอง
            </div>
            <div className="text-xs text-slate-500">
              ประเด็นที่ดำเนินการสำเร็จและถอดบทเรียนแล้ว จะได้รับการเสนอชื่อเข้าสู่คลังความรู้นี้
            </div>
          </div>
        ) : (
          candidates.map((item) => {
            const isInnov = item.isInnovationCandidate;
            const isBP = item.isBestPractice;

            return (
              <div
                key={item.id}
                onClick={() => onSelectImprovement(item)}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 hover:border-amber-400/80 shadow-sm hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {isInnov && (
                        <span className="px-2 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-[10px]">
                          นวัตกรรม
                        </span>
                      )}
                      {isBP && (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                          Best Practice
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {item.improvementId}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-amber-600 transition-colors line-clamp-2">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {item.improvementApproach || item.issueDetails}
                  </p>

                  {item.edpexResultImprovementDetail && (
                    <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                      <div className="font-bold text-[11px]">ผลสำเร็จที่เกิดขึ้น:</div>
                      <div className="line-clamp-2 text-slate-600 dark:text-slate-300">
                        {item.edpexResultImprovementDetail}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span className="truncate">{item.ownerNameSnapshot}</span>
                  <span className="font-bold text-amber-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    อ่านเพิ่มเติม &rarr;
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

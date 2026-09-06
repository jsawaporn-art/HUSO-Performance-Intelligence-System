import React, { useState, useMemo } from 'react';
import {
  BridgeImprovement,
  BRIDGE_STEPS,
  BridgeStep,
  HUSO_MASTER_COURSES,
} from '../../types/bridge';
import { getPriorityConfig } from '../../lib/bridgePriorityUtils';
import { Department, Indicator, User } from '../../types';
import {
  Building2,
  GraduationCap,
  Search,
  Filter,
  Layers,
  ChevronRight,
  Plus,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
  Sparkles,
} from 'lucide-react';

interface BridgeDeptListProps {
  improvements: BridgeImprovement[];
  departments: Department[];
  currentUser: User | null;
  onSelectImprovement: (item: BridgeImprovement) => void;
  onOpenCreateWizard: () => void;
  onOpenAiSummary?: (item: BridgeImprovement) => void;
  onStartOperation?: (item: BridgeImprovement) => void;
  onDeleteImprovement?: (item: BridgeImprovement, autoRenumber?: boolean) => Promise<void> | void;
}

export const BridgeDeptList: React.FC<BridgeDeptListProps> = ({
  improvements,
  departments,
  currentUser,
  onSelectImprovement,
  onOpenCreateWizard,
  onOpenAiSummary,
  onStartOperation,
  onDeleteImprovement,
}) => {
  const [activeTab, setActiveTab] = useState<'DEPT' | 'COURSE'>('DEPT');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [itemToDelete, setItemToDelete] = useState<BridgeImprovement | null>(null);
  const [autoRenumberOnDelete, setAutoRenumberOnDelete] = useState<boolean>(true);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const canDelete =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'EXECUTIVE' ||
    currentUser?.role === 'STAFF';

  // Department / Course list
  const entities = activeTab === 'DEPT' ? departments : HUSO_MASTER_COURSES;

  // Filtered items
  const filteredItems = useMemo(() => {
    return improvements.filter((item) => {
      if (activeTab === 'DEPT' && item.ownerType !== 'DEPARTMENT') return false;
      if (activeTab === 'COURSE' && item.ownerType !== 'COURSE') return false;
      if (selectedEntityId !== 'ALL' && item.ownerId !== selectedEntityId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.title?.toLowerCase().includes(q) ||
          item.improvementId?.toLowerCase().includes(q) ||
          item.ownerNameSnapshot?.toLowerCase().includes(q) ||
          item.issueDetails?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [improvements, activeTab, selectedEntityId, searchQuery]);

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-blue-600" />
            ประเด็นปรับปรุงของหน่วยงานและหลักสูตร
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ติดตามประเด็นการดำเนินงาน จำแนกตามหน่วยงานสำนักงานคณะและหลักสูตร
          </p>
        </div>

        <button
          onClick={onOpenCreateWizard}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          เพิ่มประเด็นใหม่
        </button>
      </div>

      {/* Tabs: หน่วยงานสำนักงานคณะ vs หลักสูตร */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => {
            setActiveTab('DEPT');
            setSelectedEntityId('ALL');
          }}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all ${
            activeTab === 'DEPT'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          หน่วยงานสำนักงานคณะ ({departments.length})
        </button>

        <button
          onClick={() => {
            setActiveTab('COURSE');
            setSelectedEntityId('ALL');
          }}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all ${
            activeTab === 'COURSE'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          หลักสูตร ({HUSO_MASTER_COURSES.length})
        </button>
      </div>

      {/* Entity Selector Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedEntityId('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            selectedEntityId === 'ALL'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          ทั้งหมด ({improvements.filter((i) => (activeTab === 'DEPT' ? i.ownerType === 'DEPARTMENT' : i.ownerType === 'COURSE')).length})
        </button>

        {entities.map((ent) => {
          const count = improvements.filter((i) => i.ownerId === ent.id).length;
          const isSelected = selectedEntityId === ent.id;
          return (
            <button
              key={ent.id}
              onClick={() => setSelectedEntityId(ent.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                isSelected
                  ? activeTab === 'DEPT'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <span>{ent.name}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`ค้นหาประเด็นในหมวด ${activeTab === 'DEPT' ? 'หน่วยงาน' : 'หลักสูตร'}...`}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
        />
      </div>

      {/* List Display */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
        {filteredItems.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Layers className="w-8 h-8 mx-auto opacity-50" />
            <div className="text-sm font-semibold">ไม่พบประเด็นในหมวดนี้</div>
          </div>
        ) : (
          filteredItems.map((item, index) => {
            const step = BRIDGE_STEPS[item.currentBridgeStep || 'B'];
            const priorityConfig = getPriorityConfig(item.priority);
            return (
              <div
                key={item.id}
                onClick={() => onSelectImprovement(item)}
                className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="text-xs font-black text-slate-400 dark:text-slate-500 w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                    #{index + 1}
                  </span>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                        {item.improvementId}
                      </span>

                      {/* Priority Badge */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-bold ${priorityConfig.badgeBg} ${priorityConfig.badgeText} ${priorityConfig.borderColor}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${priorityConfig.dotColor}`} />
                        {priorityConfig.thaiLabel}
                      </span>

                      <span className={`px-2 py-0.5 rounded-md font-bold ${step.badgeBg} ${step.badgeText}`}>
                        ขั้น {item.currentBridgeStep}: {step.name}
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {item.ownerNameSnapshot}
                      </span>
                      <span className="text-slate-400">&bull;</span>
                      <span className="text-slate-500">{item.workDomain}</span>
                    </div>

                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {item.issueDetails}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {(item.overallStatus === 'DRAFT' || item.lifecycleStatus === 'DRAFT') && onStartOperation && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await onStartOperation(item);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
                      title="เริ่มดำเนินการและเปลี่ยนสถานะเป็น In Progress"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>เริ่มดำเนินการ</span>
                    </button>
                  )}
                  {onOpenAiSummary && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAiSummary(item);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1 border border-amber-300/40 transition-all cursor-pointer"
                      title="สรุปผลประเด็นด้วย AI & รายงานผู้บริหาร"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span className="hidden sm:inline">สรุปผล AI</span>
                    </button>
                  )}
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {item.currentProgressPercentage || 0}%
                    </div>
                    <div className="text-[10px] text-slate-400">ความก้าวหน้า</div>
                  </div>
                  {canDelete && onDeleteImprovement && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setItemToDelete(item);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                      title="ลบประเด็นนี้"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  ยืนยันการลบประเด็นปรับปรุงงาน?
                </h3>
                <div className="text-xs text-slate-500 font-mono">{itemToDelete.improvementId}</div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2">
                {itemToDelete.title}
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              รายการนี้จะถูกย้ายไปยังถังขยะ (Soft Delete) และผู้ดูแลระบบสามารถกู้คืนได้ภายหลัง
            </p>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRenumberOnDelete}
                onChange={(e) => setAutoRenumberOnDelete(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                รันและจัดระเบียบเลขรหัส BRG ของรายการที่เหลือใหม่อัตโนมัติ (เช่น BRG-2569-0001, 0002... ต่อเนื่องกัน)
              </span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!onDeleteImprovement || !itemToDelete) return;
                  setIsDeleting(true);
                  try {
                    await onDeleteImprovement(itemToDelete, autoRenumberOnDelete);
                    setItemToDelete(null);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
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
  );
};

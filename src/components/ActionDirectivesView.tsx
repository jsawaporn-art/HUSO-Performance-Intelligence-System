import React, { useState } from 'react';
import { AlertTriangle, Plus, CheckCircle2, Clock, UserCheck } from 'lucide-react';
import { ActionDirective, User } from '../types';

interface ActionDirectivesViewProps {
  directives: ActionDirective[];
  currentUser: User;
  onUpdateDirectiveStatus: (id: string, status: ActionDirective['status']) => void;
}

export const ActionDirectivesView: React.FC<ActionDirectivesViewProps> = ({
  directives,
  currentUser,
  onUpdateDirectiveStatus,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filtered = directives.filter((d) => {
    if (filterStatus === 'ALL') return true;
    return d.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              มาตรการแก้ไข & ข้อสั่งการบริหาร (Action Directives Tracker)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            ทะเบียนข้อสั่งการ คณะมนุษยศาสตร์และสังคมศาสตร์ เพื่อติดตามผู้รับผิดชอบและกำหนดส่งมอบผลงาน
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center space-x-1.5 bg-slate-800 p-1.5 rounded-xl border border-slate-700 text-xs">
          {['ALL', 'OPEN', 'IN_PROGRESS', 'COMPLETED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                filterStatus === st
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {st === 'ALL'
                ? 'ทั้งหมด'
                : st === 'OPEN'
                ? 'รอดำเนินการ'
                : st === 'IN_PROGRESS'
                ? 'กำลังดำเนินการ'
                : 'เสร็จสิ้น'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
            ไม่พบรายการข้อสั่งการในเงื่อนไขนี้
          </div>
        ) : (
          filtered.map((dir) => (
            <div
              key={dir.directiveId}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-3 hover:border-amber-500/50 transition flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                    {dir.indicatorCode}
                  </span>

                  <select
                    value={dir.status}
                    onChange={(e) =>
                      onUpdateDirectiveStatus(
                        dir.directiveId,
                        e.target.value as ActionDirective['status']
                      )
                    }
                    className={`text-[10px] font-bold rounded px-2 py-0.5 focus:outline-none cursor-pointer ${
                      dir.status === 'COMPLETED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : dir.status === 'IN_PROGRESS'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}
                  >
                    <option value="OPEN">🔴 รอดำเนินการ</option>
                    <option value="IN_PROGRESS">🟡 กำลังดำเนินการ</option>
                    <option value="COMPLETED">🟢 ดำเนินการเสร็จสิ้น</option>
                  </select>
                </div>

                <h3 className="text-sm font-bold text-amber-200">{dir.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  {dir.details}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center justify-between">
                  <span>ผู้รับมอบหมาย: <strong className="text-white">{dir.assignee}</strong></span>
                  <span>{dir.departmentName}</span>
                </div>
                <div className="flex items-center justify-between text-amber-400 font-semibold">
                  <span>กำหนดส่ง (Deadline):</span>
                  <span>{dir.deadline}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

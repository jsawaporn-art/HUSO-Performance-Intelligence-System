import React, { useState } from 'react';
import { FolderOpen, Search, ExternalLink, FileText, Trash2, Plus, Filter } from 'lucide-react';
import { Evidence, Indicator } from '../types';

interface EvidenceDriveProps {
  evidenceList: Evidence[];
  indicators: Indicator[];
  onDeleteEvidence: (id: string) => void;
}

export const EvidenceDrive: React.FC<EvidenceDriveProps> = ({
  evidenceList,
  indicators,
  onDeleteEvidence,
}) => {
  const [search, setSearch] = useState('');

  const filteredList = evidenceList.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.title.toLowerCase().includes(q) || e.ownerName.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <FolderOpen className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              คลังหลักฐานประกอบ (Evidence Drive)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            คลังจัดเก็บไฟล์เอกสาร รูปภาพ ลิงก์ Google Drive อ้างอิงผลการดำเนินงานรายตัวชี้วัด
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="ค้นหาเอกสารหลักฐาน..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg pl-9 pr-3 py-2 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Grid of Evidence Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredList.length === 0 ? (
          <div className="col-span-full bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
            ไม่พบเอกสารหลักฐานในคลัง
          </div>
        ) : (
          filteredList.map((item) => {
            const ind = indicators.find((i) => i.indicatorId === item.indicatorId);
            return (
              <div
                key={item.evidenceId}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3 hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="p-2 rounded-lg bg-sky-950 text-sky-400 border border-sky-800">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                    {item.fileType || 'Drive Link'}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white leading-snug line-clamp-2">
                    {item.title}
                  </h4>
                  {ind && (
                    <div className="text-[10px] text-amber-300 font-mono mt-1">
                      {ind.code}: {ind.name.substring(0, 30)}...
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-2 flex items-center justify-between">
                  <span>ผู้แนบ: {item.ownerName}</span>
                  <span>{item.uploadDate}</span>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                  <a
                    href={item.driveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-1 text-xs text-sky-400 hover:text-sky-300 font-bold"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>เปิดลิงก์ Google Drive</span>
                  </a>

                  <button
                    onClick={() => onDeleteEvidence(item.evidenceId)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-rose-400 transition"
                    title="ลบเอกสารหลักฐาน"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

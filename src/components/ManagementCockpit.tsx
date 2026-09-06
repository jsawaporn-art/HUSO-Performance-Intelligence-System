import React, { useState } from 'react';
import {
  Gauge,
  AlertTriangle,
  Plus,
  Clock,
  UserCheck,
  CheckCircle2,
  FileX,
  MessageSquare,
  ShieldAlert,
  ArrowRight,
  Send,
} from 'lucide-react';
import {
  Indicator,
  MonthlyProgress,
  ActionDirective,
  Department,
  User,
} from '../types';

interface ManagementCockpitProps {
  indicators: Indicator[];
  monthlyProgressList: MonthlyProgress[];
  directives: ActionDirective[];
  departments: Department[];
  currentUser: User;
  onCreateDirective: (directive: Partial<ActionDirective>) => void;
  onUpdateDirectiveStatus: (id: string, status: ActionDirective['status']) => void;
}

export const ManagementCockpit: React.FC<ManagementCockpitProps> = ({
  indicators,
  monthlyProgressList,
  directives,
  departments,
  currentUser,
  onCreateDirective,
  onUpdateDirectiveStatus,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedIndId, setSelectedIndId] = useState<string>('');
  const [directiveTitle, setDirectiveTitle] = useState('');
  const [directiveDetails, setDirectiveDetails] = useState('');
  const [assignee, setAssignee] = useState('');
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );

  // Critical indicators
  const criticalItems = monthlyProgressList.filter(
    (p) => p.status === 'CRITICAL' || p.status === 'RISK'
  );

  // Unreported / Overdue
  const reportedIndIds = new Set(monthlyProgressList.map((p) => p.indicatorId));
  const unreportedInds = indicators.filter(
    (i) => i.status !== 'DELETED' && !reportedIndIds.has(i.indicatorId)
  );

  // Missing Evidence
  const missingEvidenceItems = monthlyProgressList.filter(
    (p) => p.evidenceCount === 0
  );

  const handleOpenCreateModal = (indId?: string) => {
    if (indId) {
      setSelectedIndId(indId);
      const ind = indicators.find((i) => i.indicatorId === indId);
      if (ind) {
        setDirectiveTitle(`ข้อสั่งการเร่งรัดตัวชี้วัด ${ind.code}`);
        setAssignee(ind.ownerMain);
      }
    } else {
      setSelectedIndId('');
      setDirectiveTitle('');
      setAssignee('');
    }
    setShowModal(true);
  };

  const handleSubmitDirective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directiveTitle) return;

    const ind = indicators.find((i) => i.indicatorId === selectedIndId);

    onCreateDirective({
      indicatorId: selectedIndId,
      indicatorCode: ind?.code || 'KPI-EXEC',
      indicatorName: ind?.name || 'ข้อสั่งการระดับคณะ',
      title: directiveTitle,
      details: directiveDetails,
      departmentId: ind?.departmentId || 'DEPT-09',
      departmentName: ind?.departmentName || 'งานวิชาการ',
      assignee: assignee || 'ผู้รับผิดชอบหลัก',
      deadline,
      createdBy: currentUser.fullName,
    });

    setShowModal(false);
    setDirectiveTitle('');
    setDirectiveDetails('');
    setAssignee('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-orange-600 border border-amber-500 rounded-2xl p-6 shadow-md text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-xl bg-white text-amber-700 shadow-md font-bold">
                <Gauge className="w-6 h-6" />
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Management Cockpit (ห้องบัญชาการผู้บริหาร)
              </h2>
            </div>
            <p className="text-xs text-amber-100 mt-2 max-w-3xl leading-relaxed font-medium">
              หน้าจอติดตามผลการดำเนินงานระดับกลยุทธ์เฉพาะประเด็นวิกฤต ประเด็นชะลอตัว และสั่งการเร่งรัดโดยตรงจากคณบดีและทีมผู้บริหาร
            </p>
          </div>

          <button
            onClick={() => handleOpenCreateModal()}
            className="flex items-center justify-center space-x-2 bg-white hover:bg-amber-50 text-amber-900 font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4 text-amber-700" />
            <span>ออกข้อสั่งการผู้บริหารใหม่</span>
          </button>
        </div>
      </div>

      {/* Grid Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-rose-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800">ตัวชี้วัดวิกฤต/เสี่ยงสูง</span>
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">{criticalItems.length}</div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">ต้องการมาตรการเร่งรัดด่วน</p>
        </div>

        <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800">ยังไม่ได้รายงาน</span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">{unreportedInds.length}</div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">เลยกำหนด/ยังไม่บันทึก</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-800">ไม่มีหลักฐานประกอบ</span>
            <FileX className="w-5 h-5 text-sky-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">{missingEvidenceItems.length}</div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">ต้องแนบเอกสารรับรอง</p>
        </div>

        <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">ข้อสั่งการกำลังดำเนินการ</span>
            <UserCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">
            {directives.filter((d) => d.status === 'IN_PROGRESS' || d.status === 'OPEN').length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">จากข้อสั่งการทั้งหมด {directives.length}</p>
        </div>
      </div>

      {/* Main Cockpit Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Critical Issues & Fast Track Measures */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              ประเด็นวิกฤตและปัญหาอุปสรรคซ้ำซ้อน (Critical Issues Cockpit)
            </h3>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {criticalItems.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                🎉 ไม่พบประเด็นวิกฤตในขณะนี้
              </div>
            ) : (
              criticalItems.map((item) => (
                <div
                  key={item.progressId}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 hover:border-amber-400 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 rounded mr-2">
                        {item.indicatorCode}
                      </span>
                      <span className="text-sm font-bold text-slate-900">{item.indicatorName}</span>
                    </div>
                    <span className="text-sm font-black text-rose-600">
                      {item.achievementPercent}%
                    </span>
                  </div>

                  {item.problems && (
                    <div className="text-xs text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                      <strong className="text-amber-800">ปัญหา/สาเหตุ: </strong>
                      {item.problems} ({item.cause || 'ไม่ระบุสาเหตุ'})
                    </div>
                  )}

                  {item.fastTrackMeasure && (
                    <div className="text-xs text-emerald-900 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                      <strong className="text-emerald-800">มาตรการเร่งรัดที่เสนอ: </strong>
                      {item.fastTrackMeasure}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 text-xs border-t border-slate-200">
                    <span className="text-slate-500 font-medium">ผู้รับผิดชอบ: {item.ownerName}</span>
                    <button
                      onClick={() => handleOpenCreateModal(item.indicatorId)}
                      className="flex items-center space-x-1 text-xs text-amber-800 font-bold hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg border border-amber-300 transition"
                    >
                      <Send className="w-3.5 h-3.5 text-amber-700" />
                      <span>บันทึกข้อสั่งการ</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Active Directives Tracker */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-600" />
              ข้อสั่งการผู้บริหารและการติดตามผล (Executive Directives Log)
            </h3>
            <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-300 font-bold">
              {directives.length} รายการ
            </span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {directives.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                ยังไม่มีข้อสั่งการย้อนหลัง
              </div>
            ) : (
              directives.map((dir) => (
                <div
                  key={dir.directiveId}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 hover:border-slate-300 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded mr-2">
                        {dir.indicatorCode}
                      </span>
                      <h4 className="text-sm font-bold text-amber-900 inline">{dir.title}</h4>
                    </div>

                    <select
                      value={dir.status}
                      onChange={(e) =>
                        onUpdateDirectiveStatus(
                          dir.directiveId,
                          e.target.value as ActionDirective['status']
                        )
                      }
                      className={`text-[11px] font-bold rounded-lg px-2 py-1 focus:outline-none cursor-pointer ${
                        dir.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : dir.status === 'IN_PROGRESS'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      <option value="OPEN">🔴 รอดำเนินการ</option>
                      <option value="IN_PROGRESS">🟡 กำลังดำเนินการ</option>
                      <option value="COMPLETED">🟢 ดำเนินการเสร็จสิ้น</option>
                    </select>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                    {dir.details}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                    <div>
                      <strong className="text-slate-700">มอบหมาย: </strong>
                      {dir.assignee} ({dir.departmentName})
                    </div>
                    <div className="text-right">
                      <strong className="text-amber-800">กำหนดส่ง: </strong>
                      {dir.deadline}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal: Create Directive */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-900 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-amber-800">ออกข้อสั่งการบริหาร (Executive Directive)</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitDirective} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">เกี่ยวข้องกับตัวชี้วัด</label>
                <select
                  value={selectedIndId}
                  onChange={(e) => setSelectedIndId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2.5 focus:border-amber-500 focus:outline-none"
                >
                  <option value="">-- ข้อสั่งการทั่วไประดับคณะ --</option>
                  {indicators
                    .filter((i) => i.status !== 'DELETED')
                    .map((i) => (
                      <option key={i.indicatorId} value={i.indicatorId}>
                        {i.code}: {i.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">หัวข้อข้อสั่งการ *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น เร่งรัดการจัดทำรายงาน SAR และเตรียมเอกสารประเมิน"
                  value={directiveTitle}
                  onChange={(e) => setDirectiveTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2.5 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">รายละเอียดข้อสั่งการและมาตรการบังคับ</label>
                <textarea
                  rows={3}
                  placeholder="รายละเอียดแนวปฏิบัติ ขั้นตอนสั่งการ และการติดตาม..."
                  value={directiveDetails}
                  onChange={(e) => setDirectiveDetails(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2.5 focus:border-amber-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">ผู้รับมอบหมายหลัก *</label>
                  <input
                    type="text"
                    required
                    placeholder="ชื่อผู้รับผิดชอบ/หัวหน้างาน"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">กำหนดส่ง (Deadline) *</label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md"
                >
                  บันทึกข้อสั่งการ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

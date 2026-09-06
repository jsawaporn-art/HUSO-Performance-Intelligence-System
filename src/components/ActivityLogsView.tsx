import React, { useState } from 'react';
import { History, Search, Trash2, Download, CheckSquare, Square, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { ActivityLog, UserRole } from '../types';

interface ActivityLogsViewProps {
  logs: ActivityLog[];
  userRole?: UserRole;
  onClearLogs?: () => void;
  onDeleteLog?: (logId: string) => Promise<void> | void;
  onDeleteMultipleLogs?: (logIds: string[]) => Promise<void> | void;
}

export const ActivityLogsView: React.FC<ActivityLogsViewProps> = ({
  logs,
  userRole,
  onClearLogs,
  onDeleteLog,
  onDeleteMultipleLogs,
}) => {
  const [search, setSearch] = useState('');
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [logToDelete, setLogToDelete] = useState<ActivityLog | null>(null);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManageLogs = userRole === 'ADMIN' || userRole === 'EXECUTIVE';

  const filteredLogs = logs.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (l.userName || '').toLowerCase().includes(q) ||
      (l.details || '').toLowerCase().includes(q) ||
      (l.action || '').toLowerCase().includes(q) ||
      (l.recordId || '').toLowerCase().includes(q) ||
      (l.role || '').toLowerCase().includes(q)
    );
  });

  const handleToggleSelect = (logId: string) => {
    setSelectedLogIds((prev) =>
      prev.includes(logId) ? prev.filter((id) => id !== logId) : [...prev, logId]
    );
  };

  const handleSelectAll = () => {
    if (selectedLogIds.length === filteredLogs.length && filteredLogs.length > 0) {
      setSelectedLogIds([]);
    } else {
      setSelectedLogIds(filteredLogs.map((l) => l.logId));
    }
  };

  const handleConfirmClear = async () => {
    if (onClearLogs) {
      setIsDeleting(true);
      try {
        await onClearLogs();
        setSelectedLogIds([]);
      } finally {
        setIsDeleting(false);
        setShowClearConfirm(false);
      }
    }
  };

  const handleConfirmSingleDelete = async () => {
    if (logToDelete && onDeleteLog) {
      setIsDeleting(true);
      try {
        await onDeleteLog(logToDelete.logId);
        setSelectedLogIds((prev) => prev.filter((id) => id !== logToDelete.logId));
      } finally {
        setIsDeleting(false);
        setLogToDelete(null);
      }
    }
  };

  const handleConfirmBatchDelete = async () => {
    if (selectedLogIds.length > 0 && onDeleteMultipleLogs) {
      setIsDeleting(true);
      try {
        await onDeleteMultipleLogs(selectedLogIds);
        setSelectedLogIds([]);
      } finally {
        setIsDeleting(false);
        setShowBatchDeleteConfirm(false);
      }
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    const dataToExport = filteredLogs.length > 0 ? filteredLogs : logs;
    if (dataToExport.length === 0) {
      alert('ไม่มีข้อมูลประวัติสำหรับส่งออก');
      return;
    }

    const headers = [
      'วัน-เวลา (Timestamp)',
      'ผู้ดำเนินการ (User Name)',
      'บทบาท (Role)',
      'การกระทำ (Action)',
      'รหัสรายการ (Record ID)',
      'รายละเอียดการทำงาน (Details)',
      'สถานะ (Status)',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows: string[] = [];
    csvRows.push(headers.map(escapeCsv).join(','));

    dataToExport.forEach((item) => {
      const formattedDate = new Date(item.timestamp).toLocaleString('th-TH');
      csvRows.push(
        [
          formattedDate,
          item.userName || '',
          item.role || '',
          item.action || '',
          item.recordId || '',
          item.details || '',
          item.status || 'SUCCESS',
        ]
          .map(escapeCsv)
          .join(',')
      );
    });

    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `HUSO_Activity_Logs_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isAllSelected = filteredLogs.length > 0 && selectedLogIds.length === filteredLogs.length;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <History className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              ประวัติการทำงานในระบบ (Activity Audit Logs)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            บันทึกประวัติการสร้าง แก้ไข ลบ คืนค่า และรับรองข้อมูลในระบบโดยละเอียด พร้อมเครื่องมือดาวน์โหลดและจัดการข้อมูล
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-60 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="ค้นหาประวัติการทำงาน..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            title="ดาวน์โหลดประวัติเป็นไฟล์ CSV สำหรับเก็บถาวรหรือเปิดใน Excel"
            className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>ดาวน์โหลด CSV ({filteredLogs.length})</span>
          </button>

          {/* Batch Delete Selected Button */}
          {canManageLogs && selectedLogIds.length > 0 && onDeleteMultipleLogs && (
            <button
              onClick={() => setShowBatchDeleteConfirm(true)}
              className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap animate-fade-in"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ลบที่เลือก ({selectedLogIds.length})</span>
            </button>
          )}

          {/* Clear All Logs Button */}
          {canManageLogs && onClearLogs && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="inline-flex items-center gap-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60 font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>เคลียร์ทั้งหมด</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal - Single Delete */}
      {logToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <span className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30">
                <Trash2 className="w-5 h-5" />
              </span>
              <h3 className="text-base font-bold text-white">ยืนยันการลบรายการประวัติต้นฉบับ?</h3>
            </div>
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs space-y-1.5">
              <div className="text-slate-400">
                <span className="font-semibold text-slate-300">วัน-เวลา:</span>{' '}
                {new Date(logToDelete.timestamp).toLocaleString('th-TH')}
              </div>
              <div className="text-slate-400">
                <span className="font-semibold text-slate-300">ผู้ดำเนินการ:</span> {logToDelete.userName} (
                {logToDelete.role})
              </div>
              <div className="text-slate-300 font-medium">{logToDelete.details}</div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              การลบรายการนี้จะไม่สามารถกู้คืนได้ คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้ออกจากฐานข้อมูล?
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setLogToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmSingleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'กำลังลบ...' : 'ยืนยันลบรายการ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal - Batch Delete */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <span className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30">
                <Trash2 className="w-5 h-5" />
              </span>
              <h3 className="text-base font-bold text-white">ยืนยันการลบประวัติที่เลือก?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              คุณกำลังจะลบรายการประวัติการทำงานที่เลือกไว้จำนวน{' '}
              <span className="font-bold text-rose-400">{selectedLogIds.length} รายการ</span>{' '}
              ออกจากฐานข้อมูลอย่างถาวร
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowBatchDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmBatchDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'กำลังลบ...' : `ยืนยันลบ ${selectedLogIds.length} รายการ`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal - Clear All */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <span className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30">
                <Trash2 className="w-5 h-5" />
              </span>
              <h3 className="text-base font-bold text-white">ยืนยันการเคลียร์ประวัติทั้งหมด?</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              การกระทำนี้จะทำการลบประวัติกิจกรรมการบันทึกข้อมูล แก้ไข และอนุมัติทั้งหมดออกจากระบบ คุณแน่ใจหรือไม่ว่าต้องการดำเนินการต่อ?
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmClear}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'กำลังเคลียร์...' : 'ยืนยันเคลียร์ประวัติ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/90 text-slate-400 text-[10px] uppercase font-semibold">
              <tr>
                {canManageLogs && (
                  <th className="py-3 px-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-slate-400 hover:text-white transition cursor-pointer inline-flex items-center justify-center"
                      title={isAllSelected ? 'ยกเลิกการเลือกทั้งหมด' : 'เลือกทั้งหมด'}
                    >
                      {isAllSelected ? (
                        <CheckSquare className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                )}
                <th className="py-3 px-4">วัน-เวลา</th>
                <th className="py-3 px-4">ผู้ดำเนินการ</th>
                <th className="py-3 px-4">การกระทำ (Action)</th>
                <th className="py-3 px-4">รายละเอียด</th>
                {canManageLogs && <th className="py-3 px-3 w-14 text-center">จัดการ</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManageLogs ? 6 : 4}
                    className="py-12 text-center text-slate-500 text-xs"
                  >
                    ไม่พบประวัติการทำงาน
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isSelected = selectedLogIds.includes(log.logId);
                  return (
                    <tr
                      key={log.logId}
                      className={`hover:bg-slate-800/50 transition ${
                        isSelected ? 'bg-amber-500/10' : ''
                      }`}
                    >
                      {canManageLogs && (
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSelect(log.logId)}
                            className="text-slate-400 hover:text-white transition cursor-pointer inline-flex items-center justify-center"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-amber-400" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      )}
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('th-TH')}
                      </td>
                      <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                        {log.userName}
                        <span className="ml-1.5 text-[9px] text-amber-300 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded">
                          {log.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-extrabold rounded ${
                            log.action === 'CREATE'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                              : log.action === 'DELETE'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800/40'
                              : log.action === 'EDIT'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800/40'
                              : 'bg-sky-950 text-sky-300 border border-sky-800/40'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-200">{log.details}</td>
                      {canManageLogs && (
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setLogToDelete(log)}
                            title="ลบรายการประวัตินี้"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 transition-colors cursor-pointer inline-flex items-center justify-center"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, Search, ShieldAlert, Sparkles, Building2, GraduationCap, RefreshCw } from 'lucide-react';
import { Indicator } from '../types';
import { BridgeImprovement } from '../types/bridge';
import { trashService } from '../lib/firebase';
import { bridgeService } from '../lib/bridgeService';

interface TrashViewProps {
  onRestoreIndicator: (indicatorId: string) => void;
  onRefreshData: () => void;
}

export const TrashView: React.FC<TrashViewProps> = ({ onRestoreIndicator, onRefreshData }) => {
  const [activeTab, setActiveTab] = useState<'KPI' | 'BRIDGE'>('KPI');
  const [deletedKpiList, setDeletedKpiList] = useState<Indicator[]>([]);
  const [deletedBridgeList, setDeletedBridgeList] = useState<BridgeImprovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const [kpis, bridges] = await Promise.all([
        trashService.getDeleted(),
        bridgeService.getDeleted(),
      ]);
      setDeletedKpiList(Array.isArray(kpis) ? kpis : []);
      setDeletedBridgeList(Array.isArray(bridges) ? bridges : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const handleRestoreKpi = async (id: string) => {
    await onRestoreIndicator(id);
    fetchTrash();
    onRefreshData();
  };

  const handleRestoreBridge = async (id: string) => {
    try {
      await bridgeService.restore(id);
      fetchTrash();
      onRefreshData();
    } catch (err) {
      console.error('Failed to restore bridge item:', err);
    }
  };

  const filteredKpis = deletedKpiList.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.code.toLowerCase().includes(search.toLowerCase())
  );

  const filteredBridges = deletedBridgeList.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.improvementId.toLowerCase().includes(search.toLowerCase()) ||
      item.ownerNameSnapshot.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Trash2 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              ถังขยะระบบ (Soft Delete Trash Bin)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            รายการตัวชี้วัดและประเด็น BRIDGE ที่ถูกลบชั่วคราว สามารถกู้คืน (Restore) กลับสู่ระบบหลักได้โดยไม่สูญเสียข้อมูล
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="ค้นหาในถังขยะ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg pl-9 pr-3 py-2 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <button
            onClick={fetchTrash}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
            title="รีเฟรชถังขยะ"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('KPI')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all ${
            activeTab === 'KPI'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          ตัวชี้วัด KPI / KVI ({deletedKpiList.length})
        </button>
        <button
          onClick={() => setActiveTab('BRIDGE')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all ${
            activeTab === 'BRIDGE'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          ประเด็นปรับปรุง BRIDGE ({deletedBridgeList.length})
        </button>
      </div>

      {/* Table: KPI Tab */}
      {activeTab === 'KPI' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800 text-slate-400 text-[10px] uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">รหัสตัวชี้วัด</th>
                  <th className="py-3 px-4">ชื่อตัวชี้วัด</th>
                  <th className="py-3 px-4">ประเภท</th>
                  <th className="py-3 px-4">หน่วยงานหลัก</th>
                  <th className="py-3 px-4 text-right">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      กำลังโหลดข้อมูลถังขยะ...
                    </td>
                  </tr>
                ) : filteredKpis.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      ไม่มีรายการตัวชี้วัดในถังขยะ
                    </td>
                  </tr>
                ) : (
                  filteredKpis.map((item) => (
                    <tr key={item.indicatorId} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono font-bold text-amber-300">
                        {item.code}
                      </td>
                      <td className="py-3 px-4 font-bold text-white max-w-xs truncate">
                        {item.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {item.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{item.departmentName}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleRestoreKpi(item.indicatorId)}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>กู้คืนข้อมูล (Restore)</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Table: BRIDGE Tab */}
      {activeTab === 'BRIDGE' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800 text-slate-400 text-[10px] uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">รหัสประเด็น</th>
                  <th className="py-3 px-4">ชื่อประเด็นปรับปรุง</th>
                  <th className="py-3 px-4">หน่วยงาน / หลักสูตร</th>
                  <th className="py-3 px-4">ขั้นตอน</th>
                  <th className="py-3 px-4 text-right">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      กำลังโหลดข้อมูลถังขยะ...
                    </td>
                  </tr>
                ) : filteredBridges.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      ไม่มีรายการประเด็น BRIDGE ในถังขยะ
                    </td>
                  </tr>
                ) : (
                  filteredBridges.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono font-bold text-blue-400">
                        {item.improvementId}
                      </td>
                      <td className="py-3 px-4 font-bold text-white max-w-xs truncate">
                        {item.title}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        <span className="flex items-center gap-1">
                          {item.ownerType === 'COURSE' ? (
                            <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
                          ) : (
                            <Building2 className="w-3.5 h-3.5 text-blue-400" />
                          )}
                          {item.ownerNameSnapshot}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                          ขั้น {item.currentBridgeStep}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleRestoreBridge(item.id)}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>กู้คืนข้อมูล (Restore)</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};


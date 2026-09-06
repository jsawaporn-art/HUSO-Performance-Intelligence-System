import React, { useState } from 'react';
import {
  INITIAL_WORK_DOMAINS,
  INITIAL_CUSTOMER_GROUPS,
  INITIAL_ISSUE_SOURCES,
} from '../../types/bridge';
import { User } from '../../types';
import {
  Settings,
  Plus,
  Trash2,
  CheckCircle2,
  Layers,
  Users,
  Database,
  Sliders,
} from 'lucide-react';

interface BridgeSettingsProps {
  currentUser: User | null;
}

export const BridgeSettings: React.FC<BridgeSettingsProps> = ({ currentUser }) => {
  const [workDomains, setWorkDomains] = useState<string[]>(INITIAL_WORK_DOMAINS);
  const [newDomainInput, setNewDomainInput] = useState<string>('');

  const [customerGroups, setCustomerGroups] = useState(INITIAL_CUSTOMER_GROUPS);
  const [newCustomerInput, setNewCustomerInput] = useState<string>('');
  const [newCustomerCategory, setNewCustomerCategory] = useState<'CUSTOMER' | 'STAKEHOLDER'>('CUSTOMER');

  const [issueSources, setIssueSources] = useState<string[]>(INITIAL_ISSUE_SOURCES);
  const [newSourceInput, setNewSourceInput] = useState<string>('');

  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handleAddDomain = () => {
    if (!newDomainInput.trim()) return;
    setWorkDomains([...workDomains, newDomainInput.trim()]);
    setNewDomainInput('');
  };

  const handleRemoveDomain = (idx: number) => {
    const updated = [...workDomains];
    updated.splice(idx, 1);
    setWorkDomains(updated);
  };

  const handleAddCustomer = () => {
    if (!newCustomerInput.trim()) return;
    const newId = `${newCustomerCategory === 'CUSTOMER' ? 'CUST' : 'STK'}-${Date.now().toString().slice(-4)}`;
    setCustomerGroups([...customerGroups, { id: newId, name: newCustomerInput.trim(), category: newCustomerCategory }]);
    setNewCustomerInput('');
  };

  const handleRemoveCustomer = (id: string) => {
    setCustomerGroups(customerGroups.filter((g) => g.id !== id));
  };

  const handleAddSource = () => {
    if (!newSourceInput.trim()) return;
    setIssueSources([...issueSources, newSourceInput.trim()]);
    setNewSourceInput('');
  };

  const handleRemoveSource = (idx: number) => {
    const updated = [...issueSources];
    updated.splice(idx, 1);
    setIssueSources(updated);
  };

  const handleSaveAll = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-slate-700 dark:text-slate-300" />
            ตั้งค่าระบบ BRIDGE Process Improvement
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            จัดการด้านงาน/กระบวนการ กลุ่มลูกค้า/ผู้มีส่วนได้ส่วนเสีย และแหล่งที่มาของประเด็น
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all shrink-0"
        >
          <CheckCircle2 className="w-4 h-4" />
          บันทึกการตั้งค่า
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          บันทึกการตั้งค่าระบบเรียบร้อยแล้ว
        </div>
      )}

      {/* Grid of Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Work Domains */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              ด้านงานหรือกระบวนการ ({workDomains.length})
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newDomainInput}
              onChange={(e) => setNewDomainInput(e.target.value)}
              placeholder="เพิ่มด้านงานใหม่..."
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
            />
            <button
              onClick={handleAddDomain}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold shrink-0"
            >
              เพิ่ม
            </button>
          </div>

          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {workDomains.map((dom, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-700 dark:text-slate-300"
              >
                <span>{dom}</span>
                <button
                  onClick={() => handleRemoveDomain(idx)}
                  className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1 rounded-md"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Customer Groups */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              กลุ่มลูกค้าและผู้มีส่วนได้ส่วนเสีย ({customerGroups.length})
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newCustomerInput}
                onChange={(e) => setNewCustomerInput(e.target.value)}
                placeholder="เพิ่มกลุ่มใหม่..."
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
              />
              <select
                value={newCustomerCategory}
                onChange={(e) => setNewCustomerCategory(e.target.value as any)}
                className="px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px]"
              >
                <option value="CUSTOMER">ลูกค้า</option>
                <option value="STAKEHOLDER">ผู้มีส่วนได้ส่วนเสีย</option>
              </select>
              <button
                onClick={handleAddCustomer}
                className="px-3 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-bold shrink-0"
              >
                เพิ่ม
              </button>
            </div>
          </div>

          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {customerGroups.map((grp) => (
              <div
                key={grp.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-700 dark:text-slate-300"
              >
                <div>
                  <span className="font-medium">{grp.name}</span>
                  <span className="text-[10px] text-slate-400 ml-1.5">
                    ({grp.category === 'CUSTOMER' ? 'ลูกค้า' : 'ผู้มีส่วนได้ส่วนเสีย'})
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveCustomer(grp.id)}
                  className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1 rounded-md"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Issue Sources */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              แหล่งที่มาของประเด็น ({issueSources.length})
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newSourceInput}
              onChange={(e) => setNewSourceInput(e.target.value)}
              placeholder="เพิ่มแหล่งที่มา..."
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
            />
            <button
              onClick={handleAddSource}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shrink-0"
            >
              เพิ่ม
            </button>
          </div>

          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {issueSources.map((src, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-700 dark:text-slate-300"
              >
                <span>{src}</span>
                <button
                  onClick={() => handleRemoveSource(idx)}
                  className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1 rounded-md"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

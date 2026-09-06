import React, { useState } from 'react';
import { Target as TargetIcon, Save, RefreshCw, Calculator, Info } from 'lucide-react';
import { Indicator, Target } from '../types';
import { THAI_MONTHS } from '../mockData';

interface TargetManagerProps {
  indicators: Indicator[];
  targets: Target[];
  selectedYear: string;
  onSaveTarget: (target: Partial<Target>) => void;
}

export const TargetManager: React.FC<TargetManagerProps> = ({
  indicators,
  targets,
  selectedYear,
  onSaveTarget,
}) => {
  const activeIndicators = indicators.filter((i) => i.status !== 'DELETED');
  const [selectedIndId, setSelectedIndId] = useState<string>(
    activeIndicators[0]?.indicatorId || ''
  );

  const activeInd = activeIndicators.find((i) => i.indicatorId === selectedIndId);
  const currentTarget = targets.find(
    (t) => t.indicatorId === selectedIndId && t.fiscalYear === selectedYear
  ) || {
    targetId: '',
    indicatorId: selectedIndId,
    fiscalYear: selectedYear,
    annualTarget: 100,
    minTarget: 80,
    challengeTarget: 120,
    baseline: activeInd?.baseline || 0,
    q1Target: 25,
    q2Target: 50,
    q3Target: 75,
    q4Target: 100,
    monthlyTargets: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
    cumulativeTargets: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120],
  };

  const [formData, setFormData] = useState<Target>({ ...currentTarget });

  const handleSelectIndicator = (id: string) => {
    setSelectedIndId(id);
    const ind = activeIndicators.find((i) => i.indicatorId === id);
    const tgt = targets.find((t) => t.indicatorId === id && t.fiscalYear === selectedYear);
    if (tgt) {
      setFormData({ ...tgt });
    } else {
      setFormData({
        targetId: '',
        indicatorId: id,
        fiscalYear: selectedYear,
        annualTarget: 100,
        minTarget: 80,
        challengeTarget: 120,
        baseline: ind?.baseline || 0,
        q1Target: 25,
        q2Target: 50,
        q3Target: 75,
        q4Target: 100,
        monthlyTargets: Array(12).fill(10),
        cumulativeTargets: Array(12).fill(100),
      });
    }
  };

  const handleAutoDistributeEven = () => {
    const monthVal = Math.round((formData.annualTarget / 12) * 10) / 10;
    const monthly = Array(12).fill(monthVal);
    let cum = 0;
    const cumulative = monthly.map((val) => {
      cum += val;
      return Math.round(cum * 10) / 10;
    });

    setFormData({
      ...formData,
      monthlyTargets: monthly,
      cumulativeTargets: cumulative,
      q1Target: Math.round((monthly[0] + monthly[1] + monthly[2]) * 10) / 10,
      q2Target: Math.round((monthly[3] + monthly[4] + monthly[5]) * 10) / 10,
      q3Target: Math.round((monthly[6] + monthly[7] + monthly[8]) * 10) / 10,
      q4Target: Math.round((monthly[9] + monthly[10] + monthly[11]) * 10) / 10,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveTarget(formData);
    alert('บันทึกเป้าหมายตัวชี้วัดเรียบร้อยแล้ว');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <TargetIcon className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              กำหนดค่าเป้าหมายตัวชี้วัด (Target Management)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            ตั้งค่าเป้าหมายประจำปี (Annual Target), ขั้นต่ำ (Min), ท้าทาย (Challenge) และกระจายเป้าหมายรายไตรมาส/รายเดือน
          </p>
        </div>

        <button
          onClick={handleSubmit}
          className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition"
        >
          <Save className="w-4 h-4" />
          <span>บันทึกเป้าหมายตัวชี้วัด</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Indicator Selector List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
          <div className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2">
            เลือกตัวชี้วัดที่ต้องการตั้งเป้าหมาย
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {activeIndicators.map((ind) => {
              const isSelected = ind.indicatorId === selectedIndId;
              return (
                <button
                  key={ind.indicatorId}
                  onClick={() => handleSelectIndicator(ind.indicatorId)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500 text-white font-bold'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-amber-300 font-bold">{ind.code}</span>
                    <span className="text-[10px] text-slate-400">{ind.type}</span>
                  </div>
                  <div className="line-clamp-2 leading-tight">{ind.name}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Target Setting Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md lg:col-span-2 space-y-6">
          {activeInd ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-amber-300 font-mono">
                    {activeInd.code} ({activeInd.type})
                  </span>
                  <span className="text-xs text-slate-400">หน่วย: {activeInd.unit}</span>
                </div>
                <h3 className="text-base font-bold text-white">{activeInd.name}</h3>
                <p className="text-xs text-slate-300">
                  ยุทธศาสตร์: {activeInd.strategyName} | ผู้รับผิดชอบ: {activeInd.ownerMain}
                </p>
              </div>

              {/* Annual Targets */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    เป้าหมายประจำปี (Annual Target) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.annualTarget}
                    onChange={(e) => setFormData({ ...formData, annualTarget: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 text-amber-300 text-sm font-bold rounded-lg p-2.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    เป้าหมายขั้นต่ำ (Min Target)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.minTarget}
                    onChange={(e) => setFormData({ ...formData, minTarget: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm font-bold rounded-lg p-2.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    เป้าหมายท้าทาย (Challenge)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.challengeTarget}
                    onChange={(e) => setFormData({ ...formData, challengeTarget: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm font-bold rounded-lg p-2.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    ข้อมูลฐาน (Baseline)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.baseline}
                    onChange={(e) => setFormData({ ...formData, baseline: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm font-bold rounded-lg p-2.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick Auto Distribute Button */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-amber-400" />
                  กระจายเป้าหมายรายเดือน (Monthly Distribution)
                </span>

                <button
                  type="button"
                  onClick={handleAutoDistributeEven}
                  className="flex items-center space-x-1 text-xs text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1.5 rounded-lg border border-amber-500/30 font-semibold transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>คำนวณกระจายเท่ากันอัตโนมัติ</span>
                </button>
              </div>

              {/* Monthly Inputs Table */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {THAI_MONTHS.map((m, idx) => (
                  <div key={m.id} className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-xl">
                    <div className="text-[10px] font-bold text-amber-400 mb-1">
                      {m.name} ({m.quarter})
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.monthlyTargets[idx] ?? 0}
                      onChange={(e) => {
                        const newMonthly = [...formData.monthlyTargets];
                        newMonthly[idx] = Number(e.target.value);
                        setFormData({ ...formData, monthlyTargets: newMonthly });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold rounded p-1.5 text-center focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึกการตั้งค่าเป้าหมาย</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="p-12 text-center text-slate-500 text-xs">
              กรุณาเลือกตัวชี้วัดทางซ้ายมือ
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

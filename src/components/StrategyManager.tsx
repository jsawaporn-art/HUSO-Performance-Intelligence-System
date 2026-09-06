import React, { useState } from 'react';
import { Target, Plus, Edit2, Trash2, Copy, Layers, Check, X, Calendar, BookOpen } from 'lucide-react';
import { StrategicIssue } from '../types';

interface StrategyManagerProps {
  strategies: StrategicIssue[];
  selectedYear: string;
  onSelectYear?: (year: string) => void;
  onCreateStrategy: (strategy: Partial<StrategicIssue>) => Promise<void> | void;
  onUpdateStrategy: (id: string, strategy: Partial<StrategicIssue>) => Promise<void> | void;
  onDeleteStrategy: (id: string) => Promise<void> | void;
  onCopyStrategies: (fromYear: string, toYear: string) => Promise<void> | void;
}

export const StrategyManager: React.FC<StrategyManagerProps> = ({
  strategies,
  selectedYear,
  onSelectYear,
  onCreateStrategy,
  onUpdateStrategy,
  onDeleteStrategy,
  onCopyStrategies,
}) => {
  const years = ['2569', '2570', '2571', '2572', '2573', '2574', '2575'];

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<StrategicIssue | null>(null);

  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formFiscalYear, setFormFiscalYear] = useState(selectedYear);
  const [formObjectivesText, setFormObjectivesText] = useState('');

  // Copy modal state
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copyFromYear, setCopyFromYear] = useState('2569');
  const [copyToYear, setCopyToYear] = useState(selectedYear);

  // Filter strategies for the active selected year
  const activeStrategies = strategies.filter(
    (s) => s.fiscalYear === selectedYear || (!s.fiscalYear && selectedYear === '2569')
  );

  const handleOpenAddModal = () => {
    setEditingStrategy(null);
    const nextNum = activeStrategies.length + 1;
    setFormCode(`ยุทธศาสตร์ที่ ${nextNum}`);
    setFormName('');
    setFormFiscalYear(selectedYear);
    setFormObjectivesText('');
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (strat: StrategicIssue) => {
    setEditingStrategy(strat);
    setFormCode(strat.code);
    setFormName(strat.name);
    setFormFiscalYear(strat.fiscalYear || selectedYear);
    setFormObjectivesText(strat.objectives ? strat.objectives.join('\n') : '');
    setIsEditModalOpen(true);
  };

  const handleSaveStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    const objectivesArr = formObjectivesText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const payload: Partial<StrategicIssue> = {
      code: formCode,
      name: formName,
      fiscalYear: formFiscalYear,
      objectives: objectivesArr,
    };

    if (editingStrategy) {
      await onUpdateStrategy(editingStrategy.id, payload);
    } else {
      await onCreateStrategy(payload);
    }
    setIsEditModalOpen(false);
  };

  const handleCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (copyFromYear === copyToYear) {
      alert('ปีงบประมาณต้นทางและปลายทางต้องไม่เหมือนกัน');
      return;
    }
    await onCopyStrategies(copyFromYear, copyToYear);
    setIsCopyModalOpen(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-6">
      {/* Top Header & Year Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-300">
              <Target className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-bold text-slate-900">
              จัดการประเด็นยุทธศาสตร์ประจำปีงบประมาณ (Strategic Issues Management)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            กำหนดจำนวนและรายละเอียดประเด็นยุทธศาสตร์ที่แตกต่างกันในแต่ละปีงบประมาณ (เพิ่ม/ลด/แก้ไข รายปี)
          </p>
        </div>

        {/* Year Pills Filter */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-600 flex items-center gap-1 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            เลือกปีงบประมาณ:
          </span>
          {years.map((y) => {
            const isSelected = selectedYear === y;
            const countForYear = strategies.filter((s) => s.fiscalYear === y).length;
            return (
              <button
                key={y}
                onClick={() => onSelectYear && onSelectYear(y)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 border ${
                  isSelected
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <span>พ.ศ. {y}</span>
                <span
                  className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono ${
                    isSelected ? 'bg-amber-800 text-amber-100' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {countForYear}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Bar & Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/60 border border-amber-200 rounded-xl p-3 text-xs">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-amber-700 shrink-0" />
          <span className="text-amber-900 font-semibold">
            ปีงบประมาณ <strong className="text-amber-950 font-black">พ.ศ. {selectedYear}</strong> มีประเด็นยุทธศาสตร์รวม{' '}
            <strong className="text-amber-800 font-black px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300">
              {activeStrategies.length} ประเด็น
            </strong>
          </span>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => {
              setCopyFromYear(selectedYear === '2569' ? '2570' : '2569');
              setCopyToYear(selectedYear);
              setIsCopyModalOpen(true);
            }}
            className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-amber-800 border border-amber-300 font-bold px-3 py-1.5 rounded-lg text-xs shadow-sm transition"
          >
            <Copy className="w-3.5 h-3.5 text-amber-600" />
            <span>คัดลอกยุทธศาสตร์จากปีอื่น</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs shadow transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มประเด็นยุทธศาสตร์ปี {selectedYear}</span>
          </button>
        </div>
      </div>

      {/* List of Strategic Issues Cards */}
      {activeStrategies.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
          <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs text-slate-500 font-medium">
            ยังไม่มีข้อมูลประเด็นยุทธศาสตร์สำหรับปีงบประมาณ {selectedYear}
          </p>
          <div className="flex items-center justify-center space-x-2 pt-1">
            <button
              onClick={handleOpenAddModal}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow transition"
            >
              + เพิ่มยุทธศาสตร์แรก
            </button>
            <button
              onClick={() => {
                setCopyFromYear('2569');
                setCopyToYear(selectedYear);
                setIsCopyModalOpen(true);
              }}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold px-3.5 py-1.5 rounded-lg transition"
            >
              คัดลอกจากปี 2569
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeStrategies.map((strat, index) => (
            <div
              key={strat.id}
              className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-amber-300 transition shadow-sm space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full">
                    {strat.code || `ยุทธศาสตร์ที่ ${index + 1}`}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ID: {strat.id}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 leading-snug">
                  {strat.name}
                </h4>

                {strat.objectives && strat.objectives.length > 0 && (
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      วัตถุประสงค์เชิงยุทธศาสตร์:
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      {strat.objectives.map((obj, i) => (
                        <li key={i} className="text-slate-700">{obj}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-400">
                  ประจำปีงบประมาณ {strat.fiscalYear || selectedYear}
                </span>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => handleOpenEditModal(strat)}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs transition"
                  >
                    <Edit2 className="w-3 h-3 text-amber-700" />
                    <span>แก้ไข</span>
                  </button>

                  <button
                    onClick={async () => {
                      if (confirm(`คุณต้องการลบ "${strat.name}" สำหรับปี ${selectedYear} หรือไม่?`)) {
                        await onDeleteStrategy(strat.id);
                      }
                    }}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 font-semibold text-xs transition"
                  >
                    <Trash2 className="w-3 h-3 text-rose-600" />
                    <span>ลบ</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal 1: Create / Edit Strategy */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 text-xs text-slate-700 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-600" />
                <span>
                  {editingStrategy ? 'แก้ไขประเด็นยุทธศาสตร์' : `เพิ่มประเด็นยุทธศาสตร์ใหม่ (ปี ${formFiscalYear})`}
                </span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStrategy} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">ปีงบประมาณ *</label>
                  <select
                    value={formFiscalYear}
                    onChange={(e) => setFormFiscalYear(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        พ.ศ. {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">รหัส/ลำดับยุทธศาสตร์ *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ยุทธศาสตร์ที่ 1"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">ชื่อประเด็นยุทธศาสตร์ *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ยุทธศาสตร์ที่ 1: การพัฒนาหลักสูตรและการเรียนรู้สู่สากล"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  วัตถุประสงค์เชิงยุทธศาสตร์ (ใส่ 1 ข้อต่อ 1 บรรทัด)
                </label>
                <textarea
                  rows={4}
                  placeholder="เช่นเพื่อยกระดับหลักสูตรให้ได้รับการรับรองมาตรฐานสากล AUN-QA&#10;เพื่อเพิ่มอัตราการได้งานทำของบัณฑิต"
                  value={formObjectivesText}
                  onChange={(e) => setFormObjectivesText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shadow transition"
                >
                  บันทึกข้อมูลยุทธศาสตร์
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Copy Strategies Between Fiscal Years */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-6 text-xs text-slate-700 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Copy className="w-4 h-4 text-amber-600" />
                <span>คัดลอกยุทธศาสตร์ระหว่างปีงบประมาณ</span>
              </h3>
              <button
                onClick={() => setIsCopyModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCopy} className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900 text-xs">
                การคัดลอกจะนำประเด็นยุทธศาสตร์ทั้งหมดจากปีต้นทางมาคัดลอกและสร้างใหม่สำหรับปีปลายทาง
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">คัดลอกจากปี (ต้นทาง) *</label>
                  <select
                    value={copyFromYear}
                    onChange={(e) => setCopyFromYear(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        พ.ศ. {y} ({strategies.filter((s) => s.fiscalYear === y).length} รายการ)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">ไปยังปี (ปลายทาง) *</label>
                  <select
                    value={copyToYear}
                    onChange={(e) => setCopyToYear(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none font-bold text-amber-900"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        พ.ศ. {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCopyModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shadow transition"
                >
                  ยืนยันการคัดลอก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

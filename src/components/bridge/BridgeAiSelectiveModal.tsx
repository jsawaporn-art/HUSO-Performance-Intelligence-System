import React, { useState, useEffect } from 'react';
import { BridgeAiAnalysisResult } from '../../types/bridge';
import { X, Check, CheckSquare, Square, ListChecks } from 'lucide-react';

interface BridgeAiSelectiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: BridgeAiAnalysisResult | null;
  onConfirm?: (selected: {
    causes: number[];
    actions: number[];
    indicators: number[];
    impacts: number[];
  }) => void;
  onConfirmSelection?: (selected: {
    causes: number[];
    actions: number[];
    indicators: number[];
    impacts: number[];
  }) => void;
  onBackToFullResult?: () => void;
}

export const BridgeAiSelectiveModal: React.FC<BridgeAiSelectiveModalProps> = ({
  isOpen,
  onClose,
  result,
  onConfirm,
  onConfirmSelection,
  onBackToFullResult,
}) => {
  const [selectedCauses, setSelectedCauses] = useState<number[]>([]);
  const [selectedActions, setSelectedActions] = useState<number[]>([]);
  const [selectedIndicators, setSelectedIndicators] = useState<number[]>([]);
  const [selectedImpacts, setSelectedImpacts] = useState<number[]>([]);

  useEffect(() => {
    if (result) {
      setSelectedCauses(result.probableRootCauses ? result.probableRootCauses.map((_, i) => i) : []);
      setSelectedActions(result.recommendedActions ? result.recommendedActions.map((_, i) => i) : []);
      setSelectedIndicators(result.suggestedSuccessIndicators ? result.suggestedSuccessIndicators.map((_, i) => i) : []);
      setSelectedImpacts(result.possibleImpacts ? result.possibleImpacts.map((_, i) => i) : []);
    }
  }, [result, isOpen]);

  if (!isOpen || !result) return null;

  const toggleItem = (list: number[], setList: React.Dispatch<React.SetStateAction<number[]>>, index: number) => {
    if (list.includes(index)) {
      setList(list.filter((i) => i !== index));
    } else {
      setList([...list, index]);
    }
  };

  const handleConfirm = () => {
    const payload = {
      causes: selectedCauses,
      actions: selectedActions,
      indicators: selectedIndicators,
      impacts: selectedImpacts,
    };
    if (typeof onConfirm === 'function') {
      onConfirm(payload);
    } else if (typeof onConfirmSelection === 'function') {
      onConfirmSelection(payload);
    }
  };

  return (
    <div
      id="bridge-ai-selective-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn"
    >
      <div
        id="bridge-ai-selective-modal-container"
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-indigo-200 dark:border-indigo-900/60 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-indigo-50/40 dark:bg-indigo-950/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <ListChecks className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                เลือกรายการจาก AI ที่ต้องการนำไปใส่ในแบบฟอร์ม
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                ทำเครื่องหมายถูกเฉพาะรายการที่ท่านเห็นว่าตรงกับความเป็นจริง
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Checkable Sections */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Causes */}
          {result.probableRootCauses && result.probableRootCauses.length > 0 && (
            <div className="space-y-2">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>1. สาเหตุที่เป็นไปได้ (Probable Root Causes)</span>
                <span className="text-[10px] text-slate-400">
                  เลือก {selectedCauses.length}/{result.probableRootCauses.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {result.probableRootCauses.map((c, i) => {
                  const isChecked = selectedCauses.includes(i);
                  return (
                    <div
                      key={i}
                      onClick={() => toggleItem(selectedCauses, setSelectedCauses, i)}
                      className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-indigo-300 bg-indigo-50/50 dark:border-indigo-800 dark:bg-indigo-950/30'
                          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/40 text-slate-500'
                      }`}
                    >
                      <button type="button" className="mt-0.5 text-indigo-600 shrink-0">
                        {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </button>
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                          {typeof c === 'string' ? c : c?.cause || ''}
                        </div>
                        {typeof c === 'object' && c?.reason && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            เหตุผล: {c.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommended Actions */}
          {result.recommendedActions && result.recommendedActions.length > 0 && (
            <div className="space-y-2">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>2. แนวทางปรับปรุงเบื้องต้น (Recommended Actions)</span>
                <span className="text-[10px] text-slate-400">
                  เลือก {selectedActions.length}/{result.recommendedActions.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {result.recommendedActions.map((action, i) => {
                  const isChecked = selectedActions.includes(i);
                  return (
                    <div
                      key={i}
                      onClick={() => toggleItem(selectedActions, setSelectedActions, i)}
                      className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-indigo-300 bg-indigo-50/50 dark:border-indigo-800 dark:bg-indigo-950/30'
                          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/40 text-slate-500'
                      }`}
                    >
                      <button type="button" className="mt-0.5 text-indigo-600 shrink-0">
                        {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </button>
                      <div className="text-slate-800 dark:text-slate-200 text-xs">
                        {action}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Success Indicators */}
          {result.suggestedSuccessIndicators && result.suggestedSuccessIndicators.length > 0 && (
            <div className="space-y-2">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>3. ตัวชี้วัดความสำเร็จที่แนะนำ (Success Indicators)</span>
                <span className="text-[10px] text-slate-400">
                  เลือก {selectedIndicators.length}/{result.suggestedSuccessIndicators.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {result.suggestedSuccessIndicators.map((ind, i) => {
                  const isChecked = selectedIndicators.includes(i);
                  return (
                    <div
                      key={i}
                      onClick={() => toggleItem(selectedIndicators, setSelectedIndicators, i)}
                      className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-indigo-300 bg-indigo-50/50 dark:border-indigo-800 dark:bg-indigo-950/30'
                          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/40 text-slate-500'
                      }`}
                    >
                      <button type="button" className="mt-0.5 text-indigo-600 shrink-0">
                        {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </button>
                      <div className="text-slate-800 dark:text-slate-200 text-xs">
                        {ind}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Impacts */}
          {result.possibleImpacts && result.possibleImpacts.length > 0 && (
            <div className="space-y-2">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>4. ผลกระทบที่อาจเกิดขึ้น (Possible Impacts)</span>
                <span className="text-[10px] text-slate-400">
                  เลือก {selectedImpacts.length}/{result.possibleImpacts.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {result.possibleImpacts.map((impact, i) => {
                  const isChecked = selectedImpacts.includes(i);
                  return (
                    <div
                      key={i}
                      onClick={() => toggleItem(selectedImpacts, setSelectedImpacts, i)}
                      className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-indigo-300 bg-indigo-50/50 dark:border-indigo-800 dark:bg-indigo-950/30'
                          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/40 text-slate-500'
                      }`}
                    >
                      <button type="button" className="mt-0.5 text-indigo-600 shrink-0">
                        {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </button>
                      <div className="text-slate-800 dark:text-slate-200 text-xs">
                        {impact}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/60 shrink-0">
          <div>
            {onBackToFullResult && (
              <button
                type="button"
                onClick={onBackToFullResult}
                className="px-3.5 py-2 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 font-medium text-xs transition-colors"
              >
                ← ดูผลการวิเคราะห์เต็ม
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-medium text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              ยืนยันนำรายการที่เลือกไปใช้
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { BridgeAiAnalysisResult } from '../../types/bridge';
import {
  X,
  Sparkles,
  Zap,
  Clock,
  ShieldCheck,
  Check,
  RotateCcw,
  Edit3,
  AlertTriangle,
  Info,
  CheckCircle2,
  ListChecks,
} from 'lucide-react';

interface BridgeAiResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: BridgeAiAnalysisResult | null;
  onApplyAll: () => void;
  onOpenSelective: () => void;
  onReanalyze: () => void;
  onManualFill: () => void;
  isAnalyzing?: boolean;
}

export const BridgeAiResultModal: React.FC<BridgeAiResultModalProps> = ({
  isOpen,
  onClose,
  result,
  onApplyAll,
  onOpenSelective,
  onReanalyze,
  onManualFill,
  isAnalyzing = false,
}) => {
  if (!isOpen || !result) return null;

  const getConfidenceBadge = (confidence?: 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (confidence) {
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            ความเชื่อมั่นสูง (High)
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            ความเชื่อมั่นเบื้องต้น (Low)
          </span>
        );
      case 'MEDIUM':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Info className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            ความเชื่อมั่นปานกลาง (Medium)
          </span>
        );
    }
  };

  return (
    <div
      id="bridge-ai-result-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn"
    >
      <div
        id="bridge-ai-result-modal-container"
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-purple-200 dark:border-purple-900/60 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-purple-900/10 via-indigo-900/10 to-blue-900/10 dark:from-purple-950/40 dark:via-indigo-950/40 dark:to-blue-950/40 border-b border-purple-100 dark:border-purple-800/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  ผลการวิเคราะห์โดย AI Bridge Assistant
                </h3>
                {getConfidenceBadge(result.overallConfidence)}
                {result.isFromCache ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300">
                    <Zap className="w-3 h-3 text-purple-600" />
                    ใช้ผลวิเคราะห์จากแคชเดิม
                  </span>
                ) : result.analysisDurationSeconds !== undefined ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <Clock className="w-3 h-3 text-slate-500" />
                    ประมวลผลใน {result.analysisDurationSeconds} วินาที
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                วิเคราะห์เฉพาะข้อมูลปัญหาที่ระบุ โดยไม่สืบค้นข้อมูลส่วนบุคคลหรือระบบอื่น
              </p>
            </div>
          </div>

          <button
            id="close-bridge-ai-result-btn"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          {/* Notice banner */}
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              <strong>ข้อควรทราบ:</strong> ผลวิเคราะห์นี้เป็น "สาเหตุที่เป็นไปได้เบื้องต้น" ที่ประมวลผลจากข้อความของท่านเท่านั้น ไม่ได้ถือเป็นข้อสรุปจริงจนกว่าท่านหรือทีมงานจะได้ตรวจสอบหน้างาน (Verify) เรียบร้อย
            </div>
          </div>

          {/* 1. Problem Summary */}
          {result.problemSummary && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5 text-xs">
                <Info className="w-4 h-4 text-blue-500" />
                1. สรุปประเด็นปัญหา (Problem Summary)
              </h4>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-xs">
                {result.problemSummary}
              </p>
            </div>
          )}

          {/* 2. Probable Root Causes */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
              <Sparkles className="w-4 h-4 text-purple-500" />
              2. สาเหตุที่เป็นไปได้ (Probable Root Causes - สูงสุด 3 ข้อ)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {result.probableRootCauses && result.probableRootCauses.length > 0 ? (
                result.probableRootCauses.map((c, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl border border-purple-100 dark:border-purple-900/40 bg-purple-50/30 dark:bg-purple-950/20 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-purple-900 dark:text-purple-300 text-xs">
                          สาเหตุที่ {i + 1}
                        </span>
                        {typeof c === 'object' && c?.confidence && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 font-semibold">
                            {c.confidence}
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs leading-snug">
                        {typeof c === 'string' ? c : c?.cause || ''}
                      </p>
                      {typeof c === 'object' && c?.reason && (
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1.5 leading-relaxed">
                          เหตุผล: {c.reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 text-slate-400 italic">ไม่มีข้อมูลสาเหตุ</div>
              )}
            </div>
          </div>

          {/* 3. Recommended Actions & Suggested Success Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recommended Actions */}
            <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-2">
              <h4 className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                3. แนวทางปรับปรุงเบื้องต้น (Recommended Actions)
              </h4>
              <ul className="space-y-1.5 list-disc list-inside text-slate-700 dark:text-slate-300 text-xs">
                {result.recommendedActions && result.recommendedActions.length > 0 ? (
                  result.recommendedActions.map((action, i) => (
                    <li key={i} className="leading-relaxed">
                      {action}
                    </li>
                  ))
                ) : (
                  <li className="italic text-slate-400">ไม่มีข้อมูล</li>
                )}
              </ul>
            </div>

            {/* Suggested Success Indicators */}
            <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-2">
              <h4 className="font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5 text-xs">
                <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                4. ตัวชี้วัดความสำเร็จที่แนะนำ (Success Indicators)
              </h4>
              <ul className="space-y-1.5 list-disc list-inside text-slate-700 dark:text-slate-300 text-xs">
                {result.suggestedSuccessIndicators && result.suggestedSuccessIndicators.length > 0 ? (
                  result.suggestedSuccessIndicators.map((ind, i) => (
                    <li key={i} className="leading-relaxed">
                      {ind}
                    </li>
                  ))
                ) : (
                  <li className="italic text-slate-400">ไม่มีข้อมูล</li>
                )}
              </ul>
            </div>
          </div>

          {/* 4. Information Needed & Possible Impacts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Information Needed */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                5. ข้อมูลที่ควรตรวจสอบเพิ่มเติมหน้างาน
              </h4>
              <ul className="space-y-1.5 list-disc list-inside text-slate-600 dark:text-slate-300 text-xs">
                {result.informationNeeded && result.informationNeeded.length > 0 ? (
                  result.informationNeeded.map((item, i) => (
                    <li key={i} className="leading-relaxed">
                      {item}
                    </li>
                  ))
                ) : (
                  <li className="italic text-slate-400">ไม่มีข้อมูล</li>
                )}
              </ul>
            </div>

            {/* Possible Impacts */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                <Info className="w-4 h-4 text-blue-500" />
                6. ผลกระทบที่อาจเกิดขึ้น (Possible Impacts)
              </h4>
              <ul className="space-y-1.5 list-disc list-inside text-slate-600 dark:text-slate-300 text-xs">
                {result.possibleImpacts && result.possibleImpacts.length > 0 ? (
                  result.possibleImpacts.map((item, i) => (
                    <li key={i} className="leading-relaxed">
                      {item}
                    </li>
                  ))
                ) : (
                  <li className="italic text-slate-400">ไม่มีข้อมูล</li>
                )}
              </ul>
            </div>
          </div>

          {/* 5. Limitations */}
          {result.limitations && (
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
              <strong>ข้อจำกัดของการวิเคราะห์:</strong> {result.limitations}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="ai-modal-reanalyze-btn"
              type="button"
              onClick={onReanalyze}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold text-xs hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              {isAnalyzing ? 'กำลังวิเคราะห์ใหม่...' : 'วิเคราะห์ใหม่'}
            </button>

            <button
              id="ai-modal-manual-fill-btn"
              type="button"
              onClick={onManualFill}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              กรอกเอง (ไม่ใช้ AI)
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              id="ai-modal-selective-apply-btn"
              type="button"
              onClick={onOpenSelective}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
            >
              <ListChecks className="w-4 h-4" />
              เลือกใช้บางข้อ
            </button>

            <button
              id="ai-modal-apply-all-btn"
              type="button"
              onClick={onApplyAll}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all"
            >
              <Check className="w-4 h-4" />
              นำผลวิเคราะห์ไปใช้ (ทั้งหมด)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Bot, Sparkles, RefreshCw, Send, ShieldAlert, Award, TrendingUp, Calendar } from 'lucide-react';
import { Indicator, MonthlyProgress } from '../types';
import { aiService } from '../lib/firebase';

interface AiInsightViewProps {
  indicators: Indicator[];
  monthlyProgressList: MonthlyProgress[];
  selectedYear: string;
}

export const AiInsightView: React.FC<AiInsightViewProps> = ({
  indicators,
  monthlyProgressList,
  selectedYear,
}) => {
  const [loading, setLoading] = useState(false);
  const [insightResult, setInsightResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFetchAiInsight = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const insight = await aiService.getInsight(selectedYear);
      setInsightResult(insight);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ Gemini AI Server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-xl text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20">
                <Bot className="w-6 h-6" />
              </span>
              <h2 className="text-2xl font-black text-amber-100 tracking-tight">
                AI Executive Insight & Forecasting (วิเคราะห์บทสรุปด้วย Gemini AI)
              </h2>
            </div>
            <p className="text-xs text-amber-200/80 mt-2 max-w-3xl leading-relaxed">
              วิเคราะห์ข้อมูลผลการดำเนินงานจริง วิเคราะห์สาเหตุข้อขัดข้อง พยากรณ์แนวโน้มสิ้นปีงบประมาณ และจัดทำวาระการประชุมผู้บริหารอัตโนมัติ
            </p>
          </div>

          <button
            onClick={handleFetchAiInsight}
            disabled={loading}
            className="flex items-center justify-center space-x-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs px-5 py-3 rounded-xl shadow-lg shadow-amber-500/20 transition transform hover:-translate-y-0.5"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>{loading ? 'กำลังวิเคราะห์ข้อมูล...' : 'สร้างบทวิเคราะห์เชิงบริหารด่วน'}</span>
          </button>
        </div>
      </div>

      {/* Main Analysis Display */}
      {insightResult ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg text-slate-200 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              รายงานบทวิเคราะห์เชิงบริหารฉบับเต็ม (Gemini AI Powered)
            </span>
            <button
              onClick={handleFetchAiInsight}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              วิเคราะห์ใหม่
            </button>
          </div>

          <div className="prose prose-invert max-w-none text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
            {insightResult}
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-4 shadow-md">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <Bot className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">พร้อมประมวลผลการดำเนินงานระดับกลยุทธ์</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              กดปุ่ม <strong className="text-amber-300">"สร้างบทวิเคราะห์เชิงบริหารด่วน"</strong> ด้านบน เพื่อสังเคราะห์ข้อมูลจาก {indicators.length} ตัวชี้วัด ผ่านโมเดล Gemini API Server-Side
            </p>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs max-w-lg mx-auto">
              ⚠️ {errorMsg}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

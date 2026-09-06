import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Printer,
  ChevronRight,
  ChevronDown,
  Layers,
  ListChecks,
  CheckCircle2,
  AlertTriangle,
  Bot,
  FileText,
  Building2,
  GraduationCap,
  Users,
  Target,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  Clock,
  Award,
  Flame,
  ArrowRight,
  Download,
  Info,
  CheckSquare,
  Lock,
  PlusCircle,
  PlayCircle,
  Send,
  Flag,
  Share2,
  Check,
} from 'lucide-react';
import { BRIDGE_STEPS } from '../types/bridge';

interface ManualSection {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  icon: any;
  content: React.ReactNode;
  tags: string[];
}

export const UserManualView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [expandedSectionId, setExpandedSectionId] = useState<string>('sec-overview');

  const manualSections: ManualSection[] = [
    {
      id: 'sec-overview',
      category: 'OVERVIEW',
      title: '1. ภาพรวมระบบและสิทธิ์ผู้ใช้งาน (System Overview & RBAC)',
      subtitle: 'โครงสร้างระบบ HUSO Performance Intelligence & BRIDGE Model',
      icon: BookOpen,
      tags: ['overview', 'rbac', 'roles', 'สิทธิ์', 'ผู้ใช้งาน', 'ภาพรวม', 'admin', 'executive', 'owner'],
      content: (
        <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            <strong>HUSO Performance Intelligence & Process Improvement System</strong> เป็นระบบสารสนเทศเพื่อการบริหารผลการดำเนินงานเชิงยุทธศาสตร์และการปรับปรุงกระบวนการอย่างต่อเนื่องของคณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏยะลา ครอบคลุมทั้งการติดตามตัวชี้วัดยุทธศาสตร์ (KPI/KVI) และการขับเคลื่อนกระบวนการด้วย <strong>BRIDGE Model 6 ขั้น</strong> ตามเกณฑ์คุณภาพการศึกษาเพื่อการดำเนินการที่เป็นเลิศ (EdPEx)
          </p>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              โครงสร้างสิทธิ์การใช้งาน 6 ระดับ (Role-Based Access Control)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-rose-600">1. SUPER_ADMIN / ADMIN (ผู้ดูแลระบบ)</span>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  จัดการ Master Data ตัวชี้วัด ผู้ใช้งาน การตั้งค่าระบบ ถังขยะ (Soft Delete/Restore) และกู้คืนข้อมูล
                </p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-purple-600">2. EXECUTIVE (ผู้บริหารระดับสูง)</span>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  เข้าถึง Management Cockpit, Dashboard ภาพรวม, วินิจฉัยข้อสั่งการ Action Directives, และอนุมัติตัดสินใจประเด็น BRIDGE
                </p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-blue-600">3. REVIEWER (ผู้ตรวจสอบ/ประเมิน และกรอกรายงาน)</span>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  มีสิทธิ์กรอก/บันทึกรายงานผลการดำเนินงานในระบบ KPI/KVI และ BRIDGE รวมถึงตรวจสอบความถูกต้อง เอกสารหลักฐาน ให้ข้อเสนอแนะ และอนุมัติรับรอง (Verify)
                </p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-amber-600">4. OWNER (ผู้รับผิดชอบตัวชี้วัด/ประเด็น)</span>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  สิทธิ์หลักในการกรอก/บันทึกรายงานผลการดำเนินงานในระบบ KPI/KVI เสนอประเด็นปรับปรุง BRIDGE รายงานความก้าวหน้ารายรอบ และแนบหลักฐาน
                </p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-emerald-600">5. DATA_SUPPORT (เจ้าหน้าที่สนับสนุนข้อมูล)</span>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  ช่วยบันทึกผลการดำเนินงาน รวบรวมเอกสารหลักฐาน และตรวจสอบข้อมูลเบื้องต้น
                </p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-600 dark:text-slate-400">6. VIEWER (ผู้ดูข้อมูลทั่วไป)</span>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  ดูรายงาน ผลการดำเนินงาน คลังหลักฐาน และ Dashboard แบบ Read-Only
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'sec-kpi-workflow',
      category: 'KPI_KVI',
      title: '2. คู่มือระบบติดตาม KPI / KVI และ Verification Workflow',
      subtitle: 'ขั้นตอนการตั้งเป้าหมาย บันทึกผลรายเดือน แนบหลักฐาน และตรวจสอบรับรอง',
      icon: ListChecks,
      tags: ['kpi', 'kvi', 'target', 'progress', 'verification', 'evidence', 'ตัวชี้วัด', 'เป้าหมาย', 'บันทึกผล', 'รับรอง'],
      content: (
        <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200/60 dark:border-blue-900/60">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center mx-auto mb-2 text-xs">1</div>
              <div className="font-bold text-slate-900 dark:text-white text-xs">กำหนดเป้าหมาย</div>
              <div className="text-[11px] text-slate-500 mt-1">Target Manager กำหนดเป้าหมายรายเดือน/ไตรมาส</div>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200/60 dark:border-amber-900/60">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center mx-auto mb-2 text-xs">2</div>
              <div className="font-bold text-slate-900 dark:text-white text-xs">บันทึกผลรายเดือน</div>
              <div className="text-[11px] text-slate-500 mt-1">กรอกผลงานจริง ปัญหา/อุปสรรค แนบไฟล์หลักฐาน</div>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-200/60 dark:border-purple-900/60">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center mx-auto mb-2 text-xs">3</div>
              <div className="font-bold text-slate-900 dark:text-white text-xs">ส่งตรวจรับรอง</div>
              <div className="text-[11px] text-slate-500 mt-1">เปลี่ยนสถานะเป็น SUBMITTED รอผู้ตรวจสอบ</div>
            </div>
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/60">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center mx-auto mb-2 text-xs">4</div>
              <div className="font-bold text-slate-900 dark:text-white text-xs">อนุมัติ & รับรอง</div>
              <div className="text-[11px] text-slate-500 mt-1">Reviewer ตรวจสอบหลักฐานและอนุมัติ (VERIFIED)</div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white">เกณฑ์การประเมินสถานะสัญญาณไฟ (Traffic Light Status)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl">
                <span className="font-bold text-emerald-700 dark:text-emerald-300">● On Track (บรรลุเป้าหมาย)</span>
                <p className="mt-1 text-slate-600 dark:text-slate-400">ผลงานเทียบเป้าหมายสะสม ≥ 100%</p>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl">
                <span className="font-bold text-amber-700 dark:text-amber-300">● Watch (เฝ้าระวัง)</span>
                <p className="mt-1 text-slate-600 dark:text-slate-400">ผลงานเทียบเป้าหมายสะสม 80% - 99.99%</p>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900 rounded-xl">
                <span className="font-bold text-orange-700 dark:text-orange-300">● Risk (มีความเสี่ยง)</span>
                <p className="mt-1 text-slate-600 dark:text-slate-400">ผลงานเทียบเป้าหมายสะสม 60% - 79.99%</p>
              </div>
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl">
                <span className="font-bold text-rose-700 dark:text-rose-300">● Critical (วิกฤต)</span>
                <p className="mt-1 text-slate-600 dark:text-slate-400">ผลงานเทียบเป้าหมายสะสม &lt; 60%</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'sec-bridge-model',
      category: 'BRIDGE',
      title: '3. คู่มือขั้นตอนการกรอกข้อมูลและการขับเคลื่อน BRIDGE Model (เริ่มจากตรงไหน - จบที่ตรงไหน)',
      subtitle: 'ลำดับขั้นตอนการบันทึกข้อมูลแบบ End-to-End ตั้งแต่การค้นพบปัญหาจนถึงการรับรองเป็น Best Practice / EdPEx',
      icon: Layers,
      tags: ['bridge', 'edpex', 'process', 'improvement', 'root cause', '5 whys', 'กระบวนการ', 'ปรับปรุงงาน', 'นวัตกรรม', 'ขั้นตอน', 'การกรอกข้อมูล', 'จุดเริ่มต้น', 'จุดสิ้นสุด'],
      content: (
        <div className="space-y-8 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {/* Executive Flow Banner: Start to End */}
          <div className="p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 text-white rounded-3xl shadow-md space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-300">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>ภาพรวมวงจรการบันทึกข้อมูล BRIDGE Model (End-to-End Process Map)</span>
            </div>
            <h4 className="text-lg font-bold text-white leading-snug">
              จาก "การค้นพบปัญหาหน้างาน" สู่ "การยกระดับเป็นแนวปฏิบัติที่ดีและนวัตกรรมองค์กร"
            </h4>
            <p className="text-xs text-slate-200 leading-relaxed">
              กระบวนการกรอกข้อมูล BRIDGE Model ถูกออกแบบให้เป็นระบบวงปิด (Closed-Loop Improvement) โดยเริ่มต้นจากการระบุปัญหา/โอกาสพัฒนา เชื่อมโยงตัวชี้วัด วิเคราะห์สาเหตุเชิงลึก วางแผนปฏิบัติ วัดผลสัมฤทธิ์ และสิ้นสุดที่การรับรองเป็นมาตรฐานระดับคณะ
            </p>

            {/* Stepper Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2 text-center text-xs">
              <div className="p-2.5 bg-white/10 rounded-2xl border border-white/10 flex flex-col justify-between">
                <div className="text-[10px] font-bold text-amber-300">จุดเริ่มต้น (Start)</div>
                <div className="font-extrabold text-white mt-1 text-xs">1. เสนอประเด็น</div>
                <div className="text-[9px] text-slate-300 mt-0.5">เปิด Bridge Wizard</div>
              </div>
              <div className="p-2.5 bg-blue-500/20 rounded-2xl border border-blue-400/30 flex flex-col justify-between">
                <div className="text-[10px] font-bold text-blue-300">ขั้น B</div>
                <div className="font-extrabold text-white mt-1 text-xs">2. ระบุปัญหา</div>
                <div className="text-[9px] text-slate-300 mt-0.5">ผูก KPI / ลูกค้า</div>
              </div>
              <div className="p-2.5 bg-sky-500/20 rounded-2xl border border-sky-400/30 flex flex-col justify-between">
                <div className="text-[10px] font-bold text-sky-300">ขั้น R</div>
                <div className="font-extrabold text-white mt-1 text-xs">3. หาสาเหตุรากเหง้า</div>
                <div className="text-[9px] text-slate-300 mt-0.5">5 Whys / Fishbone</div>
              </div>
              <div className="p-2.5 bg-amber-500/20 rounded-2xl border border-amber-400/30 flex flex-col justify-between">
                <div className="text-[10px] font-bold text-amber-300">ขั้น I</div>
                <div className="font-extrabold text-white mt-1 text-xs">4. ออกแบบมาตรการ</div>
                <div className="text-[9px] text-slate-300 mt-0.5">Action Checklist</div>
              </div>
              <div className="p-2.5 bg-purple-500/20 rounded-2xl border border-purple-400/30 flex flex-col justify-between">
                <div className="text-[10px] font-bold text-purple-300">ขั้น D</div>
                <div className="font-extrabold text-white mt-1 text-xs">5. ปฏิบัติ & วัดผล</div>
                <div className="text-[9px] text-slate-300 mt-0.5">Before vs After</div>
              </div>
              <div className="p-2.5 bg-emerald-500/20 rounded-2xl border border-emerald-400/30 flex flex-col justify-between">
                <div className="text-[10px] font-bold text-emerald-300">ขั้น G</div>
                <div className="font-extrabold text-white mt-1 text-xs">6. ขยายผล / KM</div>
                <div className="text-[9px] text-slate-300 mt-0.5">18 สาขา / 8 หน่วยงาน</div>
              </div>
              <div className="p-2.5 bg-rose-500/20 rounded-2xl border border-rose-400/30 flex flex-col justify-between">
                <div className="text-[10px] font-bold text-amber-300">จุดสิ้นสุด (End)</div>
                <div className="font-extrabold text-white mt-1 text-xs">7. รับรองมาตรฐาน</div>
                <div className="text-[9px] text-slate-300 mt-0.5">Best Practice / ปิดงาน</div>
              </div>
            </div>
          </div>

          {/* Section 1: Where to Start */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="w-7 h-7 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                A
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                1. จุดเริ่มต้น: การสร้างและเสนอประเด็นปรับปรุง (Where to Start)
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-blue-600" />
                  ช่องทางการเข้าถึงเพื่อเริ่มกรอกข้อมูล
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  ผู้ใช้งานสามารถเริ่มต้นเสนอประเด็นได้ 2 ช่องทางหลัก:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                  <li>
                    <strong>ช่องทางที่ 1 (เมนูหลัก):</strong> ไปที่แถบเมนูซ้าย <strong>"BRIDGE ปรับปรุงงาน (EdPEx)"</strong> &rarr; เลือก <strong>"ประเด็นปรับปรุง (Issues)"</strong> หรือ <strong>"BRIDGE ภาพรวม"</strong> &rarr; กดปุ่ม <strong>"+ เสนอประเด็นปรับปรุงใหม่ (New Issue)"</strong>
                  </li>
                  <li>
                    <strong>ช่องทางที่ 2 (จากตัวชี้วัด):</strong> ในหน้า <strong>KPI/KVI Dashboard</strong> หรือ <strong>Cockpit</strong> หากตัวชี้วัดมีสถานะ <em>เฝ้าระวัง (Watch)</em> หรือ <em>วิกฤต (Critical)</em> สามารถกดปุ่ม <strong>"แปลงเป็นประเด็น BRIDGE"</strong> เพื่อดึงข้อมูลมาตั้งต้นอัตโนมัติ
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  สิทธิ์ผู้ใช้งานและระบบบันทึกร่างอัตโนมัติ (Autosave)
                </div>
                <ul className="space-y-1.5 text-slate-600 dark:text-slate-400">
                  <li>
                    <strong>ผู้มีสิทธิ์เริ่มสร้าง:</strong> OWNER (ผู้รับผิดชอบงาน/ตัวชี้วัด), ADMIN/SUPER_ADMIN, EXECUTIVE, และ DATA_SUPPORT
                  </li>
                  <li>
                    <strong>ระบบบันทึกร่าง (Draft Autosave):</strong> ขณะพิมพ์ใน Bridge Wizard ระบบจะบันทึกข้อมูลร่างลงเบราว์เซอร์อัตโนมัติ หากปิดหน้าต่างหรือสลับหน้าโดยไม่ได้ตั้งใจ สามารถกู้คืนข้อมูลเดิมได้ทันที
                  </li>
                  <li>
                    <strong>การออกรหัสอัตโนมัติ:</strong> ระบบจะกำหนดรหัสมาตรฐาน เช่น <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-blue-600 font-mono">BRG-2569-0001</code> ให้อัตโนมัติ
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Section 2: Step-by-Step Data Entry through 6 BRIDGE Steps */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="w-7 h-7 rounded-xl bg-purple-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                B
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                2. ขั้นตอนการกรอกข้อมูล 6 ขั้นในระบบ BRIDGE Wizard (Step-by-Step Guide)
              </h4>
            </div>

            <div className="space-y-4">
              {(['B', 'R', 'I', 'D', 'G', 'E'] as const).map((stepCode) => {
                const step = BRIDGE_STEPS[stepCode];
                return (
                  <div
                    key={stepCode}
                    className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start gap-4"
                  >
                    <div
                      className="w-11 h-11 rounded-2xl font-black text-white flex items-center justify-center shrink-0 text-lg shadow-md"
                      style={{ backgroundColor: step.color }}
                    >
                      {stepCode}
                    </div>

                    <div className="space-y-2 flex-1 min-w-0 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h5 className="font-bold text-slate-900 dark:text-white text-sm">
                          ขั้น {stepCode}: {step.thaiName} ({step.name})
                        </h5>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          สถานะวงจร: {step.description}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 space-y-1.5">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          📋 ข้อมูลที่ต้องกรอกในขั้นตอนนี้:
                        </div>
                        {stepCode === 'B' && (
                          <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                            <li><strong>ชื่อประเด็นปรับปรุง (Title):</strong> กระชับ ตรงประเด็น ระบุปัญหาที่ชัดเจน</li>
                            <li><strong>ประเภทและแหล่งที่มา (Type & Source):</strong> เลือกหมวดงาน (บริการวิชาการ, หลักสูตร, วิจัย, บริหาร) และแหล่งที่มา (SAR, EdPEx Assessment, ข้อร้องเรียน, นโยบาย)</li>
                            <li><strong>สภาพปัญหาปัจจุบัน (Current State):</strong> บันทึกข้อเท็จจริง ตัวเลข หรือสภาพปัญหาที่เกิดขึ้น</li>
                            <li><strong>กลุ่มลูกค้าเป้าหมาย & ตัวชี้วัดเชื่อมโยง:</strong> ระบุนักศึกษา อาจารย์ หรือผู้รับบริการ พร้อมผูกกับตัวชี้วัด KPI/KVI ยุทธศาสตร์</li>
                            <li><strong>*ปุ่ม AI วิเคราะห์:</strong> สามารถกด <em>"วิเคราะห์ด้วย AI"</em> เพื่อให้ Gemini ช่วยวิเคราะห์ Gap และร่างข้อมูลให้อัตโนมัติ</li>
                          </ul>
                        )}
                        {stepCode === 'R' && (
                          <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                            <li><strong>วิเคราะห์ 5 Whys (ถามทำไม 5 ระดับ):</strong> กรอกลำดับคำถาม-คำตอบเพื่อเจาะลึกถึงต้นตอของปัญหา</li>
                            <li><strong>ผังก้างปลา (Fishbone 4M/1E):</strong> วิเคราะห์สาเหตุจาก 5 ด้าน (คน-Man, วิธีการ-Method, เครื่องมือ-Machine, เอกสาร/วัสดุ-Material, สภาพแวดล้อม-Environment)</li>
                            <li><strong>ข้อสรุปสาเหตุรากเหง้า (Root Cause Summary):</strong> สรุปสาเหตุที่แท้จริงเพื่อนำไปสู่การออกแบบมาตรการ</li>
                          </ul>
                        )}
                        {stepCode === 'I' && (
                          <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                            <li><strong>แนวทางการปรับปรุงเชิงระบบ (Approach):</strong> ระบุชื่อมาตรการ นวัตกรรมกระบวนการ หรือเครื่องมือใหม่</li>
                            <li><strong>แผนกิจกรรมย่อย (Action Items Checklist):</strong> เพิ่มกิจกรรมย่อย กำหนดผู้รับผิดชอบหลัก (Assignee) และวันที่ต้องแล้วเสร็จ</li>
                            <li><strong>เป้าหมายความสำเร็จ (Target Outcome):</strong> กำหนดตัวชี้วัดผลลัพธ์ของมาตรการ เช่น ลดเวลาลง 50%, ข้อร้องเรียนเป็น 0</li>
                          </ul>
                        )}
                        {stepCode === 'D' && (
                          <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                            <li><strong>นำมาตรการไปปฏิบัติจริง:</strong> ทดลองใช้งานในหน่วยงานเป้าหมาย</li>
                            <li><strong>เปรียบเทียบผล Before vs After:</strong> กรอกข้อมูลตัวเลขเปรียบเทียบผลงานก่อนและหลังการปรับปรุง</li>
                            <li><strong>ระดับความพึงพอใจ:</strong> บันทึกคะแนนประเมินความพึงพอใจของผู้ใช้งาน/ผู้รับบริการ</li>
                            <li><strong>แนบหลักฐาน (Evidence Attachments):</strong> อัปโหลดภาพถ่าย แบบฟอร์ม หรือลิงก์เอกสารอ้างอิง</li>
                          </ul>
                        )}
                        {stepCode === 'G' && (
                          <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                            <li><strong>การขยายผล (Scale-Up):</strong> กำหนดแผนถ่ายทอดสู่ 18 สาขาวิชา หรือ 8 หน่วยงานสนับสนุนในคณะ</li>
                            <li><strong>บทเรียนที่ได้รับ (Lessons Learned):</strong> บันทึกข้อค้นพบ อุปสรรค และข้อควรระวังในการนำไปใช้</li>
                            <li><strong>การจัดการความรู้ (Knowledge Sharing):</strong> จัดทำสรุปองค์ความรู้ / สื่ออินโฟกราฟิก หรือจัดสัมมนาแลกเปลี่ยน</li>
                          </ul>
                        )}
                        {stepCode === 'E' && (
                          <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                            <li><strong>มาตรฐานการปฏิบัติงานใหม่ (SOP / Policy):</strong> ระบุประกาศ แนวปฏิบัติ หรือคู่มือมาตรฐานที่สร้างขึ้นใหม่</li>
                            <li><strong>ยื่นขอรับรองแนวปฏิบัติที่ดี (Best Practice Nomination):</strong> สรุปจุดเด่นเพื่อเสนอผู้บริหารพิจารณารับรองเป็นผลงานระดับคณะ</li>
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: In-Flight Progress Tracking and Executive Directives */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="w-7 h-7 rounded-xl bg-amber-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                C
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                3. การติดตามความก้าวหน้าและการสั่งการระหว่างทาง (Progress Tracking & Executive Directives)
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-amber-600" />
                  การรายงานความก้าวหน้า (Progress Logging)
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  ในระหว่างดำเนินการ ผู้รับผิดชอบสามารถเข้าเมนู <strong>"ติดตามความก้าวหน้า (Track Progress)"</strong> หรือ <strong>"งานของฉัน (My Tasks)"</strong> เพื่อ:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                  <li>ติ๊กเครื่องหมายถูกเมื่อกิจกรรมย่อย (Action Item) เสร็จสิ้น</li>
                  <li>บันทึกบันทึกความก้าวหน้ารายรอบ (Progress Note) พร้อมแนบหลักฐาน</li>
                  <li>กดเลื่อนขั้นของ BRIDGE (เช่น เลื่อนจากขั้น I ไปขั้น D เมื่อเริ่มนำไปทดลองใช้)</li>
                </ul>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-purple-600" />
                  การวินิจฉัยและข้อสั่งการของผู้บริหาร (Executive Directives)
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  ผู้บริหาร (Executive) สามารถติดตามและสั่งการได้ทันที:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                  <li>ดูประเด็นในเมนู <strong>"ข้อสั่งการผู้บริหาร (Executive Decisions)"</strong></li>
                  <li>ให้ข้อเสนอแนะเชิงนโยบาย หรือออก <strong>Action Directive</strong> ให้หน่วยงานปรับปรุงเพิ่มเติม</li>
                  <li>ระบบส่งการแจ้งเตือน (In-App Notification / Gmail) ไปยังผู้รับผิดชอบโดยตรง</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Section 4: Where and How it Ends */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                D
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                4. จุดสิ้นสุดของกระบวนการ: การรับรองมาตรฐานและปิดประเด็น (Where & How it Ends)
              </h4>
            </div>

            <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 space-y-3">
              <h5 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                เงื่อนไขและขั้นตอนการสิ้นสุดกระบวนการ (Institutionalization & Closure)
              </h5>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                ประเด็น BRIDGE จะถือว่า <strong>"เสร็จสิ้นสมบูรณ์ (Completed & Institutionalized)"</strong> เมื่อผ่านกระบวนการตามลำดับดังต่อไปนี้:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-1">
                  <div className="font-bold text-emerald-700 dark:text-emerald-400">1. ดำเนินการและวัดผลครบ</div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    กิจกรรมครบ 100%, มีผลวัด Before vs After ชัดเจน, และจัดทำคู่มือ SOP / KM เรียบร้อย
                  </p>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-1">
                  <div className="font-bold text-emerald-700 dark:text-emerald-400">2. ผู้บริหารอนุมัติรับรอง</div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    ผู้บริหารกดปุ่ม <strong>"อนุมัติรับรองเป็น Best Practice / นวัตกรรม"</strong> ในหน้าข้อสั่งการหรือรายละเอียดประเด็น
                  </p>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-1">
                  <div className="font-bold text-emerald-700 dark:text-emerald-400">3. เปลี่ยนสถานะสู่จุดสิ้นสุด</div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    สถานะเปลี่ยนเป็น <span className="font-bold text-emerald-600">INSTITUTIONALIZED</span> หรือ <span className="font-bold text-blue-600">RESOLVED</span> และปิดรอบการติดตาม
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs space-y-2 mt-3">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-500" />
                  ผลลัพธ์สุดท้ายหลังจบกระบวนการ (Final Deliverables):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span><strong>คลังนวัตกรรม (Best Practice Repository):</strong> บรรจุเป็นตัวอย่างผลงานเด่นให้หน่วยงานอื่นศึกษา</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span><strong>Public Dashboard Showcase:</strong> เผยแพร่ผลงานสู่สาธารณะและสภามหาวิทยาลัย</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span><strong>รายงาน EdPEx 13 รูปแบบ:</strong> ส่งออกเป็นเอกสารหลักฐานสำหรับเกณฑ์ EdPEx หมวด 6 / หมวด 7 และรายงาน SAR</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'sec-ai-insight',
      category: 'AI_TOOLS',
      title: '4. การใช้งาน AI Executive Insight และ AI ผู้ช่วยวิเคราะห์ BRIDGE',
      subtitle: 'ใช้ประโยชน์จาก Google Gemini AI ในการวิเคราะห์รากเหง้าปัญหาและพยากรณ์ผลงาน',
      icon: Bot,
      tags: ['ai', 'gemini', 'insight', 'forecast', 'root cause', 'analysis', 'วิเคราะห์', 'พยากรณ์', 'ปัญญาประดิษฐ์'],
      content: (
        <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-indigo-950/40 rounded-2xl border border-blue-100 dark:border-indigo-900/50 space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              จุดเด่นของ Gemini AI ภายในระบบ HUSO Performance Intelligence
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              ระบบเชื่อมต่อโมเดล Gemini แบบ Resilient Fallback (gemini-3.7-flash, gemini-flash-latest, และ Rule-based Heuristic Engine) เพื่อให้ระบบทำงานได้ตลอดเวลา 24/7 แม้ในสภาวะที่มีปริมาณการใช้งานหนาแน่น
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-blue-600" />
                AI วิเคราะห์ประเด็น BRIDGE อัจฉริยะ
              </h5>
              <p className="text-slate-600 dark:text-slate-400">
                เมื่อผู้ใช้กรอกชื่อประเด็นและรายละเอียดใน Bridge Wizard สามารถกดปุ่ม <strong>"วิเคราะห์ด้วย AI"</strong> ระบบจะสร้าง State ปัจจุบัน, Desired State, วิเคราะห์ Gap, เสนอสาเหตุรากเหง้า (Probable Root Causes), ข้อเสนอแนะมาตรการ, และตัวชี้วัดความสำเร็จให้โดยอัตโนมัติ
              </p>
              <div className="text-slate-500 font-semibold pt-1">
                * ผู้ใช้สามารถเลือกยอมรับทั้งหมด หรือเลือกผสานข้อมูลเฉพาะบางช่องได้ (Selective Merge)
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Target className="w-4 h-4 text-purple-600" />
                AI Executive Insight & Forecast
              </h5>
              <p className="text-slate-600 dark:text-slate-400">
                ประมวลผลข้อมูลผลการดำเนินงานย้อนหลังทั้งคณะ คำนวณแนวโน้มความเสี่ยง (Trend Analysis) และพยากรณ์ความเป็นไปได้ในการบรรลุเป้าหมายสิ้นปีงบประมาณ พร้อมให้คำแนะนำเชิงกลยุทธ์สำหรับผู้บริหาร
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'sec-reports-pdf',
      category: 'REPORTS',
      title: '5. ศูนย์รายงาน 13 รูปแบบและการพิมพ์/ส่งออกเอกสาร PDF',
      subtitle: 'การออกรายงานผลการดำเนินงาน รายงาน EdPEx และเอกสารสำหรับที่ประชุมผู้บริหาร',
      icon: FileText,
      tags: ['report', 'pdf', 'print', 'export', 'management review', 'รายงาน', 'พิมพ์', 'ดาวน์โหลด'],
      content: (
        <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            ระบบรองรับการสร้างรายงานมาตรฐาน 13 รูปแบบ พร้อมระบบจัดพิมพ์เอกสารแบบ <strong>Print-to-PDF</strong> ที่จัดหน้าขนาด A4 สวยงาม รองรับฟอนต์ภาษาไทย และมีตัวเลือกกรองข้อมูลตามปีงบประมาณ หน่วยงาน และสถานะ
          </p>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <h5 className="font-bold text-slate-900 dark:text-white text-xs mb-2">วิธีพิมพ์หรือบันทึกรายงานเป็น PDF:</h5>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <li>เลือกเมนู <strong>"รายงาน 13 รูปแบบ (Print/A4)"</strong> หรือกดปุ่ม <strong>Export PDF</strong> ในหน้า Dashboard / รายงานความก้าวหน้า</li>
              <li>เลือกรูปแบบรายงานที่ต้องการ และเลือกปีงบประมาณหรือหน่วยงานที่ต้องการกรอง</li>
              <li>กดปุ่ม <strong>"พิมพ์รายงาน (A4 Print View)"</strong> ที่มุมขวาบน</li>
              <li>ในหน้าต่างพิมพ์ของเบราว์เซอร์ เลือก Destination เป็น <strong>"Save as PDF"</strong> หรือเลือกเครื่องพิมพ์ที่ต้องการ</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: 'sec-persistence-autosave',
      category: 'STORAGE',
      title: '6. การบันทึกข้อมูลถาวร ระบบบันทึกร่างอัตโนมัติ (Autosave) และถังขยะ',
      subtitle: 'ความปลอดภัยของข้อมูล การกู้คืนร่าง และการจัดการหมายเลขลำดับ (Sequence Recycling)',
      icon: ShieldCheck,
      tags: ['autosave', 'draft', 'trash', 'soft delete', 'restore', 'sequence', 'ถังขยะ', 'กู้คืน', 'ความปลอดภัย'],
      content: (
        <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
              <span className="font-bold text-blue-600 flex items-center gap-1">
                <Clock className="w-4 h-4" /> ระบบบันทึกร่างอัตโนมัติ
              </span>
              <p className="text-slate-600 dark:text-slate-400">
                เมื่อกรอกข้อมูลใน Bridge Wizard ระบบจะบันทึกร่าง (Draft Autosave) ลงในหน่วยความจำเครื่องอัตโนมัติ หากปิดหน้าต่างหรือเผลอรีเฟรช จะมีปุ่มกู้คืนข้อมูลร่างให้ทันที
              </p>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
              <span className="font-bold text-amber-600 flex items-center gap-1">
                <CheckSquare className="w-4 h-4" /> การใช้เลขลำดับซ้ำ (Sequence)
              </span>
              <p className="text-slate-600 dark:text-slate-400">
                ระบบใช้หลักการ Smallest Available Positive Integer หากมีการลบรายการใด หมายเลขลำดับ (เช่น BRG-2569-0002) จะถูกนำกลับมาใช้ใหม่อัตโนมัติเมื่อสร้างรายการถัดไป
              </p>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> ถังขยะและการกู้คืน (Soft Delete)
              </span>
              <p className="text-slate-600 dark:text-slate-400">
                รายการที่ถูกลบจะถูกย้ายไปยัง "ถังขยะ (Trash Bin)" ไม่มีการลบข้อมูลถาวรออกจากฐานข้อมูล และผู้ดูแลระบบสามารถกด Restore กู้คืนข้อมูลได้ตลอดเวลา
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const categories = [
    { key: 'ALL', label: 'ทั้งหมด (All Topics)' },
    { key: 'OVERVIEW', label: 'ภาพรวม & สิทธิ์' },
    { key: 'KPI_KVI', label: 'ระบบ KPI/KVI' },
    { key: 'BRIDGE', label: 'BRIDGE Model' },
    { key: 'AI_TOOLS', label: 'AI & Insight' },
    { key: 'REPORTS', label: 'รายงาน & PDF' },
    { key: 'STORAGE', label: 'Autosave & ถังขยะ' },
  ];

  // Filter sections by category and search query
  const filteredSections = useMemo(() => {
    return manualSections.filter((sec) => {
      if (selectedCategory !== 'ALL' && sec.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = sec.title.toLowerCase().includes(q);
        const matchSubtitle = sec.subtitle.toLowerCase().includes(q);
        const matchTags = sec.tags.some((t) => t.toLowerCase().includes(q));
        return matchTitle || matchSubtitle || matchTags;
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  const handlePrintManual = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold tracking-wide border border-blue-400/30">
            <BookOpen className="w-3.5 h-3.5" />
            คู่มือการใช้งานระบบสารสนเทศ
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            คู่มือการใช้งานระบบ HUSO Intelligence & BRIDGE Model
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            คู่มือออนไลน์ฉบับสมบูรณ์ ครอบคลุมการติดตามผลตัวชี้วัด KPI/KVI, การขับเคลื่อนกระบวนการด้วย BRIDGE Model 6 ขั้น, การใช้ AI ช่วยวิเคราะห์ และการออกรายงาน
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handlePrintManual}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium border border-white/10 transition-all text-xs"
          >
            <Printer className="w-4 h-4" />
            พิมพ์คู่มือ (Print / PDF)
          </button>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาหัวข้อ, คำสำคัญ (เช่น BRIDGE, 5 Whys, Traffic Light)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ล้าง
            </button>
          )}
        </div>

        {/* Categories */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Manual Content Accordion Sections */}
      <div className="space-y-4">
        {filteredSections.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
            <HelpCircle className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
              ไม่พบคู่มือที่ตรงกับคำค้นหา "{searchQuery}"
            </div>
            <div className="text-xs text-slate-500">
              ลองค้นหาด้วยคำอื่น หรือเลือกหมวดหมู่ "ทั้งหมด"
            </div>
          </div>
        ) : (
          filteredSections.map((sec) => {
            const isExpanded = expandedSectionId === sec.id || searchQuery.trim().length > 0;
            const Icon = sec.icon;

            return (
              <div
                key={sec.id}
                id={sec.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-all"
              >
                <button
                  onClick={() => setExpandedSectionId(isExpanded ? '' : sec.id)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">
                        {sec.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {sec.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {sec.content}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

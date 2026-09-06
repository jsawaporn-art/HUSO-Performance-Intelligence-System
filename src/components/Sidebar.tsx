import React from 'react';
import {
  LayoutDashboard,
  Gauge,
  ListChecks,
  Target as TargetIcon,
  FileEdit,
  CheckSquare,
  FolderOpen,
  AlertTriangle,
  Bot,
  FileText,
  Calendar,
  Settings,
  History,
  Trash2,
  ChevronRight,
  X,
  Layers,
  Building2,
  Users,
  Clock,
  Flame,
  Award,
  Sliders,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { UserRole } from '../types';
import { HusoLogo } from './HusoLogo';

export type ActiveTab =
  | 'dashboard'
  | 'cockpit'
  | 'indicators'
  | 'targets'
  | 'progress'
  | 'verification'
  | 'evidence'
  | 'directives'
  | 'ai_insight'
  | 'reports'
  | 'workspace'
  | 'settings'
  | 'logs'
  | 'trash'
  | 'manual'
  // BRIDGE Process Improvement Module
  | 'bridge_overview'
  | 'bridge_depts'
  | 'bridge_my_tasks'
  | 'bridge_progress'
  | 'bridge_decisions'
  | 'bridge_innovations'
  | 'bridge_reports'
  | 'bridge_settings';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  userRole: UserRole;
  pendingVerificationCount?: number;
  openDirectivesCount?: number;
  bridgePendingDecisionsCount?: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  userRole,
  pendingVerificationCount = 0,
  openDirectivesCount = 0,
  bridgePendingDecisionsCount = 0,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const kpiMenuItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Executive Dashboard',
      sublabel: 'ภาพรวมผู้บริหาร Real-time',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'EXECUTIVE', 'REVIEWER', 'OWNER', 'DATA_SUPPORT', 'VIEWER'],
    },
    {
      id: 'cockpit' as ActiveTab,
      label: 'Management Cockpit',
      sublabel: 'ห้องบัญชาการผู้บริหาร',
      icon: Gauge,
      badge: openDirectivesCount > 0 ? openDirectivesCount : undefined,
      badgeColor: 'bg-amber-500 text-slate-900',
      roles: ['ADMIN', 'EXECUTIVE', 'REVIEWER'],
    },
    {
      id: 'indicators' as ActiveTab,
      label: 'จัดการ KPI / KVI',
      sublabel: 'Master Data ตัวชี้วัด',
      icon: ListChecks,
      roles: ['ADMIN', 'EXECUTIVE', 'REVIEWER', 'OWNER', 'DATA_SUPPORT'],
    },
    {
      id: 'progress' as ActiveTab,
      label: 'บันทึกผลการดำเนินงาน',
      sublabel: 'Performance Result Entry',
      icon: FileEdit,
      roles: ['ADMIN', 'EXECUTIVE', 'REVIEWER', 'OWNER', 'DATA_SUPPORT'],
    },
    {
      id: 'verification' as ActiveTab,
      label: 'ตรวจสอบและรับรอง',
      sublabel: 'Verification Workflow',
      icon: CheckSquare,
      badge: pendingVerificationCount > 0 ? pendingVerificationCount : undefined,
      badgeColor: 'bg-emerald-500 text-white',
      roles: ['ADMIN', 'EXECUTIVE', 'REVIEWER'],
    },
    {
      id: 'evidence' as ActiveTab,
      label: 'คลังหลักฐานประกอบ',
      sublabel: 'Evidence Drive & Links',
      icon: FolderOpen,
      roles: ['ADMIN', 'EXECUTIVE', 'REVIEWER', 'OWNER', 'DATA_SUPPORT', 'VIEWER'],
    },
    {
      id: 'directives' as ActiveTab,
      label: 'มาตรการแก้ไข & คำสั่ง',
      sublabel: 'Action Directives',
      icon: AlertTriangle,
      roles: ['ADMIN', 'EXECUTIVE', 'REVIEWER', 'OWNER', 'DATA_SUPPORT'],
    },
    {
      id: 'ai_insight' as ActiveTab,
      label: 'AI Executive Insight',
      sublabel: 'วิเคราะห์ด้วย Gemini & Forecast',
      icon: Bot,
      highlight: true,
      roles: ['ADMIN', 'EXECUTIVE', 'REVIEWER', 'OWNER', 'DATA_SUPPORT', 'VIEWER'],
    },
    {
      id: 'reports' as ActiveTab,
      label: 'รายงานความก้าวหน้า',
      sublabel: 'Performance Reports',
      icon: FileText,
      roles: ['ADMIN', 'EXECUTIVE', 'REVIEWER', 'OWNER', 'DATA_SUPPORT', 'VIEWER'],
    },
    {
      id: 'workspace' as ActiveTab,
      label: 'Google Workspace Sync',
      sublabel: 'Calendar & Gmail Notification',
      icon: Calendar,
      roles: ['ADMIN', 'EXECUTIVE', 'REVIEWER', 'OWNER', 'DATA_SUPPORT'],
    },
    {
      id: 'settings' as ActiveTab,
      label: 'ตั้งค่าระบบ & ผู้ใช้',
      sublabel: 'Thresholds & User Roles',
      icon: Settings,
      roles: ['ADMIN', 'EXECUTIVE'],
    },
    {
      id: 'logs' as ActiveTab,
      label: 'Activity Audit Log',
      sublabel: 'ประวัติการทำงานในระบบ',
      icon: History,
      roles: ['ADMIN', 'EXECUTIVE'],
    },
    {
      id: 'manual' as ActiveTab,
      label: 'คู่มือการใช้งานระบบ',
      sublabel: 'User Manual & Guidelines',
      icon: BookOpen,
      roles: ['ADMIN', 'EXECUTIVE', 'REVIEWER', 'OWNER', 'DATA_SUPPORT', 'VIEWER'],
    },
    {
      id: 'trash' as ActiveTab,
      label: 'ถังขยะ (Trash Bin)',
      sublabel: 'รายการที่ถูก Soft Delete',
      icon: Trash2,
      roles: ['ADMIN'],
    },
  ];

  const bridgeMenuItems = [
    {
      id: 'bridge_overview' as ActiveTab,
      label: 'BRIDGE ภาพรวม',
      sublabel: 'Pipeline 6 ขั้น & สรุปผล',
      icon: Layers,
      highlight: true,
      roles: ['ADMIN', 'EXECUTIVE', 'REVIEWER', 'OWNER', 'DATA_SUPPORT', 'VIEWER'],
    },
    {
      id: 'bridge_depts' as ActiveTab,
      label: 'ประเด็นตามหน่วยงาน/หลักสูตร',
      sublabel: 'Department & Course Issues',
      icon: Building2,
      roles: ['ADMIN', 'EXECUTIVE', 'REVIEWER', 'OWNER', 'DATA_SUPPORT', 'VIEWER'],
    },
    {
      id: 'bridge_my_tasks' as ActiveTab,
      label: 'งานที่ฉันรับผิดชอบ',
      sublabel: 'My Assigned Improvements',
      icon: Users,
      roles: ['ADMIN', 'EXECUTIVE', 'REVIEWER', 'OWNER', 'DATA_SUPPORT'],
    },
    {
      id: 'bridge_progress' as ActiveTab,
      label: 'ติดตามผล & รายงานรอบ',
      sublabel: 'Progress Reports & History',
      icon: Clock,
      roles: ['ADMIN', 'EXECUTIVE', 'REVIEWER', 'OWNER', 'DATA_SUPPORT'],
    },
    {
      id: 'bridge_decisions' as ActiveTab,
      label: 'รอผู้บริหารตัดสินใจ',
      sublabel: 'Executive Decision Board',
      icon: Flame,
      badge: bridgePendingDecisionsCount > 0 ? bridgePendingDecisionsCount : undefined,
      badgeColor: 'bg-purple-600 text-white',
      roles: ['ADMIN', 'EXECUTIVE', 'REVIEWER', 'OWNER', 'DATA_SUPPORT', 'VIEWER'],
    },
    {
      id: 'bridge_innovations' as ActiveTab,
      label: 'คลังนวัตกรรม & Best Practice',
      sublabel: 'EdPEx Knowledge & Scaling',
      icon: Award,
      roles: ['ADMIN', 'EXECUTIVE', 'REVIEWER', 'OWNER', 'DATA_SUPPORT', 'VIEWER'],
    },
    {
      id: 'bridge_reports' as ActiveTab,
      label: 'รายงาน 13 รูปแบบ (Print/A4)',
      sublabel: 'EdPEx Process Reports',
      icon: FileText,
      roles: ['ADMIN', 'EXECUTIVE', 'REVIEWER', 'OWNER', 'DATA_SUPPORT', 'VIEWER'],
    },
    {
      id: 'bridge_settings' as ActiveTab,
      label: 'ตั้งค่าระบบ BRIDGE',
      sublabel: 'Work Domains & Customer Master',
      icon: Sliders,
      roles: ['ADMIN', 'EXECUTIVE'],
    },
  ];

  const visibleKpiItems = kpiMenuItems.filter((item) => item.roles.includes(userRole));
  const visibleBridgeItems = bridgeMenuItems.filter((item) => item.roles.includes(userRole));

  const handleItemClick = (tabId: ActiveTab) => {
    onSelectTab(tabId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between overflow-y-auto pr-1">
      <div className="space-y-5">
        {/* BRIDGE Module Section */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              BRIDGE ปรับปรุงงาน (EdPEx)
            </div>
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <nav className="space-y-1">
            {visibleBridgeItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all group cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold'
                      : item.highlight
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 hover:bg-blue-100'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 ${
                        isActive
                          ? 'text-white'
                          : item.highlight
                          ? 'text-blue-600'
                          : 'text-slate-400 group-hover:text-blue-600'
                      }`}
                    />
                    <div className="truncate">
                      <div className="leading-tight truncate text-xs font-bold">{item.label}</div>
                      <div
                        className={`text-[10px] truncate ${
                          isActive
                            ? 'text-blue-100'
                            : item.highlight
                            ? 'text-blue-700 dark:text-blue-300'
                            : 'text-slate-400'
                        }`}
                      >
                        {item.sublabel}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    {item.badge !== undefined && (
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                          item.badgeColor || 'bg-blue-500 text-white'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <ChevronRight className="w-3.5 h-3.5 text-white hidden md:block" />
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* KPI / KVI Strategic Management Section */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              ระบบ KPI / KVI เดิม
            </div>
          </div>
          <nav className="space-y-1">
            {visibleKpiItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all group cursor-pointer ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20 font-semibold'
                      : item.highlight
                      ? 'bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-amber-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 ${
                        isActive
                          ? 'text-white'
                          : item.highlight
                          ? 'text-amber-600'
                          : 'text-slate-400 group-hover:text-amber-600'
                      }`}
                    />
                    <div className="truncate">
                      <div className="leading-tight truncate text-xs font-semibold">{item.label}</div>
                      <div
                        className={`text-[10px] truncate ${
                          isActive
                            ? 'text-amber-100'
                            : item.highlight
                            ? 'text-amber-700'
                            : 'text-slate-400'
                        }`}
                      >
                        {item.sublabel}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    {item.badge !== undefined && (
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                          item.badgeColor || 'bg-amber-500 text-slate-900'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <ChevronRight className="w-3.5 h-3.5 text-white hidden md:block" />
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-8 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 leading-normal flex items-start gap-2.5">
        <HusoLogo variant="badge" size="sm" className="shrink-0 mt-0.5 shadow-xs" />
        <div>
          <div className="font-bold text-amber-700 dark:text-amber-400 leading-tight">
            HUSO Performance
          </div>
          <div className="font-medium text-slate-700 dark:text-slate-300 text-[10px] mt-0.5">
            คณะมนุษยศาสตร์และสังคมศาสตร์
          </div>
          <div className="text-[9px] text-slate-400 mt-0.5">
            ม.ราชภัฏยะลา &bull; EdPEx Mode
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden md:block w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 flex-shrink-0 min-h-[calc(100vh-6rem)] p-3 shadow-sm">
        {navContent}
      </aside>

      {/* Mobile Drawer Backdrop & Slide-over */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Drawer panel */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-slate-900 p-4 shadow-2xl z-10 overflow-y-auto">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldAlert,
  UserCheck,
  Calendar,
  Sparkles,
  RefreshCw,
  Award,
  Bell,
  CheckCircle2,
  LogOut,
  KeyRound,
  ChevronDown,
  Globe,
  Settings,
  Database,
  Layers,
  FileSpreadsheet,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { HusoLogo } from './HusoLogo';

interface NavbarProps {
  currentUser: User;
  onLogout?: () => void;
  selectedYear: string;
  onChangeYear: (year: string) => void;
  onRefreshData: () => void;
  availableYears: string[];
  dbStatus?: 'CONNECTED' | 'SYNCING' | 'DISCONNECTED';
  lastSyncedTime?: Date | null;
  onManualSync?: () => void;
  onOpenChangePassword?: () => void;
  onViewPublicDashboard?: () => void;
  onOpenSettings?: () => void;
  onOpenGoLive?: () => void;
  isGoogleConnected?: boolean;
  onToggleMobileSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  selectedYear,
  onChangeYear,
  onRefreshData,
  availableYears,
  dbStatus = 'CONNECTED',
  lastSyncedTime,
  onManualSync,
  onOpenChangePassword,
  onViewPublicDashboard,
  onOpenSettings,
  onOpenGoLive,
  isGoogleConnected = false,
  onToggleMobileSidebar,
  isMobileSidebarOpen = false,
  unreadNotificationsCount = 0,
  onOpenNotifications,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-950/90 text-purple-300 border-purple-800';
      case 'EXECUTIVE':
        return 'bg-amber-950/90 text-amber-300 border-amber-800';
      case 'REVIEWER':
        return 'bg-blue-950/90 text-blue-300 border-blue-800';
      case 'OWNER':
        return 'bg-emerald-950/90 text-emerald-300 border-emerald-800';
      case 'DATA_SUPPORT':
        return 'bg-cyan-950/90 text-cyan-300 border-cyan-800';
      default:
        return 'bg-slate-900 text-slate-300 border-slate-800';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950 border-b border-slate-800 text-white shadow-xl flex-shrink-0">
      {/* ========================================================================= */}
      {/* LEVEL 1: SYSTEM STATUS BAR (Height: 32-36px)                              */}
      {/* ========================================================================= */}
      <div className="w-full bg-slate-950 border-b border-slate-800/80 px-3 sm:px-6 lg:px-8 py-1">
        <div className="max-w-7xl mx-auto flex items-center justify-between min-h-[26px] text-[11px]">
          {/* Level 1 Left: Firebase Status & Sync Timestamp */}
          <div className="flex items-center space-x-2 sm:space-x-3 truncate">
            {/* Status Pill */}
            <div className="flex items-center space-x-1.5 shrink-0">
              {dbStatus === 'CONNECTED' ? (
                <div className="flex items-center space-x-1.5 bg-emerald-950/90 border border-emerald-800/80 px-2 py-0.5 rounded-md text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-500/50" />
                  <span className="font-bold hidden sm:inline">ระบบใช้งานจริง — Firebase Connected</span>
                  <span className="font-bold sm:hidden">Connected</span>
                </div>
              ) : dbStatus === 'SYNCING' ? (
                <div className="flex items-center space-x-1.5 bg-amber-950/90 border border-amber-800/80 px-2 py-0.5 rounded-md text-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span className="font-bold">กำลังซิงก์...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 bg-rose-950/90 border border-rose-800/80 px-2 py-0.5 rounded-md text-rose-300">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="font-bold">ออฟไลน์</span>
                </div>
              )}
            </div>

            {/* Last Synced Time */}
            {lastSyncedTime && (
              <span className="text-slate-400 border-l border-slate-800 pl-2 hidden md:inline truncate">
                ซิงก์ล่าสุด: {lastSyncedTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} น.
              </span>
            )}
          </div>

          {/* Level 1 Right: Google Sheet & DB Sync Buttons (No full email) */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            {/* Google Sheets Connection Pill */}
            {isGoogleConnected && (
              <div className="hidden sm:flex items-center space-x-1 px-2 py-0.5 bg-emerald-900/40 border border-emerald-700/60 rounded text-[10px] text-emerald-300 font-semibold">
                <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                <span>Google Sheets Sync</span>
              </div>
            )}

            {/* Quick Manual Sync Button */}
            {onManualSync && (
              <button
                onClick={onManualSync}
                title="ซิงก์ข้อมูลล่าสุดจาก Cloud Firestore"
                className="flex items-center space-x-1 px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/70 rounded text-[10px] font-bold transition cursor-pointer"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${dbStatus === 'SYNCING' ? 'animate-spin text-amber-400' : ''}`} />
                <span className="hidden sm:inline">ซิงก์ข้อมูลกลาง</span>
                <span className="sm:hidden">ซิงก์</span>
              </button>
            )}

            {/* Admin Go-Live Indicator (if Admin) */}
            {currentUser.role === 'ADMIN' && onOpenGoLive && (
              <button
                onClick={onOpenGoLive}
                title="ระบบเตรียมความพร้อมเริ่มใช้งานจริง (Go-Live / Reset Data)"
                className="hidden lg:flex items-center space-x-1 px-2 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[10px] font-bold transition cursor-pointer"
              >
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                <span>พร้อมใช้งานจริง (Go-Live)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LEVEL 2: MAIN NAVIGATION BAR (Height: 72-80px)                            */}
      {/* ========================================================================= */}
      <div className="w-full px-3 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 min-h-[58px]">
          {/* Level 2 Left: Mobile Hamburger + HUSO Brand Logo & Name */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* Mobile Sidebar Toggle Button */}
            {onToggleMobileSidebar && (
              <button
                onClick={onToggleMobileSidebar}
                aria-label="เปิดเมนูนำทาง"
                className="md:hidden p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 focus:outline-none min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
              >
                {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}

            {/* HUSO Official Faculty Brand Emblem */}
            <HusoLogo variant="badge" size="md" className="shadow-lg shadow-black/20" />

            {/* University & System Title */}
            <div className="flex flex-col justify-center">
              <div className="flex items-center space-x-2">
                <h1 className="text-sm sm:text-base lg:text-lg font-black text-white tracking-tight leading-tight">
                  HUSO Performance Intelligence System
                </h1>
                <span className="hidden xl:inline-block px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                  KPI/KVI & BRIDGE
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate max-w-[180px] sm:max-w-sm lg:max-w-md">
                คณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏยะลา
              </p>
            </div>
          </div>

          {/* Level 2 Center: Year Selector, Strategic Badge, Public Dashboard (Desktop) */}
          <div className="hidden lg:flex items-center space-x-2.5">
            {/* Fiscal Year Selector */}
            <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 shadow-inner">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-semibold text-slate-400 text-[11px]">ปีงบฯ:</span>
              <select
                value={selectedYear}
                onChange={(e) => onChangeYear(e.target.value)}
                className="bg-transparent font-bold text-amber-300 focus:outline-none cursor-pointer pr-1"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y} className="bg-slate-900 text-white font-bold">
                    พ.ศ. {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Strategic Plan Badge */}
            <span className="px-2.5 py-1 text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-xl shadow-xs shrink-0 select-none">
              แผนยุทธศาสตร์ พ.ศ. 2569 - 2575
            </span>

            {/* Public Dashboard Shortcut */}
            {onViewPublicDashboard && (
              <button
                onClick={onViewPublicDashboard}
                title="เข้าสู่หน้า Dashboard เผยแพร่สาธารณะ (Public View)"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                <span>Dashboard สาธารณะ</span>
              </button>
            )}
          </div>

          {/* Level 2 Right: Notification, Refresh, User Profile & User Menu */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
            {/* Mobile Year Selector (if hidden on center) */}
            <div className="lg:hidden flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs">
              <select
                value={selectedYear}
                onChange={(e) => onChangeYear(e.target.value)}
                className="bg-transparent font-bold text-amber-300 focus:outline-none cursor-pointer text-xs"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y} className="bg-slate-900 text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Notifications Center Icon */}
            {onOpenNotifications && (
              <button
                onClick={onOpenNotifications}
                title="การแจ้งเตือนระบบ"
                className="relative p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition min-w-[38px] min-h-[38px] flex items-center justify-center cursor-pointer"
              >
                <Bell className="w-4 h-4 text-slate-300" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full font-bold text-[9px] flex items-center justify-center shadow-md animate-pulse">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}

            {/* Refresh Dashboard Button */}
            <button
              onClick={onRefreshData}
              title="รีเฟรชข้อมูล Dashboard"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition min-w-[38px] min-h-[38px] flex items-center justify-center cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* User Profile Trigger & Dropdown Menu Container */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                aria-expanded={isUserMenuOpen}
                className="flex items-center space-x-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 transition cursor-pointer text-left"
              >
                {/* Avatar */}
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.fullName}
                    className="w-8 h-8 rounded-lg border border-amber-500/50 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs shrink-0 select-none shadow-sm">
                    {currentUser.fullName ? currentUser.fullName.substring(0, 2) : 'US'}
                  </div>
                )}

                {/* Name & Role (Hidden on mobile) */}
                <div className="hidden sm:block text-left leading-tight pr-1">
                  <div className="text-xs font-bold text-white max-w-[120px] lg:max-w-[150px] truncate">
                    {currentUser.fullName}
                  </div>
                  <div className="flex items-center space-x-1 mt-0.5">
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold border ${getRoleBadgeStyle(currentUser.role)}`}>
                      {currentUser.rolesDisplay || currentUser.role}
                    </span>
                  </div>
                </div>

                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* User Dropdown Menu Floating Card */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden text-white animate-in fade-in zoom-in-95 duration-150">
                  {/* Dropdown User Header */}
                  <div className="p-4 bg-slate-950/80 border-b border-slate-800">
                    <div className="flex items-center space-x-3">
                      {currentUser.avatarUrl ? (
                        <img
                          src={currentUser.avatarUrl}
                          alt={currentUser.fullName}
                          className="w-10 h-10 rounded-xl border border-amber-500/50 object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm">
                          {currentUser.fullName ? currentUser.fullName.substring(0, 2) : 'US'}
                        </div>
                      )}
                      <div className="truncate">
                        <div className="font-bold text-white text-sm truncate">{currentUser.fullName}</div>
                        <div className="text-[11px] text-slate-400 truncate">{currentUser.email || 'ผู้ใช้งานระบบ HUSO'}</div>
                        <div className="flex items-center space-x-1.5 mt-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getRoleBadgeStyle(currentUser.role)}`}>
                            {currentUser.rolesDisplay || currentUser.role}
                          </span>
                          <span className="text-[10px] text-amber-400 font-medium truncate">
                            {currentUser.departmentName}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dropdown Menu Items */}
                  <div className="p-2 space-y-1 text-xs text-slate-300">
                    {/* Public Dashboard Shortcut (Mobile/Tablet View) */}
                    {onViewPublicDashboard && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onViewPublicDashboard();
                        }}
                        className="w-full text-left flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 hover:text-amber-300 transition"
                      >
                        <Globe className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="font-medium">Dashboard สาธารณะ (Public View)</span>
                      </button>
                    )}

                    {/* Change Password */}
                    {onOpenChangePassword && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenChangePassword();
                        }}
                        className="w-full text-left flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 hover:text-white transition"
                      >
                        <KeyRound className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-medium">เปลี่ยนรหัสผ่าน (Change Password)</span>
                      </button>
                    )}

                    {/* Settings (if Admin/Executive) */}
                    {onOpenSettings && ['ADMIN', 'EXECUTIVE'].includes(currentUser.role) && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenSettings();
                        }}
                        className="w-full text-left flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 hover:text-white transition"
                      >
                        <Settings className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-medium">ตั้งค่าระบบ & สิทธิ์ผู้ใช้</span>
                      </button>
                    )}

                    {/* Go-Live / Data Management (if Admin) */}
                    {onOpenGoLive && currentUser.role === 'ADMIN' && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenGoLive();
                        }}
                        className="w-full text-left flex items-center space-x-2.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition font-bold"
                      >
                        <Database className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>ระบบเตรียมความพร้อมเริ่มใช้งานจริง (Go-Live)</span>
                      </button>
                    )}

                    {/* Manual Sync */}
                    {onManualSync && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onManualSync();
                        }}
                        className="w-full text-left flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 hover:text-emerald-300 transition"
                      >
                        <RefreshCw className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="font-medium">ซิงก์ข้อมูลกลางจาก Cloud Firestore</span>
                      </button>
                    )}
                  </div>

                  {/* Dropdown Footer: Logout */}
                  {onLogout && (
                    <div className="p-2 border-t border-slate-800 bg-slate-950/40">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full text-left flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-800/80 font-bold transition cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-rose-300 shrink-0" />
                        <span>ออกจากระบบ (Sign Out)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

import React, { useState } from 'react';
import { FileSpreadsheet, ExternalLink, RefreshCw, CheckCircle2, AlertCircle, LogOut, Trash2 } from 'lucide-react';
import { GoogleUserInfo, signInWithGoogle, googleLogout } from '../lib/googleAuth';
import { SyncStatus } from '../lib/googleSheets';

interface GoogleSyncBannerProps {
  googleUser: GoogleUserInfo | null;
  syncStatus: SyncStatus;
  onLoginSuccess: (userInfo: GoogleUserInfo) => void;
  onLogout: () => void;
  onManualSync: () => void;
  onClearSheet?: () => void;
}

export const GoogleSyncBanner: React.FC<GoogleSyncBannerProps> = ({
  googleUser,
  syncStatus,
  onLoginSuccess,
  onLogout,
  onManualSync,
  onClearSheet,
}) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const user = await signInWithGoogle();
      if (user) {
        onLoginSuccess(user);
      }
    } catch (err: any) {
      setLoginError(err.message || 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white border-b border-emerald-800/40 px-4 py-2 text-xs shadow-inner">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* Left Status Text */}
        <div className="flex items-center space-x-2 truncate">
          <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
            <FileSpreadsheet className="w-3.5 h-3.5" />
          </span>

          {googleUser ? (
            <div className="flex items-center space-x-2 truncate">
              <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                เชื่อมโยงกับ Google Sheet เรียบร้อยแล้ว
              </span>
              <span className="text-slate-400 text-[11px] hidden md:inline truncate">
                ({googleUser.email})
              </span>

              {syncStatus.isSyncing ? (
                <span className="inline-flex items-center gap-1 text-amber-400 font-medium text-[11px] animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  กำลังซิงค์/ล้างข้อมูล Google Sheet...
                </span>
              ) : syncStatus.lastSyncedAt ? (
                <span className="text-slate-400 text-[10px] hidden lg:inline">
                  | อัปเดตล่าสุด: {syncStatus.lastSyncedAt.toLocaleTimeString('th-TH')} น.
                </span>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-300">
                เชื่อมต่อกับ Google Sheet ใน Google Drive ส่วนตัว บันทึกข้อมูลอัตโนมัติแบบเรียลไทม์ ปลอดภัย 100%
              </span>
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2 shrink-0">
          {googleUser ? (
            <>
              {syncStatus.spreadsheetUrl && (
                <a
                  href={syncStatus.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg font-bold text-[11px] shadow-sm transition"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>เปิด Google Sheet ↗</span>
                </a>
              )}

              {onClearSheet && (
                <button
                  onClick={onClearSheet}
                  disabled={syncStatus.isSyncing}
                  title="ล้างแถวข้อมูลเก่าทั้งหมดใน Google Sheet"
                  className="flex items-center space-x-1 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/60 px-2 py-1 rounded-lg text-[11px] font-semibold transition"
                >
                  <Trash2 className="w-3 h-3 text-rose-400" />
                  <span>ล้างข้อมูลเก่าในชีต</span>
                </button>
              )}

              <button
                onClick={onManualSync}
                disabled={syncStatus.isSyncing}
                title="ล้างข้อมูลเก่าและซิงค์ข้อมูลใหม่ทั้งหมดลง Google Sheet ทันที"
                className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2 py-1 rounded-lg text-[11px] font-semibold transition"
              >
                <RefreshCw className={`w-3 h-3 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
                <span>ซิงค์ทันที</span>
              </button>

              <button
                onClick={async () => {
                  await googleLogout();
                  onLogout();
                }}
                title="ออกจากระบบ Google"
                className="p-1 rounded-lg bg-slate-800/80 hover:bg-rose-900/60 text-slate-400 hover:text-rose-200 transition border border-slate-700"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </>
          ) : (
            /* Official Material Style Sign in with Google Button */
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoggingIn}
              className="flex items-center space-x-2 bg-white hover:bg-slate-100 text-slate-800 font-bold px-3 py-1 rounded-lg border border-slate-200 shadow-sm transition active:scale-95 text-xs cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{isLoggingIn ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google'}</span>
            </button>
          )}
        </div>
      </div>

      {loginError && (
        <div className="max-w-7xl mx-auto mt-1 text-[11px] text-rose-300 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
          <span>{loginError}</span>
        </div>
      )}
    </div>
  );
};

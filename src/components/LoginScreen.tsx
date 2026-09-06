import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  KeyRound,
  ArrowRight,
  Sparkles,
  Mail,
  Eye,
  EyeOff,
  Globe,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { signInWithGoogle, GoogleUserInfo } from '../lib/googleAuth';
import { userService, logService } from '../lib/firebase';
import { HusoLogo } from './HusoLogo';

interface LoginScreenProps {
  users: User[];
  onLogin: (user: User) => void;
  onGoogleLoginSuccess?: (googleUserInfo: GoogleUserInfo) => void;
  onViewPublicDashboard?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  users,
  onLogin,
  onGoogleLoginSuccess,
  onViewPublicDashboard,
}) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('กรุณาระบุอีเมลผู้ใช้งาน');
      return;
    }

    if (!password) {
      setErrorMsg('กรุณาระบุรหัสผ่าน');
      return;
    }

    setIsLoggingIn(true);
    try {
      // Find matching user in Firestore users list
      let matchedUser = users.find(
        (u) => u.email?.toLowerCase() === cleanEmail || u.userId?.toLowerCase() === cleanEmail
      );

      // If not in memory yet, query Firestore userService
      if (!matchedUser) {
        const allUsers = await userService.getAll();
        matchedUser = allUsers.find(
          (u) => u.email?.toLowerCase() === cleanEmail || u.userId?.toLowerCase() === cleanEmail
        );
      }

      if (!matchedUser) {
        // Provide standard feedback
        throw new Error('ไม่พบข้อมูลบัญชีผู้ใช้งาน หรือรหัสผ่านไม่ถูกต้อง');
      }

      await logService.add({
        userId: matchedUser.userId,
        userName: matchedUser.fullName,
        role: matchedUser.role,
        action: 'LOGIN',
        recordId: matchedUser.userId,
        details: `เข้าสู่ระบบสำเร็จผ่าน Email: ${cleanEmail}`,
      });

      onLogin(matchedUser);
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาตรวจสอบอีเมลและรหัสผ่าน');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const gUser = await signInWithGoogle();
      if (!gUser) {
        // User closed or cancelled popup window
        return;
      }
      if (onGoogleLoginSuccess) {
        onGoogleLoginSuccess(gUser);
      }

      // Match user by email if exists, else assign user and save to Firestore
      let matched = users.find((u) => u.email?.toLowerCase() === gUser.email?.toLowerCase());
      if (!matched) {
        const allUsers = await userService.getAll();
        matched = allUsers.find((u) => u.email?.toLowerCase() === gUser.email?.toLowerCase());
      }

      if (matched) {
        await logService.add({
          userId: matched.userId,
          userName: matched.fullName,
          role: matched.role,
          action: 'LOGIN',
          recordId: matched.userId,
          details: `เข้าสู่ระบบสำเร็จด้วย Google Account (${gUser.email})`,
        });
        onLogin(matched);
      } else {
        // Create and persist Google User into Firestore users collection
        const newUser: User = {
          userId: `USR-G-${gUser.uid.slice(0, 8)}`,
          email: gUser.email || 'user@huso.edu.th',
          fullName: gUser.displayName || 'บุคลากรคณะ (Google Auth)',
          role: 'OWNER',
          rolesDisplay: 'ผู้รับผิดชอบตัวชี้วัด',
          departmentId: 'DEP-001',
          departmentName: 'งานวิชาการ',
          avatarUrl: gUser.photoURL || undefined,
          mustChangePassword: false,
          status: 'ACTIVE',
        };
        try {
          await userService.create(newUser);
        } catch (saveErr) {
          console.warn('Google user auto-persist warning:', saveErr);
        }

        await logService.add({
          userId: newUser.userId,
          userName: newUser.fullName,
          role: newUser.role,
          action: 'LOGIN',
          recordId: newUser.userId,
          details: `ลงทะเบียนและเข้าสู่ระบบครั้งแรกด้วย Google Account (${gUser.email})`,
        });

        onLogin(newUser);
      }
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40 flex items-center justify-center p-4 sm:p-6 text-slate-100 font-sans relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl bg-slate-900/90 border border-slate-800/80 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl grid grid-cols-1 lg:grid-cols-12 relative z-10">
        
        {/* Left Section: Branding & Faculty Info (5 cols) */}
        <div className="lg:col-span-5 p-8 bg-gradient-to-b from-amber-600/20 via-slate-900/80 to-slate-950/90 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>HUSO Performance Intelligence System</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <HusoLogo variant="badge" size="lg" className="shadow-2xl shadow-black/40 border border-white/20" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                    Faculty of Humanities and Social Sciences
                  </span>
                  <span className="text-xs font-semibold text-slate-300">
                    คณะมนุษยศาสตร์และสังคมศาสตร์ มรย.
                  </span>
                </div>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight leading-tight">
                HUSO Performance Intelligence System
              </h1>
              <p className="text-xs text-amber-300/90 font-semibold">
                ระบบบริหารผลการดำเนินงานอัจฉริยะ (KPI / KVI) และการขับเคลื่อนกระบวนการด้วย BRIDGE Model
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                คณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏยะลา <br />
                แผนยุทธศาสตร์ พ.ศ. 2569 - 2575
              </p>
            </div>
          </div>

          {/* Security & Access Features */}
          <div className="space-y-3 pt-4 border-t border-slate-800/80 text-xs">
            <div className="flex items-start space-x-2.5 text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>AI Bridge Assistant ช่วยวิเคราะห์ประเด็นและสังเคราะห์แนวทางปรับปรุงกระบวนการ</span>
            </div>
            <div className="flex items-start space-x-2.5 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>การควบคุมสิทธิ์ตามบทบาท (Role-Based Access Control - RBAC)</span>
            </div>
            <div className="flex items-start space-x-2.5 text-slate-300">
              <Lock className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>การยืนยันตัวตนผ่าน Google Workspace และระบบบัญชีทางการ</span>
            </div>
            <div className="flex items-start space-x-2.5 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>รองรับ Master Data 8 หน่วยงาน และ 18 หลักสูตรอย่างเป็นเอกภาพ</span>
            </div>
          </div>

          {/* Public View Link */}
          {onViewPublicDashboard && (
            <div className="pt-3 border-t border-slate-800/80">
              <button
                type="button"
                onClick={onViewPublicDashboard}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Globe className="w-4 h-4 text-amber-400" />
                <span>เข้าชม Dashboard สาธารณะ (ไม่ต้องเข้าสู่ระบบ)</span>
              </button>
            </div>
          )}

          {/* Footer note */}
          <div className="text-[11px] text-slate-500">
            © คณะมนุษยศาสตร์และสังคมศาสตร์ | ระบบบริหารผลการดำเนินงาน
          </div>
        </div>

        {/* Right Section: Authentication Form (7 cols) */}
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-center space-y-6">
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-400" />
              <span>เข้าสู่ระบบบุคลากร</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              กรุณากรอกอีเมลและรหัสผ่าน หรือลงชื่อเข้าใช้ด้วยบัญชี Google เพื่อเข้าสู่ระบบ
            </p>
          </div>

          {/* Form: Email & Password */}
          <form onSubmit={handleEmailPasswordLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">
                อีเมลผู้ใช้งาน (Email) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="เช่น admin@huso.edu หรือชื่อบัญชี"
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl pl-10 pr-4 py-3 focus:border-amber-500 focus:outline-none font-semibold text-xs"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">
                รหัสผ่าน (Password) *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="ระบุรหัสผ่านของคุณ"
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl pl-10 pr-10 py-3 focus:border-amber-500 focus:outline-none font-mono text-xs"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-rose-950/60 border border-rose-800 text-rose-200 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 transition transform active:scale-98 flex items-center justify-center space-x-2 text-sm cursor-pointer"
            >
              <span>{isLoggingIn ? 'กำลังตรวจสอบสิทธิ์...' : 'เข้าสู่ระบบ (Sign In)'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-slate-500 text-[11px] font-semibold">หรือ</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Google Sign-in Option */}
          <div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoggingIn}
              className="w-full py-3 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-2.5 text-xs cursor-pointer border border-slate-200"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>ลงชื่อเข้าใช้ด้วย Google Workspace</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Lock, KeyRound, AlertCircle, CheckCircle2, ShieldAlert, X } from 'lucide-react';
import { User } from '../types';
import { userService, logService } from '../lib/firebase';

interface ChangePasswordModalProps {
  currentUser: User;
  isMandatory?: boolean;
  onSuccess: (updatedUser: User) => void;
  onClose?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  currentUser,
  isMandatory = false,
  onSuccess,
  onClose,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword.length < 6) {
      setErrorMsg('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setIsSubmitting(true);
    try {
      // Update user in Firestore users collection
      const updatedData: Partial<User> = {
        mustChangePassword: false,
      };

      await userService.update(currentUser.userId, updatedData);

      await logService.add({
        userId: currentUser.userId,
        userName: currentUser.fullName,
        role: currentUser.role,
        action: 'EDIT',
        recordId: currentUser.userId,
        details: 'เปลี่ยนรหัสผ่านผู้ใช้งานสำเร็จ',
      });

      const updatedUser: User = {
        ...currentUser,
        mustChangePassword: false,
      };

      onSuccess(updatedUser);
    } catch (err: any) {
      console.error('Password change error:', err);
      setErrorMsg(err.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative text-white">
        {!isMandatory && onClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-white">
              {isMandatory ? 'กำหนดรหัสผ่านใหม่ (จำเป็น)' : 'เปลี่ยนรหัสผ่าน'}
            </h3>
            <p className="text-xs text-slate-400">
              {isMandatory
                ? 'เนื่องจากเป็นการเข้าสู่ระบบครั้งแรก กรุณากำหนดรหัสผ่านใหม่เพื่อความปลอดภัย'
                : `สำหรับบัญชี: ${currentUser.fullName}`}
            </p>
          </div>
        </div>

        {isMandatory && (
          <div className="mb-4 bg-amber-950/40 border border-amber-800/60 rounded-2xl p-3.5 flex items-start space-x-2 text-xs text-amber-200">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              เพื่อความปลอดภัยของข้อมูลคณะ ระบบกำหนดให้ผู้ใช้งานเปลี่ยนรหัสผ่านเริ่มต้นก่อนเข้าสู่ระบบบริหารจัดการ
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {!isMandatory && (
            <div>
              <label className="block text-slate-300 font-bold mb-1">รหัสผ่านปัจจุบัน</label>
              <div className="relative">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="รหัสผ่านปัจจุบัน"
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-3 focus:border-amber-500 focus:outline-none"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-3.5" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-bold mb-1">รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร) *</label>
            <div className="relative">
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="ระบุรหัสผ่านใหม่"
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-3 focus:border-amber-500 focus:outline-none font-mono"
              />
              <KeyRound className="w-4 h-4 text-slate-500 absolute right-3 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">ยืนยันรหัสผ่านใหม่อีกครั้ง *</label>
            <div className="relative">
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="พิมพ์รหัสผ่านใหม่อีกครั้งเพื่อยืนยัน"
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-3 focus:border-amber-500 focus:outline-none font-mono"
              />
              <KeyRound className="w-4 h-4 text-slate-500 absolute right-3 top-3.5" />
            </div>
          </div>

          {errorMsg && (
            <div className="bg-rose-950/60 border border-rose-800 text-rose-200 p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end space-x-3">
            {!isMandatory && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition cursor-pointer"
              >
                ยกเลิก
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'กำลังบันทึกรหัสผ่าน...' : 'บันทึกรหัสผ่านใหม่'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

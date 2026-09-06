import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Mail,
  Send,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Users,
  FileText,
  CalendarCheck2,
} from 'lucide-react';
import { GoogleUserInfo, signInWithGoogle } from '../lib/googleAuth';
import {
  CalendarEvent,
  createCalendarEvent,
  listUpcomingCalendarEvents,
} from '../lib/googleCalendar';
import { sendGmailMessage } from '../lib/googleGmail';
import { Indicator, User } from '../types';

interface GoogleWorkspaceToolsProps {
  googleUser: GoogleUserInfo | null;
  currentUser: User;
  indicators: Indicator[];
  onLoginSuccess: (user: GoogleUserInfo) => void;
}

export const GoogleWorkspaceTools: React.FC<GoogleWorkspaceToolsProps> = ({
  googleUser,
  currentUser,
  indicators,
  onLoginSuccess,
}) => {
  // Active Tab: Calendar or Gmail
  const [activeSubTab, setActiveSubTab] = useState<'calendar' | 'gmail'>('calendar');

  // Calendar State
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  // New Event Form
  const [eventSummary, setEventSummary] = useState('ประชุมติดตาม KPI ประจำเดือน คณะมนุษยศาสตร์ฯ');
  const [eventDescription, setEventDescription] = useState(
    'ประชุมติดตามความก้าวหน้าการดำเนินงานตามแผนยุทธศาสตร์ (KPI / KVI) คณะมนุษยศาสตร์และสังคมศาสตร์'
  );
  const [eventStartDate, setEventStartDate] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );
  const [eventStartTime, setEventStartTime] = useState('09:00');
  const [eventEndTime, setEventEndTime] = useState('11:00');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [calendarSuccessMsg, setCalendarSuccessMsg] = useState<string | null>(null);

  // Gmail State
  const [recipientEmail, setRecipientEmail] = useState(googleUser?.email || '');
  const [emailSubject, setEmailSubject] = useState(
    '[HUSO System] แจ้งเตือนการบันทึกผลการดำเนินงานตัวชี้วัด (KPI)'
  );
  const [emailBody, setEmailBody] = useState(
    `เรียน ทีมงาน/ผู้รับผิดชอบตัวชี้วัด,\n\nขอเรียนแจ้งเตือนการบันทึกผลการดำเนินงานและหลักฐานประกอบประจำเดือน คณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏยะลา ในระบบ HUSO Performance Management System\n\nโปรดดำเนินการบันทึกข้อมูลก่อนวันสิ้นเดือน\n\nด้วยความเคารพ,\n${currentUser.fullName} (${currentUser.role})`
  );
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Fetch upcoming calendar events when logged in
  const fetchCalendarEvents = async () => {
    if (!googleUser?.accessToken) return;
    setIsLoadingEvents(true);
    setCalendarError(null);
    try {
      const fetchedEvents = await listUpcomingCalendarEvents(googleUser.accessToken);
      setEvents(fetchedEvents);
    } catch (err: any) {
      console.error('Calendar Fetch Error:', err);
      setCalendarError(err.message || 'ไม่สามารถดึงข้อมูล Google Calendar ได้');
    } finally {
      setIsLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (googleUser?.accessToken) {
      fetchCalendarEvents();
      if (!recipientEmail) {
        setRecipientEmail(googleUser.email || '');
      }
    }
  }, [googleUser]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleUser?.accessToken) {
      alert('กรุณาเข้าสู่ระบบ Google ก่อนดำเนินการ');
      return;
    }

    setIsCreatingEvent(true);
    setCalendarError(null);
    setCalendarSuccessMsg(null);

    try {
      const startDateTime = new Date(`${eventStartDate}T${eventStartTime}:00`).toISOString();
      const endDateTime = new Date(`${eventStartDate}T${eventEndTime}:00`).toISOString();

      const created = await createCalendarEvent(googleUser.accessToken, {
        summary: eventSummary,
        description: eventDescription,
        location: 'คณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏยะลา',
        start: { dateTime: startDateTime },
        end: { dateTime: endDateTime },
      });

      setCalendarSuccessMsg(`สร้างกิจกรรม "${created.summary}" ลงใน Google Calendar สำเร็จแล้ว!`);
      fetchCalendarEvents();
    } catch (err: any) {
      console.error('Create Event Error:', err);
      setCalendarError(err.message || 'ไม่สามารถสร้างกิจกรรมใน Google Calendar ได้');
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleUser?.accessToken) {
      alert('กรุณาเข้าสู่ระบบ Google ก่อนดำเนินการ');
      return;
    }

    if (!recipientEmail) {
      setEmailError('กรุณาระบุอีเมลผู้รับ');
      return;
    }

    setIsSendingEmail(true);
    setEmailError(null);
    setEmailSuccessMsg(null);

    try {
      await sendGmailMessage(googleUser.accessToken, {
        to: recipientEmail,
        subject: emailSubject,
        bodyText: emailBody,
      });

      setEmailSuccessMsg(`ส่งอีเมลไปยัง ${recipientEmail} สำเร็จเรียบร้อยแล้ว!`);
    } catch (err: any) {
      console.error('Send Gmail Error:', err);
      setEmailError(err.message || 'ไม่สามารถส่งอีเมลผ่าน Gmail API ได้');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Quick preset templates for Calendar
  const applyCalendarPreset = (type: 'kpi_review' | 'submission_deadline' | 'committee') => {
    if (type === 'kpi_review') {
      setEventSummary('การประชุมติดตามผล KPI/KVI รายเดือน');
      setEventDescription('ประชุมสรุปผลการดำเนินงานประจำเดือน ร่วมกับผู้รับผิดชอบตัวชี้วัดทุกฝ่าย');
    } else if (type === 'submission_deadline') {
      setEventSummary('กำหนดส่งรายงานผลการดำเนินงานและหลักฐาน');
      setEventDescription('วันสุดท้ายของการบันทึกข้อมูล Actual และแนบลิงก์ Google Drive ในระบบ HUSO');
    } else {
      setEventSummary('การประชุมคณะกรรมการบริหารคณะมนุษยศาสตร์ฯ');
      setEventDescription('นำเสนอรายงานสรุปภาพรวมความก้าวหน้าแผนยุทธศาสตร์ต่อที่ประชุมคณะกรรมการบริหาร');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <CalendarCheck2 className="w-6 h-6" />
            </span>
            <h2 className="text-xl font-black tracking-tight text-amber-400">
              Google Workspace Tools (Calendar & Gmail)
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1.5 font-medium max-w-2xl leading-relaxed">
            เชื่อมต่อกำหนดการบน Google Calendar และส่งการแจ้งเตือนติดตามงานผ่าน Gmail โดยตรงจากระบบ HUSO Performance Management
          </p>
        </div>

        {/* Google User Sign-In Box */}
        {!googleUser ? (
          <button
            onClick={async () => {
              try {
                const u = await signInWithGoogle();
                if (u) onLoginSuccess(u);
              } catch (e: any) {
                console.warn('Google Workspace login notice:', e.message);
              }
            }}
            className="flex items-center space-x-2 bg-white hover:bg-slate-100 text-slate-900 font-bold px-4 py-2.5 rounded-xl shadow-lg transition active:scale-95 text-xs shrink-0 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span>เชื่อมต่อกับบัญชี Google</span>
          </button>
        ) : (
          <div className="bg-emerald-950/80 border border-emerald-500/40 px-3.5 py-2 rounded-xl text-xs flex items-center space-x-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-emerald-300">เชื่อมต่อ Google แล้ว</div>
              <div className="text-[10px] text-emerald-200/80 font-mono">{googleUser.email}</div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          onClick={() => setActiveSubTab('calendar')}
          className={`flex items-center space-x-2 pb-3 text-xs sm:text-sm font-bold transition border-b-2 cursor-pointer ${
            activeSubTab === 'calendar'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Google Calendar Manager</span>
        </button>

        <button
          onClick={() => setActiveSubTab('gmail')}
          className={`flex items-center space-x-2 pb-3 text-xs sm:text-sm font-bold transition border-b-2 cursor-pointer ${
            activeSubTab === 'gmail'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Gmail Notification Center</span>
        </button>
      </div>

      {/* SUBTAB 1: Google Calendar */}
      {activeSubTab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form to create event */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2 text-slate-800">
                <PlusCircle className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-sm">ลงนัดหมายกำหนดการใหม่ (Google Calendar)</h3>
              </div>
            </div>

            {/* Presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                เลือกรูปแบบกำหนดการสำเร็จรูป (Presets):
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyCalendarPreset('kpi_review')}
                  className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                >
                  📅 ประชุมติดตาม KPI รายเดือน
                </button>
                <button
                  type="button"
                  onClick={() => applyCalendarPreset('submission_deadline')}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-semibold px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                >
                  ⏰ กำหนดส่งผลการดำเนินงาน
                </button>
                <button
                  type="button"
                  onClick={() => applyCalendarPreset('committee')}
                  className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                >
                  🏛️ ประชุมกรรมการบริหารคณะฯ
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หัวข้อนัดหมาย / กิจกรรม *
                </label>
                <input
                  type="text"
                  required
                  value={eventSummary}
                  onChange={(e) => setEventSummary(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-medium rounded-xl p-2.5 text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รายละเอียดเพิ่มเติม
                </label>
                <textarea
                  rows={3}
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-2.5 text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">วันที่ *</label>
                  <input
                    type="date"
                    required
                    value={eventStartDate}
                    onChange={(e) => setEventStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-medium rounded-xl p-2.5 text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">เวลาเริ่ม *</label>
                  <input
                    type="time"
                    required
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-medium rounded-xl p-2.5 text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">เวลาสิ้นสุด *</label>
                  <input
                    type="time"
                    required
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-medium rounded-xl p-2.5 text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {calendarSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{calendarSuccessMsg}</span>
                </div>
              )}

              {calendarError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{calendarError}</span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isCreatingEvent || !googleUser}
                  className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  <CalendarIcon className="w-4 h-4" />
                  <span>{isCreatingEvent ? 'กำลังเพิ่มนัดหมาย...' : 'เพิ่มนัดหมายลง Google Calendar'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* List Upcoming Events */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2 text-slate-800">
                <Clock className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-sm">กำหนดการใกล้นี้ใน Google Calendar</h3>
              </div>
              <button
                onClick={fetchCalendarEvents}
                disabled={isLoadingEvents || !googleUser}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                title="รีเฟรชกำหนดการ"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingEvents ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {!googleUser ? (
              <div className="text-center py-8 text-xs text-slate-500 space-y-2">
                <p>กรุณาเข้าสู่ระบบ Google เพื่อดูนัดหมายใกล้นี้</p>
              </div>
            ) : isLoadingEvents ? (
              <div className="text-center py-8 text-xs text-slate-500 animate-pulse">
                กำลังดึงข้อมูลนัดหมายจาก Google Calendar...
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                ไม่พบนัดหมายใกล้นี้ใน Google Calendar ของคุณ
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {events.map((ev, idx) => (
                  <div
                    key={ev.id || idx}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1 hover:border-amber-300 transition"
                  >
                    <div className="font-bold text-xs text-slate-900 leading-snug">{ev.summary}</div>
                    <div className="text-[11px] font-semibold text-amber-800">
                      {ev.start?.dateTime
                        ? new Date(ev.start.dateTime).toLocaleString('th-TH', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : 'ตลอดวัน'}
                    </div>
                    {ev.description && (
                      <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                        {ev.description}
                      </p>
                    )}
                    {ev.htmlLink && (
                      <a
                        href={ev.htmlLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-amber-700 hover:underline font-bold mt-1"
                      >
                        <span>เปิดใน Google Calendar</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: Gmail Notification Center */}
      {activeSubTab === 'gmail' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5 max-w-3xl">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-200 text-slate-800">
            <Mail className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-sm">ส่งอีเมลแจ้งเตือนผ่าน Gmail (Gmail Notification)</h3>
          </div>

          <form onSubmit={handleSendEmail} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                อีเมลผู้รับ (Recipient Email) *
              </label>
              <input
                type="email"
                required
                placeholder="ระบุอีเมลผู้รับ..."
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-medium rounded-xl p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                หัวเรื่องอีเมล (Subject) *
              </label>
              <input
                type="text"
                required
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-medium rounded-xl p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ข้อความในอีเมล (Body Text) *
              </label>
              <textarea
                rows={6}
                required
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none font-sans"
              />
            </div>

            {emailSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{emailSuccessMsg}</span>
              </div>
            )}

            {emailError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{emailError}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSendingEmail || !googleUser}
                className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4 text-amber-400" />
                <span>{isSendingEmail ? 'กำลังส่งอีเมล...' : 'ส่งอีเมลผ่าน Gmail API'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

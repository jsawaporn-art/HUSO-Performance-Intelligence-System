import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ListChecks,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle2,
  Layers,
  Building2,
  HelpCircle,
  UserCheck,
  Users,
  ChevronDown,
  X,
  Bell,
  Mail,
  MailWarning,
  Send,
  Database,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import {
  Indicator,
  IndicatorType,
  IndicatorDirection,
  StrategicIssue,
  Department,
  User,
  Personnel,
  DataSupporterItem,
} from '../types';
import { notificationService, logService } from '../lib/firebase';

interface IndicatorMasterProps {
  indicators: Indicator[];
  strategies: StrategicIssue[];
  departments: Department[];
  personnel?: Personnel[];
  currentUser: User;
  onCreateIndicator: (indicator: Partial<Indicator>) => void;
  onUpdateIndicator: (id: string, indicator: Partial<Indicator>) => void;
  onDeleteIndicator: (id: string) => void;
}

export const IndicatorMaster: React.FC<IndicatorMasterProps> = ({
  indicators,
  strategies,
  departments,
  personnel = [],
  currentUser,
  onCreateIndicator,
  onUpdateIndicator,
  onDeleteIndicator,
}) => {
  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStrategy, setFilterStrategy] = useState<string>('ALL');
  const [filterDept, setFilterDept] = useState<string>('ALL');
  const [filterPrimaryOwner, setFilterPrimaryOwner] = useState<string>('ALL');
  const [filterDataSupporter, setFilterDataSupporter] = useState<string>('ALL');
  const [filterSource, setFilterSource] = useState<string>('ALL');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Notification Test Modal
  const [notificationModalInd, setNotificationModalInd] = useState<Indicator | null>(null);
  const [notificationSending, setNotificationSending] = useState(false);
  const [notificationSuccessMsg, setNotificationSuccessMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Indicator>>({
    type: 'KPI',
    name: '',
    description: '',
    operationalDef: '',
    vision: 'มุ่งสู่ความเป็นเลิศทางวิชาการและการพัฒนาสังคมอย่างยั่งยืน',
    strategyId: 'STRAT-2569-1',
    strategyName: 'ยุทธศาสตร์ที่ 1: การพัฒนาหลักสูตรและการเรียนรู้สู่สากล',
    mission: '1. การผลิตบัณฑิต',
    objective: 'ยกระดับคุณภาพการจัดการเรียนการสอน',
    unit: 'ร้อยละ',
    direction: 'MORE_IS_BETTER',
    formula: '(ผลรวมจริง / เป้าหมาย) * 100',
    source: '',
    dataSourceIds: [],
    frequency: 'QUARTERLY',
    baseline: 75,
    ownerMain: '',
    primaryOwnerId: '',
    primaryOwnerName: '',
    primaryOwnerPosition: '',
    dataSupporterIds: [],
    dataSupporters: [],
    ownerCo: '',
    departmentId: 'DEP-001',
    departmentName: 'งานวิชาการ',
    weight: 10,
    priority: 'MEDIUM',
    remarks: '',
  });

  // Dropdown UI controls inside modal
  const [ownerDropdownOpen, setOwnerDropdownOpen] = useState(false);
  const [ownerSearchQuery, setOwnerSearchQuery] = useState('');
  const [supporterDropdownOpen, setSupporterDropdownOpen] = useState(false);
  const [supporterSearchQuery, setSupporterSearchQuery] = useState('');

  const ownerDropdownRef = useRef<HTMLDivElement>(null);
  const supporterDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ownerDropdownRef.current && !ownerDropdownRef.current.contains(event.target as Node)) {
        setOwnerDropdownOpen(false);
      }
      if (supporterDropdownRef.current && !supporterDropdownRef.current.contains(event.target as Node)) {
        setSupporterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Active Non-Deleted Indicators
  const activeIndicators = useMemo(() => {
    return indicators.filter((i) => i.status !== 'DELETED');
  }, [indicators]);

  // Total Weight Calculation & Warning
  const totalWeight = useMemo(() => {
    return activeIndicators.reduce((acc, curr) => acc + (curr.weight || 0), 0);
  }, [activeIndicators]);

  // Unique list of sources for filter dropdown
  const uniqueSources = useMemo(() => {
    const set = new Set<string>();
    activeIndicators.forEach((i) => {
      if (i.source && i.source.trim()) set.add(i.source.trim());
    });
    return Array.from(set);
  }, [activeIndicators]);

  // Filtered List
  const filteredList = useMemo(() => {
    return activeIndicators.filter((i) => {
      if (filterType !== 'ALL' && i.type !== filterType) return false;
      if (filterStrategy !== 'ALL' && i.strategyId !== filterStrategy) return false;
      if (filterDept !== 'ALL' && i.departmentId !== filterDept) return false;
      if (filterPrimaryOwner !== 'ALL') {
        const matchesId = i.primaryOwnerId === filterPrimaryOwner;
        const matchesName = i.primaryOwnerName === filterPrimaryOwner || i.ownerMain === filterPrimaryOwner;
        if (!matchesId && !matchesName) return false;
      }
      if (filterDataSupporter !== 'ALL') {
        const hasSupporterId = (i.dataSupporterIds || []).includes(filterDataSupporter);
        const hasSupporterName = (i.dataSupporters || []).some(
          (s) => s.personnelId === filterDataSupporter || s.fullName === filterDataSupporter
        );
        if (!hasSupporterId && !hasSupporterName) return false;
      }
      if (filterSource !== 'ALL' && i.source !== filterSource) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const supportersText = (i.dataSupporters || []).map((s) => s.fullName).join(' ').toLowerCase();
        return (
          i.name.toLowerCase().includes(q) ||
          i.code.toLowerCase().includes(q) ||
          (i.primaryOwnerName || '').toLowerCase().includes(q) ||
          (i.ownerMain || '').toLowerCase().includes(q) ||
          (i.source || '').toLowerCase().includes(q) ||
          supportersText.includes(q)
        );
      }
      return true;
    });
  }, [
    activeIndicators,
    filterType,
    filterStrategy,
    filterDept,
    filterPrimaryOwner,
    filterDataSupporter,
    filterSource,
    searchQuery,
  ]);

  // Filtered Personnel for Dropdowns
  const filteredPersonnelForOwner = useMemo(() => {
    if (!ownerSearchQuery) return personnel;
    const q = ownerSearchQuery.toLowerCase();
    return personnel.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.personnelId.toLowerCase().includes(q) ||
        (p.administrativePosition || '').toLowerCase().includes(q) ||
        (p.position || '').toLowerCase().includes(q) ||
        (p.personnelGroup || '').toLowerCase().includes(q)
    );
  }, [personnel, ownerSearchQuery]);

  const filteredPersonnelForSupporter = useMemo(() => {
    if (!supporterSearchQuery) return personnel;
    const q = supporterSearchQuery.toLowerCase();
    return personnel.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.personnelId.toLowerCase().includes(q) ||
        (p.administrativePosition || '').toLowerCase().includes(q) ||
        (p.position || '').toLowerCase().includes(q) ||
        (p.personnelGroup || '').toLowerCase().includes(q)
    );
  }, [personnel, supporterSearchQuery]);

  // Warning check: Is Primary Owner selected as Data Supporter?
  const isPrimaryOwnerAlsoSupporter = useMemo(() => {
    if (!formData.primaryOwnerId) return false;
    return (formData.dataSupporterIds || []).includes(formData.primaryOwnerId);
  }, [formData.primaryOwnerId, formData.dataSupporterIds]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      type: 'KPI',
      name: '',
      description: '',
      operationalDef: '',
      vision: 'มุ่งสู่ความเป็นเลิศทางวิชาการและการพัฒนาสังคมอย่างยั่งยืน',
      strategyId: strategies[0]?.id || 'STRAT-2569-1',
      strategyName: strategies[0]?.name || 'ยุทธศาสตร์ที่ 1: การพัฒนาหลักสูตรและการเรียนรู้สู่สากล',
      mission: '1. การผลิตบัณฑิต',
      objective: 'ยกระดับคุณภาพการจัดการเรียนการสอน',
      unit: 'ร้อยละ',
      direction: 'MORE_IS_BETTER',
      formula: '(ผลรวมจริง / เป้าหมาย) * 100',
      source: 'สำนักงานคณบดี / งานวิชาการ',
      dataSourceIds: [],
      frequency: 'MONTHLY',
      baseline: 75,
      ownerMain: '',
      primaryOwnerId: '',
      primaryOwnerName: '',
      primaryOwnerPosition: '',
      dataSupporterIds: [],
      dataSupporters: [],
      ownerCo: '',
      departmentId: departments[0]?.id || 'DEPT-09',
      departmentName: departments[0]?.name || 'งานวิชาการ',
      weight: 10,
      priority: 'MEDIUM',
      remarks: '',
    });
    setOwnerSearchQuery('');
    setSupporterSearchQuery('');
    setShowModal(true);
  };

  const handleOpenEdit = (ind: Indicator) => {
    setEditingId(ind.indicatorId);
    
    // Resolve primary owner from ID if present or match by name
    let pOwnerId = ind.primaryOwnerId || '';
    let pOwnerName = ind.primaryOwnerName || ind.ownerMain || '';
    let pOwnerPos = ind.primaryOwnerPosition || '';

    if (!pOwnerId && pOwnerName) {
      const match = personnel.find((p) => p.fullName === pOwnerName);
      if (match) {
        pOwnerId = match.personnelId;
        pOwnerPos = match.administrativePosition || match.position;
      }
    }

    setFormData({
      ...ind,
      primaryOwnerId: pOwnerId,
      primaryOwnerName: pOwnerName,
      primaryOwnerPosition: pOwnerPos,
      dataSupporterIds: ind.dataSupporterIds || (ind.dataSupporters ? ind.dataSupporters.map((s) => s.personnelId) : []),
      dataSupporters: ind.dataSupporters || [],
      ownerMain: pOwnerName,
    });
    setOwnerSearchQuery('');
    setSupporterSearchQuery('');
    setShowModal(true);
  };

  // Handle Primary Owner Selection
  const handleSelectPrimaryOwner = (p: Personnel) => {
    setFormData({
      ...formData,
      primaryOwnerId: p.personnelId,
      primaryOwnerName: p.fullName,
      primaryOwnerPosition: p.administrativePosition || p.position || '',
      ownerMain: p.fullName,
    });
    setOwnerDropdownOpen(false);
    setOwnerSearchQuery('');
  };

  // Handle Data Supporter Toggle
  const handleToggleDataSupporter = (p: Personnel) => {
    const currentIds = formData.dataSupporterIds || [];
    const currentList = formData.dataSupporters || [];

    if (currentIds.includes(p.personnelId)) {
      // Remove
      const newIds = currentIds.filter((id) => id !== p.personnelId);
      const newList = currentList.filter((s) => s.personnelId !== p.personnelId);
      setFormData({
        ...formData,
        dataSupporterIds: newIds,
        dataSupporters: newList,
      });
    } else {
      // Add
      const newSupporterItem: DataSupporterItem = {
        personnelId: p.personnelId,
        fullName: p.fullName,
        role: 'ผู้สนับสนุนข้อมูล',
        email: p.email,
      };
      setFormData({
        ...formData,
        dataSupporterIds: [...currentIds, p.personnelId],
        dataSupporters: [...currentList, newSupporterItem],
      });
    }
  };

  // Remove Data Supporter Chip
  const handleRemoveSupporterChip = (personnelId: string) => {
    const newIds = (formData.dataSupporterIds || []).filter((id) => id !== personnelId);
    const newList = (formData.dataSupporters || []).filter((s) => s.personnelId !== personnelId);
    setFormData({
      ...formData,
      dataSupporterIds: newIds,
      dataSupporters: newList,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    // Prepare complete payload
    const payload: Partial<Indicator> = {
      ...formData,
      ownerMain: formData.primaryOwnerName || formData.ownerMain || 'ไม่ระบุ',
      primaryOwnerName: formData.primaryOwnerName || formData.ownerMain || 'ไม่ระบุ',
    };

    if (editingId) {
      onUpdateIndicator(editingId, payload);
    } else {
      onCreateIndicator(payload);
    }
    setShowModal(false);
  };

  // Notification Modal Trigger
  const handleOpenNotificationModal = (ind: Indicator) => {
    setNotificationModalInd(ind);
    setNotificationSuccessMsg(null);
  };

  const handleSendDueNotification = async () => {
    if (!notificationModalInd) return;
    setNotificationSending(true);
    setNotificationSuccessMsg(null);

    try {
      // Find Primary Owner and Supporters Personnel details
      const primaryPerson = personnel.find(
        (p) => p.personnelId === notificationModalInd.primaryOwnerId || p.fullName === notificationModalInd.primaryOwnerName
      );
      const supporters = (notificationModalInd.dataSupporters || []).map((sup) => {
        const found = personnel.find((p) => p.personnelId === sup.personnelId);
        return {
          ...sup,
          email: found?.email || sup.email || '',
        };
      });

      const recipients = [];
      if (primaryPerson) {
        recipients.push({
          role: 'ผู้รับผิดชอบหลัก',
          name: primaryPerson.fullName,
          email: primaryPerson.email,
          hasEmail: Boolean(primaryPerson.email && primaryPerson.email.trim()),
        });
      } else if (notificationModalInd.primaryOwnerName) {
        recipients.push({
          role: 'ผู้รับผิดชอบหลัก',
          name: notificationModalInd.primaryOwnerName,
          email: '',
          hasEmail: false,
        });
      }

      supporters.forEach((s) => {
        recipients.push({
          role: 'ผู้สนับสนุนข้อมูล',
          name: s.fullName,
          email: s.email,
          hasEmail: Boolean(s.email && s.email.trim()),
        });
      });

      // Send in-app notification to system collection
      await notificationService.send({
        title: `แจ้งเตือนกำหนดส่งรายงานตัวชี้วัด: [${notificationModalInd.code}]`,
        message: `แจ้งเตือนคุณ ${notificationModalInd.primaryOwnerName || notificationModalInd.ownerMain} (ผู้รับผิดชอบหลัก) และผู้สนับสนุนข้อมูล (${supporters.map((s) => s.fullName).join(', ') || '-'}) ถึงกำหนดบันทึกความก้าวหน้าตัวชี้วัด ${notificationModalInd.name}`,
        type: 'WARNING',
      });

      // Log in activityLogs
      await logService.add({
        userId: currentUser.userId,
        userName: currentUser.fullName,
        role: currentUser.role,
        action: 'EDIT',
        recordId: notificationModalInd.indicatorId,
        details: `ส่งการแจ้งเตือนกำหนดส่งรายงานตัวชี้วัด [${notificationModalInd.code}] ไปยังผู้รับผิดชอบหลักและผู้สนับสนุนข้อมูล`,
      });

      setNotificationSuccessMsg('ส่งการแจ้งเตือนและบันทึกประวัติการแจ้งเตือนลงฐานข้อมูลสำเร็จ');
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการส่งการแจ้งเตือน');
    } finally {
      setNotificationSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Action Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-300">
              <ListChecks className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Master Data: จัดการตัวชี้วัด (KPI & KVI Master)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            กำหนดและบริหารจัดการตัวชี้วัดผลการดำเนินงาน (KPI/KVI) พร้อมระบุ <span className="text-amber-800 font-bold">ผู้รับผิดชอบหลัก</span> และ <span className="text-blue-700 font-bold">ผู้สนับสนุนข้อมูล</span>
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={handleOpenCreate}
            id="btn-create-indicator"
            className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>สร้างตัวชี้วัดใหม่</span>
          </button>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <div className="flex items-center space-x-1.5">
            <Filter className="w-4 h-4 text-amber-600" />
            <span>ตัวกรองข้อมูลตัวชี้วัด (Search & Filters)</span>
          </div>
          {(filterType !== 'ALL' ||
            filterStrategy !== 'ALL' ||
            filterDept !== 'ALL' ||
            filterPrimaryOwner !== 'ALL' ||
            filterDataSupporter !== 'ALL' ||
            searchQuery) && (
            <button
              onClick={() => {
                setFilterType('ALL');
                setFilterStrategy('ALL');
                setFilterDept('ALL');
                setFilterPrimaryOwner('ALL');
                setFilterDataSupporter('ALL');
                setSearchQuery('');
              }}
              className="text-amber-700 hover:text-amber-900 text-xs font-semibold underline"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Text Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, รหัส, ผู้รับผิดชอบ, ผู้สนับสนุน..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg pl-9 pr-3 py-2 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2 focus:border-amber-500 focus:outline-none"
            >
              <option value="ALL">ประเภททั้งหมด (KPI/KVI)</option>
              <option value="KPI">KPI (Key Performance Indicator)</option>
              <option value="KVI">KVI (Key Vision Indicator)</option>
            </select>
          </div>

          {/* Strategy Filter */}
          <div>
            <select
              value={filterStrategy}
              onChange={(e) => setFilterStrategy(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2 focus:border-amber-500 focus:outline-none truncate"
            >
              <option value="ALL">ทุกยุทธศาสตร์ (1 - 6)</option>
              {strategies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2 focus:border-amber-500 focus:outline-none truncate"
            >
              <option value="ALL">ทุกหน่วยงานรับผิดชอบ</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary Row: Personnel Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-slate-100">
          {/* Primary Owner Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">กรองตามผู้รับผิดชอบหลัก</label>
            <select
              value={filterPrimaryOwner}
              onChange={(e) => setFilterPrimaryOwner(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2 focus:border-amber-500 focus:outline-none truncate"
            >
              <option value="ALL">ผู้รับผิดชอบหลักทั้งหมด</option>
              {personnel.map((p) => (
                <option key={p.personnelId} value={p.personnelId}>
                  {p.personnelId}: {p.fullName} ({p.administrativePosition || p.position})
                </option>
              ))}
            </select>
          </div>

          {/* Data Supporter Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">กรองตามผู้สนับสนุนข้อมูล</label>
            <select
              value={filterDataSupporter}
              onChange={(e) => setFilterDataSupporter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2 focus:border-amber-500 focus:outline-none truncate"
            >
              <option value="ALL">ผู้สนับสนุนข้อมูลทั้งหมด</option>
              {personnel.map((p) => (
                <option key={p.personnelId} value={p.personnelId}>
                  {p.personnelId}: {p.fullName} ({p.administrativePosition || p.position})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table of Indicators */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">รหัส / ประเภท</th>
                <th className="py-3.5 px-4">ชื่อตัวชี้วัด / ยุทธศาสตร์</th>
                <th className="py-3.5 px-4">ผู้รับผิดชอบหลัก & ผู้สนับสนุน</th>
                <th className="py-3.5 px-4">หน่วยงานรับผิดชอบ</th>
                <th className="py-3.5 px-4 text-center">รอบรายงาน & ค่าเป้าหมาย</th>
                <th className="py-3.5 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs font-medium">
                    ไม่พบข้อมูลตัวชี้วัดตามเงื่อนไขที่ค้นหา
                  </td>
                </tr>
              ) : (
                filteredList.map((ind) => {
                  const supporterList = ind.dataSupporters || [];
                  const primaryPerson = personnel.find(
                    (p) => p.personnelId === ind.primaryOwnerId || p.fullName === ind.primaryOwnerName
                  );

                  return (
                    <tr key={ind.indicatorId} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-bold text-amber-800 font-mono text-sm">{ind.code}</div>
                        <span
                          className={`inline-block px-2 py-0.5 mt-1 text-[9px] font-extrabold rounded ${
                            ind.type === 'KPI'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-purple-100 text-purple-800 border border-purple-300'
                          }`}
                        >
                          {ind.type}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs align-top">
                        <div className="font-bold text-slate-900 text-sm leading-snug">{ind.name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 font-medium">
                          {ind.strategyName} | พันธกิจ: {ind.mission}
                        </div>
                        {ind.operationalDef && (
                          <div className="text-[10px] text-slate-400 mt-1 line-clamp-1 italic">
                            นิยาม: {ind.operationalDef}
                          </div>
                        )}
                      </td>

                      {/* Primary Owner & Data Supporters Column */}
                      <td className="py-3.5 px-4 align-top min-w-[240px]">
                        {/* Primary Owner */}
                        <div className="flex items-center space-x-1.5">
                          <span className="p-1 rounded bg-amber-100 text-amber-800 border border-amber-300 flex-shrink-0">
                            <UserCheck className="w-3.5 h-3.5" />
                          </span>
                          <div>
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1">
                              {ind.primaryOwnerName || ind.ownerMain || 'ยังไม่ได้ระบุ'}
                              {ind.primaryOwnerId && (
                                <span className="text-[9px] font-mono font-normal text-slate-500 bg-slate-100 px-1 rounded">
                                  {ind.primaryOwnerId}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {ind.primaryOwnerPosition || primaryPerson?.administrativePosition || 'ผู้บริหาร/อาจารย์'}
                            </div>
                          </div>
                        </div>

                        {/* Data Supporters Chips */}
                        <div className="mt-2 pt-1.5 border-t border-slate-100">
                          <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1 mb-1">
                            <Users className="w-3 h-3 text-blue-600" />
                            <span>ผู้สนับสนุนข้อมูล ({supporterList.length}):</span>
                          </div>
                          {supporterList.length === 0 ? (
                            <span className="text-[10px] text-slate-400 italic">ไม่มีผู้สนับสนุนข้อมูล</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {supporterList.map((sup, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-medium"
                                  title={`${sup.personnelId}: ${sup.fullName}`}
                                >
                                  {sup.fullName}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-semibold text-slate-800 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{ind.departmentName}</span>
                        </div>
                      </td>

                      {/* Period & Target */}
                      <td className="py-3.5 px-4 text-center align-top">
                        <div className="font-bold text-slate-900">
                          เป้าหมาย: <span className="text-amber-800 font-extrabold">{ind.baseline}</span> {ind.unit || ''}
                        </div>
                        <div className="mt-1">
                          <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded text-[10px] font-bold">
                            {ind.frequency === 'QUARTERLY' || ind.frequency === 'ROUND_3M'
                              ? 'รายไตรมาส (Q1 - Q4)'
                              : ind.frequency === 'NINE_MONTH' || ind.frequency === 'ROUND_9M'
                              ? 'รอบ 9 เดือน (ต.ค.-มิ.ย.)'
                              : ind.frequency === 'ANNUAL' || ind.frequency === 'ROUND_1Y'
                              ? 'รอบ 1 ปี (สิ้นปีงบฯ)'
                              : 'รายไตรมาส'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center align-top">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => handleOpenNotificationModal(ind)}
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 transition"
                            title="ทดสอบแจ้งเตือนผู้รับผิดชอบและผู้สนับสนุน"
                          >
                            <Bell className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(ind)}
                            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition"
                            title="แก้ไขตัวชี้วัด"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteIndicator(ind.indicatorId)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
                            title="ลบตัวชี้วัด (Soft Delete)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Create / Edit Indicator Modal */}
      {/* ========================================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl text-slate-900 space-y-4 my-8 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-300">
                  <ListChecks className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {editingId ? 'แก้ไขข้อมูลตัวชี้วัด (Edit Indicator)' : 'สร้างตัวชี้วัดใหม่ (New Indicator)'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cross-Validation Warning Banner */}
            {isPrimaryOwnerAlsoSupporter && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-start gap-2 animate-pulse">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">คำเตือนการเลือกบุคลากร:</span> ผู้รับผิดชอบหลัก ({formData.primaryOwnerName}) ถูกเลือกเป็นผู้สนับสนุนข้อมูลด้วย กรุณาตรวจสอบว่าต้องการให้มีบทบาทซ้ำซ้อนหรือไม่
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Row 1: Type */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">ประเภทตัวชี้วัด (Indicator Type) *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as IndicatorType })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2.5 focus:border-amber-500 focus:outline-none font-semibold text-xs"
                >
                  <option value="KPI">KPI (Key Performance Indicator - ตัวชี้วัดผลการดำเนินงาน)</option>
                  <option value="KVI">KVI (Key Vision Indicator - ตัวชี้วัดวิสัยทัศน์)</option>
                </select>
              </div>

              {/* Row 2: Name */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">ชื่อตัวชี้วัด *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ร้อยละของหลักสูตรผ่านการรับรองมาตรฐานสากล AUN-QA / EdPEx"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2.5 focus:border-amber-500 focus:outline-none font-medium text-xs"
                />
              </div>

              {/* Row 3: Strategy & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ประเด็นยุทธศาสตร์ *</label>
                  <select
                    value={formData.strategyId}
                    onChange={(e) => {
                      const st = strategies.find((s) => s.id === e.target.value);
                      setFormData({
                        ...formData,
                        strategyId: e.target.value,
                        strategyName: st?.name || '',
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2.5 focus:border-amber-500 focus:outline-none text-xs"
                  >
                    {strategies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">หน่วยงานรับผิดชอบ *</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => {
                      const dp = departments.find((d) => d.id === e.target.value);
                      setFormData({
                        ...formData,
                        departmentId: e.target.value,
                        departmentName: dp?.name || '',
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2.5 focus:border-amber-500 focus:outline-none text-xs"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Unit, Frequency, Target */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">หน่วยนับ (Unit) *</label>
                  <input
                    type="text"
                    required
                    placeholder="ร้อยละ, คน, แห่ง..."
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-medium rounded-lg p-2 focus:border-amber-500 focus:outline-none text-xs"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {['ร้อยละ', 'คน', 'โครงการ', 'หลักสูตร', 'บาท', 'เรื่อง'].map((u) => (
                      <button
                        type="button"
                        key={u}
                        onClick={() => setFormData({ ...formData, unit: u })}
                        className={`text-[9px] px-1.5 py-0.5 rounded border transition ${
                          formData.unit === u
                            ? 'bg-amber-600 text-white border-amber-600 font-bold'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">รอบระยะเวลาติดตาม (Reporting Period) *</label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none text-xs font-medium"
                  >
                    <option value="QUARTERLY">รายไตรมาส (Q1, Q2, Q3, Q4)</option>
                    <option value="NINE_MONTH">รอบ 9 เดือน (ต.ค. - มิ.ย.)</option>
                    <option value="ANNUAL">รอบ 1 ปี (สิ้นปีงบประมาณ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">ค่าเป้าหมาย (Baseline / Target) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.baseline}
                    onChange={(e) => setFormData({ ...formData, baseline: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-lg p-2 focus:border-amber-500 focus:outline-none text-xs"
                  />
                </div>
              </div>

              {/* Row 5: Operational Definition */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">คำนิยามเชิงปฏิบัติการ (Operational Definition)</label>
                <textarea
                  rows={2}
                  placeholder="รายละเอียดคำนิยาม สูตรการคำนวณ หรือเกณฑ์การวัดผลสัมฤทธิ์..."
                  value={formData.operationalDef}
                  onChange={(e) => setFormData({ ...formData, operationalDef: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none text-xs"
                ></textarea>
              </div>

              {/* Primary Owner */}
              <div className="pt-1">
                <div className="relative" ref={ownerDropdownRef}>
                  <label className="block text-slate-800 font-bold mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-amber-900 font-extrabold">
                      <UserCheck className="w-4 h-4 text-amber-700" />
                      ผู้รับผิดชอบหลัก (Primary Owner) *
                    </span>
                    {formData.primaryOwnerId && (
                      <span className="text-[10px] font-mono text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-bold">
                        {formData.primaryOwnerId}
                      </span>
                    )}
                  </label>

                  {/* Dropdown Trigger Box */}
                  <div
                    onClick={() => setOwnerDropdownOpen(!ownerDropdownOpen)}
                    className={`w-full bg-slate-50 border rounded-lg p-2.5 cursor-pointer flex items-center justify-between transition ${
                      ownerDropdownOpen
                        ? 'border-amber-500 ring-2 ring-amber-100 bg-white'
                        : 'border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {formData.primaryOwnerName ? (
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{formData.primaryOwnerName}</div>
                        <div className="text-[10px] text-slate-500">
                          {formData.primaryOwnerPosition || 'ผู้บริหาร/อาจารย์'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400">-- เลือกผู้รับผิดชอบหลักจากบัญชีบุคลากร --</span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${ownerDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {/* Dropdown Menu */}
                  {ownerDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-2 space-y-1.5 max-h-64 overflow-y-auto">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          placeholder="ค้นหาชื่อ, ตำแหน่ง, รหัสบุคลากร..."
                          value={ownerSearchQuery}
                          onChange={(e) => setOwnerSearchQuery(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500"
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                      </div>

                      <div className="divide-y divide-slate-100 pt-1">
                        {filteredPersonnelForOwner.length === 0 ? (
                          <div className="py-3 text-center text-slate-400 text-xs">
                            ไม่พบรายชื่อบุคลากร
                          </div>
                        ) : (
                          filteredPersonnelForOwner.map((p) => {
                            const isSelected = formData.primaryOwnerId === p.personnelId;
                            return (
                              <div
                                key={p.personnelId}
                                onClick={() => handleSelectPrimaryOwner(p)}
                                className={`p-2 rounded-lg cursor-pointer flex items-center justify-between text-xs transition ${
                                  isSelected
                                    ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200'
                                    : 'hover:bg-slate-50 text-slate-800'
                                }`}
                              >
                                <div>
                                  <div className="font-bold flex items-center gap-1.5">
                                    <span>{p.fullName}</span>
                                    <span className="text-[9px] font-mono text-slate-500 bg-slate-100 px-1 py-0.5 rounded">
                                      {p.personnelId}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    {p.administrativePosition || p.position} | {p.personnelGroup}
                                  </div>
                                </div>
                                {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0" />}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Data Supporters */}
              <div className="pt-2 border-t border-slate-100">
                <div className="relative" ref={supporterDropdownRef}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-800 font-bold flex items-center gap-1 text-blue-900 font-extrabold">
                      <Users className="w-4 h-4 text-blue-700" />
                      ผู้สนับสนุนข้อมูล (Data Supporters - Multi-select)
                    </label>
                    <span className="text-[10px] text-slate-500 font-medium">
                      เลือกได้หลายคน ({(formData.dataSupporterIds || []).length} คนที่เลือก)
                    </span>
                  </div>

                  {/* Multi-Select Trigger Box / Selected Chips Display */}
                  <div
                    onClick={() => setSupporterDropdownOpen(!supporterDropdownOpen)}
                    className={`w-full bg-slate-50 border rounded-lg p-2 min-h-[44px] cursor-pointer flex flex-wrap items-center gap-1.5 transition ${
                      supporterDropdownOpen
                        ? 'border-blue-500 ring-2 ring-blue-100 bg-white'
                        : 'border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {(formData.dataSupporters || []).length === 0 ? (
                      <span className="text-slate-400 text-xs py-1 px-1">
                        -- คลิกเพื่อเลือกผู้สนับสนุนข้อมูลจากรายชื่อบุคลากร --
                      </span>
                    ) : (
                      (formData.dataSupporters || []).map((sup) => (
                        <span
                          key={sup.personnelId}
                          className="inline-flex items-center space-x-1 px-2 py-1 rounded-md bg-blue-100 text-blue-900 border border-blue-300 text-xs font-semibold"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>{sup.fullName}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSupporterChip(sup.personnelId)}
                            className="text-blue-600 hover:text-rose-700 ml-1 rounded p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                    <div className="ml-auto text-slate-400">
                      <ChevronDown className={`w-4 h-4 transition-transform ${supporterDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {/* Multi-Select Dropdown Menu */}
                  {supporterDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-2 space-y-1.5 max-h-64 overflow-y-auto">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          placeholder="ค้นหาชื่อผู้สนับสนุนข้อมูล..."
                          value={supporterSearchQuery}
                          onChange={(e) => setSupporterSearchQuery(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                      </div>

                      <div className="divide-y divide-slate-100 pt-1">
                        {filteredPersonnelForSupporter.length === 0 ? (
                          <div className="py-3 text-center text-slate-400 text-xs">
                            ไม่พบรายชื่อบุคลากร
                          </div>
                        ) : (
                          filteredPersonnelForSupporter.map((p) => {
                            const isSelected = (formData.dataSupporterIds || []).includes(p.personnelId);
                            return (
                              <div
                                key={p.personnelId}
                                onClick={() => handleToggleDataSupporter(p)}
                                className={`p-2 rounded-lg cursor-pointer flex items-center justify-between text-xs transition ${
                                  isSelected
                                    ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200'
                                    : 'hover:bg-slate-50 text-slate-800'
                                }`}
                              >
                                <div>
                                  <div className="font-bold flex items-center gap-1.5">
                                    <span>{p.fullName}</span>
                                    <span className="text-[9px] font-mono text-slate-500 bg-slate-100 px-1 py-0.5 rounded">
                                      {p.personnelId}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    {p.administrativePosition || p.position} | {p.personnelGroup}
                                  </div>
                                </div>
                                <div
                                  className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                                    isSelected
                                      ? 'bg-blue-600 border-blue-600 text-white'
                                      : 'border-slate-300 bg-white'
                                  }`}
                                >
                                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">หมายเหตุ / แผนงานเป้าหมายระยะยาว</label>
                <input
                  type="text"
                  placeholder="เช่น เป้าหมาย 4 ปี (2569=3, 2570=5, 2571=7, 2572=10)"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-4 flex items-center justify-end space-x-2.5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  id="btn-save-indicator"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition"
                >
                  {editingId ? 'บันทึกการแก้ไขตัวชี้วัด' : 'บันทึกตัวชี้วัดใหม่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Test Notification Modal */}
      {/* ========================================================================= */}
      {notificationModalInd && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-blue-100 text-blue-800 border border-blue-300">
                  <Bell className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  แจ้งเตือนกำหนดส่งรายงานตัวชี้วัด
                </h3>
              </div>
              <button
                onClick={() => setNotificationModalInd(null)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-amber-800 font-mono">{notificationModalInd.code}</div>
                <div className="font-semibold text-slate-900 mt-0.5">{notificationModalInd.name}</div>
              </div>

              <div>
                <div className="font-bold text-slate-700 mb-2">รายชื่อผู้ที่จะได้รับการแจ้งเตือน:</div>
                <div className="space-y-2">
                  {/* Primary Owner Status */}
                  {(() => {
                    const p = personnel.find(
                      (per) =>
                        per.personnelId === notificationModalInd.primaryOwnerId ||
                        per.fullName === notificationModalInd.primaryOwnerName
                    );
                    const hasEmail = Boolean(p?.email && p.email.trim());
                    return (
                      <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="text-[10px] bg-amber-200 text-amber-900 px-1 rounded font-bold">
                              ผู้รับผิดชอบหลัก
                            </span>
                            <span>{notificationModalInd.primaryOwnerName || notificationModalInd.ownerMain}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                            {hasEmail ? (
                              <span className="text-emerald-700 font-medium flex items-center gap-1">
                                <Mail className="w-3 h-3 text-emerald-600" />
                                {p?.email}
                              </span>
                            ) : (
                              <span className="text-rose-600 font-medium flex items-center gap-1">
                                <MailWarning className="w-3 h-3 text-rose-500" />
                                ยังไม่ได้กำหนดอีเมลสำหรับการแจ้งเตือน
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Supporters Status */}
                  {(notificationModalInd.dataSupporters || []).length === 0 ? (
                    <div className="text-slate-400 italic text-[11px] px-1">ไม่มีผู้สนับสนุนข้อมูล</div>
                  ) : (
                    (notificationModalInd.dataSupporters || []).map((sup, idx) => {
                      const p = personnel.find((per) => per.personnelId === sup.personnelId);
                      const hasEmail = Boolean(p?.email && p.email.trim());
                      return (
                        <div key={idx} className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span className="text-[10px] bg-blue-200 text-blue-900 px-1 rounded font-bold">
                                ผู้สนับสนุนข้อมูล
                              </span>
                              <span>{sup.fullName}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                              {hasEmail ? (
                                <span className="text-emerald-700 font-medium flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-emerald-600" />
                                  {p?.email}
                                </span>
                              ) : (
                                <span className="text-rose-600 font-medium flex items-center gap-1">
                                  <MailWarning className="w-3 h-3 text-rose-500" />
                                  ยังไม่ได้กำหนดอีเมลสำหรับการแจ้งเตือน
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {notificationSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{notificationSuccessMsg}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
              <button
                onClick={() => setNotificationModalInd(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                ปิด
              </button>
              <button
                onClick={handleSendDueNotification}
                disabled={notificationSending}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{notificationSending ? 'กำลังส่งแจ้งเตือน...' : 'ส่งแจ้งเตือนเดี๋ยวนี้'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

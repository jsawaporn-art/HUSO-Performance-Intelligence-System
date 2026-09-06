import React, { useState } from 'react';
import {
  Settings,
  Users,
  Save,
  ShieldAlert,
  Plus,
  Edit2,
  Trash2,
  UserPlus,
  X,
  Check,
  Search,
  Target,
  UserCheck,
  Building,
  Building2,
  Mail,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Database,
  Layers,
  CheckCheck,
  ShieldCheck,
} from 'lucide-react';
import {
  SystemConfig,
  User,
  UserRole,
  Department,
  StrategicIssue,
  Personnel,
  Indicator,
} from '../types';
import { StrategyManager } from './StrategyManager';
import { GoLivePreparationPanel } from './GoLivePreparationPanel';

interface SystemSettingsViewProps {
  systemConfig: SystemConfig;
  users: User[];
  currentUser?: User;
  departments?: Department[];
  strategies?: StrategicIssue[];
  personnel?: Personnel[];
  indicators?: Indicator[];
  selectedYear?: string;
  onSelectYear?: (year: string) => void;
  onUpdateConfig: (config: SystemConfig) => void;
  onAddUser?: (userData: Partial<User>) => void;
  onUpdateUser?: (userId: string, userData: Partial<User>) => void;
  onDeleteUser?: (userId: string) => void;
  onCreateStrategy?: (strategy: Partial<StrategicIssue>) => Promise<void> | void;
  onUpdateStrategy?: (id: string, strategy: Partial<StrategicIssue>) => Promise<void> | void;
  onDeleteStrategy?: (id: string) => Promise<void> | void;
  onCopyStrategies?: (fromYear: string, toYear: string) => Promise<void> | void;
  onCreatePersonnel?: (personnelData: Partial<Personnel>) => Promise<void> | void;
  onUpdatePersonnel?: (id: string, personnelData: Partial<Personnel>) => Promise<void> | void;
  onDeletePersonnel?: (id: string) => Promise<void> | void;
  onCreateDepartment?: (deptData: Partial<Department>) => Promise<void> | void;
  onUpdateDepartment?: (id: string, deptData: Partial<Department>) => Promise<void> | void;
  onDeleteDepartment?: (id: string) => Promise<void> | void;
  onMigrateDepartments?: () => Promise<{ migratedCount: number; pendingCount: number }>;
  onMapIndicatorDepartment?: (indicatorId: string, targetDeptId: string, targetDeptName: string) => Promise<void>;
  onBatchMapIndicators?: (indicatorIds: string[], targetDeptId: string, targetDeptName: string) => Promise<number>;
  onSystemResetSuccess?: () => void;
  onRollbackSuccess?: () => void;
}

export const SystemSettingsView: React.FC<SystemSettingsViewProps> = ({
  systemConfig,
  users,
  currentUser,
  departments = [],
  strategies = [],
  personnel = [],
  indicators = [],
  selectedYear = '2569',
  onSelectYear,
  onUpdateConfig,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onCreateStrategy,
  onUpdateStrategy,
  onDeleteStrategy,
  onCopyStrategies,
  onCreatePersonnel,
  onUpdatePersonnel,
  onDeletePersonnel,
  onCreateDepartment,
  onUpdateDepartment,
  onDeleteDepartment,
  onMigrateDepartments,
  onMapIndicatorDepartment,
  onBatchMapIndicators,
  onSystemResetSuccess,
  onRollbackSuccess,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'STRATEGIES' | 'PERSONNEL' | 'USERS' | 'DEPARTMENTS' | 'THRESHOLDS' | 'GOLIVE'
  >('STRATEGIES');
  const [configForm, setConfigForm] = useState<SystemConfig>({ ...systemConfig });
  const [searchQuery, setSearchQuery] = useState('');
  const [personnelSearchQuery, setPersonnelSearchQuery] = useState('');
  const [departmentSearchQuery, setDepartmentSearchQuery] = useState('');
  const [pendingSearchQuery, setPendingSearchQuery] = useState('');

  // Department Modal & State
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState<Partial<Department>>({
    departmentId: '',
    departmentName: '',
    departmentType: 'งานสำนักงานคณะ',
    description: '',
    displayOrder: 1,
    status: 'ACTIVE',
    responsiblePersonIds: [],
    responsiblePersonNames: [],
  });

  // Migration & Mapping State
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [selectedPendingIds, setSelectedPendingIds] = useState<string[]>([]);
  const [batchTargetDeptId, setBatchTargetDeptId] = useState<string>('DEP-001');
  const [quickMappingTargets, setQuickMappingTargets] = useState<Record<string, string>>({});
  const [mappingLoadingId, setMappingLoadingId] = useState<string | null>(null);

  // User Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formFullName, setFormFullName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDepartmentName, setFormDepartmentName] = useState('งานวิชาการ');
  const [formDepartmentId, setFormDepartmentId] = useState('DEPT-09');
  const [formPrimaryRole, setFormPrimaryRole] = useState<UserRole>('OWNER');
  const [selectedRoleBadges, setSelectedRoleBadges] = useState<UserRole[]>(['OWNER']);

  // Personnel Modal states
  const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);
  const [personnelForm, setPersonnelForm] = useState<Partial<Personnel>>({
    personnelId: '',
    fullName: '',
    administrativePosition: '',
    position: '',
    personnelGroup: 'ผู้บริหาร',
    email: '',
    status: 'ACTIVE',
  });

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig(configForm);
    alert('บันทึกการตั้งค่าเกณฑ์เรียบร้อยแล้ว');
  };

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormFullName('');
    setFormEmail('');
    setFormDepartmentName(departments[0]?.name || 'งานวิชาการ');
    setFormDepartmentId(departments[0]?.id || 'DEPT-09');
    setFormPrimaryRole('OWNER');
    setSelectedRoleBadges(['OWNER']);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (u: User) => {
    setEditingUser(u);
    setFormFullName(u.fullName);
    setFormEmail(u.email);
    setFormDepartmentName(u.departmentName);
    setFormDepartmentId(u.departmentId);
    setFormPrimaryRole(u.role);

    if (u.rolesDisplay) {
      const parts = u.rolesDisplay.split('/').map((s) => s.trim() as UserRole);
      const valid = parts.filter((p) => ['EXECUTIVE', 'ADMIN', 'REVIEWER', 'OWNER', 'VIEWER'].includes(p));
      setSelectedRoleBadges(valid.length > 0 ? valid : [u.role]);
    } else {
      setSelectedRoleBadges([u.role]);
    }
    setIsModalOpen(true);
  };

  const toggleRoleBadge = (r: UserRole) => {
    if (selectedRoleBadges.includes(r)) {
      if (selectedRoleBadges.length > 1) {
        setSelectedRoleBadges(selectedRoleBadges.filter((b) => b !== r));
      }
    } else {
      setSelectedRoleBadges([...selectedRoleBadges, r]);
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName || !formEmail) return;

    const payload: Partial<User> = {
      fullName: formFullName,
      email: formEmail,
      departmentId: formDepartmentId,
      departmentName: formDepartmentName,
      role: formPrimaryRole,
      rolesDisplay: selectedRoleBadges.join(' / '),
      avatarUrl:
        editingUser?.avatarUrl ||
        `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 1000)}?w=100&auto=format&fit=crop&q=80`,
    };

    if (editingUser && onUpdateUser) {
      onUpdateUser(editingUser.userId, payload);
    } else if (onAddUser) {
      onAddUser(payload);
    }
    setIsModalOpen(false);
  };

  // Personnel Handlers
  const handleOpenAddPersonnel = () => {
    setEditingPersonnel(null);
    const nextIdNum = personnel.length + 1;
    const autoId = `PER-${String(nextIdNum).padStart(4, '0')}`;
    setPersonnelForm({
      personnelId: autoId,
      fullName: '',
      administrativePosition: '',
      position: '',
      personnelGroup: 'ผู้บริหาร',
      email: '',
      status: 'ACTIVE',
    });
    setIsPersonnelModalOpen(true);
  };

  const handleOpenEditPersonnel = (p: Personnel) => {
    setEditingPersonnel(p);
    setPersonnelForm({ ...p });
    setIsPersonnelModalOpen(true);
  };

  const handleSavePersonnel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personnelForm.fullName || !personnelForm.personnelId) return;

    if (editingPersonnel && onUpdatePersonnel) {
      onUpdatePersonnel(editingPersonnel.id || editingPersonnel.personnelId, personnelForm);
    } else if (onCreatePersonnel) {
      onCreatePersonnel(personnelForm);
    }
    setIsPersonnelModalOpen(false);
  };

  const filteredPersonnel = personnel.filter((p) => {
    if (!personnelSearchQuery) return true;
    const q = personnelSearchQuery.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.personnelId.toLowerCase().includes(q) ||
      (p.administrativePosition || '').toLowerCase().includes(q) ||
      (p.personnelGroup || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q)
    );
  });

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.departmentName.toLowerCase().includes(q) ||
      (u.rolesDisplay && u.rolesDisplay.toLowerCase().includes(q))
    );
  });

  // Calculate Pending Indicators for Administrator Review Queue
  const pendingIndicators = indicators.filter(
    (ind) =>
      ind.mappingStatus === 'PENDING_MAPPING' ||
      !ind.responsibleDepartmentId ||
      ind.responsibleDepartmentId.startsWith('DEPT-') ||
      !ind.responsibleDepartmentId.startsWith('DEP-')
  );

  const mappedIndicatorsCount = indicators.length - pendingIndicators.length;

  const filteredPendingIndicators = pendingIndicators.filter((ind) => {
    if (!pendingSearchQuery) return true;
    const q = pendingSearchQuery.toLowerCase();
    return (
      ind.code.toLowerCase().includes(q) ||
      ind.name.toLowerCase().includes(q) ||
      (ind.originalDepartmentName || '').toLowerCase().includes(q) ||
      (ind.departmentName || '').toLowerCase().includes(q) ||
      (ind.ownerMain || '').toLowerCase().includes(q) ||
      (ind.strategyName || '').toLowerCase().includes(q)
    );
  });

  const filteredDepartments = departments.filter((d) => {
    if (!departmentSearchQuery) return true;
    const q = departmentSearchQuery.toLowerCase();
    return (
      (d.departmentName || d.name || '').toLowerCase().includes(q) ||
      (d.departmentId || d.id || '').toLowerCase().includes(q) ||
      (d.departmentType || d.type || '').toLowerCase().includes(q) ||
      (d.description || '').toLowerCase().includes(q)
    );
  });

  const handleRunMigration = async () => {
    if (!onMigrateDepartments) return;
    setIsMigrating(true);
    setMigrationResult(null);
    try {
      const res = await onMigrateDepartments();
      setMigrationResult({
        success: true,
        message: `ย้ายข้อมูลและปรับปรุง Master Data หน่วยงานสำเร็จ: ทำการจับคู่อัตโนมัติแล้ว ${res.migratedCount} รายการ, รอการตรวจสอบ/จับคู่ด้วยตนเอง (PENDING_MAPPING) ${res.pendingCount} รายการ`,
      });
    } catch (err: any) {
      setMigrationResult({
        success: false,
        message: `เกิดข้อผิดพลาดในการประมวลผลการย้ายข้อมูล: ${err.message || 'โปรดตรวจสอบการเชื่อมต่อ'}`,
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleQuickMapSingle = async (indicatorId: string) => {
    const targetDeptId = quickMappingTargets[indicatorId] || 'DEP-001';
    const found = departments.find((d) => (d.departmentId || d.id) === targetDeptId);
    const targetDeptName = found?.departmentName || found?.name || 'งานวิชาการ';

    if (!onMapIndicatorDepartment) return;
    setMappingLoadingId(indicatorId);
    try {
      await onMapIndicatorDepartment(indicatorId, targetDeptId, targetDeptName);
      setSelectedPendingIds((prev) => prev.filter((id) => id !== indicatorId));
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการจับคู่หน่วยงาน');
    } finally {
      setMappingLoadingId(null);
    }
  };

  const handleBatchMap = async () => {
    if (selectedPendingIds.length === 0 || !onBatchMapIndicators) return;
    const found = departments.find((d) => (d.departmentId || d.id) === batchTargetDeptId);
    const targetDeptName = found?.departmentName || found?.name || 'งานวิชาการ';

    setIsMigrating(true);
    try {
      const count = await onBatchMapIndicators(selectedPendingIds, batchTargetDeptId, targetDeptName);
      setSelectedPendingIds([]);
      setMigrationResult({
        success: true,
        message: `จับคู่หน่วยงานตัวชี้วัดสำเร็จ ${count} รายการ ไปยัง [${batchTargetDeptId}] ${targetDeptName} เรียบร้อยแล้ว`,
      });
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาด: ${err.message || 'ไม่สามารถบันทึกได้'}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleSelectAllPending = () => {
    if (selectedPendingIds.length === filteredPendingIndicators.length) {
      setSelectedPendingIds([]);
    } else {
      setSelectedPendingIds(filteredPendingIndicators.map((i) => i.indicatorId));
    }
  };

  const handleTogglePendingSelect = (id: string) => {
    setSelectedPendingIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleOpenAddDeptModal = () => {
    setEditingDept(null);
    const nextNum = departments.length + 1;
    setDeptForm({
      departmentId: `DEP-${String(nextNum).padStart(3, '0')}`,
      departmentName: '',
      departmentType: 'งานสำนักงานคณะ',
      description: '',
      displayOrder: nextNum,
      status: 'ACTIVE',
      responsiblePersonIds: [],
      responsiblePersonNames: [],
    });
    setIsDeptModalOpen(true);
  };

  const handleOpenEditDeptModal = (d: Department) => {
    setEditingDept(d);
    setDeptForm({
      departmentId: d.departmentId || d.id || '',
      departmentName: d.departmentName || d.name || '',
      departmentType: d.departmentType || d.type || 'งานสำนักงานคณะ',
      description: d.description || '',
      displayOrder: d.displayOrder || 1,
      status: d.status || 'ACTIVE',
      responsiblePersonIds: d.responsiblePersonIds || [],
      responsiblePersonNames: d.responsiblePersonNames || [],
    });
    setIsDeptModalOpen(true);
  };

  const handleSaveDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.departmentName || !deptForm.departmentId) return;

    if (editingDept && onUpdateDepartment) {
      onUpdateDepartment(editingDept.id || editingDept.departmentId, deptForm);
    } else if (onCreateDepartment) {
      onCreateDepartment(deptForm);
    }
    setIsDeptModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-300">
              <Settings className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              ตั้งค่าระบบ & ยุทธศาสตร์รายปี (System Config & Master Data)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            จัดการยุทธศาสตร์ประจำปีงบประมาณ, บัญชีบุคลากร, โครงสร้าง 8 หน่วยงานมาตรฐาน (DEP-001..DEP-008) และการย้ายข้อมูล
          </p>
        </div>

        <button
          onClick={handleSaveConfig}
          className="flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition"
        >
          <Save className="w-4 h-4" />
          <span>บันทึกการตั้งค่าระบบ</span>
        </button>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('STRATEGIES')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'STRATEGIES'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>1. ประเด็นยุทธศาสตร์ ({selectedYear})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('PERSONNEL')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'PERSONNEL'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>2. ทะเบียนบุคลากร (Personnel Master: PER-0001+)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('USERS')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'USERS'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>3. ผู้ใช้งานระบบและสิทธิ์ (RBAC Roles)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('DEPARTMENTS')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition relative ${
            activeSubTab === 'DEPARTMENTS'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>4. โครงสร้างหน่วยงาน & การย้ายข้อมูล</span>
          {pendingIndicators.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white animate-pulse">
              {pendingIndicators.length} รอตรวจ
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('THRESHOLDS')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'THRESHOLDS'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>5. เกณฑ์คะแนน & Traffic Light</span>
        </button>

        <button
          onClick={() => setActiveSubTab('GOLIVE')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'GOLIVE'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>6. เตรียมระบบเริ่มใช้งานจริง & ระบบสำรอง (Go-Live Engine)</span>
        </button>
      </div>

      {/* Sub-Tab 1: Strategy Manager */}
      {activeSubTab === 'STRATEGIES' && (
        <StrategyManager
          strategies={strategies}
          selectedYear={selectedYear}
          onSelectYear={onSelectYear}
          onCreateStrategy={onCreateStrategy || (() => {})}
          onUpdateStrategy={onUpdateStrategy || (() => {})}
          onDeleteStrategy={onDeleteStrategy || (() => {})}
          onCopyStrategies={onCopyStrategies || (() => {})}
        />
      )}

      {/* Sub-Tab 2: Personnel Master */}
      {activeSubTab === 'PERSONNEL' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-600" />
                ทะเบียนบุคลากรคณะ (Personnel Master)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                ฐานข้อมูลหลักสำหรับเลือกเป็น <span className="font-bold text-amber-800">ผู้รับผิดชอบหลัก</span> และ <span className="font-bold text-blue-700">ผู้สนับสนุนข้อมูล</span> ของตัวชี้วัด KPI/KVI
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="ค้นหารหัส, ชื่อ, ตำแหน่ง..."
                  value={personnelSearchQuery}
                  onChange={(e) => setPersonnelSearchQuery(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>

              <button
                onClick={handleOpenAddPersonnel}
                className="flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มบุคลากร</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-2.5 px-3">Personnel ID</th>
                  <th className="py-2.5 px-3">ชื่อ–นามสกุล</th>
                  <th className="py-2.5 px-3">ตำแหน่งบริหาร</th>
                  <th className="py-2.5 px-3">ตำแหน่งทางวิชาการ/สายงาน</th>
                  <th className="py-2.5 px-3">กลุ่มบุคลากร</th>
                  <th className="py-2.5 px-3">อีเมลแจ้งเตือน</th>
                  <th className="py-2.5 px-3 text-center">สถานะ</th>
                  <th className="py-2.5 px-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPersonnel.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      ไม่พบบุคลากรตามเงื่อนไขที่ค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredPersonnel.map((p) => (
                    <tr key={p.personnelId} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-800">{p.personnelId}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{p.fullName}</td>
                      <td className="py-2.5 px-3 text-slate-600">{p.administrativePosition || '-'}</td>
                      <td className="py-2.5 px-3 text-slate-500">{p.position || '-'}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.personnelGroup === 'ผู้บริหาร'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : p.personnelGroup === 'บุคลากรสายสนับสนุน'
                            ? 'bg-blue-100 text-blue-900 border border-blue-300'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}>
                          {p.personnelGroup}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {p.email ? (
                          <span className="text-slate-600 font-mono text-[11px]">{p.email}</span>
                        ) : (
                          <span className="text-rose-500 italic text-[10px]">ยังไม่ระบุอีเมล</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => handleOpenEditPersonnel(p)}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                            title="แก้ไข"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {onDeletePersonnel && (
                            <button
                              onClick={() => onDeletePersonnel(p.id || p.personnelId)}
                              className="p-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700"
                              title="ลบ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: RBAC Users & Roles */}
      {activeSubTab === 'USERS' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-600" />
                การกำหนดสิทธิ์ผู้ใช้งาน (RBAC Multi-Role Assignment)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                กำหนดสิทธิ์หลัก (Primary Role) และสิทธิ์ย่อยร่วมกัน เช่น คณบดี ถือสิทธิ์ EXECUTIVE / ADMIN / REVIEWER
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, อีเมล, หน่วยงาน..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>

              <button
                onClick={handleOpenAddModal}
                className="flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-sm transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>เพิ่มผู้ใช้งาน</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-2.5 px-3">ผู้ใช้งาน</th>
                  <th className="py-2.5 px-3">หน่วยงาน / ภาควิชา</th>
                  <th className="py-2.5 px-3">สิทธิ์หลัก (Primary Role)</th>
                  <th className="py-2.5 px-3">สิทธิ์ที่ถือครองรวม (Combined Roles)</th>
                  <th className="py-2.5 px-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredUsers.map((u) => (
                  <tr key={u.userId} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center space-x-2.5">
                        <img
                          src={u.avatarUrl}
                          alt={u.fullName}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <div className="font-bold text-slate-900">{u.fullName}</div>
                          <div className="text-[10px] text-slate-500">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{u.departmentName}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        {(u.rolesDisplay || u.role).split('/').map((r, rIdx) => (
                          <span
                            key={rIdx}
                            className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[9px] font-bold"
                          >
                            {r.trim()}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                          title="แก้ไขสิทธิ์"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteUser && (
                          <button
                            onClick={() => onDeleteUser(u.userId)}
                            className="p-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700"
                            title="ลบผู้ใช้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Departments & Data Migration */}
      {activeSubTab === 'DEPARTMENTS' && (
        <div className="space-y-6 text-xs">
          {/* Top Summary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center space-x-3.5">
              <div className="p-3 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  หน่วยงานมาตรฐานคณะ
                </div>
                <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                  {departments.length} หน่วยงาน
                </div>
                <div className="text-[10px] text-slate-500">DEP-001 ถึง DEP-008</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center space-x-3.5">
              <div className="p-3 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex-shrink-0">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  ตัวชี้วัดทั้งหมดในระบบ
                </div>
                <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                  {indicators.length} รายการ
                </div>
                <div className="text-[10px] text-slate-500">ปีงบประมาณ {selectedYear}</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center space-x-3.5">
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  จับคู่โครงสร้างสมบูรณ์ (MAPPED)
                </div>
                <div className="text-xl font-extrabold text-emerald-700 mt-0.5">
                  {mappedIndicatorsCount} รายการ
                </div>
                <div className="text-[10px] text-emerald-600 font-medium">
                  {indicators.length > 0
                    ? `${((mappedIndicatorsCount / indicators.length) * 100).toFixed(0)}% ของตัวชี้วัดทั้งหมด`
                    : '100%'}
                </div>
              </div>
            </div>

            <div
              className={`border rounded-2xl p-4 shadow-sm flex items-center space-x-3.5 ${
                pendingIndicators.length > 0
                  ? 'bg-rose-50/70 border-rose-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div
                className={`p-3 rounded-xl flex-shrink-0 ${
                  pendingIndicators.length > 0
                    ? 'bg-rose-100 text-rose-700 border border-rose-300'
                    : 'bg-slate-50 text-slate-500 border border-slate-200'
                }`}
              >
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  รอตรวจสอบ (PENDING_MAPPING)
                </div>
                <div
                  className={`text-xl font-extrabold mt-0.5 ${
                    pendingIndicators.length > 0 ? 'text-rose-700' : 'text-slate-700'
                  }`}
                >
                  {pendingIndicators.length} รายการ
                </div>
                <div
                  className={`text-[10px] ${
                    pendingIndicators.length > 0
                      ? 'text-rose-600 font-bold'
                      : 'text-slate-500'
                  }`}
                >
                  {pendingIndicators.length > 0
                    ? 'ต้องการการจับคู่โดยผู้ดูแลระบบ'
                    : 'ไม่มีรายการค้างตรวจ'}
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Migration Tool & Automation */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50/30 border border-amber-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Database className="w-5 h-5 text-amber-700" />
                  <h3 className="text-sm font-extrabold text-slate-900">
                    เครื่องมือย้ายและปรับปรุงโครงสร้างหน่วยงาน (Department Data Migration & Synchronization)
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                  ระบบจะสแกนตัวชี้วัดทั้งหมด และทำการจับคู่รหัส/ชื่อหน่วยงานเดิม (เช่น{' '}
                  <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px] text-amber-900">
                    DEPT-01 .. DEPT-15
                  </code>{' '}
                  หรือชื่อหน่วยงานเดิม) เข้ากับรหัสมาตรฐาน{' '}
                  <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px] text-amber-900">
                    DEP-001 ถึง DEP-008
                  </code>{' '}
                  โดยอัตโนมัติ หากมีรายการที่ไม่สามารถจับคู่อัตโนมัติได้ จะถูกตั้งค่าเป็น{' '}
                  <span className="font-bold text-rose-700">PENDING_MAPPING</span> เพื่อให้ผู้ดูแลระบบตรวจสอบในตารางด้านล่าง
                </p>
              </div>

              <div className="flex-shrink-0">
                <button
                  onClick={handleRunMigration}
                  disabled={isMigrating}
                  className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition"
                >
                  <RefreshCw className={`w-4 h-4 ${isMigrating ? 'animate-spin' : ''}`} />
                  <span>
                    {isMigrating
                      ? 'กำลังประมวลผลการย้ายข้อมูล...'
                      : 'เริ่มประมวลผลย้ายข้อมูลอัตโนมัติ'}
                  </span>
                </button>
              </div>
            </div>

            {migrationResult && (
              <div
                className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs font-medium ${
                  migrationResult.success
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-rose-50 text-rose-800 border-rose-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {migrationResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  )}
                  <span>{migrationResult.message}</span>
                </div>
                <button
                  onClick={() => setMigrationResult(null)}
                  className="text-slate-400 hover:text-slate-700 font-bold px-2 py-0.5"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Administrator Review Queue for PENDING_MAPPING */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="p-1 rounded bg-rose-100 text-rose-700 border border-rose-300">
                    <AlertTriangle className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    รายการที่รอผู้ดูแลระบบตรวจสอบและจับคู่หน่วยงาน (Administrator Review Queue)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  ตัวชี้วัดที่มีสถานะ <span className="font-mono font-bold text-rose-600">PENDING_MAPPING</span> หรือยังไม่ผูกกับ 8 หน่วยงานมาตรฐาน
                </p>
              </div>

              {pendingIndicators.length > 0 && (
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="ค้นหารายการที่รอตรวจ..."
                    value={pendingSearchQuery}
                    onChange={(e) => setPendingSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 pl-8 pr-3 py-1.5 rounded-lg text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {pendingIndicators.length === 0 ? (
              <div className="p-6 text-center bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                <CheckCheck className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="text-sm font-bold text-emerald-900">
                  ข้อมูลตัวชี้วัดทั้งหมดจับคู่เข้ากับโครงสร้าง 8 หน่วยงานมาตรฐานเรียบร้อยแล้ว
                </div>
                <p className="text-xs text-emerald-700 max-w-lg mx-auto">
                  ไม่มีรายการตัวชี้วัดค้างสถานะ PENDING_MAPPING ระบบมีความสมบูรณ์ 100% พร้อมสำหรับการรายงานและการประมวลผล
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Batch Action Bar */}
                <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={
                        filteredPendingIndicators.length > 0 &&
                        selectedPendingIds.length === filteredPendingIndicators.length
                      }
                      onChange={handleSelectAllPending}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="font-bold text-slate-800 text-xs">
                      เลือกทั้งหมด ({selectedPendingIds.length} / {filteredPendingIndicators.length} รายการ)
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold text-slate-600">
                      จับคู่รายการที่เลือกไปยัง:
                    </span>
                    <select
                      value={batchTargetDeptId}
                      onChange={(e) => setBatchTargetDeptId(e.target.value)}
                      className="bg-white border border-amber-300 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 font-semibold focus:outline-none focus:border-amber-500"
                    >
                      {departments.map((d) => (
                        <option key={d.id || d.departmentId} value={d.departmentId || d.id}>
                          [{d.departmentId || d.id}] {d.departmentName || d.name}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={handleBatchMap}
                      disabled={selectedPendingIds.length === 0 || isMigrating}
                      className="flex items-center space-x-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>บันทึกการจับคู่พร้อมกัน</span>
                    </button>
                  </div>
                </div>

                {/* Pending Indicators Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">เลือก</th>
                        <th className="py-2.5 px-3">รหัสตัวชี้วัด</th>
                        <th className="py-2.5 px-3">ชื่อตัวชี้วัด & ยุทธศาสตร์</th>
                        <th className="py-2.5 px-3">หน่วยงานเดิมที่บันทึกไว้</th>
                        <th className="py-2.5 px-3">ผู้รับผิดชอบหลัก</th>
                        <th className="py-2.5 px-3">เลือกหน่วยงานมาตรฐานเป้าหมาย</th>
                        <th className="py-2.5 px-3 text-center">การดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {filteredPendingIndicators.map((ind) => {
                        const isSelected = selectedPendingIds.includes(ind.indicatorId);
                        const selectedTarget =
                          quickMappingTargets[ind.indicatorId] || 'DEP-001';

                        return (
                          <tr
                            key={ind.indicatorId}
                            className={`hover:bg-amber-50/40 transition ${
                              isSelected ? 'bg-amber-50/60' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleTogglePendingSelect(ind.indicatorId)}
                                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                              />
                            </td>

                            <td className="py-2.5 px-3 font-mono font-bold text-amber-800">
                              {ind.code}
                            </td>

                            <td className="py-2.5 px-3 max-w-xs">
                              <div className="font-bold text-slate-900 line-clamp-2">
                                {ind.name}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {ind.strategyName || 'ยุทธศาสตร์'}
                              </div>
                            </td>

                            <td className="py-2.5 px-3">
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                {ind.originalDepartmentName || ind.departmentName || ind.responsibleDepartmentName || 'ไม่ระบุ'}
                              </span>
                              {ind.departmentId && (
                                <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                                  ID เดิม: {ind.departmentId}
                                </div>
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-slate-700 font-medium">
                              {ind.primaryOwnerName || ind.ownerMain || '-'}
                            </td>

                            <td className="py-2.5 px-3">
                              <select
                                value={selectedTarget}
                                onChange={(e) =>
                                  setQuickMappingTargets({
                                    ...quickMappingTargets,
                                    [ind.indicatorId]: e.target.value,
                                  })
                                }
                                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg p-1.5 focus:border-amber-500 focus:outline-none font-medium"
                              >
                                {departments.map((d) => (
                                  <option
                                    key={d.id || d.departmentId}
                                    value={d.departmentId || d.id}
                                  >
                                    [{d.departmentId || d.id}] {d.departmentName || d.name}
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => handleQuickMapSingle(ind.indicatorId)}
                                disabled={mappingLoadingId === ind.indicatorId}
                                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-[11px] shadow-sm transition"
                              >
                                {mappingLoadingId === ind.indicatorId ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                                <span>ยืนยันจับคู่</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Standard Faculty Departments Directory */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-600" />
                  ทะเบียน 8 หน่วยงานมาตรฐานคณะมนุษยศาสตร์และสังคมศาสตร์
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  โครงสร้างหน่วยงานหลักที่ใช้ในการกำกับติดตามตัวชี้วัดและมอบหมายงานผู้รับผิดชอบ
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="ค้นหาหน่วยงาน..."
                    value={departmentSearchQuery}
                    onChange={(e) => setDepartmentSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 pl-8 pr-3 py-1.5 rounded-lg text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleOpenAddDeptModal}
                  className="flex items-center space-x-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow transition flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มหน่วยงาน</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">ลำดับ & รหัส</th>
                    <th className="py-2.5 px-3">ชื่อหน่วยงาน</th>
                    <th className="py-2.5 px-3">ประเภทหน่วยงาน</th>
                    <th className="py-2.5 px-3">คำอธิบายขอบเขตงาน</th>
                    <th className="py-2.5 px-3 text-center">ตัวชี้วัดที่ผูกอยู่</th>
                    <th className="py-2.5 px-3 text-center">สถานะ</th>
                    <th className="py-2.5 px-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredDepartments.map((dept) => {
                    const deptId = dept.departmentId || dept.id || '';
                    const deptName = dept.departmentName || dept.name || '';
                    const countAssigned = indicators.filter(
                      (ind) =>
                        (ind.responsibleDepartmentId === deptId ||
                          ind.departmentId === deptId) &&
                        ind.mappingStatus !== 'PENDING_MAPPING'
                    ).length;

                    return (
                      <tr key={deptId} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-amber-800">
                            {deptId}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            ลำดับที่ {dept.displayOrder || 1}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 text-sm">
                            {deptName}
                          </div>
                          {dept.responsiblePersonNames &&
                            dept.responsiblePersonNames.length > 0 && (
                              <div className="text-[10px] text-slate-500 mt-1 flex flex-wrap gap-1">
                                {dept.responsiblePersonNames.map((pName, pIdx) => (
                                  <span
                                    key={pIdx}
                                    className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-medium"
                                  >
                                    {pName}
                                  </span>
                                ))}
                              </div>
                            )}
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              (dept.departmentType || dept.type) === 'กลุ่มผู้บริหาร'
                                ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                : 'bg-slate-100 text-slate-800 border border-slate-200'
                            }`}
                          >
                            {dept.departmentType || dept.type || 'งานสำนักงานคณะ'}
                          </span>
                        </td>

                        <td className="py-3 px-3 max-w-xs text-slate-600 text-xs">
                          {dept.description || '-'}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {countAssigned} ตัวชี้วัด
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              dept.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {dept.status || 'ACTIVE'}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => handleOpenEditDeptModal(dept)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                              title="แก้ไขข้อมูลหน่วยงาน"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {onDeleteDepartment && (
                              <button
                                onClick={() => onDeleteDepartment(deptId)}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition"
                                title="ลบหน่วยงาน"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 5: Thresholds & Traffic Light */}
      {activeSubTab === 'THRESHOLDS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-200">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              ตั้งค่าเกณฑ์ Traffic Light & Score Cap
            </h3>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    🟢 On Track (บรรลุเป้าหมาย &gt;= %)
                  </label>
                  <input
                    type="number"
                    value={configForm.thresholds.onTrack}
                    onChange={(e) =>
                      setConfigForm({
                        ...configForm,
                        thresholds: { ...configForm.thresholds, onTrack: Number(e.target.value) },
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    🟡 Watch (เฝ้าระวัง &gt;= %)
                  </label>
                  <input
                    type="number"
                    value={configForm.thresholds.watch}
                    onChange={(e) =>
                      setConfigForm({
                        ...configForm,
                        thresholds: { ...configForm.thresholds, watch: Number(e.target.value) },
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    🟠 Risk (มีความเสี่ยง &gt;= %)
                  </label>
                  <input
                    type="number"
                    value={configForm.thresholds.risk}
                    onChange={(e) =>
                      setConfigForm({
                        ...configForm,
                        thresholds: { ...configForm.thresholds, risk: Number(e.target.value) },
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    เพดานคะแนนสูงสุด (Score Cap %)
                  </label>
                  <input
                    type="number"
                    value={configForm.scoreCap}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, scoreCap: Number(e.target.value) })
                    }
                    className="w-full bg-amber-50 border border-amber-300 text-amber-900 font-bold rounded-lg p-2 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-semibold">
                    อีเมลรับการแจ้งเตือนระบบ (System Email - ไม่บังคับ)
                  </label>
                  <span className="text-[10px] text-slate-400">
                    * ไม่จำเป็นต้องตั้งค่า SMTP ระบบทำงานผ่าน In-App ได้สมบูรณ์ 100%
                  </span>
                </div>
                <input
                  type="email"
                  value={configForm.notificationEmail || ''}
                  onChange={(e) =>
                    setConfigForm({ ...configForm, notificationEmail: e.target.value })
                  }
                  placeholder="เช่น qa@huso.edu.th (ตัวเลือกเสริม)"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow transition"
                >
                  บันทึกการตั้งค่าเกณฑ์
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-Tab 6: Go-Live Engine */}
      {activeSubTab === 'GOLIVE' && (
        <GoLivePreparationPanel
          currentUser={currentUser || users[0] || { userId: 'ADM-001', fullName: 'ผศ.สวพร จันทรสกุล', role: 'ADMIN', email: 'jsawaporn@gmail.com', department: 'งานบริหาร บุคคล และการเงิน' }}
          departments={departments}
          onSystemResetSuccess={onSystemResetSuccess}
          onRollbackSuccess={onRollbackSuccess}
        />
      )}

      {/* ========================================================================= */}
      {/* Department Add/Edit Modal */}
      {/* ========================================================================= */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-600" />
                {editingDept ? 'แก้ไขข้อมูลหน่วยงาน' : 'เพิ่มหน่วยงานใหม่'}
              </h3>
              <button
                onClick={() => setIsDeptModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDept} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  รหัสหน่วยงาน (Department ID) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น DEP-001"
                  value={deptForm.departmentId}
                  onChange={(e) =>
                    setDeptForm({ ...deptForm, departmentId: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 font-mono font-bold focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  ชื่อหน่วยงาน *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น งานวิชาการ"
                  value={deptForm.departmentName}
                  onChange={(e) =>
                    setDeptForm({ ...deptForm, departmentName: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  ประเภทหน่วยงาน *
                </label>
                <select
                  value={deptForm.departmentType}
                  onChange={(e) =>
                    setDeptForm({ ...deptForm, departmentType: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none"
                >
                  <option value="งานสำนักงานคณะ">งานสำนักงานคณะ (ฝ่ายสนับสนุนวิชาการ/บริหาร)</option>
                  <option value="กลุ่มผู้บริหาร">กลุ่มผู้บริหาร (คณบดี/รองคณบดี/ผู้ช่วยคณบดี)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  คำอธิบายขอบเขตงาน
                </label>
                <textarea
                  rows={2}
                  placeholder="รายละเอียดหน้าที่ความรับผิดชอบ..."
                  value={deptForm.description || ''}
                  onChange={(e) =>
                    setDeptForm({ ...deptForm, description: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    ลำดับการแสดงผล (Display Order)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={deptForm.displayOrder || 1}
                    onChange={(e) =>
                      setDeptForm({
                        ...deptForm,
                        displayOrder: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    สถานะการใช้งาน
                  </label>
                  <select
                    value={deptForm.status}
                    onChange={(e) =>
                      setDeptForm({
                        ...deptForm,
                        status: e.target.value as 'ACTIVE' | 'INACTIVE',
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE - ใช้งาน</option>
                    <option value="INACTIVE">INACTIVE - ปิดใช้งาน</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shadow"
                >
                  บันทึกข้อมูลหน่วยงาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Personnel Add/Edit Modal */}
      {/* ========================================================================= */}
      {isPersonnelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-600" />
                {editingPersonnel ? 'แก้ไขข้อมูลบุคลากร' : 'เพิ่มบุคลากรใหม่'}
              </h3>
              <button
                onClick={() => setIsPersonnelModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePersonnel} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">รหัสบุคลากร (Personnel ID) *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น PER-0001"
                  value={personnelForm.personnelId}
                  onChange={(e) => setPersonnelForm({ ...personnelForm, personnelId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 font-mono font-bold focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ชื่อ–นามสกุล (พร้อมคำนำหน้า) *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ผศ.สวพร จันทรสกุล"
                  value={personnelForm.fullName}
                  onChange={(e) => setPersonnelForm({ ...personnelForm, fullName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">ตำแหน่งบริหาร</label>
                <input
                  type="text"
                  placeholder="เช่น คณบดี, รองคณบดี, ประธานหลักสูตร..."
                  value={personnelForm.administrativePosition}
                  onChange={(e) => setPersonnelForm({ ...personnelForm, administrativePosition: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">ตำแหน่งทางวิชาการ / สายงาน</label>
                <input
                  type="text"
                  placeholder="เช่น ผู้ช่วยศาสตราจารย์, เจ้าหน้าที่บริหารงานทั่วไป..."
                  value={personnelForm.position}
                  onChange={(e) => setPersonnelForm({ ...personnelForm, position: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">กลุ่มบุคลากร *</label>
                <select
                  value={personnelForm.personnelGroup}
                  onChange={(e) => setPersonnelForm({ ...personnelForm, personnelGroup: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none"
                >
                  <option value="ผู้บริหาร">ผู้บริหาร (คณบดี / รองคณบดี / ผู้ช่วยคณบดี)</option>
                  <option value="อาจารย์ประจำ">อาจารย์ประจำ / ประธานหลักสูตร</option>
                  <option value="บุคลากรสายสนับสนุน">บุคลากรสายสนับสนุน (เจ้าหน้าที่งานวิชาการ/คลัง/วิจัย/QA)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">อีเมลสำหรับส่งแจ้งเตือน (Email)</label>
                <input
                  type="email"
                  placeholder="เช่น name@huso.edu.th"
                  value={personnelForm.email || ''}
                  onChange={(e) => setPersonnelForm({ ...personnelForm, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none font-mono"
                />
                <div className="text-[10px] text-slate-500 mt-0.5">
                  หากไม่ระบุ ระบบจะแจ้งเตือนว่า "ยังไม่ได้กำหนดอีเมลสำหรับการแจ้งเตือน"
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsPersonnelModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shadow"
                >
                  บันทึกข้อมูลบุคลากร
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* User RBAC Modal */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {editingUser ? 'แก้ไขสิทธิ์ผู้ใช้งาน' : 'เพิ่มผู้ใช้งานระบบใหม่'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">ชื่อ–นามสกุล *</label>
                <input
                  type="text"
                  required
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">อีเมล *</label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">หน่วยงานสังกัด *</label>
                <select
                  value={formDepartmentId}
                  onChange={(e) => {
                    const dep = departments.find((d) => d.id === e.target.value);
                    setFormDepartmentId(e.target.value);
                    if (dep) setFormDepartmentName(dep.name);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 focus:border-amber-500 focus:outline-none"
                >
                  {departments
                    .filter((d) => (d.status === 'ACTIVE' || !d.status) && d.isActive !== false)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">สิทธิ์หลักในระบบ (Primary Role) *</label>
                <select
                  value={formPrimaryRole}
                  onChange={(e) => setFormPrimaryRole(e.target.value as UserRole)}
                  className="w-full bg-amber-50 border border-amber-300 text-amber-900 font-bold rounded-lg p-2 focus:border-amber-500 focus:outline-none"
                >
                  <option value="EXECUTIVE">EXECUTIVE - ผู้บริหาร / คณบดี (กำกับ/ตัดสินใจ)</option>
                  <option value="ADMIN">ADMIN - ผู้ดูแลระบบ / QA กลาง (บริหารจัดการระบบทั้งหมด)</option>
                  <option value="REVIEWER">REVIEWER - ผู้ประเมิน / ตรวจสอบ (กรอก/รับรองรายงาน KPI/KVI)</option>
                  <option value="OWNER">OWNER - ผู้รับผิดชอบตัวชี้วัด (กรอก/บันทึกรายงาน KPI/KVI)</option>
                  <option value="DATA_SUPPORT">DATA_SUPPORT - เจ้าหน้าที่สนับสนุนข้อมูล (ร่วมกรอกรายงาน)</option>
                  <option value="VIEWER">VIEWER - บุคลากรทั่วไป (เข้าชมเท่านั้น Read-Only)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  สิทธิ์ที่ได้รับรวม (Combined Roles / Permissions)
                </label>
                <p className="text-[10px] text-slate-500 mb-2">
                  คลิกเพื่อเลือกหรือยกเลิกสิทธิ์ย่อยที่ผู้ใช้งานนี้ถือครองร่วมกัน (เช่น รองคณบดี ถือสิทธิ์ OWNER / REVIEWER)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(['EXECUTIVE', 'ADMIN', 'REVIEWER', 'OWNER', 'DATA_SUPPORT', 'VIEWER'] as UserRole[]).map((r) => {
                    const isSelected = selectedRoleBadges.includes(r);
                    return (
                      <button
                        type="button"
                        key={r}
                        onClick={() => toggleRoleBadge(r)}
                        className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg border text-xs font-bold transition ${
                          isSelected
                            ? 'bg-amber-100 border-amber-400 text-amber-900'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-amber-700" />}
                        <span>{r}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shadow transition"
                >
                  บันทึกสิทธิ์ผู้ใช้งาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

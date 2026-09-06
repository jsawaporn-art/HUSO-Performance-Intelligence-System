import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { GoogleSyncBanner } from './components/GoogleSyncBanner';
import { GoogleUserInfo, initAuthListener, isAuthExpiredError, handleInvalidAuthToken } from './lib/googleAuth';
import { getOrCreateSpreadsheet, syncAllToGoogleSheet, clearGoogleSheetData, SyncStatus } from './lib/googleSheets';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { ManagementCockpit } from './components/ManagementCockpit';
import { IndicatorMaster } from './components/IndicatorMaster';
import { TargetManager } from './components/TargetManager';
import { MonthlyProgressLogger } from './components/MonthlyProgressLogger';
import { VerificationWorkflow } from './components/VerificationWorkflow';
import { EvidenceDrive } from './components/EvidenceDrive';
import { ActionDirectivesView } from './components/ActionDirectivesView';
import { AiInsightView } from './components/AiInsightView';
import { MonthlyReportsView } from './components/MonthlyReportsView';
import { SystemSettingsView } from './components/SystemSettingsView';
import { ActivityLogsView } from './components/ActivityLogsView';
import { GoogleWorkspaceTools } from './components/GoogleWorkspaceTools';
import { TrashView } from './components/TrashView';
import { UserManualView } from './components/UserManualView';
import { LoginScreen } from './components/LoginScreen';
import { PublicDashboardView } from './components/PublicDashboardView';
import { ChangePasswordModal } from './components/ChangePasswordModal';

// BRIDGE Process Improvement Module Components
import { BridgeOverview } from './components/bridge/BridgeOverview';
import { BridgeDeptList } from './components/bridge/BridgeDeptList';
import { BridgeMyTasks } from './components/bridge/BridgeMyTasks';
import { BridgeProgressTracker } from './components/bridge/BridgeProgressTracker';
import { BridgeExecutiveDecisions } from './components/bridge/BridgeExecutiveDecisions';
import { BridgeInnovationsBestPractices } from './components/bridge/BridgeInnovationsBestPractices';
import { BridgeReports } from './components/bridge/BridgeReports';
import { BridgeSettings } from './components/bridge/BridgeSettings';
import { BridgeWizardModal } from './components/bridge/BridgeWizardModal';
import { BridgeDetailModal } from './components/bridge/BridgeDetailModal';
import { BridgeIssueAiSummaryModal } from './components/bridge/BridgeIssueAiSummaryModal';
import { bridgeService } from './lib/bridgeService';
import { BridgeImprovement, BridgeExecutiveDecision } from './types/bridge';

import {
  INITIAL_CONFIG,
  INITIAL_DEPARTMENTS,
  INITIAL_DIRECTIVES,
  INITIAL_EVIDENCE,
  INITIAL_INDICATORS,
  INITIAL_LOGS,
  INITIAL_PROGRESS,
  INITIAL_REPORTS,
  INITIAL_STRATEGIES,
  INITIAL_TARGETS,
  INITIAL_USERS,
  INITIAL_PERSONNEL,
} from './mockData';

import {
  configService,
  departmentService,
  strategyService,
  indicatorService,
  targetService,
  progressService,
  evidenceService,
  directiveService,
  userService,
  logService,
  reportService,
  trashService,
  personnelService,
  ensureMasterDataBaseline,
  migrateIndicatorDepartments,
  batchMapIndicators,
} from './lib/firebase';

import {
  Indicator,
  Target,
  MonthlyProgress,
  Evidence,
  ActionDirective,
  User,
  UserRole,
  SystemConfig,
  ActivityLog,
  MonthlyReport,
  VerificationStatus,
  StrategicIssue,
  Department,
  Personnel,
} from './types';

// Helper to parse current URL route and query parameters for Public Dashboard
const checkIsPublicDashboardUrl = (): { isPublic: boolean; isEmbed: boolean; token: string | null } => {
  if (typeof window === 'undefined') return { isPublic: false, isEmbed: false, token: null };
  const pathname = (window.location.pathname || '').toLowerCase();
  const searchParams = new URLSearchParams(window.location.search || '');
  const hash = (window.location.hash || '').toLowerCase();

  const isPublicPath =
    pathname.startsWith('/public/dashboard') ||
    pathname === '/public' ||
    pathname === '/public/' ||
    hash.includes('/public/dashboard') ||
    hash.includes('#/public/dashboard') ||
    searchParams.get('route') === 'public' ||
    searchParams.get('public') === '1' ||
    searchParams.get('public') === 'true';

  const isEmbed =
    searchParams.get('embed') === '1' ||
    searchParams.get('embed') === 'true';

  const token = searchParams.get('token');

  return { isPublic: isPublicPath, isEmbed, token };
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedYear, setSelectedYear] = useState<string>('2569');
  const availableYears = ['2569', '2570', '2571', '2572', '2573', '2574', '2575'];

  // Authentication & View State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('huso_is_logged_in') === 'true';
  });

  const [isPublicDashboardMode, setIsPublicDashboardMode] = useState<boolean>(() => {
    return checkIsPublicDashboardUrl().isPublic;
  });
  const [isEmbedMode, setIsEmbedMode] = useState<boolean>(() => {
    return checkIsPublicDashboardUrl().isEmbed;
  });
  const [shareToken, setShareToken] = useState<string | null>(() => {
    return checkIsPublicDashboardUrl().token;
  });
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);

  // Sync route state with window.location on popstate (browser back/forward) and initial load
  useEffect(() => {
    const handleLocationChange = () => {
      const info = checkIsPublicDashboardUrl();
      setIsPublicDashboardMode(info.isPublic);
      setIsEmbedMode(info.isEmbed);
      setShareToken(info.token);

      // Validate token if present
      if (info.token) {
        const lowerToken = info.token.toLowerCase();
        if (lowerToken === 'expired' || lowerToken.includes('expired')) {
          setTokenError('ลิงก์การเข้าถึงนี้หมดอายุการใช้งานแล้ว (Token Expired)');
        } else if (lowerToken === 'revoked' || lowerToken.includes('revoked') || lowerToken === 'invalid') {
          setTokenError('ลิงก์การเข้าถึงนี้ถูกยกเลิกหรือไม่ถูกต้อง (Token Revoked or Invalid)');
        } else {
          setTokenError(null);
        }
      } else {
        setTokenError(null);
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    handleLocationChange();

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const navigateToPublicDashboard = useCallback((embed?: boolean, token?: string | null) => {
    setIsPublicDashboardMode(true);
    if (embed !== undefined) setIsEmbedMode(embed);
    if (token !== undefined) setShareToken(token);

    const searchParams = new URLSearchParams(window.location.search);
    if (embed || (embed === undefined && isEmbedMode)) {
      searchParams.set('embed', '1');
    } else {
      searchParams.delete('embed');
    }
    if (token) {
      searchParams.set('token', token);
    }
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    window.history.pushState({}, '', `/public/dashboard${queryString}`);
  }, [isEmbedMode]);

  const navigateToLogin = useCallback(() => {
    setIsPublicDashboardMode(false);
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.delete('embed');
    searchParams.delete('token');
    searchParams.delete('public');
    searchParams.delete('route');
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    window.history.pushState({}, '', `/${queryString}`);
  }, []);

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('huso_logged_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_USERS[0];
      }
    }
    return INITIAL_USERS[0];
  });

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    localStorage.setItem('huso_is_logged_in', 'true');
    localStorage.setItem('huso_logged_user', JSON.stringify(user));
    showToast(`ยินดีต้อนรับคุณ ${user.fullName} (${user.role}) เข้าสู่ระบบ`);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('huso_is_logged_in');
    localStorage.removeItem('huso_logged_user');
    showToast('ออกจากระบบเรียบร้อยแล้ว');
  };
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(INITIAL_CONFIG);
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [strategies, setStrategies] = useState<StrategicIssue[]>(INITIAL_STRATEGIES);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [monthlyProgressList, setMonthlyProgressList] = useState<MonthlyProgress[]>([]);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [directives, setDirectives] = useState<ActionDirective[]>([]);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [personnelList, setPersonnelList] = useState<Personnel[]>(INITIAL_PERSONNEL);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [reports, setReports] = useState<MonthlyReport[]>([]);

  // BRIDGE Process Improvement State
  const [bridgeImprovements, setBridgeImprovements] = useState<BridgeImprovement[]>([]);
  const [bridgeDecisions, setBridgeDecisions] = useState<BridgeExecutiveDecision[]>([]);
  const [isBridgeWizardOpen, setIsBridgeWizardOpen] = useState<boolean>(false);
  const [isBridgeDetailOpen, setIsBridgeDetailOpen] = useState<boolean>(false);
  const [selectedBridgeImprovement, setSelectedBridgeImprovement] = useState<BridgeImprovement | null>(null);
  const [bridgeEditingImprovement, setBridgeEditingImprovement] = useState<BridgeImprovement | null>(null);
  const [isBridgeAiSummaryOpen, setIsBridgeAiSummaryOpen] = useState<boolean>(false);
  const [bridgeAiSummaryTarget, setBridgeAiSummaryTarget] = useState<BridgeImprovement | null>(null);

  const handleOpenBridgeAiSummary = useCallback((item: BridgeImprovement) => {
    setBridgeAiSummaryTarget(item);
    setIsBridgeAiSummaryOpen(true);
  }, []);

  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dbConnectionStatus, setDbConnectionStatus] = useState<'CONNECTED' | 'SYNCING' | 'DISCONNECTED'>('CONNECTED');
  const [dbLastSyncedTime, setDbLastSyncedTime] = useState<Date | null>(new Date());
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Google Auth & Google Sheets Real-time Auto-Sync State
  const [googleUser, setGoogleUser] = useState<GoogleUserInfo | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSyncedAt: null,
    spreadsheetId: null,
    spreadsheetUrl: null,
    error: null,
  });

  // Listen to Google Auth state
  useEffect(() => {
    const unsubscribe = initAuthListener(
      (userInfo) => {
        setGoogleUser(userInfo);
      },
      () => {
        setGoogleUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Real-time Auto Sync to Google Sheets
  const triggerGoogleSheetsSync = useCallback(
    async (userOverride?: GoogleUserInfo) => {
      const activeUser = userOverride || googleUser;
      if (!activeUser || !activeUser.accessToken) return;

      setSyncStatus((prev) => ({ ...prev, isSyncing: true, error: null }));
      try {
        let sheetId = syncStatus.spreadsheetId;
        let sheetUrl = syncStatus.spreadsheetUrl;

        if (!sheetId || !sheetUrl) {
          const sheetInfo = await getOrCreateSpreadsheet(activeUser.accessToken);
          sheetId = sheetInfo.id;
          sheetUrl = sheetInfo.url;
        }

        await syncAllToGoogleSheet(
          activeUser.accessToken,
          sheetId,
          indicators,
          monthlyProgressList,
          strategies
        );

        setSyncStatus({
          isSyncing: false,
          lastSyncedAt: new Date(),
          spreadsheetId: sheetId,
          spreadsheetUrl: sheetUrl,
          error: null,
        });
      } catch (err: any) {
        console.warn('Google Sheets Sync Status:', err?.message || err);
        if (isAuthExpiredError(err)) {
          await handleInvalidAuthToken();
          setGoogleUser(null);
          setSyncStatus({
            isSyncing: false,
            lastSyncedAt: null,
            spreadsheetId: null,
            spreadsheetUrl: null,
            error: 'เซสชัน Google หมดอายุ กรุณากดเข้าสู่ระบบด้วย Google อีกครั้งเพื่อเริ่มการซิงค์',
          });
        } else {
          setSyncStatus((prev) => ({
            ...prev,
            isSyncing: false,
            error: err.message || 'เกิดข้อผิดพลาดในการซิงค์ Google Sheets',
          }));
        }
      }
    },
    [googleUser, syncStatus.spreadsheetId, syncStatus.spreadsheetUrl, indicators, monthlyProgressList, strategies]
  );

  // Manual Clear Google Sheet Data
  const handleClearGoogleSheet = async () => {
    if (!googleUser || !googleUser.accessToken) return;
    setSyncStatus((prev) => ({ ...prev, isSyncing: true, error: null }));
    try {
      let sheetId = syncStatus.spreadsheetId;
      let sheetUrl = syncStatus.spreadsheetUrl;

      if (!sheetId || !sheetUrl) {
        const sheetInfo = await getOrCreateSpreadsheet(googleUser.accessToken);
        sheetId = sheetInfo.id;
        sheetUrl = sheetInfo.url;
      }

      await clearGoogleSheetData(googleUser.accessToken, sheetId);
      setSyncStatus({
        isSyncing: false,
        lastSyncedAt: new Date(),
        spreadsheetId: sheetId,
        spreadsheetUrl: sheetUrl,
        error: null,
      });
      showToast('ล้างข้อมูลเก่าใน Google Sheet เรียบร้อยแล้ว');
    } catch (err: any) {
      console.warn('Clear Google Sheet Status:', err?.message || err);
      if (isAuthExpiredError(err)) {
        await handleInvalidAuthToken();
        setGoogleUser(null);
        setSyncStatus({
          isSyncing: false,
          lastSyncedAt: null,
          spreadsheetId: null,
          spreadsheetUrl: null,
          error: 'เซสชัน Google หมดอายุ กรุณากดเข้าสู่ระบบด้วย Google ใหม่อีกครั้ง',
        });
        showToast('เซสชัน Google หมดอายุ กรุณาเข้าสู่ระบบ Google อีกครั้ง');
      } else {
        setSyncStatus((prev) => ({
          ...prev,
          isSyncing: false,
          error: err.message || 'เกิดข้อผิดพลาดในการล้าง Google Sheet',
        }));
        showToast('เกิดข้อผิดพลาดในการล้าง Google Sheet');
      }
    }
  };

  // Auto-sync whenever indicators, progress, or strategies change if logged in with Google
  useEffect(() => {
    if (googleUser) {
      triggerGoogleSheetsSync();
    }
  }, [indicators, monthlyProgressList, strategies, googleUser]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Fetch all data from Firebase Firestore
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setDbConnectionStatus('SYNCING');
    try {
      // Ensure master data baseline (non-destructive)
      await ensureMasterDataBaseline();

      const [
        cfgRes,
        deptRes,
        stratRes,
        indRes,
        tgtRes,
        prgRes,
        evdRes,
        dirRes,
        usrRes,
        perRes,
        logRes,
        repRes,
        bridgeImpsRes,
        bridgeDecsRes,
      ] = await Promise.all([
        configService.get(),
        departmentService.getAll(),
        strategyService.getAll(selectedYear),
        indicatorService.getAll(),
        targetService.getAll(selectedYear),
        progressService.getAll(selectedYear),
        evidenceService.getAll(),
        directiveService.getAll(),
        userService.getAll(),
        personnelService.getAll(),
        logService.getAll(),
        reportService.getAll(selectedYear),
        bridgeService.getAllImprovements({ fiscalYear: Number(selectedYear) || 2569 }),
        bridgeService.getExecutiveDecisions(),
      ]);

      if (cfgRes) setSystemConfig(cfgRes);
      if (Array.isArray(deptRes)) setDepartments(deptRes);
      if (Array.isArray(stratRes)) setStrategies(stratRes);
      if (Array.isArray(indRes)) setIndicators(indRes);
      if (Array.isArray(tgtRes)) setTargets(tgtRes);
      if (Array.isArray(prgRes)) setMonthlyProgressList(prgRes);
      if (Array.isArray(evdRes)) setEvidenceList(evdRes);
      if (Array.isArray(dirRes)) setDirectives(dirRes);
      if (Array.isArray(usrRes)) setUsers(usrRes);
      if (Array.isArray(perRes)) setPersonnelList(perRes);
      if (Array.isArray(logRes)) setLogs(logRes);
      if (Array.isArray(repRes)) setReports(repRes);
      if (Array.isArray(bridgeImpsRes)) setBridgeImprovements(bridgeImpsRes);
      if (Array.isArray(bridgeDecsRes)) setBridgeDecisions(bridgeDecsRes);

      setDbConnectionStatus('CONNECTED');
      setDbLastSyncedTime(new Date());
    } catch (err) {
      console.error('Error fetching system data from Firebase:', err);
      setDbConnectionStatus('DISCONNECTED');
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  // Real-time Firestore Subscriptions
  useEffect(() => {
    // Ensure baseline master data if fresh DB and fetch data
    ensureMasterDataBaseline().then(() => fetchAllData());

    const unsubConfig = configService.subscribe((cfg) => {
      setSystemConfig(cfg);
      setDbConnectionStatus('CONNECTED');
      setDbLastSyncedTime(new Date());
    });
    const unsubInd = indicatorService.subscribe((inds) => {
      setIndicators(inds);
      setDbConnectionStatus('CONNECTED');
      setDbLastSyncedTime(new Date());
    });
    const unsubProgress = progressService.subscribe((prgs) => {
      setMonthlyProgressList(prgs.filter((p) => p.fiscalYear === selectedYear));
      setDbConnectionStatus('CONNECTED');
      setDbLastSyncedTime(new Date());
    });
    const unsubTarget = targetService.subscribe((tgts) => {
      setTargets(tgts.filter((t) => t.fiscalYear === selectedYear));
      setDbConnectionStatus('CONNECTED');
      setDbLastSyncedTime(new Date());
    });
    const unsubDirectives = directiveService.subscribe((dirs) => {
      setDirectives(dirs);
      setDbConnectionStatus('CONNECTED');
      setDbLastSyncedTime(new Date());
    });
    const unsubEvidence = evidenceService.subscribe((evds) => {
      setEvidenceList(evds);
      setDbConnectionStatus('CONNECTED');
      setDbLastSyncedTime(new Date());
    });
    const unsubUsers = userService.subscribe((usrs) => {
      setUsers(usrs);
      setDbConnectionStatus('CONNECTED');
      setDbLastSyncedTime(new Date());
    });
    const unsubPersonnel = personnelService.subscribe((pers) => {
      setPersonnelList(pers);
      setDbConnectionStatus('CONNECTED');
      setDbLastSyncedTime(new Date());
    });
    const unsubLogs = logService.subscribe((lgs) => {
      setLogs(lgs);
      setDbConnectionStatus('CONNECTED');
      setDbLastSyncedTime(new Date());
    });
    const unsubBridge = bridgeService.subscribe((imps) => {
      setBridgeImprovements(imps);
      setDbConnectionStatus('CONNECTED');
      setDbLastSyncedTime(new Date());
    });
    const unsubBridgeDec = bridgeService.subscribeDecisions((decs) => {
      setBridgeDecisions(decs);
      setDbConnectionStatus('CONNECTED');
      setDbLastSyncedTime(new Date());
    });

    return () => {
      unsubConfig();
      unsubInd();
      unsubProgress();
      unsubTarget();
      unsubDirectives();
      unsubEvidence();
      unsubUsers();
      unsubPersonnel();
      unsubLogs();
      unsubBridge();
      unsubBridgeDec();
    };
  }, [selectedYear, fetchAllData]);

  // Handle Switch User Role
  const handleSwitchUserRole = (role: UserRole) => {
    const matched = users.find((u) => u.role === role) || {
      userId: `USR-${role}`,
      fullName: `ทดสอบสิทธิ์ ${role}`,
      role,
      departmentId: 'DEPT-09',
      departmentName: 'งานวิชาการ',
      email: `${role.toLowerCase()}@huso.edu`,
    };
    setCurrentUser(matched);
    showToast(`สลับสิทธิ์ผู้ใช้งานเป็น: ${role}`);
  };

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    showToast(`สลับผู้ใช้งานเป็น: ${user.fullName} (${user.rolesDisplay || user.role})`);
  };

  // User CRUD Handlers via Firebase UserService
  const handleAddUser = async (userData: Partial<User>) => {
    try {
      await userService.create(userData);
      showToast('บันทึกข้อมูลลงฐานข้อมูลถาวรเรียบร้อยแล้ว');
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ Firebase');
    }
  };

  const handleUpdateUser = async (userId: string, userData: Partial<User>) => {
    try {
      await userService.update(userId, userData);
      showToast('บันทึกข้อมูลลงฐานข้อมูลถาวรเรียบร้อยแล้ว');
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ Firebase');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await userService.delete(userId);
      showToast('ลบข้อมูลในฐานข้อมูลถาวรเรียบร้อยแล้ว');
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ Firebase');
    }
  };

  // Indicator CRUD Handlers via Firebase IndicatorService
  const handleCreateIndicator = async (indicatorData: Partial<Indicator>) => {
    try {
      await indicatorService.create(
        {
          ...indicatorData,
          startDate: indicatorData.startDate || `${selectedYear}-10-01`,
        },
        {
          userId: currentUser.userId,
          userName: currentUser.fullName,
        }
      );
      showToast('บันทึกข้อมูลลงฐานข้อมูลถาวรเรียบร้อยแล้ว');
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ Firebase');
    }
  };

  const handleUpdateIndicator = async (id: string, indicatorData: Partial<Indicator>) => {
    try {
      await indicatorService.update(id, indicatorData, {
        userId: currentUser.userId,
        userName: currentUser.fullName,
      });
      showToast('บันทึกข้อมูลลงฐานข้อมูลถาวรเรียบร้อยแล้ว');
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ Firebase');
    }
  };

  const handleDeleteIndicator = async (id: string) => {
    try {
      await indicatorService.delete(id, {
        userId: currentUser.userId,
        userName: currentUser.fullName,
      });
      showToast('ย้ายตัวชี้วัดไปยังถังขยะในฐานข้อมูลถาวรเรียบร้อยแล้ว');
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ Firebase');
    }
  };

  const handleRestoreIndicator = async (id: string) => {
    try {
      await indicatorService.restore(id, {
        userId: currentUser.userId,
        userName: currentUser.fullName,
      });
      showToast('กู้คืนข้อมูลในฐานข้อมูลถาวรเรียบร้อยแล้ว');
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ Firebase');
    }
  };

  // Target CRUD Handler via Firebase TargetService
  const handleSaveTarget = async (target: Target) => {
    try {
      await targetService.save({
        ...target,
        fiscalYear: selectedYear,
      });
      showToast('บันทึกข้อมูลลงฐานข้อมูลถาวรเรียบร้อยแล้ว');
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ Firebase');
    }
  };

  // Monthly Progress CRUD Handler via Firebase ProgressService
  const handleSaveProgress = async (progressData: Partial<MonthlyProgress>) => {
    try {
      const matchedInd = indicators.find((i) => i.indicatorId === progressData.indicatorId);
      await progressService.save(
        {
          ...progressData,
          fiscalYear: selectedYear,
          loggerName: currentUser.fullName,
        },
        matchedInd,
        {
          userId: currentUser.userId,
          userName: currentUser.fullName,
        }
      );
      showToast('บันทึกข้อมูลลงฐานข้อมูลถาวรเรียบร้อยแล้ว');
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ Firebase');
    }
  };

  const handleVerifyProgress = async (id: string, status: VerificationStatus, comment: string) => {
    try {
      await progressService.verify(id, status, comment, {
        userId: currentUser.userId,
        userName: currentUser.fullName,
        role: currentUser.role,
      });
      showToast('บันทึกข้อมูลลงฐานข้อมูลถาวรเรียบร้อยแล้ว');
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ Firebase');
    }
  };

  const handleUnlockProgress = async (id: string, reason: string) => {
    try {
      await progressService.unlockPeriod(id, reason, {
        userId: currentUser.userId,
        userName: currentUser.fullName,
        role: currentUser.role,
      });
      showToast('เปิดรอบเพื่อแก้ไขข้อมูลเรียบร้อยแล้ว (สร้างเวอร์ชันใหม่และบันทึกประวัติ)');
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการเปิดรอบแก้ไขข้อมูล');
    }
  };

  // Evidence CRUD Handlers via Firebase EvidenceService
  const handleCreateEvidence = async (evidenceData: Partial<Evidence>) => {
    try {
      await evidenceService.create(
        {
          ...evidenceData,
          ownerName: currentUser.fullName,
        },
        {
          userId: currentUser.userId,
          userName: currentUser.fullName,
        }
      );
      showToast('บันทึกข้อมูลลงฐานข้อมูลถาวรเรียบร้อยแล้ว');
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ Firebase');
    }
  };

  const handleDeleteEvidence = async (id: string) => {
    try {
      await evidenceService.delete(id);
      showToast('ลบหลักฐานในฐานข้อมูลถาวรเรียบร้อยแล้ว');
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ Firebase');
    }
  };

  // Directives CRUD Handlers via Firebase DirectiveService
  const handleCreateDirective = async (directiveData: Partial<ActionDirective>) => {
    try {
      await directiveService.create(
        {
          ...directiveData,
          createdBy: currentUser.fullName,
        },
        {
          userId: currentUser.userId,
          userName: currentUser.fullName,
        }
      );
      showToast('บันทึกข้อมูลลงฐานข้อมูลถาวรเรียบร้อยแล้ว');
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ Firebase');
    }
  };

  const handleUpdateDirectiveStatus = async (
    id: string,
    status: ActionDirective['status']
  ) => {
    try {
      await directiveService.updateStatus(id, status);
      showToast('บันทึกข้อมูลลงฐานข้อมูลถาวรเรียบร้อยแล้ว');
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ Firebase');
    }
  };

  // Strategy CRUD Handlers via Firebase StrategyService
  const handleCreateStrategy = async (stratData: Partial<StrategicIssue>) => {
    try {
      await strategyService.create({
        ...stratData,
        fiscalYear: stratData.fiscalYear || selectedYear,
      });
      showToast('บันทึกข้อมูลลงฐานข้อมูลถาวรเรียบร้อยแล้ว');
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ Firebase');
    }
  };

  const handleUpdateStrategy = async (id: string, stratData: Partial<StrategicIssue>) => {
    try {
      await strategyService.update(id, stratData);
      showToast('บันทึกข้อมูลลงฐานข้อมูลถาวรเรียบร้อยแล้ว');
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ Firebase');
    }
  };

  const handleDeleteStrategy = async (id: string) => {
    try {
      await strategyService.delete(id);
      showToast('ลบประเด็นยุทธศาสตร์ในฐานข้อมูลถาวรเรียบร้อยแล้ว');
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ Firebase');
    }
  };

  const handleCopyStrategies = async (fromYear: string, toYear: string) => {
    try {
      const count = await strategyService.copyFromYear(fromYear, toYear);
      showToast(`คัดลอกยุทธศาสตร์ ${count} รายการลงฐานข้อมูลถาวรเรียบร้อยแล้ว`);
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ Firebase');
    }
  };

  // Personnel CRUD Handlers via Firebase PersonnelService
  const handleCreatePersonnel = async (personnelData: Partial<Personnel>) => {
    try {
      await personnelService.create(personnelData);
      showToast('บันทึกข้อมูลบุคลากรลงฐานข้อมูลถาวรเรียบร้อยแล้ว');
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ Firebase');
    }
  };

  const handleUpdatePersonnel = async (id: string, personnelData: Partial<Personnel>) => {
    try {
      await personnelService.update(id, personnelData);
      showToast('บันทึกข้อมูลบุคลากรลงฐานข้อมูลถาวรเรียบร้อยแล้ว');
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ Firebase');
    }
  };

  const handleDeletePersonnel = async (id: string) => {
    try {
      await personnelService.delete(id);
      showToast('ลบข้อมูลบุคลากรในฐานข้อมูลถาวรเรียบร้อยแล้ว');
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ Firebase');
    }
  };

  // Department CRUD & Migration Handlers
  const handleCreateDepartment = async (deptData: Partial<Department>) => {
    try {
      await departmentService.create(deptData);
      showToast('บันทึกข้อมูลหน่วยงานลงฐานข้อมูลถาวรเรียบร้อยแล้ว');
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ Firebase');
    }
  };

  const handleUpdateDepartment = async (id: string, deptData: Partial<Department>) => {
    try {
      await departmentService.update(id, deptData);
      showToast('บันทึกข้อมูลหน่วยงานลงฐานข้อมูลถาวรเรียบร้อยแล้ว');
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ Firebase');
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    try {
      await departmentService.delete(id);
      showToast('ลบข้อมูลหน่วยงานในฐานข้อมูลถาวรเรียบร้อยแล้ว');
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ Firebase');
    }
  };

  const handleMigrateDepartments = async () => {
    try {
      const res = await migrateIndicatorDepartments();
      showToast(`ย้ายข้อมูลสำเร็จ: ${res.migratedCount} รายการ, รอตรวจ ${res.pendingCount} รายการ`);
      fetchAllData();
      return res;
    } catch (err: any) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการย้ายข้อมูล');
      throw err;
    }
  };

  const handleMapIndicatorDepartment = async (indicatorId: string, targetDeptId: string, targetDeptName: string) => {
    try {
      await batchMapIndicators([indicatorId], targetDeptId, targetDeptName);
      showToast('จับคู่หน่วยงานและบันทึกลงฐานข้อมูลถาวรแล้ว');
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการจับคู่หน่วยงาน');
      throw err;
    }
  };

  const handleBatchMapIndicators = async (indicatorIds: string[], targetDeptId: string, targetDeptName: string) => {
    try {
      const count = await batchMapIndicators(indicatorIds, targetDeptId, targetDeptName);
      showToast(`จับคู่หน่วยงานสำเร็จ ${count} รายการ`);
      fetchAllData();
      return count;
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการจับคู่หน่วยงาน');
      throw err;
    }
  };

  // Config Handler via Firebase ConfigService
  const handleUpdateConfig = async (newConfig: SystemConfig) => {
    try {
      await configService.update(newConfig);
      showToast('บันทึกข้อมูลลงฐานข้อมูลถาวรเรียบร้อยแล้ว');
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ Firebase');
    }
  };

  // Report Generator Handler via Firebase ReportService
  const handleGenerateReport = async (fiscalYear: string, month: number) => {
    try {
      await reportService.generate(fiscalYear, month, {
        userId: currentUser.userId,
        userName: currentUser.fullName,
      });
      showToast('บันทึกข้อมูลลงฐานข้อมูลถาวรเรียบร้อยแล้ว');
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ Firebase');
    }
  };

  // Logs Handler via Firebase LogService
  const handleClearLogs = async () => {
    try {
      await logService.clear();
      showToast('เคลียร์ประวัติการทำงานในฐานข้อมูลถาวรเรียบร้อยแล้ว');
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ Firebase');
    }
  };

  const handleDeleteLog = async (logId: string) => {
    try {
      await logService.delete(logId);
      showToast('ลบรายการประวัติการทำงานเรียบร้อยแล้ว');
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถลบรายการได้ กรุณาตรวจสอบการเชื่อมต่อ Firebase');
    }
  };

  const handleDeleteMultipleLogs = async (logIds: string[]) => {
    try {
      await logService.deleteMultiple(logIds);
      showToast(`ลบรายการประวัติการทำงานที่เลือก (${logIds.length} รายการ) เรียบร้อยแล้ว`);
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถลบรายการได้ กรุณาตรวจสอบการเชื่อมต่อ Firebase');
    }
  };

  // BRIDGE Soft Delete Handler (with optional Auto-Renumbering)
  const handleDeleteBridgeImprovement = async (item: BridgeImprovement, autoRenumber: boolean = false) => {
    try {
      const operator = {
        userId: currentUser.userId,
        userName: currentUser.fullName,
        role: currentUser.role,
      };
      if (autoRenumber) {
        await bridgeService.deleteAndRenumber(item.id, item.fiscalYear || selectedYear || 2569, operator);
        showToast(`ลบประเด็น ${item.improvementId} และรันจัดระเบียบเลขรหัสใหม่เรียบร้อยแล้ว`);
      } else {
        await bridgeService.softDelete(item.id, operator);
        showToast(`ย้ายประเด็น ${item.improvementId} ไปยังถังขยะเรียบร้อยแล้ว (สามารถกู้คืนได้)`);
      }
      setIsBridgeDetailOpen(false);
      setSelectedBridgeImprovement(null);
      fetchAllData();
    } catch (err: any) {
      console.error('Failed to delete bridge improvement:', err);
      showToast(`เกิดข้อผิดพลาดในการลบประเด็น: ${err.message || err}`);
    }
  };

  // BRIDGE Renumber Handler
  const handleRenumberBridgeImprovements = async (fiscalYear: number | string) => {
    try {
      const operator = {
        userId: currentUser.userId,
        userName: currentUser.fullName,
        role: currentUser.role,
      };
      const updated = await bridgeService.renumberAll(fiscalYear, operator);
      showToast(`รันและจัดระเบียบเลขรหัส BRG ปีงบประมาณ ${fiscalYear} ใหม่เรียบร้อยแล้ว (${updated.length} รายการ)`);
      fetchAllData();
    } catch (err: any) {
      console.error('Failed to renumber bridge improvements:', err);
      showToast(`เกิดข้อผิดพลาดในการรันเลขรหัสใหม่: ${err.message || err}`);
    }
  };

  // BRIDGE Start Operation Handler
  const handleStartBridgeOperation = async (item: BridgeImprovement) => {
    try {
      const operator = {
        userId: currentUser.userId,
        userName: currentUser.fullName,
        role: currentUser.role,
      };
      const updated = await bridgeService.startOperation(item.id, operator);
      setSelectedBridgeImprovement(updated);
      showToast(`เปลี่ยนสถานะเป็น "กำลังดำเนินงาน" (IN_PROGRESS) และเผยแพร่ข้อมูลเรียบร้อยแล้ว`);
      fetchAllData();
    } catch (err: any) {
      console.error('Failed to start bridge operation:', err);
      showToast(`เกิดข้อผิดพลาดในการเปลี่ยนสถานะ: ${err.message}`);
    }
  };

  // Counts for sidebar badges
  const pendingVerificationCount = monthlyProgressList.filter(
    (p) => p.verificationStatus === 'SUBMITTED'
  ).length;

  const openDirectivesCount = directives.filter((d) => d.status !== 'COMPLETED').length;

  // Render Public Dashboard Mode (URL Route /public/dashboard or public mode)
  if (isPublicDashboardMode) {
    return (
      <PublicDashboardView
        indicators={indicators}
        monthlyProgressList={monthlyProgressList}
        strategies={strategies}
        departments={departments}
        targets={targets}
        selectedYear={selectedYear}
        onChangeYear={setSelectedYear}
        availableYears={availableYears}
        onGoToLogin={navigateToLogin}
        isEmbedMode={isEmbedMode}
        tokenError={tokenError}
        shareToken={shareToken}
        bridgeImprovements={bridgeImprovements}
      />
    );
  }

  // Render Login Screen if user is not authenticated
  if (!isLoggedIn) {
    return (
      <LoginScreen
        users={users}
        onLogin={handleLogin}
        onGoogleLoginSuccess={(gUser) => {
          setGoogleUser(gUser);
          triggerGoogleSheetsSync(gUser);
        }}
        onViewPublicDashboard={() => navigateToPublicDashboard(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans antialiased selection:bg-amber-500 selection:text-white">
      {/* Mandatory Change Password Modal on First Login */}
      {currentUser.mustChangePassword && (
        <ChangePasswordModal
          currentUser={currentUser}
          isMandatory={true}
          onSuccess={(updated) => {
            setCurrentUser(updated);
            localStorage.setItem('huso_logged_user', JSON.stringify(updated));
            showToast('เปลี่ยนรหัสผ่านเริ่มต้นเรียบร้อยแล้ว');
          }}
        />
      )}

      {/* Optional Change Password Modal from Profile */}
      {isChangePasswordOpen && (
        <ChangePasswordModal
          currentUser={currentUser}
          isMandatory={false}
          onClose={() => setIsChangePasswordOpen(false)}
          onSuccess={(updated) => {
            setCurrentUser(updated);
            localStorage.setItem('huso_logged_user', JSON.stringify(updated));
            setIsChangePasswordOpen(false);
            showToast('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
          }}
        />
      )}

      {/* Google Drive / Google Sheets Live Sync Banner */}
      <GoogleSyncBanner
        googleUser={googleUser}
        syncStatus={syncStatus}
        onLoginSuccess={(u) => {
          setGoogleUser(u);
          triggerGoogleSheetsSync(u);
        }}
        onLogout={() => {
          setGoogleUser(null);
          setSyncStatus({
            isSyncing: false,
            lastSyncedAt: null,
            spreadsheetId: null,
            spreadsheetUrl: null,
            error: null,
          });
        }}
        onManualSync={() => triggerGoogleSheetsSync()}
        onClearSheet={handleClearGoogleSheet}
      />

      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        selectedYear={selectedYear}
        onChangeYear={setSelectedYear}
        onRefreshData={fetchAllData}
        availableYears={availableYears}
        dbStatus={dbConnectionStatus}
        lastSyncedTime={dbLastSyncedTime}
        onManualSync={fetchAllData}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        onViewPublicDashboard={() => navigateToPublicDashboard(false)}
        onOpenSettings={() => setActiveTab('settings')}
        onOpenGoLive={() => setActiveTab('settings')}
        isGoogleConnected={!!syncStatus.spreadsheetId}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        isMobileSidebarOpen={isMobileSidebarOpen}
        unreadNotificationsCount={openDirectivesCount + pendingVerificationCount}
      />

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          userRole={currentUser.role}
          pendingVerificationCount={pendingVerificationCount}
          openDirectivesCount={openDirectivesCount}
          bridgePendingDecisionsCount={bridgeDecisions.filter((d) => d.decisionStatus === 'PENDING').length}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Content View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-hidden">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="fixed bottom-5 right-5 z-50 bg-amber-500 text-slate-950 px-4 py-3 rounded-xl font-bold text-xs shadow-2xl border border-amber-400 animate-bounce">
              ✨ {toastMessage}
            </div>
          )}

          {/* BRIDGE Module Views */}
          {activeTab === 'bridge_overview' && (
            <BridgeOverview
              improvements={bridgeImprovements}
              departments={departments}
              indicators={indicators}
              strategies={strategies}
              currentUser={currentUser}
              onNavigateToTab={(tabKey) => setActiveTab(tabKey)}
              onSelectImprovement={(item) => {
                setSelectedBridgeImprovement(item);
                setIsBridgeDetailOpen(true);
              }}
              onOpenAiSummary={handleOpenBridgeAiSummary}
              onOpenCreateWizard={() => {
                setBridgeEditingImprovement(null);
                setIsBridgeWizardOpen(true);
              }}
              onStartOperation={handleStartBridgeOperation}
              onDeleteImprovement={handleDeleteBridgeImprovement}
              onRenumberImprovements={handleRenumberBridgeImprovements}
            />
          )}

          {activeTab === 'bridge_depts' && (
            <BridgeDeptList
              improvements={bridgeImprovements}
              departments={departments}
              currentUser={currentUser}
              onSelectImprovement={(item) => {
                setSelectedBridgeImprovement(item);
                setIsBridgeDetailOpen(true);
              }}
              onOpenAiSummary={handleOpenBridgeAiSummary}
              onOpenCreateWizard={() => {
                setBridgeEditingImprovement(null);
                setIsBridgeWizardOpen(true);
              }}
              onStartOperation={handleStartBridgeOperation}
              onDeleteImprovement={handleDeleteBridgeImprovement}
            />
          )}

          {activeTab === 'bridge_my_tasks' && (
            <BridgeMyTasks
              improvements={bridgeImprovements}
              currentUser={currentUser}
              onSelectImprovement={(item) => {
                setSelectedBridgeImprovement(item);
                setIsBridgeDetailOpen(true);
              }}
              onOpenReportModal={(item) => {
                setSelectedBridgeImprovement(item);
                setActiveTab('bridge_progress');
              }}
              onOpenEditModal={(item) => {
                setBridgeEditingImprovement(item);
                setIsBridgeWizardOpen(true);
              }}
            />
          )}

          {activeTab === 'bridge_progress' && (
            <BridgeProgressTracker
              improvements={bridgeImprovements}
              currentUser={currentUser}
              onSelectImprovement={(item) => {
                setSelectedBridgeImprovement(item);
                setIsBridgeDetailOpen(true);
              }}
              onOpenAiSummary={handleOpenBridgeAiSummary}
              onRefresh={fetchAllData}
            />
          )}

          {activeTab === 'bridge_decisions' && (
            <BridgeExecutiveDecisions
              decisions={bridgeDecisions}
              improvements={bridgeImprovements}
              currentUser={currentUser}
              onSelectImprovement={(item) => {
                setSelectedBridgeImprovement(item);
                setIsBridgeDetailOpen(true);
              }}
              onRefresh={fetchAllData}
            />
          )}

          {activeTab === 'bridge_innovations' && (
            <BridgeInnovationsBestPractices
              improvements={bridgeImprovements}
              currentUser={currentUser}
              onSelectImprovement={(item) => {
                setSelectedBridgeImprovement(item);
                setIsBridgeDetailOpen(true);
              }}
            />
          )}

          {activeTab === 'bridge_reports' && (
            <BridgeReports
              improvements={bridgeImprovements}
              departments={departments}
              indicators={indicators}
              personnelList={personnelList}
              users={users}
              decisions={bridgeDecisions}
              currentUser={currentUser}
              selectedYear={selectedYear}
              onSelectImprovement={(item) => {
                setSelectedBridgeImprovement(item);
                setIsBridgeDetailOpen(true);
              }}
            />
          )}

          {activeTab === 'bridge_settings' && (
            <BridgeSettings currentUser={currentUser} />
          )}

          {activeTab === 'dashboard' && (
            <ExecutiveDashboard
              indicators={indicators}
              monthlyProgressList={monthlyProgressList}
              strategies={strategies}
              departments={departments}
              systemConfig={systemConfig}
              targets={targets}
              selectedYear={selectedYear}
              onSelectTab={setActiveTab}
            />
          )}

          {activeTab === 'cockpit' && (
            <ManagementCockpit
              indicators={indicators}
              monthlyProgressList={monthlyProgressList}
              directives={directives}
              departments={departments}
              currentUser={currentUser}
              onCreateDirective={handleCreateDirective}
              onUpdateDirectiveStatus={handleUpdateDirectiveStatus}
            />
          )}

          {activeTab === 'indicators' && (
            <IndicatorMaster
              indicators={indicators}
              strategies={strategies}
              departments={departments}
              personnel={personnelList}
              currentUser={currentUser}
              onCreateIndicator={handleCreateIndicator}
              onUpdateIndicator={handleUpdateIndicator}
              onDeleteIndicator={handleDeleteIndicator}
            />
          )}

          {activeTab === 'targets' && (
            <TargetManager
              indicators={indicators}
              targets={targets}
              selectedYear={selectedYear}
              onSaveTarget={handleSaveTarget}
            />
          )}

          {activeTab === 'progress' && (
            <MonthlyProgressLogger
              indicators={indicators}
              targets={targets}
              monthlyProgressList={monthlyProgressList}
              evidenceList={evidenceList}
              systemConfig={systemConfig}
              selectedYear={selectedYear}
              currentUser={currentUser}
              onSaveProgress={handleSaveProgress}
              onUnlockProgress={handleUnlockProgress}
              onCreateEvidence={handleCreateEvidence}
            />
          )}

          {activeTab === 'verification' && (
            <VerificationWorkflow
              indicators={indicators}
              monthlyProgressList={monthlyProgressList}
              evidenceList={evidenceList}
              currentUser={currentUser}
              onVerifyProgress={handleVerifyProgress}
              onUnlockProgress={handleUnlockProgress}
            />
          )}

          {activeTab === 'evidence' && (
            <EvidenceDrive
              evidenceList={evidenceList}
              indicators={indicators}
              onDeleteEvidence={handleDeleteEvidence}
            />
          )}

          {activeTab === 'directives' && (
            <ActionDirectivesView
              directives={directives}
              currentUser={currentUser}
              onUpdateDirectiveStatus={handleUpdateDirectiveStatus}
            />
          )}

          {activeTab === 'ai_insight' && (
            <AiInsightView
              indicators={indicators}
              monthlyProgressList={monthlyProgressList}
              selectedYear={selectedYear}
            />
          )}

          {activeTab === 'reports' && (
            <MonthlyReportsView
              reports={reports}
              indicators={indicators}
              monthlyProgressList={monthlyProgressList}
              selectedYear={selectedYear}
              onGenerateReport={handleGenerateReport}
            />
          )}

          {activeTab === 'workspace' && (
            <GoogleWorkspaceTools
              googleUser={googleUser}
              currentUser={currentUser}
              indicators={indicators}
              onLoginSuccess={(u) => setGoogleUser(u)}
            />
          )}

          {activeTab === 'settings' && (
            <SystemSettingsView
              systemConfig={systemConfig}
              users={users}
              currentUser={currentUser}
              departments={departments}
              strategies={strategies}
              personnel={personnelList}
              indicators={indicators}
              selectedYear={selectedYear}
              onSelectYear={setSelectedYear}
              onUpdateConfig={handleUpdateConfig}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onCreateStrategy={handleCreateStrategy}
              onUpdateStrategy={handleUpdateStrategy}
              onDeleteStrategy={handleDeleteStrategy}
              onCopyStrategies={handleCopyStrategies}
              onCreatePersonnel={handleCreatePersonnel}
              onUpdatePersonnel={handleUpdatePersonnel}
              onDeletePersonnel={handleDeletePersonnel}
              onCreateDepartment={handleCreateDepartment}
              onUpdateDepartment={handleUpdateDepartment}
              onDeleteDepartment={handleDeleteDepartment}
              onMigrateDepartments={handleMigrateDepartments}
              onMapIndicatorDepartment={handleMapIndicatorDepartment}
              onBatchMapIndicators={handleBatchMapIndicators}
              onSystemResetSuccess={fetchAllData}
              onRollbackSuccess={fetchAllData}
            />
          )}

          {activeTab === 'logs' && (
            <ActivityLogsView
              logs={logs}
              userRole={currentUser.role}
              onClearLogs={handleClearLogs}
              onDeleteLog={handleDeleteLog}
              onDeleteMultipleLogs={handleDeleteMultipleLogs}
            />
          )}

          {activeTab === 'trash' && (
            <TrashView
              onRestoreIndicator={handleRestoreIndicator}
              onRefreshData={fetchAllData}
            />
          )}

          {activeTab === 'manual' && (
            <UserManualView />
          )}
        </main>
      </div>

      {/* BRIDGE Improvement Creation / Edit Wizard Modal */}
      <BridgeWizardModal
        isOpen={isBridgeWizardOpen}
        onClose={() => {
          setIsBridgeWizardOpen(false);
          setBridgeEditingImprovement(null);
        }}
        onSaveSuccess={() => {
          setIsBridgeWizardOpen(false);
          setBridgeEditingImprovement(null);
          fetchAllData();
          showToast('บันทึกประเด็นปรับปรุงงาน BRIDGE เรียบร้อยแล้ว');
        }}
        departments={departments}
        indicators={indicators}
        strategies={strategies}
        personnel={personnelList}
        users={users}
        currentUser={currentUser}
        initialData={bridgeEditingImprovement}
      />

      {/* BRIDGE Improvement Detail Modal */}
      <BridgeDetailModal
        isOpen={isBridgeDetailOpen}
        onClose={() => {
          setIsBridgeDetailOpen(false);
          setSelectedBridgeImprovement(null);
        }}
        item={selectedBridgeImprovement}
        currentUser={currentUser}
        onOpenEdit={(item) => {
          setIsBridgeDetailOpen(false);
          setBridgeEditingImprovement(item);
          setIsBridgeWizardOpen(true);
        }}
        onOpenProgress={(item) => {
          setIsBridgeDetailOpen(false);
          setSelectedBridgeImprovement(item);
          setActiveTab('bridge_progress');
        }}
        onOpenAiSummary={(item) => {
          handleOpenBridgeAiSummary(item);
        }}
        onDelete={handleDeleteBridgeImprovement}
        onStartOperation={handleStartBridgeOperation}
      />

      {/* BRIDGE Issue AI Executive Summary Modal */}
      <BridgeIssueAiSummaryModal
        isOpen={isBridgeAiSummaryOpen}
        onClose={() => {
          setIsBridgeAiSummaryOpen(false);
          setBridgeAiSummaryTarget(null);
        }}
        item={bridgeAiSummaryTarget}
        currentUser={currentUser}
        onUpdateImprovement={(updated) => {
          setBridgeImprovements((prev) =>
            prev.map((it) => (it.id === updated.id ? updated : it))
          );
          if (selectedBridgeImprovement?.id === updated.id) {
            setSelectedBridgeImprovement(updated);
          }
        }}
      />
    </div>
  );
}

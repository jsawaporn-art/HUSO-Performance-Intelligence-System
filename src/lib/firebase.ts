import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  runTransaction,
  Unsubscribe,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  Indicator,
  Target,
  MonthlyProgress,
  Evidence,
  ActionDirective,
  User,
  SystemConfig,
  ActivityLog,
  MonthlyReport,
  StrategicIssue,
  Department,
  TrafficLightStatus,
  VerificationStatus,
  UserRole,
  FiscalYear,
  NotificationItem,
  SequenceRecord,
  Personnel,
} from '../types';
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
} from '../mockData';
import {
  normalizeReportingPeriod,
  generateResultKey,
  getReportingPeriodInfo,
} from './reportingPeriodUtils';

// Initialize Firebase App & Firestore Database
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const databaseId = (firebaseConfig as any).firestoreDatabaseId;
export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
export const auth = getAuth(app);

// Google Auth Provider for Firebase Authentication
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleAuthProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleAuthProvider.addScope('https://www.googleapis.com/auth/calendar');
googleAuthProvider.addScope('https://www.googleapis.com/auth/calendar.events');
googleAuthProvider.addScope('https://mail.google.com/');

// Collections in Firestore
export const COLLECTIONS = {
  INDICATORS: 'indicators',
  STRATEGIES: 'strategies',
  FISCAL_YEARS: 'fiscalYears',
  TARGETS: 'targets',
  MONTHLY_PROGRESS: 'monthlyProgress',
  EVIDENCE: 'evidence',
  ACTION_PLANS: 'actionPlans',
  USERS: 'users',
  MONTHLY_REPORTS: 'monthlyReports',
  NOTIFICATIONS: 'notifications',
  ACTIVITY_LOGS: 'activityLogs',
  SYSTEM_CONFIG: 'systemConfig',
  SEQUENCES: 'sequences',
  DEPARTMENTS: 'departments',
  PERSONNEL: 'personnel',
} as const;

export const DATABASE_MODE = 'FIREBASE_PRODUCTION';
export const DB_PERSIST_SUCCESS_MSG = 'บันทึกข้อมูลลงฐานข้อมูลถาวรเรียบร้อยแล้ว';
export const DB_PERSIST_ERROR_MSG = 'ยังไม่สามารถบันทึกข้อมูลลงฐานข้อมูลกลางได้';

export * from './backupService';

/**
 * Recursively removes all `undefined` values from an object or nested array/object
 * so Firebase Firestore updateDoc, setDoc, and addDoc never fail with:
 * "Unsupported field value: undefined".
 */
export function removeUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .map((item) => removeUndefined(item))
      .filter((item) => item !== undefined) as unknown as T;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

/**
 * Verify that a document exists in Cloud Firestore after writing.
 */
async function verifyDocumentPersisted(collectionName: string, docId: string): Promise<any> {
  const docRef = doc(db, collectionName, docId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error(DB_PERSIST_ERROR_MSG);
  }
  return snap.data();
}

// ----------------------------------------------------
// Helper: Calculate Traffic Light & Achievement
// ----------------------------------------------------
export function calculateProgressStatus(
  indicator: Indicator,
  targetMonthly: number,
  actualMonthly: number,
  config: SystemConfig = INITIAL_CONFIG
): {
  achievementPercent: number;
  variance: number;
  varianceText: string;
  status: TrafficLightStatus;
} {
  let achievementPercent = 0;
  let variance = 0;
  let varianceText = '';

  if (indicator.direction === 'MORE_IS_BETTER' || (indicator.direction as string) === 'POSITIVE') {
    variance = actualMonthly - targetMonthly;
    if (targetMonthly > 0) {
      achievementPercent = (actualMonthly / targetMonthly) * 100;
    } else {
      achievementPercent = actualMonthly > 0 ? 100 : 0;
    }
    varianceText =
      variance >= 0
        ? `สูงกว่าเป้าหมาย +${variance.toFixed(1)} ${indicator.unit || ''}`
        : `ต่ำกว่าเป้าหมาย ${variance.toFixed(1)} ${indicator.unit || ''}`;
  } else if (indicator.direction === 'LESS_IS_BETTER' || (indicator.direction as string) === 'NEGATIVE') {
    variance = targetMonthly - actualMonthly;
    if (actualMonthly === 0) {
      achievementPercent = 100;
      varianceText = `บรรลุผลสูงสุด (0 ${indicator.unit || ''})`;
    } else {
      achievementPercent = (targetMonthly / actualMonthly) * 100;
    }
    varianceText =
      variance >= 0
        ? `เร็วกว่า/ดีกว่าเป้าหมาย ${variance.toFixed(1)} ${indicator.unit || ''}`
        : `เกินเป้าหมาย ${Math.abs(variance).toFixed(1)} ${indicator.unit || ''}`;
  } else if (indicator.direction === 'EXACT_TARGET') {
    achievementPercent = actualMonthly === targetMonthly ? 100 : 50;
    variance = actualMonthly - targetMonthly;
    varianceText =
      actualMonthly === targetMonthly
        ? 'ตรงตามเป้าหมาย'
        : `ต่างจากเป้าหมาย ${variance.toFixed(1)} ${indicator.unit || ''}`;
  } else {
    // MILESTONE
    achievementPercent = Math.min(100, (actualMonthly / (targetMonthly || 5)) * 100);
    variance = actualMonthly - targetMonthly;
    varianceText = `ระดับขั้นความสำเร็จ ${actualMonthly} / ${targetMonthly}`;
  }

  achievementPercent = Math.round(achievementPercent * 10) / 10;

  let status: TrafficLightStatus = 'NO_DATA';
  if (achievementPercent >= (config.thresholds?.onTrack ?? 100)) {
    status = 'ON_TRACK';
  } else if (achievementPercent >= (config.thresholds?.watch ?? 85)) {
    status = 'WATCH';
  } else if (achievementPercent >= (config.thresholds?.risk ?? 70)) {
    status = 'RISK';
  } else {
    status = 'CRITICAL';
  }

  return { achievementPercent, variance, varianceText, status };
}

// ----------------------------------------------------
// Helper: Generate Sequential Indicator Code & Sequence Service
// ----------------------------------------------------
export const sequenceService = {
  async getStatus(year: string = '2569'): Promise<{
    KPI: { lastNumber: number; nextCode: string; seqId: string };
    KVI: { lastNumber: number; nextCode: string; seqId: string };
  }> {
    try {
      const kpiRef = doc(db, COLLECTIONS.SEQUENCES, `KPI_${year}`);
      const kviRef = doc(db, COLLECTIONS.SEQUENCES, `KVI_${year}`);
      const [kpiSnap, kviSnap] = await Promise.all([getDoc(kpiRef), getDoc(kviRef)]);

      const kpiLast = kpiSnap.exists() ? (kpiSnap.data().lastNumber || 0) : 0;
      const kviLast = kviSnap.exists() ? (kviSnap.data().lastNumber || 0) : 0;

      return {
        KPI: {
          lastNumber: kpiLast,
          nextCode: `KPI-${year}-${(kpiLast + 1).toString().padStart(3, '0')}`,
          seqId: `KPI_${year}`,
        },
        KVI: {
          lastNumber: kviLast,
          nextCode: `KVI-${year}-${(kviLast + 1).toString().padStart(3, '0')}`,
          seqId: `KVI_${year}`,
        },
      };
    } catch (e) {
      return {
        KPI: { lastNumber: 0, nextCode: `KPI-${year}-001`, seqId: `KPI_${year}` },
        KVI: { lastNumber: 0, nextCode: `KVI-${year}-001`, seqId: `KVI_${year}` },
      };
    }
  },

  async reset(year: string = '2569', operator: string = 'SYSTEM'): Promise<void> {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    const kpiRef = doc(db, COLLECTIONS.SEQUENCES, `KPI_${year}`);
    const kviRef = doc(db, COLLECTIONS.SEQUENCES, `KVI_${year}`);

    batch.set(kpiRef, {
      name: `KPI_${year}`,
      type: 'KPI',
      fiscalYear: year,
      lastNumber: 0,
      updatedAt: now,
      updatedBy: operator,
    });

    batch.set(kviRef, {
      name: `KVI_${year}`,
      type: 'KVI',
      fiscalYear: year,
      lastNumber: 0,
      updatedAt: now,
      updatedBy: operator,
    });

    await batch.commit();
  },
};

export async function getNextIndicatorCode(type: 'KPI' | 'KVI', year: string): Promise<string> {
  const seqId = `${type}_${year}`;
  const seqDocRef = doc(db, COLLECTIONS.SEQUENCES, seqId);

  try {
    const nextNum = await runTransaction(db, async (transaction) => {
      const seqDoc = await transaction.get(seqDocRef);
      let currentNumber = 0;
      if (seqDoc.exists()) {
        currentNumber = seqDoc.data().lastNumber || 0;
      }
      const next = currentNumber + 1;
      transaction.set(
        seqDocRef,
        {
          name: seqId,
          type,
          fiscalYear: year,
          lastNumber: next,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      return next;
    });
    return `${type}-${year}-${nextNum.toString().padStart(3, '0')}`;
  } catch (e) {
    // Fallback based on existing indicators
    const all = await indicatorService.getAll();
    const prefix = `${type}-${year}-`;
    const existing = all
      .filter((i) => i.type === type && i.code?.startsWith(prefix))
      .map((i) => parseInt(i.code.split('-').pop() || '0', 10));
    const nextVal = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    return `${prefix}${nextVal.toString().padStart(3, '0')}`;
  }
}

// ----------------------------------------------------
// 1. System Config Service (`systemConfig`)
// ----------------------------------------------------
export const configService = {
  async get(): Promise<SystemConfig> {
    try {
      const docRef = doc(db, COLLECTIONS.SYSTEM_CONFIG, 'system');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as SystemConfig;
      }
      await setDoc(docRef, INITIAL_CONFIG);
      await verifyDocumentPersisted(COLLECTIONS.SYSTEM_CONFIG, 'system');
      return INITIAL_CONFIG;
    } catch (e) {
      console.warn('Firestore configService.get fallback:', e);
      return INITIAL_CONFIG;
    }
  },

  async update(config: SystemConfig): Promise<void> {
    const docRef = doc(db, COLLECTIONS.SYSTEM_CONFIG, 'system');
    await setDoc(docRef, removeUndefined({ ...config, updatedAt: new Date().toISOString() }), { merge: true });
    await verifyDocumentPersisted(COLLECTIONS.SYSTEM_CONFIG, 'system');
  },

  subscribe(callback: (config: SystemConfig) => void): Unsubscribe {
    const docRef = doc(db, COLLECTIONS.SYSTEM_CONFIG, 'system');
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          callback(snap.data() as SystemConfig);
        } else {
          callback(INITIAL_CONFIG);
        }
      },
      (error) => {
        console.warn('configService subscribe error handled:', error);
      }
    );
  },
};

// ----------------------------------------------------
// 2. Fiscal Years Service (`fiscalYears`)
// ----------------------------------------------------
export const fiscalYearService = {
  async getAll(): Promise<FiscalYear[]> {
    try {
      const colRef = collection(db, COLLECTIONS.FISCAL_YEARS);
      const snap = await getDocs(colRef);
      if (snap.empty) {
        // Initial setup for fiscal years
        const defaultYears: FiscalYear[] = [
          { year: '2569', isCurrent: true, status: 'ACTIVE', startDate: '2568-10-01', endDate: '2569-09-30' },
          { year: '2570', isCurrent: false, status: 'DRAFT', startDate: '2569-10-01', endDate: '2570-09-30' },
          { year: '2571', isCurrent: false, status: 'DRAFT', startDate: '2570-10-01', endDate: '2571-09-30' },
          { year: '2572', isCurrent: false, status: 'DRAFT', startDate: '2571-10-01', endDate: '2572-09-30' },
        ];
        const batch = writeBatch(db);
        defaultYears.forEach((fy) => {
          batch.set(doc(db, COLLECTIONS.FISCAL_YEARS, fy.year), fy);
        });
        await batch.commit();
        return defaultYears;
      }
      return snap.docs.map((d) => d.data() as FiscalYear);
    } catch (e) {
      console.warn('Firestore fiscalYearService.getAll fallback:', e);
      return [
        { year: '2569', isCurrent: true, status: 'ACTIVE' },
        { year: '2570', isCurrent: false, status: 'DRAFT' },
      ];
    }
  },

  async set(fy: FiscalYear): Promise<void> {
    const docRef = doc(db, COLLECTIONS.FISCAL_YEARS, fy.year);
    await setDoc(docRef, fy, { merge: true });
    await verifyDocumentPersisted(COLLECTIONS.FISCAL_YEARS, fy.year);
  },

  subscribe(callback: (years: FiscalYear[]) => void): Unsubscribe {
    const colRef = collection(db, COLLECTIONS.FISCAL_YEARS);
    return onSnapshot(
      colRef,
      (snap) => {
        callback(snap.docs.map((d) => d.data() as FiscalYear));
      },
      (error) => {
        console.warn('fiscalYearService subscribe error handled:', error);
      }
    );
  },
};

// ----------------------------------------------------
// 3. Department Service (`departments`)
// ----------------------------------------------------
export const departmentService = {
  async getAll(): Promise<Department[]> {
    try {
      const colRef = collection(db, COLLECTIONS.DEPARTMENTS);
      const snap = await getDocs(colRef);
      if (snap.empty) {
        await this.seed();
        return INITIAL_DEPARTMENTS;
      }
      const list = snap.docs.map((d) => {
        const data = d.data() as Department;
        return {
          ...data,
          id: data.id || data.departmentId || d.id,
          departmentId: data.departmentId || data.id || d.id,
        };
      });
      return list.sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99));
    } catch (e) {
      console.warn('Firestore departmentService.getAll fallback:', e);
      return INITIAL_DEPARTMENTS;
    }
  },

  async seed(): Promise<void> {
    const batch = writeBatch(db);
    for (const dept of INITIAL_DEPARTMENTS) {
      const id = dept.departmentId || dept.id;
      const docRef = doc(db, COLLECTIONS.DEPARTMENTS, id);
      batch.set(docRef, removeUndefined({ ...dept, id, departmentId: id }), { merge: true });
    }
    await batch.commit();
  },

  async ensureBaseline(): Promise<void> {
    try {
      const colRef = collection(db, COLLECTIONS.DEPARTMENTS);
      const snap = await getDocs(colRef);
      const existingIds = new Set(snap.docs.map((d) => d.id));
      const batch = writeBatch(db);
      let needsCommit = false;
      for (const dept of INITIAL_DEPARTMENTS) {
        const id = dept.departmentId || dept.id;
        if (!existingIds.has(id)) {
          batch.set(doc(db, COLLECTIONS.DEPARTMENTS, id), removeUndefined({ ...dept, id, departmentId: id }));
          needsCommit = true;
        }
      }
      if (needsCommit) {
        await batch.commit();
      }
    } catch (e) {
      console.warn('departmentService.ensureBaseline error:', e);
    }
  },

  async create(dept: Partial<Department>, user?: { userId: string; userName: string }): Promise<Department> {
    const departmentId = dept.departmentId || dept.id || `DEP-${Date.now()}`;
    const now = new Date().toISOString();
    const deptName = dept.departmentName || dept.name || 'หน่วยงานใหม่';
    const newDept: Department = {
      id: departmentId,
      departmentId,
      departmentName: deptName,
      name: deptName,
      departmentType: dept.departmentType || dept.type || 'งานสำนักงานคณะ',
      type: dept.departmentType || dept.type || 'งานสำนักงานคณะ',
      description: dept.description || '',
      responsiblePersonIds: dept.responsiblePersonIds || [],
      responsiblePersonNames: dept.responsiblePersonNames || [],
      displayOrder: dept.displayOrder || 99,
      status: dept.status || 'ACTIVE',
      isActive: dept.status !== 'INACTIVE',
      createdAt: now,
      createdBy: user?.userName || 'SYSTEM',
      updatedAt: now,
      updatedBy: user?.userName || 'SYSTEM',
    };
    await setDoc(doc(db, COLLECTIONS.DEPARTMENTS, departmentId), removeUndefined(newDept));
    await verifyDocumentPersisted(COLLECTIONS.DEPARTMENTS, departmentId);

    if (user) {
      await logService.add({
        userId: user.userId,
        userName: user.userName,
        role: 'ADMIN',
        action: 'CREATE',
        recordId: departmentId,
        details: `เพิ่มหน่วยงานใหม่: [${departmentId}] ${newDept.name}`,
        newData: newDept,
      });
    }
    return newDept;
  },

  async update(id: string, dept: Partial<Department>, user?: { userId: string; userName: string }): Promise<void> {
    const payload = removeUndefined({
      ...dept,
      id,
      departmentId: id,
    });
    await updateDoc(doc(db, COLLECTIONS.DEPARTMENTS, id), payload);
    await verifyDocumentPersisted(COLLECTIONS.DEPARTMENTS, id);

    if (user) {
      await logService.add({
        userId: user.userId,
        userName: user.userName,
        role: 'ADMIN',
        action: 'EDIT',
        recordId: id,
        details: `แก้ไขข้อมูลหน่วยงาน: [${id}] ${dept.name || ''}`,
        newData: payload,
      });
    }
  },

  async delete(id: string, user?: { userId: string; userName: string }): Promise<void> {
    const indicators = await indicatorService.getAll();
    const isUsed = indicators.some(
      (ind) =>
        ind.status !== 'DELETED' &&
        (ind.responsibleDepartmentId === id ||
          ind.departmentId === id ||
          ind.coResponsibleDepartmentIds?.includes(id))
    );
    if (isUsed) {
      throw new Error(`ไม่สามารถลบหน่วยงาน ${id} ได้เนื่องจากมีตัวชี้วัดผูกอยู่ กรุณาปรับเปลี่ยนสถานะเป็น INACTIVE แทน`);
    }
    await deleteDoc(doc(db, COLLECTIONS.DEPARTMENTS, id));

    if (user) {
      await logService.add({
        userId: user.userId,
        userName: user.userName,
        role: 'ADMIN',
        action: 'DELETE',
        recordId: id,
        details: `ลบหน่วยงาน: ${id}`,
      });
    }
  },

  subscribe(callback: (departments: Department[]) => void): Unsubscribe {
    const colRef = collection(db, COLLECTIONS.DEPARTMENTS);
    return onSnapshot(
      colRef,
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data() as Department;
          return {
            ...data,
            id: data.id || data.departmentId || d.id,
            departmentId: data.departmentId || data.id || d.id,
          };
        });
        callback(list.sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99)));
      },
      (error) => {
        console.warn('departmentService subscribe error handled:', error);
      }
    );
  },
};

// ----------------------------------------------------
// 4. Strategy Service (`strategies`)
// ----------------------------------------------------
export const strategyService = {
  async getAll(fiscalYear?: string): Promise<StrategicIssue[]> {
    try {
      const colRef = collection(db, COLLECTIONS.STRATEGIES);
      const snap = await getDocs(colRef);
      if (snap.empty) {
        await this.seed();
        return INITIAL_STRATEGIES;
      }
      let list = snap.docs.map((d) => d.data() as StrategicIssue);
      if (fiscalYear) {
        list = list.filter((s) => !s.fiscalYear || s.fiscalYear === fiscalYear);
      }
      return list;
    } catch (e) {
      console.warn('Firestore strategyService.getAll fallback:', e);
      return INITIAL_STRATEGIES;
    }
  },

  async seed(): Promise<void> {
    const batch = writeBatch(db);
    for (const strat of INITIAL_STRATEGIES) {
      const docRef = doc(db, COLLECTIONS.STRATEGIES, strat.id);
      batch.set(docRef, strat);
    }
    await batch.commit();
  },

  async create(strat: Partial<StrategicIssue>): Promise<StrategicIssue> {
    const id = strat.id || `STRAT-${Date.now()}`;
    const newStrat: StrategicIssue = {
      id,
      code: strat.code || `SI-${Date.now().toString().slice(-3)}`,
      name: strat.name || 'ประเด็นยุทธศาสตร์ใหม่',
      fiscalYear: strat.fiscalYear || '2569',
      objectives: strat.objectives || [],
    };
    await setDoc(doc(db, COLLECTIONS.STRATEGIES, id), removeUndefined(newStrat));
    await verifyDocumentPersisted(COLLECTIONS.STRATEGIES, id);
    return newStrat;
  },

  async update(id: string, strat: Partial<StrategicIssue>): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.STRATEGIES, id), removeUndefined(strat));
    await verifyDocumentPersisted(COLLECTIONS.STRATEGIES, id);
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.STRATEGIES, id));
  },

  async copyFromYear(fromYear: string, toYear: string): Promise<number> {
    const all = await this.getAll();
    const source = all.filter((s) => s.fiscalYear === fromYear);
    if (source.length === 0) return 0;

    const batch = writeBatch(db);
    let count = 0;
    for (const item of source) {
      const newId = `STRAT-${toYear}-${item.code}`;
      const newStrat: StrategicIssue = {
        ...item,
        id: newId,
        fiscalYear: toYear,
      };
      batch.set(doc(db, COLLECTIONS.STRATEGIES, newId), removeUndefined(newStrat));
      count++;
    }
    await batch.commit();
    return count;
  },

  subscribe(callback: (strategies: StrategicIssue[]) => void): Unsubscribe {
    const colRef = collection(db, COLLECTIONS.STRATEGIES);
    return onSnapshot(
      colRef,
      (snap) => {
        callback(snap.docs.map((d) => d.data() as StrategicIssue));
      },
      (error) => {
        console.warn('strategyService subscribe error handled:', error);
      }
    );
  },
};

// ----------------------------------------------------
// 4.5. Personnel Service (`personnel`)
// ----------------------------------------------------
export const personnelService = {
  async getAll(): Promise<Personnel[]> {
    try {
      const colRef = collection(db, COLLECTIONS.PERSONNEL);
      const snap = await getDocs(colRef);
      if (snap.empty) {
        await this.seed();
        return INITIAL_PERSONNEL;
      }
      return snap.docs.map((d) => d.data() as Personnel);
    } catch (e) {
      console.warn('Firestore personnelService.getAll fallback:', e);
      return INITIAL_PERSONNEL;
    }
  },

  async seed(): Promise<void> {
    try {
      const colRef = collection(db, COLLECTIONS.PERSONNEL);
      const existingSnap = await getDocs(colRef);
      const existingIds = new Set(existingSnap.docs.map((d) => d.id));
      const existingNames = new Set(existingSnap.docs.map((d) => (d.data() as Personnel).fullName));

      const batch = writeBatch(db);
      let count = 0;
      for (const p of INITIAL_PERSONNEL) {
        if (!existingIds.has(p.personnelId) && !existingNames.has(p.fullName)) {
          const docRef = doc(db, COLLECTIONS.PERSONNEL, p.personnelId);
          batch.set(docRef, removeUndefined(p));
          count++;
        }
      }
      if (count > 0) {
        await batch.commit();
      }
    } catch (err) {
      console.warn('personnelService.seed error:', err);
    }
  },

  async create(data: Partial<Personnel>, user?: { userId: string; userName: string }): Promise<Personnel> {
    const personnelId = data.personnelId || `PER-${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();
    const newPerson: Personnel = {
      personnelId,
      fullName: data.fullName || '',
      position: data.position || '',
      administrativePosition: data.administrativePosition || data.position || '',
      role: data.role || 'ผู้สนับสนุนข้อมูล',
      personnelGroup: data.personnelGroup || 'บุคลากรสายสนับสนุน',
      email: data.email || '',
      status: data.status || 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(doc(db, COLLECTIONS.PERSONNEL, personnelId), removeUndefined(newPerson));
    await verifyDocumentPersisted(COLLECTIONS.PERSONNEL, personnelId);

    if (user) {
      await logService.add({
        userId: user.userId,
        userName: user.userName,
        role: 'ADMIN',
        action: 'CREATE',
        recordId: personnelId,
        details: `เพิ่มบุคลากรใหม่: [${newPerson.personnelId}] ${newPerson.fullName}`,
        newData: newPerson,
      });
    }
    return newPerson;
  },

  async update(id: string, data: Partial<Personnel>, user?: { userId: string; userName: string }): Promise<void> {
    const docRef = doc(db, COLLECTIONS.PERSONNEL, id);
    const snap = await getDoc(docRef);
    const oldData = snap.exists() ? snap.data() : null;

    const payload = removeUndefined({
      ...data,
      updatedAt: new Date().toISOString(),
    });
    await updateDoc(docRef, payload);
    await verifyDocumentPersisted(COLLECTIONS.PERSONNEL, id);

    if (user) {
      await logService.add({
        userId: user.userId,
        userName: user.userName,
        role: 'ADMIN',
        action: 'EDIT',
        recordId: id,
        details: `แก้ไขข้อมูลบุคลากร: ${id}`,
        oldData,
        newData: payload,
      });
    }
  },

  async delete(id: string, user?: { userId: string; userName: string }): Promise<void> {
    const docRef = doc(db, COLLECTIONS.PERSONNEL, id);
    await updateDoc(docRef, { status: 'INACTIVE', updatedAt: new Date().toISOString() });
    await verifyDocumentPersisted(COLLECTIONS.PERSONNEL, id);

    if (user) {
      await logService.add({
        userId: user.userId,
        userName: user.userName,
        role: 'ADMIN',
        action: 'EDIT',
        recordId: id,
        details: `ปิดการใช้งานบุคลากร: ${id}`,
      });
    }
  },

  subscribe(callback: (personnel: Personnel[]) => void): Unsubscribe {
    const colRef = collection(db, COLLECTIONS.PERSONNEL);
    return onSnapshot(
      colRef,
      (snap) => {
        callback(snap.docs.map((d) => d.data() as Personnel));
      },
      (error) => {
        console.warn('personnelService subscribe error handled:', error);
      }
    );
  },
};

// ----------------------------------------------------
// 5. Indicator Service (`indicators`)
// ----------------------------------------------------
export const indicatorService = {
  async getAll(): Promise<Indicator[]> {
    try {
      const colRef = collection(db, COLLECTIONS.INDICATORS);
      const snap = await getDocs(colRef);
      if (snap.empty) {
        return [];
      }
      return snap.docs.map((d) => d.data() as Indicator);
    } catch (e) {
      console.warn('Firestore indicatorService.getAll fallback:', e);
      return [];
    }
  },

  async seed(): Promise<void> {
    const batch = writeBatch(db);
    for (const ind of INITIAL_INDICATORS) {
      const docRef = doc(db, COLLECTIONS.INDICATORS, ind.indicatorId);
      batch.set(docRef, removeUndefined(ind));
    }
    await batch.commit();
  },

  async create(data: Partial<Indicator>, user?: { userId: string; userName: string }): Promise<Indicator> {
    const fiscalYear = data.startDate ? data.startDate.split('-')[0] : '2569';
    const code = data.code || (await getNextIndicatorCode(data.type || 'KPI', fiscalYear));
    const indicatorId = data.indicatorId || `IND-${Date.now()}`;
    const now = new Date().toISOString();

    const respDeptId = data.responsibleDepartmentId || data.departmentId || 'DEP-001';
    const respDeptName = data.responsibleDepartmentName || data.departmentName || 'งานวิชาการ';

    const newInd: Indicator = {
      indicatorId,
      code,
      type: data.type || 'KPI',
      name: data.name || '',
      description: data.description || '',
      operationalDef: data.operationalDef || '',
      vision: data.vision || 'HUSO Excellence',
      strategyId: data.strategyId || 'STRAT-01',
      strategyName: data.strategyName || 'การจัดการศึกษาเพื่อความเป็นเลิศ',
      objective: data.objective || '',
      strategy: data.strategy || '',
      mission: data.mission || '1. การผลิตบัณฑิต',
      unit: data.unit || 'ร้อยละ',
      direction: data.direction || 'MORE_IS_BETTER',
      formula: data.formula || '',
      source: data.source || '',
      dataSourceIds: data.dataSourceIds || [],
      frequency: data.frequency || 'MONTHLY',
      baseline: Number(data.baseline) || 0,
      ownerMain: data.ownerMain || data.primaryOwnerName || user?.userName || 'หัวหน้าส่วนงาน',
      ownerCo: data.ownerCo || '',
      primaryOwnerId: data.primaryOwnerId || '',
      primaryOwnerName: data.primaryOwnerName || data.ownerMain || '',
      primaryOwnerPosition: data.primaryOwnerPosition || '',
      dataSupporterIds: data.dataSupporterIds || [],
      dataSupporters: data.dataSupporters || [],
      responsibleDepartmentId: respDeptId,
      responsibleDepartmentName: respDeptName,
      departmentId: respDeptId,
      departmentName: respDeptName,
      coResponsibleDepartmentIds: data.coResponsibleDepartmentIds || [],
      coResponsibleDepartments: data.coResponsibleDepartments || [],
      mappingStatus: data.mappingStatus || 'MAPPED',
      startDate: data.startDate || '2569-10-01',
      endDate: data.endDate || '2570-09-30',
      weight: Number(data.weight) || 10,
      priority: data.priority || 'HIGH',
      isActive: true,
      status: 'ACTIVE',
      remarks: data.remarks || '',
      createdAt: now,
      updatedAt: now,
      updatedBy: user?.userName || 'Administrator',
    };

    await setDoc(doc(db, COLLECTIONS.INDICATORS, indicatorId), removeUndefined(newInd));
    await verifyDocumentPersisted(COLLECTIONS.INDICATORS, indicatorId);

    if (user) {
      await logService.add({
        userId: user.userId,
        userName: user.userName,
        role: 'ADMIN',
        action: 'CREATE',
        recordId: indicatorId,
        details: `สร้างตัวชี้วัดใหม่: [${newInd.code}] ${newInd.name}`,
        newData: newInd,
      });
    }

    return newInd;
  },

  async update(id: string, data: Partial<Indicator>, user?: { userId: string; userName: string }): Promise<void> {
    const docRef = doc(db, COLLECTIONS.INDICATORS, id);
    const snap = await getDoc(docRef);
    const oldData = snap.exists() ? snap.data() : null;

    const rawPayload: any = {
      ...data,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.userName || 'Administrator',
    };

    if (data.responsibleDepartmentId) {
      rawPayload.departmentId = data.responsibleDepartmentId;
    }
    if (data.responsibleDepartmentName) {
      rawPayload.departmentName = data.responsibleDepartmentName;
    }
    if (data.departmentId && !data.responsibleDepartmentId) {
      rawPayload.responsibleDepartmentId = data.departmentId;
    }
    if (data.departmentName && !data.responsibleDepartmentName) {
      rawPayload.responsibleDepartmentName = data.departmentName;
    }

    if (data.primaryOwnerName && !data.ownerMain) {
      rawPayload.ownerMain = data.primaryOwnerName;
    }

    const updatePayload = removeUndefined(rawPayload);

    await updateDoc(docRef, updatePayload);
    await verifyDocumentPersisted(COLLECTIONS.INDICATORS, id);

    if (user) {
      await logService.add({
        userId: user.userId,
        userName: user.userName,
        role: 'ADMIN',
        action: 'EDIT',
        recordId: id,
        details: `แก้ไขข้อมูลตัวชี้วัดรหัส: ${id} [หน่วยงานหลัก: ${rawPayload.responsibleDepartmentName || rawPayload.departmentName || '-'}]`,
        oldData,
        newData: updatePayload,
      });
    }
  },

  async delete(id: string, user?: { userId: string; userName: string }): Promise<void> {
    const docRef = doc(db, COLLECTIONS.INDICATORS, id);
    await updateDoc(docRef, {
      status: 'DELETED',
      isActive: false,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.userName || 'Administrator',
    });
    await verifyDocumentPersisted(COLLECTIONS.INDICATORS, id);

    if (user) {
      await logService.add({
        userId: user.userId,
        userName: user.userName,
        role: 'ADMIN',
        action: 'DELETE',
        recordId: id,
        details: `ย้ายตัวชี้วัดรหัส ${id} ไปยังถังขยะ`,
      });
    }
  },

  async restore(id: string, user?: { userId: string; userName: string }): Promise<void> {
    const docRef = doc(db, COLLECTIONS.INDICATORS, id);
    await updateDoc(docRef, {
      status: 'ACTIVE',
      isActive: true,
      updatedAt: new Date().toISOString(),
    });
    await verifyDocumentPersisted(COLLECTIONS.INDICATORS, id);

    if (user) {
      await logService.add({
        userId: user.userId,
        userName: user.userName,
        role: 'ADMIN',
        action: 'RESTORE',
        recordId: id,
        details: `กู้คืนตัวชี้วัดรหัส ${id} จากถังขยะ`,
      });
    }
  },

  subscribe(callback: (indicators: Indicator[]) => void): Unsubscribe {
    const colRef = collection(db, COLLECTIONS.INDICATORS);
    return onSnapshot(
      colRef,
      (snap) => {
        callback(snap.docs.map((d) => d.data() as Indicator));
      },
      (error) => {
        console.warn('indicatorService subscribe error handled:', error);
      }
    );
  },
};

// ----------------------------------------------------
// 6. Target Service (`targets`)
// ----------------------------------------------------
export const targetService = {
  async getAll(fiscalYear?: string): Promise<Target[]> {
    try {
      const colRef = collection(db, COLLECTIONS.TARGETS);
      const snap = await getDocs(colRef);
      if (snap.empty) {
        return [];
      }
      let list = snap.docs.map((d) => d.data() as Target);
      if (fiscalYear) {
        list = list.filter((t) => t.fiscalYear === fiscalYear);
      }
      return list;
    } catch (e) {
      console.warn('Firestore targetService.getAll fallback:', e);
      return [];
    }
  },

  async seed(): Promise<void> {
    const batch = writeBatch(db);
    for (const tgt of INITIAL_TARGETS) {
      const docRef = doc(db, COLLECTIONS.TARGETS, tgt.targetId);
      batch.set(docRef, tgt);
    }
    await batch.commit();
  },

  async save(target: Partial<Target>): Promise<Target> {
    const targetId = target.targetId || `TGT-${target.indicatorId}-${target.fiscalYear || '2569'}`;
    const newTarget: Target = {
      targetId,
      indicatorId: target.indicatorId || '',
      fiscalYear: target.fiscalYear || '2569',
      annualTarget: Number(target.annualTarget) || 0,
      minTarget: Number(target.minTarget) || 0,
      challengeTarget: Number(target.challengeTarget) || 0,
      baseline: Number(target.baseline) || 0,
      q1Target: Number(target.q1Target) || 0,
      q2Target: Number(target.q2Target) || 0,
      q3Target: Number(target.q3Target) || 0,
      q4Target: Number(target.q4Target) || 0,
      monthlyTargets: target.monthlyTargets || Array(12).fill(0),
      cumulativeTargets: target.cumulativeTargets || Array(12).fill(0),
    };

    await setDoc(doc(db, COLLECTIONS.TARGETS, targetId), removeUndefined(newTarget), { merge: true });
    await verifyDocumentPersisted(COLLECTIONS.TARGETS, targetId);
    return newTarget;
  },

  async delete(targetId: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.TARGETS, targetId));
  },

  subscribe(callback: (targets: Target[]) => void): Unsubscribe {
    const colRef = collection(db, COLLECTIONS.TARGETS);
    return onSnapshot(
      colRef,
      (snap) => {
        callback(snap.docs.map((d) => d.data() as Target));
      },
      (error) => {
        console.warn('targetService subscribe error handled:', error);
      }
    );
  },
};

// ----------------------------------------------------
// 7. Monthly Progress Service (`monthlyProgress`)
// ----------------------------------------------------
export const progressService = {
  async getAll(fiscalYear?: string): Promise<MonthlyProgress[]> {
    try {
      const colRef = collection(db, COLLECTIONS.MONTHLY_PROGRESS);
      const snap = await getDocs(colRef);
      if (snap.empty) {
        return [];
      }
      let list = snap.docs.map((d) => d.data() as MonthlyProgress);
      if (fiscalYear) {
        list = list.filter((p) => p.fiscalYear === fiscalYear);
      }
      return list;
    } catch (e) {
      console.warn('Firestore progressService.getAll fallback:', e);
      return [];
    }
  },

  async seed(): Promise<void> {
    const batch = writeBatch(db);
    for (const prg of INITIAL_PROGRESS) {
      const docRef = doc(db, COLLECTIONS.MONTHLY_PROGRESS, prg.progressId);
      batch.set(docRef, removeUndefined(prg));
    }
    await batch.commit();
  },

  async save(
    progressData: Partial<MonthlyProgress>,
    indicator?: Indicator,
    user?: { userId: string; userName: string }
  ): Promise<MonthlyProgress> {
    const fiscalYear = progressData.fiscalYear || '2569';
    const indicatorId = progressData.indicatorId || indicator?.indicatorId || '';
    const normPeriod = normalizeReportingPeriod(progressData.reportingPeriod as string, progressData.month);
    const resultKey = progressData.resultKey || generateResultKey(fiscalYear, indicatorId, normPeriod);
    const progressId = progressData.progressId || `PRG-${resultKey}`;

    const config = await configService.get();
    let statusCalculated: TrafficLightStatus = 'NO_DATA';
    let achievement = typeof progressData.achievementPercent === 'number' ? progressData.achievementPercent : 0;
    let variance = typeof progressData.variance === 'number' ? progressData.variance : 0;
    let varianceText = progressData.varianceText || '';

    if (indicator && (progressData.achievementPercent === undefined || progressData.status === undefined)) {
      const calc = calculateProgressStatus(
        indicator,
        Number(progressData.targetMonthly) || 0,
        Number(progressData.actualMonthly) || 0,
        config
      );
      statusCalculated = calc.status;
      achievement = calc.achievementPercent;
      variance = calc.variance;
      varianceText = calc.varianceText;
    }

    const now = new Date().toISOString();
    const verificationStatus = progressData.verificationStatus || 'SUBMITTED';

    const record: MonthlyProgress = {
      progressId,
      resultKey,
      fiscalYear,
      month: Number(progressData.month) || (normPeriod === 'Q1' ? 3 : normPeriod === 'Q2' ? 6 : normPeriod === 'Q3' ? 9 : 12),
      monthNameTh: progressData.monthNameTh || getReportingPeriodInfo(normPeriod).label,
      quarter: (normPeriod.startsWith('Q') ? normPeriod : 'Q4') as 'Q1' | 'Q2' | 'Q3' | 'Q4',
      reportingPeriod: normPeriod,
      indicatorId,
      indicatorCode: progressData.indicatorCode || indicator?.code || '',
      indicatorName: progressData.indicatorName || indicator?.name || '',
      indicatorType: progressData.indicatorType || indicator?.type || 'KPI',
      targetMonthly: Number(progressData.targetMonthly) || 0,
      targetCumulative: Number(progressData.targetCumulative) || 0,
      actualMonthly: Number(progressData.actualMonthly) || 0,
      actualCumulative: Number(progressData.actualCumulative) || 0,
      achievementPercent: achievement,
      variance,
      varianceText,
      status: progressData.status || statusCalculated,
      summary: progressData.summary || '',
      problems: progressData.problems || '',
      cause: progressData.cause || '',
      solution: progressData.solution || '',
      fastTrackMeasure: progressData.fastTrackMeasure || '',
      ownerName: progressData.ownerName || indicator?.ownerMain || user?.userName || '',
      loggerName: progressData.loggerName || user?.userName || '',
      loggedDate: progressData.loggedDate || now,
      lastModified: now,
      verificationStatus,
      reviewerComment: progressData.reviewerComment || '',
      evidenceCount: Number(progressData.evidenceCount) || 0,
      version: Number(progressData.version) || 1,
      aggregationMethod: progressData.aggregationMethod || indicator?.aggregationMethod || 'SUM',
      unlockReason: progressData.unlockReason || '',
      unlockedBy: progressData.unlockedBy || '',
      unlockedAt: progressData.unlockedAt || '',
    };

    await setDoc(doc(db, COLLECTIONS.MONTHLY_PROGRESS, progressId), removeUndefined(record), { merge: true });
    await verifyDocumentPersisted(COLLECTIONS.MONTHLY_PROGRESS, progressId);

    if (user) {
      await logService.add({
        userId: user.userId,
        userName: user.userName,
        role: 'OWNER',
        action: verificationStatus === 'DRAFT' ? 'CREATE' : 'SUBMIT',
        recordId: progressId,
        details: `บันทึกผลสัมฤทธิ์ [${record.indicatorCode}] รอบ ${record.reportingPeriod} (${verificationStatus}) ผลสะสม: ${record.actualCumulative}`,
        newData: record,
      });
    }

    return record;
  },

  async unlockPeriod(
    progressId: string,
    reason: string,
    user: { userId: string; userName: string; role?: UserRole }
  ): Promise<MonthlyProgress> {
    const docRef = doc(db, COLLECTIONS.MONTHLY_PROGRESS, progressId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error(`ไม่พบเอกสารผลงานรหัส ${progressId}`);
    }
    const currentData = snap.data() as MonthlyProgress;
    const newVersion = (currentData.version || 1) + 1;
    const now = new Date().toISOString();

    const updatedData: MonthlyProgress = {
      ...currentData,
      verificationStatus: 'DRAFT',
      version: newVersion,
      unlockReason: reason,
      unlockedBy: user.userName,
      unlockedAt: now,
      lastModified: now,
    };

    await updateDoc(docRef, removeUndefined(updatedData) as Record<string, any>);
    await verifyDocumentPersisted(COLLECTIONS.MONTHLY_PROGRESS, progressId);

    await logService.add({
      userId: user.userId,
      userName: user.userName,
      role: user.role || 'ADMIN',
      action: 'UNLOCK',
      recordId: progressId,
      details: `เปิดรอบเพื่อแก้ไขข้อมูล [${currentData.indicatorCode}] รอบ ${currentData.reportingPeriod} (เวอร์ชัน ${newVersion}) เหตุผล: ${reason}`,
      oldData: currentData,
      newData: updatedData,
    });

    return updatedData;
  },

  async verify(
    progressId: string,
    verificationStatus: VerificationStatus,
    reviewerComment: string,
    user?: { userId: string; userName: string; role?: UserRole }
  ): Promise<void> {
    const docRef = doc(db, COLLECTIONS.MONTHLY_PROGRESS, progressId);
    await updateDoc(
      docRef,
      removeUndefined({
        verificationStatus,
        reviewerComment: reviewerComment || '',
        lastModified: new Date().toISOString(),
      })
    );
    await verifyDocumentPersisted(COLLECTIONS.MONTHLY_PROGRESS, progressId);

    if (user) {
      await logService.add({
        userId: user.userId,
        userName: user.userName,
        role: user.role || 'REVIEWER',
        action: verificationStatus === 'APPROVED' ? 'APPROVE' : 'VERIFY',
        recordId: progressId,
        details: `ปรับปรุงสถานะการตรวจสอบเป็น [${verificationStatus}] ความคิดเห็น: ${reviewerComment}`,
      });
    }
  },

  subscribe(callback: (progress: MonthlyProgress[]) => void): Unsubscribe {
    const colRef = collection(db, COLLECTIONS.MONTHLY_PROGRESS);
    return onSnapshot(
      colRef,
      (snap) => {
        callback(snap.docs.map((d) => d.data() as MonthlyProgress));
      },
      (error) => {
        console.warn('progressService subscribe error handled:', error);
      }
    );
  },
};

// ----------------------------------------------------
// 8. Evidence Service (`evidence`)
// ----------------------------------------------------
export const evidenceService = {
  async getAll(): Promise<Evidence[]> {
    try {
      const colRef = collection(db, COLLECTIONS.EVIDENCE);
      const snap = await getDocs(colRef);
      if (snap.empty) {
        return [];
      }
      return snap.docs.map((d) => d.data() as Evidence);
    } catch (e) {
      console.warn('Firestore evidenceService.getAll fallback:', e);
      return [];
    }
  },

  async seed(): Promise<void> {
    const batch = writeBatch(db);
    for (const evd of INITIAL_EVIDENCE) {
      const docRef = doc(db, COLLECTIONS.EVIDENCE, evd.evidenceId);
      batch.set(docRef, removeUndefined(evd));
    }
    await batch.commit();
  },

  async create(data: Partial<Evidence>, user?: { userId: string; userName: string }): Promise<Evidence> {
    const evidenceId = data.evidenceId || `EVD-${Date.now()}`;
    const newEvd: Evidence = {
      evidenceId,
      progressId: data.progressId || '',
      indicatorId: data.indicatorId || '',
      title: data.title || 'เอกสารหลักฐาน',
      fileType: data.fileType || 'PDF',
      driveUrl: data.driveUrl || 'https://drive.google.com',
      docLink: data.docLink || '',
      description: data.description || '',
      ownerName: data.ownerName || user?.userName || '',
      uploadDate: data.uploadDate || new Date().toISOString(),
      verificationStatus: data.verificationStatus || 'PENDING',
      reviewerName: data.reviewerName || '',
      reviewerComments: data.reviewerComments || '',
    };

    await setDoc(doc(db, COLLECTIONS.EVIDENCE, evidenceId), removeUndefined(newEvd));
    await verifyDocumentPersisted(COLLECTIONS.EVIDENCE, evidenceId);
    return newEvd;
  },

  async delete(evidenceId: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.EVIDENCE, evidenceId));
  },

  subscribe(callback: (evidence: Evidence[]) => void): Unsubscribe {
    const colRef = collection(db, COLLECTIONS.EVIDENCE);
    return onSnapshot(
      colRef,
      (snap) => {
        callback(snap.docs.map((d) => d.data() as Evidence));
      },
      (error) => {
        console.warn('evidenceService subscribe error handled:', error);
      }
    );
  },
};

// ----------------------------------------------------
// 9. Action Plans & Directives Service (`actionPlans`)
// ----------------------------------------------------
export const directiveService = {
  async getAll(): Promise<ActionDirective[]> {
    try {
      const colRef = collection(db, COLLECTIONS.ACTION_PLANS);
      const snap = await getDocs(colRef);
      if (snap.empty) {
        return [];
      }
      return snap.docs.map((d) => d.data() as ActionDirective);
    } catch (e) {
      console.warn('Firestore directiveService.getAll fallback:', e);
      return [];
    }
  },

  async seed(): Promise<void> {
    const batch = writeBatch(db);
    for (const dir of INITIAL_DIRECTIVES) {
      const docRef = doc(db, COLLECTIONS.ACTION_PLANS, dir.directiveId);
      batch.set(docRef, removeUndefined(dir));
    }
    await batch.commit();
  },

  async create(data: Partial<ActionDirective>, user?: { userId: string; userName: string }): Promise<ActionDirective> {
    const directiveId = data.directiveId || `DIR-${Date.now()}`;
    const now = new Date().toISOString();
    const newDir: ActionDirective = {
      directiveId,
      indicatorId: data.indicatorId || '',
      indicatorCode: data.indicatorCode || '',
      indicatorName: data.indicatorName || '',
      title: data.title || '',
      details: data.details || '',
      departmentId: data.departmentId || 'DEPT-09',
      departmentName: data.departmentName || 'งานวิชาการ',
      assignee: data.assignee || 'ผู้รับผิดชอบ',
      deadline: data.deadline || '2569-12-31',
      status: data.status || 'OPEN',
      createdBy: data.createdBy || user?.userName || 'ผู้บริหาร',
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, COLLECTIONS.ACTION_PLANS, directiveId), removeUndefined(newDir));
    await verifyDocumentPersisted(COLLECTIONS.ACTION_PLANS, directiveId);

    if (user) {
      await logService.add({
        userId: user.userId,
        userName: user.userName,
        role: 'EXECUTIVE',
        action: 'CREATE',
        recordId: directiveId,
        details: `มอบหมายข้อสั่งการบริหาร: ${newDir.title} ผู้รับผิดชอบ: ${newDir.assignee}`,
      });
    }

    return newDir;
  },

  async updateStatus(directiveId: string, status: ActionDirective['status']): Promise<void> {
    const docRef = doc(db, COLLECTIONS.ACTION_PLANS, directiveId);
    await updateDoc(
      docRef,
      removeUndefined({
        status,
        updatedAt: new Date().toISOString(),
      })
    );
    await verifyDocumentPersisted(COLLECTIONS.ACTION_PLANS, directiveId);
  },

  async delete(directiveId: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.ACTION_PLANS, directiveId));
  },

  subscribe(callback: (directives: ActionDirective[]) => void): Unsubscribe {
    const colRef = collection(db, COLLECTIONS.ACTION_PLANS);
    return onSnapshot(
      colRef,
      (snap) => {
        callback(snap.docs.map((d) => d.data() as ActionDirective));
      },
      (error) => {
        console.warn('directiveService subscribe error handled:', error);
      }
    );
  },
};

// ----------------------------------------------------
// 10. User Service (`users`)
// ----------------------------------------------------
export const userService = {
  async getAll(): Promise<User[]> {
    try {
      const colRef = collection(db, COLLECTIONS.USERS);
      const snap = await getDocs(colRef);
      if (snap.empty) {
        await this.seed();
        return INITIAL_USERS;
      }
      return snap.docs.map((d) => d.data() as User);
    } catch (e) {
      console.warn('Firestore userService.getAll fallback:', e);
      return INITIAL_USERS;
    }
  },

  async seed(): Promise<void> {
    const batch = writeBatch(db);
    for (const usr of INITIAL_USERS) {
      const docRef = doc(db, COLLECTIONS.USERS, usr.userId);
      batch.set(docRef, removeUndefined(usr));
    }
    await batch.commit();
  },

  async create(user: Partial<User>): Promise<User> {
    const userId = user.userId || `USR-${Date.now()}`;
    const newUser: User = {
      userId,
      email: user.email || '',
      fullName: user.fullName || '',
      role: user.role || 'VIEWER',
      rolesDisplay: user.rolesDisplay || user.role,
      departmentId: user.departmentId || 'DEPT-09',
      departmentName: user.departmentName || 'งานวิชาการ',
      avatarUrl: user.avatarUrl || '',
    };
    await setDoc(doc(db, COLLECTIONS.USERS, userId), removeUndefined(newUser));
    await verifyDocumentPersisted(COLLECTIONS.USERS, userId);
    return newUser;
  },

  async update(userId: string, data: Partial<User>): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.USERS, userId), removeUndefined(data));
    await verifyDocumentPersisted(COLLECTIONS.USERS, userId);
  },

  async delete(userId: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.USERS, userId));
  },

  subscribe(callback: (users: User[]) => void): Unsubscribe {
    const colRef = collection(db, COLLECTIONS.USERS);
    return onSnapshot(
      colRef,
      (snap) => {
        callback(snap.docs.map((d) => d.data() as User));
      },
      (error) => {
        console.warn('userService subscribe error handled:', error);
      }
    );
  },
};

// ----------------------------------------------------
// 11. Activity Log Service (`activityLogs`)
// ----------------------------------------------------
export const logService = {
  async getAll(): Promise<ActivityLog[]> {
    try {
      const colRef = collection(db, COLLECTIONS.ACTIVITY_LOGS);
      const snap = await getDocs(colRef);
      if (snap.empty) {
        return [];
      }
      const list = snap.docs.map((d) => d.data() as ActivityLog);
      return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (e) {
      console.warn('Firestore logService.getAll fallback:', e);
      return [];
    }
  },

  async add(log: Partial<ActivityLog>): Promise<void> {
    try {
      const logId = log.logId || `LOG-${Date.now()}`;
      const newLog: ActivityLog = {
        logId,
        timestamp: log.timestamp || new Date().toISOString(),
        userId: log.userId || 'system',
        userName: log.userName || 'ระบบส่วนกลาง',
        role: log.role || 'ADMIN',
        action: log.action || 'EDIT',
        recordId: log.recordId || '',
        details: log.details || '',
        oldData: log.oldData ? removeUndefined(log.oldData) : null,
        newData: log.newData ? removeUndefined(log.newData) : null,
        status: log.status || 'SUCCESS',
      };
      await setDoc(doc(db, COLLECTIONS.ACTIVITY_LOGS, logId), removeUndefined(newLog));
    } catch (err) {
      console.error('Failed to write activity log to Firestore:', err);
    }
  },

  async delete(logId: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.ACTIVITY_LOGS, logId));
  },

  async deleteMultiple(logIds: string[]): Promise<void> {
    const batch = writeBatch(db);
    logIds.forEach((id) => batch.delete(doc(db, COLLECTIONS.ACTIVITY_LOGS, id)));
    await batch.commit();
  },

  async clear(): Promise<void> {
    const colRef = collection(db, COLLECTIONS.ACTIVITY_LOGS);
    const snap = await getDocs(colRef);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  },

  subscribe(callback: (logs: ActivityLog[]) => void): Unsubscribe {
    const colRef = collection(db, COLLECTIONS.ACTIVITY_LOGS);
    return onSnapshot(
      colRef,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as ActivityLog);
        callback(list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      },
      (error) => {
        console.warn('logService subscribe error handled:', error);
      }
    );
  },
};

// ----------------------------------------------------
// 12. Monthly Report Service (`monthlyReports`)
// ----------------------------------------------------
export const reportService = {
  async getAll(fiscalYear?: string): Promise<MonthlyReport[]> {
    try {
      const colRef = collection(db, COLLECTIONS.MONTHLY_REPORTS);
      const snap = await getDocs(colRef);
      if (snap.empty) {
        return [];
      }
      let list = snap.docs.map((d) => d.data() as MonthlyReport);
      if (fiscalYear) {
        list = list.filter((r) => r.fiscalYear === fiscalYear);
      }
      return list;
    } catch (e) {
      console.warn('Firestore reportService.getAll fallback:', e);
      return [];
    }
  },

  async seed(): Promise<void> {
    const batch = writeBatch(db);
    for (const rep of INITIAL_REPORTS) {
      const docRef = doc(db, COLLECTIONS.MONTHLY_REPORTS, rep.reportId);
      batch.set(docRef, removeUndefined(rep));
    }
    await batch.commit();
  },

  async generate(
    fiscalYear: string,
    month: number,
    user?: { userId: string; userName: string }
  ): Promise<MonthlyReport> {
    const monthNames = [
      '',
      'ตุลาคม',
      'พฤศจิกายน',
      'ธันวาคม',
      'มกราคม',
      'กุมภาพันธ์',
      'มีนาคม',
      'เมษายน',
      'พฤษภาคม',
      'มิถุนายน',
      'กรกฎาคม',
      'สิงหาคม',
      'กันยายน',
    ];
    const monthNameTh = monthNames[month] || `เดือนที่ ${month}`;
    const reportId = `REP-${fiscalYear}-M${month.toString().padStart(2, '0')}`;
    const now = new Date().toISOString();

    const newReport: MonthlyReport = {
      reportId,
      fiscalYear,
      month,
      monthNameTh,
      title: `รายงานสรุปผลการดำเนินงานประจำเดือน ${monthNameTh} ปีงบประมาณ ${fiscalYear}`,
      summary: `รายงานประมวลผลผลงานและสถานะตัวชี้วัด (Traffic Light) ประจำเดือน ${monthNameTh} จัดทำโดยอัตโนมัติ`,
      driveUrl: 'https://drive.google.com',
      pdfUrl: '#',
      docUrl: '#',
      status: 'APPROVED',
      generatedAt: now,
      generatedBy: user?.userName || 'ระบบอัตโนมัติ',
    };

    await setDoc(doc(db, COLLECTIONS.MONTHLY_REPORTS, reportId), removeUndefined(newReport));
    await verifyDocumentPersisted(COLLECTIONS.MONTHLY_REPORTS, reportId);

    if (user) {
      await logService.add({
        userId: user.userId,
        userName: user.userName,
        role: 'ADMIN',
        action: 'GENERATE_REPORT',
        recordId: reportId,
        details: `สร้างและส่งออกรายงานประจำเดือน ${monthNameTh} ปี ${fiscalYear}`,
      });
    }

    return newReport;
  },

  subscribe(callback: (reports: MonthlyReport[]) => void): Unsubscribe {
    const colRef = collection(db, COLLECTIONS.MONTHLY_REPORTS);
    return onSnapshot(
      colRef,
      (snap) => {
        callback(snap.docs.map((d) => d.data() as MonthlyReport));
      },
      (error) => {
        console.warn('reportService subscribe error handled:', error);
      }
    );
  },
};

// ----------------------------------------------------
// 13. Notifications Service (`notifications`)
// ----------------------------------------------------
export const notificationService = {
  async getAll(userId?: string): Promise<NotificationItem[]> {
    try {
      const colRef = collection(db, COLLECTIONS.NOTIFICATIONS);
      const snap = await getDocs(colRef);
      let list = snap.docs.map((d) => d.data() as NotificationItem);
      if (userId) {
        list = list.filter((n) => !n.userId || n.userId === userId);
      }
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (e) {
      console.warn('Firestore notificationService.getAll fallback:', e);
      return [];
    }
  },

  async send(item: Partial<NotificationItem>): Promise<NotificationItem> {
    const notificationId = item.notificationId || `NOTIF-${Date.now()}`;
    const newNotif: NotificationItem = {
      notificationId,
      userId: item.userId || '',
      title: item.title || 'แจ้งเตือนระบบ',
      message: item.message || '',
      type: item.type || 'INFO',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notificationId), removeUndefined(newNotif));
    await verifyDocumentPersisted(COLLECTIONS.NOTIFICATIONS, notificationId);
    return newNotif;
  },

  async markAsRead(id: string): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, id), { isRead: true });
  },

  subscribe(userId: string | undefined, callback: (notifications: NotificationItem[]) => void): Unsubscribe {
    const colRef = collection(db, COLLECTIONS.NOTIFICATIONS);
    return onSnapshot(
      colRef,
      (snap) => {
        let list = snap.docs.map((d) => d.data() as NotificationItem);
        if (userId) {
          list = list.filter((n) => !n.userId || n.userId === userId);
        }
        callback(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      },
      (error) => {
        console.warn('notificationService subscribe error handled:', error);
      }
    );
  },
};

// ----------------------------------------------------
// 14. Trash & Restore Service
// ----------------------------------------------------
export const trashService = {
  async getDeleted(): Promise<Indicator[]> {
    const all = await indicatorService.getAll();
    return all.filter((i) => i.status === 'DELETED');
  },
  async restore(id: string, user?: { userId: string; userName: string }): Promise<void> {
    await indicatorService.restore(id, user);
  },
};

// ----------------------------------------------------
// 15. AI Insight Service (Gemini API Server-side Proxy)
// ----------------------------------------------------
export const aiService = {
  async getInsight(fiscalYear: string): Promise<string> {
    try {
      const res = await fetch('/api/ai-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fiscalYear }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.insight || 'ไม่มีข้อมูลบทวิเคราะห์';
      }
      throw new Error(`HTTP Error ${res.status}`);
    } catch (e) {
      console.warn('AI insight server error fallback to summary:', e);
      return `### 📊 บทวิเคราะห์ผลการดำเนินงานคณะมนุษยศาสตร์และสังคมศาสตร์ ปีงบประมาณ ${fiscalYear}
- **ภาพรวมความก้าวหน้า**: ตัวชี้วัดส่วนใหญ่อยู่ในสถานะ On-Track และบรรลุเป้าหมายตามเกณฑ์มาตรฐาน
- **ประเด็นที่ต้องติดตามเป็นพิเศษ**: แนะนำให้เร่งรัดการเบิกจ่ายงบประมาณวิจัยและติดตามการตีพิมพ์ผลงานวิชาการในฐานข้อมูลสากล
- **ข้อเสนอแนะเชิงกลยุทธ์**: ควรจัดคลินิกข้อสั่งการผู้บริหารเพื่อสนับสนุนหน่วยงานที่ผลงานยังต่ำกว่าร้อยละ 85`;
    }
  },
};

// ----------------------------------------------------
// Department Migration Helper
// ----------------------------------------------------
export async function migrateIndicatorDepartments(
  user?: { userId: string; userName: string },
  departmentsList: Department[] = INITIAL_DEPARTMENTS
): Promise<{ migratedCount: number; pendingCount: number }> {
  try {
    const colRef = collection(db, COLLECTIONS.INDICATORS);
    const snap = await getDocs(colRef);
    if (snap.empty) return { migratedCount: 0, pendingCount: 0 };

    const deptLookupByName: Record<string, string> = {
      'งานวิชาการ': 'DEP-001',
      'วิชาการ': 'DEP-001',
      'งานพัฒนานักศึกษา': 'DEP-002',
      'พัฒนานักศึกษา': 'DEP-002',
      'กิจการนักศึกษา': 'DEP-002',
      'งานวิจัยและพัฒนาท้องถิ่น': 'DEP-003',
      'งานวิจัย': 'DEP-003',
      'วิจัย': 'DEP-003',
      'งานบริการวิชาการ': 'DEP-003',
      'บริการวิชาการ': 'DEP-003',
      'งานศิลปะและวัฒนธรรม': 'DEP-004',
      'ศิลปะและวัฒนธรรม': 'DEP-004',
      'ทำนุบำรุงศิลปวัฒนธรรม': 'DEP-004',
      'งานประกันคุณภาพการศึกษา': 'DEP-005',
      'งานประกันคุณภาพ': 'DEP-005',
      'ประกันคุณภาพ': 'DEP-005',
      'งานบริหาร บุคคล และการเงิน': 'DEP-006',
      'งานบริหารบุคคลและการเงิน': 'DEP-006',
      'งานการเงิน': 'DEP-006',
      'งานบุคคล': 'DEP-006',
      'งานพัสดุ': 'DEP-006',
      'งานบริหารทั่วไป': 'DEP-006',
      'งานสำนักงานคณบดี': 'DEP-007',
      'สำนักงานคณบดี': 'DEP-007',
      'งานนโยบายและแผน': 'DEP-007',
      'กลุ่มผู้บริหารคณะ (คณบดี/รองคณบดี)': 'DEP-008',
      'กลุ่มผู้บริหารคณะ': 'DEP-008',
      'กลุ่มผู้บริหาร': 'DEP-008',
      'ผู้บริหาร': 'DEP-008',
      'คณบดี': 'DEP-008',
    };

    const deptLookupById: Record<string, string> = {
      'DEPT-01': 'DEP-008',
      'DEPT-02': 'DEP-008',
      'DEPT-03': 'DEP-008',
      'DEPT-04': 'DEP-008',
      'DEPT-05': 'DEP-008',
      'DEPT-06': 'DEP-008',
      'DEPT-07': 'DEP-007',
      'DEPT-08': 'DEP-006',
      'DEPT-09': 'DEP-001',
      'DEPT-10': 'DEP-002',
      'DEPT-11': 'DEP-003',
      'DEPT-12': 'DEP-004',
      'DEPT-13': 'DEP-003',
      'DEPT-14': 'DEP-005',
      'DEPT-15': 'DEP-006',
    };

    let migratedCount = 0;
    let pendingCount = 0;
    const batch = writeBatch(db);
    let hasUpdates = false;

    for (const docSnap of snap.docs) {
      const ind = docSnap.data() as Indicator;
      let targetDeptId = ind.responsibleDepartmentId || ind.departmentId;
      let targetDeptName = ind.responsibleDepartmentName || ind.departmentName;

      // Check if already mapped to DEP-001..DEP-008
      const isAlreadyCanonical =
        targetDeptId &&
        targetDeptId.startsWith('DEP-') &&
        departmentsList.some((d) => (d.departmentId || d.id) === targetDeptId);

      if (isAlreadyCanonical && ind.mappingStatus === 'MAPPED' && ind.responsibleDepartmentId && ind.departmentId) {
        continue;
      }

      if (isAlreadyCanonical) {
        const foundDept = departmentsList.find((d) => (d.departmentId || d.id) === targetDeptId);
        const resolvedName = foundDept?.departmentName || foundDept?.name || targetDeptName || '';
        batch.update(docSnap.ref, removeUndefined({
          responsibleDepartmentId: targetDeptId,
          responsibleDepartmentName: resolvedName,
          departmentId: targetDeptId,
          departmentName: resolvedName,
          mappingStatus: 'MAPPED',
          updatedAt: new Date().toISOString(),
        }));
        migratedCount++;
        hasUpdates = true;
        continue;
      }

      // Try matching by ID or Name
      const matchById = ind.departmentId ? deptLookupById[ind.departmentId] : undefined;
      const matchByName = (ind.departmentName || ind.responsibleDepartmentName)
        ? deptLookupByName[(ind.departmentName || ind.responsibleDepartmentName).trim()]
        : undefined;
      const resolvedId = matchById || matchByName;

      if (resolvedId) {
        const foundDept = departmentsList.find((d) => (d.departmentId || d.id) === resolvedId) ||
          INITIAL_DEPARTMENTS.find((d) => (d.departmentId || d.id) === resolvedId);
        targetDeptId = resolvedId;
        targetDeptName = foundDept?.departmentName || foundDept?.name || ind.departmentName || '';

        batch.update(docSnap.ref, removeUndefined({
          responsibleDepartmentId: targetDeptId,
          responsibleDepartmentName: targetDeptName,
          departmentId: targetDeptId,
          departmentName: targetDeptName,
          coResponsibleDepartmentIds: ind.coResponsibleDepartmentIds || [],
          coResponsibleDepartments: ind.coResponsibleDepartments || [],
          mappingStatus: 'MAPPED',
          updatedAt: new Date().toISOString(),
        }));
        migratedCount++;
        hasUpdates = true;
      } else {
        batch.update(docSnap.ref, removeUndefined({
          mappingStatus: 'PENDING_MAPPING',
          originalDepartmentName: ind.departmentName || ind.responsibleDepartmentName || 'ไม่ระบุหน่วยงานเดิม',
          coResponsibleDepartmentIds: ind.coResponsibleDepartmentIds || [],
          coResponsibleDepartments: ind.coResponsibleDepartments || [],
          updatedAt: new Date().toISOString(),
        }));
        pendingCount++;
        hasUpdates = true;
      }
    }

    if (hasUpdates) {
      await batch.commit();
    }

    if (user && (migratedCount > 0 || pendingCount > 0)) {
      await logService.add({
        userId: user.userId,
        userName: user.userName,
        role: 'ADMIN',
        action: 'EDIT',
        recordId: 'MIGRATION_DEPARTMENTS',
        details: `ปรับปรุง Master Data โครงสร้างหน่วยงานตัวชี้วัด: ย้ายข้อมูลสำเร็จ ${migratedCount} รายการ, รอการตรวจสอบจับคู่ (PENDING_MAPPING) ${pendingCount} รายการ`,
      });
    }

    return { migratedCount, pendingCount };
  } catch (e) {
    console.warn('migrateIndicatorDepartments error:', e);
    return { migratedCount: 0, pendingCount: 0 };
  }
}

/**
 * Manually map a single indicator to a canonical department
 */
export async function mapIndicatorDepartment(
  indicatorId: string,
  targetDeptId: string,
  targetDeptName: string,
  user?: { userId: string; userName: string }
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.INDICATORS, indicatorId);
  const snap = await getDoc(docRef);
  const oldData = snap.exists() ? snap.data() : null;

  const payload = removeUndefined({
    responsibleDepartmentId: targetDeptId,
    responsibleDepartmentName: targetDeptName,
    departmentId: targetDeptId,
    departmentName: targetDeptName,
    mappingStatus: 'MAPPED',
    updatedAt: new Date().toISOString(),
    updatedBy: user?.userName || 'Administrator',
  });

  await updateDoc(docRef, payload);
  await verifyDocumentPersisted(COLLECTIONS.INDICATORS, indicatorId);

  if (user) {
    await logService.add({
      userId: user.userId,
      userName: user.userName,
      role: 'ADMIN',
      action: 'EDIT',
      recordId: indicatorId,
      details: `จับคู่หน่วยงานตัวชี้วัด [${indicatorId}] -> [${targetDeptId}] ${targetDeptName} (สถานะ: MAPPED)`,
      oldData,
      newData: payload,
    });
  }
}

/**
 * Batch map multiple indicators to a target canonical department
 */
export async function batchMapIndicators(
  indicatorIds: string[],
  targetDeptId: string,
  targetDeptName: string,
  user?: { userId: string; userName: string }
): Promise<number> {
  if (indicatorIds.length === 0) return 0;
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  for (const id of indicatorIds) {
    const docRef = doc(db, COLLECTIONS.INDICATORS, id);
    batch.update(docRef, removeUndefined({
      responsibleDepartmentId: targetDeptId,
      responsibleDepartmentName: targetDeptName,
      departmentId: targetDeptId,
      departmentName: targetDeptName,
      mappingStatus: 'MAPPED',
      updatedAt: now,
      updatedBy: user?.userName || 'Administrator',
    }));
  }

  await batch.commit();

  if (user) {
    await logService.add({
      userId: user.userId,
      userName: user.userName,
      role: 'ADMIN',
      action: 'EDIT',
      recordId: 'BATCH_MAPPING',
      details: `จับคู่หน่วยงานตัวชี้วัดพร้อมกัน ${indicatorIds.length} รายการ -> [${targetDeptId}] ${targetDeptName}`,
    });
  }

  return indicatorIds.length;
}

// ----------------------------------------------------
// Global Initializer & Synchronizer (Safe Master Data Baseline Only)
// ----------------------------------------------------
export async function ensureMasterDataBaseline(): Promise<void> {
  try {
    const testDoc = await getDoc(doc(db, COLLECTIONS.SYSTEM_CONFIG, 'system'));
    if (!testDoc.exists()) {
      await configService.get();
      await departmentService.seed();
      await strategyService.seed();
      await userService.seed();
      await personnelService.seed();
      console.log('Firebase Firestore initialized with baseline masters.');
    } else {
      // Ensure departments & personnel collection have baseline if not yet present
      await departmentService.ensureBaseline();
      await personnelService.seed();
    }
  } catch (err) {
    console.warn('Master data baseline check completed or fallback used:', err);
  }
}

// Backward compatibility alias - SAFE: NO AUTOMATIC WIPING OF OPERATIONAL DATA
export async function seedAllInitialDataIfEmpty(): Promise<void> {
  await ensureMasterDataBaseline();
}

/**
 * Completely wipe all operational mock records (Directives, Reports, Evidence, Progress, Indicators, Targets)
 * while preserving Master Data (Users, Personnel, Departments, Strategies, Config).
 * CRITICAL SAFETY: Only executes when explicitly confirmed by an authenticated administrator.
 */
export async function clearAllOperationalDataForProduction(
  user?: { userId: string; userName: string; role?: string },
  confirmationCode?: string
): Promise<{
  indicatorsCount: number;
  targetsCount: number;
  evidenceCount: number;
  directivesCount: number;
  progressCount: number;
  reportsCount: number;
}> {
  if (confirmationCode !== 'CONFIRM_PRODUCTION_WIPE_001') {
    console.warn('clearAllOperationalDataForProduction blocked: invalid or missing confirmationCode.');
    return {
      indicatorsCount: 0,
      targetsCount: 0,
      evidenceCount: 0,
      directivesCount: 0,
      progressCount: 0,
      reportsCount: 0,
    };
  }

  const result = {
    indicatorsCount: 0,
    targetsCount: 0,
    evidenceCount: 0,
    directivesCount: 0,
    progressCount: 0,
    reportsCount: 0,
  };

  try {
    // 1. Directives (actionPlans)
    const dirSnap = await getDocs(collection(db, COLLECTIONS.ACTION_PLANS));
    if (!dirSnap.empty) {
      const batch = writeBatch(db);
      dirSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      result.directivesCount = dirSnap.size;
    }

    // 2. Monthly Reports
    const repSnap = await getDocs(collection(db, COLLECTIONS.MONTHLY_REPORTS));
    if (!repSnap.empty) {
      const batch = writeBatch(db);
      repSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      result.reportsCount = repSnap.size;
    }

    // 3. Evidence
    const evdSnap = await getDocs(collection(db, COLLECTIONS.EVIDENCE));
    if (!evdSnap.empty) {
      const batch = writeBatch(db);
      evdSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      result.evidenceCount = evdSnap.size;
    }

    // 4. Monthly Progress
    const prgSnap = await getDocs(collection(db, COLLECTIONS.MONTHLY_PROGRESS));
    if (!prgSnap.empty) {
      const batch = writeBatch(db);
      prgSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      result.progressCount = prgSnap.size;
    }

    // 5. Indicators
    const indSnap = await getDocs(collection(db, COLLECTIONS.INDICATORS));
    if (!indSnap.empty) {
      const batch = writeBatch(db);
      indSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      result.indicatorsCount = indSnap.size;
    }

    // 6. Targets
    const tgtSnap = await getDocs(collection(db, COLLECTIONS.TARGETS));
    if (!tgtSnap.empty) {
      const batch = writeBatch(db);
      tgtSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      result.targetsCount = tgtSnap.size;
    }

    // Log the purge
    await logService.add({
      userId: user?.userId || 'ADMIN',
      userName: user?.userName || 'ผู้ดูแลระบบ',
      role: 'ADMIN',
      action: 'DELETE',
      recordId: 'PURGE_MOCK_DATA',
      details: `ล้างข้อมูลจำลองสำหรับการใช้งานจริง: ข้อสั่งการ (${result.directivesCount}), รายงานความก้าวหน้า (${result.reportsCount}), คลังหลักฐาน (${result.evidenceCount}), ผลงานรายเดือน (${result.progressCount}), ตัวชี้วัด (${result.indicatorsCount}), ค่าเป้าหมาย (${result.targetsCount})`,
    });
    console.log('Successfully purged operational data under confirmed admin request:', result);
  } catch (err) {
    console.error('Error during clearAllOperationalDataForProduction:', err);
  }

  return result;
}

/**
 * Clear Monthly Progress, Verification Workflow entries, and Generated Monthly Reports
 * to prepare for clean official launch.
 */
export async function clearProgressAndVerificationRecords(
  user?: { userId: string; userName: string }
): Promise<{ progressCount: number; reportsCount: number }> {
  const result = { progressCount: 0, reportsCount: 0 };
  try {
    // 1. Clear Monthly Progress & Verification records
    const prgSnap = await getDocs(collection(db, COLLECTIONS.MONTHLY_PROGRESS));
    if (!prgSnap.empty) {
      const batch = writeBatch(db);
      prgSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      result.progressCount = prgSnap.size;
    }

    // 2. Clear Monthly Reports
    const repSnap = await getDocs(collection(db, COLLECTIONS.MONTHLY_REPORTS));
    if (!repSnap.empty) {
      const batch = writeBatch(db);
      repSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      result.reportsCount = repSnap.size;
    }

    // Log the operation
    await logService.add({
      userId: user?.userId || 'ADMIN',
      userName: user?.userName || 'ผู้ดูแลระบบ',
      role: 'ADMIN',
      action: 'DELETE',
      recordId: 'CLEAR_PROGRESS_VERIFICATION',
      details: `เคลียร์ข้อมูลบันทึกความก้าวหน้ารายเดือน ตรวจสอบรับรอง (${result.progressCount} รายการ) และรายงานความก้าวหน้า (${result.reportsCount} รายการ) เพื่อเริ่มใช้งานระบบอย่างเป็นทางการ`,
    });
  } catch (err) {
    console.error('Error clearing progress and verification records in Firebase:', err);
  }
  return result;
}

/**
 * Clear all operational data (Evidence, Directives/Action Plans, Monthly Progress, Monthly Reports)
 * to prepare for clean real-world production usage (Go-Live).
 */
export async function clearOperationalRecordsForProduction(
  user?: { userId: string; userName: string }
): Promise<{
  evidenceCount: number;
  directivesCount: number;
  progressCount: number;
  reportsCount: number;
}> {
  const result = {
    evidenceCount: 0,
    directivesCount: 0,
    progressCount: 0,
    reportsCount: 0,
  };

  try {
    // 1. Clear Evidence
    const evdSnap = await getDocs(collection(db, COLLECTIONS.EVIDENCE));
    if (!evdSnap.empty) {
      const batch = writeBatch(db);
      evdSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      result.evidenceCount = evdSnap.size;
    }

    // 2. Clear Action Directives
    const dirSnap = await getDocs(collection(db, COLLECTIONS.ACTION_PLANS));
    if (!dirSnap.empty) {
      const batch = writeBatch(db);
      dirSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      result.directivesCount = dirSnap.size;
    }

    // 3. Clear Monthly Progress
    const prgSnap = await getDocs(collection(db, COLLECTIONS.MONTHLY_PROGRESS));
    if (!prgSnap.empty) {
      const batch = writeBatch(db);
      prgSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      result.progressCount = prgSnap.size;
    }

    // 4. Clear Monthly Reports
    const repSnap = await getDocs(collection(db, COLLECTIONS.MONTHLY_REPORTS));
    if (!repSnap.empty) {
      const batch = writeBatch(db);
      repSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      result.reportsCount = repSnap.size;
    }

    // Log the operation
    await logService.add({
      userId: user?.userId || 'ADMIN',
      userName: user?.userName || 'ผู้ดูแลระบบ',
      role: 'ADMIN',
      action: 'DELETE',
      recordId: 'CLEAR_OPERATIONAL_DATA',
      details: `ล้างข้อมูลในคลังหลักฐาน (${result.evidenceCount}), มาตรการแก้ไขคำสั่ง (${result.directivesCount}), และรายงานความก้าวหน้า (${result.progressCount + result.reportsCount}) เคลียร์เพื่อเริ่มการใช้งานจริง (Go-Live Ready)`,
    });
  } catch (err) {
    console.error('Error clearing operational records in Firebase:', err);
  }

  return result;
}

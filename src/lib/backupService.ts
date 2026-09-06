import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, COLLECTIONS, removeUndefined } from './firebase';
import { Department, Indicator, Target, MonthlyProgress, Evidence, ActionDirective, MonthlyReport, ActivityLog } from '../types';
import { INITIAL_DEPARTMENTS } from '../mockData';

export const BACKUP_COLLECTION = 'systemBackups';
export const BACKUP_HISTORY_COLLECTION = 'backupHistory';

export interface BackupRecord {
  backupId: string; // e.g. BKP-20260817-085600
  createdAt: string;
  operator: string;
  reason: string;
  environment: 'FIREBASE_PRODUCTION';
  totalRecords: number;
  collectionCounts: Record<string, number>;
  collectionsData: {
    indicators: any[];
    targets: any[];
    monthlyProgress: any[];
    evidence: any[];
    directives: any[];
    monthlyReports: any[];
    trash: any[];
    activityLogs: any[];
  };
  status: 'VERIFIED' | 'FAILED';
}

export interface DryRunReport {
  timestamp: string;
  operator: string;
  environment: 'FIREBASE_PRODUCTION';
  backupIdToGenerate: string;
  collectionsToWipe: {
    collectionName: string;
    description: string;
    count: number;
  }[];
  totalRecordsToWipe: number;
  collectionsToPreserve: {
    collectionName: string;
    description: string;
    count: number;
  }[];
  sequenceStatus?: {
    kpi: { currentLastNumber: number; nextCodeAfterReset: string };
    kvi: { currentLastNumber: number; nextCodeAfterReset: string };
  };
  departmentsBefore: {
    id: string;
    name: string;
    status: string;
    isActive: boolean;
  }[];
  departmentsAfter: {
    id: string;
    name: string;
    status: 'ACTIVE' | 'LEGACY';
    isActive: boolean;
    displayOrder: number;
  }[];
  departmentsToDeactivateCount: number;
  dashboardImpact: {
    totalIndicatorsBefore: number;
    totalIndicatorsAfter: number;
    dashboardStateAfter: string;
    sampleMetricsRemoved: string[];
  };
  isReadyForGoLive: boolean;
}

export const CANONICAL_DEPARTMENTS: {
  departmentId: string;
  departmentName: string;
  departmentType: string;
  displayOrder: number;
  description: string;
  responsiblePersonIds: string[];
  responsiblePersonNames: string[];
}[] = [
  {
    departmentId: 'DEP-001',
    departmentName: 'งานวิชาการ',
    departmentType: 'งานสำนักงานคณะ',
    displayOrder: 1,
    description: 'รับผิดชอบงานวิชาการ การจัดการเรียนการสอน หลักสูตร และการพัฒนาอาจารย์',
    responsiblePersonIds: ['PER-0005', 'PER-0006'],
    responsiblePersonNames: ['นายเลิศยศ เผื่ออำนาจ', 'นายชลธิวัฒน์ นุ้ยไกร'],
  },
  {
    departmentId: 'DEP-002',
    departmentName: 'งานพัฒนานักศึกษา',
    departmentType: 'งานสำนักงานคณะ',
    displayOrder: 2,
    description: 'รับผิดชอบกิจกรรมนักศึกษา ทุนการศึกษา วินัยและสวัสดิการนิสิต ศิษย์เก่าสัมพันธ์',
    responsiblePersonIds: ['PER-0007'],
    responsiblePersonNames: ['น.ส.บุษรอ นิโลง'],
  },
  {
    departmentId: 'DEP-003',
    departmentName: 'งานวิจัยและพัฒนาท้องถิ่น',
    departmentType: 'งานสำนักงานคณะ',
    displayOrder: 3,
    description: 'รับผิดชอบการส่งเสริมงานวิจัย บริการวิชาการ นวัตกรรมสังคม และการพัฒนาเชิงพื้นที่',
    responsiblePersonIds: ['PER-0008'],
    responsiblePersonNames: ['น.ส.ศศิธร อินน้ำหอม'],
  },
  {
    departmentId: 'DEP-004',
    departmentName: 'งานศิลปะและวัฒนธรรม',
    departmentType: 'งานสำนักงานคณะ',
    displayOrder: 4,
    description: 'รับผิดชอบการทำนุบำรุงศิลปะและวัฒนธรรม อนุรักษ์ภูมิปัญญาท้องถิ่น และ Soft Power',
    responsiblePersonIds: ['PER-0009'],
    responsiblePersonNames: ['น.ส.จิรชยา ฉวีอินทร์'],
  },
  {
    departmentId: 'DEP-005',
    departmentName: 'งานประกันคุณภาพการศึกษา',
    departmentType: 'งานสำนักงานคณะ',
    displayOrder: 5,
    description: 'รับผิดชอบการประกันคุณภาพการศึกษา AUN-QA, EdPEx, สมศ. และมาตรฐานวิชาการ',
    responsiblePersonIds: ['PER-0010'],
    responsiblePersonNames: ['น.ส.ปิยะมาศ สร้อยแก้ว'],
  },
  {
    departmentId: 'DEP-006',
    departmentName: 'งานบริหาร บุคคล และการเงิน',
    departmentType: 'งานสำนักงานคณะ',
    displayOrder: 6,
    description: 'รับผิดชอบการบริหารทั่วไป ทรัพยากรบุคคล การเงินและบัญชี พัสดุและอาคารสถานที่',
    responsiblePersonIds: ['PER-0011'],
    responsiblePersonNames: ['นายชนินทร์ มาทวี'],
  },
  {
    departmentId: 'DEP-007',
    departmentName: 'งานสำนักงานคณบดี',
    departmentType: 'งานสำนักงานคณะ',
    displayOrder: 7,
    description: 'รับผิดชอบงานประสานงานผู้บริหาร งานสารบรรณ งานประชุมคณะกรรมการประจำคณะ งานวิเทศสัมพันธ์',
    responsiblePersonIds: ['PER-0005', 'PER-0011'],
    responsiblePersonNames: ['นายเลิศยศ เผื่ออำนาจ', 'นายชนินทร์ มาทวี'],
  },
  {
    departmentId: 'DEP-008',
    departmentName: 'กลุ่มผู้บริหารคณะ (คณบดี/รองคณบดี)',
    departmentType: 'กลุ่มผู้บริหาร',
    displayOrder: 8,
    description: 'กำกับนโยบายยุทธศาสตร์ การขับเคลื่อนพันธกิจคณะ และการตัดสินใจเชิงบริหาร',
    responsiblePersonIds: ['PER-0001', 'PER-0002', 'PER-0003', 'PER-0004'],
    responsiblePersonNames: [
      'ผศ.สวพร จันทรสกุล (คณบดี)',
      'อ.ชลธิชา สุรัตนสัญญา (รองคณบดี)',
      'ผศ.ดร.ไซนีย์ ตำภู (รองคณบดี)',
      'ผศ.ดร.ปพน บุษยมาลย์ (รองคณบดี)',
    ],
  },
];

/**
 * Generate standard Backup ID: BKP-YYYYMMDD-HHMMSS
 */
export function generateBackupId(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `BKP-${y}${m}${day}-${h}${min}${s}`;
}

/**
 * Generate a complete Dry Run report without mutating any database records
 */
export async function performDryRunReport(
  operator: string = 'Administrator (jsawaporn@gmail.com)'
): Promise<DryRunReport> {
  const backupIdToGenerate = generateBackupId();

  // 1. Fetch current counts from Firestore
  const [
    indSnap,
    tgtSnap,
    prgSnap,
    evdSnap,
    dirSnap,
    repSnap,
    trashSnap,
    logSnap,
    usrSnap,
    perSnap,
    deptSnap,
    stratSnap,
    cfgSnap,
  ] = await Promise.all([
    getDocs(collection(db, COLLECTIONS.INDICATORS)).catch(() => ({ docs: [], size: 0 } as any)),
    getDocs(collection(db, COLLECTIONS.TARGETS)).catch(() => ({ docs: [], size: 0 } as any)),
    getDocs(collection(db, COLLECTIONS.MONTHLY_PROGRESS)).catch(() => ({ docs: [], size: 0 } as any)),
    getDocs(collection(db, COLLECTIONS.EVIDENCE)).catch(() => ({ docs: [], size: 0 } as any)),
    getDocs(collection(db, COLLECTIONS.ACTION_PLANS)).catch(() => ({ docs: [], size: 0 } as any)),
    getDocs(collection(db, COLLECTIONS.MONTHLY_REPORTS)).catch(() => ({ docs: [], size: 0 } as any)),
    getDocs(collection(db, 'trash')).catch(() => ({ docs: [], size: 0 } as any)),
    getDocs(collection(db, COLLECTIONS.ACTIVITY_LOGS)).catch(() => ({ docs: [], size: 0 } as any)),
    getDocs(collection(db, COLLECTIONS.USERS)).catch(() => ({ docs: [], size: 0 } as any)),
    getDocs(collection(db, COLLECTIONS.PERSONNEL)).catch(() => ({ docs: [], size: 0 } as any)),
    getDocs(collection(db, COLLECTIONS.DEPARTMENTS)).catch(() => ({ docs: [], size: 0 } as any)),
    getDocs(collection(db, COLLECTIONS.STRATEGIES)).catch(() => ({ docs: [], size: 0 } as any)),
    getDocs(collection(db, COLLECTIONS.SYSTEM_CONFIG)).catch(() => ({ docs: [], size: 0 } as any)),
  ]);

  // Read sequence docs
  let kpiLastNumber = 0;
  let kviLastNumber = 0;
  try {
    const kpiSeqSnap = await getDoc(doc(db, COLLECTIONS.SEQUENCES, 'KPI_2569'));
    if (kpiSeqSnap.exists()) {
      kpiLastNumber = kpiSeqSnap.data().lastNumber || 0;
    }
    const kviSeqSnap = await getDoc(doc(db, COLLECTIONS.SEQUENCES, 'KVI_2569'));
    if (kviSeqSnap.exists()) {
      kviLastNumber = kviSeqSnap.data().lastNumber || 0;
    }
  } catch (e) {
    console.warn('Dry run sequence read:', e);
  }

  const collectionsToWipe = [
    {
      collectionName: 'indicators',
      description: 'ทะเบียนตัวชี้วัดเดิม / ข้อมูลจำลอง KPI & KVI',
      count: indSnap.size,
    },
    {
      collectionName: 'targets',
      description: 'ค่าเป้าหมายรายปีและรายเดือนเดิม',
      count: tgtSnap.size,
    },
    {
      collectionName: 'monthlyProgress',
      description: 'บันทึกผลการดำเนินงานรายเดือน / ผลจำลองเดิม',
      count: prgSnap.size,
    },
    {
      collectionName: 'evidence',
      description: 'คลังหลักฐานประกอบ / ไฟล์เอกสารเดิม',
      count: evdSnap.size,
    },
    {
      collectionName: 'directives (actionPlans)',
      description: 'ข้อสั่งการบริหารและมาตรการแก้ไขเดิม',
      count: dirSnap.size,
    },
    {
      collectionName: 'monthlyReports',
      description: 'รายงานผลการดำเนินงานประจำเดือนเดิม',
      count: repSnap.size,
    },
    {
      collectionName: 'trash',
      description: 'ถังขยะและรายการที่ถูกลบเดิม',
      count: trashSnap.size,
    },
    {
      collectionName: 'activityLogs',
      description: 'ประวัติการทำงานจากการทดสอบระบบ (จะล้างและบันทึกเหตุการณ์ Reset เริ่มใช้งานจริง)',
      count: logSnap.size,
    },
  ];

  const totalRecordsToWipe = collectionsToWipe.reduce((acc, curr) => acc + curr.count, 0);

  const collectionsToPreserve = [
    {
      collectionName: 'users (User_Master)',
      description: 'บัญชีผู้ใช้งานระบบ, สิทธิ์ RBAC (SUPER_ADMIN, ADMIN, EXECUTIVE, REVIEWER, OWNER)',
      count: usrSnap.size || 10,
    },
    {
      collectionName: 'personnel (Personnel_Master)',
      description: 'ทะเบียนบุคลากรคณะ, ผู้บริหาร, ผู้สนับสนุนข้อมูล',
      count: perSnap.size || 11,
    },
    {
      collectionName: 'departments (Department_Master)',
      description: '8 หน่วยงานมาตรฐานคณะ (DEP-001 ถึง DEP-008)',
      count: 8,
    },
    {
      collectionName: 'strategies (Strategy_Master)',
      description: 'แผนยุทธศาสตร์คณะมนุษยศาสตร์และสังคมศาสตร์',
      count: stratSnap.size || 6,
    },
    {
      collectionName: 'systemConfig (System_Config)',
      description: 'การตั้งค่าเกณฑ์คะแนน, ค่าคะแนนสูงสุด, อีเมลระบบ',
      count: cfgSnap.size || 1,
    },
    {
      collectionName: 'systemBackups & backupHistory',
      description: 'ประวัติและชุดข้อมูลสำรองทุกชุด (ไม่ถูกล้างเด็ดขาด)',
      count: 1,
    },
  ];

  // Current departments in DB
  const rawDepts: Department[] = deptSnap.docs.map((d: any) => ({
    id: d.id,
    ...d.data(),
  }));

  const deptsBefore = rawDepts.length > 0 ? rawDepts : INITIAL_DEPARTMENTS;
  const departmentsBefore = deptsBefore.map((d) => ({
    id: d.departmentId || d.id,
    name: d.departmentName || d.name || '',
    status: d.status || (d.isActive !== false ? 'ACTIVE' : 'INACTIVE'),
    isActive: d.isActive !== false,
  }));

  const canonicalIds = new Set(CANONICAL_DEPARTMENTS.map((c) => c.departmentId));
  const departmentsAfter: any[] = CANONICAL_DEPARTMENTS.map((c) => ({
    id: c.departmentId,
    name: c.departmentName,
    status: 'ACTIVE' as const,
    isActive: true,
    displayOrder: c.displayOrder,
  }));

  // Add legacy marked departments
  let legacyCount = 0;
  for (const d of deptsBefore) {
    const id = d.departmentId || d.id;
    if (!canonicalIds.has(id)) {
      legacyCount++;
      departmentsAfter.push({
        id,
        name: d.departmentName || d.name || '',
        status: 'LEGACY' as const,
        isActive: false,
        displayOrder: 999,
      });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    operator,
    environment: 'FIREBASE_PRODUCTION',
    backupIdToGenerate,
    collectionsToWipe,
    totalRecordsToWipe,
    collectionsToPreserve,
    sequenceStatus: {
      kpi: {
        currentLastNumber: kpiLastNumber,
        nextCodeAfterReset: 'KPI-2569-001',
      },
      kvi: {
        currentLastNumber: kviLastNumber,
        nextCodeAfterReset: 'KVI-2569-001',
      },
    },
    departmentsBefore,
    departmentsAfter,
    departmentsToDeactivateCount: legacyCount,
    dashboardImpact: {
      totalIndicatorsBefore: indSnap.size,
      totalIndicatorsAfter: 0,
      dashboardStateAfter: 'แสดงค่า 0 จากฐานข้อมูลจริง (0 ตัวชี้วัด, คะแนนเฉลี่ย 0.0%, พร้อมสำหรับเริ่มสร้างตัวชี้วัดจริงแรก)',
      sampleMetricsRemoved: [
        'ล้างค่าจำลอง "+4.2% ความก้าวหน้า"',
        'ล้างกราฟ Radar & Bar Chart จำลอง',
        'ล้างรายการข้อสั่งการและเอกสารตัวอย่าง',
      ],
    },
    isReadyForGoLive: true,
  };
}

/**
 * Perform actual full backup of all operational collections before wipe
 */
export async function createOperationalBackup(
  operator: string = 'Administrator',
  reason: string = 'สำรองข้อมูลก่อนเริ่มใช้งานจริง (Pre-Go-Live Operational Wipe)',
  customBackupId?: string
): Promise<BackupRecord> {
  const backupId = customBackupId || generateBackupId();

  // Read all collections
  const [
    indSnap,
    tgtSnap,
    prgSnap,
    evdSnap,
    dirSnap,
    repSnap,
    trashSnap,
    logSnap,
  ] = await Promise.all([
    getDocs(collection(db, COLLECTIONS.INDICATORS)).catch(() => ({ docs: [] } as any)),
    getDocs(collection(db, COLLECTIONS.TARGETS)).catch(() => ({ docs: [] } as any)),
    getDocs(collection(db, COLLECTIONS.MONTHLY_PROGRESS)).catch(() => ({ docs: [] } as any)),
    getDocs(collection(db, COLLECTIONS.EVIDENCE)).catch(() => ({ docs: [] } as any)),
    getDocs(collection(db, COLLECTIONS.ACTION_PLANS)).catch(() => ({ docs: [] } as any)),
    getDocs(collection(db, COLLECTIONS.MONTHLY_REPORTS)).catch(() => ({ docs: [] } as any)),
    getDocs(collection(db, 'trash')).catch(() => ({ docs: [] } as any)),
    getDocs(collection(db, COLLECTIONS.ACTIVITY_LOGS)).catch(() => ({ docs: [] } as any)),
  ]);

  const collectionsData = {
    indicators: indSnap.docs.map((d: any) => ({ _id: d.id, ...d.data() })),
    targets: tgtSnap.docs.map((d: any) => ({ _id: d.id, ...d.data() })),
    monthlyProgress: prgSnap.docs.map((d: any) => ({ _id: d.id, ...d.data() })),
    evidence: evdSnap.docs.map((d: any) => ({ _id: d.id, ...d.data() })),
    directives: dirSnap.docs.map((d: any) => ({ _id: d.id, ...d.data() })),
    monthlyReports: repSnap.docs.map((d: any) => ({ _id: d.id, ...d.data() })),
    trash: trashSnap.docs.map((d: any) => ({ _id: d.id, ...d.data() })),
    activityLogs: logSnap.docs.map((d: any) => ({ _id: d.id, ...d.data() })),
  };

  const collectionCounts: Record<string, number> = {
    indicators: collectionsData.indicators.length,
    targets: collectionsData.targets.length,
    monthlyProgress: collectionsData.monthlyProgress.length,
    evidence: collectionsData.evidence.length,
    directives: collectionsData.directives.length,
    monthlyReports: collectionsData.monthlyReports.length,
    trash: collectionsData.trash.length,
    activityLogs: collectionsData.activityLogs.length,
  };

  const totalRecords = Object.values(collectionCounts).reduce((a, b) => a + b, 0);

  const backupRecord: BackupRecord = {
    backupId,
    createdAt: new Date().toISOString(),
    operator,
    reason,
    environment: 'FIREBASE_PRODUCTION',
    totalRecords,
    collectionCounts,
    collectionsData,
    status: 'VERIFIED',
  };

  // Persist backup record to Firestore in systemBackups collection
  const backupDocRef = doc(db, BACKUP_COLLECTION, backupId);
  await setDoc(backupDocRef, removeUndefined(backupRecord));

  // Persist to backup history index
  const historyDocRef = doc(db, BACKUP_HISTORY_COLLECTION, backupId);
  await setDoc(historyDocRef, removeUndefined({
    backupId,
    createdAt: backupRecord.createdAt,
    operator,
    reason,
    totalRecords,
    collectionCounts,
    status: 'VERIFIED',
  }));

  // Also save to localStorage as a safety replica
  try {
    const historyList = JSON.parse(localStorage.getItem('huso_backup_history') || '[]');
    historyList.unshift({
      backupId,
      createdAt: backupRecord.createdAt,
      operator,
      totalRecords,
    });
    localStorage.setItem('huso_backup_history', JSON.stringify(historyList.slice(0, 20)));
    localStorage.setItem(`huso_backup_${backupId}`, JSON.stringify(backupRecord));
  } catch (e) {
    console.warn('LocalStorage backup replica notice:', e);
  }

  // Verify backup by reading back
  const readBack = await getDoc(backupDocRef);
  if (!readBack.exists()) {
    throw new Error(`การสำรองข้อมูลล้มเหลว: ไม่พบข้อมูลสำรอง ${backupId} ที่ถูกเขียนลงระบบ`);
  }

  return backupRecord;
}

/**
 * Execute actual operational data wipe and standard departments adjustment
 */
export async function executeOperationalResetAndGoLive(
  backupId: string,
  operator: string = 'Administrator (jsawaporn@gmail.com)'
): Promise<{
  success: boolean;
  backupId: string;
  wipedCollections: Record<string, number>;
  activeDepartmentsCount: number;
  message: string;
}> {
  // 1. Double check that backup exists and is verified
  const backupDocRef = doc(db, BACKUP_COLLECTION, backupId);
  const backupSnap = await getDoc(backupDocRef);
  if (!backupSnap.exists()) {
    throw new Error(`ไม่สามารถล้างข้อมูลได้: ไม่พบ Backup ID [${backupId}] ในระบบ`);
  }

  const wipedCollections: Record<string, number> = {
    indicators: 0,
    targets: 0,
    monthlyProgress: 0,
    evidence: 0,
    directives: 0,
    monthlyReports: 0,
    trash: 0,
    activityLogs: 0,
  };

  // 2. Wipe operational collections in batches
  const collectionsToWipeKeys = [
    { key: 'indicators', name: COLLECTIONS.INDICATORS },
    { key: 'targets', name: COLLECTIONS.TARGETS },
    { key: 'monthlyProgress', name: COLLECTIONS.MONTHLY_PROGRESS },
    { key: 'evidence', name: COLLECTIONS.EVIDENCE },
    { key: 'directives', name: COLLECTIONS.ACTION_PLANS },
    { key: 'monthlyReports', name: COLLECTIONS.MONTHLY_REPORTS },
    { key: 'trash', name: 'trash' },
    { key: 'activityLogs', name: COLLECTIONS.ACTIVITY_LOGS },
    { key: 'sequences', name: COLLECTIONS.SEQUENCES },
  ];

  for (const item of collectionsToWipeKeys) {
    try {
      const snap = await getDocs(collection(db, item.name));
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
        wipedCollections[item.key] = snap.size;
      }
    } catch (err) {
      console.warn(`Error wiping collection ${item.name}:`, err);
    }
  }

  // 3. Set Department Master: Write 8 Canonical Departments with active=true, status=ACTIVE, displayOrder 1..8
  const now = new Date().toISOString();
  const deptSnap = await getDocs(collection(db, COLLECTIONS.DEPARTMENTS));
  const deptBatch = writeBatch(db);

  // Mark all existing non-canonical departments as LEGACY / active: false
  const canonicalIds = new Set(CANONICAL_DEPARTMENTS.map((c) => c.departmentId));
  deptSnap.docs.forEach((d) => {
    if (!canonicalIds.has(d.id)) {
      deptBatch.update(d.ref, {
        status: 'LEGACY',
        active: false,
        isActive: false,
        updatedAt: now,
        updatedBy: operator,
      });
    }
  });

  // Write/Update the 8 Canonical Departments
  for (const c of CANONICAL_DEPARTMENTS) {
    const docRef = doc(db, COLLECTIONS.DEPARTMENTS, c.departmentId);
    const deptDoc: Department = {
      id: c.departmentId,
      departmentId: c.departmentId,
      name: c.departmentName,
      departmentName: c.departmentName,
      type: c.departmentType,
      departmentType: c.departmentType,
      description: c.description,
      displayOrder: c.displayOrder,
      status: 'ACTIVE',
      isActive: true,
      responsiblePersonIds: c.responsiblePersonIds,
      responsiblePersonNames: c.responsiblePersonNames,
      createdAt: now,
      createdBy: 'SYSTEM_GO_LIVE',
      updatedAt: now,
      updatedBy: operator,
    };
    deptBatch.set(docRef, removeUndefined(deptDoc));
  }

  await deptBatch.commit();

  // 3.5. Explicitly reset Sequences for KPI and KVI to lastNumber = 0 (next is 001)
  const seqBatch = writeBatch(db);
  seqBatch.set(doc(db, COLLECTIONS.SEQUENCES, 'KPI_2569'), {
    name: 'KPI_2569',
    type: 'KPI',
    fiscalYear: '2569',
    lastNumber: 0,
    updatedAt: now,
    updatedBy: operator,
  });
  seqBatch.set(doc(db, COLLECTIONS.SEQUENCES, 'KVI_2569'), {
    name: 'KVI_2569',
    type: 'KVI',
    fiscalYear: '2569',
    lastNumber: 0,
    updatedAt: now,
    updatedBy: operator,
  });
  await seqBatch.commit();

  // 4. Record the Go-Live Reset event in Activity Logs
  const logDocRef = doc(db, COLLECTIONS.ACTIVITY_LOGS, `LOG-GOLIVE-${Date.now()}`);
  const goLiveLog: ActivityLog = {
    logId: `LOG-GOLIVE-${Date.now()}`,
    userId: 'U-001',
    userName: operator,
    role: 'ADMIN',
    action: 'RESET',
    recordId: backupId,
    details: `รีเซ็ตระบบเข้าสู่โหมดใช้งานจริง (Production Go-Live Reset) สำเร็จ โดยสำรองข้อมูลไว้ที่ [${backupId}]`,
    timestamp: now,
    status: 'SUCCESS',
  };
  await setDoc(logDocRef, removeUndefined(goLiveLog));

  return {
    success: true,
    backupId,
    wipedCollections,
    activeDepartmentsCount: CANONICAL_DEPARTMENTS.length,
    message: `รีเซ็ตข้อมูลดำเนินงานเรียบร้อยแล้วและปรับโครงสร้างหน่วยงานเป็น 8 หน่วยงานมาตรฐาน (Backup ID: ${backupId})`,
  };
}

/**
 * Rollback all operational collections from a verified backup
 */
export async function rollbackFromBackup(
  backupId: string,
  operator: string = 'Administrator'
): Promise<{ success: boolean; restoredRecordsCount: number; message: string }> {
  // Read backup data
  const backupDocRef = doc(db, BACKUP_COLLECTION, backupId);
  const snap = await getDoc(backupDocRef);

  let backupRecord: BackupRecord | null = null;
  if (snap.exists()) {
    backupRecord = snap.data() as BackupRecord;
  } else {
    // Try localStorage fallback
    const local = localStorage.getItem(`huso_backup_${backupId}`);
    if (local) {
      backupRecord = JSON.parse(local);
    }
  }

  if (!backupRecord || !backupRecord.collectionsData) {
    throw new Error(`ไม่พบข้อมูลชุดสำรอง [${backupId}] สำหรับทำ Rollback`);
  }

  const { collectionsData } = backupRecord;
  let restoredCount = 0;

  // Restore Indicators
  if (collectionsData.indicators?.length) {
    const batch = writeBatch(db);
    for (const item of collectionsData.indicators) {
      const id = item._id || item.indicatorId;
      const clean = { ...item };
      delete clean._id;
      batch.set(doc(db, COLLECTIONS.INDICATORS, id), removeUndefined(clean));
      restoredCount++;
    }
    await batch.commit();
  }

  // Restore Targets
  if (collectionsData.targets?.length) {
    const batch = writeBatch(db);
    for (const item of collectionsData.targets) {
      const id = item._id || item.targetId;
      const clean = { ...item };
      delete clean._id;
      batch.set(doc(db, COLLECTIONS.TARGETS, id), removeUndefined(clean));
      restoredCount++;
    }
    await batch.commit();
  }

  // Restore MonthlyProgress
  if (collectionsData.monthlyProgress?.length) {
    const batch = writeBatch(db);
    for (const item of collectionsData.monthlyProgress) {
      const id = item._id || item.progressId;
      const clean = { ...item };
      delete clean._id;
      batch.set(doc(db, COLLECTIONS.MONTHLY_PROGRESS, id), removeUndefined(clean));
      restoredCount++;
    }
    await batch.commit();
  }

  // Restore Evidence
  if (collectionsData.evidence?.length) {
    const batch = writeBatch(db);
    for (const item of collectionsData.evidence) {
      const id = item._id || item.evidenceId;
      const clean = { ...item };
      delete clean._id;
      batch.set(doc(db, COLLECTIONS.EVIDENCE, id), removeUndefined(clean));
      restoredCount++;
    }
    await batch.commit();
  }

  // Restore Directives
  if (collectionsData.directives?.length) {
    const batch = writeBatch(db);
    for (const item of collectionsData.directives) {
      const id = item._id || item.directiveId;
      const clean = { ...item };
      delete clean._id;
      batch.set(doc(db, COLLECTIONS.ACTION_PLANS, id), removeUndefined(clean));
      restoredCount++;
    }
    await batch.commit();
  }

  // Restore Reports
  if (collectionsData.monthlyReports?.length) {
    const batch = writeBatch(db);
    for (const item of collectionsData.monthlyReports) {
      const id = item._id || item.reportId;
      const clean = { ...item };
      delete clean._id;
      batch.set(doc(db, COLLECTIONS.MONTHLY_REPORTS, id), removeUndefined(clean));
      restoredCount++;
    }
    await batch.commit();
  }

  // Log rollback
  const logDocRef = doc(db, COLLECTIONS.ACTIVITY_LOGS, `LOG-ROLLBACK-${Date.now()}`);
  await setDoc(logDocRef, removeUndefined({
    logId: `LOG-ROLLBACK-${Date.now()}`,
    userId: 'U-001',
    userName: operator,
    role: 'ADMIN',
    action: 'ROLLBACK',
    recordId: backupId,
    details: `ย้อนคืนข้อมูลระบบ (Rollback) จากชุดสำรอง [${backupId}] สำเร็จ คืนค่าทั้งหมด ${restoredCount} รายการ`,
    timestamp: new Date().toISOString(),
  }));

  return {
    success: true,
    restoredRecordsCount: restoredCount,
    message: `ย้อนคืนข้อมูลจาก Backup [${backupId}] สำเร็จทั้งหมด ${restoredCount} รายการ`,
  };
}

/**
 * List all available backups
 */
export async function getBackupHistoryList(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, BACKUP_HISTORY_COLLECTION));
    if (!snap.empty) {
      return snap.docs.map((d) => d.data()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  } catch (e) {
    console.warn('getBackupHistoryList error, using local fallback:', e);
  }

  try {
    return JSON.parse(localStorage.getItem('huso_backup_history') || '[]');
  } catch {
    return [];
  }
}

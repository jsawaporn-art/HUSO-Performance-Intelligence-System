export type IndicatorType = 'KPI' | 'KVI';

export type IndicatorDirection =
  | 'MORE_IS_BETTER'
  | 'LESS_IS_BETTER'
  | 'EXACT_TARGET'
  | 'MILESTONE'
  | 'POSITIVE'
  | 'NEGATIVE';

export type ReportingPeriod =
  | 'QUARTERLY'
  | 'NINE_MONTH'
  | 'ANNUAL'
  | 'Q1'
  | 'Q2'
  | 'Q3'
  | 'Q4'
  | 'ROUND_9M'
  | 'ROUND_1Y';

export type VerificationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'REVISION'
  | 'VERIFIED'
  | 'APPROVED'
  | 'LOCKED';

export type TrafficLightStatus =
  | 'ON_TRACK'
  | 'WATCH'
  | 'RISK'
  | 'CRITICAL'
  | 'NO_DATA'
  | 'OVERDUE';

export type UserRole =
  | 'ADMIN'
  | 'EXECUTIVE'
  | 'REVIEWER'
  | 'OWNER'
  | 'DATA_SUPPORT'
  | 'VIEWER'
  | 'PUBLIC_VIEWER';

export interface Department {
  departmentId: string; // e.g. "DEP-001" - Primary Key / Doc ID
  id?: string; // Backward compatibility alias for departmentId
  departmentName: string; // e.g. "งานวิชาการ"
  name?: string; // Backward compatibility alias for departmentName
  departmentType: string; // e.g. "งานสำนักงานคณะ" | "กลุ่มผู้บริหาร"
  type?: string; // Backward compatibility alias for departmentType
  description?: string;
  responsiblePersonIds?: string[]; // e.g. ["PER-0005", "PER-0006"]
  responsiblePersonNames?: string[]; // e.g. ["นายเลิศยศ เผื่ออำนาจ"]
  displayOrder: number; // 1 to 8
  status: 'ACTIVE' | 'INACTIVE';
  isActive?: boolean; // Backward compatibility (status === 'ACTIVE')
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface CoResponsibleDepartment {
  departmentId: string;
  departmentName: string;
}

export interface DataSupporterItem {
  personnelId: string;
  fullName: string;
  role: string;
  email?: string;
}

export interface Personnel {
  personnelId: string; // e.g. PER-0001
  fullName: string;
  position?: string; // administrative position e.g. คณบดี, รองคณบดี
  administrativePosition?: string;
  departmentId?: string; // e.g. DEP-008
  departmentName?: string;
  role: string; // e.g. ผู้บริหาร, ผู้สนับสนุนข้อมูล
  personnelGroup: string; // e.g. ผู้บริหาร, บุคลากรสายสนับสนุน, คณาจารย์
  email?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export interface Indicator {
  indicatorId: string;
  code: string; // e.g. KPI-2569-001, KVI-2569-001
  type: IndicatorType;
  name: string;
  description: string;
  operationalDef: string;
  vision: string;
  strategyId: string;
  strategyName: string;
  objective: string;
  strategy: string;
  mission: string; // 1. การผลิตบัณฑิต, 2. การวิจัยและนวัตกรรม, etc.
  unit: string; // e.g. ร้อยละ, คน, โครงการ, หลักสูตร
  direction: IndicatorDirection;
  formula: string;
  source: string;
  aggregationMethod?: 'SUM' | 'LATEST_VALUE' | 'AVERAGE' | 'MANUAL_CUMULATIVE';
  dataSourceIds?: string[];
  frequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'ROUND_3M' | 'ROUND_6M' | 'ROUND_9M' | 'ROUND_1Y';
  baseline: number;
  ownerMain: string;
  ownerCo?: string;
  primaryOwnerId?: string; // PER-0001
  primaryOwnerName?: string; // ผศ.สวพร จันทรสกุล
  primaryOwnerPosition?: string; // คณบดี
  dataSupporterIds?: string[]; // ["PER-0005", "PER-0007", "PER-0010"]
  dataSupporters?: DataSupporterItem[];
  responsibleDepartmentId: string; // e.g. "DEP-001"
  responsibleDepartmentName: string; // e.g. "งานวิชาการ"
  coResponsibleDepartmentIds?: string[]; // e.g. ["DEP-005", "DEP-008"]
  coResponsibleDepartments?: CoResponsibleDepartment[];
  departmentId: string; // e.g. "DEP-001" (synced with responsibleDepartmentId)
  departmentName: string; // e.g. "งานวิชาการ" (synced with responsibleDepartmentName)
  mappingStatus?: 'MAPPED' | 'PENDING_MAPPING';
  originalDepartmentName?: string;
  startDate: string;
  endDate: string;
  weight: number; // e.g. 10 (%)
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  isActive: boolean;
  status: 'ACTIVE' | 'DELETED';
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface Target {
  targetId: string;
  indicatorId: string;
  fiscalYear: string; // '2569', '2570', '2571', '2572'
  annualTarget: number;
  minTarget: number; // เป้าหมายขั้นต่ำ
  challengeTarget: number; // เป้าหมายท้าทาย
  baseline: number;
  q1Target: number;
  q2Target: number;
  q3Target: number;
  q4Target: number;
  monthlyTargets: number[]; // Array of 12 numbers (Oct..Sep)
  cumulativeTargets: number[]; // Array of 12 cumulative numbers
}

export interface MonthlyProgress {
  progressId: string;
  resultKey?: string; // Composite unique key e.g. "2569_KPI-2569-001_Q1"
  fiscalYear: string; // e.g., '2569'
  month: number; // 1 = Oct, 2 = Nov ... 12 = Sep
  monthNameTh: string; // 'ตุลาคม', 'พฤศจิกายน', etc.
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  reportingPeriod?: ReportingPeriod | string; // 'QUARTERLY' | 'NINE_MONTH' | 'ANNUAL' | 'Q1'..
  indicatorId: string;
  indicatorCode: string;
  indicatorName: string;
  indicatorType: IndicatorType;
  targetMonthly: number;
  targetCumulative: number;
  targetValue?: number; // Read-only baseline / target from indicator
  actualMonthly: number;
  actualCumulative: number;
  actualValue?: number; // Entered actual result
  achievementPercent: number; // calculated %
  achievementCap?: number; // default 120 (%)
  isManualPercentage?: boolean; // When target is 0 or non-numeric
  manualReason?: string; // Reason for manual % entry
  variance: number;
  varianceText: string;
  status: TrafficLightStatus;
  summary: string;
  problems?: string;
  cause?: string;
  solution?: string;
  fastTrackMeasure?: string;
  ownerName: string;
  loggerName: string;
  loggedDate: string;
  lastModified: string;
  verificationStatus: VerificationStatus;
  reviewerComment?: string;
  evidenceCount: number;
  version?: number; // Increment on re-save
  isOutdated?: boolean; // If indicator definition changed after logging
  aggregationMethod?: 'SUM' | 'LATEST_VALUE' | 'AVERAGE' | 'MANUAL_CUMULATIVE';
  unlockReason?: string; // Reason provided when Admin/Reviewer unlocked approved record
  unlockedBy?: string; // Name/ID of person who unlocked
  unlockedAt?: string; // ISO Timestamp when unlocked
  previousVersionId?: string; // Reference to prior archived version
}

export type PerformanceResult = MonthlyProgress;

export interface Evidence {
  evidenceId: string;
  progressId: string;
  indicatorId: string;
  title: string;
  fileType: 'PDF' | 'DOC' | 'EXCEL' | 'IMAGE' | 'LINK';
  driveUrl: string;
  docLink?: string;
  description?: string;
  ownerName: string;
  uploadDate: string;
  verificationStatus: 'PENDING' | 'PASSED' | 'FAILED';
  reviewerName?: string;
  reviewerComments?: string;
}

export interface ActionDirective {
  directiveId: string;
  indicatorId: string;
  indicatorCode: string;
  indicatorName: string;
  title: string;
  details: string;
  departmentId: string;
  departmentName: string;
  assignee: string;
  deadline: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  rolesDisplay?: string;
  departmentId: string;
  departmentName: string;
  avatarUrl?: string;
  mustChangePassword?: boolean;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface ActivityLog {
  logId: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: UserRole;
  action:
    | 'LOGIN'
    | 'LOGOUT'
    | 'CREATE'
    | 'EDIT'
    | 'DELETE'
    | 'RESTORE'
    | 'SUBMIT'
    | 'RETURN'
    | 'VERIFY'
    | 'APPROVE'
    | 'LOCK'
    | 'UNLOCK'
    | 'EXPORT'
    | 'GENERATE_REPORT'
    | 'SEND_REPORT'
    | 'RESET'
    | 'BACKUP'
    | 'ROLLBACK';
  recordId: string;
  details: string;
  oldData?: any;
  newData?: any;
  status: 'SUCCESS' | 'FAILED';
}

export interface SystemConfig {
  scoreCap: number; // Default 120 (%)
  thresholds: {
    onTrack: number; // >= 100%
    watch: number; // 85% - <100%
    risk: number; // 70% - <85%
    critical: number; // < 70%
  };
  defaultFiscalYear: string; // e.g., '2569'
  notificationEmail: string;
  googleChatWebhook?: string;
  autoReportDayOfMonth: number; // e.g. 30
}

export interface MonthlyReport {
  reportId: string;
  fiscalYear: string;
  month: number;
  monthNameTh: string;
  title: string;
  summary: string;
  driveUrl: string;
  pdfUrl?: string;
  docUrl?: string;
  status: 'DRAFT' | 'APPROVED';
  generatedAt: string;
  generatedBy: string;
}

export interface FiscalYear {
  year: string;
  isCurrent: boolean;
  status: 'ACTIVE' | 'CLOSED' | 'DRAFT';
  startDate?: string;
  endDate?: string;
}

export interface NotificationItem {
  notificationId: string;
  userId?: string;
  title: string;
  message: string;
  type: 'ALERT' | 'INFO' | 'WARNING' | 'SUCCESS';
  isRead: boolean;
  createdAt: string;
}

export interface SequenceRecord {
  name: string;
  lastNumber: number;
  updatedAt: string;
}

export interface StrategicIssue {
  id: string;
  code: string;
  name: string;
  fiscalYear: string; // '2569', '2570', '2571', '2572', etc.
  objectives: string[];
}

export * from './types/bridge';

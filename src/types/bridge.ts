import { Department, Indicator, Personnel, StrategicIssue, User } from '../types';

export type BridgeStep = 'B' | 'R' | 'I' | 'D' | 'G' | 'E';

export interface BridgeStepInfo {
  code: BridgeStep;
  name: string;
  thaiName: string;
  description: string;
  color: string;
  badgeBg: string;
  badgeText: string;
}

export const BRIDGE_STEPS: Record<BridgeStep, BridgeStepInfo> = {
  B: {
    code: 'B',
    name: 'Build & Align',
    thaiName: 'B – เชื่อมยุทธศาสตร์ กระบวนการ ลูกค้า และ KPI/KVI',
    description: 'เชื่อมโยงเป้าหมาย ยุทธศาสตร์ ความต้องการของลูกค้า และตัวชี้วัดองค์กร',
    color: '#1E40AF', // Deep Blue
    badgeBg: 'bg-blue-100 dark:bg-blue-950/60',
    badgeText: 'text-blue-800 dark:text-blue-300',
  },
  R: {
    code: 'R',
    name: 'Review & Record',
    thaiName: 'R – บันทึกและทบทวนประเด็นจากข้อมูล',
    description: 'บันทึกสิ่งที่พบ ข้อเท็จจริง ข้อมูลผลดำเนินงาน หรือเสียงสะท้อนจากผู้รับบริการ',
    color: '#0284C7', // Sky Blue
    badgeBg: 'bg-sky-100 dark:bg-sky-950/60',
    badgeText: 'text-sky-800 dark:text-sky-300',
  },
  I: {
    code: 'I',
    name: 'Improve & Implement',
    thaiName: 'I – วิเคราะห์สาเหตุและดำเนินการปรับปรุง',
    description: 'ค้นหาสาเหตุรากเหง้า กำหนดมาตรการ และลงมือปฏิบัติการปรับปรุงอย่างเป็นระบบ',
    color: '#EA580C', // Orange
    badgeBg: 'bg-orange-100 dark:bg-orange-950/60',
    badgeText: 'text-orange-800 dark:text-orange-300',
  },
  D: {
    code: 'D',
    name: 'Drive & Discover Innovation',
    thaiName: 'D – ผลสำเร็จและเสนอพัฒนาเป็นนวัตกรรม',
    description: 'วัดผลสำเร็จ ตรวจสอบความเปลี่ยนแปลง และถอดบทเรียนเพื่อสร้างนวัตกรรม',
    color: '#9333EA', // Purple
    badgeBg: 'bg-purple-100 dark:bg-purple-950/60',
    badgeText: 'text-purple-800 dark:text-purple-300',
  },
  G: {
    code: 'G',
    name: 'Grow & Generalize',
    thaiName: 'G – ขยายผลไปยังหน่วยงาน หลักสูตร หรือเครือข่าย',
    description: 'นำแนวทางที่สำเร็จไปปรับใช้ ขยายผลสู่สาขาวิชา หลักสูตร หรือหน่วยงานอื่น',
    color: '#16A34A', // Green
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60',
    badgeText: 'text-emerald-800 dark:text-emerald-300',
  },
  E: {
    code: 'E',
    name: 'Excellence & EdPEx',
    thaiName: 'E – รับรองเป็นแนวปฏิบัติที่ดีหรือผลลัพธ์ที่เป็นเลิศ',
    description: 'ยกระดับเป็น Best Practice และเกณฑ์มาตรฐานความเป็นเลิศตามแนวทาง EdPEx',
    color: '#D97706', // Gold / Amber
    badgeBg: 'bg-amber-100 dark:bg-amber-950/60',
    badgeText: 'text-amber-800 dark:text-amber-300',
  },
};

export type BridgeIssueType =
  | 'ปัญหาการทำงาน'
  | 'โอกาสพัฒนา'
  | 'ผลดำเนินงานต่ำกว่าเป้าหมาย'
  | 'ความเสี่ยง'
  | 'ข้อร้องเรียน'
  | 'ข้อเสนอแนะ'
  | 'ความต้องการของลูกค้า'
  | 'ผลการประเมิน'
  | 'ผลการประชุมหรือ Management Review'
  | 'แนวคิดพัฒนานวัตกรรม'
  | 'อื่น ๆ';

export type BridgeOwnerType = 'DEPARTMENT' | 'COURSE';

export type BridgePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type BridgeStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IN_PROGRESS'
  | 'NEEDS_REVISION'
  | 'PENDING_REVIEW'
  | 'COMPLETED'
  | 'SCALED'
  | 'INNOVATION_NOMINATED'
  | 'BEST_PRACTICE'
  | 'CLOSED'
  | 'CANCELLED';

export type BridgeLifecycleStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'DELAYED'
  | 'WAITING_FOR_DECISION'
  | 'COMPLETED'
  | 'VERIFIED'
  | 'BEST_PRACTICE'
  | 'SCALE_UP'
  | 'CANCELLED';

export type BridgeWorkflowStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_DECISION'
  | 'COMPLETED'
  | 'VERIFIED'
  | 'CANCELLED';

export interface BridgeStatusBadgeConfig {
  code: BridgeLifecycleStatus | BridgeStatus;
  thaiLabel: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  dotColor: string;
}

export const BRIDGE_LIFECYCLE_STATUS_CONFIG: Record<string, BridgeStatusBadgeConfig> = {
  DRAFT: {
    code: 'DRAFT',
    thaiLabel: 'แบบร่าง',
    badgeBg: 'bg-slate-100 dark:bg-slate-800',
    badgeText: 'text-slate-700 dark:text-slate-300',
    borderColor: 'border-slate-300 dark:border-slate-700',
    dotColor: 'bg-slate-400',
  },
  IN_PROGRESS: {
    code: 'IN_PROGRESS',
    thaiLabel: 'กำลังดำเนินการ',
    badgeBg: 'bg-blue-100 dark:bg-blue-950/60',
    badgeText: 'text-blue-800 dark:text-blue-300',
    borderColor: 'border-blue-300 dark:border-blue-800',
    dotColor: 'bg-blue-500',
  },
  DELAYED: {
    code: 'DELAYED',
    thaiLabel: 'ล่าช้า',
    badgeBg: 'bg-rose-100 dark:bg-rose-950/60',
    badgeText: 'text-rose-800 dark:text-rose-300',
    borderColor: 'border-rose-300 dark:border-rose-800',
    dotColor: 'bg-rose-500',
  },
  WAITING_FOR_DECISION: {
    code: 'WAITING_FOR_DECISION',
    thaiLabel: 'รอผู้บริหารตัดสินใจ',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/60',
    badgeText: 'text-amber-800 dark:text-amber-300',
    borderColor: 'border-amber-300 dark:border-amber-800',
    dotColor: 'bg-amber-500',
  },
  COMPLETED: {
    code: 'COMPLETED',
    thaiLabel: 'ดำเนินการเสร็จ',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60',
    badgeText: 'text-emerald-800 dark:text-emerald-300',
    borderColor: 'border-emerald-300 dark:border-emerald-800',
    dotColor: 'bg-emerald-500',
  },
  VERIFIED: {
    code: 'VERIFIED',
    thaiLabel: 'รับรองผลแล้ว',
    badgeBg: 'bg-teal-100 dark:bg-teal-950/60',
    badgeText: 'text-teal-800 dark:text-teal-300',
    borderColor: 'border-teal-300 dark:border-teal-800',
    dotColor: 'bg-teal-500',
  },
  BEST_PRACTICE: {
    code: 'BEST_PRACTICE',
    thaiLabel: 'แนวปฏิบัติที่ดี',
    badgeBg: 'bg-purple-100 dark:bg-purple-950/60',
    badgeText: 'text-purple-800 dark:text-purple-300',
    borderColor: 'border-purple-300 dark:border-purple-800',
    dotColor: 'bg-purple-500',
  },
  SCALE_UP: {
    code: 'SCALE_UP',
    thaiLabel: 'ขยายผลองค์กร',
    badgeBg: 'bg-indigo-100 dark:bg-indigo-950/60',
    badgeText: 'text-indigo-800 dark:text-indigo-300',
    borderColor: 'border-indigo-300 dark:border-indigo-800',
    dotColor: 'bg-indigo-500',
  },
  CANCELLED: {
    code: 'CANCELLED',
    thaiLabel: 'ยกเลิก',
    badgeBg: 'bg-gray-100 dark:bg-gray-800',
    badgeText: 'text-gray-600 dark:text-gray-400',
    borderColor: 'border-gray-300 dark:border-gray-700',
    dotColor: 'bg-gray-400',
  },
};

export function getBridgeStatusConfig(
  item: Partial<BridgeImprovement> | string
): BridgeStatusBadgeConfig {
  let statusKey = 'DRAFT';
  if (typeof item === 'string') {
    statusKey = item;
  } else if (item) {
    if (item.lifecycleStatus) {
      statusKey = item.lifecycleStatus;
    } else if (item.workflowStatus) {
      statusKey = item.workflowStatus;
    } else if (item.overallStatus) {
      statusKey = item.overallStatus;
    }
  }

  return (
    BRIDGE_LIFECYCLE_STATUS_CONFIG[statusKey] ||
    BRIDGE_LIFECYCLE_STATUS_CONFIG['DRAFT']
  );
}

export type BridgeEvaluationResult =
  | 'สำเร็จตามเป้าหมาย'
  | 'สำเร็จบางส่วน'
  | 'ยังไม่สำเร็จ'
  | 'ต้องปรับแนวทางใหม่'
  | 'ต้องติดตามต่อ'
  | 'พร้อมขยายผล'
  | 'เสนอเป็นนวัตกรรม'
  | 'เสนอเป็นแนวปฏิบัติที่ดี'
  | 'ปิดประเด็น'
  | 'ยกเลิกพร้อมเหตุผล';

export interface BridgeCustomerGroup {
  id: string;
  name: string;
  category: 'CUSTOMER' | 'STAKEHOLDER' | 'OTHER';
}

export interface BridgeActionItem {
  actionId: string;
  title: string;
  responsiblePersonId: string;
  responsiblePersonName: string;
  startDate: string;
  targetEndDate: string;
  weight: number; // percentage, sum = 100%
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
  progressPercentage: number;
  operationalResult?: string;
  problemsObstacles?: string;
  lastUpdatedAt?: string;
}

export interface BridgeProgressUpdate {
  reportId: string;
  improvementId: string;
  periodName: string; // e.g. "รอบที่ 1 (ต.ค. - ธ.ค. 2568)"
  completedTasksSummary: string;
  periodAchievement: string;
  cumulativeResult: string;
  progressPercentage: number;
  beforeImprovementResult?: string;
  afterImprovementResult?: string;
  quantitativeData?: string;
  qualitativeData?: string;
  customerImpactFeedback?: string;
  remainingProblems?: string;
  nextSteps?: string;
  requiresExecutiveDecision: boolean;
  decisionTopic?: string;
  evidenceLinks?: { title: string; url: string }[];
  reportedById: string;
  reportedByName: string;
  reportedAt: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED_FOR_REVISION';
  reviewerFeedback?: string;
  reviewedById?: string;
  reviewedByName?: string;
  reviewedAt?: string;
}

export type BridgeAiAnalysisStatus =
  | 'NOT_ANALYZED'
  | 'ANALYZING'
  | 'COMPLETED'
  | 'EDITED_BY_USER'
  | 'FAILED';

export type BridgeAnalysisSource = 'AI' | 'AI_ASSISTED' | 'MANUAL';

export interface BridgeAiProbableCause {
  cause: string;
  reason?: string;
  confidence?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface BridgeAiAnalysisResult {
  currentState?: string;
  desiredState?: string;
  identifiedGap?: string;
  probableRootCauses: (string | BridgeAiProbableCause)[];
  informationNeeded?: string[];
  possibleImpacts?: string[];
  recommendedActions?: string[];
  suggestedSuccessIndicators?: string[];
  aiSummary?: string;
  problemSummary?: string;
  confidence?: 'LOW' | 'MEDIUM' | 'HIGH';
  overallConfidence?: 'LOW' | 'MEDIUM' | 'HIGH';
  limitations?: string[];
  analysisDurationSeconds?: number;
  isFromCache?: boolean;
  generatedAt: string;
  aiModel?: string;
  inputHash?: string;
  analysisVersion?: number;
}

export interface BridgeAiExecutiveIssueSummary {
  executiveSummary: string;
  keyAchievements: string[];
  customerImpact: string;
  bottlenecksAndRisks: string[];
  policyRecommendations: string[];
  strategicAlignmentNote: string;
  overallRating: 'EXCELLENT' | 'GOOD' | 'NEEDS_ACCELERATION' | 'CRITICAL_ATTENTION';
  generatedAt: string;
  aiModel: string;
}

export interface BridgeExecutiveDecision {
  decisionId: string;
  improvementId: string;
  improvementTitle: string;
  departmentOrCourseName: string;
  requestedBy: string;
  requestedAt: string;
  topic: string;
  details: string;
  proposedOptions?: string;
  decisionStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DIRECTED';
  executiveComment?: string;
  decidedBy?: string;
  decidedAt?: string;
}

export interface BridgeImprovement {
  id: string; // Document ID
  improvementId: string; // BRG-2569-0001
  fiscalYear: number; // 2569
  title: string;
  issueDetails: string;
  issueType: BridgeIssueType;
  workDomain: string; // ด้านงานหรือกระบวนการ
  ownerType: BridgeOwnerType;
  ownerId: string; // departmentId or courseId
  ownerNameSnapshot: string;
  relatedDepartmentIds?: string[];
  relatedCourseIds?: string[];

  // Sources & Customer/Stakeholders
  issueSource: string;
  issueSourceDetail?: string;
  sourceReferenceUrl?: string;
  affectedGroupType: 'CUSTOMER' | 'STAKEHOLDER' | 'BOTH' | 'OTHER';
  affectedGroupIds: string[];
  affectedGroupDetail?: string;
  customerNeed?: string;
  customerExpectation?: string;
  customerFeedback?: string;
  impactOnCustomer?: string;

  // Urgency & KPI Alignment
  priority: BridgePriority;
  relatedIndicatorId?: string;
  relatedIndicatorName?: string;
  discoveredDate: string;
  recordedById: string;
  recordedByName: string;
  createdAt: string;
  updatedAt: string;

  // Step 2: Analysis Details
  currentState?: string;
  desiredState?: string;
  gapIdentified?: string;
  probableCauses?: string; // สาเหตุที่เป็นไปได้
  possibleImpacts?: string; // ผลกระทบที่อาจเกิดขึ้น
  informationNeeded?: string; // ข้อมูลที่ควรตรวจสอบเพิ่มเติม
  recommendedActions?: string; // แนวทางปรับปรุงเบื้องต้น
  suggestedSuccessIndicators?: string; // ตัวชี้วัดความสำเร็จที่แนะนำ
  aiSummary?: string; // สรุปการวิเคราะห์ประเด็น
  verifiedRootCauses?: string; // สาเหตุที่ตรวจสอบแล้ว
  causeVerificationStatus?: 'UNVERIFIED' | 'VERIFIED' | 'NEEDS_FURTHER_CHECK'; // สถานะการตรวจสอบสาเหตุ
  verifiedBy?: string;
  verifiedAt?: string;
  impactOnDepartment?: string;
  impactOnStrategyOrKpi?: string;
  consequencesOfInaction?: string;
  analysisToolUsed?: '5 Whys' | 'Gap Analysis' | 'Fishbone' | 'VOC Analysis' | 'Benchmark Comparison' | 'Data Trends' | 'Risk Analysis' | 'General' | 'Other';
  analysisNotes?: string;
  aiAnalysisSnapshot?: BridgeAiAnalysisResult;
  aiAnalysisResult?: BridgeAiAnalysisResult;
  aiOriginalAnalysis?: BridgeAiAnalysisResult;
  aiExecutiveSummary?: BridgeAiExecutiveIssueSummary;
  userEditedAnalysis?: Record<string, string>;
  analysisSource?: BridgeAnalysisSource;
  analysisStatus?: BridgeAiAnalysisStatus;
  analyzedAt?: string;
  aiModel?: string;
  inputHash?: string;
  analysisVersion?: number;

  // Step 3: Plan & Assignees
  improvementApproach?: string;
  expectedOutcome?: string;
  successMeasurementMethod?: string;
  targetValue?: string;
  primaryResponsiblePersonId: string;
  primaryResponsiblePersonName: string;
  coResponsiblePersonIds?: string[];
  coResponsiblePersonNames?: string[];
  dataSupportPersonIds?: string[];
  dataSupportPersonNames?: string[];
  reviewerPersonId?: string;
  reviewerPersonName?: string;
  approverPersonId?: string;
  approverPersonName?: string;
  startDate: string;
  targetEndDate: string;
  trackingFrequency: 'MONTHLY' | 'QUARTERLY' | 'BI_ANNUAL' | 'ON_COMPLETION';
  requiredResources?: string;
  budgetAmount?: number;
  executiveDecisionNeededNotes?: string;

  // Action items sub-collection or embedded
  actionItems: BridgeActionItem[];

  // Step 4: Evaluation & Outcomes
  progressReports?: BridgeProgressUpdate[];
  currentProgressPercentage: number;
  overallStatus: BridgeStatus;
  lifecycleStatus?: BridgeLifecycleStatus;
  workflowStatus?: BridgeWorkflowStatus;
  publicVisibility?: boolean;
  isActive?: boolean;
  startedAt?: string;
  currentBridgeStep: BridgeStep; // Auto calculated
  currentBridgeStage?: BridgeStep;
  evaluationResult?: BridgeEvaluationResult;
  cancellationReason?: string;

  // EdPEx reflection questions
  edpexOriginalProblemReduced?: 'YES' | 'PARTIAL' | 'NO';
  edpexResultImprovementDetail?: string;
  edpexCustomerBenefitDetail?: string;
  edpexReplicableToOtherDepts?: boolean;
  edpexKnowledgeCreatedDetail?: string;

  // Innovation & Best Practice Scaling
  isInnovationCandidate?: boolean;
  innovationCategory?: string;
  isBestPractice?: boolean;
  scalingTargetDepartmentsOrCourses?: string[];

  // Soft Delete & Metadata
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  version: number;
}

export interface BridgeDomainConfig {
  id: string;
  name: string;
  description?: string;
  order: number;
  isActive: boolean;
}

export const INITIAL_WORK_DOMAINS: string[] = [
  'การจัดการเรียนการสอน',
  'การบริหารหลักสูตร',
  'การพัฒนานักศึกษา',
  'การวิจัยและนวัตกรรม',
  'การบริการวิชาการ',
  'การพัฒนาท้องถิ่น',
  'การทำนุบำรุงศิลปะและวัฒนธรรม',
  'การประกันคุณภาพการศึกษา',
  'การบริหารแผนและยุทธศาสตร์',
  'การบริหารบุคคล',
  'การเงินและงบประมาณ',
  'พัสดุและจัดซื้อจัดจ้าง',
  'งานสารบรรณและเอกสาร',
  'อาคารสถานที่และสิ่งสนับสนุน',
  'เทคโนโลยีสารสนเทศ',
  'การสื่อสารองค์กร',
  'การบริหารความเสี่ยง',
  'การควบคุมภายใน',
  'การบริการผู้รับบริการ',
  'กระบวนการสนับสนุนอื่น ๆ',
];

export const INITIAL_ISSUE_TYPES: BridgeIssueType[] = [
  'ปัญหาการทำงาน',
  'โอกาสพัฒนา',
  'ผลดำเนินงานต่ำกว่าเป้าหมาย',
  'ความเสี่ยง',
  'ข้อร้องเรียน',
  'ข้อเสนอแนะ',
  'ความต้องการของลูกค้า',
  'ผลการประเมิน',
  'ผลการประชุมหรือ Management Review',
  'แนวคิดพัฒนานวัตกรรม',
  'อื่น ๆ',
];

export const INITIAL_CUSTOMER_GROUPS: { id: string; name: string; category: 'CUSTOMER' | 'STAKEHOLDER' }[] = [
  // Customers
  { id: 'CUST-01', name: 'นักศึกษาปัจจุบัน', category: 'CUSTOMER' },
  { id: 'CUST-02', name: 'นักเรียนหรือผู้สมัครเข้าศึกษา', category: 'CUSTOMER' },
  { id: 'CUST-03', name: 'ผู้ปกครอง', category: 'CUSTOMER' },
  { id: 'CUST-04', name: 'ผู้ใช้บัณฑิต', category: 'CUSTOMER' },
  { id: 'CUST-05', name: 'ผู้รับบริการวิชาการ', category: 'CUSTOMER' },
  { id: 'CUST-06', name: 'ผู้เข้าร่วมอบรม', category: 'CUSTOMER' },
  { id: 'CUST-07', name: 'ชุมชนหรือพื้นที่รับบริการ', category: 'CUSTOMER' },
  { id: 'CUST-08', name: 'หน่วยงานที่ว่าจ้างหรือสนับสนุนงบประมาณ', category: 'CUSTOMER' },
  { id: 'CUST-09', name: 'ลูกค้าหรือผู้รับบริการอื่น ๆ', category: 'CUSTOMER' },
  // Stakeholders
  { id: 'STK-01', name: 'บุคลากรสายวิชาการ', category: 'STAKEHOLDER' },
  { id: 'STK-02', name: 'บุคลากรสายสนับสนุน', category: 'STAKEHOLDER' },
  { id: 'STK-03', name: 'ศิษย์เก่า', category: 'STAKEHOLDER' },
  { id: 'STK-04', name: 'มหาวิทยาลัย', category: 'STAKEHOLDER' },
  { id: 'STK-05', name: 'หน่วยงานภาครัฐ', category: 'STAKEHOLDER' },
  { id: 'STK-06', name: 'หน่วยงานเอกชน', category: 'STAKEHOLDER' },
  { id: 'STK-07', name: 'สถานประกอบการ', category: 'STAKEHOLDER' },
  { id: 'STK-08', name: 'เครือข่ายวิชาการ', category: 'STAKEHOLDER' },
  { id: 'STK-09', name: 'เครือข่ายต่างประเทศ', category: 'STAKEHOLDER' },
  { id: 'STK-10', name: 'ชุมชน', category: 'STAKEHOLDER' },
  { id: 'STK-11', name: 'คณะกรรมการหรือผู้ประเมิน', category: 'STAKEHOLDER' },
  { id: 'STK-12', name: 'ผู้มีส่วนได้ส่วนเสียอื่น ๆ', category: 'STAKEHOLDER' },
];

export const INITIAL_ISSUE_SOURCES: string[] = [
  'ผล KPI/KVI',
  'Dashboard',
  'ข้อมูลผลการดำเนินงาน',
  'Management Review',
  'ผลประเมิน EdPEx',
  'ผลประเมิน AUN-QA',
  'ผลตรวจสอบภายใน',
  'การบริหารความเสี่ยง',
  'VOC (เสียงสะท้อนจากลูกค้า)',
  'แบบประเมินความพึงพอใจ',
  'ข้อร้องเรียน',
  'ข้อเสนอแนะ',
  'การประชุม',
  'บุคลากรรายงาน',
  'ผู้บริหารพบประเด็น',
  'Benchmark',
  'ข้อมูลจากระบบงบประมาณ',
  'อื่น ๆ',
];

export interface MasterCourse {
  id: string;
  code: string;
  name: string;
  degree: 'ปริญญาตรี' | 'ปริญญาโท' | 'ปริญญาเอก';
  departmentId?: string;
  chairpersonName?: string;
}

export const HUSO_MASTER_COURSES: MasterCourse[] = [
  { id: 'CRS-01', code: 'THAI', name: 'หลักสูตรศิลปศาสตรบัณฑิต สาขาวิชาภาษาไทย', degree: 'ปริญญาตรี', departmentId: 'DEP-001' },
  { id: 'CRS-02', code: 'ENG', name: 'หลักสูตรศิลปศาสตรบัณฑิต สาขาวิชาภาษาอังกฤษ', degree: 'ปริญญาตรี', departmentId: 'DEP-001' },
  { id: 'CRS-03', code: 'BENG', name: 'หลักสูตรศิลปศาสตรบัณฑิต สาขาวิชาภาษาอังกฤษธุรกิจ', degree: 'ปริญญาตรี', departmentId: 'DEP-001' },
  { id: 'CRS-04', code: 'ARB', name: 'หลักสูตรศิลปศาสตรบัณฑิต สาขาวิชาภาษาอาหรับเพื่อธุรกิจสุขภาพและการท่องเที่ยว', degree: 'ปริญญาตรี', departmentId: 'DEP-001' },
  { id: 'CRS-05', code: 'MALAY', name: 'หลักสูตรศิลปศาสตรบัณฑิต สาขาวิชาภาษามลายูเพื่อธุรกิจ', degree: 'ปริญญาตรี', departmentId: 'DEP-001' },
  { id: 'CRS-06', code: 'CHN', name: 'หลักสูตรศิลปศาสตรบัณฑิต สาขาวิชาภาษาจีนเพื่อการสื่อสาร', degree: 'ปริญญาตรี', departmentId: 'DEP-001' },
  { id: 'CRS-07', code: 'DEV', name: 'หลักสูตรศิลปศาสตรบัณฑิต สาขาวิชาการพัฒนาชุมชน', degree: 'ปริญญาตรี', departmentId: 'DEP-001' },
  { id: 'CRS-08', code: 'LAW', name: 'หลักสูตรนิติศาสตรบัณฑิต สาขาวิชานิติศาสตร์', degree: 'ปริญญาตรี', departmentId: 'DEP-001' },
  { id: 'CRS-09', code: 'PA', name: 'หลักสูตรรัฐประศาสนศาสตรบัณฑิต สาขาวิชารัฐประศาสนศาสตร์', degree: 'ปริญญาตรี', departmentId: 'DEP-001' },
  { id: 'CRS-10', code: 'POL', name: 'หลักสูตรรัฐศาสตรบัณฑิต สาขาวิชาการเมืองการปกครอง', degree: 'ปริญญาตรี', departmentId: 'DEP-001' },
  { id: 'CRS-11', code: 'INF', name: 'หลักสูตรสารสนเทศศาสตรบัณฑิต สาขาวิชาสารสนเทศศาสตร์และเทคโนโลยีดิจิทัล', degree: 'ปริญญาตรี', departmentId: 'DEP-001' },
  { id: 'CRS-12', code: 'ART', name: 'หลักสูตรศิลปกรรมศาสตรบัณฑิต สาขาวิชาการออกแบบศิลปกรรมและดิจิทัลมีเดีย', degree: 'ปริญญาตรี', departmentId: 'DEP-001' },
  { id: 'CRS-13', code: 'LIB', name: 'หลักสูตรศิลปศาสตรบัณฑิต สาขาวิชาการจัดการสารสนเทศและบรรณารักษศาสตร์', degree: 'ปริญญาตรี', departmentId: 'DEP-001' },
  { id: 'CRS-14', code: 'SOC', name: 'หลักสูตรศิลปศาสตรบัณฑิต สาขาวิชาสังคมศาสตร์และการพัฒนา', degree: 'ปริญญาตรี', departmentId: 'DEP-001' },
  { id: 'CRS-15', code: 'ISLAM', name: 'หลักสูตรศิลปศาสตรบัณฑิต สาขาวิชาอิสลามศึกษาและภาษาอาหรับ', degree: 'ปริญญาตรี', departmentId: 'DEP-001' },
  { id: 'CRS-16', code: 'MPA', name: 'หลักสูตรรัฐประศาสนศาสตรมหาบัณฑิต สาขาวิชารัฐประศาสนศาสตร์ (รป.ม.)', degree: 'ปริญญาโท', departmentId: 'DEP-001' },
  { id: 'CRS-17', code: 'MTHAI', name: 'หลักสูตรศิลปศาสตรมหาบัณฑิต สาขาวิชาภาษาไทยเพื่อการสื่อสารวิชาชีพ (ศศ.ม.)', degree: 'ปริญญาโท', departmentId: 'DEP-001' },
  { id: 'CRS-18', code: 'PHD', name: 'หลักสูตรปรัชญาดุษฎีบัณฑิต สาขาวิชาการพัฒนาสังคมและชุมชน (ปร.ด.)', degree: 'ปริญญาเอก', departmentId: 'DEP-001' },
];

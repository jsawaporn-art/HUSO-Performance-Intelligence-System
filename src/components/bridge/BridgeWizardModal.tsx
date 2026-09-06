import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  BridgeImprovement,
  BridgeActionItem,
  BridgeIssueType,
  BridgeOwnerType,
  BridgePriority,
  BridgeEvaluationResult,
  BridgeStatus,
  BridgeAiAnalysisStatus,
  BridgeAnalysisSource,
  INITIAL_WORK_DOMAINS,
  INITIAL_ISSUE_TYPES,
  INITIAL_CUSTOMER_GROUPS,
  INITIAL_ISSUE_SOURCES,
  HUSO_MASTER_COURSES,
  BRIDGE_STEPS,
  BridgeAiAnalysisResult,
} from '../../types/bridge';
import { Department, Indicator, Personnel, StrategicIssue, User } from '../../types';
import { INITIAL_USERS } from '../../mockData';
import { bridgeService } from '../../lib/bridgeService';
import { requestBridgeAiAnalysis, generateBridgeInputHash } from '../../lib/bridgeAiService';
import { BridgeAiResultModal } from './BridgeAiResultModal';
import { BridgeAiSelectiveModal } from './BridgeAiSelectiveModal';
import {
  X,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Layers,
  Search,
  Building2,
  GraduationCap,
  Users,
  Target,
  FileText,
  Calendar,
  DollarSign,
  HelpCircle,
  Lightbulb,
  Check,
  RefreshCw,
  Award,
  ShieldCheck,
  Clock,
  Zap,
  RotateCcw,
  ListChecks,
  AlertTriangle,
  Info,
  Edit3,
  Undo2,
  Wand2,
} from 'lucide-react';

interface BridgeWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (savedItem: BridgeImprovement) => void;
  onSaveSuccess?: () => void;
  editingItem?: BridgeImprovement | null;
  initialData?: BridgeImprovement | null;
  departments: Department[];
  personnel?: Personnel[];
  users?: User[];
  indicators?: Indicator[];
  strategies?: StrategicIssue[];
  currentUser: User | null;
}

export const BridgeWizardModal: React.FC<BridgeWizardModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  onSaveSuccess,
  editingItem,
  initialData,
  departments,
  personnel = [],
  users = [],
  indicators = [],
  strategies = [],
  currentUser,
}) => {
  const activeEditingItem = editingItem || initialData || null;
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState<boolean>(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<BridgeAiAnalysisResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [isSelectiveModalOpen, setIsSelectiveModalOpen] = useState<boolean>(false);
  const [aiToastMessage, setAiToastMessage] = useState<string | null>(null);

  // AI Analysis Metadata State
  const [analysisStatus, setAnalysisStatus] = useState<BridgeAiAnalysisStatus>('NOT_ANALYZED');
  const [analysisSource, setAnalysisSource] = useState<BridgeAnalysisSource>('MANUAL');
  const [aiOriginalAnalysis, setAiOriginalAnalysis] = useState<BridgeAiAnalysisResult | null>(null);
  const [lastAnalyzedInputHash, setLastAnalyzedInputHash] = useState<string>('');
  const [analyzedAt, setAnalyzedAt] = useState<string>('');
  const [aiModel, setAiModel] = useState<string>('gemini-3.7-flash');
  const [analysisVersion, setAnalysisVersion] = useState<number>(1);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Per-field Dirty State for Step 2 & 3
  const [currentStateDirty, setCurrentStateDirty] = useState<boolean>(false);
  const [desiredStateDirty, setDesiredStateDirty] = useState<boolean>(false);
  const [gapIdentifiedDirty, setGapIdentifiedDirty] = useState<boolean>(false);
  const [probableCausesDirty, setProbableCausesDirty] = useState<boolean>(false);
  const [possibleImpactsDirty, setPossibleImpactsDirty] = useState<boolean>(false);
  const [informationNeededDirty, setInformationNeededDirty] = useState<boolean>(false);
  const [impactOnCustomerDirty, setImpactOnCustomerDirty] = useState<boolean>(false);
  const [consequencesOfInactionDirty, setConsequencesOfInactionDirty] = useState<boolean>(false);
  const [improvementApproachDirty, setImprovementApproachDirty] = useState<boolean>(false);
  const [expectedOutcomeDirty, setExpectedOutcomeDirty] = useState<boolean>(false);
  const [recommendedActionsDirty, setRecommendedActionsDirty] = useState<boolean>(false);
  const [suggestedSuccessIndicatorsDirty, setSuggestedSuccessIndicatorsDirty] = useState<boolean>(false);
  const [aiSummaryDirty, setAiSummaryDirty] = useState<boolean>(false);

  // Compute available users from users, personnel or INITIAL_USERS
  const effectiveUsers: User[] = useMemo(() => {
    if (users && users.length > 0) return users;
    if (personnel && personnel.length > 0) {
      return personnel.map((p, idx) => ({
        userId: p.personnelId || `PERS-${idx}`,
        email: p.email || '',
        fullName: p.fullName || 'บุคลากร',
        role: 'OWNER' as const,
        departmentId: p.departmentId || 'DEP-001',
        departmentName: p.departmentName || 'คณะ',
      }));
    }
    return INITIAL_USERS;
  }, [users, personnel]);

  // Form State
  const [fiscalYear, setFiscalYear] = useState<number>(2569);
  const [improvementId, setImprovementId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [issueDetails, setIssueDetails] = useState<string>('');
  const [issueType, setIssueType] = useState<BridgeIssueType>('ปัญหาการทำงาน');
  const [workDomain, setWorkDomain] = useState<string>(INITIAL_WORK_DOMAINS[0]);
  const [ownerType, setOwnerType] = useState<BridgeOwnerType>('DEPARTMENT');
  const [ownerId, setOwnerId] = useState<string>(departments[0]?.id || 'DEP-001');
  const [ownerNameSnapshot, setOwnerNameSnapshot] = useState<string>(departments[0]?.name || 'งานวิชาการ');
  const [relatedDepartmentIds, setRelatedDepartmentIds] = useState<string[]>([]);
  const [relatedCourseIds, setRelatedCourseIds] = useState<string[]>([]);

  // Source & Customers
  const [issueSource, setIssueSource] = useState<string>(INITIAL_ISSUE_SOURCES[0]);
  const [issueSourceDetail, setIssueSourceDetail] = useState<string>('');
  const [sourceReferenceUrl, setSourceReferenceUrl] = useState<string>('');
  const [affectedGroupType, setAffectedGroupType] = useState<'CUSTOMER' | 'STAKEHOLDER' | 'BOTH' | 'OTHER'>('CUSTOMER');
  const [affectedGroupIds, setAffectedGroupIds] = useState<string[]>(['CUST-01']);
  const [affectedGroupDetail, setAffectedGroupDetail] = useState<string>('');
  const [customerNeed, setCustomerNeed] = useState<string>('');
  const [customerExpectation, setCustomerExpectation] = useState<string>('');
  const [customerFeedback, setCustomerFeedback] = useState<string>('');
  const [impactOnCustomer, setImpactOnCustomer] = useState<string>('');

  // Priority & Indicator
  const [priority, setPriority] = useState<BridgePriority>('MEDIUM');
  const [relatedIndicatorId, setRelatedIndicatorId] = useState<string>('');
  const [relatedIndicatorName, setRelatedIndicatorName] = useState<string>('');
  const [discoveredDate, setDiscoveredDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Step 2: Analysis Details & Cause Verification (All 9 Core Fields)
  const [currentState, setCurrentState] = useState<string>('');
  const [desiredState, setDesiredState] = useState<string>('');
  const [gapIdentified, setGapIdentified] = useState<string>('');
  const [probableCauses, setProbableCauses] = useState<string>('');
  const [possibleImpacts, setPossibleImpacts] = useState<string>('');
  const [informationNeeded, setInformationNeeded] = useState<string>('');
  const [aiSummary, setAiSummary] = useState<string>('');
  const [verifiedRootCauses, setVerifiedRootCauses] = useState<string>('');
  const [causeVerificationStatus, setCauseVerificationStatus] = useState<'UNVERIFIED' | 'VERIFIED' | 'NEEDS_FURTHER_CHECK'>('UNVERIFIED');
  const [verifiedBy, setVerifiedBy] = useState<string>('');
  const [verifiedAt, setVerifiedAt] = useState<string>('');
  const [impactOnDepartment, setImpactOnDepartment] = useState<string>('');
  const [impactOnStrategyOrKpi, setImpactOnStrategyOrKpi] = useState<string>('');
  const [consequencesOfInaction, setConsequencesOfInaction] = useState<string>('');
  const [analysisToolUsed, setAnalysisToolUsed] = useState<any>('General');
  const [analysisNotes, setAnalysisNotes] = useState<string>('');

  // Step 3: Plan & Assignees
  const [improvementApproach, setImprovementApproach] = useState<string>('');
  const [expectedOutcome, setExpectedOutcome] = useState<string>('');
  const [successMeasurementMethod, setSuccessMeasurementMethod] = useState<string>('');
  const [targetValue, setTargetValue] = useState<string>('');
  const [primaryResponsiblePersonId, setPrimaryResponsiblePersonId] = useState<string>(currentUser?.userId || users[0]?.userId || 'U-001');
  const [primaryResponsiblePersonName, setPrimaryResponsiblePersonName] = useState<string>(currentUser?.fullName || users[0]?.fullName || 'ผู้รับผิดชอบ');
  const [coResponsiblePersonIds, setCoResponsiblePersonIds] = useState<string[]>([]);
  const [dataSupportPersonIds, setDataSupportPersonIds] = useState<string[]>([]);
  const [reviewerPersonId, setReviewerPersonId] = useState<string>('');
  const [approverPersonId, setApproverPersonId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [targetEndDate, setTargetEndDate] = useState<string>(
    new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [trackingFrequency, setTrackingFrequency] = useState<'MONTHLY' | 'QUARTERLY' | 'BI_ANNUAL' | 'ON_COMPLETION'>('MONTHLY');
  const [requiredResources, setRequiredResources] = useState<string>('');
  const [budgetAmount, setBudgetAmount] = useState<number>(0);
  const [executiveDecisionNeededNotes, setExecutiveDecisionNeededNotes] = useState<string>('');

  // Action items
  const [actionItems, setActionItems] = useState<BridgeActionItem[]>([]);

  // Step 4: Outcomes & EdPEx
  const [currentProgressPercentage, setCurrentProgressPercentage] = useState<number>(0);
  const [evaluationResult, setEvaluationResult] = useState<BridgeEvaluationResult | ''>('');
  const [edpexOriginalProblemReduced, setEdpexOriginalProblemReduced] = useState<'YES' | 'PARTIAL' | 'NO'>('YES');
  const [edpexResultImprovementDetail, setEdpexResultImprovementDetail] = useState<string>('');
  const [edpexCustomerBenefitDetail, setEdpexCustomerBenefitDetail] = useState<string>('');
  const [edpexReplicableToOtherDepts, setEdpexReplicableToOtherDepts] = useState<boolean>(false);
  const [edpexKnowledgeCreatedDetail, setEdpexKnowledgeCreatedDetail] = useState<string>('');
  const [isInnovationCandidate, setIsInnovationCandidate] = useState<boolean>(false);
  const [isBestPractice, setIsBestPractice] = useState<boolean>(false);
  const [scalingTargetDepartmentsOrCourses, setScalingTargetDepartmentsOrCourses] = useState<string[]>([]);

  // Initialize or Reset Form
  useEffect(() => {
    if (editingItem) {
      setFiscalYear(editingItem.fiscalYear || 2569);
      setImprovementId(editingItem.improvementId);
      setTitle(editingItem.title || '');
      setIssueDetails(editingItem.issueDetails || '');
      setIssueType(editingItem.issueType || 'ปัญหาการทำงาน');
      setWorkDomain(editingItem.workDomain || INITIAL_WORK_DOMAINS[0]);
      setOwnerType(editingItem.ownerType || 'DEPARTMENT');
      setOwnerId(editingItem.ownerId || '');
      setOwnerNameSnapshot(editingItem.ownerNameSnapshot || '');
      setRelatedDepartmentIds(editingItem.relatedDepartmentIds || []);
      setRelatedCourseIds(editingItem.relatedCourseIds || []);
      setIssueSource(editingItem.issueSource || INITIAL_ISSUE_SOURCES[0]);
      setIssueSourceDetail(editingItem.issueSourceDetail || '');
      setSourceReferenceUrl(editingItem.sourceReferenceUrl || '');
      setAffectedGroupType(editingItem.affectedGroupType || 'CUSTOMER');
      setAffectedGroupIds(editingItem.affectedGroupIds || ['CUST-01']);
      setAffectedGroupDetail(editingItem.affectedGroupDetail || '');
      setCustomerNeed(editingItem.customerNeed || '');
      setCustomerExpectation(editingItem.customerExpectation || '');
      setCustomerFeedback(editingItem.customerFeedback || '');
      setImpactOnCustomer(editingItem.impactOnCustomer || '');
      setPriority(editingItem.priority || 'MEDIUM');
      setRelatedIndicatorId(editingItem.relatedIndicatorId || '');
      setRelatedIndicatorName(editingItem.relatedIndicatorName || '');
      setDiscoveredDate(editingItem.discoveredDate || new Date().toISOString().split('T')[0]);
      setCurrentState(editingItem.currentState || '');
      setDesiredState(editingItem.desiredState || '');
      setGapIdentified(editingItem.gapIdentified || '');
      setProbableCauses(editingItem.probableCauses || '');
      setPossibleImpacts(
        Array.isArray(editingItem.possibleImpacts)
          ? editingItem.possibleImpacts.join('\n')
          : editingItem.possibleImpacts || ''
      );
      setInformationNeeded(
        Array.isArray(editingItem.informationNeeded)
          ? editingItem.informationNeeded.join('\n')
          : editingItem.informationNeeded || ''
      );
      setAiSummary(editingItem.aiSummary || '');
      setVerifiedRootCauses(editingItem.verifiedRootCauses || '');
      setCauseVerificationStatus(editingItem.causeVerificationStatus || 'UNVERIFIED');
      setVerifiedBy(editingItem.verifiedBy || '');
      setVerifiedAt(editingItem.verifiedAt || '');
      setImpactOnDepartment(editingItem.impactOnDepartment || '');
      setImpactOnStrategyOrKpi(editingItem.impactOnStrategyOrKpi || '');
      setConsequencesOfInaction(editingItem.consequencesOfInaction || '');
      setAnalysisToolUsed(editingItem.analysisToolUsed || 'General');
      setAnalysisNotes(editingItem.analysisNotes || '');
      setAiAnalysisResult(editingItem.aiAnalysisSnapshot || null);
      setAiOriginalAnalysis(editingItem.aiOriginalAnalysis || editingItem.aiAnalysisSnapshot || null);
      setAnalysisStatus(editingItem.analysisStatus || (editingItem.aiAnalysisSnapshot ? 'COMPLETED' : 'NOT_ANALYZED'));
      setAnalysisSource(editingItem.analysisSource || (editingItem.aiAnalysisSnapshot ? 'AI_ASSISTED' : 'MANUAL'));
      setLastAnalyzedInputHash(editingItem.inputHash || '');
      setAnalyzedAt(editingItem.analyzedAt || '');
      setAiModel(editingItem.aiModel || 'gemini-3.7-flash');
      setAnalysisVersion(editingItem.analysisVersion || 1);
      setImprovementApproach(editingItem.improvementApproach || '');
      setExpectedOutcome(editingItem.expectedOutcome || '');
      setSuccessMeasurementMethod(editingItem.successMeasurementMethod || '');
      setTargetValue(editingItem.targetValue || '');
      setPrimaryResponsiblePersonId(editingItem.primaryResponsiblePersonId || '');
      setPrimaryResponsiblePersonName(editingItem.primaryResponsiblePersonName || '');
      setCoResponsiblePersonIds(editingItem.coResponsiblePersonIds || []);
      setDataSupportPersonIds(editingItem.dataSupportPersonIds || []);
      setReviewerPersonId(editingItem.reviewerPersonId || '');
      setApproverPersonId(editingItem.approverPersonId || '');
      setStartDate(editingItem.startDate || new Date().toISOString().split('T')[0]);
      setTargetEndDate(editingItem.targetEndDate || new Date().toISOString().split('T')[0]);
      setTrackingFrequency(editingItem.trackingFrequency || 'MONTHLY');
      setRequiredResources(editingItem.requiredResources || '');
      setBudgetAmount(editingItem.budgetAmount || 0);
      setExecutiveDecisionNeededNotes(editingItem.executiveDecisionNeededNotes || '');
      setActionItems(editingItem.actionItems || []);
      setCurrentProgressPercentage(editingItem.currentProgressPercentage || 0);
      setEvaluationResult(editingItem.evaluationResult || '');
      setEdpexOriginalProblemReduced(editingItem.edpexOriginalProblemReduced || 'YES');
      setEdpexResultImprovementDetail(editingItem.edpexResultImprovementDetail || '');
      setEdpexCustomerBenefitDetail(editingItem.edpexCustomerBenefitDetail || '');
      setEdpexReplicableToOtherDepts(editingItem.edpexReplicableToOtherDepts || false);
      setEdpexKnowledgeCreatedDetail(editingItem.edpexKnowledgeCreatedDetail || '');
      setIsInnovationCandidate(editingItem.isInnovationCandidate || false);
      setIsBestPractice(editingItem.isBestPractice || false);
      setScalingTargetDepartmentsOrCourses(editingItem.scalingTargetDepartmentsOrCourses || []);

      // Reset dirty state when loading item
      setCurrentStateDirty(false);
      setDesiredStateDirty(false);
      setGapIdentifiedDirty(false);
      setProbableCausesDirty(false);
      setPossibleImpactsDirty(false);
      setInformationNeededDirty(false);
      setRecommendedActionsDirty(false);
      setSuggestedSuccessIndicatorsDirty(false);
      setAiSummaryDirty(false);
    } else {
      // Create new ID
      bridgeService.generateNextId(2569).then((id) => setImprovementId(id));
      setCurrentStep(1);
    }
  }, [editingItem, isOpen]);

  // Sync owner snapshot name
  const handleOwnerChange = (type: BridgeOwnerType, id: string) => {
    setOwnerType(type);
    setOwnerId(id);
    if (type === 'DEPARTMENT') {
      const dept = departments.find((d) => (d.departmentId === id || d.id === id));
      if (dept) setOwnerNameSnapshot(dept.departmentName || dept.name || 'หน่วยงาน');
    } else {
      const course = HUSO_MASTER_COURSES.find((c) => c.id === id);
      if (course) setOwnerNameSnapshot(course.name);
    }
  };

  // Sync indicator name
  const handleIndicatorChange = (indId: string) => {
    setRelatedIndicatorId(indId);
    if (indId) {
      const ind = indicators.find((i) => i.id === indId);
      if (ind) setRelatedIndicatorName(`[${ind.code}] ${ind.name}`);
    } else {
      setRelatedIndicatorName('');
    }
  };

  // Primary Person change
  const handlePrimaryPersonChange = (pId: string) => {
    setPrimaryResponsiblePersonId(pId);
    const u = users.find((usr) => usr.userId === pId);
    if (u) {
      setPrimaryResponsiblePersonName(u.fullName);
    } else {
      const p = personnel.find((per) => per.id === pId);
      if (p) setPrimaryResponsiblePersonName(p.name);
    }
  };

  // Check if AI analysis is eligible (title exists OR description >= 20 chars)
  const isAiEligible = Boolean(title.trim().length > 0 || issueDetails.trim().length >= 20);
  const hasAiAnalysis = Boolean(aiAnalysisResult || aiOriginalAnalysis);

  // Calculate current Step 1 input hash
  const calculateCurrentInputHash = useCallback(() => {
    const groupNameList = affectedGroupIds
      .map((id) => INITIAL_CUSTOMER_GROUPS.find((g) => g.id === id)?.name)
      .filter(Boolean)
      .join(', ');

    return generateBridgeInputHash({
      issueTitle: title,
      issueDescription: issueDetails,
      issueType,
      processCategory: workDomain,
      ownerType,
      ownerId,
      affectedGroupIds,
      affectedGroups: groupNameList || affectedGroupType,
      affectedGroupDetail,
      customerNeed,
      customerExpectation,
      customerFeedback,
      impactOnCustomer,
      issueSource,
      sourceDetail: issueSourceDetail,
      relatedIndicatorIds: relatedIndicatorId,
      urgencyLevel: priority,
      existingEvidence: issueDetails,
    });
  }, [
    title,
    issueDetails,
    issueType,
    workDomain,
    ownerType,
    ownerId,
    affectedGroupIds,
    affectedGroupType,
    affectedGroupDetail,
    customerNeed,
    customerExpectation,
    customerFeedback,
    impactOnCustomer,
    issueSource,
    issueSourceDetail,
    relatedIndicatorId,
    priority,
  ]);

  const isInputModifiedAfterAi = Boolean(
    lastAnalyzedInputHash &&
    lastAnalyzedInputHash !== calculateCurrentInputHash()
  );

  // Format array to numbered multiline string
  const formatList = (arr?: (string | { cause?: string; reason?: string })[]) => {
    if (!arr || !Array.isArray(arr) || arr.length === 0) return '';
    return arr
      .map((item, idx) => {
        if (typeof item === 'string') return `${idx + 1}. ${item}`;
        if (item && typeof item === 'object') {
          const text = item.cause || '';
          const reason = item.reason ? ` (เหตุผล: ${item.reason})` : '';
          return `${idx + 1}. ${text}${reason}`;
        }
        return `${idx + 1}. ${String(item)}`;
      })
      .join('\n');
  };

  // Render AI Suggestion Chip when user modified or field is empty
  const renderAiSuggestionChip = (
    field: string,
    aiVal?: string | string[],
    currentVal?: string,
    isDirty?: boolean
  ) => {
    if (!aiVal) return null;
    const aiText = Array.isArray(aiVal) ? aiVal.join('\n') : aiVal;
    if (!aiText || aiText.trim() === '' || aiText.trim() === currentVal?.trim()) return null;

    return (
      <div className="mt-1.5 flex items-center justify-between gap-2 p-2 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/40 text-[11px] text-purple-900 dark:text-purple-200">
        <div className="flex items-center gap-1.5 min-w-0">
          <Lightbulb className="w-3.5 h-3.5 text-purple-600 shrink-0" />
          <span className="font-medium text-purple-700 dark:text-purple-300 shrink-0">AI เสนอ:</span>
          <span className="truncate text-slate-600 dark:text-slate-400">{aiText}</span>
        </div>
        <button
          type="button"
          onClick={() => handleFieldChange(field, aiText)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] shrink-0 shadow-sm transition-colors cursor-pointer"
        >
          <Wand2 className="w-2.5 h-2.5" />
          ใส่ค่านี้
        </button>
      </div>
    );
  };

  // Background Non-blocking AI Execution
  const runAiAnalysisInBackground = async (targetHash: string, forceRefresh = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsAiAnalyzing(true);
    setAnalysisStatus('ANALYZING');
    setAiError(null);

    try {
      const groupNameList = affectedGroupIds
        .map((id) => INITIAL_CUSTOMER_GROUPS.find((g) => g.id === id)?.name)
        .filter(Boolean)
        .join(', ');

      const combinedCustomerVoice = [
        customerFeedback ? `เสียงสะท้อน/ข้อร้องเรียน: ${customerFeedback}` : '',
        customerExpectation ? `ความคาดหวังของลูกค้า: ${customerExpectation}` : '',
        customerNeed ? `ความต้องการ: ${customerNeed}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      const combinedEvidence = [
        issueDetails,
        issueSource ? `แหล่งที่มาของประเด็น: ${issueSource}` : '',
        issueSourceDetail ? `รายละเอียดที่มา: ${issueSourceDetail}` : '',
        ownerNameSnapshot ? `เจ้าของเรื่อง: ${ownerNameSnapshot} (${ownerType === 'DEPARTMENT' ? 'หน่วยงาน' : 'หลักสูตร'})` : '',
        relatedIndicatorName ? `เชื่อมโยงตัวชี้วัด: ${relatedIndicatorName}` : '',
        priority ? `ระดับความสำคัญ: ${priority}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const result = await requestBridgeAiAnalysis({
        issueTitle: title,
        issueDescription: issueDetails,
        issueType,
        processCategory: workDomain,
        ownerType,
        ownerId,
        affectedGroupIds,
        affectedGroup: groupNameList || affectedGroupType || 'ผู้รับบริการและผู้มีส่วนได้ส่วนเสีย',
        affectedGroupDetail,
        customerNeed,
        customerExpectation,
        customerFeedback: combinedCustomerVoice || customerFeedback || customerNeed,
        impactOnCustomer,
        issueSource,
        sourceDetail: issueSourceDetail,
        relatedIndicatorIds: relatedIndicatorId ? [relatedIndicatorId] : [],
        urgencyLevel: priority,
        existingEvidence: combinedEvidence,
        forceRefresh,
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      setAiAnalysisResult(result);
      setAiOriginalAnalysis(result);
      setLastAnalyzedInputHash(targetHash);
      setAnalyzedAt(new Date().toISOString());
      setAnalysisStatus('COMPLETED');
      setAnalysisSource('AI');
      setAnalysisVersion((prev) => prev + 1);

      // Auto-fill non-dirty and empty fields
      if (!currentStateDirty && (!currentState || currentState.trim() === '')) {
        if (result.currentState) setCurrentState(result.currentState);
      }
      if (!desiredStateDirty && (!desiredState || desiredState.trim() === '')) {
        if (result.desiredState) setDesiredState(result.desiredState);
      }
      if (!gapIdentifiedDirty && (!gapIdentified || gapIdentified.trim() === '')) {
        if (result.identifiedGap) setGapIdentified(result.identifiedGap);
      }
      if (!probableCausesDirty && (!probableCauses || probableCauses.trim() === '')) {
        const causesText = formatList(result.probableRootCauses);
        if (causesText) {
          setProbableCauses(causesText);
          setCauseVerificationStatus('UNVERIFIED');
        }
      }
      if (!possibleImpactsDirty && (!possibleImpacts || possibleImpacts.trim() === '')) {
        const impactsText = formatList(result.possibleImpacts);
        if (impactsText) setPossibleImpacts(impactsText);
        if (!impactOnCustomer || impactOnCustomer.trim() === '') {
          if (result.possibleImpacts?.length) setImpactOnCustomer(result.possibleImpacts.join('; '));
        }
      }
      if (!informationNeededDirty && (!informationNeeded || informationNeeded.trim() === '')) {
        const infoText = formatList(result.informationNeeded);
        if (infoText) setInformationNeeded(infoText);
      }
      if (!recommendedActionsDirty && (!improvementApproach || improvementApproach.trim() === '')) {
        const actionsText = formatList(result.recommendedActions);
        if (actionsText) setImprovementApproach(actionsText);
      }
      if (!suggestedSuccessIndicatorsDirty && (!successMeasurementMethod || successMeasurementMethod.trim() === '')) {
        const indText = (result.suggestedSuccessIndicators || []).join(', ');
        if (indText) setSuccessMeasurementMethod(indText);
      }
      if (!aiSummaryDirty && (!aiSummary || aiSummary.trim() === '')) {
        const sumText = result.aiSummary || result.problemSummary || '';
        if (sumText) setAiSummary(sumText);
      }
    } catch (err: any) {
      if (controller.signal.aborted || err.name === 'AbortError') {
        return;
      }
      setAnalysisStatus('FAILED');
      setAiError(err.message || 'AI ยังไม่สามารถวิเคราะห์ได้ในขณะนี้ คุณสามารถกรอกข้อมูลเอง หรือลองใหม่อีกครั้ง');
    } finally {
      if (!controller.signal.aborted) {
        setIsAiAnalyzing(false);
        abortControllerRef.current = null;
      }
    }
  };

  // Trigger manual or forced AI analysis
  const handleTriggerAiAnalysis = async (forceRefresh = false) => {
    if (!isAiEligible) {
      setAiError('กรุณาระบุรายละเอียดประเด็นปัญหาเพิ่มเติมก่อนให้ AI วิเคราะห์ (ต้องมีชื่อประเด็น หรือรายละเอียดอย่างน้อย 20 ตัวอักษร)');
      return;
    }
    const currentHash = calculateCurrentInputHash();
    await runAiAnalysisInBackground(currentHash, forceRefresh);
  };

  // Cancel in-flight AI analysis
  const handleCancelAiAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsAiAnalyzing(false);
    setAnalysisStatus('NOT_ANALYZED');
    setAiToastMessage('ยกเลิกการวิเคราะห์ AI แล้ว คุณสามารถเริ่มกรอกข้อมูลเองได้ทันที');
    setTimeout(() => setAiToastMessage(null), 3000);
  };

  // Restore Original AI Analysis
  const handleRestoreOriginalAi = () => {
    const source = aiOriginalAnalysis || aiAnalysisResult;
    if (!source) return;

    if (source.currentState) {
      setCurrentState(source.currentState);
      setCurrentStateDirty(false);
    }
    if (source.desiredState) {
      setDesiredState(source.desiredState);
      setDesiredStateDirty(false);
    }
    if (source.identifiedGap) {
      setGapIdentified(source.identifiedGap);
      setGapIdentifiedDirty(false);
    }
    if (source.probableRootCauses) {
      setProbableCauses(formatList(source.probableRootCauses));
      setProbableCausesDirty(false);
      setCauseVerificationStatus('UNVERIFIED');
    }
    if (source.possibleImpacts) {
      setPossibleImpacts(formatList(source.possibleImpacts));
      setPossibleImpactsDirty(false);
      setImpactOnCustomer(source.possibleImpacts.join('; '));
    }
    if (source.informationNeeded) {
      setInformationNeeded(formatList(source.informationNeeded));
      setInformationNeededDirty(false);
    }
    if (source.recommendedActions) {
      setImprovementApproach(formatList(source.recommendedActions));
      setRecommendedActionsDirty(false);
    }
    if (source.suggestedSuccessIndicators) {
      setSuccessMeasurementMethod(source.suggestedSuccessIndicators.join(', '));
      setSuggestedSuccessIndicatorsDirty(false);
    }
    if (source.aiSummary || source.problemSummary) {
      setAiSummary(source.aiSummary || source.problemSummary || '');
      setAiSummaryDirty(false);
    }

    setAnalysisStatus('COMPLETED');
    setAnalysisSource('AI');
    setAiToastMessage('✅ คืนค่าผลวิเคราะห์ต้นฉบับจาก AI เรียบร้อย');
    setTimeout(() => setAiToastMessage(null), 3000);
  };

  // Apply single-field AI suggestion
  const handleApplyFieldAi = (field: 'currentState' | 'desiredState' | 'gapIdentified' | 'probableCauses' | 'possibleImpacts' | 'informationNeeded' | 'recommendedActions' | 'suggestedSuccessIndicators' | 'aiSummary') => {
    const source = aiOriginalAnalysis || aiAnalysisResult;
    if (!source) return;

    switch (field) {
      case 'currentState':
        if (source.currentState) {
          setCurrentState(source.currentState);
          setCurrentStateDirty(false);
        }
        break;
      case 'desiredState':
        if (source.desiredState) {
          setDesiredState(source.desiredState);
          setDesiredStateDirty(false);
        }
        break;
      case 'gapIdentified':
        if (source.identifiedGap) {
          setGapIdentified(source.identifiedGap);
          setGapIdentifiedDirty(false);
        }
        break;
      case 'probableCauses':
        if (source.probableRootCauses) {
          setProbableCauses(formatList(source.probableRootCauses));
          setProbableCausesDirty(false);
          setCauseVerificationStatus('UNVERIFIED');
        }
        break;
      case 'possibleImpacts':
        if (source.possibleImpacts) {
          setPossibleImpacts(formatList(source.possibleImpacts));
          setPossibleImpactsDirty(false);
          setImpactOnCustomer(source.possibleImpacts.join('; '));
        }
        break;
      case 'informationNeeded':
        if (source.informationNeeded) {
          setInformationNeeded(formatList(source.informationNeeded));
          setInformationNeededDirty(false);
        }
        break;
      case 'recommendedActions':
        if (source.recommendedActions) {
          setImprovementApproach(formatList(source.recommendedActions));
          setRecommendedActionsDirty(false);
        }
        break;
      case 'suggestedSuccessIndicators':
        if (source.suggestedSuccessIndicators) {
          setSuccessMeasurementMethod(source.suggestedSuccessIndicators.join(', '));
          setSuggestedSuccessIndicatorsDirty(false);
        }
        break;
      case 'aiSummary':
        if (source.aiSummary || source.problemSummary) {
          setAiSummary(source.aiSummary || source.problemSummary || '');
          setAiSummaryDirty(false);
        }
        break;
    }
    setAiToastMessage('✅ นำข้อเสนอ AI สำหรับช่องนี้มาใช้แล้ว');
    setTimeout(() => setAiToastMessage(null), 2500);
  };

  // Field change tracker
  const handleFieldChange = (field: string, value: string) => {
    switch (field) {
      case 'currentState':
        setCurrentState(value);
        setCurrentStateDirty(true);
        break;
      case 'desiredState':
        setDesiredState(value);
        setDesiredStateDirty(true);
        break;
      case 'gapIdentified':
        setGapIdentified(value);
        setGapIdentifiedDirty(true);
        break;
      case 'probableCauses':
        setProbableCauses(value);
        setProbableCausesDirty(true);
        break;
      case 'possibleImpacts':
        setPossibleImpacts(value);
        setPossibleImpactsDirty(true);
        break;
      case 'informationNeeded':
        setInformationNeeded(value);
        setInformationNeededDirty(true);
        break;
      case 'impactOnCustomer':
        setImpactOnCustomer(value);
        setImpactOnCustomerDirty(true);
        break;
      case 'consequencesOfInaction':
        setConsequencesOfInaction(value);
        setConsequencesOfInactionDirty(true);
        break;
      case 'impactOnDepartment':
        setImpactOnDepartment(value);
        break;
      case 'impactOnStrategyOrKpi':
        setImpactOnStrategyOrKpi(value);
        break;
      case 'improvementApproach':
        setImprovementApproach(value);
        setImprovementApproachDirty(true);
        break;
      case 'expectedOutcome':
        setExpectedOutcome(value);
        setExpectedOutcomeDirty(true);
        break;
      case 'successMeasurementMethod':
        setSuccessMeasurementMethod(value);
        setSuggestedSuccessIndicatorsDirty(true);
        break;
      case 'targetValue':
        setTargetValue(value);
        break;
      case 'aiSummary':
        setAiSummary(value);
        setAiSummaryDirty(true);
        break;
    }
    if (analysisStatus === 'COMPLETED') {
      setAnalysisStatus('EDITED_BY_USER');
      setAnalysisSource('AI_ASSISTED');
    }
  };

  // Step Navigation with Auto-trigger on Step 1 -> Step 2
  const handleGoToStep = (targetStep: number) => {
    if (currentStep === 1 && targetStep === 2) {
      const currentHash = calculateCurrentInputHash();
      if (isAiEligible && lastAnalyzedInputHash !== currentHash && analysisStatus !== 'ANALYZING') {
        runAiAnalysisInBackground(currentHash, false);
      }
    }
    setCurrentStep(targetStep);
  };

  // Apply ALL AI Suggestions to Form Fields
  const handleApplyAllAi = () => {
    if (!aiAnalysisResult) return;

    // 1. Probable Root Causes
    if (aiAnalysisResult.probableRootCauses?.length) {
      const formattedCauses = aiAnalysisResult.probableRootCauses
        .map((c, i) => `${i + 1}. ${c.cause}${c.reason ? ` (เหตุผล: ${c.reason})` : ''}`)
        .join('\n');
      setProbableCauses(formattedCauses);
      setCauseVerificationStatus('UNVERIFIED');
    }

    // 2. Recommended Actions -> Improvement Approach
    if (aiAnalysisResult.recommendedActions?.length) {
      const formattedActions = aiAnalysisResult.recommendedActions
        .map((a, i) => `${i + 1}. ${a}`)
        .join('\n');
      setImprovementApproach(formattedActions);
    }

    // 3. Success Indicators -> Success measurement
    if (aiAnalysisResult.suggestedSuccessIndicators?.length) {
      const formattedMetrics = aiAnalysisResult.suggestedSuccessIndicators.join(', ');
      setSuccessMeasurementMethod(formattedMetrics);
    }

    // 4. Possible Impacts -> Impact on Customer
    if (aiAnalysisResult.possibleImpacts?.length) {
      setImpactOnCustomer(aiAnalysisResult.possibleImpacts.join('; '));
    }

    setIsAiModalOpen(false);
    // If in Step 1, advance to Step 2 to see the filled results
    if (currentStep === 1) {
      setCurrentStep(2);
    }
    setAiToastMessage('✅ นำผลวิเคราะห์จาก AI ทั้งหมดไปใส่ในแบบฟอร์มแล้ว (สามารถตรวจสอบและปรับแก้ได้)');
    setTimeout(() => setAiToastMessage(null), 4000);
  };

  // Apply SELECTIVE AI Suggestions
  const handleConfirmSelectiveAi = (selected: {
    causes: number[];
    actions: number[];
    indicators: number[];
    impacts: number[];
  }) => {
    if (!aiAnalysisResult) return;

    // Apply selected causes
    if (selected.causes.length > 0 && aiAnalysisResult.probableRootCauses) {
      const chosen = selected.causes
        .map((idx, i) => {
          const c = aiAnalysisResult.probableRootCauses[idx];
          return c ? `${i + 1}. ${c.cause}${c.reason ? ` (เหตุผล: ${c.reason})` : ''}` : '';
        })
        .filter(Boolean)
        .join('\n');
      if (chosen) {
        setProbableCauses(chosen);
        setCauseVerificationStatus('UNVERIFIED');
      }
    }

    // Apply selected actions
    if (selected.actions.length > 0 && aiAnalysisResult.recommendedActions) {
      const chosen = selected.actions
        .map((idx, i) => {
          const a = aiAnalysisResult.recommendedActions[idx];
          return a ? `${i + 1}. ${a}` : '';
        })
        .filter(Boolean)
        .join('\n');
      if (chosen) setImprovementApproach(chosen);
    }

    // Apply selected indicators
    if (selected.indicators.length > 0 && aiAnalysisResult.suggestedSuccessIndicators) {
      const chosen = selected.indicators
        .map((idx) => aiAnalysisResult.suggestedSuccessIndicators[idx])
        .filter(Boolean)
        .join(', ');
      if (chosen) setSuccessMeasurementMethod(chosen);
    }

    // Apply selected impacts
    if (selected.impacts.length > 0 && aiAnalysisResult.possibleImpacts) {
      const chosen = selected.impacts
        .map((idx) => aiAnalysisResult.possibleImpacts[idx])
        .filter(Boolean)
        .join('; ');
      if (chosen) setImpactOnCustomer(chosen);
    }

    setIsSelectiveModalOpen(false);
    setIsAiModalOpen(false);
    if (currentStep === 1) {
      setCurrentStep(2);
    }
    setAiToastMessage('✅ นำรายการที่เลือกจาก AI ไปใส่ในแบบฟอร์มแล้ว');
    setTimeout(() => setAiToastMessage(null), 4000);
  };

  // Cause Verification Handlers
  const handleVerifyCause = () => {
    if (!probableCauses.trim()) {
      alert('กรุณาระบุหรือมีสาเหตุที่เป็นไปได้ก่อนทำการยืนยัน');
      return;
    }
    setCauseVerificationStatus('VERIFIED');
    setVerifiedRootCauses(probableCauses);
    setVerifiedBy(currentUser?.fullName || 'ผู้ตรวจสอบ');
    setVerifiedAt(new Date().toLocaleString('th-TH'));
    setAiToastMessage('✅ ยืนยันสถานะสาเหตุเป็น "สาเหตุที่ตรวจสอบแล้ว" เรียบร้อย');
    setTimeout(() => setAiToastMessage(null), 3000);
  };

  const handleMarkNeedsFurtherCheck = () => {
    setCauseVerificationStatus('NEEDS_FURTHER_CHECK');
    setAiToastMessage('⚠️ ปรับสถานะเป็น "ต้องเก็บข้อมูล/ตรวจสอบหน้างานเพิ่มเติม"');
    setTimeout(() => setAiToastMessage(null), 3000);
  };

  const handleResetVerification = () => {
    setCauseVerificationStatus('UNVERIFIED');
  };

  // Add Action Item
  const handleAddActionItem = () => {
    const newAction: BridgeActionItem = {
      actionId: `ACT-${Date.now()}`,
      title: '',
      responsiblePersonId: primaryResponsiblePersonId,
      responsiblePersonName: primaryResponsiblePersonName,
      startDate,
      targetEndDate,
      weight: actionItems.length === 0 ? 100 : 0,
      status: 'PENDING',
      progressPercentage: 0,
    };
    setActionItems([...actionItems, newAction]);
  };

  // Remove Action Item
  const handleRemoveActionItem = (idx: number) => {
    const updated = [...actionItems];
    updated.splice(idx, 1);
    setActionItems(updated);
  };

  // Save / Submit Form
  const handleSave = async (submitType: 'DRAFT' | 'SUBMIT') => {
    if (!title.trim()) {
      alert('กรุณาระบุชื่อประเด็นปรับปรุงงาน');
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      const operator = {
        userId: currentUser?.userId || 'USER-01',
        userName: currentUser?.fullName || 'ผู้บันทึกข้อมูล',
        role: currentUser?.role || 'OWNER',
      };

      const payload = {
        improvementId: improvementId || `BRG-2569-${Date.now().toString().slice(-4)}`,
        fiscalYear,
        title,
        issueDetails,
        issueType,
        workDomain,
        ownerType,
        ownerId,
        ownerNameSnapshot,
        relatedDepartmentIds,
        relatedCourseIds,
        issueSource,
        issueSourceDetail,
        sourceReferenceUrl,
        affectedGroupType,
        affectedGroupIds,
        affectedGroupDetail,
        customerNeed,
        customerExpectation,
        customerFeedback,
        impactOnCustomer,
        priority,
        relatedIndicatorId: relatedIndicatorId || undefined,
        relatedIndicatorName: relatedIndicatorName || undefined,
        discoveredDate,
        recordedById: currentUser?.userId || 'USER-01',
        recordedByName: currentUser?.fullName || 'ผู้บันทึกข้อมูล',
        currentState,
        desiredState,
        gapIdentified,
        probableCauses,
        verifiedRootCauses: verifiedRootCauses || undefined,
        causeVerificationStatus: causeVerificationStatus || 'UNVERIFIED',
        verifiedBy: verifiedBy || undefined,
        verifiedAt: verifiedAt || undefined,
        impactOnDepartment,
        impactOnStrategyOrKpi,
        consequencesOfInaction,
        analysisToolUsed,
        analysisNotes,
        aiAnalysisSnapshot: aiAnalysisResult || undefined,
        analysisStatus,
        analysisSource,
        aiOriginalAnalysis: aiOriginalAnalysis || undefined,
        inputHash: lastAnalyzedInputHash || undefined,
        analyzedAt: analyzedAt || undefined,
        aiModel: aiModel || undefined,
        analysisVersion: analysisVersion || 1,
        possibleImpacts: possibleImpacts ? possibleImpacts.split('\n').filter(Boolean) : undefined,
        informationNeeded: informationNeeded ? informationNeeded.split('\n').filter(Boolean) : undefined,
        aiSummary: aiSummary || undefined,
        improvementApproach,
        expectedOutcome,
        successMeasurementMethod,
        targetValue,
        primaryResponsiblePersonId,
        primaryResponsiblePersonName,
        coResponsiblePersonIds,
        dataSupportPersonIds,
        reviewerPersonId,
        approverPersonId,
        startDate,
        targetEndDate,
        trackingFrequency,
        requiredResources,
        budgetAmount: Number(budgetAmount) || 0,
        executiveDecisionNeededNotes,
        actionItems,
        currentProgressPercentage: Number(currentProgressPercentage) || 0,
        overallStatus: (submitType === 'DRAFT' ? 'DRAFT' : currentProgressPercentage >= 100 ? 'COMPLETED' : 'IN_PROGRESS') as BridgeStatus,
        evaluationResult: (evaluationResult as BridgeEvaluationResult) || undefined,
        edpexOriginalProblemReduced,
        edpexResultImprovementDetail,
        edpexCustomerBenefitDetail,
        edpexReplicableToOtherDepts,
        edpexKnowledgeCreatedDetail,
        isInnovationCandidate,
        isBestPractice,
        scalingTargetDepartmentsOrCourses,
      };

      let saved: BridgeImprovement;
      if (activeEditingItem?.id) {
        saved = await bridgeService.update(activeEditingItem.id, payload, operator);
      } else {
        saved = await bridgeService.save(payload, operator);
      }

      if (onSaved) onSaved(saved);
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาดในการบันทึก: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Wizard Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono font-bold text-xs">
                {improvementId || 'BRG-2569-XXXX'}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {editingItem ? 'แก้ไขประเด็นปรับปรุงงาน' : 'เพิ่มประเด็นปรับปรุงงานตาม BRIDGE Model'}
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              บันทึกปัญหา โอกาสพัฒนา ความต้องการของผู้รับบริการ และขับเคลื่อนกระบวนการคุณภาพ
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Progress Bar */}
        <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="grid grid-cols-4 gap-2 sm:gap-4 text-xs font-bold">
            {[
              { num: 1, title: '1. ระบุประเด็น', desc: 'ปัญหา & ผู้รับบริการ' },
              { num: 2, title: '2. วิเคราะห์ประเด็น', desc: 'สาเหตุ & AI ช่วยคิด' },
              { num: 3, title: '3. แผน & ผู้รับผิดชอบ', desc: 'มาตรการ & Actions' },
              { num: 4, title: '4. ติดตาม & EdPEx', desc: 'ผลลัพธ์ & นวัตกรรม' },
            ].map((step) => {
              const isActive = currentStep === step.num;
              const isPast = currentStep > step.num;
              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => handleGoToStep(step.num)}
                  className={`flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 rounded-xl text-left transition-all ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/30'
                      : isPast
                      ? 'bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                      : 'text-slate-400 opacity-60'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isPast
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {isPast ? <Check className="w-3.5 h-3.5" /> : step.num}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold">{step.title}</div>
                    <div className="hidden sm:block text-[10px] text-slate-400 truncate">{step.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Wizard Body Scrollable */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-200">
          {/* STEP 1: ระบุประเด็น (Identify Issue) */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl p-4 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">ขั้นตอนที่ 1: การระบุประเด็นและเจ้าของเรื่อง</div>
                  <div className="mt-0.5 text-blue-800 dark:text-blue-300">
                    บันทึกข้อมูลสิ่งที่ตรวจพบ แหล่งที่มา และระบุกลุ่มลูกค้าหรือผู้มีส่วนได้ส่วนเสียที่ได้รับผลกระทบ
                  </div>
                </div>
              </div>

              {/* Title & Type */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ชื่อประเด็นปรับปรุงงาน <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="wizard-input-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="เช่น การลดระยะเวลาการออกเอกสารรับรองนักศึกษา, การเพิ่มอัตราการคงอยู่ของนักศึกษาปีที่ 1"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    ระบุให้กระชับ ชัดเจน ระบุถึงผลลัพธ์หรือกระบวนการที่ต้องการปรับปรุง
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    รายละเอียดสิ่งที่พบ (Fact & Evidence) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="wizard-input-details"
                    rows={3}
                    value={issueDetails}
                    onChange={(e) => setIssueDetails(e.target.value)}
                    placeholder="ระบุข้อเท็จจริง สิ่งที่เกิดขึ้นจริง ข้อมูลเชิงตัวเลขหรือสถานการณ์ที่ตรวจพบ..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 3 Columns: Issue Type, Domain, Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ประเภทประเด็น
                  </label>
                  <select
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value as BridgeIssueType)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                  >
                    {INITIAL_ISSUE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ด้านงานหรือกระบวนการ
                  </label>
                  <select
                    value={workDomain}
                    onChange={(e) => setWorkDomain(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                  >
                    {INITIAL_WORK_DOMAINS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ความสำคัญ / ความเร่งด่วน
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as BridgePriority)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                  >
                    <option value="LOW">ระดับปกติ (Low)</option>
                    <option value="MEDIUM">ระดับปานกลาง (Medium)</option>
                    <option value="HIGH">ระดับสูง (High)</option>
                    <option value="CRITICAL">เร่งด่วนวิกฤต (Critical)</option>
                  </select>
                </div>
              </div>

              {/* Owner Selection (Department vs Course) */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  หน่วยงานหรือหลักสูตรเจ้าของเรื่อง
                </div>

                <div className="flex items-center gap-4 text-xs font-semibold">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="ownerType"
                      checked={ownerType === 'DEPARTMENT'}
                      onChange={() => handleOwnerChange('DEPARTMENT', departments[0]?.id || 'DEP-001')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <Building2 className="w-4 h-4 text-blue-500" />
                    หน่วยงานสำนักงานคณะ
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="ownerType"
                      checked={ownerType === 'COURSE'}
                      onChange={() => handleOwnerChange('COURSE', HUSO_MASTER_COURSES[0]?.id || 'CRS-01')}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <GraduationCap className="w-4 h-4 text-purple-500" />
                    หลักสูตร
                  </label>
                </div>

                {ownerType === 'DEPARTMENT' ? (
                  <select
                    value={ownerId}
                    onChange={(e) => handleOwnerChange('DEPARTMENT', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                  >
                    {departments.map((dept, dIdx) => {
                      const dId = dept.departmentId || dept.id || `dept-opt-${dIdx}`;
                      const dName = dept.departmentName || dept.name || 'หน่วยงาน';
                      return (
                        <option key={dId} value={dId}>
                          {dName}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <select
                    value={ownerId}
                    onChange={(e) => handleOwnerChange('COURSE', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                  >
                    {HUSO_MASTER_COURSES.map((course, cIdx) => (
                      <option key={course.id || `crs-opt-${cIdx}`} value={course.id}>
                        {course.name} ({course.degree})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Customer & Stakeholder Groups */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  ประเด็นนี้เกี่ยวข้องกับกลุ่มลูกค้าหรือผู้มีส่วนได้ส่วนเสียกลุ่มใด (เลือกได้หลายกลุ่ม)
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {INITIAL_CUSTOMER_GROUPS.map((grp) => {
                    const isChecked = affectedGroupIds.includes(grp.id);
                    return (
                      <label
                        key={grp.id}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200 font-bold'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAffectedGroupIds([...affectedGroupIds, grp.id]);
                            } else {
                              setAffectedGroupIds(affectedGroupIds.filter((id) => id !== grp.id));
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="truncate">{grp.name}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Additional Customer Voice / Feedback Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      ความต้องการหรือสิ่งที่ลูกค้าคาดหวัง (Customer Expectation)
                    </label>
                    <input
                      type="text"
                      value={customerExpectation}
                      onChange={(e) => setCustomerExpectation(e.target.value)}
                      placeholder="เช่น ต้องการรับเอกสารภายใน 1 วันทำการ"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      เสียงสะท้อนหรือข้อร้องเรียน (VOC / Feedback)
                    </label>
                    <input
                      type="text"
                      value={customerFeedback}
                      onChange={(e) => setCustomerFeedback(e.target.value)}
                      placeholder="เช่น ได้รับแจ้งว่าขั้นตอนซ้ำซ้อนและติดต่อเจ้าหน้าที่ยาก"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Source & KPI Alignment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    แหล่งที่มาของประเด็น
                  </label>
                  <select
                    value={issueSource}
                    onChange={(e) => setIssueSource(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                  >
                    {INITIAL_ISSUE_SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    เชื่อมโยงกับตัวชี้วัด KPI / KVI คณะ (หากมี)
                  </label>
                  <select
                    value={relatedIndicatorId}
                    onChange={(e) => handleIndicatorChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                  >
                    <option key="ind-none" value="">-- ไม่เชื่อมโยง / เป็นงานประจำ --</option>
                    {indicators.map((ind, indIdx) => (
                      <option key={ind.id || `ind-opt-${indIdx}`} value={ind.id}>
                        [{ind.code}] {ind.name} ({ind.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Step 1 Quick AI Trigger Callout */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/70 to-blue-50/70 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-blue-950/30 border border-purple-200/80 dark:border-purple-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20 shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                      <span>AI ผู้ช่วยวิเคราะห์ประเด็นปัญหา (AI Bridge Assistant)</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 font-bold">
                        ดึงข้อมูลจากขั้นตอนที่ 1 นี้
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      สังเคราะห์สาเหตุที่เป็นไปได้, ผลกระทบ, และแนวทางปรับปรุงจากชื่อประเด็น, รายละเอียดสิ่งที่พบ และกลุ่มลูกค้าที่ระบุ
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {aiAnalysisResult && (
                    <button
                      type="button"
                      onClick={() => setIsAiModalOpen(true)}
                      className="px-3 py-2 rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 font-bold text-xs hover:bg-purple-50"
                    >
                      ดูผล AI
                    </button>
                  )}
                  <button
                    id="trigger-bridge-ai-from-step1-btn"
                    type="button"
                    onClick={() => handleTriggerAiAnalysis(false)}
                    disabled={!isAiEligible || isAiAnalyzing}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isAiAnalyzing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        กำลังวิเคราะห์...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        วิเคราะห์ด้วย AI
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: วิเคราะห์ประเด็น & AI ผู้ช่วย (Analyze & AI) */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              {/* Toast message if any */}
              {aiToastMessage && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between shadow-sm animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{aiToastMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiToastMessage(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Step 1 Context Data Summary for Step 2 */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-semibold">
                  <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-bold">
                    <Info className="w-3.5 h-3.5" />
                    ข้อมูลประเด็นที่ระบุจากขั้นตอนที่ 1 (นำมาใช้ในการวิเคราะห์)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleGoToStep(1)}
                    className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-medium text-[11px]"
                  >
                    <Edit3 className="w-3 h-3" />
                    แก้ไขข้อมูลขั้นตอนที่ 1
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div>
                    <span className="text-slate-400">ชื่อประเด็น: </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {title || '(ยังไม่ได้ระบุชื่อประเด็น)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">ด้านงาน: </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{workDomain || 'งานทั่วไป'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">เจ้าของเรื่อง: </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {ownerNameSnapshot || 'สำนักงานคณะ'} ({ownerType === 'DEPARTMENT' ? 'หน่วยงาน' : 'หลักสูตร'})
                    </span>
                  </div>
                </div>
                {issueDetails && (
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                    <span className="text-slate-400">สิ่งที่พบ (Fact & Evidence): </span>
                    <span className="line-clamp-2">{issueDetails}</span>
                  </div>
                )}
              </div>

              {/* AI Assistant Banner */}
              <div className="bg-gradient-to-r from-purple-900/10 via-indigo-900/10 to-blue-900/10 dark:from-purple-950/40 dark:via-indigo-950/40 dark:to-blue-950/40 border border-purple-200 dark:border-purple-800/60 rounded-3xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20 shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          AI ผู้ช่วยวิเคราะห์ประเด็นปัญหา (AI Bridge Assistant)
                        </h3>
                        {analysisStatus === 'ANALYZING' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            กำลังวิเคราะห์ในเบื้องหลัง...
                          </span>
                        )}
                        {analysisStatus === 'COMPLETED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            วิเคราะห์เสร็จสมบูรณ์
                          </span>
                        )}
                        {analysisStatus === 'EDITED_BY_USER' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                            <Edit3 className="w-3 h-3" />
                            ปรับแต่งโดยผู้ใช้
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        ดึงข้อมูลบริบทจากขั้นตอนที่ 1 มาสังเคราะห์สาเหตุ, ช่องว่าง, ผลกระทบ, และมาตรการ
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {/* If analyzing in background, show cancel button */}
                    {isAiAnalyzing ? (
                      <button
                        type="button"
                        onClick={handleCancelAiAnalysis}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-xs hover:bg-rose-100 transition-all shrink-0"
                      >
                        <X className="w-4 h-4" />
                        ยกเลิกการวิเคราะห์
                      </button>
                    ) : (
                      <>
                        {hasAiAnalysis && (
                          <>
                            <button
                              type="button"
                              onClick={() => setIsAiModalOpen(true)}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 font-bold text-xs hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-all shrink-0"
                            >
                              <FileText className="w-4 h-4" />
                              ดูผลวิเคราะห์
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsSelectiveModalOpen(true)}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-bold text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all shrink-0"
                            >
                              เลือกใช้บางข้อ
                            </button>
                          </>
                        )}

                        <button
                          id="trigger-bridge-ai-analysis-btn"
                          type="button"
                          onClick={() => handleTriggerAiAnalysis(true)}
                          disabled={!isAiEligible || isAiAnalyzing}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                          <Sparkles className="w-4 h-4" />
                          {hasAiAnalysis ? 'วิเคราะห์ใหม่' : 'ให้ AI ช่วยวิเคราะห์ประเด็น'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Status-specific alert banners */}
                {analysisStatus === 'ANALYZING' && (
                  <div className="p-3.5 rounded-2xl bg-purple-100/70 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200 flex items-center justify-between gap-3 animate-pulse">
                    <div className="flex items-center gap-2.5">
                      <RefreshCw className="w-4 h-4 text-purple-600 animate-spin shrink-0" />
                      <span>
                        AI กำลังสังเคราะห์ข้อมูลประเด็นปัญหาและเชื่อมโยงบริบท... คุณสามารถกรอกข้อมูลเองหรือรอสักครู่
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelAiAnalysis}
                      className="px-2.5 py-1 rounded-lg bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100 font-bold text-[11px] hover:bg-purple-300 shrink-0"
                    >
                      ยกเลิก
                    </button>
                  </div>
                )}

                {/* Modified step 1 input notification */}
                {isInputModifiedAfterAi && !isAiAnalyzing && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>ข้อมูลในขั้นตอนที่ 1 มีการเปลี่ยนแปลงนับตั้งแต่การวิเคราะห์ครั้งล่าสุด</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTriggerAiAnalysis(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-sm shrink-0"
                    >
                      <Zap className="w-3 h-3" />
                      วิเคราะห์ใหม่จากข้อมูลปัจจุบัน
                    </button>
                  </div>
                )}

                {/* User Edited Alert with Restore Button */}
                {analysisStatus === 'EDITED_BY_USER' && aiOriginalAnalysis && (
                  <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>คุณได้ปรับเปลี่ยนเนื้อหาบางส่วนจากผลวิเคราะห์ต้นฉบับของ AI</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRestoreOriginalAi}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-bold text-[11px] hover:bg-blue-50 shadow-sm shrink-0"
                    >
                      <RotateCcw className="w-3 h-3" />
                      คืนค่าผล AI เดิม (Restore AI)
                    </button>
                  </div>
                )}

                {/* Eligibility Helper Warning */}
                {!isAiEligible && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>กรุณาระบุรายละเอียดประเด็นปัญหาเพิ่มเติมก่อนให้ AI วิเคราะห์ (ต้องมีชื่อประเด็น หรือรายละเอียดอย่างน้อย 20 ตัวอักษร)</span>
                  </div>
                )}

                {/* AI Error display if any */}
                {aiError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-[11px] text-rose-800 dark:text-rose-300 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{aiError}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTriggerAiAnalysis(true)}
                        className="px-2 py-1 rounded bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 font-bold text-[10px] hover:bg-rose-300"
                      >
                        ลองใหม่
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiError(null)}
                        className="text-rose-500 hover:text-rose-700 text-xs px-1"
                      >
                        ปิด
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick AI Summary Card if available */}
                {aiAnalysisResult && (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-purple-100 dark:border-purple-900/50 space-y-3 shadow-sm text-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                      <div className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2 text-xs">
                        <Sparkles className="w-4 h-4" />
                        ผลการวิเคราะห์ล่าสุดจาก AI ({aiAnalysisResult.isFromCache ? 'จากแคช' : `${aiAnalysisResult.analysisDurationSeconds || 1.5}s`})
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsSelectiveModalOpen(true)}
                          className="px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] hover:bg-indigo-50"
                        >
                          เลือกใช้บางข้อ
                        </button>
                        <button
                          type="button"
                          onClick={handleApplyAllAi}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition-all"
                        >
                          นำผลทั้งหมดไปใช้
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">สรุปประเด็น:</div>
                        <div className="text-slate-600 dark:text-slate-300 line-clamp-2">
                          {aiAnalysisResult.problemSummary || 'ไม่มีสรุป'}
                        </div>
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                          สาเหตุที่เป็นไปได้ ({aiAnalysisResult.probableRootCauses?.length || 0} ข้อ):
                        </div>
                        <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-0.5 line-clamp-2">
                          {aiAnalysisResult.probableRootCauses?.map((c, i) => {
                            const text = typeof c === 'string' ? c : (c as any)?.cause || JSON.stringify(c);
                            return <li key={i}>{text}</li>;
                          })}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Fields for Step 2 Analysis (All 9 Key Dimensions) */}
              <div className="space-y-4">
                {/* 1 & 2: Current State & Desired State */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        1. สภาพปัจจุบันเป็นอย่างไร (Current State)
                      </label>
                      {currentStateDirty && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                          (แก้ไขแล้ว)
                        </span>
                      )}
                    </div>
                    <textarea
                      rows={3}
                      value={currentState}
                      onChange={(e) => handleFieldChange('currentState', e.target.value)}
                      placeholder="ระบุวิธีการปฏิบัติงานปัจจุบัน ระยะเวลา หรือขั้นตอนที่ใช้อยู่จริง..."
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    {renderAiSuggestionChip(
                      'currentState',
                      aiOriginalAnalysis?.currentState,
                      currentState,
                      currentStateDirty
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        2. สภาพหรือผลลัพธ์ที่ต้องการ (Desired State / Target)
                      </label>
                      {desiredStateDirty && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                          (แก้ไขแล้ว)
                        </span>
                      )}
                    </div>
                    <textarea
                      rows={3}
                      value={desiredState}
                      onChange={(e) => handleFieldChange('desiredState', e.target.value)}
                      placeholder="ระบุสิ่งที่ต้องการให้เกิดขึ้น เช่น เสร็จภายใน 3 วัน, ผู้รับบริการพึงพอใจ 90%..."
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    {renderAiSuggestionChip(
                      'desiredState',
                      aiOriginalAnalysis?.desiredState,
                      desiredState,
                      desiredStateDirty
                    )}
                  </div>
                </div>

                {/* 3 & 4: Gap Identified & AI Analysis Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        3. ช่องว่างที่พบ (Gap Identified)
                      </label>
                      {gapIdentifiedDirty && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                          (แก้ไขแล้ว)
                        </span>
                      )}
                    </div>
                    <textarea
                      rows={2}
                      value={gapIdentified}
                      onChange={(e) => handleFieldChange('gapIdentified', e.target.value)}
                      placeholder="ความแตกต่างระหว่างสภาพปัจจุบันและเป้าหมายที่ต้องการ..."
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    {renderAiSuggestionChip(
                      'gapIdentified',
                      aiOriginalAnalysis?.gapIdentified,
                      gapIdentified,
                      gapIdentifiedDirty
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        4. บทสรุปการวิเคราะห์ประเด็น (AI Summary)
                      </label>
                      {aiSummaryDirty && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                          (แก้ไขแล้ว)
                        </span>
                      )}
                    </div>
                    <textarea
                      rows={2}
                      value={aiSummary}
                      onChange={(e) => handleFieldChange('aiSummary', e.target.value)}
                      placeholder="สรุปภาพรวมของประเด็นปัญหาและเหตุผลความจำเป็นในการแก้ไข..."
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    {renderAiSuggestionChip(
                      'aiSummary',
                      aiOriginalAnalysis?.aiSummary || aiOriginalAnalysis?.problemSummary,
                      aiSummary,
                      aiSummaryDirty
                    )}
                  </div>
                </div>

                {/* 5: Cause Analysis & Verification Workflow */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-100">
                          5. สาเหตุที่เป็นไปได้ (Probable Root Causes)
                        </label>
                        {probableCausesDirty && (
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                            (แก้ไขแล้ว)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        ระบุหรือนำเข้าจาก AI โดยต้องตรวจสอบและยืนยันหน้างานก่อนถือเป็นสาเหตุที่แท้จริง
                      </p>
                    </div>

                    {/* Verification Status Badge */}
                    <div className="flex items-center gap-2">
                      {causeVerificationStatus === 'VERIFIED' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ตรวจสอบและยืนยันสาเหตุแล้ว
                        </span>
                      ) : causeVerificationStatus === 'NEEDS_FURTHER_CHECK' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          ต้องเก็บข้อมูล/ตรวจสอบหน้างานเพิ่มเติม
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          รอการตรวจสอบหน้างาน (เบื้องต้น)
                        </span>
                      )}
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    value={probableCauses}
                    onChange={(e) => handleFieldChange('probableCauses', e.target.value)}
                    placeholder="ระบุสาเหตุที่คาดว่าทำให้เกิดปัญหา เช่น ขาดแบบฟอร์มกลาง, ขาดคู่มือแนวปฏิบัติ..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  {renderAiSuggestionChip(
                    'probableCauses',
                    aiOriginalAnalysis?.probableCauses || (aiOriginalAnalysis?.probableRootCauses ? aiOriginalAnalysis.probableRootCauses.map((c: any) => typeof c === 'string' ? c : c?.cause || '').join('\n') : undefined),
                    probableCauses,
                    probableCausesDirty
                  )}

                  {/* Cause Verification Actions Toolbar */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {causeVerificationStatus === 'VERIFIED' && verifiedBy && (
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                          ยืนยันโดย: {verifiedBy} {verifiedAt ? `(เมื่อ ${verifiedAt})` : ''}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {causeVerificationStatus !== 'VERIFIED' ? (
                        <>
                          <button
                            type="button"
                            onClick={handleMarkNeedsFurtherCheck}
                            className="px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold text-xs hover:bg-amber-100"
                          >
                            ต้องตรวจสอบเพิ่ม
                          </button>
                          <button
                            type="button"
                            onClick={handleVerifyCause}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            ยืนยันเป็นสาเหตุที่ตรวจสอบแล้ว
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResetVerification}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium text-xs hover:bg-slate-100"
                        >
                          ปรับสถานะใหม่
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 6 & 7: Possible Impacts & Information Needed */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        6. ผลกระทบที่เป็นไปได้ (Possible Impacts)
                      </label>
                      {possibleImpactsDirty && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                          (แก้ไขแล้ว)
                        </span>
                      )}
                    </div>
                    <textarea
                      rows={2}
                      value={possibleImpacts}
                      onChange={(e) => handleFieldChange('possibleImpacts', e.target.value)}
                      placeholder="ผลกระทบด้านคุณภาพ, ความล่าช้า, ต้นทุน, หรือความพึงพอใจ..."
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    {renderAiSuggestionChip(
                      'possibleImpacts',
                      aiOriginalAnalysis?.possibleImpacts,
                      possibleImpacts,
                      possibleImpactsDirty
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        7. ข้อมูลหรือหลักฐานที่ต้องการเพิ่มเติม (Information Needed)
                      </label>
                      {informationNeededDirty && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                          (แก้ไขแล้ว)
                        </span>
                      )}
                    </div>
                    <textarea
                      rows={2}
                      value={informationNeeded}
                      onChange={(e) => handleFieldChange('informationNeeded', e.target.value)}
                      placeholder="สถิติ, เอกสาร, หรือแบบสำรวจที่ต้องเก็บรวบรวมเพิ่มเติม..."
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    {renderAiSuggestionChip(
                      'informationNeeded',
                      aiOriginalAnalysis?.informationNeeded,
                      informationNeeded,
                      informationNeededDirty
                    )}
                  </div>
                </div>

                {/* 8 & 9: Impact on Customer & Risk of Inaction */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        8. ผลกระทบต่อผู้รับบริการ / ลูกค้า (Impact on Customer)
                      </label>
                      {impactOnCustomerDirty && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                          (แก้ไขแล้ว)
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={impactOnCustomer}
                      onChange={(e) => handleFieldChange('impactOnCustomer', e.target.value)}
                      placeholder="เช่น ต้องเดินทางมาติดต่อซ้ำหลายครั้ง, ได้รับข้อมูลล่าช้า"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                    {renderAiSuggestionChip(
                      'impactOnCustomer',
                      aiOriginalAnalysis?.impactOnCustomer,
                      impactOnCustomer,
                      impactOnCustomerDirty
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        9. หากไม่ดำเนินการจะเกิดอะไรขึ้น (Risk / Inaction Consequences)
                      </label>
                      {consequencesOfInactionDirty && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                          (แก้ไขแล้ว)
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={consequencesOfInaction}
                      onChange={(e) => handleFieldChange('consequencesOfInaction', e.target.value)}
                      placeholder="เช่น ความพึงพอใจลดลง, เสียภาพลักษณ์, ไม่ผ่านเกณฑ์ AUN-QA / EdPEx"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                    {renderAiSuggestionChip(
                      'consequencesOfInaction',
                      aiOriginalAnalysis?.consequencesOfInaction,
                      consequencesOfInaction,
                      consequencesOfInactionDirty
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: แผนปรับปรุงและผู้รับผิดชอบ (Plan & Assignees) */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-orange-50/60 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/40 rounded-2xl p-4 text-xs text-orange-900 dark:text-orange-200 flex items-start gap-3">
                <Target className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">ขั้นตอนที่ 3: กำหนดมาตรการ ผู้รับผิดชอบ และกิจกรรมปรับปรุง</div>
                  <div className="mt-0.5 text-orange-800 dark:text-orange-300">
                    วางแผนการดำเนินงานอย่างชัดเจน ระบุตัวชี้วัดความสำเร็จ และแบ่งงานเป็น Action Items
                  </div>
                </div>
              </div>

              {/* Approach & Measurement */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      แนวทางหรือมาตรการปรับปรุง (Improvement Approach) <span className="text-rose-500">*</span>
                    </label>
                    {improvementApproachDirty && (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                        (แก้ไขแล้ว)
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    value={improvementApproach}
                    onChange={(e) => handleFieldChange('improvementApproach', e.target.value)}
                    placeholder="ระบุสิ่งที่ต้องทำ เช่น ปรับแบบฟอร์มคำร้องเป็น Google Forms, รวมศูนย์การส่งเอกสาร..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  {renderAiSuggestionChip(
                    'improvementApproach',
                    aiOriginalAnalysis?.improvementApproach,
                    improvementApproach,
                    improvementApproachDirty
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      ผลลัพธ์ที่คาดหวัง & วิธีวัดความสำเร็จ (Success Metric) <span className="text-rose-500">*</span>
                    </label>
                    {expectedOutcomeDirty && (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                        (แก้ไขแล้ว)
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    value={expectedOutcome}
                    onChange={(e) => handleFieldChange('expectedOutcome', e.target.value)}
                    placeholder="ระบุค่าเป้าหมาย เช่น ระยะเวลาเฉลี่ยลดลงเหลือไม่เกิน 2 วันทำการ, ความพึงพอใจ >= 85%..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  {renderAiSuggestionChip(
                    'expectedOutcome',
                    aiOriginalAnalysis?.expectedOutcome,
                    expectedOutcome,
                    expectedOutcomeDirty
                  )}
                </div>
              </div>

              {/* Assignees */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ผู้รับผิดชอบหลัก <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={primaryResponsiblePersonId}
                    onChange={(e) => handlePrimaryPersonChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                  >
                    {effectiveUsers.map((u, uIdx) => (
                      <option key={u.userId || `u-opt-${uIdx}`} value={u.userId}>
                        {u.fullName} ({u.role} - {u.departmentName || 'คณะ'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    วันที่เริ่มต้น
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    วันที่กำหนดเสร็จ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={targetEndDate}
                    onChange={(e) => setTargetEndDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              {/* Action Items List Builder */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      กิจกรรมปรับปรุงย่อย (Action Items)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      แตกประเด็นเป็นกิจกรรมย่อย กำหนดน้ำหนักรวมให้ครบ 100%
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddActionItem}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-xs"
                  >
                    <Plus className="w-4 h-4" />
                    เพิ่มกิจกรรมย่อย
                  </button>
                </div>

                {actionItems.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                    ยังไม่มีกิจกรรมย่อย (สามารถกดปุ่ม "เพิ่มกิจกรรมย่อย" ด้านบนได้)
                  </div>
                ) : (
                  <div className="space-y-2">
                    {actionItems.map((act, idx) => (
                      <div
                        key={act.actionId || idx}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 grid grid-cols-12 gap-2 items-center text-xs"
                      >
                        <div className="col-span-12 sm:col-span-5">
                          <input
                            type="text"
                            placeholder="ชื่อกิจกรรมย่อย..."
                            value={act.title}
                            onChange={(e) => {
                              const updated = [...actionItems];
                              updated[idx].title = e.target.value;
                              setActionItems(updated);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                          />
                        </div>

                        <div className="col-span-6 sm:col-span-3">
                          <select
                            value={act.responsiblePersonId}
                            onChange={(e) => {
                              const updated = [...actionItems];
                              updated[idx].responsiblePersonId = e.target.value;
                              const u = effectiveUsers.find((usr) => usr.userId === e.target.value);
                              if (u) updated[idx].responsiblePersonName = u.fullName;
                              setActionItems(updated);
                            }}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px]"
                          >
                            {effectiveUsers.map((u, uIdx) => (
                              <option key={`act-${idx}-u-${u.userId || uIdx}`} value={u.userId}>
                                {u.fullName}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-4 sm:col-span-2 flex items-center gap-1">
                          <span className="text-slate-400 text-[10px]">น.น.</span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={act.weight}
                            onChange={(e) => {
                              const updated = [...actionItems];
                              updated[idx].weight = Number(e.target.value);
                              setActionItems(updated);
                            }}
                            className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-center font-bold"
                          />
                          <span className="text-slate-400">%</span>
                        </div>

                        <div className="col-span-2 sm:col-span-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveActionItem(idx)}
                            className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Request Executive Decision if any */}
              <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 space-y-2">
                <label className="block text-xs font-bold text-purple-900 dark:text-purple-300">
                  สิ่งที่ต้องการให้ผู้บริหารตัดสินใจหรือสนับสนุน (Executive Decision Request)
                </label>
                <textarea
                  rows={2}
                  value={executiveDecisionNeededNotes}
                  onChange={(e) => setExecutiveDecisionNeededNotes(e.target.value)}
                  placeholder="เช่น ขออนุมัติงบประมาณสนับสนุน 5,000 บาท, ขอมอบหมายงานบูรณาการร่วมกับงานพัสดุ..."
                  className="w-full px-3 py-2 rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-800 text-xs"
                />
              </div>
            </div>
          )}

          {/* STEP 4: ติดตามและสรุปผล EdPEx (Tracking & EdPEx) */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-2xl p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
                <Award className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">ขั้นตอนที่ 4: สรุปผลการปรับปรุงและการถอดบทเรียนตามแนวทาง EdPEx</div>
                  <div className="mt-0.5 text-amber-800 dark:text-amber-300">
                    ประเมินความสำเร็จ การลดปัญหาเดิม และโอกาสขยายผลสู่แนวปฏิบัติที่ดี (Best Practice)
                  </div>
                </div>
              </div>

              {/* Progress Percentage & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300">ร้อยละความก้าวหน้ารวม</span>
                    <span className="text-blue-600 dark:text-blue-400 text-sm">{currentProgressPercentage}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={currentProgressPercentage}
                    onChange={(e) => setCurrentProgressPercentage(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ผลการประเมินสรุป
                  </label>
                  <select
                    value={evaluationResult}
                    onChange={(e) => setEvaluationResult(e.target.value as BridgeEvaluationResult)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                  >
                    <option value="">-- อยู่ระหว่างดำเนินการ --</option>
                    <option value="สำเร็จตามเป้าหมาย">สำเร็จตามเป้าหมาย</option>
                    <option value="สำเร็จบางส่วน">สำเร็จบางส่วน</option>
                    <option value="ยังไม่สำเร็จ">ยังไม่สำเร็จ</option>
                    <option value="พร้อมขยายผล">พร้อมขยายผล</option>
                    <option value="เสนอเป็นนวัตกรรม">เสนอเป็นนวัตกรรม</option>
                    <option value="เสนอเป็นแนวปฏิบัติที่ดี">เสนอเป็นแนวปฏิบัติที่ดี</option>
                    <option value="ปิดประเด็น">ปิดประเด็น</option>
                  </select>
                </div>
              </div>

              {/* EdPEx Reflection Questions */}
              <div className="space-y-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  คำถามสะท้อนผลลัพธ์ตามเกณฑ์ EdPEx (EdPEx Reflection)
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      1. ปัญหาเดิมที่เคยเกิดขึ้นลดลงหรือไม่?
                    </label>
                    <div className="flex gap-4">
                      {(['YES', 'PARTIAL', 'NO'] as const).map((opt) => (
                        <label key={opt} className="flex items-center gap-1.5 cursor-pointer font-medium">
                          <input
                            type="radio"
                            name="edpexProblem"
                            checked={edpexOriginalProblemReduced === opt}
                            onChange={() => setEdpexOriginalProblemReduced(opt)}
                            className="text-blue-600"
                          />
                          {opt === 'YES' ? 'ลดลงอย่างชัดเจน' : opt === 'PARTIAL' ? 'ลดลงบางส่วน' : 'ยังไม่ลดลง'}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      2. ผลลัพธ์หรือกระบวนการดีขึ้นอย่างไร (เปรียบเทียบก่อน-หลัง)
                    </label>
                    <input
                      type="text"
                      value={edpexResultImprovementDetail}
                      onChange={(e) => setEdpexResultImprovementDetail(e.target.value)}
                      placeholder="เช่น ระยะเวลาลดลงจาก 7 วัน เหลือ 2 วันทำการ..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      3. ลูกค้าหรือผู้รับบริการได้รับประโยชน์หรือความพึงพอใจอย่างไร
                    </label>
                    <input
                      type="text"
                      value={edpexCustomerBenefitDetail}
                      onChange={(e) => setEdpexCustomerBenefitDetail(e.target.value)}
                      placeholder="เช่น นักศึกษาได้รับเอกสารรวดเร็ว ไม่ต้องรอคิว..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Innovation & Scaling Nomination Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-start gap-3 p-4 rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInnovationCandidate}
                    onChange={(e) => setIsInnovationCandidate(e.target.checked)}
                    className="mt-1 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-purple-950 dark:text-purple-200">เสนอเป็นนวัตกรรมการทำงาน</div>
                    <div className="text-[11px] text-purple-700 dark:text-purple-400 mt-0.5">
                      มีกระบวนการหรือเครื่องมือใหม่ที่สร้างคุณค่าและแก้ปัญหาได้อย่างมีประสิทธิภาพ
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBestPractice}
                    onChange={(e) => setIsBestPractice(e.target.checked)}
                    className="mt-1 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-amber-950 dark:text-amber-200">เสนอเป็นแนวปฏิบัติที่ดี (Best Practice)</div>
                    <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                      ได้รับการรับรองผลสัมฤทธิ์และพร้อมนำไปเผยแพร่เป็นแบบอย่างตามเกณฑ์ EdPEx
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Navigation */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => handleGoToStep(currentStep - 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4" />
                ย้อนกลับ
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSave('DRAFT')}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-100 disabled:opacity-50"
            >
              บันทึกแบบร่าง (Draft)
            </button>

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={() => handleGoToStep(currentStep + 1)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20"
              >
                ถัดไป
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSave('SUBMIT')}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกและเสร็จสิ้น'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AI Result Modal */}
      <BridgeAiResultModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        result={aiAnalysisResult}
        isAnalyzing={isAiAnalyzing}
        onApplyAll={handleApplyAllAi}
        onOpenSelective={() => {
          setIsAiModalOpen(false);
          setIsSelectiveModalOpen(true);
        }}
        onReanalyze={() => handleTriggerAiAnalysis(true)}
        onManualFill={() => setIsAiModalOpen(false)}
      />

      {/* AI Selective Modal */}
      <BridgeAiSelectiveModal
        isOpen={isSelectiveModalOpen}
        onClose={() => setIsSelectiveModalOpen(false)}
        result={aiAnalysisResult}
        onConfirm={handleConfirmSelectiveAi}
        onBackToFullResult={() => {
          setIsSelectiveModalOpen(false);
          setIsAiModalOpen(true);
        }}
      />
    </div>
  );
};

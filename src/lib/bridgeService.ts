import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  runTransaction,
} from 'firebase/firestore';
import { db, removeUndefined, logService } from './firebase';
import {
  BridgeImprovement,
  BridgeActionItem,
  BridgeProgressUpdate,
  BridgeExecutiveDecision,
  BridgeStep,
  INITIAL_WORK_DOMAINS,
  INITIAL_CUSTOMER_GROUPS,
  INITIAL_ISSUE_SOURCES,
} from '../types/bridge';
import { ActivityLog } from '../types';

export const BRIDGE_COLLECTIONS = {
  IMPROVEMENTS: 'bridgeImprovements',
  ACTIONS: 'bridgeActions',
  PROGRESS_REPORTS: 'bridgeProgressReports',
  DECISIONS: 'bridgeDecisions',
  SETTINGS: 'bridgeSettings',
  AUDIT_LOGS: 'activityLogs',
} as const;

/**
 * Automatically calculates the BRIDGE step based on the workflow state and outcomes
 * B: Build & Align (Define issue, align with strategy/KPI/Customer)
 * R: Review & Record (Analyze current data, VOC, Root causes)
 * I: Improve & Implement (Action plan execution in progress)
 * D: Drive & Discover Innovation (Completed successfully, results measured, nominated for innovation)
 * G: Grow & Generalize (Scaled or sharing with other departments/courses)
 * E: Excellence & EdPEx (Certified as Best Practice / EdPEx benchmark)
 */
export function calculateBridgeStep(improvement: Partial<BridgeImprovement>): BridgeStep {
  if (improvement.isBestPractice || improvement.evaluationResult === 'เสนอเป็นแนวปฏิบัติที่ดี') {
    return 'E';
  }
  if (
    (improvement.scalingTargetDepartmentsOrCourses && improvement.scalingTargetDepartmentsOrCourses.length > 0) ||
    improvement.overallStatus === 'SCALED' ||
    improvement.evaluationResult === 'พร้อมขยายผล'
  ) {
    return 'G';
  }
  if (
    improvement.isInnovationCandidate ||
    improvement.overallStatus === 'INNOVATION_NOMINATED' ||
    improvement.overallStatus === 'COMPLETED' ||
    improvement.evaluationResult === 'เสนอเป็นนวัตกรรม' ||
    improvement.evaluationResult === 'สำเร็จตามเป้าหมาย' ||
    (improvement.currentProgressPercentage && improvement.currentProgressPercentage >= 100)
  ) {
    return 'D';
  }
  if (
    improvement.overallStatus === 'IN_PROGRESS' ||
    (improvement.actionItems && improvement.actionItems.length > 0 && improvement.improvementApproach)
  ) {
    return 'I';
  }
  if (improvement.currentState || improvement.desiredState || improvement.gapIdentified || improvement.probableCauses) {
    return 'R';
  }
  return 'B';
}

// In-memory cache for instant recovery
let localImprovements: BridgeImprovement[] = [];
let localDecisions: BridgeExecutiveDecision[] = [];

export const bridgeService = {
  /**
   * Generates the next sequential ID in format: BRG-YYYY-XXXX (e.g. BRG-2569-0001)
   * Using "Smallest Available Positive Integer" sequence recycling logic:
   * Reuses the lowest unused positive sequence number among non-deleted items.
   */
  async generateNextId(fiscalYear: number | string = 2569): Promise<string> {
    const fyNumber = Number(fiscalYear) || 2569;
    try {
      const q = collection(db, BRIDGE_COLLECTIONS.IMPROVEMENTS);
      const snapshot = await getDocs(q);
      const existing = snapshot.docs.map((d) => d.data() as BridgeImprovement);
      // Filter out soft-deleted items and match fiscal year (handling both string and number)
      const activeItems = existing.filter((item) => !item.isDeleted && Number(item.fiscalYear) === fyNumber);
      const usedNumbers = new Set<number>();
      activeItems.forEach((item) => {
        if (item.improvementId) {
          const match = item.improvementId.match(/BRG-\d{4}-(\d+)/);
          if (match) {
            const n = parseInt(match[1], 10);
            if (!isNaN(n) && n > 0) {
              usedNumbers.add(n);
            }
          }
        }
      });
      // Find smallest positive integer starting from 1
      let smallestAvailable = 1;
      while (usedNumbers.has(smallestAvailable)) {
        smallestAvailable++;
      }
      return `BRG-${fyNumber}-${String(smallestAvailable).padStart(4, '0')}`;
    } catch (e) {
      // Fallback generator using local memory cache
      const activeLocal = localImprovements.filter((i) => !i.isDeleted && Number(i.fiscalYear) === fyNumber);
      const usedNumbers = new Set<number>();
      activeLocal.forEach((item) => {
        if (item.improvementId) {
          const match = item.improvementId.match(/BRG-\d{4}-(\d+)/);
          if (match) {
            const n = parseInt(match[1], 10);
            if (!isNaN(n) && n > 0) usedNumbers.add(n);
          }
        }
      });
      let smallestAvailable = 1;
      while (usedNumbers.has(smallestAvailable)) {
        smallestAvailable++;
      }
      return `BRG-${fyNumber}-${String(smallestAvailable).padStart(4, '0')}`;
    }
  },

  /**
   * Subscribe to real-time updates for all non-deleted improvements
   */
  subscribe(
    callback: (items: BridgeImprovement[]) => void,
    fiscalYear?: string | number
  ): () => void {
    try {
      const q = query(collection(db, BRIDGE_COLLECTIONS.IMPROVEMENTS));

      return onSnapshot(
        q,
        (snapshot) => {
          const items: BridgeImprovement[] = [];
          const targetFy = fiscalYear && fiscalYear !== 'ALL' ? String(fiscalYear) : null;

          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as BridgeImprovement;
            if (!data.isDeleted) {
              if (!targetFy || String(data.fiscalYear) === targetFy) {
                items.push({ ...data, id: docSnap.id });
              }
            }
          });
          // Sort by creation date desc
          items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          localImprovements = items;
          callback(items);
        },
        (err) => {
          console.warn('Bridge improvements subscription error:', err);
          callback(localImprovements);
        }
      );
    } catch (err) {
      console.warn('Bridge firestore offline fallback:', err);
      callback(localImprovements);
      return () => {};
    }
  },

  /**
   * Subscribe to executive decisions
   */
  subscribeDecisions(callback: (items: BridgeExecutiveDecision[]) => void): () => void {
    try {
      const q = query(collection(db, BRIDGE_COLLECTIONS.DECISIONS));
      return onSnapshot(
        q,
        (snapshot) => {
          const items: BridgeExecutiveDecision[] = [];
          const seen = new Set<string>();
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as BridgeExecutiveDecision;
            const decId = data.decisionId || docSnap.id;
            if (!seen.has(decId)) {
              seen.add(decId);
              items.push({ ...data, decisionId: decId });
            }
          });
          items.sort((a, b) => new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime());
          localDecisions = items;
          callback(items);
        },
        (err) => {
          console.warn('Bridge decisions subscription error:', err);
          callback(localDecisions);
        }
      );
    } catch (err) {
      callback(localDecisions);
      return () => {};
    }
  },

  /**
   * Fetch all improvements (with optional filter)
   */
  async getAllImprovements(filter?: { fiscalYear?: number | string }): Promise<BridgeImprovement[]> {
    try {
      const colRef = collection(db, BRIDGE_COLLECTIONS.IMPROVEMENTS);
      const snapshot = await getDocs(colRef);
      const items: BridgeImprovement[] = [];
      const seen = new Set<string>();
      const targetFy = filter?.fiscalYear && filter.fiscalYear !== 'ALL' ? String(filter.fiscalYear) : null;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as BridgeImprovement;
        const id = docSnap.id;
        if (!data.isDeleted && !seen.has(id)) {
          if (!targetFy || String(data.fiscalYear) === targetFy) {
            seen.add(id);
            items.push({ ...data, id });
          }
        }
      });
      items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      if (items.length > 0) localImprovements = items;
      return items.length > 0 ? items : localImprovements;
    } catch (e) {
      console.warn('getAllImprovements error:', e);
      return localImprovements.filter((i) => !filter?.fiscalYear || String(i.fiscalYear) === String(filter.fiscalYear));
    }
  },

  /**
   * Fetch all executive decisions
   */
  async getExecutiveDecisions(): Promise<BridgeExecutiveDecision[]> {
    try {
      const q = query(collection(db, BRIDGE_COLLECTIONS.DECISIONS));
      const snapshot = await getDocs(q);
      const items: BridgeExecutiveDecision[] = [];
      const seen = new Set<string>();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as BridgeExecutiveDecision;
        const decId = data.decisionId || docSnap.id;
        if (!seen.has(decId)) {
          seen.add(decId);
          items.push({ ...data, decisionId: decId });
        }
      });
      items.sort((a, b) => new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime());
      if (items.length > 0) localDecisions = items;
      return items.length > 0 ? items : localDecisions;
    } catch (e) {
      return localDecisions;
    }
  },

  /**
   * Fetch single improvement by Document ID
   */
  async getById(id: string): Promise<BridgeImprovement | null> {
    try {
      const snap = await getDoc(doc(db, BRIDGE_COLLECTIONS.IMPROVEMENTS, id));
      if (snap.exists()) {
        return snap.data() as BridgeImprovement;
      }
      return localImprovements.find((item) => item.id === id) || null;
    } catch (e) {
      return localImprovements.find((item) => item.id === id) || null;
    }
  },

  /**
   * Create or Save a new Improvement to Firestore
   */
  async save(
    improvement: Omit<BridgeImprovement, 'id' | 'currentBridgeStep' | 'createdAt' | 'updatedAt' | 'version' | 'isDeleted'>,
    operator: { userId: string; userName: string; role?: string }
  ): Promise<BridgeImprovement> {
    const docId = improvement.improvementId || `BRG-2569-${Date.now().toString().slice(-4)}`;
    const calculatedStep = calculateBridgeStep(improvement);
    const now = new Date().toISOString();

    const isDraft = improvement.overallStatus === 'DRAFT' || improvement.lifecycleStatus === 'DRAFT';
    const lifecycleStatus = isDraft ? 'DRAFT' : (improvement.lifecycleStatus || 'IN_PROGRESS');
    const workflowStatus = isDraft ? 'DRAFT' : (improvement.workflowStatus || 'IN_PROGRESS');
    const publicVisibility = !isDraft;
    const isActive = !isDraft;
    const startedAt = !isDraft ? (improvement.startedAt || now) : null;

    const fullRecord: BridgeImprovement = {
      ...improvement,
      id: docId,
      fiscalYear: Number(improvement.fiscalYear) || 2569,
      overallStatus: isDraft ? 'DRAFT' : (improvement.overallStatus || 'IN_PROGRESS'),
      lifecycleStatus,
      workflowStatus,
      publicVisibility,
      isActive,
      startedAt: startedAt || undefined,
      currentBridgeStep: calculatedStep,
      currentBridgeStage: calculatedStep,
      isDeleted: false,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    const cleanedPayload = removeUndefined(fullRecord);

    try {
      await setDoc(doc(db, BRIDGE_COLLECTIONS.IMPROVEMENTS, docId), cleanedPayload);

      // Verify persistence
      const verifySnap = await getDoc(doc(db, BRIDGE_COLLECTIONS.IMPROVEMENTS, docId));
      if (!verifySnap.exists()) {
        throw new Error('ไม่พบเอกสารใน Firestore หลังจากการบันทึก');
      }

      // Audit Log
      await logService.add({
        userId: operator.userId,
        userName: operator.userName,
        role: (operator.role as any) || 'OWNER',
        action: 'CREATE',
        recordId: docId,
        details: `สร้างประเด็นปรับปรุงงาน BRIDGE: [${fullRecord.improvementId}] ${fullRecord.title} (สถานะ: ${fullRecord.lifecycleStatus}, ขั้น: ${calculatedStep})`,
        newData: cleanedPayload,
      });

      const idx = localImprovements.findIndex((i) => i.id === docId);
      if (idx >= 0) localImprovements[idx] = fullRecord;
      else localImprovements.unshift(fullRecord);

      return fullRecord;
    } catch (err: any) {
      console.error('Firestore bridgeService.save error:', err);
      throw new Error(`บันทึกลงฐานข้อมูลหลักไม่สำเร็จ: ${err.message || err}`);
    }
  },

  /**
   * Update existing Improvement with Version Tracking
   */
  async update(
    id: string,
    updates: Partial<BridgeImprovement>,
    operator: { userId: string; userName: string; role?: string }
  ): Promise<BridgeImprovement> {
    const now = new Date().toISOString();
    const existing = await this.getById(id);

    const merged: BridgeImprovement = {
      ...(existing || ({} as BridgeImprovement)),
      ...updates,
      id,
      fiscalYear: updates.fiscalYear !== undefined ? Number(updates.fiscalYear) || 2569 : (existing?.fiscalYear ? Number(existing.fiscalYear) : 2569),
      updatedAt: now,
      version: (existing?.version || 1) + 1,
    };

    // Keep lifecycle and workflow status consistent
    if (merged.overallStatus === 'DRAFT' || merged.lifecycleStatus === 'DRAFT') {
      merged.lifecycleStatus = 'DRAFT';
      merged.workflowStatus = 'DRAFT';
      merged.publicVisibility = false;
      merged.isActive = false;
    } else if (merged.overallStatus === 'CANCELLED' || merged.lifecycleStatus === 'CANCELLED') {
      merged.lifecycleStatus = 'CANCELLED';
      merged.workflowStatus = 'CANCELLED';
      merged.publicVisibility = false;
      merged.isActive = false;
    } else {
      // In Progress / Completed / etc.
      if (!merged.lifecycleStatus) {
        merged.lifecycleStatus = (merged.currentProgressPercentage || 0) >= 100 ? 'COMPLETED' : 'IN_PROGRESS';
      }
      if (!merged.workflowStatus) {
        merged.workflowStatus = (merged.currentProgressPercentage || 0) >= 100 ? 'COMPLETED' : 'IN_PROGRESS';
      }
      merged.publicVisibility = true;
      merged.isActive = true;
      if (!merged.startedAt) {
        merged.startedAt = now;
      }
    }

    merged.currentBridgeStep = calculateBridgeStep(merged);
    merged.currentBridgeStage = merged.currentBridgeStep;

    const cleanedMerged = removeUndefined(merged);

    try {
      await setDoc(doc(db, BRIDGE_COLLECTIONS.IMPROVEMENTS, id), cleanedMerged, { merge: true });

      // Verify persistence
      const verifySnap = await getDoc(doc(db, BRIDGE_COLLECTIONS.IMPROVEMENTS, id));
      if (!verifySnap.exists()) {
        throw new Error('ไม่พบเอกสารใน Firestore หลังจากการอัปเดต');
      }

      // Audit log
      await logService.add({
        userId: operator.userId,
        userName: operator.userName,
        role: (operator.role as any) || 'OWNER',
        action: 'EDIT',
        recordId: id,
        details: `อัปเดตประเด็นปรับปรุงงาน BRIDGE: [${merged.improvementId}] ${merged.title} (สถานะ: ${merged.lifecycleStatus}, ขั้น: ${merged.currentBridgeStep})`,
        newData: cleanedMerged,
      });

      const idx = localImprovements.findIndex((i) => i.id === id);
      if (idx >= 0) localImprovements[idx] = merged;

      return merged;
    } catch (err: any) {
      console.error('Firestore bridgeService.update error:', err);
      throw new Error(`อัปเดตข้อมูลลงฐานข้อมูลหลักไม่สำเร็จ: ${err.message || err}`);
    }
  },

  /**
   * Transition a DRAFT improvement to IN_PROGRESS (Start Operation)
   */
  async startOperation(
    id: string,
    operator: { userId: string; userName: string; role?: string }
  ): Promise<BridgeImprovement> {
    const now = new Date().toISOString();
    return await this.update(
      id,
      {
        overallStatus: 'IN_PROGRESS',
        lifecycleStatus: 'IN_PROGRESS',
        workflowStatus: 'IN_PROGRESS',
        publicVisibility: true,
        isActive: true,
        startedAt: now,
      },
      operator
    );
  },

  /**
   * Add a new Progress Report Update to an Improvement
   */
  async addProgressReport(
    improvementId: string,
    report: Omit<BridgeProgressUpdate, 'reportId' | 'improvementId' | 'reportedAt'>,
    operator: { userId: string; userName: string; role?: string }
  ): Promise<BridgeImprovement> {
    const existing = await this.getById(improvementId);
    if (!existing) throw new Error('Improvement not found');

    const reportId = `RPT-${Date.now()}`;
    const newReport: BridgeProgressUpdate = {
      ...report,
      reportId,
      improvementId,
      reportedAt: new Date().toISOString(),
    };

    const updatedReports = [...(existing.progressReports || []), newReport];
    const newProgress = Number(report.progressPercentage) || 0;

    // Check if executive decision was requested in this progress report
    if (report.requiresExecutiveDecision && report.decisionTopic) {
      await this.requestExecutiveDecision({
        decisionId: `DEC-${Date.now()}`,
        improvementId,
        improvementTitle: existing.title,
        departmentOrCourseName: existing.ownerNameSnapshot,
        requestedBy: operator.userName,
        requestedAt: new Date().toISOString(),
        topic: report.decisionTopic,
        details: report.remainingProblems || report.completedTasksSummary || '',
        decisionStatus: 'PENDING',
      });
    }

    return await this.update(
      improvementId,
      {
        progressReports: updatedReports,
        currentProgressPercentage: newProgress,
        overallStatus: newProgress >= 100 ? 'COMPLETED' : 'IN_PROGRESS',
      },
      operator
    );
  },

  /**
   * Delete a specific Progress Report from an Improvement
   */
  async deleteProgressReport(
    improvementId: string,
    reportId: string,
    operator: { userId: string; userName: string; role?: string }
  ): Promise<BridgeImprovement> {
    const existing = await this.getById(improvementId);
    if (!existing) throw new Error('Improvement not found');

    const currentReports = existing.progressReports || [];
    const targetReport = currentReports.find(
      (r, idx) => (r.reportId ? r.reportId === reportId : `RPT-${idx}` === reportId)
    );
    const updatedReports = currentReports.filter(
      (r, idx) => (r.reportId ? r.reportId !== reportId : `RPT-${idx}` !== reportId)
    );

    // Recalculate progress percentage
    let newProgress = 0;
    if (updatedReports.length > 0) {
      const latest = updatedReports[updatedReports.length - 1];
      newProgress = Number(latest.progressPercentage) || 0;
    }

    const updated = await this.update(
      improvementId,
      {
        progressReports: updatedReports,
        currentProgressPercentage: newProgress,
        overallStatus: newProgress >= 100 ? 'COMPLETED' : 'IN_PROGRESS',
      },
      operator
    );

    // Audit log entry
    try {
      await logService.add({
        userId: operator.userId,
        userName: operator.userName,
        role: (operator.role as any) || 'OWNER',
        action: 'DELETE',
        recordId: improvementId,
        details: `ลบประวัติการรายงานความก้าวหน้ารอบ "${targetReport?.periodName || reportId}" ของประเด็น ${existing.improvementId} (${existing.title})`,
      });
    } catch (e) {
      console.warn('Audit log error on deleteProgressReport:', e);
    }

    return updated;
  },

  /**
   * Request an Executive Decision
   */
  async requestExecutiveDecision(decision: BridgeExecutiveDecision): Promise<void> {
    const cleaned = removeUndefined(decision);
    try {
      await setDoc(doc(db, BRIDGE_COLLECTIONS.DECISIONS, decision.decisionId), cleaned);
      localDecisions.unshift(decision);
    } catch (e: any) {
      console.error('requestExecutiveDecision error:', e);
      throw new Error(`ไม่สามารถบันทึกข้อเสนอผู้บริหารได้: ${e.message || e}`);
    }
  },

  /**
   * Dispatch real-time email notification for newly submitted progress reports
   */
  async notifyProgressSubmission(payload: {
    improvementId: string;
    improvementTitle: string;
    periodName: string;
    progressPercentage: number;
    completedTasksSummary: string;
    periodAchievement?: string;
    customerImpactFeedback?: string;
    nextSteps?: string;
    requiresExecutiveDecision?: boolean;
    decisionTopic?: string;
    reportedByName: string;
    departmentName?: string;
    recipientEmails?: string[];
    directUrl?: string;
  }): Promise<{ success: boolean; realDelivery?: boolean; sendMode?: string; messageId?: string; error?: string }> {
    try {
      const res = await fetch('/api/bridge/notify-progress-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err: any) {
      console.warn('notifyProgressSubmission network warning:', err);
      return { success: false, error: err.message || 'Network error' };
    }
  },

  /**
   * Resolve an Executive Decision
   */
  async resolveExecutiveDecision(
    decisionId: string,
    resolution: {
      decisionStatus: 'APPROVED' | 'REJECTED' | 'DIRECTED';
      executiveComment: string;
      decidedBy: string;
    }
  ): Promise<void> {
    const now = new Date().toISOString();
    const updateData = removeUndefined({
      ...resolution,
      decidedAt: now,
    });
    try {
      await updateDoc(doc(db, BRIDGE_COLLECTIONS.DECISIONS, decisionId), updateData);
      const idx = localDecisions.findIndex((d) => d.decisionId === decisionId);
      if (idx >= 0) localDecisions[idx] = { ...localDecisions[idx], ...updateData };
    } catch (e: any) {
      console.error('resolveExecutiveDecision error:', e);
      throw new Error(`ไม่สามารถบันทึกผลการพิจารณาได้: ${e.message || e}`);
    }
  },

  /**
   * Delete an Executive Decision record
   */
  async deleteExecutiveDecision(
    decisionId: string,
    operator?: { userId?: string; userName?: string; role?: string }
  ): Promise<void> {
    const op = {
      userId: operator?.userId || 'SYSTEM',
      userName: operator?.userName || 'ผู้ดูแลระบบ',
      role: operator?.role || 'ADMIN',
    };
    try {
      await deleteDoc(doc(db, BRIDGE_COLLECTIONS.DECISIONS, decisionId));
      localDecisions = localDecisions.filter((d) => d.decisionId !== decisionId);

      // Audit log entry
      try {
        await logService.add({
          userId: op.userId,
          userName: op.userName,
          role: (op.role as any) || 'ADMIN',
          action: 'DELETE',
          recordId: decisionId,
          details: `ลบรายการข้อสั่งการ/การตัดสินใจของผู้บริหาร รหัส: ${decisionId}`,
        });
      } catch (logErr) {
        console.warn('Audit log error on deleteExecutiveDecision:', logErr);
      }
    } catch (e: any) {
      console.error('deleteExecutiveDecision error:', e);
      throw new Error(`ไม่สามารถลบรายการการตัดสินใจได้: ${e.message || e}`);
    }
  },

  /**
   * Soft Delete an Improvement (SUPER_ADMIN / ADMIN or Creator)
   */
  async softDelete(
    id: string,
    operator?: { userId?: string; userName?: string; role?: string }
  ): Promise<void> {
    const now = new Date().toISOString();
    const op = {
      userId: operator?.userId || 'SYSTEM',
      userName: operator?.userName || 'ผู้ดูแลระบบ',
      role: operator?.role || 'ADMIN',
    };
    try {
      await updateDoc(doc(db, BRIDGE_COLLECTIONS.IMPROVEMENTS, id), {
        isDeleted: true,
        deletedAt: now,
        deletedBy: op.userName,
      });

      // Audit log
      await logService.add({
        userId: op.userId,
        userName: op.userName,
        role: (op.role as any) || 'ADMIN',
        action: 'DELETE',
        recordId: id,
        details: `ย้ายประเด็นปรับปรุงงาน BRIDGE ไปยังถังขยะ: ${id}`,
      });

      localImprovements = localImprovements.filter((i) => i.id !== id);
    } catch (e: any) {
      console.error('softDelete error:', e);
      throw new Error(`ไม่สามารถลบประเด็นปรับปรุงงานได้: ${e.message || e}`);
    }
  },

  /**
   * Renumber all active improvements sequentially for a given fiscal year
   * (e.g. BRG-2569-0001, BRG-2569-0002, ...)
   */
  async renumberAll(
    fiscalYear: number | string = 2569,
    operator?: { userId?: string; userName?: string; role?: string }
  ): Promise<BridgeImprovement[]> {
    const fyNumber = Number(fiscalYear) || 2569;
    const op = {
      userId: operator?.userId || 'SYSTEM',
      userName: operator?.userName || 'ผู้ดูแลระบบ',
      role: operator?.role || 'ADMIN',
    };

    try {
      const q = collection(db, BRIDGE_COLLECTIONS.IMPROVEMENTS);
      const snapshot = await getDocs(q);
      const activeItems: BridgeImprovement[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as BridgeImprovement;
        if (!data.isDeleted && Number(data.fiscalYear) === fyNumber) {
          activeItems.push({ ...data, id: docSnap.id });
        }
      });

      // Sort by creation date or previous sequence number
      activeItems.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return (a.improvementId || '').localeCompare(b.improvementId || '');
      });

      const updatedList: BridgeImprovement[] = [];

      for (let i = 0; i < activeItems.length; i++) {
        const item = activeItems[i];
        const newImprovementId = `BRG-${fyNumber}-${String(i + 1).padStart(4, '0')}`;
        
        if (item.improvementId !== newImprovementId) {
          await updateDoc(doc(db, BRIDGE_COLLECTIONS.IMPROVEMENTS, item.id), {
            improvementId: newImprovementId,
            updatedAt: new Date().toISOString(),
          });
          item.improvementId = newImprovementId;
        }
        updatedList.push(item);
      }

      // Audit Log
      await logService.add({
        userId: op.userId,
        userName: op.userName,
        role: (op.role as any) || 'ADMIN',
        action: 'EDIT',
        details: `รันและจัดระเบียบเลขรหัสประเด็นปรับปรุง BRIDGE ปีงบประมาณ ${fyNumber} ใหม่ทั้งหมด (${updatedList.length} รายการ)`,
      });

      return updatedList;
    } catch (e: any) {
      console.error('renumberAll error:', e);
      throw new Error(`ไม่สามารถรันเลขรหัสใหม่ได้: ${e.message || e}`);
    }
  },

  /**
   * Delete an improvement and automatically renumber remaining active items
   */
  async deleteAndRenumber(
    id: string,
    fiscalYear: number | string = 2569,
    operator?: { userId?: string; userName?: string; role?: string }
  ): Promise<void> {
    await this.softDelete(id, operator);
    await this.renumberAll(fiscalYear, operator);
  },

  /**
   * Fetch all soft-deleted improvements for TrashView
   */
  async getDeleted(): Promise<BridgeImprovement[]> {
    try {
      const q = query(
        collection(db, BRIDGE_COLLECTIONS.IMPROVEMENTS),
        where('isDeleted', '==', true)
      );
      const snapshot = await getDocs(q);
      const items: BridgeImprovement[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ ...(docSnap.data() as BridgeImprovement), id: docSnap.id });
      });
      items.sort((a, b) => new Date(b.deletedAt || b.updatedAt || 0).getTime() - new Date(a.deletedAt || a.updatedAt || 0).getTime());
      return items;
    } catch (e) {
      return [];
    }
  },

  /**
   * Restore a soft-deleted item
   */
  async restore(
    id: string,
    operator?: { userId?: string; userName?: string; role?: string }
  ): Promise<void> {
    const now = new Date().toISOString();
    const op = {
      userId: operator?.userId || 'SYSTEM',
      userName: operator?.userName || 'ผู้ดูแลระบบ',
      role: operator?.role || 'ADMIN',
    };
    try {
      await updateDoc(doc(db, BRIDGE_COLLECTIONS.IMPROVEMENTS, id), {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      });

      // Audit log
      await logService.add({
        userId: op.userId,
        userName: op.userName,
        role: (op.role as any) || 'ADMIN',
        action: 'RESTORE',
        recordId: id,
        details: `กู้คืนประเด็นปรับปรุงงาน BRIDGE จากถังขยะ: ${id}`,
      });
    } catch (e: any) {
      console.error('Restore failed:', e);
      throw new Error(`ไม่สามารถกู้คืนประเด็นปรับปรุงงานได้: ${e.message || e}`);
    }
  },
};


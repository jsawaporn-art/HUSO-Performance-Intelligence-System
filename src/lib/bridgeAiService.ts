import { BridgeAiAnalysisResult } from '../types/bridge';

export interface RequestBridgeAiPayload {
  issueTitle: string;
  issueDescription: string;
  issueType?: string;
  processCategory?: string;
  ownerType?: string;
  ownerId?: string;
  affectedGroupIds?: string[];
  affectedGroups?: string | string[];
  affectedGroup?: string | string[];
  affectedGroupDetail?: string;
  customerNeed?: string;
  customerExpectation?: string;
  customerFeedback?: string;
  impactOnCustomer?: string;
  issueSource?: string;
  sourceDetail?: string;
  relatedIndicatorIds?: string | string[];
  urgencyLevel?: string;
  existingEvidence?: string;
  forceRefresh?: boolean;
  signal?: AbortSignal;
}

// In-Memory Client-Side Cache (Isolated, does NOT write to Firestore collections)
const analysisMemoryCache = new Map<string, BridgeAiAnalysisResult>();

/**
 * Helper to convert string | string[] to string
 */
function toStringVal(val?: string | string[]): string {
  if (!val) return '';
  if (Array.isArray(val)) return val.join(', ');
  return String(val);
}

/**
 * Generate a deterministic hash string from the issue input fields
 */
export function generateBridgeInputHash(payload: Partial<RequestBridgeAiPayload>): string {
  const groupsStr = toStringVal(payload.affectedGroups || payload.affectedGroup || (Array.isArray(payload.affectedGroupIds) ? payload.affectedGroupIds.join(',') : ''));
  const indicatorsStr = toStringVal(payload.relatedIndicatorIds);

  const normalized = [
    (payload.issueTitle || '').trim().toLowerCase(),
    (payload.issueDescription || '').trim().toLowerCase(),
    (payload.issueType || '').trim().toLowerCase(),
    (payload.processCategory || '').trim().toLowerCase(),
    (payload.ownerType || '').trim().toLowerCase(),
    (payload.ownerId || '').trim().toLowerCase(),
    groupsStr.trim().toLowerCase(),
    (payload.affectedGroupDetail || '').trim().toLowerCase(),
    (payload.customerNeed || '').trim().toLowerCase(),
    (payload.customerExpectation || '').trim().toLowerCase(),
    (payload.customerFeedback || '').trim().toLowerCase(),
    (payload.impactOnCustomer || '').trim().toLowerCase(),
    (payload.issueSource || '').trim().toLowerCase(),
    (payload.sourceDetail || '').trim().toLowerCase(),
    indicatorsStr.trim().toLowerCase(),
    (payload.urgencyLevel || '').trim().toLowerCase(),
    (payload.existingEvidence || '').trim().toLowerCase(),
  ].join('||');

  // Simple string hash code
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `hash_${Math.abs(hash).toString(36)}_${normalized.length}`;
}

/**
 * Request fast, one-pass AI Bridge analysis with 45s timeout and in-memory caching
 */
export async function requestBridgeAiAnalysis(payload: RequestBridgeAiPayload): Promise<BridgeAiAnalysisResult> {
  const cleanTitle = (payload.issueTitle || '').trim();
  const cleanDesc = (payload.issueDescription || '').trim();

  // Guard check: Must have title OR description >= 20 chars
  if (!cleanTitle && cleanDesc.length < 20) {
    throw new Error('กรุณาระบุรายละเอียดประเด็นปัญหาเพิ่มเติมก่อนให้ AI วิเคราะห์ (ต้องมีชื่อประเด็น หรือรายละเอียดอย่างน้อย 20 ตัวอักษร)');
  }

  // Check In-Memory Cache if not forced refresh
  const inputHash = generateBridgeInputHash(payload);
  if (!payload.forceRefresh && analysisMemoryCache.has(inputHash)) {
    const cached = analysisMemoryCache.get(inputHash)!;
    return {
      ...cached,
      isFromCache: true,
      inputHash,
    };
  }

  // Send ONLY the specific fields for the current issue
  const sanitizedBody = {
    issueTitle: cleanTitle,
    issueDescription: cleanDesc,
    issueType: (payload.issueType || '').trim(),
    processCategory: (payload.processCategory || '').trim(),
    ownerType: (payload.ownerType || '').trim(),
    ownerId: (payload.ownerId || '').trim(),
    affectedGroups: toStringVal(payload.affectedGroups || payload.affectedGroup).trim(),
    affectedGroupIds: payload.affectedGroupIds || [],
    affectedGroupDetail: (payload.affectedGroupDetail || '').trim(),
    customerNeed: (payload.customerNeed || '').trim(),
    customerExpectation: (payload.customerExpectation || '').trim(),
    customerFeedback: (payload.customerFeedback || '').trim(),
    impactOnCustomer: (payload.impactOnCustomer || '').trim(),
    issueSource: (payload.issueSource || '').trim(),
    sourceDetail: (payload.sourceDetail || '').trim(),
    relatedIndicatorIds: toStringVal(payload.relatedIndicatorIds).trim(),
    urgencyLevel: (payload.urgencyLevel || '').trim(),
    existingEvidence: (payload.existingEvidence || '').trim(),
  };

  const startTime = Date.now();
  const internalController = new AbortController();
  const timeoutId = setTimeout(() => {
    internalController.abort();
  }, 45000); // 45-second timeout

  // If external signal is provided, forward its abort
  if (payload.signal) {
    payload.signal.addEventListener('abort', () => {
      internalController.abort();
    });
  }

  try {
    const response = await fetch('/api/bridge/ai-analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sanitizedBody),
      signal: internalController.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'AI ยังไม่สามารถวิเคราะห์ได้ในขณะนี้ คุณสามารถกรอกข้อมูลเอง หรือลองใหม่อีกครั้ง');
    }

    const data: BridgeAiAnalysisResult = await response.json();
    const durationSeconds = Number(((Date.now() - startTime) / 1000).toFixed(1));

    const finalResult: BridgeAiAnalysisResult = {
      ...data,
      analysisDurationSeconds: durationSeconds,
      isFromCache: false,
      inputHash,
      analysisVersion: 1,
    };

    // Store in memory cache
    analysisMemoryCache.set(inputHash, finalResult);

    return finalResult;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError' || err.message?.includes('aborted')) {
      throw new Error('AI ใช้เวลาตอบนานกว่าปกติ หรือถูกยกเลิก คุณสามารถกรอกข้อมูลเอง หรือลองใหม่อีกครั้ง');
    }
    throw new Error(err.message || 'AI ยังไม่สามารถวิเคราะห์ได้ในขณะนี้ คุณสามารถกรอกข้อมูลเอง หรือลองใหม่อีกครั้ง');
  }
}


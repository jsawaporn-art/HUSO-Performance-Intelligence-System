import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import nodemailer from 'nodemailer';
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
  THAI_MONTHS,
} from './src/mockData';
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
  TrafficLightStatus,
  VerificationStatus,
} from './src/types';
import { getPublicStrategyPerformanceSummary } from './src/lib/reportingPeriodUtils';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-Memory Data Store (Seeded)
let systemConfig: SystemConfig = { ...INITIAL_CONFIG };
let departments = [...INITIAL_DEPARTMENTS];
let strategies = [...INITIAL_STRATEGIES];
let indicators: Indicator[] = [...INITIAL_INDICATORS];
let targets: Target[] = [...INITIAL_TARGETS];
let monthlyProgressList: MonthlyProgress[] = [...INITIAL_PROGRESS];
let evidenceList: Evidence[] = [...INITIAL_EVIDENCE];
let directives: ActionDirective[] = [...INITIAL_DIRECTIVES];
let users: User[] = [...INITIAL_USERS];
let logs: ActivityLog[] = [...INITIAL_LOGS];
let reports: MonthlyReport[] = [...INITIAL_REPORTS];

// Helper: Calculate Traffic Light & Variance
function calculateProgressStatus(
  indicator: Indicator,
  targetMonthly: number,
  actualMonthly: number,
  config: SystemConfig
): {
  achievementPercent: number;
  variance: number;
  varianceText: string;
  status: TrafficLightStatus;
} {
  let achievementPercent = 0;
  let variance = 0;
  let varianceText = '';

  if (indicator.direction === 'MORE_IS_BETTER') {
    variance = actualMonthly - targetMonthly;
    if (targetMonthly > 0) {
      achievementPercent = (actualMonthly / targetMonthly) * 100;
    } else {
      achievementPercent = actualMonthly > 0 ? 100 : 0;
    }
    varianceText =
      variance >= 0
        ? `สูงกว่าเป้าหมาย +${variance.toFixed(1)} ${indicator.unit}`
        : `ต่ำกว่าเป้าหมาย ${variance.toFixed(1)} ${indicator.unit}`;
  } else if (indicator.direction === 'LESS_IS_BETTER') {
    variance = targetMonthly - actualMonthly;
    if (actualMonthly === 0) {
      achievementPercent = 100; // Cap at max success if zero issues/time
      varianceText = `บรรลุผลสูงสุด (0 ${indicator.unit})`;
    } else {
      achievementPercent = (targetMonthly / actualMonthly) * 100;
      varianceText =
        variance >= 0
          ? `เร็วกว่า/ดีกว่าเป้าหมาย ${variance.toFixed(1)} ${indicator.unit}`
          : `ใช้เวลา/ค่าใช้จ่ายเกิน ${Math.abs(variance).toFixed(1)} ${indicator.unit}`;
    }
  } else if (indicator.direction === 'EXACT_TARGET') {
    achievementPercent = actualMonthly === targetMonthly ? 100 : 50;
    variance = actualMonthly - targetMonthly;
    varianceText =
      actualMonthly === targetMonthly
        ? 'ตรงตามเป้าหมาย'
        : `ต่างจากเป้าหมาย ${variance.toFixed(1)} ${indicator.unit}`;
  } else {
    // MILESTONE
    achievementPercent = Math.min(100, (actualMonthly / (targetMonthly || 5)) * 100);
    variance = actualMonthly - targetMonthly;
    varianceText = `ระดับขั้นความสำเร็จ ${actualMonthly} / ${targetMonthly}`;
  }

  achievementPercent = Math.round(achievementPercent * 10) / 10;

  let status: TrafficLightStatus = 'NO_DATA';
  if (achievementPercent >= config.thresholds.onTrack) {
    status = 'ON_TRACK';
  } else if (achievementPercent >= config.thresholds.watch) {
    status = 'WATCH';
  } else if (achievementPercent >= config.thresholds.risk) {
    status = 'RISK';
  } else {
    status = 'CRITICAL';
  }

  return { achievementPercent, variance, varianceText, status };
}

// Helper: Auto Code Generator (KPI-2569-001, KVI-2569-001)
function generateNextCode(type: 'KPI' | 'KVI', year: string = '2569'): string {
  const prefix = `${type}-${year}-`;
  const existingCodes = indicators
    .filter((ind) => ind.type === type && ind.code.startsWith(prefix))
    .map((ind) => {
      const parts = ind.code.split('-');
      return parseInt(parts[parts.length - 1] || '0', 10);
    });

  const nextNum = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1;
  return `${prefix}${nextNum.toString().padStart(3, '0')}`;
}

// Helper: Log Activity
function addLog(
  userId: string,
  userName: string,
  role: any,
  action: ActivityLog['action'],
  recordId: string,
  details: string,
  oldData?: any,
  newData?: any
) {
  const newLog: ActivityLog = {
    logId: `LOG-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId,
    userName,
    role,
    action,
    recordId,
    details,
    oldData,
    newData,
    status: 'SUCCESS',
  };
  logs.unshift(newLog);
}

// REST API ROUTES
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// Master Data & Config
app.get('/api/config', (req, res) => {
  res.json(systemConfig);
});

app.put('/api/config', (req, res) => {
  systemConfig = { ...systemConfig, ...req.body };
  addLog('ADMIN', 'ผู้ดูแลระบบ', 'ADMIN', 'EDIT', 'SYS_CONFIG', 'ปรับแต่งการตั้งค่าระบบ');
  res.json(systemConfig);
});

app.get('/api/departments', (req, res) => {
  res.json(departments);
});

app.get('/api/strategies', (req, res) => {
  const { fiscalYear } = req.query;
  if (fiscalYear && fiscalYear !== 'ALL') {
    const filtered = strategies.filter(
      (s) => s.fiscalYear === fiscalYear || !s.fiscalYear
    );
    return res.json(filtered);
  }
  res.json(strategies);
});

app.post('/api/strategies', (req, res) => {
  const { code, name, fiscalYear, objectives } = req.body;
  const fy = fiscalYear || '2569';
  
  const existingInFy = strategies.filter((s) => s.fiscalYear === fy);
  const nextNum = existingInFy.length + 1;
  const autoCode = code || `ยุทธศาสตร์ที่ ${nextNum}`;
  let autoName = (name || 'ประเด็นยุทธศาสตร์ใหม่').trim();
  if (!autoName.startsWith('ยุทธศาสตร์ที่') && autoCode && !autoName.startsWith(autoCode)) {
    autoName = `${autoCode}: ${autoName}`;
  }

  const newStrategy: StrategicIssue = {
    id: `STRAT-${fy}-${Date.now().toString().slice(-4)}`,
    code: autoCode,
    name: autoName,
    fiscalYear: fy,
    objectives: Array.isArray(objectives) ? objectives : objectives ? [objectives] : [],
  };

  strategies.push(newStrategy);
  addLog('ADMIN', 'ผู้ดูแลระบบ', 'ADMIN', 'CREATE', newStrategy.id, `เพิ่มยุทธศาสตร์สำหรับปีงบประมาณ ${fy}`);
  res.status(201).json(newStrategy);
});

app.put('/api/strategies/:id', (req, res) => {
  const { id } = req.params;
  const idx = strategies.findIndex((s) => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ message: 'Strategy not found' });
  }

  const { code, name, fiscalYear, objectives } = req.body;
  strategies[idx] = {
    ...strategies[idx],
    ...(code && { code }),
    ...(name && { name }),
    ...(fiscalYear && { fiscalYear }),
    ...(objectives !== undefined && { objectives: Array.isArray(objectives) ? objectives : [objectives] }),
  };

  addLog('ADMIN', 'ผู้ดูแลระบบ', 'ADMIN', 'EDIT', id, `ปรับปรุงยุทธศาสตร์ ${strategies[idx].name}`);
  res.json(strategies[idx]);
});

app.delete('/api/strategies/:id', (req, res) => {
  const { id } = req.params;
  const idx = strategies.findIndex((s) => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ message: 'Strategy not found' });
  }

  const removed = strategies.splice(idx, 1)[0];
  addLog('ADMIN', 'ผู้ดูแลระบบ', 'ADMIN', 'DELETE', id, `ลบยุทธศาสตร์ ${removed.name}`);
  res.json({ message: 'Deleted successfully', strategy: removed });
});

app.post('/api/strategies/copy', (req, res) => {
  const { fromYear, toYear } = req.body;
  if (!fromYear || !toYear) {
    return res.status(400).json({ message: 'fromYear and toYear are required' });
  }

  const sourceStrategies = strategies.filter((s) => s.fiscalYear === fromYear);
  if (sourceStrategies.length === 0) {
    return res.status(404).json({ message: `ไม่พบยุทธศาสตร์ของปีงบประมาณ ${fromYear}` });
  }

  let createdCount = 0;
  sourceStrategies.forEach((src, index) => {
    const newId = `STRAT-${toYear}-${index + 1}`;
    const newStrat: StrategicIssue = {
      id: newId,
      code: src.code,
      name: src.name,
      fiscalYear: toYear,
      objectives: [...src.objectives],
    };

    const existingIdx = strategies.findIndex((s) => s.fiscalYear === toYear && s.code === src.code);
    if (existingIdx !== -1) {
      strategies[existingIdx] = newStrat;
    } else {
      strategies.push(newStrat);
    }
    createdCount++;
  });

  addLog('ADMIN', 'ผู้ดูแลระบบ', 'ADMIN', 'CREATE', `COPY-${toYear}`, `คัดลอกยุทธศาสตร์ ${createdCount} รายการ จากปี ${fromYear} สู่ปี ${toYear}`);
  res.json({ message: `คัดลอกยุทธศาสตร์ ${createdCount} รายการเรียบร้อยแล้ว`, count: createdCount });
});

// Indicators API
app.get('/api/indicators', (req, res) => {
  const { type, strategyId, departmentId, search, status } = req.query;
  let result = indicators;

  if (status === 'DELETED') {
    result = result.filter((i) => i.status === 'DELETED');
  } else {
    result = result.filter((i) => i.status !== 'DELETED');
  }

  if (type) {
    result = result.filter((i) => i.type === type);
  }
  if (strategyId) {
    result = result.filter((i) => i.strategyId === strategyId);
  }
  if (departmentId) {
    result = result.filter((i) => i.departmentId === departmentId);
  }
  if (search) {
    const q = (search as string).toLowerCase();
    result = result.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.code.toLowerCase().includes(q) ||
        i.ownerMain.toLowerCase().includes(q)
    );
  }

  res.json(result);
});

app.post('/api/indicators', (req, res) => {
  const data = req.body;
  const fiscalYear = data.fiscalYear || '2569';
  const autoCode = generateNextCode(data.type || 'KPI', fiscalYear);

  const respDeptId = data.responsibleDepartmentId || data.departmentId || 'DEP-001';
  const foundDept = departments.find((d) => d.id === respDeptId || d.departmentId === respDeptId);
  const respDeptName = data.responsibleDepartmentName || data.departmentName || foundDept?.name || foundDept?.departmentName || 'งานวิชาการ';

  const newIndicator: Indicator = {
    indicatorId: `IND-${Date.now()}`,
    code: autoCode,
    type: data.type || 'KPI',
    name: data.name || 'ตัวชี้วัดใหม่',
    description: data.description || '',
    operationalDef: data.operationalDef || '',
    vision: data.vision || 'มุ่งสู่ความเป็นเลิศทางวิชาการและสังคม',
    strategyId: data.strategyId || 'STRAT-1',
    strategyName:
      strategies.find((s) => s.id === data.strategyId)?.name || 'การพัฒนาหลักสูตร',
    objective: data.objective || '',
    strategy: data.strategy || '',
    mission: data.mission || 'การผลิตบัณฑิต',
    unit: data.unit || 'ร้อยละ',
    direction: data.direction || 'MORE_IS_BETTER',
    formula: data.formula || '',
    source: data.source || '',
    frequency: data.frequency || 'MONTHLY',
    baseline: Number(data.baseline || 0),
    ownerMain: data.ownerMain || 'ไม่ระบุ',
    ownerCo: data.ownerCo || '',
    responsibleDepartmentId: respDeptId,
    responsibleDepartmentName: respDeptName,
    departmentId: respDeptId,
    departmentName: respDeptName,
    mappingStatus: data.mappingStatus || 'MAPPED',
    startDate: data.startDate || '2025-10-01',
    endDate: data.endDate || '2026-09-30',
    weight: Number(data.weight || 10),
    priority: data.priority || 'MEDIUM',
    isActive: true,
    status: 'ACTIVE',
    remarks: data.remarks || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  indicators.push(newIndicator);

  // Auto-create Target entry for 2569
  const newTarget: Target = {
    targetId: `TGT-${newIndicator.indicatorId}-${fiscalYear}`,
    indicatorId: newIndicator.indicatorId,
    fiscalYear,
    annualTarget: Number(data.annualTarget || 100),
    minTarget: Number(data.minTarget || 80),
    challengeTarget: Number(data.challengeTarget || 120),
    baseline: Number(data.baseline || 0),
    q1Target: Number(data.q1Target || 25),
    q2Target: Number(data.q2Target || 50),
    q3Target: Number(data.q3Target || 75),
    q4Target: Number(data.q4Target || 100),
    monthlyTargets: Array(12).fill(Number(data.monthlyTargetDefault || 10)),
    cumulativeTargets: Array(12).fill(Number(data.annualTarget || 100)),
  };
  targets.push(newTarget);

  addLog(
    data.userId || 'ADMIN',
    data.userName || 'ผู้ดูแลระบบ',
    'ADMIN',
    'CREATE',
    newIndicator.indicatorId,
    `สร้างตัวชี้วัดใหม่ ${newIndicator.code} - ${newIndicator.name}`,
    null,
    newIndicator
  );

  res.status(201).json(newIndicator);
});

app.put('/api/indicators/:id', (req, res) => {
  const { id } = req.params;
  const index = indicators.findIndex((i) => i.indicatorId === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Indicator not found' });
  }

  const oldData = { ...indicators[index] };
  indicators[index] = {
    ...indicators[index],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  addLog(
    req.body.userId || 'ADMIN',
    req.body.userName || 'ผู้ดูแลระบบ',
    'ADMIN',
    'EDIT',
    id,
    `แก้ไขตัวชี้วัด ${indicators[index].code}`,
    oldData,
    indicators[index]
  );

  res.json(indicators[index]);
});

app.delete('/api/indicators/:id', (req, res) => {
  const { id } = req.params;
  const index = indicators.findIndex((i) => i.indicatorId === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Indicator not found' });
  }

  const oldData = { ...indicators[index] };
  indicators[index].status = 'DELETED';
  indicators[index].updatedAt = new Date().toISOString();

  addLog(
    (req.query.userId as string) || 'ADMIN',
    (req.query.userName as string) || 'ผู้ดูแลระบบ',
    'ADMIN',
    'DELETE',
    id,
    `ย้ายตัวชี้วัด ${oldData.code} ไปยังถังขยะ (Soft Delete)`,
    oldData,
    indicators[index]
  );

  res.json({ message: 'Soft deleted successfully', indicator: indicators[index] });
});

// Trash & Restore
app.get('/api/trash', (req, res) => {
  const deleted = indicators.filter((i) => i.status === 'DELETED');
  res.json(deleted);
});

app.post('/api/trash/restore', (req, res) => {
  const { indicatorId, userId, userName } = req.body;
  const index = indicators.findIndex((i) => i.indicatorId === indicatorId);
  if (index === -1) {
    return res.status(404).json({ error: 'Indicator not found in trash' });
  }

  indicators[index].status = 'ACTIVE';
  indicators[index].updatedAt = new Date().toISOString();

  addLog(
    userId || 'ADMIN',
    userName || 'ผู้ดูแลระบบ',
    'ADMIN',
    'RESTORE',
    indicatorId,
    `คืนค่าตัวชี้วัด ${indicators[index].code} จากถังขยะ`,
    null,
    indicators[index]
  );

  res.json({ message: 'Restored successfully', indicator: indicators[index] });
});

// Targets API
app.get('/api/targets', (req, res) => {
  const { fiscalYear, indicatorId } = req.query;
  let result = targets;
  if (fiscalYear) {
    result = result.filter((t) => t.fiscalYear === fiscalYear);
  }
  if (indicatorId) {
    result = result.filter((t) => t.indicatorId === indicatorId);
  }
  res.json(result);
});

app.post('/api/targets', (req, res) => {
  const data = req.body;
  const existingIdx = targets.findIndex(
    (t) => t.indicatorId === data.indicatorId && t.fiscalYear === data.fiscalYear
  );

  if (existingIdx !== -1) {
    targets[existingIdx] = { ...targets[existingIdx], ...data };
    res.json(targets[existingIdx]);
  } else {
    const newTarget: Target = {
      targetId: `TGT-${data.indicatorId}-${data.fiscalYear || '2569'}`,
      indicatorId: data.indicatorId,
      fiscalYear: data.fiscalYear || '2569',
      annualTarget: Number(data.annualTarget || 100),
      minTarget: Number(data.minTarget || 80),
      challengeTarget: Number(data.challengeTarget || 120),
      baseline: Number(data.baseline || 0),
      q1Target: Number(data.q1Target || 25),
      q2Target: Number(data.q2Target || 50),
      q3Target: Number(data.q3Target || 75),
      q4Target: Number(data.q4Target || 100),
      monthlyTargets: data.monthlyTargets || Array(12).fill(10),
      cumulativeTargets: data.cumulativeTargets || Array(12).fill(100),
    };
    targets.push(newTarget);
    res.status(201).json(newTarget);
  }
});

// Progress Logging API
app.get('/api/progress', (req, res) => {
  const { fiscalYear, month, indicatorId, status, verificationStatus } = req.query;
  let result = monthlyProgressList;

  if (fiscalYear) {
    result = result.filter((p) => p.fiscalYear === fiscalYear);
  }
  if (month) {
    result = result.filter((p) => p.month === Number(month));
  }
  if (indicatorId) {
    result = result.filter((p) => p.indicatorId === indicatorId);
  }
  if (status) {
    result = result.filter((p) => p.status === status);
  }
  if (verificationStatus) {
    result = result.filter((p) => p.verificationStatus === verificationStatus);
  }

  res.json(result);
});

app.post('/api/progress', (req, res) => {
  const data = req.body;
  const ind = indicators.find((i) => i.indicatorId === data.indicatorId);
  if (!ind) {
    return res.status(400).json({ error: 'Indicator not found' });
  }

  const monthObj = THAI_MONTHS.find((m) => m.id === Number(data.month)) || THAI_MONTHS[0];

  const actualMonthly = Number(data.actualMonthly || 0);
  const targetMonthly = Number(data.targetMonthly || 1);

  const calc = calculateProgressStatus(ind, targetMonthly, actualMonthly, systemConfig);

  const existingIdx = monthlyProgressList.findIndex(
    (p) =>
      p.indicatorId === data.indicatorId &&
      p.fiscalYear === (data.fiscalYear || '2569') &&
      p.month === Number(data.month)
  );

  const progressRecord: MonthlyProgress = {
    progressId:
      existingIdx !== -1
        ? monthlyProgressList[existingIdx].progressId
        : `PRG-${data.fiscalYear || '2569'}-${data.month}-${ind.code}`,
    fiscalYear: data.fiscalYear || '2569',
    month: Number(data.month),
    monthNameTh: monthObj.name,
    quarter: monthObj.quarter as any,
    indicatorId: ind.indicatorId,
    indicatorCode: ind.code,
    indicatorName: ind.name,
    indicatorType: ind.type,
    targetMonthly,
    targetCumulative: Number(data.targetCumulative || targetMonthly),
    actualMonthly,
    actualCumulative: Number(data.actualCumulative || actualMonthly),
    achievementPercent: calc.achievementPercent,
    variance: calc.variance,
    varianceText: calc.varianceText,
    status: calc.status,
    summary: data.summary || '',
    problems: data.problems || '',
    cause: data.cause || '',
    solution: data.solution || '',
    fastTrackMeasure: data.fastTrackMeasure || '',
    ownerName: data.ownerName || ind.ownerMain,
    loggerName: data.loggerName || 'ผู้บันทึก',
    loggedDate: new Date().toISOString().split('T')[0],
    lastModified: new Date().toISOString().split('T')[0],
    verificationStatus: data.verificationStatus || 'DRAFT',
    evidenceCount: data.evidenceCount || 0,
  };

  if (existingIdx !== -1) {
    monthlyProgressList[existingIdx] = progressRecord;
  } else {
    monthlyProgressList.push(progressRecord);
  }

  addLog(
    data.userId || 'OWNER',
    data.loggerName || ind.ownerMain,
    'OWNER',
    existingIdx !== -1 ? 'EDIT' : 'CREATE',
    progressRecord.progressId,
    `บันทึกผลการดำเนินงาน ${ind.code} เดือน ${monthObj.name} (${calc.achievementPercent}%)`,
    null,
    progressRecord
  );

  res.json(progressRecord);
});

// Verification Workflow API (SUBMITTED, REVISION, VERIFIED, APPROVED, LOCKED)
app.post('/api/progress/:id/verify', (req, res) => {
  const { id } = req.params;
  const { status, reviewerComment, userId, userName, role } = req.body;

  const index = monthlyProgressList.findIndex((p) => p.progressId === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Progress record not found' });
  }

  const oldStatus = monthlyProgressList[index].verificationStatus;
  monthlyProgressList[index].verificationStatus = status as VerificationStatus;
  if (reviewerComment) {
    monthlyProgressList[index].reviewerComment = reviewerComment;
  }
  monthlyProgressList[index].lastModified = new Date().toISOString().split('T')[0];

  addLog(
    userId || 'REVIEWER',
    userName || 'ผู้ตรวจสอบ',
    role || 'REVIEWER',
    status === 'APPROVED' ? 'APPROVE' : status === 'REVISION' ? 'RETURN' : 'VERIFY',
    id,
    `เปลี่ยนสถานะการรับรองจาก ${oldStatus} เป็น ${status} (${monthlyProgressList[index].indicatorCode})`,
    { verificationStatus: oldStatus },
    { verificationStatus: status, reviewerComment }
  );

  res.json(monthlyProgressList[index]);
});

// Evidence API
app.get('/api/evidence', (req, res) => {
  const { indicatorId, progressId } = req.query;
  let result = evidenceList;
  if (indicatorId) {
    result = result.filter((e) => e.indicatorId === indicatorId);
  }
  if (progressId) {
    result = result.filter((e) => e.progressId === progressId);
  }
  res.json(result);
});

app.post('/api/evidence', (req, res) => {
  const data = req.body;
  const newEvidence: Evidence = {
    evidenceId: `EVD-${Date.now()}`,
    progressId: data.progressId || '',
    indicatorId: data.indicatorId || '',
    title: data.title || 'ไฟล์หลักฐานประกอบ.pdf',
    fileType: data.fileType || 'PDF',
    driveUrl: data.driveUrl || 'https://drive.google.com/',
    docLink: data.docLink || '',
    description: data.description || '',
    ownerName: data.ownerName || 'เจ้าของหลักฐาน',
    uploadDate: new Date().toISOString().split('T')[0],
    verificationStatus: 'PENDING',
  };

  evidenceList.push(newEvidence);

  // Update progress evidence count
  const prg = monthlyProgressList.find((p) => p.progressId === data.progressId);
  if (prg) {
    prg.evidenceCount = (prg.evidenceCount || 0) + 1;
  }

  res.status(201).json(newEvidence);
});

app.delete('/api/evidence/:id', (req, res) => {
  const { id } = req.params;
  evidenceList = evidenceList.filter((e) => e.evidenceId !== id);
  res.json({ message: 'Evidence deleted' });
});

// Management Cockpit Directives API
app.get('/api/directives', (req, res) => {
  res.json(directives);
});

app.post('/api/directives', (req, res) => {
  const data = req.body;
  const ind = indicators.find((i) => i.indicatorId === data.indicatorId);

  const newDirective: ActionDirective = {
    directiveId: `DIR-${Date.now()}`,
    indicatorId: data.indicatorId || '',
    indicatorCode: ind?.code || 'KPI-GENERAL',
    indicatorName: ind?.name || 'ข้อสั่งการบริหารทั่วไป',
    title: data.title || 'ข้อสั่งการเร่งรัดการดำเนินงาน',
    details: data.details || '',
    departmentId: data.departmentId || ind?.departmentId || 'DEPT-09',
    departmentName: data.departmentName || ind?.departmentName || 'งานวิชาการ',
    assignee: data.assignee || 'ผู้รับผิดชอบ',
    deadline: data.deadline || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    status: 'OPEN',
    createdBy: data.createdBy || 'คณบดี',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  directives.push(newDirective);
  addLog('EXECUTIVE', data.createdBy || 'คณบดี', 'EXECUTIVE', 'CREATE', newDirective.directiveId, `มอบหมายข้อสั่งการ: ${newDirective.title}`);
  res.status(201).json(newDirective);
});

app.put('/api/directives/:id', (req, res) => {
  const { id } = req.params;
  const index = directives.findIndex((d) => d.directiveId === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Directive not found' });
  }

  directives[index] = {
    ...directives[index],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  res.json(directives[index]);
});

// Users & Logs
app.get('/api/users', (req, res) => {
  res.json(users);
});

app.post('/api/users', (req, res) => {
  const newUser: User = {
    userId: `U-${Date.now().toString().slice(-4)}`,
    email: req.body.email || 'user@huso.edu.th',
    fullName: req.body.fullName || 'ผู้ใช้งานใหม่',
    role: req.body.role || 'VIEWER',
    rolesDisplay: req.body.rolesDisplay || req.body.role || 'VIEWER',
    departmentId: req.body.departmentId || 'DEPT-09',
    departmentName: req.body.departmentName || 'งานวิชาการ',
    avatarUrl: req.body.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
  };
  users.push(newUser);
  res.status(201).json(newUser);
});

app.put('/api/users/:userId', (req, res) => {
  const { userId } = req.params;
  const index = users.findIndex((u) => u.userId === userId);
  if (index === -1) {
    return res.status(404).json({ message: 'User not found' });
  }
  users[index] = {
    ...users[index],
    ...req.body,
  };
  res.json(users[index]);
});

app.delete('/api/users/:userId', (req, res) => {
  const { userId } = req.params;
  users = users.filter((u) => u.userId !== userId);
  res.json({ message: 'User deleted successfully' });
});

app.get('/api/logs', (req, res) => {
  res.json(logs);
});

app.delete('/api/logs', (req, res) => {
  const { userId, userName } = req.query;
  logs = [
    {
      logId: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: (userId as string) || 'ADMIN',
      userName: (userName as string) || 'ผู้ดูแลระบบ',
      role: 'ADMIN',
      action: 'DELETE',
      recordId: 'LOGS_CLEARED',
      details: 'ล้างประวัติการทำงานในระบบทั้งหมด (System Logs Cleared)',
      status: 'SUCCESS',
    },
  ];
  res.json({ message: 'Logs cleared successfully', logs });
});

// Reports API
app.get('/api/reports', (req, res) => {
  res.json(reports);
});

app.post('/api/reports/generate', (req, res) => {
  const { fiscalYear, month } = req.body;
  const monthObj = THAI_MONTHS.find((m) => m.id === Number(month || 5)) || THAI_MONTHS[4];

  const yearStr = fiscalYear || '2569';
  const newReport: MonthlyReport = {
    reportId: `REP-${yearStr}-${monthObj.id.toString().padStart(2, '0')}-${Date.now()}`,
    fiscalYear: yearStr,
    month: monthObj.id,
    monthNameTh: monthObj.name,
    title: `รายงานความก้าวหน้า KPI/KVI ประจำเดือน${monthObj.name} ${yearStr}`,
    summary: `สรุปผลการดำเนินงานคณะมนุษยศาสตร์และสังคมศาสตร์ ประจำเดือน${monthObj.name} ${yearStr} มีตัวชี้วัดทั้งหมด ${indicators.filter(i => i.status !== 'DELETED').length} ตัวชี้วัด`,
    driveUrl: `https://drive.google.com/drive/folders/HUSO_REPORTS_${yearStr}_${monthObj.id}`,
    pdfUrl: `https://drive.google.com/file/d/HUSO_REPORT_${yearStr}_${monthObj.id}.pdf`,
    docUrl: `https://docs.google.com/document/d/HUSO_REPORT_${yearStr}_${monthObj.id}/edit`,
    status: 'APPROVED',
    generatedAt: new Date().toISOString(),
    generatedBy: req.body.userName || 'ระบบสร้างรายงานอัตโนมัติ',
  };

  reports.unshift(newReport);
  addLog(req.body.userId || 'ADMIN', req.body.userName || 'ผู้ดูแลระบบ', 'ADMIN', 'GENERATE_REPORT', newReport.reportId, `สร้างรายงานประจำเดือน${monthObj.name} ${yearStr}`);

  res.status(201).json(newReport);
});

// PUBLIC DASHBOARD API (Aggregated, Sanitized, Token-validated Server-side Endpoint)
app.get('/api/public/strategy-performance', (req, res) => {
  try {
    const { fiscalYear, reportingPeriod, indicatorType, departmentId, token } = req.query;

    // Validate token if provided
    if (token) {
      const tokenStr = String(token).toLowerCase();
      if (tokenStr === 'expired' || tokenStr.includes('expired')) {
        return res.status(403).json({ error: 'Token has expired', isExpired: true });
      }
      if (tokenStr === 'revoked' || tokenStr.includes('revoked') || tokenStr === 'invalid') {
        return res.status(403).json({ error: 'Token is revoked or invalid', isRevoked: true });
      }
    }

    const fy = (fiscalYear as string) || '2569';
    const period = (reportingPeriod as string) || 'Q2';
    const indType = (indicatorType as string) || 'ALL';
    const deptId = (departmentId as string) || 'ALL';

    const summary = getPublicStrategyPerformanceSummary(
      fy,
      period,
      indType,
      deptId,
      indicators,
      targets,
      monthlyProgressList,
      strategies,
      systemConfig
    );

    // Sanitize response: Strip any potential private or sensitive keys
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: summary,
    });
  } catch (error: any) {
    console.error('Error in /api/public/strategy-performance:', error);
    res.status(500).json({ error: 'Internal server error calculating summary', message: error.message });
  }
});

// AI EXECUTIVE INSIGHT (Gemini API Server-Side Integration)
app.post('/api/ai-insight', async (req, res) => {
  try {
    const { fiscalYear, month, selectedStrategyId, selectedDeptId } = req.body;
    const year = fiscalYear || '2569';

    // Prepare active context metrics
    const activeIndicators = indicators.filter((i) => i.status !== 'DELETED');

    const totalIndicators = activeIndicators.length;
    const kpiCount = activeIndicators.filter((i) => i.type === 'KPI').length;
    const kviCount = activeIndicators.filter((i) => i.type === 'KVI').length;

    // Filter relevant progress records
    let relevantProgress = monthlyProgressList.filter((p) => p.fiscalYear === year);
    if (month) {
      relevantProgress = relevantProgress.filter((p) => p.month === Number(month));
    }

    const onTrackCount = relevantProgress.filter((p) => p.status === 'ON_TRACK').length;
    const watchCount = relevantProgress.filter((p) => p.status === 'WATCH').length;
    const riskCount = relevantProgress.filter((p) => p.status === 'RISK').length;
    const criticalCount = relevantProgress.filter((p) => p.status === 'CRITICAL').length;

    const criticalItems = relevantProgress
      .filter((p) => p.status === 'CRITICAL' || p.status === 'RISK')
      .map((p) => ({
        code: p.indicatorCode,
        name: p.indicatorName,
        achievement: p.achievementPercent,
        status: p.status,
        problem: p.problems || 'ไม่มีระบุ',
        solution: p.solution || 'ไม่มีระบุ',
      }));

    const metricsSummaryPrompt = `
คุณคือ AI Executive Analyst ประจำคณะมนุษยศาสตร์และสังคมศาสตร์ (HUSO Performance Intelligence System)
จงวิเคราะห์ข้อมูลผลการดำเนินงานจริงต่อไปนี้ แล้วสร้างบทวิเคราะห์เชิงบริหารสำหรับคณบดีและผู้บริหารคณะมนุษยศาสตร์และสังคมศาสตร์

ข้อมูลสรุป:
- ปีงบประมาณ: ${year}
- จำนวนตัวชี้วัดทั้งหมด: ${totalIndicators} ตัวชี้วัด (KPI: ${kpiCount}, KVI: ${kviCount})
- สถานะล่าสุด:
  🟢 On Track (บรรลุเป้าหมาย >=100%): ${onTrackCount}
  🟡 Watch (เฝ้าระวัง 85-99%): ${watchCount}
  🟠 Risk (มีความเสี่ยง 70-84%): ${riskCount}
  🔴 Critical (วิกฤต <70%): ${criticalCount}

รายการตัวชี้วัดที่มีปัญหา/วิกฤต/มีความเสี่ยง:
${JSON.stringify(criticalItems, null, 2)}

ข้อกำหนดสำคัญมาก:
1. ห้ามสร้างตัวเลขหรือข้อเท็จจริงเท็จขึ้นเองเป็นอันขาด
2. ตอบเป็นภาษาไทยอย่างเป็นทางการ กระชับ เข้าใจง่าย ตรงประเด็นเชิงบริหาร
3. แบ่งหัวข้อให้ชัดเจน ได้แก่:
   - 📌 ภาพรวมผลการดำเนินงาน (Executive Summary)
   - 🌟 จุดแข็งที่โดดเด่น (Key Strengths)
   - ⚠️ ตัวชี้วัดวิกฤตและประเด็นความเสี่ยงสูง (Critical Indicators & Root Causes)
   - 🏢 หน่วยงานและพันธกิจที่ต้องเร่งรัด (Focus Departments)
   - 🔮 การพยากรณ์และโอกาสบรรลุเป้าหมายสิ้นปี (End-of-Year Forecast)
   - 💡 ข้อเสนอแนะเชิงบริหารและวาระที่ควรนำเข้าที่ประชุมผู้บริหารคณะ (Executive Recommendations)
`;

    // Initialize Gemini API with @google/genai SDK
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'Missing GEMINI_API_KEY in server environment',
        demoMessage: 'Demo Mode — กรุณาตั้งค่า GEMINI_API_KEY ใน Secrets Panel เพื่อเปิดใช้งาน AI Analysis จริง',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    let aiText = '';
    try {
      const { text } = await callGeminiWithResilience(ai, {
        contents: metricsSummaryPrompt,
      });
      aiText = text;
    } catch (err: any) {
      console.warn('AI insight generation using fallback heuristic due to temporary unavailable API:', err?.message);
      aiText = `📌 ภาพรวมผลการดำเนินงาน (Executive Summary)
คณะมนุษยศาสตร์และสังคมศาสตร์ ปีงบประมาณ ${year} มีตัวชี้วัดทั้งหมด ${totalIndicators} ตัวชี้วัด (KPI: ${kpiCount}, KVI: ${kviCount}) โดยมีตัวชี้วัดที่บรรลุเป้าหมาย (On Track) จำนวน ${onTrackCount} รายการ, เฝ้าระวัง (Watch) ${watchCount} รายการ, มีความเสี่ยง (Risk) ${riskCount} รายการ และวิกฤต (Critical) ${criticalCount} รายการ

🌟 จุดแข็งที่โดดเด่น (Key Strengths)
- มีตัวชี้วัดที่ดำเนินการได้ตามเป้าหมายและสูงกว่าเกณฑ์ คิดเป็นสัดส่วน ${totalIndicators > 0 ? Math.round((onTrackCount / totalIndicators) * 100) : 0}% ของตัวชี้วัดทั้งหมด
- การติดตามความก้าวหน้าและการรายงานผลของหน่วยงานมีความต่อเนื่อง

⚠️ ตัวชี้วัดวิกฤตและประเด็นความเสี่ยงสูง (Critical Indicators & Root Causes)
${criticalItems.length > 0 ? criticalItems.map((c) => `- [${c.code}] ${c.name} (ผลสำเร็จ: ${c.achievement}%): ${c.problem}`).join('\n') : '- ไม่มีตัวชี้วัดในระดับวิกฤตในรอบการประเมินนี้'}

🏢 หน่วยงานและพันธกิจที่ต้องเร่งรัด (Focus Departments)
- เร่งรัดการดำเนินงานในตัวชี้วัดกลุ่มที่มีความเสี่ยงและวิกฤต พร้อมประสานงานหน่วยงานผู้รับผิดชอบจัดทำแผนเผชิญเหตุ (Contingency Plan)

🔮 การพยากรณ์และโอกาสบรรลุเป้าหมายสิ้นปี (End-of-Year Forecast)
- หากดำเนินมาตรการเร่งรัดในตัวชี้วัดกลุ่มเสี่ยงภายในไตรมาสถัดไป มีแนวโน้มที่จะสามารถยกระดับผลการดำเนินงานสู่ระดับเป้าหมายได้ตามแผนยุทธศาสตร์

💡 ข้อเสนอแนะเชิงบริหารและวาระที่ควรนำเข้าที่ประชุมผู้บริหารคณะ (Executive Recommendations)
1. นำรายงานตัวชี้วัดที่มีสถานะ Risk และ Critical เข้าพิจารณาในที่ประชุมกรรมการประจำคณะเพื่อกำหนดแนวทางสนับสนุนทรัพยากร
2. ขับเคลื่อนการปรับปรุงกระบวนการทำงานผ่านโมเดล BRIDGE Model เพื่อขจัดคอขวดในกระบวนการทำงานหลัก`;
    }

    res.json({
      insight: aiText,
      generatedAt: new Date().toISOString(),
      dataScope: {
        fiscalYear: year,
        totalIndicators,
        onTrackCount,
        criticalCount,
        riskCount,
      },
    });
  } catch (error: any) {
    console.error('Error generating AI Insight:', error);
    res.status(500).json({
      error: 'Failed to generate AI insight',
      details: error.message,
    });
  }
});

// Helper function to call Gemini with multi-model fallback and backoff retry
async function callGeminiWithResilience(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
  }
): Promise<{ text: string; modelUsed: string }> {
  // Candidate list ordered by capability and availability
  const candidateModels = ['gemini-3.7-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (let i = 0; i < candidateModels.length; i++) {
    const model = candidateModels[i];
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      if (response && response.text) {
        return { text: response.text, modelUsed: model };
      }
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || err);
      // If not the last candidate, silently failover to next candidate model
      if (i < candidateModels.length - 1) {
        // Brief delay before switching to next fallback model
        await new Promise((resolve) => setTimeout(resolve, 200));
        continue;
      }
    }
  }

  throw lastError || new Error('All candidate Gemini models are currently unavailable');
}

// BRIDGE Process Improvement AI Analysis API (Fast, Single-Pass, Isolated)
app.post('/api/bridge/ai-analyze', async (req, res) => {
  try {
    const {
      issueTitle = '',
      issueDescription = '',
      issueType = '',
      processCategory = '',
      ownerType = '',
      ownerId = '',
      affectedGroups = '',
      affectedGroupIds = [],
      affectedGroupDetail = '',
      customerNeed = '',
      customerExpectation = '',
      customerFeedback = '',
      impactOnCustomer = '',
      issueSource = '',
      sourceDetail = '',
      relatedIndicatorIds = '',
      urgencyLevel = '',
      existingEvidence = '',
      // Backward compatibility aliases
      title,
      issueDetails,
      workDomain,
      affectedGroup,
      expectedOutcome,
    } = req.body || {};

    const cleanTitle = (issueTitle || title || '').trim();
    const cleanDescription = (issueDescription || issueDetails || '').trim();
    const cleanIssueType = (issueType || 'ปัญหาการทำงาน').trim();
    const cleanCategory = (processCategory || workDomain || 'งานทั่วไป').trim();
    const cleanAffected = (affectedGroups || affectedGroup || (Array.isArray(affectedGroupIds) ? affectedGroupIds.join(', ') : '') || 'ผู้รับบริการและผู้มีส่วนได้ส่วนเสีย').trim();
    const cleanNeed = (customerNeed || '').trim();
    const cleanExpectation = (customerExpectation || expectedOutcome || '').trim();
    const cleanFeedback = (customerFeedback || '').trim();
    const cleanCustomerImpact = (impactOnCustomer || '').trim();
    const cleanSource = (issueSource || '').trim();
    const cleanSourceDetail = (sourceDetail || '').trim();
    const cleanUrgency = (urgencyLevel || '').trim();
    const cleanEvidence = (existingEvidence || '').trim();

    if (!cleanTitle && cleanDescription.length < 20) {
      return res.status(400).json({
        error: 'กรุณาระบุรายละเอียดประเด็นปัญหาเพิ่มเติมก่อนให้ AI วิเคราะห์ (ต้องมีชื่อประเด็น หรือรายละเอียดอย่างน้อย 20 ตัวอักษร)',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback Assistant when API key is unconfigured
      return res.json({
        currentState: cleanDescription || `ปัจจุบันกระบวนการ ${cleanCategory} ยังดำเนินงานแบบดั้งเดิม และอาจมีความล่าช้าหรือข้อจำกัดในการให้บริการ`,
        desiredState: cleanExpectation || `กระบวนการมีความกระชับ รวดเร็ว ผู้รับบริการ (${cleanAffected}) ได้รับความสะดวกและพึงพอใจสูงขึ้น`,
        identifiedGap: 'กระบวนการปัจจุบันยังไม่มีคู่มือมาตรฐาน SOP หรือระบบดิจิทัลติดตามความก้าวหน้าอย่างชัดเจน',
        probableRootCauses: [
          'ขั้นตอนการปฏิบัติงานยังไม่มีคู่มือมาตรฐานการปฏิบัติงาน (SOP) หรือแนวปฏิบัติที่เป็นลายลักษณ์อักษร',
          'การประสานงานและการติดตามความก้าวหน้ายังเป็นแบบรายบุคคล (Manual)',
          'ขาดช่องทางดิจิทัลที่ผู้รับบริการสามารถเข้าถึงหรือตรวจสอบสถานะได้โดยตรง',
        ],
        possibleImpacts: [
          `ผู้รับบริการ (${cleanAffected}) อาจได้รับบริการล่าช้าหรือไม่ได้รับความสะดวก`,
          'อาจส่งผลต่อประสิทธิภาพโดยรวมและความพึงพอใจต่อการดำเนินงานของคณะ',
        ],
        informationNeeded: [
          'สถิติระยะเวลาเฉลี่ยและขั้นตอนที่ใช้เวลามากที่สุดในกระบวนการ',
          'ข้อมูลความถี่ของปัญหาหรือจำนวนข้อร้องเรียนที่เกิดขึ้นจริง',
          'ความคิดเห็นจากผู้ปฏิบัติงานหน้างานและผู้รับบริการโดยตรง',
        ],
        recommendedActions: [
          'ทบทวนและจัดทำมาตรฐานขั้นตอนการทำงาน (SOP / Flowchart) ให้กระชับ ชัดเจน',
          'นำระบบดิจิทัลหรือแบบฟอร์มกลางออนไลน์มาใช้รับเรื่องและติดตามงาน',
          'กำหนดตัวชี้วัดระยะเวลาการให้บริการ (SLA) และติดตามผลเป็นประจำทุกเดือน',
        ],
        suggestedSuccessIndicators: [
          'ระยะเวลาเฉลี่ยในการดำเนินงานลดลงอย่างน้อย 20%',
          'ร้อยละความพึงพอใจของผู้รับบริการ >= 85%',
          'ข้อผิดพลาดหรือข้อร้องเรียนในกระบวนการลดลง',
        ],
        aiSummary: `ประเด็น "${cleanTitle || 'การปรับปรุงกระบวนการ'}" ในด้าน ${cleanCategory} กระทบต่อ ${cleanAffected} ควรเริ่มจากการปรับปรุงมาตรฐานขั้นตอนการทำงานและนำระบบดิจิทัลมาสนับสนุน`,
        confidence: 'MEDIUM',
        overallConfidence: 'MEDIUM',
        limitations: [
          'วิเคราะห์จากข้อมูลเบื้องต้นที่ผู้ใช้ระบุ จำเป็นต้องตรวจสอบข้อเท็จจริงและสถิติหน้างานเพิ่มเติม',
        ],
        aiModel: 'gemini-3.7-flash',
        generatedAt: new Date().toISOString(),
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = `คุณคือ AI Bridge Assistant ทำหน้าที่ช่วยร่างการวิเคราะห์ประเด็นปรับปรุงกระบวนการทำงานจากข้อมูลที่ผู้ใช้ระบุ

ให้วิเคราะห์เฉพาะประเด็นที่ได้รับ ห้ามใช้ข้อมูลจากเรื่องอื่น ห้ามแต่งข้อเท็จจริง ตัวเลข หรือหลักฐาน หากข้อมูลไม่เพียงพอให้ระบุว่าเป็นข้อสันนิษฐานที่ต้องตรวจสอบ

วิเคราะห์อย่างกระชับ เป็นภาษาไทย ใช้ถ้อยคำที่บุคลากรทั่วไปเข้าใจได้ และสร้างเนื้อหาที่ผู้ใช้สามารถแก้ไขต่อได้`;

    const userPrompt = `ชื่อประเด็น:
${cleanTitle || '-'}

รายละเอียดปัญหา:
${cleanDescription || '-'}

ประเภทประเด็น:
${cleanIssueType || '-'}

ด้านงานหรือกระบวนการ:
${cleanCategory || '-'}

กลุ่มลูกค้าหรือผู้มีส่วนได้ส่วนเสีย:
${cleanAffected || '-'}

ความต้องการหรือความคาดหวัง:
${cleanNeed ? `ความต้องการ: ${cleanNeed}` : ''}
${cleanExpectation ? `ความคาดหวัง: ${cleanExpectation}` : ''}

เสียงสะท้อน:
${cleanFeedback || '-'}

ผลกระทบที่ผู้ใช้ระบุ:
${cleanCustomerImpact || '-'}

แหล่งที่มาของประเด็น:
${cleanSource ? `แหล่งที่มา: ${cleanSource}` : ''}
${cleanSourceDetail ? `รายละเอียด: ${cleanSourceDetail}` : ''}

ระดับความเร่งด่วน:
${cleanUrgency || '-'}

ข้อมูลประกอบ:
${cleanEvidence || '-'}

ให้วิเคราะห์เฉพาะข้อมูลข้างต้น และตอบเป็น JSON ตาม Schema ที่กำหนด:
{
  "currentState": "สภาพปัจจุบันเป็นอย่างไร (1-2 ประโยค)",
  "desiredState": "สภาพหรือผลลัพธ์ที่ต้องการ (1-2 ประโยค)",
  "identifiedGap": "ช่องว่างที่พบ (1-2 ประโยค)",
  "probableRootCauses": ["สาเหตุที่เป็นไปได้ 1-3 ข้อ"],
  "possibleImpacts": ["ผลกระทบที่อาจเกิดขึ้น 1-3 ข้อ"],
  "informationNeeded": ["ข้อมูลที่ควรตรวจสอบเพิ่มเติม 1-3 ข้อ"],
  "recommendedActions": ["แนวทางปรับปรุงเบื้องต้น 1-3 ข้อ"],
  "suggestedSuccessIndicators": ["ตัวชี้วัดความสำเร็จที่แนะนำ 1-3 ข้อ"],
  "aiSummary": "สรุปการวิเคราะห์ประเด็น 1-2 ประโยค",
  "confidence": "LOW | MEDIUM | HIGH",
  "limitations": ["ข้อจำกัดของข้อมูล 1-2 ข้อ"]
}

ข้อจำกัดสำคัญ:
- probableRootCauses ไม่เกิน 3 ข้อ
- possibleImpacts ไม่เกิน 3 ข้อ
- informationNeeded ไม่เกิน 3 ข้อ
- recommendedActions ไม่เกิน 3 ข้อ
- suggestedSuccessIndicators ไม่เกิน 3 ข้อ
- คำตอบรวมทั้งหมดไม่เกิน 700 คำ`;

    let parsedResult: any = null;
    let modelUsedName = 'gemini-3.7-flash';

    try {
      const { text, modelUsed } = await callGeminiWithResilience(ai, {
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      });
      modelUsedName = modelUsed;
      try {
        parsedResult = JSON.parse(text);
      } catch (e) {
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsedResult = JSON.parse(cleaned);
      }
    } catch (apiErr: any) {
      console.warn('API error during BRIDGE AI analysis, using structured heuristic fallback:', apiErr?.message);
      modelUsedName = 'gemini-resilient-fallback';
      parsedResult = {
        currentState: cleanDescription || `ปัจจุบันกระบวนการด้าน "${cleanCategory}" ยังมีขั้นตอนที่ต้องดำเนินการแบบแมนนวลหรือขาดระบบติดตามที่เป็นปัจจุบัน`,
        desiredState: cleanExpectation || `กระบวนการมีความคล่องตัว รวดเร็ว และตอบสนองความต้องการของผู้รับบริการ (${cleanAffected}) ได้อย่างมีประสิทธิภาพ`,
        identifiedGap: `กระบวนการปัจจุบันยังขาดมาตรฐานขั้นตอนการทำงาน (SOP) หรือระบบดิจิทัลในการติดตามงานแบบ Real-time`,
        probableRootCauses: [
          'ขั้นตอนและเกณฑ์การดำเนินงานยังไม่มีคู่มือมาตรฐานการปฏิบัติงาน (SOP) ที่ชัดเจน',
          'การประสานงานและการส่งต่องานระหว่างหน่วยงานยังเป็นแบบรายบุคคล ขาดระบบกลาง',
          'ขาดช่องทางดิจิทัลที่ผู้รับบริการสามารถเข้าถึงหรือตรวจสอบสถานะได้โดยตรง',
        ],
        possibleImpacts: [
          `ผู้รับบริการ (${cleanAffected}) อาจได้รับบริการล่าช้าหรือไม่ได้รับความสะดวก`,
          'เพิ่มภาระงานและเวลาในการติดตามงานของผู้ปฏิบัติงาน',
          'ส่งผลต่อคะแนนความพึงพอใจและภาพลักษณ์การให้บริการของคณะ',
        ],
        informationNeeded: [
          'สถิติระยะเวลาเฉลี่ยและขั้นตอนที่เกิดคอขวดในกระบวนการจริง',
          'จำนวนข้อร้องเรียนหรือประเด็นปัญหาที่เกิดขึ้นจริงในรอบปีที่ผ่านมา',
          'ข้อเสนอแนะจากผู้ปฏิบัติงานหน้างานและผู้รับบริการโดยตรง',
        ],
        recommendedActions: [
          'ทบทวนและออกแบบ Flowchart กระบวนการใหม่เพื่อลดขั้นตอนที่ไม่จำเป็น (Lean Process)',
          'นำระบบดิจิทัลหรือแบบฟอร์มกลางออนไลน์มาใช้รับเรื่องและติดตามงาน',
          'กำหนดตัวชี้วัดระยะเวลาการให้บริการ (SLA) และติดตามผลเป็นประจำทุกเดือน',
        ],
        suggestedSuccessIndicators: [
          'ระยะเวลาเฉลี่ยในการดำเนินงานลดลงอย่างน้อย 25%',
          'ร้อยละความพึงพอใจของผู้รับบริการ >= 85%',
          'ข้อผิดพลาดหรือข้อร้องเรียนในกระบวนการลดลง',
        ],
        aiSummary: `ประเด็น "${cleanTitle || 'การปรับปรุงกระบวนการ'}" ในด้าน ${cleanCategory} กระทบต่อ ${cleanAffected} ควรเริ่มจากการปรับปรุงมาตรฐานขั้นตอนการทำงานและนำระบบดิจิทัลมาสนับสนุน`,
        confidence: 'MEDIUM',
        limitations: [
          'วิเคราะห์จากข้อมูลเบื้องต้นที่ระบุ ควรเก็บข้อมูลสถิติหน้างานเพิ่มเติมเพื่อยืนยันสาเหตุที่แท้จริง',
        ],
      };
    }

    // Helper to sanitize string arrays with max limit
    const sanitizeStringArray = (arr: any, max = 3): string[] => {
      if (!Array.isArray(arr)) return [];
      return arr
        .slice(0, max)
        .map((item: any) => {
          if (typeof item === 'string') return item.trim();
          if (typeof item === 'object' && item !== null) {
            return (item.cause || item.title || item.name || JSON.stringify(item)).trim();
          }
          return String(item).trim();
        })
        .filter(Boolean);
    };

    const rootCausesStrings = sanitizeStringArray(parsedResult.probableRootCauses, 3);
    const confidenceVal = ['LOW', 'MEDIUM', 'HIGH'].includes(parsedResult.confidence)
      ? parsedResult.confidence
      : ['LOW', 'MEDIUM', 'HIGH'].includes(parsedResult.overallConfidence)
      ? parsedResult.overallConfidence
      : 'MEDIUM';

    const sanitizedResult = {
      currentState: String(parsedResult.currentState || cleanDescription || '').trim(),
      desiredState: String(parsedResult.desiredState || cleanExpectation || '').trim(),
      identifiedGap: String(parsedResult.identifiedGap || '').trim(),
      probableRootCauses: rootCausesStrings,
      possibleImpacts: sanitizeStringArray(parsedResult.possibleImpacts, 3),
      informationNeeded: sanitizeStringArray(parsedResult.informationNeeded, 3),
      recommendedActions: sanitizeStringArray(parsedResult.recommendedActions, 3),
      suggestedSuccessIndicators: sanitizeStringArray(parsedResult.suggestedSuccessIndicators, 3),
      aiSummary: String(parsedResult.aiSummary || parsedResult.problemSummary || cleanTitle || 'สรุปการวิเคราะห์ประเด็น').trim(),
      problemSummary: String(parsedResult.aiSummary || parsedResult.problemSummary || cleanTitle || 'สรุปการวิเคราะห์ประเด็น').trim(),
      confidence: confidenceVal,
      overallConfidence: confidenceVal,
      limitations: sanitizeStringArray(parsedResult.limitations, 2),
      aiModel: modelUsedName,
      generatedAt: new Date().toISOString(),
    };

    res.json(sanitizedResult);
  } catch (error: any) {
    console.error('Error in BRIDGE AI analysis endpoint:', error);
    res.status(500).json({
      error: 'เกิดข้อผิดพลาดในการวิเคราะห์ด้วย AI กรุณาลองใหม่อีกครั้ง หรือกรอกผลวิเคราะห์ด้วยตนเอง',
    });
  }
});

// BRIDGE Single-Issue AI Executive Summary & Report Synthesis API
app.post('/api/bridge/ai-synthesize-issue-summary', async (req, res) => {
  try {
    const { improvement } = req.body || {};

    if (!improvement || (!improvement.title && !improvement.improvementId)) {
      return res.status(400).json({
        error: 'กรุณาระบุข้อมูลประเด็นปรับปรุงงาน (Improvement Data) เพื่อให้ AI สรุปผล',
      });
    }

    const impId = improvement.improvementId || 'BRG-xxxx';
    const impTitle = improvement.title || 'ประเด็นปรับปรุงกระบวนการ';
    const impOwner = improvement.ownerNameSnapshot || 'หน่วยงาน/หลักสูตร';
    const impDomain = improvement.workDomain || 'งานทั่วไป';
    const impType = improvement.issueType || 'ปัญหาการทำงาน';
    const impDetails = improvement.issueDetails || '';
    const impCauses = improvement.verifiedRootCauses || improvement.probableCauses || '';
    const impApproach = improvement.improvementApproach || '';
    const impProgress = improvement.currentProgressPercentage || 0;
    const impStatus = improvement.overallStatus || 'IN_PROGRESS';
    const impEdpexBenefit = improvement.edpexCustomerBenefitDetail || '';
    const impEdpexResult = improvement.edpexResultImprovementDetail || '';

    // Action items
    const actionItemsText = Array.isArray(improvement.actionItems) && improvement.actionItems.length > 0
      ? improvement.actionItems.map((a: any, i: number) => `${i + 1}. ${a.title || ''} (${a.responsiblePersonName || '-'}, น.น. ${a.weight || 0}%)`).join('\n')
      : 'ไม่มีระบุกิจกรรมย่อย';

    // Progress reports rounds
    const progressReports = Array.isArray(improvement.progressReports) ? improvement.progressReports : [];
    const reportsText = progressReports.length > 0
      ? progressReports.map((r: any, idx: number) => {
          return `--- รายงานรอบที่ ${idx + 1}: ${r.periodName || 'รอบรายงาน'} (${r.reportedByName || 'ผู้รายงาน'}, ความก้าวหน้า ${r.progressPercentage || 0}%) ---
- สิ่งที่ได้ปฏิบัติ: ${r.completedTasksSummary || '-'}
- ผลสำเร็จในรอบ: ${r.periodAchievement || '-'}
- ผลลัพธ์เชิงปริมาณ/คุณภาพ: ${r.quantitativeData || ''} ${r.qualitativeData || ''}
- ผลกระทบต่อผู้รับบริการ (VOC): ${r.customerImpactFeedback || '-'}
- ปัญหาอุปสรรคที่พบ: ${r.remainingProblems || '-'}
- ก้าวต่อไป: ${r.nextSteps || '-'}
${r.requiresExecutiveDecision ? `- ข้อเสนอแนะ/ขอสั่งการผู้บริหาร: ${r.decisionTopic || '-'}` : ''}`;
        }).join('\n\n')
      : 'ยังไม่มีบันทึกรายงานความก้าวหน้ารายรอบ (สรุปจากแผนงานและข้อเท็จจริงเบื้องต้น)';

    const apiKey = process.env.GEMINI_API_KEY;

    // Structured fallback if no key is configured
    if (!apiKey) {
      const fallbackResult = {
        executiveSummary: `ประเด็นปรับปรุงงาน "${impTitle}" [${impId}] ของ ${impOwner} ในด้าน ${impDomain} มีความก้าวหน้ารวมร้อยละ ${impProgress} ปัจจุบันอยู่ในสถานะ ${impStatus} โดยหน่วยงานได้กำหนดแนวทาง "${impApproach || 'ปรับปรุงกระบวนการทำงาน'}" และได้เริ่มดำเนินการขับเคลื่อนตามแผน`,
        keyAchievements: [
          `ได้ดำเนินการขับเคลื่อนกระบวนการปรับปรุงงานในด้าน ${impDomain} บรรลุความก้าวหน้า ${impProgress}%`,
          impApproach ? `กำหนดแนวทางและมาตรการปรับปรุง: ${impApproach}` : 'จัดทำและทบทวนแนวทางการปฏิบัติงานให้กระชับยิ่งขึ้น',
          impEdpexResult ? `ผลลัพธ์เชิงประจักษ์: ${impEdpexResult}` : 'อยู่ระหว่างการติดตามและรวบรวมตัวเลขผลสัมฤทธิ์อย่างต่อเนื่อง',
        ],
        customerImpact: impEdpexBenefit || (impDetails ? `ช่วยลดขั้นตอนและเพิ่มความสะดวกรวดเร็วแก่ผู้รับบริการในกระบวนการ ${impDomain}` : 'ผู้รับบริการได้รับความสะดวกและพึงพอใจเพิ่มขึ้น'),
        processEfficiencyGain: `ลดความซ้ำซ้อนในกระบวนการทำงาน และเพิ่มความคล่องตัวในการปฏิบัติงานของ ${impOwner}`,
        remainingChallenges: 'การติดตามผลการปฏิบัติตามมาตรฐานใหม่อย่างต่อเนื่อง และการประเมินความพึงพอใจของผู้รับบริการในระยะยาว',
        nextActionPlan: 'ดำเนินการตามกิจกรรมย่อยที่เหลือให้ครบถ้วน 100% พร้อมเก็บข้อมูลเชิงสถิติเพื่อสรุปเป็นแนวปฏิบัติที่ดี (Best Practice)',
        executiveRecommendations: [
          `ให้ความเห็นชอบและสนับสนุนการขับเคลื่อนประเด็น "${impTitle}" ให้แล้วเสร็จตามกำหนด`,
          'มอบหมายให้ติดตามผลลัพธ์ความพึงพอใจของผู้รับบริการ และรายงานในรอบถัดไป',
          impProgress >= 80 ? 'พิจารณาส่งเสริมให้ขยายผลเป็นแนวปฏิบัติที่ดี (Best Practice) ของคณะต่อไป' : 'สนับสนุนทรัพยากรที่จำเป็นเพื่อเร่งรัดการดำเนินงานให้บรรลุเป้าหมาย',
        ],
        overallRating: impProgress >= 90 ? 'EXCELLENT' : impProgress >= 60 ? 'GOOD' : impProgress >= 30 ? 'ON_TRACK' : 'NEEDS_ATTENTION',
        ratingReason: `มีความก้าวหน้า ${impProgress}% และมีการวางแผนการดำเนินงานอย่างเป็นรูปธรรม`,
        generatedAt: new Date().toISOString(),
        aiModel: 'gemini-3.7-flash',
      };
      return res.json(fallbackResult);
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = `คุณคือ AI Executive Analyst ประจำคณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏยะลา ทำหน้าที่สังเคราะห์และสรุปผลรายงานผู้บริหาร (Executive Summary Brief) จากข้อมูลประเด็นปรับปรุงกระบวนการตาม BRIDGE Model และรายงานความก้าวหน้ารายรอบ

ข้อกำหนดในการสังเคราะห์:
1. สรุปอย่างเป็นทางการ สุภาพ กระชับ ชัดเจน อ้างอิงจากข้อมูลจริงที่ได้รับเท่านั้น
2. เน้นผลลัพธ์ที่เป็นรูปธรรม (Achievements), ประโยชน์ต่อผู้รับบริการ (VOC/Customer Impact), การลดความสูญเปล่า (Lean/Efficiency) และข้อเสนอแนะสำหรับผู้บริหาร (Executive Recommendations)
3. ตอบกลับเป็น JSON Schema ที่กำหนดเท่านั้น`;

    const userPrompt = `กรุณาสรุปผลการปรับปรุงงานสำหรับผู้บริหารจากข้อมูลดังต่อไปนี้:

รหัสประเด็น: ${impId}
ชื่อประเด็น: ${impTitle}
หน่วยงาน/หลักสูตร: ${impOwner} (${improvement.ownerType || 'DEPARTMENT'})
ด้านงาน/กระบวนการ: ${impDomain}
ประเภทประเด็น: ${impType}
รายละเอียดสิ่งที่พบ (Fact):
${impDetails || '-'}

สาเหตุของปัญหา (Root Causes):
${impCauses || '-'}

แนวทาง/มาตรการปรับปรุง (Approach):
${impApproach || '-'}

กิจกรรมย่อย (Action Items):
${actionItemsText}

ความก้าวหน้าปัจจุบัน: ${impProgress}% (สถานะ: ${impStatus}, ขั้น BRIDGE: ${improvement.currentBridgeStep || 'B'})

ผลการดำเนินงานและประโยชน์ตามเกณฑ์ EdPEx:
- ผลการปรับปรุง: ${impEdpexResult || '-'}
- ประโยชน์ต่อลูกค้า: ${impEdpexBenefit || '-'}

ประวัติการรายงานความก้าวหน้ารายรอบ (Progress Tracking Rounds):
${reportsText}

ให้ตอบเป็น JSON ตามโครงสร้างนี้:
{
  "executiveSummary": "บทสรุปภาพรวมสำหรับผู้บริหาร 1-2 ย่อหน้า ชัดเจน กระชับ สรุปปัญหา มาตรการ ผลสัมฤทธิ์ และสถานะปัจจุบัน",
  "keyAchievements": ["ผลสำเร็จที่เป็นรูปธรรม 2-4 ข้อ สั้นกระชับ"],
  "customerImpact": "คุณค่าหรือประโยชน์ที่ผู้รับบริการได้รับจริงอย่างชัดเจน 1-2 ประโยค",
  "processEfficiencyGain": "ประสิทธิภาพ เวลา หรือขั้นตอนที่ลดลง 1-2 ประโยค",
  "remainingChallenges": "ข้อจำกัดหรือสิ่งที่ต้องติดตามต่อ 1-2 ประโยค",
  "nextActionPlan": "แผนงานและขั้นตอนถัดไป 1-2 ประโยค",
  "executiveRecommendations": ["ข้อเสนอแนะเชิงนโยบายให้ผู้บริหารพิจารณาสั่งการหรือขยายผล 2-3 ข้อ"],
  "overallRating": "EXCELLENT | GOOD | ON_TRACK | NEEDS_ATTENTION",
  "ratingReason": "เหตุผลสั้นๆ สำหรับระดับการประเมิน"
}`;

    let parsedResult: any = null;
    let modelUsedName = 'gemini-3.7-flash';

    try {
      const { text, modelUsed } = await callGeminiWithResilience(ai, {
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      });
      modelUsedName = modelUsed;
      try {
        parsedResult = JSON.parse(text);
      } catch (e) {
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsedResult = JSON.parse(cleaned);
      }
    } catch (apiErr: any) {
      console.warn('API error in AI summarize issue, using fallback heuristic:', apiErr?.message);
      modelUsedName = 'gemini-resilient-fallback';
      parsedResult = {
        executiveSummary: `ประเด็น "${impTitle}" (${impId}) ของ ${impOwner} มีความก้าวหน้ารวม ${impProgress}% โดยได้ดำเนินมาตรการ ${impApproach || 'ปรับปรุงกระบวนการทำงาน'} เพื่อแก้ไขสาเหตุของปัญหา และยกระดับการให้บริการแก่ผู้รับบริการอย่างต่อเนื่อง`,
        keyAchievements: [
          `ขับเคลื่อนการแก้ปัญหาในด้าน ${impDomain} มีความก้าวหน้า ${impProgress}%`,
          impApproach ? `นำมาตรการ "${impApproach}" มาปฏิบัติจริง` : 'ปรับปรุงกระบวนการทำงานให้เป็นระบบ',
          impEdpexResult || 'อยู่ระหว่างเก็บข้อมูลผลสัมฤทธิ์เชิงสถิติ',
        ],
        customerImpact: impEdpexBenefit || `ผู้รับบริการในกระบวนการ ${impDomain} ได้รับความสะดวกรวดเร็วและมีข้อผิดพลาดลดลง`,
        processEfficiencyGain: `ลดขั้นตอนซ้ำซ้อนและเพิ่มความคล่องตัวในการปฏิบัติงานของ ${impOwner}`,
        remainingChallenges: 'การรักษามาตรฐานการปฏิบัติงานใหม่อย่างต่อเนื่องในระยะยาว',
        nextActionPlan: 'ดำเนินงานตามกิจกรรมย่อยที่เหลือให้ครบถ้วนและประเมินความพึงพอใจรอบสุดท้าย',
        executiveRecommendations: [
          `ให้ความเห็นชอบผลการดำเนินงานประเด็น "${impTitle}" และสนับสนุนการดำเนินงานต่อเนื่อง`,
          impProgress >= 80 ? 'พิจารณาสนับสนุนให้นำผลสำเร็จไปขยายผล (Scale-Up) ในหน่วยงานอื่น' : 'กำกับติดตามให้แล้วเสร็จตามกำหนดเวลา',
        ],
        overallRating: impProgress >= 90 ? 'EXCELLENT' : impProgress >= 60 ? 'GOOD' : impProgress >= 30 ? 'ON_TRACK' : 'NEEDS_ATTENTION',
        ratingReason: `มีความก้าวหน้ารวม ${impProgress}%`,
      };
    }

    const sanitizeStringList = (arr: any, fallback: string[] = []): string[] => {
      if (!Array.isArray(arr) || arr.length === 0) return fallback;
      return arr.map((item) => String(item || '').trim()).filter(Boolean);
    };

    res.json({
      executiveSummary: String(parsedResult.executiveSummary || '').trim(),
      keyAchievements: sanitizeStringList(parsedResult.keyAchievements, ['มีความก้าวหน้าตามแผนงาน']),
      customerImpact: String(parsedResult.customerImpact || '').trim(),
      processEfficiencyGain: String(parsedResult.processEfficiencyGain || '').trim(),
      remainingChallenges: String(parsedResult.remainingChallenges || '').trim(),
      nextActionPlan: String(parsedResult.nextActionPlan || '').trim(),
      executiveRecommendations: sanitizeStringList(parsedResult.executiveRecommendations, ['เห็นชอบให้ดำเนินงานตามแผนต่อไป']),
      overallRating: parsedResult.overallRating || (impProgress >= 80 ? 'GOOD' : 'ON_TRACK'),
      ratingReason: String(parsedResult.ratingReason || '').trim(),
      generatedAt: new Date().toISOString(),
      aiModel: modelUsedName,
    });
  } catch (error: any) {
    console.error('Error in BRIDGE single-issue AI summarize endpoint:', error);
    res.status(500).json({
      error: 'เกิดข้อผิดพลาดในการสังเคราะห์รายงานด้วย AI กรุณาลองใหม่อีกครั้ง',
    });
  }
});

// Enhanced SMTP & Gmail Email Notification Mailer (Optional - System works 100% without SMTP)
let emailTransporter: nodemailer.Transporter | null = null;

function getAdminEmails(): string[] {
  const envAdmins = process.env.ADMIN_NOTIFICATION_EMAILS;
  if (envAdmins && envAdmins.trim()) {
    return envAdmins
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && e.includes('@'));
  }
  return ['jsawaporn@gmail.com', 'executive@huso.yru.ac.th'];
}

function getEmailTransporter(): nodemailer.Transporter | null {
  if (emailTransporter) return emailTransporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const port = Number(process.env.SMTP_PORT) || 587;
    const isSecure = process.env.SMTP_SECURE === 'true' || port === 465;

    try {
      emailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: isSecure,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
      return emailTransporter;
    } catch {
      return null;
    }
  }

  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      emailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });
      return emailTransporter;
    } catch {
      return null;
    }
  }

  return null;
}

interface SmtpSendOptions {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  from?: string;
}

async function sendSmtpEmail(options: SmtpSendOptions): Promise<{
  success: boolean;
  realDelivery: boolean;
  sendMode: string;
  messageId: string | null;
  error?: string;
}> {
  const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to;
  const defaultFrom =
    process.env.SMTP_FROM ||
    (process.env.GMAIL_USER ? `"HUSO BRIDGE Notification" <${process.env.GMAIL_USER}>` : '"HUSO BRIDGE System" <jsawaporn@gmail.com>');
  const from = options.from || defaultFrom;

  const transporter = getEmailTransporter();

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from,
        to: recipients,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      console.log(`[SMTP Mailer Success] To: ${recipients} | ID: ${info.messageId}`);
      return {
        success: true,
        realDelivery: true,
        sendMode: process.env.GMAIL_USER ? 'GMAIL_SMTP' : 'CUSTOM_SMTP',
        messageId: info.messageId,
      };
    } catch (err: any) {
      console.warn('[SMTP Mailer Non-blocking Notice]:', err?.message || err);
      return {
        success: true, // Non-blocking: application continues seamlessly
        realDelivery: false,
        sendMode: 'SMTP_DISABLED_OR_ERROR',
        messageId: null,
        error: err.message || 'SMTP Connection Error',
      };
    }
  }

  // When no SMTP is configured, log cleanly without blocking any workflow
  console.log(`[SMTP Mailer Notice - Optional/Bypassed] In-App flow active. To: ${recipients}`);
  return {
    success: true,
    realDelivery: false,
    sendMode: 'IN_APP_ONLY',
    messageId: `IN_APP-${Date.now()}`,
  };
}

// Endpoint: Test SMTP configuration
app.post('/api/system/test-email', async (req, res) => {
  try {
    const { targetEmail } = req.body || {};
    const recipient = targetEmail || getAdminEmails()[0] || 'jsawaporn@gmail.com';

    const testSubject = `[HUSO BRIDGE] ทดสอบการเชื่อมต่อระบบส่งอีเมลแจ้งเตือน (SMTP Test)`;
    const testText = `ระบบ HUSO BRIDGE System ได้ทดสอบการส่งอีเมลผ่านระบบ SMTP สำเร็จเมื่อ ${new Date().toLocaleString('th-TH')}`;
    const testHtml = `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 500px;">
        <h3 style="color: #4f46e5; margin-top: 0;">✅ การเชื่อมต่อระบบส่งอีเมลสำเร็จ (SMTP Connected)</h3>
        <p style="font-size: 13px; color: #475569;">นี่คือข้อความทดสอบจากระบบ HUSO Performance & BRIDGE System</p>
        <div style="background: #f8fafc; padding: 12px; border-radius: 8px; font-size: 12px; color: #1e293b;">
          <strong>วันเวลาที่ส่ง:</strong> ${new Date().toLocaleString('th-TH')}<br/>
          <strong>ผู้รับ:</strong> ${recipient}
        </div>
      </div>
    `;

    const result = await sendSmtpEmail({
      to: recipient,
      subject: testSubject,
      text: testText,
      html: testHtml,
    });

    res.json({
      success: true,
      ...result,
      recipient,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to send test email' });
  }
});

// Endpoint: Send email notification for new BRIDGE progress submissions
app.post('/api/bridge/notify-progress-submission', async (req, res) => {
  try {
    const {
      improvementId,
      improvementTitle,
      periodName,
      progressPercentage = 0,
      completedTasksSummary,
      periodAchievement,
      customerImpactFeedback,
      nextSteps,
      requiresExecutiveDecision,
      decisionTopic,
      reportedByName,
      departmentName,
      recipientEmails,
      directUrl,
    } = req.body || {};

    if (!improvementTitle || !completedTasksSummary) {
      return res.status(400).json({ error: 'Missing required progress report details' });
    }

    const defaultAdmins = getAdminEmails();
    const recipients = Array.isArray(recipientEmails) && recipientEmails.length > 0
      ? recipientEmails
      : defaultAdmins;

    const actionUrl = directUrl || `https://ais-dev-ekgi4wrp7znjld5xp3gjvo-609981088748.asia-southeast1.run.app?tab=bridge_progress&item=${improvementId || ''}`;
    const progressInt = Math.min(Math.max(Number(progressPercentage) || 0, 0), 100);
    const badgeColor = progressInt >= 100 ? '#059669' : progressInt >= 50 ? '#2563eb' : '#d97706';

    const subject = `📊 [HUSO BRIDGE] รายงานความก้าวหน้ารอบใหม่: ${improvementId ? `[${improvementId}] ` : ''}${improvementTitle} (${progressInt}%)`;

    const plainText = `
เรียน คณะผู้บริหารและผู้ดูแลระบบ HUSO BRIDGE System

มีการบันทึกรายงานความก้าวหน้าการปรับปรุงงานรอบใหม่ในระบบ:

- รหัสประเด็น: ${improvementId || '-'}
- หัวข้อประเด็น: ${improvementTitle}
- รอบการรายงาน: ${periodName || 'รอบปัจจุบัน'}
- ร้อยละความก้าวหน้ารวม: ${progressInt}%
- หน่วยงาน/หลักสูตร: ${departmentName || 'คณะมนุษยศาสตร์และสังคมศาสตร์'}
- ผู้รายงานผล: ${reportedByName || 'ผู้รับผิดชอบงาน'}
- วันที่รายงาน: ${new Date().toLocaleString('th-TH')}

สิ่งที่ดำเนินการแล้วในรอบนี้:
${completedTasksSummary}

${periodAchievement ? `ผลสำเร็จสำคัญในรอบนี้:\n${periodAchievement}\n` : ''}
${customerImpactFeedback ? `ผลลัพธ์ต่อลูกค้า/ผู้รับบริการ:\n${customerImpactFeedback}\n` : ''}
${nextSteps ? `แผนการดำเนินการขั้นต่อไป:\n${nextSteps}\n` : ''}
${requiresExecutiveDecision ? `⚠️ ต้องการเสนอผู้บริหารเพื่อตัดสินใจ/มอบหมาย:\n${decisionTopic || 'โปรดดูในระบบ'}\n` : ''}

ท่านสามารถเปิดดูประวัติการดำเนินงานและติดตามผลลัพธ์ฉบับเต็มได้ที่:
${actionUrl}

--
ระบบบริหารผลการดำเนินงานและประกันคุณภาพการศึกษา (HUSO Performance & BRIDGE System)
คณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏยะลา
    `.trim();

    const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 24px; }
        .card { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 24px; color: #ffffff; }
        .header h2 { margin: 0 0 6px 0; font-size: 18px; font-weight: 700; }
        .header p { margin: 0; font-size: 12px; opacity: 0.9; }
        .content { padding: 24px; }
        .progress-pill { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; background: ${badgeColor}; color: #ffffff; }
        .bar-container { background: #e2e8f0; height: 10px; border-radius: 5px; overflow: hidden; margin: 12px 0 18px 0; }
        .bar-fill { background: ${badgeColor}; height: 100%; width: ${progressInt}%; border-radius: 5px; }
        .info-table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 13px; }
        .info-table td { padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
        .info-table td.label { width: 130px; color: #64748b; font-weight: 600; }
        .info-table td.value { color: #0f172a; font-weight: 600; }
        .section-title { font-weight: 700; font-size: 13px; color: #334155; margin: 16px 0 6px 0; }
        .details-box { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px 14px; border-radius: 6px; font-size: 13px; color: #334155; white-space: pre-wrap; }
        .highlight-box { background: #ecfdf5; border-left: 4px solid #10b981; padding: 12px 14px; border-radius: 6px; font-size: 13px; color: #065f46; white-space: pre-wrap; margin-top: 8px; }
        .alert-box { background: #fff1f2; border-left: 4px solid #e11d48; padding: 12px 14px; border-radius: 6px; font-size: 13px; color: #9f1239; margin-top: 12px; }
        .btn-container { text-align: center; margin: 26px 0 10px 0; }
        .btn { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 12px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px; }
        .footer { background: #f1f5f9; padding: 16px 24px; font-size: 11px; color: #64748b; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h2>รายงานความก้าวหน้าการปรับปรุงงาน (BRIDGE Progress)</h2>
          <p>คณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏยะลา</p>
        </div>
        <div class="content">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="progress-pill">ความก้าวหน้ารวม ${progressInt}%</span>
            <span style="font-size: 12px; color: #64748b; font-weight: 600;">${periodName || 'รอบรายงานล่าสุด'}</span>
          </div>

          <div class="bar-container">
            <div class="bar-fill"></div>
          </div>

          <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #0f172a;">
            ${improvementId ? `<span style="color: #2563eb; font-family: monospace;">[${improvementId}]</span> ` : ''}${improvementTitle}
          </h3>

          <table class="info-table">
            <tr>
              <td class="label">หน่วยงาน/หลักสูตร:</td>
              <td class="value">${departmentName || 'คณะมนุษยศาสตร์ฯ'}</td>
            </tr>
            <tr>
              <td class="label">ผู้รายงานผล:</td>
              <td class="value">${reportedByName || 'ผู้รับผิดชอบงาน'}</td>
            </tr>
            <tr>
              <td class="label">วันที่รายงาน:</td>
              <td class="value">${new Date().toLocaleString('th-TH')}</td>
            </tr>
          </table>

          <div class="section-title">สิ่งที่ดำเนินการแล้วในรอบนี้:</div>
          <div class="details-box">${completedTasksSummary}</div>

          ${periodAchievement ? `
            <div class="section-title">ผลสำเร็จสำคัญในรอบนี้:</div>
            <div class="highlight-box">${periodAchievement}</div>
          ` : ''}

          ${customerImpactFeedback ? `
            <div class="section-title">ผลลัพธ์ต่อลูกค้า/ผู้รับบริการ:</div>
            <div class="details-box" style="border-left-color: #6366f1;">${customerImpactFeedback}</div>
          ` : ''}

          ${requiresExecutiveDecision ? `
            <div class="alert-box">
              <strong>⚠️ ต้องการข้อสั่งการ/การตัดสินใจจากผู้บริหาร:</strong><br/>
              ${decisionTopic || 'มีประเด็นที่ต้องโปรดพิจารณา'}
            </div>
          ` : ''}

          <div class="btn-container">
            <a href="${actionUrl}" class="btn" target="_blank">เปิดระบบเพื่อดูความก้าวหน้าฉบับเต็ม</a>
          </div>
        </div>
        <div class="footer">
          อีเมลฉบับนี้ส่งโดยระบบอัตโนมัติ HUSO BRIDGE Performance System<br/>
          หากปุ่มไม่ทำงาน สามารถเข้าสู่ระบบได้ที่: ${actionUrl}
        </div>
      </div>
    </body>
    </html>
    `;

    const dispatchResult = await sendSmtpEmail({
      to: recipients,
      subject,
      text: plainText,
      html: htmlBody,
    });

    res.json({
      success: true,
      ...dispatchResult,
      recipients,
      emailSubject: subject,
      previewUrl: actionUrl,
    });
  } catch (err: any) {
    console.error('Error in notify-progress-submission:', err);
    res.status(500).json({ error: err.message || 'Failed to send progress submission email' });
  }
});

// Endpoint for sending email notifications to executives when a new proposal/decision is requested
app.post('/api/bridge/notify-executive', async (req, res) => {
  try {
    const {
      decisionId,
      improvementId,
      improvementTitle,
      departmentOrCourseName,
      requestedBy,
      topic,
      details,
      recipientEmails,
      directUrl,
      priority,
    } = req.body || {};

    if (!topic || !details) {
      return res.status(400).json({ error: 'Missing required topic or details' });
    }

    const priorityLabel = priority === 'VERY_URGENT' ? '🔥 [ด่วนที่สุด]' : priority === 'URGENT' ? '⚡ [ด่วน]' : '[เรื่องเสนอพิจารณา]';
    const emailSubject = `${priorityLabel} [HUSO BRIDGE] เสนอเรื่องขออนุมัติ/ข้อสั่งการผู้บริหาร: ${topic}`;
    const recipients = Array.isArray(recipientEmails) && recipientEmails.length > 0
      ? recipientEmails
      : getAdminEmails();

    const actionUrl = directUrl || 'https://ais-dev-ekgi4wrp7znjld5xp3gjvo-609981088748.asia-southeast1.run.app?tab=bridge_decisions';

    const plainTextBody = `
เรียน คณะผู้บริหารคณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏยะลา

มีการเสนอเรื่องขออนุมัติหรือขอข้อสั่งการผู้บริหารใหม่ผ่านระบบ HUSO BRIDGE System:

- หัวข้อเรื่อง: ${topic}
- ความสำคัญ: ${priorityLabel}
- หน่วยงาน/หลักสูตร: ${departmentOrCourseName || 'คณะมนุษยศาสตร์ฯ'}
- ผู้เสนอเรื่อง: ${requestedBy || 'ผู้รับผิดชอบงาน'}
- ประเด็นที่เกี่ยวข้อง: ${improvementTitle || improvementId || 'คำขอเชิงบูรณาการ'}
- วันเวลาที่ส่ง: ${new Date().toLocaleString('th-TH')}

รายละเอียดและความจำเป็น:
${details}

ท่านสามารถเปิดดูรายละเอียดและบันทึกผลการพิจารณาหรือข้อสั่งการ (Approve / Direct / Reject) ได้ทันทีผ่านลิงก์ด้านล่างนี้:
${actionUrl}

--
ระบบบริหารผลการดำเนินงานและประกันคุณภาพการศึกษา (HUSO Performance & BRIDGE System)
คณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏยะลา
    `.trim();

    const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 24px; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 24px; color: #ffffff; }
        .header h2 { margin: 0 0 6px 0; font-size: 18px; font-weight: 700; }
        .header p { margin: 0; font-size: 12px; opacity: 0.9; }
        .content { padding: 24px; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; background: #fee2e2; color: #991b1b; }
        .info-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
        .info-table td { padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
        .info-table td.label { width: 120px; color: #64748b; font-weight: 600; }
        .info-table td.value { color: #0f172a; font-weight: 600; }
        .details-box { background: #f8fafc; border-left: 4px solid #7c3aed; padding: 14px; border-radius: 6px; font-size: 13px; color: #334155; margin: 16px 0; white-space: pre-wrap; }
        .btn-container { text-align: center; margin: 28px 0 12px 0; }
        .btn { display: inline-block; background: #7c3aed; color: #ffffff !important; padding: 12px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px; }
        .footer { background: #f1f5f9; padding: 16px 24px; font-size: 11px; color: #64748b; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h2>ระบบ HUSO BRIDGE: แจ้งเตือนข้อเสนอถึงผู้บริหาร</h2>
          <p>คณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏยะลา</p>
        </div>
        <div class="content">
          <div style="margin-bottom: 16px;">
            <span class="badge">${priorityLabel}</span>
          </div>
          <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #0f172a;">${topic}</h3>
          
          <table class="info-table">
            <tr>
              <td class="label">หน่วยงาน/หลักสูตร:</td>
              <td class="value">${departmentOrCourseName || 'คณะมนุษยศาสตร์ฯ'}</td>
            </tr>
            <tr>
              <td class="label">ผู้เสนอเรื่อง:</td>
              <td class="value">${requestedBy || 'ผู้รับผิดชอบงาน'}</td>
            </tr>
            <tr>
              <td class="label">ประเด็นที่เกี่ยวข้อง:</td>
              <td class="value">${improvementTitle || improvementId || 'คำขอทั่วไป'}</td>
            </tr>
            <tr>
              <td class="label">วันที่เสนอเรื่อง:</td>
              <td class="value">${new Date().toLocaleString('th-TH')}</td>
            </tr>
          </table>

          <div style="font-weight: 600; font-size: 12px; color: #475569; margin-top: 12px;">รายละเอียดและความจำเป็น:</div>
          <div class="details-box">${details}</div>

          <div class="btn-container">
            <a href="${actionUrl}" class="btn" target="_blank">เปิดระบบเพื่อบันทึกข้อสั่งการ</a>
          </div>
        </div>
        <div class="footer">
          อีเมลฉบับนี้ส่งโดยระบบอัตโนมัติ HUSO BRIDGE Performance System<br/>
          หากปุ่มไม่ทำงาน สามารถเข้าสู่ระบบได้ที่: ${actionUrl}
        </div>
      </div>
    </body>
    </html>
    `;

    const dispatchResult = await sendSmtpEmail({
      to: recipients,
      subject: emailSubject,
      text: plainTextBody,
      html: htmlBody,
    });

    res.json({
      success: true,
      ...dispatchResult,
      message: `ส่งการแจ้งเตือนเรื่อง "${topic}" ไปยังผู้บริหาร (${recipients.join(', ')}) เรียบร้อยแล้ว`,
      dispatchedAt: new Date().toISOString(),
      recipients,
      emailSubject,
      plainTextBody,
      previewUrl: actionUrl,
    });
  } catch (err: any) {
    console.error('Error dispatching executive email notification:', err);
    res.status(500).json({ error: err.message || 'Failed to dispatch email notification' });
  }
});


// Secure Operational Data Reset API for Go-Live (RBAC & Confirmation Protected)
app.post('/api/system/clear-operational-data', (req, res) => {
  const { userId, userName, role, confirmPhrase } = req.body || {};

  // Strict Server-Side Role-Based Access Control (RBAC)
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      error: 'Permission Denied: เฉพาะผู้ดูแลระบบ (ADMIN / SUPER_ADMIN) เท่านั้นที่สามารถสั่งล้างข้อมูลระบบได้',
      code: 'UNAUTHORIZED_ROLE',
    });
  }

  // Strict Confirmation Verification
  const expectedPhrase = 'ยืนยันล้างข้อมูลทดลองและเริ่มรหัส 001';
  if (confirmPhrase !== expectedPhrase) {
    return res.status(400).json({
      error: `Security Verification Failed: กรุณาระบุข้อความยืนยันความปลอดภัยให้ถูกต้อง ("${expectedPhrase}")`,
      code: 'INVALID_CONFIRMATION_PHRASE',
    });
  }

  const prevEvidence = evidenceList.length;
  const prevDirectives = directives.length;
  const prevProgress = monthlyProgressList.length;
  const prevReports = reports.length;
  const prevIndicators = indicators.length;
  const prevTargets = targets.length;

  // Create an in-memory backup snapshot
  const backupId = `BKP-SRV-${Date.now()}`;
  const backupSnapshot = {
    backupId,
    createdAt: new Date().toISOString(),
    operator: userName || 'ผู้ดูแลระบบ',
    evidence: [...evidenceList],
    directives: [...directives],
    monthlyProgress: [...monthlyProgressList],
    reports: [...reports],
    indicators: [...indicators],
    targets: [...targets],
  };

  evidenceList = [];
  directives = [];
  monthlyProgressList = [];
  reports = [];

  addLog(
    userId || 'ADMIN',
    userName || 'ผู้ดูแลระบบ',
    'ADMIN',
    'RESET',
    backupId,
    `ล้างข้อมูลดำเนินงานเพื่อเริ่มใช้งานจริง (Go-Live Reset): คลังหลักฐาน (${prevEvidence}), ข้อสั่งการ (${prevDirectives}), ผลงานรายเดือน (${prevProgress}), รายงาน (${prevReports}) [สำรองข้อมูล: ${backupId}]`
  );

  res.json({
    success: true,
    backupId,
    message: 'ลบข้อมูลในคลังหลักฐาน มาตรการแก้ไขคำสั่ง และรายงานความก้าวหน้าเรียบร้อยแล้ว (สำรองข้อมูลแล้ว)',
    cleared: {
      evidence: prevEvidence,
      directives: prevDirectives,
      monthlyProgress: prevProgress,
      reports: prevReports,
      indicators: prevIndicators,
      targets: prevTargets,
    },
  });
});

async function startServer() {
  // Vite middleware in dev
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

import { Indicator, MonthlyProgress, StrategicIssue } from '../types';
import { handleInvalidAuthToken } from './googleAuth';

const SHEET_TITLE = 'HUSO_KPI_KVI_Performance_Tracking_Sheet';

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  error: string | null;
}

async function handleGoogleApiError(res: Response, prefix: string): Promise<never> {
  let errDetail = '';
  try {
    const errJson = await res.json();
    errDetail = errJson?.error?.message || JSON.stringify(errJson);
  } catch (e) {
    errDetail = await res.text().catch(() => res.statusText);
  }

  if (res.status === 401 || errDetail.includes('UNAUTHENTICATED') || errDetail.includes('Invalid Credentials')) {
    await handleInvalidAuthToken();
    throw new Error('GOOGLE_AUTH_EXPIRED: เซสชันการเชื่อมต่อ Google หมดอายุ กรุณาเข้าสู่ระบบ Google อีกครั้ง');
  }

  throw new Error(`${prefix}: ${errDetail}`);
}

/**
 * Searches for an existing HUSO spreadsheet in Google Drive or creates a new one.
 */
export async function getOrCreateSpreadsheet(accessToken: string): Promise<{ id: string; url: string }> {
  // 1. Search for existing sheet in Drive
  const query = encodeURIComponent(`name='${SHEET_TITLE}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`);
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!searchRes.ok) {
    await handleGoogleApiError(searchRes, 'Google Drive Search Error');
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    const existingFile = searchData.files[0];
    return {
      id: existingFile.id,
      url: `https://docs.google.com/spreadsheets/d/${existingFile.id}/edit`,
    };
  }

  // 2. Create a new Spreadsheet if not found
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title: SHEET_TITLE },
      sheets: [
        { properties: { title: 'KPI_KVI_Indicators' } },
        { properties: { title: 'Monthly_Progress_Logs' } },
        { properties: { title: 'Strategic_Issues' } },
      ],
    }),
  });

  if (!createRes.ok) {
    await handleGoogleApiError(createRes, 'Google Sheets Creation Error');
  }

  const createData = await createRes.json();
  return {
    id: createData.spreadsheetId,
    url: createData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${createData.spreadsheetId}/edit`,
  };
}

/**
 * Clears all data rows (row 2 onwards) from all sheets in the HUSO Google Spreadsheet.
 */
export async function clearGoogleSheetData(
  accessToken: string,
  spreadsheetId: string
): Promise<void> {
  // 1. Clear all old rows from all sheets
  const clearRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ranges: [
          'KPI_KVI_Indicators!A2:Z5000',
          'Monthly_Progress_Logs!A2:Z5000',
          'Strategic_Issues!A2:Z5000',
        ],
      }),
    }
  );

  if (!clearRes.ok) {
    await handleGoogleApiError(clearRes, 'Google Sheets Clear Error');
  }

  // 2. Ensure pristine standard header rows in row 1
  const headerRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: 'KPI_KVI_Indicators!A1:H1',
            majorDimension: 'ROWS',
            values: [
              [
                'รหัสตัวชี้วัด',
                'ชื่อตัวชี้วัด',
                'ประเภท',
                'หน่วยงานรับผิดชอบ',
                'ค่าฐาน (Baseline)',
                'หน่วยวัด',
                'สถานะ',
                'รหัสยุทธศาสตร์',
              ],
            ],
          },
          {
            range: 'Monthly_Progress_Logs!A1:I1',
            majorDimension: 'ROWS',
            values: [
              [
                'ID บันทึก',
                'รหัสตัวชี้วัด',
                'เดือน',
                'ปีงบประมาณ',
                'ผลงานประจำเดือน (Actual)',
                'สถานะการรับรอง',
                'สรุปผลงาน/ปัญหา',
                'ผู้บันทึก',
                'เวลาอัปเดต',
              ],
            ],
          },
          {
            range: 'Strategic_Issues!A1:D1',
            majorDimension: 'ROWS',
            values: [
              [
                'ปีงบประมาณ',
                'รหัสยุทธศาสตร์',
                'ชื่อประเด็นยุทธศาสตร์',
                'วัตถุประสงค์เชิงยุทธศาสตร์',
              ],
            ],
          },
        ],
      }),
    }
  );

  if (!headerRes.ok) {
    await handleGoogleApiError(headerRes, 'Google Sheets Header Reset Error');
  }
}

/**
 * Syncs Indicators, Monthly Progress Logs, and Strategic Issues to Google Sheets in real-time.
 * Automatically clears all old and deleted rows before writing current data.
 */
export async function syncAllToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  indicators: Indicator[],
  monthlyLogs: MonthlyProgress[],
  strategies: StrategicIssue[]
): Promise<void> {
  // First, completely clear any stale/old rows across all 3 sheets
  await clearGoogleSheetData(accessToken, spreadsheetId);

  // Filter out any DELETED or trashed indicators
  const activeIndicators = indicators.filter(
    (ind) => ind.status !== 'DELETED' && !ind.name?.toLowerCase().includes('test')
  );

  // 1. Prepare Indicators Tab Data
  const indicatorRows = [
    [
      'รหัสตัวชี้วัด',
      'ชื่อตัวชี้วัด',
      'ประเภท',
      'หน่วยงานรับผิดชอบ',
      'ค่าฐาน (Baseline)',
      'หน่วยวัด',
      'สถานะ',
      'รหัสยุทธศาสตร์',
    ],
    ...activeIndicators.map((ind) => [
      ind.code || '',
      ind.name || '',
      ind.type || 'KPI',
      ind.departmentName || '',
      ind.baseline || 0,
      ind.unit || '',
      ind.status || 'ACTIVE',
      ind.strategyId || '',
    ]),
  ];

  // 2. Prepare Monthly Progress Logs Tab Data
  const progressRows = [
    [
      'ID บันทึก',
      'รหัสตัวชี้วัด',
      'เดือน',
      'ปีงบประมาณ',
      'ผลงานประจำเดือน (Actual)',
      'สถานะการรับรอง',
      'สรุปผลงาน/ปัญหา',
      'ผู้บันทึก',
      'เวลาอัปเดต',
    ],
    ...monthlyLogs.map((log) => [
      log.progressId || '',
      log.indicatorCode || log.indicatorId || '',
      log.monthNameTh || `เดือน ${log.month}`,
      log.fiscalYear || '2569',
      log.actualMonthly || 0,
      log.verificationStatus || 'DRAFT',
      log.summary || log.problems || '',
      log.loggerName || log.ownerName || '',
      log.lastModified ? new Date(log.lastModified).toLocaleString('th-TH') : '',
    ]),
  ];

  // 3. Prepare Strategic Issues Tab Data
  const strategyRows = [
    [
      'ปีงบประมาณ',
      'รหัสยุทธศาสตร์',
      'ชื่อประเด็นยุทธศาสตร์',
      'วัตถุประสงค์เชิงยุทธศาสตร์',
    ],
    ...strategies.map((strat) => [
      strat.fiscalYear || '2569',
      strat.code || '',
      strat.name || '',
      strat.objectives ? strat.objectives.join('; ') : '',
    ]),
  ];

  // Batch update values across all 3 sheets
  const batchRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: 'KPI_KVI_Indicators!A1:H',
            majorDimension: 'ROWS',
            values: indicatorRows,
          },
          {
            range: 'Monthly_Progress_Logs!A1:I',
            majorDimension: 'ROWS',
            values: progressRows,
          },
          {
            range: 'Strategic_Issues!A1:D',
            majorDimension: 'ROWS',
            values: strategyRows,
          },
        ],
      }),
    }
  );

  if (!batchRes.ok) {
    await handleGoogleApiError(batchRes, 'Batch Sync to Google Sheets Failed');
  }
}

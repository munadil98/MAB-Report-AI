import { MajlisData, Month, ZaimData } from '../types';

export async function fetchSheetData(month: Month): Promise<MajlisData[]> {
  const url = `/api/data?month=${month}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch data from server');
    }

    const rows = await response.json();
    console.log(`[Data] Fetched ${rows.length} rows for ${month}`);
    
    // Filter out empty rows (where majlis name is missing)
    return rows
      .filter((row: any[]) => {
        if (!row || !Array.isArray(row)) return false;
        const col0 = row[0] ? String(row[0]).trim() : '';
        const col1 = row[1] ? String(row[1]).trim() : '';
        return col0 !== '' || col1 !== '';
      })
      .map((row: any[]) => {
        const isFirstColSL = row[0] !== null && row[0] !== undefined && !isNaN(Number(row[0])) && String(row[0]).trim() !== '';
        const majlisName = isFirstColSL ? (row[1] !== null ? String(row[1]) : '') : (row[0] !== null ? String(row[0]) : '');
        const offset = isFirstColSL ? 0 : -1;

        return {
          sl: isFirstColSL ? row[0] : '',
          majlisName: majlisName,
          tajnidMembers: Number(row[2 + offset]) || 0,
          saffAwwal: Number(row[3 + offset]) || 0,
          saffDom: Number(row[4 + offset]) || 0,
          totalAmelaMembers: Number(row[5 + offset]) || 0,
          totalMusis: Number(row[6 + offset]) || 0,
          amelaMeeting: Number(row[7 + offset]) || 0,
          generalMeeting: Number(row[8 + offset]) || 0,
          generalMeetingAttendance: Number(row[9 + offset]) || 0,
          daiIlallahMembers: Number(row[10 + offset]) || 0,
          tablighSeminar: Number(row[11 + offset]) || 0,
          tablighDoneBy: Number(row[12 + offset]) || 0,
          tablighDoneTo: Number(row[13 + offset]) || 0,
          booksDistributed: Number(row[14 + offset]) || 0,
          baiatCount: Number(row[15 + offset]) || 0,
          quranReaders: Number(row[16 + offset]) || 0,
          quranClassMembers: Number(row[17 + offset]) || 0,
          fiveTimePrayers: Number(row[18 + offset]) || 0,
          congregationalPrayers: Number(row[19 + offset]) || 0,
          mtaConnection: Number(row[20 + offset]) || 0,
          apjMtaConnection: Number(row[21 + offset]) || 0,
          regularMtaViewers: Number(row[22 + offset]) || 0,
          regularKhutbaListeners: Number(row[23 + offset]) || 0,
          bookExam: Number(row[24 + offset]) || 0,
          bookSeminar: Number(row[25 + offset]) || 0,
          studyForumAttendance: Number(row[26 + offset]) || 0,
          nauMobainCount: Number(row[27 + offset]) || 0,
          budgetedNauMobain: Number(row[28 + offset]) || 0,
          nauMobainSeminarAttendance: Number(row[29 + offset]) || 0,
          sickAnsarMembers: Number(row[30 + offset]) || 0,
          elderlyAnsarMembers: Number(row[31 + offset]) || 0,
          foodDistribution: Number(row[32 + offset]) || 0,
          alNaserMembers: Number(row[33 + offset]) || 0,
          tahrikeJadidMembers: Number(row[34 + offset]) || 0,
          waqfeJadidMembers: Number(row[35 + offset]) || 0,
          regularExercise: Number(row[36 + offset]) || 0,
        };
      });
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    throw error;
  }
}

export async function fetchZaimData(): Promise<ZaimData[]> {
  const url = `/api/zaim`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || `Server error ${response.status}`);
    }

    const rows = await response.json();
    console.log(`[Zaim] Fetched ${rows.length} rows`);
    
    // Filter out empty rows (where majlis name is missing)
    // We check both column A and B for a name to be more robust
    return rows
      .filter((row: any[]) => {
        if (!row || !Array.isArray(row)) return false;
        const col0 = row[0] ? String(row[0]).trim() : '';
        const col1 = row[1] ? String(row[1]).trim() : '';
        return col0 !== '' || col1 !== '';
      })
      .map((row: any[]) => {
        // If row[0] looks like a number (SL), use row[1] as majlis
        // Otherwise, if row[0] has a name, use it as majlis
        const isFirstColSL = row[0] !== null && row[0] !== undefined && !isNaN(Number(row[0])) && String(row[0]).trim() !== '';
        const majlis = isFirstColSL ? (row[1] !== null ? String(row[1]) : '') : (row[0] !== null ? String(row[0]) : '');
        const offset = isFirstColSL ? 0 : -1;

        return {
          sl: isFirstColSL ? row[0] : '',
          majlis: majlis,
          zaimName: row[2 + offset] || '',
          zaimMobile: row[3 + offset] || '',
          district: row[4 + offset] || '',
          districtNazimName: row[5 + offset] || '',
          districtNazimMobile: row[6 + offset] || '',
          regionNazimName: row[7 + offset] || '',
          regionNazimMobile: row[8 + offset] || '',
        };
      });
  } catch (error) {
    console.error('Error fetching zaim data:', error);
    throw error;
  }
}

export interface MajlisNameMap {
  bangla: string;
  english: string;
  whatsappNumber?: string;
  district?: string;
  districtNazimName?: string;
  districtNazimMobile?: string;
  region?: string;
  regionNazimName?: string;
  regionNazimMobile?: string;
}

export async function fetchMajlisNames(): Promise<MajlisNameMap[]> {
  const url = `/api/majlis-names`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch majlis names from server');
    }

    const rows = await response.json();
    
    // Filter out rows and return the mapping
    // Column A might be SL or Bangla Name
    return rows
      .filter((row: any[]) => row && Array.isArray(row) && row.length >= 2)
      .map((row: any[]) => {
        // Simple heuristic: if row[0] is a number, it's likely SL
        const isFirstColSL = row[0] !== null && row[0] !== undefined && !isNaN(Number(row[0])) && String(row[0]).trim() !== '' && String(row[0]).length < 5;
        const offset = isFirstColSL ? 0 : -1;
        
        return {
          bangla: row[1 + offset] ? String(row[1 + offset]).trim() : '',
          english: row[2 + offset] ? String(row[2 + offset]).trim() : '',
          whatsappNumber: row[3 + offset] ? String(row[3 + offset]).trim() : undefined,
          district: row[4 + offset] ? String(row[4 + offset]).trim() : undefined,
          districtNazimName: row[5 + offset] ? String(row[5 + offset]).trim() : undefined,
          districtNazimMobile: row[6 + offset] ? String(row[6 + offset]).trim() : undefined,
          region: row[7 + offset] ? String(row[7 + offset]).trim() : undefined,
          regionNazimName: row[8 + offset] ? String(row[8 + offset]).trim() : undefined,
          regionNazimMobile: row[9 + offset] ? String(row[9 + offset]).trim() : undefined
        };
      })
      .filter(m => (m.bangla && m.bangla !== '') || (m.english && m.english !== ''));
  } catch (error) {
    console.error('Error fetching majlis names:', error);
    throw error;
  }
}

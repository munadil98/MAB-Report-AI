import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  LayoutDashboard, Table as TableIcon, Settings, BarChart3,
  ChevronDown, Download, RefreshCw, AlertCircle, Search,
  Users, BookOpen, Heart, Activity, Calendar, TrendingUp, TrendingDown, Minus, MessageSquare,
  Menu, X, MapPin, Globe, Send, History, ClipboardList, Camera
} from 'lucide-react';
import { MajlisData, Month, MONTHS, FIELD_LABELS, ZaimData } from './types';
import { fetchSheetData, fetchZaimData, fetchMajlisNames, MajlisNameMap } from './services/googleSheets';
import ReportAIChat from './components/ReportAIChat';
import { toPng } from 'html-to-image';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const PERFORMANCE_FIELDS: (keyof MajlisData)[] = [
  'amelaMeeting',
  'generalMeeting',
  'generalMeetingAttendance',
  'daiIlallahMembers',
  'tablighSeminar',
  'tablighDoneBy',
  'tablighDoneTo',
  'booksDistributed',
  'baiatCount',
  'quranReaders',
  'quranClassMembers',
  'fiveTimePrayers',
  'congregationalPrayers',
  'mtaConnection',
  'regularMtaViewers',
  'regularKhutbaListeners',
  'bookExam',
  'bookSeminar',
  'studyForumAttendance',
  'nauMobainSeminarAttendance',
  'foodDistribution',
  'alNaserMembers',
  'tahrikeJadidMembers',
  'waqfeJadidMembers',
  'regularExercise'
];

export default function App() {
  const [selectedMonth, setSelectedMonth] = useState<Month>(() => {
    const saved = localStorage.getItem('selectedMonth');
    return (saved as Month) || 'Jan26';
  });
  const [data, setData] = useState<MajlisData[]>([]);
  const [zaimData, setZaimData] = useState<ZaimData[]>([]);
  const [zaimError, setZaimError] = useState<string | null>(null);
  const [showZaimDebug, setShowZaimDebug] = useState(false);
  const [masterMajlisNames, setMasterMajlisNames] = useState<MajlisNameMap[]>([]);
  const [allPrevMonthsData, setAllPrevMonthsData] = useState<MajlisData[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'dashboard' | 'table' | 'zilla' | 'region' | 'comparison' | 'appraisal'>(() => {
    return (localStorage.getItem('view') as any) || 'dashboard';
  });
  const [comparedMonths, setComparedMonths] = useState<Month[]>(() => {
    const saved = localStorage.getItem('comparedMonths');
    return saved ? JSON.parse(saved) : [MONTHS[0]];
  });
  const [appraisalMonths, setAppraisalMonths] = useState<Month[]>(() => {
    const saved = localStorage.getItem('appraisalMonths');
    if (saved) return JSON.parse(saved);
    
    // Default: Up to last to last month (e.g., if May, show Jan-Mar)
    const now = new Date();
    // now.getMonth() is 0-indexed: Jan=0, Feb=1, Mar=2, Apr=3, May=4
    // If May(4), we want Jan(0), Feb(1), Mar(2) -> index 2
    const lastToLastMonthIndex = now.getMonth() - 2;
    
    if (lastToLastMonthIndex < 0) {
      // Fallback if the year just started
      return [MONTHS[0]];
    }
    
    return MONTHS.slice(0, lastToLastMonthIndex + 1);
  });
  const [allMonthsFullData, setAllMonthsFullData] = useState<Partial<Record<Month, MajlisData[]>>>({});
  const [comparisonScope, setComparisonScope] = useState<'national' | 'zilla' | 'region' | 'majlis'>('national');
  const [selectedComparisonTarget, setSelectedComparisonTarget] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [dashboardRatioField, setDashboardRatioField] = useState<keyof MajlisData | 'all'>(() => {
    return (localStorage.getItem('dashboardRatioField') as any) || 'all';
  });
  const [tableRatioField, setTableRatioField] = useState<keyof MajlisData | 'all'>(() => {
    return (localStorage.getItem('tableRatioField') as any) || 'all';
  });
  const [zillaRatioField, setZillaRatioField] = useState<keyof MajlisData | 'all'>(() => {
    return (localStorage.getItem('zillaRatioField') as any) || 'all';
  });
  const [regionRatioField, setRegionRatioField] = useState<keyof MajlisData | 'all'>(() => {
    return (localStorage.getItem('regionRatioField') as any) || 'all';
  });
  const [comparisonRatioField, setComparisonRatioField] = useState<keyof MajlisData | 'all'>(() => {
    return (localStorage.getItem('comparisonRatioField') as any) || 'all';
  });

  const currentRatioField = useMemo(() => {
    if (view === 'dashboard') return dashboardRatioField;
    if (view === 'table') return tableRatioField;
    if (view === 'zilla') return zillaRatioField;
    if (view === 'region') return regionRatioField;
    if (view === 'comparison') return comparisonRatioField;
    return 'all';
  }, [view, dashboardRatioField, tableRatioField, zillaRatioField, regionRatioField, comparisonRatioField]);

  const setCurrentRatioField = (val: keyof MajlisData | 'all') => {
    if (view === 'dashboard') setDashboardRatioField(val);
    else if (view === 'table') setTableRatioField(val);
    else if (view === 'zilla') setZillaRatioField(val);
    else if (view === 'region') setRegionRatioField(val);
    else if (view === 'comparison') setComparisonRatioField(val);
  };

  const [selectedGrade, setSelectedGrade] = useState<string | 'all'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [thresholds, setThresholds] = useState(() => {
    const saved = localStorage.getItem('thresholds');
    return saved ? JSON.parse(saved) : {
      A: 80,
      B: 70,
      C: 60,
      D: 50,
      E: 40
    };
  });
  const [sizeThresholds, setSizeThresholds] = useState({
    small: 15,
    medium: 40
  });
  const [selectedSizeCategory, setSelectedSizeCategory] = useState<'all' | 'small' | 'medium' | 'large'>(() => {
    return (localStorage.getItem('selectedSizeCategory') as any) || 'all';
  });

  const [sheetStatus, setSheetStatus] = useState<{main: string, zaim: string, hasCoBuddyKey: boolean} | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/health');
        if (response.ok) {
          const health = await response.json();
          setSheetStatus({
            main: health.mainSheetId,
            zaim: health.zaimSheetId,
            hasCoBuddyKey: health.hasCoBuddyKey
          });
        }
      } catch (err) {
        console.error("Health check failed", err);
      }
    };
    checkHealth();
  }, []);

  const [appraisalFields, setAppraisalFields] = useState<(keyof MajlisData)[]>(() => {
    const saved = localStorage.getItem('appraisalFields');
    return saved ? JSON.parse(saved) : PERFORMANCE_FIELDS;
  });
  const [appraisalReportWeight, setAppraisalReportWeight] = useState<number>(20);

  const calculateRatio = (item: MajlisData, field: keyof MajlisData | 'all') => {
    if (field === 'all') {
      const ratios = PERFORMANCE_FIELDS.map(f => {
        const val = item[f] as number || 0;
        return item.tajnidMembers > 0 ? (val / item.tajnidMembers) * 100 : 0;
      });
      return ratios.reduce((a, b) => a + b, 0) / ratios.length;
    } else {
      const val = item[field] as number || 0;
      return item.tajnidMembers > 0 ? (val / item.tajnidMembers) * 100 : 0;
    }
  };

  const getPerformanceClass = (ratio: number, field: keyof MajlisData | 'all') => {
    const nonPerformanceFields: (keyof MajlisData | 'all')[] = ['tajnidMembers', 'saffAwwal', 'saffDom', 'totalAmelaMembers'];
    if (nonPerformanceFields.includes(field)) return null;

    if (ratio >= thresholds.A) return { label: 'Class A', color: 'bg-emerald-100 text-emerald-700' };
    if (ratio >= thresholds.B) return { label: 'Class B', color: 'bg-blue-100 text-blue-700' };
    if (ratio >= thresholds.C) return { label: 'Class C', color: 'bg-indigo-100 text-indigo-700' };
    if (ratio >= thresholds.D) return { label: 'Class D', color: 'bg-amber-100 text-amber-700' };
    if (ratio >= thresholds.E) return { label: 'Class E', color: 'bg-orange-100 text-orange-700' };
    return { label: 'Class F', color: 'bg-rose-100 text-rose-700' };
  };

  const searchFilteredData = useMemo(() => {
    return data.filter(item => 
      item.majlisName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  const gradeBaseData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = item.majlisName.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      
      // If searching, show all matches regardless of size
      if (searchTerm.trim() !== '') return true;
      
      // Filter by size
      if (selectedSizeCategory !== 'all') {
        const tajnid = item.tajnidMembers;
        if (selectedSizeCategory === 'small' && tajnid > sizeThresholds.small) return false;
        if (selectedSizeCategory === 'medium' && (tajnid <= sizeThresholds.small || tajnid > sizeThresholds.medium)) return false;
        if (selectedSizeCategory === 'large' && tajnid <= sizeThresholds.medium) return false;
      }
      return true;
    });
  }, [data, searchTerm, selectedSizeCategory, sizeThresholds]);

  const gradeCounts = useMemo(() => {
    // Only count Majlis that received data as requested
    const receivedData = gradeBaseData.filter(m => m.tajnidMembers > 0);
    const counts: Record<string, number> = { all: receivedData.length, A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    
    receivedData.forEach(item => {
      const ratio = calculateRatio(item, currentRatioField);
      const perf = getPerformanceClass(ratio, currentRatioField);
      if (perf) {
        const gradeLetter = perf.label.split(' ')[1];
        counts[gradeLetter] = (counts[gradeLetter] || 0) + 1;
      }
    });
    return counts;
  }, [gradeBaseData, currentRatioField, thresholds]);

  const filteredData = useMemo(() => {
    const base = gradeBaseData.filter(item => item.tajnidMembers > 0);
    
    return base.filter(item => {
      // Apply grade filter
      if (selectedGrade !== 'all') {
        const ratio = calculateRatio(item, currentRatioField);
        const perf = getPerformanceClass(ratio, currentRatioField);
        if (!perf) return false;
        return perf.label === `Class ${selectedGrade}`;
      }
      
      return true;
    });
  }, [gradeBaseData, selectedGrade, currentRatioField, thresholds]);

  const getMajlisSize = (tajnid: number) => {
    if (tajnid <= sizeThresholds.small) return { label: 'Small', color: 'bg-slate-100 text-slate-600' };
    if (tajnid <= sizeThresholds.medium) return { label: 'Medium', color: 'bg-slate-200 text-slate-700' };
    return { label: 'Large', color: 'bg-slate-300 text-slate-800' };
  };

  // Persist settings
  useEffect(() => localStorage.setItem('selectedMonth', selectedMonth), [selectedMonth]);
  useEffect(() => localStorage.setItem('view', view), [view]);
  useEffect(() => localStorage.setItem('dashboardRatioField', dashboardRatioField), [dashboardRatioField]);
  useEffect(() => localStorage.setItem('tableRatioField', tableRatioField), [tableRatioField]);
  useEffect(() => localStorage.setItem('zillaRatioField', zillaRatioField), [zillaRatioField]);
  useEffect(() => localStorage.setItem('regionRatioField', regionRatioField), [regionRatioField]);
  useEffect(() => localStorage.setItem('comparisonRatioField', comparisonRatioField), [comparisonRatioField]);
  useEffect(() => localStorage.setItem('selectedSizeCategory', selectedSizeCategory), [selectedSizeCategory]);
  useEffect(() => localStorage.setItem('comparedMonths', JSON.stringify(comparedMonths)), [comparedMonths]);
  useEffect(() => localStorage.setItem('appraisalMonths', JSON.stringify(appraisalMonths)), [appraisalMonths]);
  useEffect(() => localStorage.setItem('appraisalFields', JSON.stringify(appraisalFields)), [appraisalFields]);

  useEffect(() => {
    const fetchMissingMonths = async () => {
      const missingMonths = comparedMonths.filter(m => !allMonthsFullData[m]);
      if (missingMonths.length === 0) return;

      setLoading(true);
      try {
        const results = await Promise.all(
          missingMonths.map(async m => ({ month: m, data: await fetchSheetData(m) }))
        );
        setAllMonthsFullData(prev => {
          const updated = { ...prev };
          results.forEach(res => {
            updated[res.month] = res.data;
          });
          return updated;
        });
      } catch (err: any) {
        setError("One or more months could not be loaded for comparison.");
      } finally {
        setLoading(false);
      }
    };

    if (view === 'comparison') {
      fetchMissingMonths();
    }
  }, [comparedMonths, view]);

  // Load selected months for appraisal
  useEffect(() => {
    if (view === 'appraisal') {
      const fetchSelectedMonths = async () => {
        const missingMonths = appraisalMonths.filter(m => !allMonthsFullData[m]);
        if (missingMonths.length === 0) return;

        setLoading(true);
        try {
          const results = await Promise.all(
            missingMonths.map(async m => ({ month: m, data: await fetchSheetData(m) }))
          );
          setAllMonthsFullData(prev => {
            const updated = { ...prev };
            results.forEach(res => {
              updated[res.month] = res.data;
            });
            return updated;
          });
        } catch (err) {
          console.error("Failed to load some months for appraisal", err);
        } finally {
          setLoading(false);
        }
      };
      fetchSelectedMonths();
    }
  }, [view, appraisalMonths, allMonthsFullData]);

  // Keep allMonthsFullData updated with current selection too
  useEffect(() => {
    if (data.length > 0 && !allMonthsFullData[selectedMonth]) {
      setAllMonthsFullData(prev => ({ ...prev, [selectedMonth]: data }));
    }
  }, [data, selectedMonth]);
  useEffect(() => localStorage.setItem('thresholds', JSON.stringify(thresholds)), [thresholds]);

  const loadData = async (month: Month) => {
    setLoading(true);
    setError(null);
    setZaimError(null);
    try {
      const [result, zaimResult, masterNames] = await Promise.all([
        fetchSheetData(month),
        fetchZaimData().catch(err => {
          console.error('Failed to fetch Zaim data:', err);
          setZaimError(err.message || 'Unknown error');
          return [];
        }),
        fetchMajlisNames().catch(() => [])
      ]);

      console.log(`Loaded ${zaimResult.length} Zaim records. First few:`, zaimResult.slice(0, 3));

      if (result.length === 0) {
        setError(`No data found for ${month}. Please ensure the sheet name is correct and contains data starting from row 2.`);
      }
      setData(result);
      setZaimData(zaimResult);
      setMasterMajlisNames(masterNames);

      // Fetch all previous months data for comparison starting from Jan26
      const monthIndex = MONTHS.indexOf(month);
      const prevMonths = MONTHS.slice(0, monthIndex);
      
      if (prevMonths.length > 0) {
        try {
          const results = await Promise.all(
            prevMonths.map(m => fetchSheetData(m).catch(() => []))
          );
          setAllPrevMonthsData(results.filter(r => r.length > 0));
        } catch (e) {
          console.warn('Could not fetch all previous months data', e);
          setAllPrevMonthsData([]);
        }
      } else {
        setAllPrevMonthsData([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (filteredData.length === 0) return;
    
    const headers = Object.keys(FIELD_LABELS).map(key => `"${FIELD_LABELS[key as keyof MajlisData]}"`);
    const rows = filteredData.map(item => 
      Object.keys(FIELD_LABELS).map(key => {
        const val = item[key as keyof MajlisData];
        return `"${val !== undefined && val !== null ? String(val).replace(/"/g, '""') : ''}"`;
      })
    );
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Majlis_Report_${selectedMonth}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const normalizeName = (name: string) => {
    if (!name) return '';
    // Strip common prefixes/suffixes and all whitespace/special chars
    return name.toLowerCase()
      .replace(/majlis/g, '')
      .replace(/ansarullah/g, '')
      .replace(/khuddam/g, '')
      .replace(/atfal/g, '')
      .replace(/[\s\.\,\-\(\)_]/g, '')
      .replace(/[^a-z0-9\u0980-\u09FF]/g, '')
      .trim();
  };

  const findZaimInfo = (majlisName: string) => {
    if (!majlisName) return null;
    const normalizedTarget = normalizeName(majlisName);
    
    // 1. Find the mapping to get both Bangla and English versions
    const mapping = masterMajlisNames.find(m => 
      normalizeName(m.bangla) === normalizedTarget || 
      normalizeName(m.english) === normalizedTarget
    );
    
    const targetBangla = mapping ? normalizeName(mapping.bangla) : normalizedTarget;
    const targetEnglish = mapping ? normalizeName(mapping.english) : normalizedTarget;

    // 2. Try exact match against both versions (from data or mapping)
    let info = zaimData.find(z => {
      const zNorm = normalizeName(z.majlis);
      return zNorm === targetBangla || zNorm === targetEnglish || zNorm === normalizedTarget;
    });
    if (info) return info;
    
    // 3. Try fuzzy match (contains) against both versions
    info = zaimData.find(z => {
      const zNorm = normalizeName(z.majlis);
      return (zNorm.length > 3 && targetBangla.includes(zNorm)) || 
             (targetBangla.length > 3 && zNorm.includes(targetBangla)) ||
             (zNorm.length > 3 && targetEnglish.includes(zNorm)) || 
             (targetEnglish.length > 3 && zNorm.includes(targetEnglish));
    });
    if (info) return info;

    // 4. Try word-based intersection match
    const targetWords = majlisName.toLowerCase().replace(/majlis/g, '').split(/[\s\.\(\)]+/).filter(p => p.length > 2);
    if (targetWords.length > 0) {
      info = zaimData.find(z => {
        const zWords = z.majlis.toLowerCase().replace(/majlis/g, '').split(/[\s\.\(\)]+/).filter(p => p.length > 2);
        return targetWords.some(tw => zWords.some(zw => zw.includes(tw) || tw.includes(zw)));
      });
    }
    
    return info || null;
  };

  const rankingRefs = {
    small: useRef<HTMLDivElement>(null),
    medium: useRef<HTMLDivElement>(null),
    large: useRef<HTMLDivElement>(null),
  };

  const exportRankingRefs = {
    small: useRef<HTMLDivElement>(null),
    medium: useRef<HTMLDivElement>(null),
    large: useRef<HTMLDivElement>(null),
  };

  const downloadCardAsImage = (category: 'small' | 'medium' | 'large') => {
    // Prefer exportRankingRefs for high quality top-10 cards
    const node = exportRankingRefs[category].current || rankingRefs[category].current;
    if (!node) return;

    toPng(node, { 
      backgroundColor: '#ffffff',
      pixelRatio: 2, // High quality
    })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `Top-10-${category}-Majlis-Appraisal-2026.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error('An error occurred during image generation:', err);
      });
  };

  const sendWhatsAppReport = (majlisName: string, recipientType: 'zaim' | 'district' | 'region') => {
    console.log(`Attempting to send report for: ${majlisName} to ${recipientType}`);
    
    const zaimInfo = findZaimInfo(majlisName);
    const normalizedTarget = normalizeName(majlisName);
    const majlis = data.find(m => normalizeName(m.majlisName) === normalizedTarget);

    // Get mapping for this majlis to check for direct WhatsApp number
    const mapping = masterMajlisNames.find(m => 
      normalizeName(m.bangla) === normalizedTarget || 
      normalizeName(m.english) === normalizedTarget
    );

    if (!majlis) {
      alert(`Data for Majlis "${majlisName}" not found in the current month's report.`);
      return;
    }

    let phone = '';
    let recipientName = '';
    let roleTitle = '';
    
    // Prioritize mapping's info for all recipient types
    if (recipientType === 'zaim' && mapping?.whatsappNumber) {
      phone = mapping.whatsappNumber;
      recipientName = zaimInfo?.zaimName || 'Zaim';
      roleTitle = 'Zaim';
    } else if (recipientType === 'district' && mapping?.districtNazimMobile) {
      phone = mapping.districtNazimMobile;
      recipientName = mapping.districtNazimName || zaimInfo?.districtNazimName || 'District Nazim-e-Ala';
      roleTitle = 'District Nazim-e-Ala';
    } else if (recipientType === 'region' && mapping?.regionNazimMobile) {
      phone = mapping.regionNazimMobile;
      recipientName = mapping.regionNazimName || zaimInfo?.regionNazimName || 'Region Nazim-e-Ala';
      roleTitle = 'Region Nazim-e-Ala';
    } else if (zaimInfo) {
      if (recipientType === 'zaim') {
        phone = zaimInfo.zaimMobile;
        recipientName = zaimInfo.zaimName;
        roleTitle = 'Zaim';
      } else if (recipientType === 'district') {
        phone = zaimInfo.districtNazimMobile;
        recipientName = zaimInfo.districtNazimName;
        roleTitle = 'District Nazim-e-Ala';
      } else {
        phone = zaimInfo.regionNazimMobile;
        recipientName = zaimInfo.regionNazimName;
        roleTitle = 'Region Nazim-e-Ala';
      }
    }

    if (!phone) {
      const mapping = masterMajlisNames.find(m => 
        normalizeName(m.bangla) === normalizedTarget || 
        normalizeName(m.english) === normalizedTarget
      );
      const targetBangla = mapping ? normalizeName(mapping.bangla) : normalizedTarget;
      const targetEnglish = mapping ? normalizeName(mapping.english) : normalizedTarget;

      const closestMatches = zaimData
        .map(z => z.majlis)
        .filter(name => {
          const norm = normalizeName(name);
          return norm.includes(targetBangla) || targetBangla.includes(norm) ||
                 norm.includes(targetEnglish) || targetEnglish.includes(norm);
        })
        .slice(0, 3);

      const matchMsg = closestMatches.length > 0 
        ? `\n\nClosest matches found in Zaim sheet: ${closestMatches.join(', ')}`
        : `\n\nNo similar names found in the Zaim sheet. Please ensure "${majlisName}" exists in the "Zaim" sheet.`;

      alert(`Phone number for ${roleTitle || recipientType} not found for "${majlisName}".${matchMsg}`);
      return;
    }

    // Clean phone number (remove spaces, dashes, etc.)
    let cleanPhone = phone.replace(/\D/g, '');
    
    // Bangladesh specific: if starts with 0 and is 11 digits, prepend 88
    if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
      cleanPhone = '88' + cleanPhone;
    }
    
    // Generate report message
    const ratio = calculateRatio(majlis, currentRatioField);
    const perf = getPerformanceClass(ratio, currentRatioField);

    // Include key metrics in the message
    const keyMetrics = [
      `*${FIELD_LABELS.tajnidMembers}:* ${majlis.tajnidMembers}`,
      `*${FIELD_LABELS.amelaMeeting}:* ${majlis.amelaMeeting}`,
      `*${FIELD_LABELS.generalMeeting}:* ${majlis.generalMeeting}`,
      `*${FIELD_LABELS.generalMeetingAttendance}:* ${majlis.generalMeetingAttendance}`,
      `*${FIELD_LABELS.fiveTimePrayers}:* ${majlis.fiveTimePrayers}`,
      `*${FIELD_LABELS.congregationalPrayers}:* ${majlis.congregationalPrayers}`,
      `*${FIELD_LABELS.mtaConnection}:* ${majlis.mtaConnection}`,
    ].join('\n');

    const message = `*Majlis Report - ${selectedMonth}*\n` +
      `*Majlis:* ${majlisName}\n` +
      `*District:* ${mapping?.district || zaimInfo?.district || 'N/A'}\n\n` +
      `*Performance Summary:* \n` +
      `*Metric:* ${currentRatioField === 'all' ? 'All Metrics Average' : FIELD_LABELS[currentRatioField]}\n` +
      `*Ratio:* ${ratio.toFixed(2)}%\n` +
      `*Grade:* ${perf?.label || 'N/A'}\n\n` +
      `*Detailed Data:* \n${keyMetrics}\n\n` +
      `Assalamu Alaikum ${recipientName},\n` +
      `Here is the monthly report for Majlis ${majlisName}. Please review.`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    
    console.log(`Opening WhatsApp for ${majlisName} (${recipientType}): ${whatsappUrl}`);
    const newWindow = window.open(whatsappUrl, '_blank');
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      console.warn('Popup blocked, using location.href fallback');
      window.location.href = whatsappUrl;
    }
  };

  useEffect(() => {
    loadData(selectedMonth);
  }, [selectedMonth]);

  const zillaSummaries = useMemo(() => {
    const summaries: Record<string, any> = {};
    data.forEach(item => {
      const normalizedTarget = normalizeName(item.majlisName);
      const mapping = masterMajlisNames.find(m => 
        normalizeName(m.bangla) === normalizedTarget || 
        normalizeName(m.english) === normalizedTarget
      );
      
      let zilla = mapping?.district;
      
      if (!zilla) {
        const zaimInfo = findZaimInfo(item.majlisName);
        zilla = zaimInfo?.district;
      }

      if (zilla === '#N/A' || zilla === '' || zilla === 'null' || zilla === 'undefined') zilla = undefined;
      zilla = zilla || 'Unknown';
      
      if (!summaries[zilla]) {
        summaries[zilla] = { name: zilla, majlisCount: 0, tajnidMembers: 0, totals: {}, majlisList: [] };
      }
      summaries[zilla].majlisCount++;
      summaries[zilla].tajnidMembers += item.tajnidMembers;
      summaries[zilla].majlisList.push(item);
      
      Object.keys(FIELD_LABELS).forEach(key => {
        const k = key as keyof MajlisData;
        if (typeof item[k] === 'number') {
          summaries[zilla].totals[k] = (summaries[zilla].totals[k] || 0) + (item[k] as number);
        }
      });
    });
    return Object.values(summaries).sort((a: any, b: any) => {
      if (a.name === 'Unknown') return 1;
      if (b.name === 'Unknown') return -1;
      return a.name.localeCompare(b.name);
    });
  }, [data, zaimData, masterMajlisNames]);

  const regionSummaries = useMemo(() => {
    const summaries: Record<string, any> = {};
    data.forEach(item => {
      const normalizedTarget = normalizeName(item.majlisName);
      const mapping = masterMajlisNames.find(m => 
        normalizeName(m.bangla) === normalizedTarget || 
        normalizeName(m.english) === normalizedTarget
      );
      
      let region = mapping?.region;
      
      if (!region) {
        // Fallback to searching Zaim data for region if not in mapping
        const zaimInfo = findZaimInfo(item.majlisName);
        // Assuming zaimInfo might have region info eventually or we can derive it?
        // Current ZaimData doesn't have region, but let's keep it robust.
      }

      if (region === '#N/A' || region === '' || region === 'null' || region === 'undefined') region = undefined;
      region = region || 'Unknown';

      if (!summaries[region]) {
        summaries[region] = { name: region, majlisCount: 0, tajnidMembers: 0, totals: {}, majlisList: [] };
      }
      summaries[region].majlisCount++;
      summaries[region].tajnidMembers += item.tajnidMembers;
      summaries[region].majlisList.push(item);
      
      Object.keys(FIELD_LABELS).forEach(key => {
        const k = key as keyof MajlisData;
        if (typeof item[k] === 'number') {
          summaries[region].totals[k] = (summaries[region].totals[k] || 0) + (item[k] as number);
        }
      });
    });
    return Object.values(summaries).sort((a: any, b: any) => {
      if (a.name === 'Unknown') return 1;
      if (b.name === 'Unknown') return -1;
      return a.name.localeCompare(b.name);
    });
  }, [data, masterMajlisNames]);

  const sendGroupWhatsAppReport = (groupName: string, type: 'district' | 'region', majlisList: MajlisData[]) => {
    let phone = '';
    let recipientName = '';
    let roleTitle = type === 'district' ? 'District Nazim-e-Ala' : 'Region Nazim-e-Ala';

    // Find phone number from any majlis in the group
    for (const m of majlisList) {
      const zaimInfo = findZaimInfo(m.majlisName);
      const normalizedTarget = normalizeName(m.majlisName);
      const mapping = masterMajlisNames.find(map => 
        normalizeName(map.bangla) === normalizedTarget || 
        normalizeName(map.english) === normalizedTarget
      );

      if (type === 'district') {
        phone = mapping?.districtNazimMobile || zaimInfo?.districtNazimMobile || '';
        recipientName = mapping?.districtNazimName || zaimInfo?.districtNazimName || '';
      } else {
        phone = mapping?.regionNazimMobile || zaimInfo?.regionNazimMobile || '';
        recipientName = mapping?.regionNazimName || zaimInfo?.regionNazimName || '';
      }
      if (phone) break;
    }

    if (!phone) {
      alert(`Phone number for ${roleTitle} not found for "${groupName}".`);
      return;
    }

    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
      cleanPhone = '88' + cleanPhone;
    }

    const totalTajnid = majlisList.reduce((acc, curr) => acc + curr.tajnidMembers, 0);
    const ratio = currentRatioField === 'all'
      ? majlisList.reduce((acc, m) => acc + calculateRatio(m, 'all'), 0) / majlisList.length
      : (totalTajnid > 0 ? (majlisList.reduce((acc, curr) => acc + (curr[currentRatioField] as number || 0), 0) / totalTajnid) * 100 : 0);

    let message = `*${type === 'district' ? 'Zilla' : 'Region'} Report - ${selectedMonth}*\n` +
      `*${type === 'district' ? 'Zilla' : 'Region'}:* ${groupName}\n` +
      `*Majlis Count:* ${majlisList.length}\n` +
      `*Total Tajnid:* ${totalTajnid}\n\n` +
      `*Overall Performance (${currentRatioField === 'all' ? 'All Metrics Average' : FIELD_LABELS[currentRatioField]}):*\n` +
      `*Ratio:* ${ratio.toFixed(2)}%\n\n` +
      `*Majlis-wise Breakdown:*\n`;

    majlisList.forEach(m => {
      const mRatio = calculateRatio(m, currentRatioField);
      message += `- ${m.majlisName}: ${mRatio.toFixed(1)}%\n`;
    });

    message += `\nAssalamu Alaikum ${recipientName || roleTitle},\n` +
      `Here is the monthly summary report for ${groupName}. Please review.`;

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const sendAllGroupReports = (type: 'district' | 'region') => {
    const summaries = type === 'district' ? zillaSummaries : regionSummaries;
    if (confirm(`Are you sure you want to send reports to all ${summaries.length} ${type === 'district' ? 'Zillas' : 'Regions'}? This will open multiple WhatsApp tabs.`)) {
      summaries.forEach((group: any, index: number) => {
        // Add a small delay to prevent browser from blocking multiple popups
        setTimeout(() => {
          sendGroupWhatsAppReport(group.name, type, group.majlisList);
        }, index * 1000);
      });
    }
  };

  const [showAllStats, setShowAllStats] = useState(false);

  const stats = useMemo(() => {
    if (data.length === 0) return null;

    const calculateTotals = (items: MajlisData[]) => {
      const totals: Record<string, number> = {};
      // Use data[0] to determine which fields are numeric
      const referenceItem = data[0];
      if (!referenceItem) return totals;

      Object.keys(FIELD_LABELS).forEach(key => {
        const k = key as keyof MajlisData;
        if (typeof referenceItem[k] === 'number') {
          totals[key] = items.reduce((acc, curr) => acc + (curr[k] as number || 0), 0);
        }
      });
      return totals;
    };

    // Calculate totals for current month (strictly filtered for total consistency)
    const current = calculateTotals(filteredData);
    
    // Calculate average of all previous months for trend comparison
    const previousTotalsList = allPrevMonthsData.map(monthData => {
      // For trends, we filter previous months by the SAME criteria as current
      const filteredMonthData = monthData.filter(item => {
        const matchesSearch = item.majlisName.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;
        
        // If searching, show all matches regardless of size as requested
        if (searchTerm.trim() !== '') return true;
        
        if (selectedSizeCategory !== 'all') {
          const tajnid = item.tajnidMembers;
          if (selectedSizeCategory === 'small' && tajnid > sizeThresholds.small) return false;
          if (selectedSizeCategory === 'medium' && (tajnid <= sizeThresholds.small || tajnid > sizeThresholds.medium)) return false;
          if (selectedSizeCategory === 'large' && tajnid <= sizeThresholds.medium) return false;
        }
        return true;
      });
      return calculateTotals(filteredMonthData);
    });

    const previousAverage: Record<string, number> = {};
    if (previousTotalsList.length > 0) {
      Object.keys(current).forEach(key => {
        const sum = previousTotalsList.reduce((acc, curr) => acc + (curr[key] || 0), 0);
        previousAverage[key] = sum / previousTotalsList.length;
      });
    }

    const getTrend = (currVal: number, avgVal: number | null) => {
      if (avgVal === null || avgVal === undefined) return null;
      // Use a small threshold to avoid showing trend for tiny differences
      const diff = currVal - avgVal;
      if (diff > 0.1) return 'up';
      if (diff < -0.1) return 'down';
      return 'stable';
    };

    const allStats: { id: string; label: string; value: number; trend: 'up' | 'down' | 'stable' | null }[] = Object.keys(current).map(key => ({
      id: key,
      label: FIELD_LABELS[key as keyof MajlisData],
      value: current[key],
      trend: getTrend(current[key], previousTotalsList.length > 0 ? previousAverage[key] : null)
    }));

    return allStats;
  }, [filteredData, allPrevMonthsData, searchTerm, selectedSizeCategory, sizeThresholds]);

  const missingReportsInfo = useMemo(() => {
    if (masterMajlisNames.length === 0) return [];
    
    const submittedDataMap = new Map<string, MajlisData>(
      data.map(m => [normalizeName(m.majlisName), m])
    );

    return masterMajlisNames
      .map(mapping => {
        const name = mapping.bangla;
        const normalized = normalizeName(name);
        const submission = submittedDataMap.get(normalized);
        // A report is missing if it's not in the sheet OR if Tajnid is 0
        const isMissing = !submission || submission.tajnidMembers === 0;
        return {
          name,
          isMissing,
          status: !submission ? 'Not in sheet' : 'Blank Tajnid'
        };
      })
      .filter(item => item.isMissing)
      .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b));
  }, [masterMajlisNames, data, searchTerm]);

  const sendReminder = (majlisName: string) => {
    const zaimInfo = findZaimInfo(majlisName);
    const normalizedTarget = normalizeName(majlisName);

    // Get mapping for this majlis to check for direct WhatsApp number
    const mapping = masterMajlisNames.find(m => 
      normalizeName(m.bangla) === normalizedTarget || 
      normalizeName(m.english) === normalizedTarget
    );

    // Prioritize mapping's whatsappNumber
    let phone = mapping?.whatsappNumber || zaimInfo?.zaimMobile;

    if (!phone) {
      const targetBangla = mapping ? normalizeName(mapping.bangla) : normalizedTarget;
      const targetEnglish = mapping ? normalizeName(mapping.english) : normalizedTarget;

      const closestMatches = zaimData
        .map(z => z.majlis)
        .filter(name => {
          const norm = normalizeName(name);
          return norm.includes(targetBangla) || targetBangla.includes(norm) ||
                 norm.includes(targetEnglish) || targetEnglish.includes(norm);
        })
        .slice(0, 3);

      const matchMsg = closestMatches.length > 0 
        ? `\n\nClosest matches found in Zaim sheet: ${closestMatches.join(', ')}`
        : `\n\nNo similar names found in the Zaim sheet. Please ensure "${majlisName}" exists in the "Zaim" sheet.`;

      alert(`Contact info for Zaim of "${majlisName}" not found.${matchMsg}`);
      return;
    }

    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0') && formattedPhone.length === 11) {
      formattedPhone = '88' + formattedPhone;
    }

    const message = `*Reminder: Monthly Report - ${selectedMonth}*\n\n` +
      `আসসালামু আলাইকুম\n` +
      `জনাব যয়িম(আলা), \n` +
      `${majlisName} মজলিস\n\n` +
      `*${majlisName} মজলিস*-এর ${selectedMonth} মাসিক প্রতিবেদনটি এখনও পাওয়া যায়নি`;

    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const chartData = useMemo(() => {
    return filteredData
      .map(item => {
        const ratio = calculateRatio(item, currentRatioField);
        return {
          name: item.majlisName,
          ratio: parseFloat(ratio.toFixed(2)),
          value: currentRatioField === 'all' ? 'Avg' : (item[currentRatioField] as number || 0),
          tajnid: item.tajnidMembers,
          label: currentRatioField === 'all' ? 'All Metrics' : FIELD_LABELS[currentRatioField]
        };
      })
      .filter(item => item.ratio <= 100)
      .sort((a, b) => b.ratio - a.ratio);
  }, [filteredData, currentRatioField]);

  const needsAttentionInfo = useMemo(() => {
    return chartData
      .filter(item => item.ratio < thresholds.C)
      .sort((a, b) => a.ratio - b.ratio);
  }, [chartData, thresholds.C]);

  const topPerformersInfo = useMemo(() => {
    return chartData
      .filter(item => item.ratio >= thresholds.B)
      .sort((a, b) => b.ratio - a.ratio);
  }, [chartData, thresholds.B]);

  const appraisalData = useMemo(() => {
    const activeMonths = appraisalMonths.filter(m => 
      Array.isArray(allMonthsFullData[m]) && (allMonthsFullData[m] as MajlisData[]).length > 0
    );

    const majlisNames = Array.from(new Set([
      ...masterMajlisNames.map(m => m.bangla),
      ...activeMonths.flatMap((month) => {
        const monthData = allMonthsFullData[month];
        if (!Array.isArray(monthData)) return [];
        return monthData.map(m => m.majlisName);
      })
    ])).filter(Boolean);

    if (activeMonths.length === 0) return [];

    const stats = majlisNames.map(name => {
      let reportsCount = 0;
      const scoresSum: Record<string, number> = {};
      const fieldCounts: Record<string, number> = {};
      let totalTajnid = 0;
      let tajnidCounts = 0;

      activeMonths.forEach(month => {
        const monthData = allMonthsFullData[month];
        const record = monthData?.find(m => normalizeName(m.majlisName) === normalizeName(name) || m.majlisName === name);

        if (record && record.tajnidMembers > 0) {
          reportsCount++;
          totalTajnid += record.tajnidMembers;
          tajnidCounts++;

          appraisalFields.forEach(field => {
            const ratio = calculateRatio(record, field);
            scoresSum[field as string] = (scoresSum[field as string] || 0) + ratio;
            fieldCounts[field as string] = (fieldCounts[field as string] || 0) + 1;
          });
        }
      });

      if (reportsCount === 0) return null;

      const avgTajnid = totalTajnid / tajnidCounts;
      const finalAverages: Record<string, number> = {};
      let aggregateScoreSum = 0;
      
      appraisalFields.forEach(field => {
        const avg = fieldCounts[field as string] > 0 ? scoresSum[field as string] / fieldCounts[field as string] : 0;
        finalAverages[field as string] = avg;
        aggregateScoreSum += avg;
      });

      const baseScore = appraisalFields.length > 0 ? aggregateScoreSum / appraisalFields.length : 0;
      
      // Bonus for reporting frequency: (reports / total available months) * weight
      const reportingRatio = reportsCount / activeMonths.length;
      const reportingBonus = reportingRatio * appraisalReportWeight;
      
      const finalScore = baseScore + reportingBonus;

      let category: 'small' | 'medium' | 'large' = 'small';
      if (avgTajnid > sizeThresholds.medium) category = 'large';
      else if (avgTajnid > sizeThresholds.small) category = 'medium';

      return {
        majlisName: name,
        avgTajnid,
        reportsReceived: reportsCount,
        reportingRatio,
        performanceScores: finalAverages,
        finalScore,
        category
      };
    }).filter(Boolean);

    return stats.sort((a, b) => b!.finalScore - a!.finalScore);
  }, [allMonthsFullData, appraisalFields, appraisalReportWeight, sizeThresholds, masterMajlisNames, appraisalMonths]);

  const ratioFields = PERFORMANCE_FIELDS;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <LayoutDashboard size={18} />
          </div>
          <h1 className="font-bold text-sm">Majlis Dash</h1>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 z-50 transition-transform duration-300 lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <LayoutDashboard size={24} />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">Majlis Dash</h1>
                <p className="text-xs text-slate-500 font-medium">Analysis 2026</p>
              </div>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-2 text-slate-400 hover:bg-slate-50 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => {
                setView('dashboard');
                setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                view === 'dashboard' ? "bg-indigo-50 text-indigo-600 font-semibold" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <BarChart3 size={20} />
              Dashboard
            </button>
            <button 
              onClick={() => {
                setView('table');
                setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                view === 'table' ? "bg-indigo-50 text-indigo-600 font-semibold" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <TableIcon size={20} />
              Data Table
            </button>
            <button 
              onClick={() => {
                setView('zilla');
                setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                view === 'zilla' ? "bg-indigo-50 text-indigo-600 font-semibold" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <MapPin size={20} />
              Zilla View
            </button>
            <button 
              onClick={() => {
                setView('region');
                setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                view === 'region' ? "bg-indigo-50 text-indigo-600 font-semibold" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <Globe size={20} />
              Region View
            </button>
            <button 
              onClick={() => {
                setView('comparison');
                setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                view === 'comparison' ? "bg-indigo-50 text-indigo-600 font-semibold" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <History size={20} />
              Comparison
            </button>
            <button 
              onClick={() => {
                setView('appraisal');
                setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                view === 'appraisal' ? "bg-indigo-50 text-indigo-600 font-semibold" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <ClipboardList size={20} />
              Yearly Appraisal
            </button>
          </nav>

          {view !== 'comparison' && view !== 'appraisal' && (
            <div className="mt-12 flex-1 overflow-y-auto pb-6">
              <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Select Month</p>
              <div className="grid grid-cols-2 gap-2 px-2">
                {MONTHS.map(m => (
                  <button
                    key={m}
                    onClick={() => {
                      setSelectedMonth(m);
                      setIsSidebarOpen(false);
                    }}
                    className={cn(
                      "px-2 py-2 rounded-lg text-xs font-medium transition-all",
                      selectedMonth === m ? "bg-indigo-600 text-white shadow-md" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {m.replace('26', '')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 p-4 lg:p-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{selectedMonth} Performance</h2>
            <p className="text-slate-500">Real-time analysis of Majlis activities</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Grade:</span>
              <div className="flex gap-1">
                {['all', 'A', 'B', 'C', 'D', 'E', 'F'].map(grade => (
                  <button
                    key={grade}
                    onClick={() => setSelectedGrade(grade)}
                    className={cn(
                      "px-2 h-6 rounded-md text-[10px] font-bold transition-all flex items-center gap-1",
                      selectedGrade === grade 
                        ? "bg-indigo-600 text-white shadow-sm" 
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                  >
                    <span>{grade === 'all' ? 'All' : grade}</span>
                    <span className={cn(
                      "text-[8px] opacity-60 px-1 rounded-full",
                      selectedGrade === grade ? "bg-white/20" : "bg-slate-200"
                    )}>
                      {gradeCounts[grade] || 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search Majlis..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-full md:w-64"
              />
            </div>
            <button 
              onClick={exportToCSV}
              className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all flex items-center gap-2 px-3"
              title="Export to CSV"
            >
              <Download size={18} />
              <span className="text-xs font-bold hidden sm:inline">Export</span>
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all"
            >
              <Settings size={20} />
            </button>
            <button 
              onClick={() => loadData(selectedMonth)}
              className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>
        
        {sheetStatus && (sheetStatus.main === "not set") && (
          <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4 text-amber-800">
            <div className="p-3 bg-amber-100 rounded-xl">
              <AlertCircle size={24} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-amber-900 mb-1">Google Sheets Not Configured</h4>
              <p className="text-sm opacity-90">
                The application needs a Google Sheet ID to fetch data. Please set the <code className="bg-amber-100 px-1 rounded font-bold">GOOGLE_SHEET_ID</code> secret in the AI Studio Secrets panel.
                Your sheet must also be <strong>Published to the web</strong> (File &gt; Share &gt; Publish to web).
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
            <AlertCircle size={20} />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {view !== 'comparison' && view !== 'appraisal' && (
          loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg animate-pulse" />
                    <div className="w-12 h-4 bg-slate-100 rounded animate-pulse" />
                  </div>
                  <div className="w-24 h-2 bg-slate-100 rounded mb-2 animate-pulse" />
                  <div className="w-16 h-6 bg-slate-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : stats && stats.length > 0 ? (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Summary Statistics (Total Counts)</h3>
                <button 
                  onClick={() => setShowAllStats(!showAllStats)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  {showAllStats ? 'Show Less' : `Show All (${stats.length})`}
                </button>
              </div>
              <motion.div 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
              >
                {(showAllStats ? stats : stats.slice(0, 5)).map(({ id, label, value, trend }) => (
                  <StatCard 
                    key={id}
                    icon={getIconForField(id)} 
                    label={label} 
                    value={value} 
                    trend={trend}
                    color={getColorForField(id)} 
                  />
                ))}
              </motion.div>
            </div>
          ) : !error && (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center mb-8">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="text-slate-400" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Data Found</h3>
              <p className="text-slate-500">We couldn't find any records for {selectedMonth}. Check your Google Sheet tabs.</p>
            </div>
          )
        )}

        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
                {/* Performance Ranking Chart with Size Selector */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-4">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                          <BarChart3 size={20} className="text-indigo-600" />
                          Majlis Performance Ranking
                        </h3>
                        <select 
                          value={selectedSizeCategory}
                          onChange={(e) => setSelectedSizeCategory(e.target.value as any)}
                          className="text-xs font-bold bg-indigo-50 text-indigo-700 border-none rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                        >
                          <option value="all">All Majlis</option>
                          <option value="small">Small (Tajnid ≤ {sizeThresholds.small})</option>
                          <option value="medium">Medium (Tajnid ≤ {sizeThresholds.medium})</option>
                          <option value="large">Large (Tajnid &gt; {sizeThresholds.medium})</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Metric:</span>
                        <select 
                          value={currentRatioField}
                          onChange={(e) => setCurrentRatioField(e.target.value as any)}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          <option value="all">All Metrics (Average)</option>
                          {ratioFields.map(field => (
                            <option key={field} value={field}>{FIELD_LABELS[field]}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="h-[450px]">
                      {(() => {
                        const filteredChartData = chartData;

                        return filteredChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={filteredChartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} unit="%" />
                              <Tooltip 
                                formatter={(value: any, name: any, props: any) => [
                                  `${value}% (${props.payload.value} / ${props.payload.tajnid})`, 
                                  'Ratio'
                                ]}
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              />
                              <Legend iconType="circle" />
                              <Bar dataKey="ratio" name={`${currentRatioField === 'all' ? 'All Metrics' : FIELD_LABELS[currentRatioField]} হার (%)`} fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <AlertCircle size={32} className="mb-2 opacity-20" />
                            <p className="text-sm font-medium">No data for this category</p>
                          </div>
                        );
                      })()}
                    </div>
                    <p className="mt-4 text-xs text-slate-400 italic text-center">
                      * Ratio = ({currentRatioField === 'all' ? 'All Metrics Avg' : FIELD_LABELS[currentRatioField]} / {FIELD_LABELS.tajnidMembers}) × 100
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Top Performers */}
                    {topPerformersInfo.length > 0 && (
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <TrendingUp size={16} className="text-emerald-500" />
                          Top Performers ({topPerformersInfo.length})
                        </h3>
                        <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          <div className="space-y-2">
                            {topPerformersInfo.map((item, idx) => {
                              const perf = getPerformanceClass(item.ratio, currentRatioField);
                              return (
                                <div key={idx} className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                                  <div>
                                    <p className="text-[11px] font-bold text-slate-900">{item.name}</p>
                                    <div className="flex items-center gap-2">
                                      <p className="text-[10px] text-slate-500">{item.value} / {item.tajnid}</p>
                                      <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase", perf?.color)}>
                                        {perf?.label}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="text-right">
                                      <p className="text-sm font-bold text-emerald-600">{item.ratio}%</p>
                                      <p className="text-[9px] font-bold text-emerald-500 uppercase">Rank #{idx + 1}</p>
                                    </div>
                                    <button 
                                      onClick={() => sendWhatsAppReport(item.name, 'zaim')}
                                      className="p-2 bg-white text-emerald-600 rounded-lg border border-emerald-200 hover:bg-emerald-50 transition-colors shadow-sm"
                                      title="Send Report to Zaim"
                                    >
                                      <MessageSquare size={14} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Needs Attention */}
                    {needsAttentionInfo.length > 0 && (
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <TrendingDown size={16} className="text-rose-500" />
                          Needs Attention ({needsAttentionInfo.length})
                        </h3>
                        <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          <div className="space-y-2">
                            {needsAttentionInfo.map((item, idx) => {
                              const perf = getPerformanceClass(item.ratio, currentRatioField);
                              return (
                                <div key={idx} className="flex items-center justify-between p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                                  <div>
                                    <p className="text-[11px] font-bold text-slate-900">{item.name}</p>
                                    <div className="flex items-center gap-2">
                                      <p className="text-[10px] text-slate-500">{item.value} / {item.tajnid}</p>
                                      <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase", perf?.color)}>
                                        {perf?.label}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="text-right">
                                      <p className="text-sm font-bold text-rose-600">{item.ratio}%</p>
                                    </div>
                                    <button 
                                      onClick={() => sendWhatsAppReport(item.name, 'zaim')}
                                      className="p-2 bg-white text-rose-600 rounded-lg border border-rose-200 hover:bg-rose-50 transition-colors shadow-sm"
                                      title="Send Report to Zaim"
                                    >
                                      <MessageSquare size={14} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-8">

                    {/* Contact Data Status */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                          <Users size={16} className="text-indigo-500" />
                          Contact Data
                        </h3>
                        <div className="flex items-center gap-2">
                          {zaimData.length > 0 && (
                            <button 
                              onClick={() => setShowZaimDebug(!showZaimDebug)}
                              className="text-[10px] text-indigo-600 hover:underline font-bold uppercase"
                            >
                              {showZaimDebug ? 'Hide' : 'View'}
                            </button>
                          )}
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                            zaimData.length > 0 ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                          )}>
                            {zaimData.length > 0 ? `${zaimData.length} Loaded` : 'Not Loaded'}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        WhatsApp buttons require data from the <strong>"Zaim"</strong> sheet to function. 
                        {zaimData.length === 0 && !zaimError && " Please ensure the sheet name is exactly 'Zaim' and contains data."}
                        {zaimError && (
                          <span className="block mt-1 text-rose-500 font-medium">
                            Error: {zaimError}
                          </span>
                        )}
                      </p>

                      {showZaimDebug && zaimData.length > 0 && (
                        <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 max-h-48 overflow-y-auto">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Loaded Majlis Names:</p>
                          <div className="grid grid-cols-1 gap-1">
                            {zaimData.slice(0, 50).map((z, i) => (
                              <div key={i} className="text-[10px] text-slate-600 flex justify-between border-b border-slate-100 pb-1">
                                <span>{z.majlis}</span>
                                <span className="text-slate-400">{z.zaimMobile ? '✓' : '✗'}</span>
                              </div>
                            ))}
                            {zaimData.length > 50 && <p className="text-[10px] text-slate-400 mt-1">...and {zaimData.length - 50} more</p>}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Missing Reports */}
                    {missingReportsInfo.length > 0 && (
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <AlertCircle size={16} className="text-amber-500" />
                          Missing Reports ({missingReportsInfo.length})
                        </h3>
                        <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          <div className="space-y-2">
                            {missingReportsInfo.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                                <div>
                                  <p className="text-[11px] font-bold text-slate-900">{item.name}</p>
                                  <span className={cn(
                                    "text-[9px] font-bold uppercase",
                                    item.status === 'Blank Tajnid' ? "text-rose-600" : "text-amber-600"
                                  )}>
                                    {item.status === 'Blank Tajnid' ? 'Blank Data' : 'Not Submitted'}
                                  </span>
                                </div>
                                <button 
                                  onClick={() => sendReminder(item.name)}
                                  className="p-2 bg-white text-amber-600 rounded-lg border border-amber-200 hover:bg-amber-50 transition-colors shadow-sm"
                                  title="Send Reminder to Zaim"
                                >
                                  <MessageSquare size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              {/* Summary Table Preview */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-lg font-bold">Majlis Performance Ranking by {currentRatioField === 'all' ? 'All Metrics' : FIELD_LABELS[currentRatioField]} Ratio</h3>
                  <button onClick={() => setView('table')} className="text-indigo-600 font-semibold text-sm hover:underline">View All Data</button>
                </div>
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm">
                      <tr>
                        <th className="px-6 py-4 font-bold sticky top-0 bg-slate-50 z-10">Actions</th>
                        <th className="px-6 py-4 font-bold">Majlis Name</th>
                        <th className="px-6 py-4 font-bold">Size</th>
                        <th className="px-6 py-4 font-bold">Tajnid</th>
                        <th className="px-6 py-4 font-bold">{currentRatioField === 'all' ? 'All Metrics' : FIELD_LABELS[currentRatioField]}</th>
                        <th className="px-6 py-4 font-bold">Ratio (%)</th>
                        <th className="px-6 py-4 font-bold">Performance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {chartData.map((item, idx) => {
                        const size = getMajlisSize(item.tajnid);
                        const perf = getPerformanceClass(item.ratio, currentRatioField);
                        return (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => sendWhatsAppReport(item.name, 'zaim')}
                                  className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors"
                                  title="Send to Zaim"
                                >
                                  <MessageSquare size={14} />
                                </button>
                                <button 
                                  onClick={() => sendWhatsAppReport(item.name, 'district')}
                                  className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                  title="Send to District Nazim"
                                >
                                  <MessageSquare size={14} />
                                </button>
                                <button 
                                  onClick={() => sendWhatsAppReport(item.name, 'region')}
                                  className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                                  title="Send to Region Nazim"
                                >
                                  <MessageSquare size={14} />
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                            <td className="px-6 py-4">
                              <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", size.color)}>
                                {size.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-600">{item.tajnid}</td>
                            <td className="px-6 py-4 text-slate-600">{item.value}</td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold">
                                {item.ratio}%
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {perf && (
                                <span className={cn("px-2 py-1 rounded-lg text-[10px] font-bold uppercase", perf.color)}>
                                  {perf.label}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'table' && (
            <motion.div 
              key="table"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-bold">Full Data Table - {selectedMonth}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Filters:</span>
                    <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                      {selectedSizeCategory === 'all' ? 'All Sizes' : `${selectedSizeCategory.charAt(0).toUpperCase() + selectedSizeCategory.slice(1)} Majlis`}
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                      {selectedGrade === 'all' ? 'All Grades' : `Grade ${selectedGrade}`}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase hidden sm:inline">Size:</span>
                    <select 
                      value={selectedSizeCategory}
                      onChange={(e) => setSelectedSizeCategory(e.target.value as any)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs font-bold text-slate-600"
                    >
                      <option value="all">All Sizes</option>
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase hidden sm:inline">Metric:</span>
                    <select 
                      value={currentRatioField}
                      onChange={(e) => setCurrentRatioField(e.target.value as any)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs font-bold text-slate-600"
                    >
                      <option value="all">📊 All Metrics (Average)</option>
                      {ratioFields.map(field => (
                        <option key={field} value={field}>{FIELD_LABELS[field]}</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all"
                  >
                    <Download size={16} />
                    Export CSV
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[600px] relative">
                {filteredData.length === 0 ? (
                  <div className="py-20 text-center bg-slate-50/30">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="text-slate-300" size={32} />
                    </div>
                    <h4 className="font-bold text-slate-800">No matching Majlis found</h4>
                    <p className="text-sm text-slate-500 mt-1">Try adjusting your filters or search terms.</p>
                    <button 
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedGrade('all');
                        setSelectedSizeCategory('all');
                      }}
                      className="mt-4 text-xs font-bold text-indigo-600 hover:underline"
                    >
                      Clear All Filters
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-50 z-20 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 sticky top-0 left-0 bg-slate-50 z-40 w-[140px] min-w-[140px]">
                        Actions
                      </th>
                      {Object.keys(FIELD_LABELS).map((key) => {
                        const isSL = key === 'sl';
                        const isMajlis = key === 'majlisName';
                        return (
                          <th 
                            key={key} 
                            className={cn(
                              "px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap",
                              isSL && "sticky top-0 left-[140px] bg-slate-50 z-40 w-[80px] min-w-[80px]",
                              isMajlis && "sticky top-0 left-[220px] bg-slate-50 z-40 w-[220px] min-w-[220px]",
                              !isSL && !isMajlis && "z-10"
                            )}
                          >
                            {FIELD_LABELS[key as keyof MajlisData]}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors text-sm">
                        <td className="px-4 py-3 text-slate-600 border-b border-slate-50 sticky left-0 bg-white z-20 w-[140px] min-w-[140px]">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => sendWhatsAppReport(item.majlisName, 'zaim')}
                              className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors"
                              title="Send to Zaim"
                            >
                              <MessageSquare size={14} />
                            </button>
                            <button 
                              onClick={() => sendWhatsAppReport(item.majlisName, 'district')}
                              className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                              title="Send to District Nazim"
                            >
                              <MessageSquare size={14} />
                            </button>
                            <button 
                              onClick={() => sendWhatsAppReport(item.majlisName, 'region')}
                              className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                              title="Send to Region Nazim"
                            >
                              <MessageSquare size={14} />
                            </button>
                          </div>
                        </td>
                        {Object.keys(FIELD_LABELS).map((key) => {
                          const isSL = key === 'sl';
                          const isMajlis = key === 'majlisName';
                          return (
                            <td 
                              key={key} 
                              className={cn(
                                "px-4 py-3 text-slate-600 border-b border-slate-50 whitespace-nowrap",
                                isSL && "sticky left-[140px] bg-white z-20 w-[80px] min-w-[80px]",
                                isMajlis && "sticky left-[220px] bg-white z-20 w-[220px] min-w-[220px]"
                              )}
                            >
                              {item[key as keyof MajlisData]}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                )}
              </div>
            </motion.div>
          )}

          {view === 'zilla' && (
            <motion.div 
              key="zilla"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <MapPin className="text-indigo-600" />
                  Zilla Performance Summary
                </h3>
                <div className="flex items-center gap-3">
                  <select 
                    value={currentRatioField}
                    onChange={(e) => setCurrentRatioField(e.target.value as any)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-semibold"
                  >
                    <option value="all">📊 All Metrics (Average)</option>
                    {ratioFields.map(field => (
                      <option key={field} value={field}>{FIELD_LABELS[field]}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => sendAllGroupReports('district')}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                  >
                    <Send size={16} />
                    Send All Zilla Reports
                  </button>
                </div>
              </div>

              {zillaSummaries.some(z => z.name === 'Unknown') && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 mb-6 flex items-start gap-4 shadow-sm">
                  <AlertCircle className="text-rose-600 mt-1 flex-shrink-0" size={20} />
                  <div className="w-full">
                    <h4 className="font-bold text-rose-800 mb-1">Mapping Issues Detected</h4>
                    <p className="text-sm text-rose-700 mb-3">
                      {zillaSummaries.find(z => z.name === 'Unknown')?.majlisCount} Majlis could not be assigned to a Zilla. 
                      Please ensure their names match exactly (Bangla or English) with the "Majlis-Names" or "Zaim" sheet.
                    </p>
                    <div className="flex flex-wrap gap-2">
                       {zillaSummaries.find(z => z.name === 'Unknown')?.majlisList.map((m: any, i: number) => (
                         <span key={i} className="px-2 py-1 bg-white/50 border border-rose-100 rounded-lg text-[10px] font-bold text-rose-600">
                           {m.majlisName}
                         </span>
                       ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {zillaSummaries.map((zilla: any) => {
                  const ratio = currentRatioField === 'all'
                    ? zilla.majlisList.reduce((acc: any, m: any) => acc + calculateRatio(m, 'all'), 0) / zilla.majlisList.length
                    : (zilla.tajnidMembers > 0 ? (zilla.totals[currentRatioField] / zilla.tajnidMembers) * 100 : 0);
                  const totalVal = currentRatioField === 'all' ? 'Avg' : (zilla.totals[currentRatioField] || 0);
                  
                  return (
                    <div key={zilla.name} className={cn(
                      "bg-white rounded-2xl border shadow-sm overflow-hidden hover:border-indigo-200 transition-all group",
                      zilla.name === 'Unknown' ? "border-rose-200" : "border-slate-200"
                    )}>
                      <div className={cn(
                        "p-5 border-b flex items-center justify-between",
                        zilla.name === 'Unknown' ? "bg-rose-50/50 border-rose-100" : "bg-slate-50/50 border-slate-100"
                      )}>
                        <div>
                          <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {zilla.name === 'Unknown' ? '⚠️ Unidentified Zilla' : zilla.name}
                          </h4>
                          <p className="text-xs text-slate-500">{zilla.majlisCount} Majlis • {zilla.tajnidMembers} Tajnid</p>
                        </div>
                        {zilla.name !== 'Unknown' && (
                          <button 
                            onClick={() => sendGroupWhatsAppReport(zilla.name, 'district', zilla.majlisList)}
                            className="p-2 bg-white border border-slate-200 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Send to District Nazim"
                          >
                            <MessageSquare size={18} />
                          </button>
                        )}
                      </div>
                      <div className="p-5 space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-400 uppercase">{currentRatioField === 'all' ? 'All Metrics Average' : FIELD_LABELS[currentRatioField]}</span>
                            <span className="text-sm font-bold text-indigo-600">{ratio.toFixed(1)}%</span>
                          </div>
                          <div className={cn(
                            "h-2 rounded-full overflow-hidden",
                            zilla.name === 'Unknown' ? "bg-rose-100" : "bg-slate-100"
                          )}>
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${ratio}%` }}
                              className={cn(
                                "h-full",
                                zilla.name === 'Unknown' ? "bg-rose-500" : "bg-indigo-600"
                              )}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">Total: {totalVal} {currentRatioField !== 'all' && `/ ${zilla.tajnidMembers}`}</p>
                        </div>
                        
                        <div className="pt-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Majlis Performance</p>
                          <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                            {zilla.majlisList.sort((a: any, b: any) => calculateRatio(b, currentRatioField) - calculateRatio(a, currentRatioField)).map((m: any, i: number) => {
                              const mRatio = calculateRatio(m, currentRatioField);
                              return (
                                <div key={i} className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-600 truncate mr-2">{m.majlisName}</span>
                                  <span className={cn(
                                    "font-bold",
                                    mRatio >= 80 ? "text-emerald-600" : mRatio >= 60 ? "text-indigo-600" : "text-amber-600"
                                  )}>{mRatio.toFixed(0)}%</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {view === 'comparison' && (
            <motion.div 
              key="comparison"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                  <History className="text-indigo-600" />
                  Monthly Performance Comparison
                </h3>
              </div>

              {/* Comparison Controls */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-3 block">Select Months</label>
                      <div className="grid grid-cols-2 gap-2">
                        {MONTHS.map(m => {
                          const isSelected = comparedMonths.includes(m);
                          return (
                            <button
                              key={m}
                              onClick={() => {
                                if (isSelected) {
                                  if (comparedMonths.length > 1) {
                                    setComparedMonths(comparedMonths.filter(x => x !== m));
                                  }
                                } else {
                                  setComparedMonths([...comparedMonths, m].sort((a,b) => MONTHS.indexOf(a) - MONTHS.indexOf(b)));
                                }
                              }}
                              className={cn(
                                "px-3 py-2 rounded-xl text-xs font-bold transition-all border",
                                isSelected 
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100" 
                                  : "bg-white text-slate-600 border-slate-100 hover:border-indigo-200"
                              )}
                            >
                              {m.replace('26', '')}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-3 block">Comparison Scope</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'national', label: 'National', icon: Globe },
                          { id: 'zilla', label: 'Zilla', icon: MapPin },
                          { id: 'region', label: 'Region', icon: Globe },
                          { id: 'majlis', label: 'Majlis', icon: Users }
                        ].map(scope => (
                          <button
                            key={scope.id}
                            onClick={() => {
                              setComparisonScope(scope.id as any);
                              setSelectedComparisonTarget('All');
                            }}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold border transition-all",
                              comparisonScope === scope.id 
                                ? "bg-indigo-50 border-indigo-200 text-indigo-600" 
                                : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                            )}
                          >
                            <scope.icon size={12} />
                            {scope.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {comparisonScope !== 'national' && (
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-3 block">
                          Select {comparisonScope === 'zilla' ? 'Zilla' : comparisonScope === 'region' ? 'Region' : 'Majlis'}
                        </label>
                        <select 
                          value={selectedComparisonTarget}
                          onChange={(e) => setSelectedComparisonTarget(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                        >
                          <option value="All">All {comparisonScope === 'zilla' ? 'Zillas' : comparisonScope === 'region' ? 'Regions' : 'Majlis'}</option>
                          {(() => {
                            if (comparisonScope === 'zilla') {
                              return zillaSummaries.map(z => <option key={z.name} value={z.name}>{z.name}</option>);
                            } else if (comparisonScope === 'region') {
                              return regionSummaries.map(r => <option key={r.name} value={r.name}>{r.name}</option>);
                            } else {
                              return masterMajlisNames.map(m => <option key={m.bangla} value={m.bangla}>{m.bangla}</option>);
                            }
                          })()}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-3 space-y-6">
                  {/* Comparison Visualization */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[500px]">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                      <h4 className="font-bold text-slate-800">
                        {currentRatioField === 'all' ? 'All Metrics Average' : (FIELD_LABELS[currentRatioField] || 'Performance')} Trend
                      </h4>
                      <div className="flex items-center gap-3">
                        <select 
                          value={currentRatioField}
                          onChange={(e) => setCurrentRatioField(e.target.value as any)}
                          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-semibold"
                        >
                          <option value="all">📊 All Metrics (Average)</option>
                          {ratioFields.map(field => (
                            <option key={field} value={field}>{FIELD_LABELS[field]}</option>
                          ))}
                        </select>
                         <div className="flex items-center gap-1">
                            <span className="w-3 h-3 bg-indigo-500 rounded-full"></span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Selected Scope</span>
                         </div>
                      </div>
                    </div>

                    <ResponsiveContainer width="100%" height="85%">
                      <AreaChart 
                        data={comparedMonths.map(month => {
                          const monthData = allMonthsFullData[month] || [];
                          let ratio = 0;
                          
                          if (monthData.length > 0) {
                            let targetData = monthData;
                            if (comparisonScope === 'zilla' && selectedComparisonTarget !== 'All') {
                              targetData = monthData.filter(m => findZaimInfo(m.majlisName)?.district === selectedComparisonTarget);
                            } else if (comparisonScope === 'region' && selectedComparisonTarget !== 'All') {
                              targetData = monthData.filter(m => findZaimInfo(m.majlisName)?.region === selectedComparisonTarget);
                            } else if (comparisonScope === 'majlis' && selectedComparisonTarget !== 'All') {
                              targetData = monthData.filter(m => m.majlisName === selectedComparisonTarget);
                            }

                            if (targetData.length > 0) {
                              ratio = targetData.reduce((acc, m) => acc + calculateRatio(m, currentRatioField), 0) / targetData.length;
                            }
                          }

                          return {
                            month: month.replace('26', ''),
                            ratio: parseFloat(ratio.toFixed(2))
                          };
                        })}
                      >
                        <defs>
                          <linearGradient id="colorRatio" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} unit="%" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area type="monotone" dataKey="ratio" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRatio)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Summary Comparison Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                      <h4 className="text-sm font-bold text-slate-800">Comparison Data Summary</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="px-6 py-3">Month</th>
                            <th className="px-6 py-3">Avg Performance</th>
                            <th className="px-6 py-3">Top Entity</th>
                            <th className="px-6 py-3">Tajnid Coverage</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {comparedMonths.map(month => {
                            const monthData = allMonthsFullData[month] || [];
                            let avgPerf = 0;
                            let topEntity = 'N/A';
                            let tajnidCoverage = 0;

                            if (monthData.length > 0) {
                              avgPerf = monthData.reduce((acc, m) => acc + calculateRatio(m, currentRatioField), 0) / monthData.length;
                              const sorted = [...monthData].sort((a,b) => calculateRatio(b, currentRatioField) - calculateRatio(a, currentRatioField));
                              topEntity = sorted[0]?.majlisName || 'N/A';
                              tajnidCoverage = monthData.reduce((acc, m) => acc + m.tajnidMembers, 0);
                            }

                            return (
                              <tr key={month} className="hover:bg-indigo-50/30 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-900">{month}</td>
                                <td className="px-6 py-4">
                                  <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold">
                                    {avgPerf.toFixed(2)}%
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-slate-600 font-medium">{topEntity}</td>
                                <td className="px-6 py-4 text-slate-500 font-medium">{tajnidCoverage} members</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'appraisal' && (
            <motion.div 
              key="appraisal"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold flex items-center gap-3">
                    <ClipboardList className="text-indigo-600" size={28} />
                    Yearly Performance Appraisal
                  </h3>
                  <p className="text-slate-500 mt-1">Aggregated ranking based on {appraisalMonths.length} selected months ({appraisalMonths.filter(m => allMonthsFullData[m]).length} loaded)</p>
                </div>
                <div className="flex flex-col gap-2 min-w-[300px]">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 text-right">Appraisal Period</label>
                  <div className="flex flex-wrap justify-end gap-1 select-none">
                    {MONTHS.map(m => {
                      const isSelected = appraisalMonths.includes(m);
                      const hasData = allMonthsFullData[m] && (allMonthsFullData[m] as any[]).length > 0;
                      return (
                        <button
                          key={m}
                          onClick={() => {
                            if (isSelected) {
                              if (appraisalMonths.length > 1) {
                                setAppraisalMonths(appraisalMonths.filter(prev => prev !== m));
                              }
                            } else {
                              setAppraisalMonths([...appraisalMonths, m].sort((a,b) => MONTHS.indexOf(a) - MONTHS.indexOf(b)));
                            }
                          }}
                          className={cn(
                            "px-2 py-1 rounded-lg text-[10px] font-bold transition-all border",
                            isSelected 
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
                              : "bg-white text-slate-500 border-slate-100 hover:border-indigo-200",
                            !hasData && !isSelected && "opacity-50 italic"
                          )}
                        >
                          {m.replace('26', '')}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all"
                  >
                    <Settings size={18} />
                    Appraisal Config
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                    <Download size={18} />
                    Export Appraisal
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['small', 'medium', 'large'].map((cat) => {
                  const count = appraisalData.filter(m => m.category === cat).length;
                  const topMajlis = appraisalData.find(m => m.category === cat);
                  return (
                    <div key={cat} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <BarChart3 size={64} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">{cat} Majlises</h4>
                      <p className="text-3xl font-bold text-slate-800">{count}</p>
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-xs text-slate-500 mb-1">Current Leader:</p>
                        <p className="font-bold text-indigo-600 truncate">{topMajlis?.majlisName || 'N/A'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Leaderboards */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {(['small', 'medium', 'large'] as const).map((cat) => (
                  <div key={cat} className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <h4 className="font-bold text-slate-800 flex items-center gap-2 uppercase tracking-tight text-sm">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          cat === 'small' ? "bg-slate-400" : cat === 'medium' ? "bg-indigo-400" : "bg-indigo-600"
                        )} />
                        {cat} Majlis Rankings
                      </h4>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => downloadCardAsImage(cat)}
                          className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Save as Image"
                        >
                          <Camera size={14} />
                        </button>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md uppercase">
                          {appraisalData.filter(m => m.category === cat).length} Total
                        </span>
                      </div>
                    </div>

                    <div 
                      ref={rankingRefs[cat]}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                    >
                      <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead className="sticky top-0 bg-slate-50 text-[10px] font-extrabold text-slate-400 uppercase border-b border-slate-100 z-10">
                            <tr>
                              <th className="px-4 py-3 text-center w-12">#</th>
                              <th className="px-1 py-3">Majlis</th>
                              <th className="px-4 py-3 text-right">Score</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {appraisalData
                              .filter(m => m.category === cat)
                              .map((m, idx) => (
                                <tr key={m.majlisName} className="hover:bg-indigo-50/30 transition-colors group">
                                  <td className="px-4 py-4 text-center">
                                    <span className={cn(
                                      "inline-flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-black",
                                      idx === 0 ? "bg-amber-100 text-amber-600" :
                                      idx === 1 ? "bg-slate-100 text-slate-500" :
                                      idx === 2 ? "bg-orange-100 text-orange-600" :
                                      "text-slate-400"
                                    )}>
                                      {idx + 1}
                                    </span>
                                  </td>
                                  <td className="px-1 py-4">
                                    <div className="flex flex-col">
                                      <span className="font-bold text-slate-700 transition-colors">{m.majlisName}</span>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[9px] text-slate-400 flex items-center gap-1">
                                          <ClipboardList size={8} /> {m.reportsReceived} Months
                                        </span>
                                        <span className="text-[9px] text-slate-400 flex items-center gap-1">
                                          <Users size={8} /> {Math.round(m.avgTajnid)}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 text-right">
                                    <div className="flex flex-col items-end">
                                      <span className="font-black text-indigo-600">{m.finalScore.toFixed(1)}%</span>
                                      <div className="w-16 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                        <motion.div 
                                          initial={{ width: 0 }}
                                          animate={{ width: `${m.finalScore}%` }}
                                          className="h-full bg-indigo-500" 
                                        />
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                      {appraisalData.filter(m => m.category === cat).length === 0 && (
                        <div className="p-12 text-center">
                          <ClipboardList size={32} className="mx-auto text-slate-200 mb-3" />
                          <p className="text-slate-400 text-xs font-medium">No Majlises in this category yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Hidden High-Quality Rank Cards for Export */}
              <div className="fixed -left-[4000px] top-0 opacity-0 pointer-events-none print:hidden">
                {(['small', 'medium', 'large'] as const).map((cat) => (
                  <div 
                    key={`export-${cat}`}
                    ref={exportRankingRefs[cat]}
                    className="bg-white p-12 w-[1000px] rounded-[40px] border border-slate-100 shadow-2xl font-sans"
                  >
                    <div className="flex items-center justify-between mb-10">
                      <div>
                        <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">
                          {cat} Majlis Rankings
                        </h2>
                        <p className="text-xl text-slate-400 font-bold mt-1">Yearly Performance Appraisal 2026</p>
                        <div className="flex items-center gap-2 mt-4">
                           {appraisalMonths.map(m => (
                             <span key={m} className="px-2 py-1 bg-slate-50 text-slate-400 rounded-lg text-[10px] font-black border border-slate-100">
                               {m.replace('26', '')}
                             </span>
                           ))}
                        </div>
                      </div>
                      <div className="bg-indigo-600 text-white p-6 rounded-[32px] flex flex-col items-center justify-center min-w-[160px] shadow-xl shadow-indigo-100">
                         <ClipboardList size={32} className="mb-2 opacity-50" />
                         <span className="text-[10px] font-black uppercase opacity-60 tracking-widest">Active Period</span>
                         <span className="text-2xl font-black">{appraisalMonths.length} Months</span>
                      </div>
                    </div>
                    
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b-4 border-slate-50">
                          <th className="py-6 text-xl font-black text-slate-300 uppercase w-24 text-center">#</th>
                          <th className="py-6 text-xl font-black text-slate-300 uppercase">Majlis Name</th>
                          <th className="py-6 text-right text-xl font-black text-slate-300 uppercase">Final Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y-4 divide-slate-50">
                        {appraisalData
                          .filter(m => m.category === cat)
                          .slice(0, 10)
                          .map((m, idx) => (
                            <tr key={m.majlisName}>
                              <td className="py-8 text-center">
                                <span className={cn(
                                  "inline-flex items-center justify-center w-12 h-12 rounded-2xl text-xl font-black shadow-sm",
                                  idx === 0 ? "bg-amber-100 text-amber-600" :
                                  idx === 1 ? "bg-slate-100 text-slate-500" :
                                  idx === 2 ? "bg-orange-100 text-orange-600" :
                                  "bg-indigo-50 text-indigo-400"
                                )}>
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="py-8">
                                <div className="flex flex-col">
                                  <span className="text-3xl font-black text-slate-800">{m.majlisName}</span>
                                  <div className="flex items-center gap-6 mt-3">
                                    <span className="text-sm font-bold text-slate-400 flex items-center gap-2">
                                      <ClipboardList size={14} className="text-indigo-400" /> {m.reportsReceived} Months Logged
                                    </span>
                                    <span className="text-sm font-bold text-slate-400 flex items-center gap-2">
                                      <Users size={14} className="text-indigo-400" /> Population: {Math.round(m.avgTajnid)}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-8 text-right">
                                <div className="flex flex-col items-end">
                                  <span className="text-4xl font-black text-indigo-600 mb-2">{m.finalScore.toFixed(1)}%</span>
                                  <div className="w-48 h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                    <div 
                                      className="h-full bg-indigo-500 rounded-full" 
                                      style={{ width: `${m.finalScore}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    
                    <div className="mt-12 pt-8 border-t-4 border-slate-50 flex justify-between items-center">
                       <div>
                         <p className="text-xl font-black text-slate-800">Majlis Dashboard <span className="text-indigo-600">Analysis 2026</span></p>
                         <p className="text-sm font-bold text-slate-400">Regional Performance Intelligence System</p>
                       </div>
                       <div className="text-right">
                         <p className="text-sm font-black text-slate-300 uppercase tracking-widest mb-1">Generated On</p>
                         <p className="text-lg font-black text-slate-500">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'region' && (
            <motion.div 
              key="region"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Globe className="text-indigo-600" />
                  Region Performance Summary
                </h3>
                <div className="flex items-center gap-3">
                  <select 
                    value={currentRatioField}
                    onChange={(e) => setCurrentRatioField(e.target.value as any)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-semibold"
                  >
                    <option value="all">📊 All Metrics (Average)</option>
                    {ratioFields.map(field => (
                      <option key={field} value={field}>{FIELD_LABELS[field]}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => sendAllGroupReports('region')}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                  >
                    <Send size={16} />
                    Send All Region Reports
                  </button>
                </div>
              </div>

              {regionSummaries.some(r => r.name === 'Unknown') && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 mb-6 flex items-start gap-4 shadow-sm">
                  <AlertCircle className="text-rose-600 mt-1 flex-shrink-0" size={20} />
                  <div className="w-full">
                    <h4 className="font-bold text-rose-800 mb-1">Mapping Issues Detected</h4>
                    <p className="text-sm text-rose-700 mb-3">
                      {regionSummaries.find(r => r.name === 'Unknown')?.majlisCount} Majlis could not be assigned to a Region. 
                      Please ensure their names match exactly (Bangla or English) with the "Majlis-Names" sheet.
                    </p>
                    <div className="flex flex-wrap gap-2">
                       {regionSummaries.find(r => r.name === 'Unknown')?.majlisList.map((m: any, i: number) => (
                         <span key={i} className="px-2 py-1 bg-white/50 border border-rose-100 rounded-lg text-[10px] font-bold text-rose-600">
                           {m.majlisName}
                         </span>
                       ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {regionSummaries.map((region: any) => {
                  const ratio = currentRatioField === 'all'
                    ? region.majlisList.reduce((acc: any, m: any) => acc + calculateRatio(m, 'all'), 0) / region.majlisList.length
                    : (region.tajnidMembers > 0 ? (region.totals[currentRatioField] / region.tajnidMembers) * 100 : 0);
                  const totalVal = currentRatioField === 'all' ? 'Avg' : (region.totals[currentRatioField] || 0);
                  
                  return (
                    <div key={region.name} className={cn(
                      "bg-white rounded-2xl border shadow-sm overflow-hidden hover:border-indigo-200 transition-all group",
                      region.name === 'Unknown' ? "border-rose-200" : "border-slate-200"
                    )}>
                      <div className={cn(
                        "p-5 border-b flex items-center justify-between",
                        region.name === 'Unknown' ? "bg-rose-50/50 border-rose-100" : "bg-slate-50/50 border-slate-100"
                      )}>
                        <div>
                          <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {region.name === 'Unknown' ? '⚠️ Unidentified Region' : region.name}
                          </h4>
                          <p className="text-xs text-slate-500">{region.majlisCount} Majlis • {region.tajnidMembers} Tajnid</p>
                        </div>
                        {region.name !== 'Unknown' && (
                          <button 
                            onClick={() => sendGroupWhatsAppReport(region.name, 'region', region.majlisList)}
                            className="p-2 bg-white border border-slate-200 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Send to Region Nazim"
                          >
                            <MessageSquare size={18} />
                          </button>
                        )}
                      </div>
                      <div className="p-5 space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-400 uppercase">{currentRatioField === 'all' ? 'All Metrics Average' : FIELD_LABELS[currentRatioField]}</span>
                            <span className="text-sm font-bold text-indigo-600">{ratio.toFixed(1)}%</span>
                          </div>
                          <div className={cn(
                            "h-2 rounded-full overflow-hidden",
                            region.name === 'Unknown' ? "bg-rose-100" : "bg-slate-100"
                          )}>
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${ratio}%` }}
                              className={cn(
                                "h-full",
                                region.name === 'Unknown' ? "bg-rose-500" : "bg-indigo-600"
                              )}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">Total: {totalVal} {currentRatioField !== 'all' && `/ ${region.tajnidMembers}`}</p>
                        </div>
                        
                        <div className="pt-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Majlis Performance</p>
                          <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                            {region.majlisList.sort((a: any, b: any) => calculateRatio(b, currentRatioField) - calculateRatio(a, currentRatioField)).map((m: any, i: number) => {
                              const mRatio = calculateRatio(m, currentRatioField);
                              return (
                                <div key={i} className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-600 truncate mr-2">{m.majlisName}</span>
                                  <span className={cn(
                                    "font-bold",
                                    mRatio >= 80 ? "text-emerald-600" : mRatio >= 60 ? "text-indigo-600" : "text-amber-600"
                                  )}>{mRatio.toFixed(0)}%</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings Modal */}
        <AnimatePresence>
          {isSettingsOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSettingsOpen(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                      <Settings size={24} />
                    </div>
                    <h3 className="text-xl font-bold">Dashboard Settings</h3>
                  </div>
                  <button 
                    onClick={() => setIsSettingsOpen(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
                  {/* Appraisal Settings */}
                  <div className="pt-6 border-t border-slate-100">
                    <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <ClipboardList size={18} />
                      Appraisal Engine Configuration
                    </h4>
                    
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-600 uppercase">Reporting Frequency Weight</label>
                          <span className="text-xs font-black text-indigo-600">+{appraisalReportWeight}% Bonus</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="50" 
                          step="5"
                          value={appraisalReportWeight}
                          onChange={(e) => setAppraisalReportWeight(parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <p className="text-[10px] text-slate-400 italic">This weight is added to the base performance score based on how many months the Majlis submitted reports consistently.</p>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-600 uppercase">Selected Appraisal Metrics</label>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setAppraisalFields(PERFORMANCE_FIELDS)}
                              className="text-[10px] text-indigo-600 font-bold hover:underline"
                            >
                              Select All
                            </button>
                            <button 
                              onClick={() => setAppraisalFields([])}
                              className="text-[10px] text-rose-600 font-bold hover:underline"
                            >
                              Clear All
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar p-2 bg-slate-50 rounded-2xl border border-slate-100">
                          {PERFORMANCE_FIELDS.map(field => (
                            <label key={field} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-indigo-300 transition-all select-none">
                              <input 
                                type="checkbox"
                                checked={appraisalFields.includes(field)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setAppraisalFields([...appraisalFields, field]);
                                  } else {
                                    setAppraisalFields(appraisalFields.filter(f => f !== field));
                                  }
                                }}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                              />
                              <span className="text-xs font-semibold text-slate-700">{FIELD_LABELS[field]}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Size Thresholds */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Majlis Size Thresholds (Tajnid)</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-600">Small (Up to)</label>
                        <input 
                          type="number" 
                          value={sizeThresholds.small}
                          onChange={(e) => setSizeThresholds({...sizeThresholds, small: parseInt(e.target.value)})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-600">Medium (Up to)</label>
                        <input 
                          type="number" 
                          value={sizeThresholds.medium}
                          onChange={(e) => setSizeThresholds({...sizeThresholds, medium: parseInt(e.target.value)})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Performance Thresholds */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Performance Class Thresholds (%)</h4>
                    <div className="space-y-4">
                      {Object.entries(thresholds).map(([grade, value]) => (
                        <div key={grade} className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center font-bold",
                            grade === 'A' ? "bg-emerald-100 text-emerald-700" :
                            grade === 'B' ? "bg-blue-100 text-blue-700" :
                            grade === 'C' ? "bg-indigo-100 text-indigo-700" :
                            grade === 'D' ? "bg-amber-100 text-amber-700" :
                            "bg-orange-100 text-orange-700"
                          )}>
                            {grade}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-xs font-medium text-slate-600">Class {grade} (Min %)</span>
                              <span className="text-xs font-bold text-indigo-600">{value}%</span>
                            </div>
                            <input 
                              type="range" 
                              min="0" 
                              max="100" 
                              value={value}
                              onChange={(e) => setThresholds({...thresholds, [grade]: parseInt(e.target.value)})}
                              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <p className="text-xs text-indigo-700 leading-relaxed">
                      <strong>Note:</strong> Performance classes do not apply to Tajnid, Saff Awwal, Saff Dom, or Total Amela Members as these are demographic fields.
                    </p>
                  </div>
                </div>

                <div className="p-6 border-t border-slate-100">
                  <button 
                    onClick={() => setIsSettingsOpen(false)}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
                  >
                    Save & Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
      <ReportAIChat 
        data={data} 
        allData={allMonthsFullData} 
        selectedMonth={selectedMonth} 
      />
    </div>
  );
}

function getIconForField(key: string) {
  if (key.includes('tajnid')) return <Users size={18} />;
  if (key.includes('Meeting')) return <Calendar size={18} />;
  if (key.includes('Quran')) return <BookOpen size={18} />;
  if (key.includes('tabligh') || key.includes('baiat')) return <MessageSquare size={18} />;
  if (key.includes('sick') || key.includes('elderly')) return <Heart size={18} />;
  return <Activity size={18} />;
}

function getColorForField(key: string) {
  if (key.includes('tajnid')) return 'indigo';
  if (key.includes('Attendance')) return 'emerald';
  if (key.includes('Meeting')) return 'amber';
  if (key.includes('Quran')) return 'violet';
  if (key.includes('baiat')) return 'rose';
  return 'slate';
}

const StatCard: React.FC<{ 
  icon: React.ReactNode, 
  label: string, 
  value: number, 
  trend?: 'up' | 'down' | 'stable' | null,
  subValue?: string,
  color: string 
}> = ({ icon, label, value, trend, subValue, color }) => {
  const colorClasses = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    violet: "bg-violet-50 text-violet-600",
    slate: "bg-slate-50 text-slate-600",
  }[color] || "bg-slate-50 text-slate-600";

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
      <div className="flex justify-between items-start mb-2">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", colorClasses)}>
          {icon}
        </div>
        {trend && (
          <div 
            title={`Compared to average of previous months (Jan'26 to last month)`}
            className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase cursor-help",
              trend === 'up' ? "bg-emerald-50 text-emerald-600" : 
              trend === 'down' ? "bg-rose-50 text-rose-600" : 
              "bg-slate-50 text-slate-400"
            )}
          >
            {trend === 'up' && <TrendingUp size={10} />}
            {trend === 'down' && <TrendingDown size={10} />}
            {trend === 'stable' && <Minus size={10} />}
            {trend}
          </div>
        )}
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 line-clamp-1" title={label}>{label}</p>
      <div className="flex items-baseline gap-2">
        <h4 className="text-lg font-bold text-slate-900">{value.toLocaleString()}</h4>
        {subValue && <span className="text-[9px] font-medium text-slate-400">{subValue}</span>}
      </div>
      
      {/* Decorative background element */}
      <div className={cn(
        "absolute -right-2 -bottom-2 w-12 h-12 opacity-[0.03] group-hover:scale-110 transition-transform duration-500",
        colorClasses.split(' ')[1]
      )}>
        {icon}
      </div>
    </div>
  );
};

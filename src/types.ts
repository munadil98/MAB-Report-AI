export interface MajlisData {
  sl: string;
  majlisName: string;
  tajnidMembers: number;
  saffAwwal: number;
  saffDom: number;
  totalAmelaMembers: number;
  totalMusis: number;
  amelaMeeting: number;
  generalMeeting: number;
  generalMeetingAttendance: number;
  daiIlallahMembers: number;
  tablighSeminar: number;
  tablighDoneBy: number;
  tablighDoneTo: number;
  booksDistributed: number;
  baiatCount: number;
  quranReaders: number;
  quranClassMembers: number;
  fiveTimePrayers: number;
  congregationalPrayers: number;
  mtaConnection: number;
  apjMtaConnection: number;
  regularMtaViewers: number;
  regularKhutbaListeners: number;
  bookExam: number;
  bookSeminar: number;
  studyForumAttendance: number;
  nauMobainCount: number;
  budgetedNauMobain: number;
  nauMobainSeminarAttendance: number;
  sickAnsarMembers: number;
  elderlyAnsarMembers: number;
  foodDistribution: number;
  alNaserMembers: number;
  tahrikeJadidMembers: number;
  waqfeJadidMembers: number;
  regularExercise: number;
}

export interface GroupSummary {
  name: string;
  majlisCount: number;
  tajnidMembers: number;
  totals: Partial<Record<keyof MajlisData, number>>;
  majlisList: MajlisData[];
}

export interface ZaimData {
  sl: string;
  majlis: string;
  zaimName: string;
  zaimMobile: string;
  district: string;
  districtNazimName: string;
  districtNazimMobile: string;
  regionNazimName: string;
  regionNazimMobile: string;
}

export type Month = 'Jan26' | 'Feb26' | 'Mar26' | 'Apr26' | 'May26' | 'Jun26' | 'Jul26' | 'Aug26' | 'Sep26' | 'Oct26' | 'Nov26' | 'Dec26';

export const MONTHS: Month[] = ['Jan26', 'Feb26', 'Mar26', 'Apr26', 'May26', 'Jun26', 'Jul26', 'Aug26', 'Sep26', 'Oct26', 'Nov26', 'Dec26'];

export const FIELD_LABELS: Record<keyof MajlisData, string> = {
  sl: 'SL',
  majlisName: 'মজলিস নাম',
  tajnidMembers: 'তাজনীদ ভুক্ত সদস্য',
  saffAwwal: 'সফে আউয়াল',
  saffDom: 'সফে দওম',
  totalAmelaMembers: 'মোট আমেলা সদস্য',
  totalMusis: 'মোট ওসীয়্যতকারী',
  amelaMeeting: 'আমেলা সভা',
  generalMeeting: 'সাধারণ সভা',
  generalMeetingAttendance: 'সাধারণ সভায় উপস্থিত',
  daiIlallahMembers: 'দায়ী ইলাল্লাহ্ সদস্য',
  tablighSeminar: 'তবলীগ সেমিনার',
  tablighDoneBy: 'কতজন তবলীগ করেছে',
  tablighDoneTo: 'কতজনকে তবলীগ করেছে',
  booksDistributed: 'কতটি বই /প্রচার পত্র বিতরণ হয়েছে',
  baiatCount: 'বয়াতের সংখা',
  quranReaders: 'কতজন কুরআন পড়া জানেন',
  quranClassMembers: 'কোরআন ক্লাসে সদস্য',
  fiveTimePrayers: '5 ওয়াক্ত নামাযীর সংখা',
  congregationalPrayers: 'বাজামাত নামাযীর সংখ্যা',
  mtaConnection: 'এমটিএ সংযোগ',
  apjMtaConnection: 'অচল এমটিএ সংযোগ',
  regularMtaViewers: 'নিয়মিত এমটিএ দর্শক',
  regularKhutbaListeners: 'নিয়মিত খুদবা শ্রবণকারী',
  bookExam: 'পুস্তকের ওপর পরীক্ষা',
  bookSeminar: 'পুস্তকের ওপর সেমিনার',
  studyForumAttendance: 'স্টাডি ফোরামে উপস্থিত',
  nauMobainCount: 'নওমোবাইন সংখ্যা',
  budgetedNauMobain: 'বাজেট ভুক্ত নও-মোবাঈন',
  nauMobainSeminarAttendance: 'নও-মোবাইন সেমিনারে উঃ',
  sickAnsarMembers: 'অসুস্থ আনসার সদস্য',
  elderlyAnsarMembers: 'বয়ঃবৃদ্ধ আনসার সদস্য',
  foodDistribution: 'খাদ্য বিতরণ',
  alNaserMembers: 'আলনাসের এর সদস্য সংখ্যা',
  tahrikeJadidMembers: 'তাহরীকে জাদীদ সদস্য',
  waqfeJadidMembers: 'ওয়াকফে জাদীদ সদস্য',
  regularExercise: 'নিয়মিত ব্যায়াম করেন',
};

export interface Language {
  code: string;
  name: string;
  native: string;
}

export const AUTO_DETECT: Language = { code: 'auto', name: 'Auto-Detect', native: 'Detect language' };

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'it', name: 'Italian', native: 'Italiano' },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
  { code: 'nl', name: 'Dutch', native: 'Nederlands' },
  { code: 'ru', name: 'Russian', native: 'Русский' },
  { code: 'uk', name: 'Ukrainian', native: 'Українська' },
  { code: 'pl', name: 'Polish', native: 'Polski' },
  { code: 'cs', name: 'Czech', native: 'Čeština' },
  { code: 'sk', name: 'Slovak', native: 'Slovenčina' },
  { code: 'sv', name: 'Swedish', native: 'Svenska' },
  { code: 'da', name: 'Danish', native: 'Dansk' },
  { code: 'fi', name: 'Finnish', native: 'Suomi' },
  { code: 'nb', name: 'Norwegian', native: 'Norsk' },
  { code: 'is', name: 'Icelandic', native: 'Íslenska' },
  { code: 'hu', name: 'Hungarian', native: 'Magyar' },
  { code: 'ro', name: 'Romanian', native: 'Română' },
  { code: 'bg', name: 'Bulgarian', native: 'Български' },
  { code: 'el', name: 'Greek', native: 'Ελληνικά' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe' },
  { code: 'ar', name: 'Arabic', native: 'العربية' },
  { code: 'he', name: 'Hebrew', native: 'עברית' },
  { code: 'fa', name: 'Persian', native: 'فارسی' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'th', name: 'Thai', native: 'ไทย' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Malay', native: 'Bahasa Melayu' },
  { code: 'fil', name: 'Filipino', native: 'Filipino' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', native: '简体中文' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', native: '繁體中文' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'ko', name: 'Korean', native: '한국어' },
  { code: 'sw', name: 'Swahili', native: 'Kiswahili' },
  { code: 'af', name: 'Afrikaans', native: 'Afrikaans' },
  { code: 'hr', name: 'Croatian', native: 'Hrvatski' },
  { code: 'sr', name: 'Serbian', native: 'Српски' },
];

const languageByCode = new Map<string, Language>(
  [AUTO_DETECT, ...LANGUAGES].map((lang) => [lang.code, lang])
);

export function getLanguageLabel(code: string | null | undefined): string {
  if (!code) return 'Unknown';
  return languageByCode.get(code)?.name ?? code;
}

export function getAllLanguages(): Language[] {
  return LANGUAGES;
}

export function searchLanguages(value: string): Language[] {
  const query = value.trim().toLowerCase();
  if (!query) return LANGUAGES;
  return LANGUAGES.filter(
    (lang) =>
      lang.name.toLowerCase().includes(query) ||
      lang.native.toLowerCase().includes(query) ||
      lang.code.toLowerCase().includes(query)
  );
}

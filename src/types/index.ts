export type EngineMode = 'gtx' | 'cloud';

export interface AppSettings {
  engineMode: EngineMode;
  apiKey: string;
}

export interface TranslationRecord {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  detectedLang: string | null;
  timestamp: number;
}

export interface TranslateResultPayload {
  translatedText: string;
  detectedSourceLanguage: string | null;
  engine: 'gtx' | 'cloud';
}

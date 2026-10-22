import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebounce } from './useDebounce';
import type { TranslateResultPayload } from '../types';

const DEBOUNCE_MS = 400;

interface UseTranslationOptions {
  sourceLang: string;
  targetLang: string;
  apiKey: string;
  onComplete?: (result: TranslateResultPayload, sourceText: string) => void;
}

interface UseTranslationValue {
  inputText: string;
  setInputText: (text: string) => void;
  outputText: string;
  setOutputText: (text: string) => void;
  detectedLang: string | null;
  setDetectedLang: (lang: string | null) => void;
  loading: boolean;
  error: string | null;
  translateNow: () => void;
  clearAll: () => void;
}

function parseGtxPayload(data: unknown): { text: string; src: string | null } {
  const shape = data as
    | { sentences?: Array<{ trans?: string }>; src?: unknown }
    | unknown[] | null;
  if (shape && !Array.isArray(shape) && Array.isArray((shape as { sentences?: unknown[] }).sentences)) {
    const s = shape as { sentences: Array<{ trans?: string }>; src?: unknown };
    return {
      text: s.sentences
        .filter((part) => typeof part?.trans === 'string')
        .map((part) => part.trans as string)
        .join(''),
      src: typeof s.src === 'string' ? s.src : null,
    };
  }
  if (Array.isArray(shape)) {
    let text = '';
    const segments = shape[0];
    if (Array.isArray(segments)) {
      for (const segment of segments) {
        if (Array.isArray(segment) && typeof segment[0] === 'string') text += segment[0];
      }
    }
    return { text, src: typeof shape[2] === 'string' ? (shape[2] as string) : null };
  }
  return { text: '', src: null };
}

async function fallbackAttempt(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<TranslateResultPayload> {
  const params = new URLSearchParams({
    client: 'gtx',
    dj: '1',
    dt: 't',
    sl: sourceLang,
    tl: targetLang,
    q: text,
  });
  const response = await fetch(
    `https://translate.googleapis.com/translate_a/single?${params.toString()}`
  );
  if (response.status === 429) {
    throw new Error('Rate limited by Google. Wait a moment and try again.');
  }
  if (!response.ok) {
    throw new Error(`Translation service error (HTTP ${response.status}).`);
  }
  const payload = parseGtxPayload(await response.json());
  if (!payload.text) throw new Error('Received an empty translation from the service.');
  return {
    translatedText: payload.text,
    detectedSourceLanguage: payload.src,
    engine: 'gtx',
  };
}

async function browserFallbackTranslate(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<TranslateResultPayload> {
  const forcedSource = sourceLang && sourceLang !== 'auto' ? sourceLang : null;
  const primary = await fallbackAttempt(text, sourceLang || 'auto', targetLang);

  if (
    forcedSource &&
    primary.translatedText.trim() === text.trim()
  ) {
    try {
      const retry = await fallbackAttempt(text, 'auto', targetLang);
      if (retry.translatedText.trim() !== text.trim()) return retry;
    } catch {
      return primary;
    }
  }
  return primary;
}

export function useTranslation(options: UseTranslationOptions): UseTranslationValue {
  const { sourceLang, targetLang, apiKey } = options;

  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedInput = useDebounce(inputText, DEBOUNCE_MS);
  const sequenceRef = useRef(0);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const runTranslation = useCallback(
    (text: string) => {
      const sequence = ++sequenceRef.current;
      const trimmed = text.trim();

      if (!trimmed) {
        setOutputText('');
        setDetectedLang(null);
        setError(null);
        setLoading(false);
        return;
      }

      const { sourceLang: sl, targetLang: tl, apiKey: key, onComplete } = optionsRef.current;
      setLoading(true);
      setError(null);

      const request = window.electronAPI
        ? window.electronAPI
            .translateText({ text: trimmed, sourceLang: sl, targetLang: tl, apiKey: key })
            .catch((err) => {
              if (err instanceof Error) throw new Error(err.message);
              throw new Error('Translation failed.');
            })
        : browserFallbackTranslate(trimmed, sl, tl);

      void request
        .then((result) => {
          if (sequence !== sequenceRef.current) return;
          setOutputText(result.translatedText);
          setDetectedLang(result.detectedSourceLanguage);
          setLoading(false);
          onComplete?.(result, trimmed);
        })
        .catch((err) => {
          if (sequence !== sequenceRef.current) return;
          setError(err instanceof Error ? err.message : 'Translation failed.');
          setLoading(false);
        });
    },
    []
  );

  useEffect(() => {
    runTranslation(debouncedInput);
  }, [debouncedInput, sourceLang, targetLang, apiKey, runTranslation]);

  const translateNow = useCallback(() => {
    runTranslation(inputText);
  }, [inputText, runTranslation]);

  const clearAll = useCallback(() => {
    setInputText('');
    setOutputText('');
    setDetectedLang(null);
    setError(null);
  }, []);

  return {
    inputText,
    setInputText,
    outputText,
    setOutputText,
    detectedLang,
    setDetectedLang,
    loading,
    error,
    translateNow,
    clearAll,
  };
}

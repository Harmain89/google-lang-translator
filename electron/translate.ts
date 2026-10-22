export interface TranslateRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
  apiKey?: string | null;
}

export interface TranslateResult {
  translatedText: string;
  detectedSourceLanguage: string | null;
  engine: 'gtx' | 'cloud';
}

export class TranslateError extends Error {
  constructor(message: string, public readonly detail?: string) {
    super(message);
    this.name = 'TranslateError';
  }
}

const MAX_TEXT_LENGTH = 10_000;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_GTX_QUERY_LENGTH = 1800;

const GTX_URL = 'https://translate.googleapis.com/translate_a/single';
const CLOUD_URL = 'https://translation.googleapis.com/language/translate/v2';

const GENERIC_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

async function fetchJson(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new TranslateError('Translation timed out. Check your internet connection.');
    }
    throw new TranslateError(
      'Could not reach the translation service. Check your internet connection.'
    );
  } finally {
    clearTimeout(timer);
  }
}

function joinSentenceParts(parts: unknown): string {
  if (!Array.isArray(parts)) return '';
  let text = '';
  for (const part of parts) {
    if (Array.isArray(part) && typeof part[0] === 'string') {
      text += part[0];
    }
  }
  return text;
}

export async function translateText(req: TranslateRequest): Promise<TranslateResult> {
  if (!req || typeof req.text !== 'string' || typeof req.targetLang !== 'string') {
    throw new TranslateError('Invalid translation request.');
  }
  const text = req.text.trim();
  if (!text) {
    return { translatedText: '', detectedSourceLanguage: null, engine: req.apiKey ? 'cloud' : 'gtx' };
  }
  if (text.length > MAX_TEXT_LENGTH) {
    throw new TranslateError(`Input is too long (limit is ${MAX_TEXT_LENGTH.toLocaleString()} characters).`);
  }
  return req.apiKey ? translateViaCloud(text, req) : translateViaGtx(text, req);
}

function isEcho(text: string, result: TranslateResult): boolean {
  return result.translatedText.trim() === text.trim();
}

async function translateViaGtx(text: string, req: TranslateRequest): Promise<TranslateResult> {
  const forcedSource = req.sourceLang && req.sourceLang !== 'auto' ? req.sourceLang : null;
  const primary = await gtxAttempt(text, forcedSource ?? 'auto', req.targetLang);

  if (forcedSource && isEcho(text, primary)) {
    try {
      const retry = await gtxAttempt(text, 'auto', req.targetLang);
      if (!isEcho(text, retry)) return retry;
    } catch {
      return primary;
    }
  }
  return primary;
}

async function gtxAttempt(text: string, sl: string, tl: string): Promise<TranslateResult> {
  const params = new URLSearchParams({ client: 'gtx', dj: '1', dt: 't', sl, tl });

  let response: Response;
  const fullParams = new URLSearchParams(params);
  fullParams.set('q', text);
  if (fullParams.toString().length > MAX_GTX_QUERY_LENGTH) {
    response = await fetchJson(`${GTX_URL}?${params.toString()}`, {
      method: 'POST',
      headers: { ...GENERIC_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ q: text }).toString(),
    });
  } else {
    response = await fetchJson(`${GTX_URL}?${fullParams.toString()}`, {
      method: 'GET',
      headers: GENERIC_HEADERS,
    });
  }

  if (response.status === 429) {
    throw new TranslateError('Rate limited by Google. Wait a moment and try again.');
  }
  if (!response.ok) {
    throw new TranslateError(`Translation service error (HTTP ${response.status}).`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (err) {
    throw new TranslateError('Unexpected response from the translation service.');
  }

  let translated = '';
  let detected: string | null = null;

  const shape = data as { sentences?: Array<{ trans?: string }>; src?: unknown } | null;
  if (shape && Array.isArray(shape.sentences)) {
    translated = shape.sentences
      .filter((s) => typeof s?.trans === 'string')
      .map((s) => s.trans as string)
      .join('');
    if (typeof shape.src === 'string') detected = shape.src;
  }

  if (!translated && Array.isArray(data)) {
    translated = joinSentenceParts(data[0]);
    if (typeof data[2] === 'string') detected = data[2];
  }

  if (!translated) {
    throw new TranslateError('Received an empty translation from the service.');
  }

  return { translatedText: translated, detectedSourceLanguage: detected, engine: 'gtx' };
}

async function translateViaCloud(text: string, req: TranslateRequest): Promise<TranslateResult> {
  const apiKey = (req.apiKey || '').trim();
  if (!apiKey) {
    throw new TranslateError('Cloud API mode is on but no API key is configured.');
  }
  const forcedSource = req.sourceLang && req.sourceLang !== 'auto' ? req.sourceLang : null;
  const primary = await cloudAttempt(text, req.targetLang, forcedSource, apiKey);

  if (forcedSource && isEcho(text, primary)) {
    try {
      const retry = await cloudAttempt(text, req.targetLang, null, apiKey);
      if (!isEcho(text, retry)) return retry;
    } catch {
      return primary;
    }
  }
  return primary;
}

async function cloudAttempt(
  text: string,
  targetLang: string,
  sourceLang: string | null,
  apiKey: string
): Promise<TranslateResult> {
  const form = new URLSearchParams({
    key: apiKey,
    q: text,
    target: targetLang,
    format: 'text',
  });
  if (sourceLang) {
    form.set('source', sourceLang);
  }

  const response = await fetchJson(CLOUD_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });

  const raw = await response.text();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const errBody = parsed as { error?: { message?: string; errors?: Array<{ reason?: string }> } } | null;
    const reason = errBody?.error?.errors?.[0]?.reason || errBody?.error?.message || raw.slice(0, 200);
    if (response.status === 403) {
      throw new TranslateError('API key rejected (HTTP 403). Ensure the Translation API is enabled for this key.', String(reason));
    }
    if (response.status === 400) {
      throw new TranslateError('Bad request — check the API key and language codes (HTTP 400).', String(reason));
    }
    throw new TranslateError(`Google Cloud Translation error (HTTP ${response.status}).`, String(reason));
  }

  const body = parsed as {
    data?: { translations?: Array<{ translatedText?: string; detectedSourceLanguage?: string }> };
  } | null;
  const translation = body?.data?.translations?.[0];
  if (!translation || typeof translation.translatedText !== 'string') {
    throw new TranslateError('Received an empty translation from Google Cloud.');
  }

  return {
    translatedText: translation.translatedText,
    detectedSourceLanguage: translation.detectedSourceLanguage || null,
    engine: 'cloud',
  };
}

export async function checkApiKey(apiKey: string): Promise<{ ok: boolean; message: string }> {
  const text = 'hello';
  try {
    const result = await translateViaCloud(text, { text, sourceLang: 'auto', targetLang: 'es', apiKey });
    return { ok: result.translatedText.length > 0, message: 'API key is valid.' };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof TranslateError ? err.message : 'Could not validate the API key.',
    };
  }
}

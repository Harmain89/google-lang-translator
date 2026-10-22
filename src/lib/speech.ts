export function normalizeSpeechLang(code: string): string {
  if (!code || code === 'auto') return 'en-US';
  if (code === 'zh-CN' || code === 'zh-TW' || code.length > 2) return code;
  return code;
}

export function speak(text: string, lang: string, onEnd?: () => void): boolean {
  if (!window.speechSynthesis || !text.trim()) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = normalizeSpeechLang(lang);
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    const target = utterance.lang.toLowerCase();
    const voice =
      voices.find((v) => v.lang.toLowerCase() === target) ??
      voices.find((v) => v.lang.toLowerCase().startsWith(target.split('-')[0]));
    if (voice) utterance.voice = voice;
  }
  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking(): void {
  window.speechSynthesis?.cancel();
}

export function isSpeaking(): boolean {
  return Boolean(window.speechSynthesis?.speaking);
}

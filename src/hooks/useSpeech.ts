import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeakOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
}

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const stop = useCallback(() => {
    if (supported) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
    utterRef.current = null;
  }, [supported]);

  const speak = useCallback((text: string, opts: SpeakOptions = {}) => {
    if (!supported) return;

    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'uk-UA';
    utter.rate = opts.rate ?? 0.95;
    utter.pitch = opts.pitch ?? 1;
    utter.volume = opts.volume ?? 1;

    const voices = window.speechSynthesis.getVoices();
    const ukVoice = voices.find((v) => v.lang === 'uk-UA' || v.lang === 'uk');
    if (ukVoice) utter.voice = ukVoice;

    utter.onend = () => {
      setSpeaking(false);
      utterRef.current = null;
    };
    utter.onerror = () => {
      setSpeaking(false);
      utterRef.current = null;
    };

    utterRef.current = utter;
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  }, [supported]);

  // Some browsers need voices loaded asynchronously
  useEffect(() => {
    if (supported) {
      window.speechSynthesis.getVoices();
    }
  }, [supported]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (supported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [supported]);

  return { speak, stop, speaking, supported };
}

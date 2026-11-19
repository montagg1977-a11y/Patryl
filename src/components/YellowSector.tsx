import { useState, useRef, useEffect } from 'react';
import { Shield, Mic, MicOff, Volume2, Download, AlertTriangle, ArrowLeft, Square } from 'lucide-react';

interface YellowSectorProps {
  onBack: () => void;
  onGoRed: () => void;
}

export function YellowSector({ onBack, onGoRed }: YellowSectorProps) {
  const [mode, setMode] = useState<'menu' | 'recording'>('menu');
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [hasVoiceWarning, setHasVoiceWarning] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      stopTimer();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  async function startRecording(withVoice: boolean) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioUrl(URL.createObjectURL(blob));
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setAudioUrl(null);
      setElapsed(0);
      setMode('recording');

      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);

      if (withVoice) {
        speakWarning();
      }
    } catch {
      alert('Не вдалося отримати доступ до мікрофона. Перевірте дозволи у налаштуваннях браузера.');
    }
  }

  function speakWarning() {
    const text = 'Увага! Ведеться фіксація порушення закону, докази будуть збережені.';

    if ('speechSynthesis' in window) {
      const voices = window.speechSynthesis.getVoices();
      const ukVoice = voices.find((v) => v.lang === 'uk-UA' || v.lang === 'uk');

      if (ukVoice || voices.length > 0) {
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'uk-UA';
        if (ukVoice) utter.voice = ukVoice;
        utter.rate = 0.9;
        utter.pitch = 1;
        utter.volume = 1;
        window.speechSynthesis.speak(utter);
        setHasVoiceWarning(true);
        return;
      }
    }

    // Fallback: Web Audio API attention beep
    playAttentionBeep();
    setHasVoiceWarning(false);
  }

  function playAttentionBeep() {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const now = ctx.currentTime;

      [0, 0.4, 0.8].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = 'square';
        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(0.3, now + delay + 0.05);
        gain.gain.linearRampToValueAtTime(0, now + delay + 0.3);
        osc.start(now + delay);
        osc.stop(now + delay + 0.3);
      });
    } catch { /* ignore */ }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    stopTimer();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  function downloadAudio() {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    const date = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.download = `ai-patrol-audio-${date}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function resetToMenu() {
    setMode('menu');
    setAudioUrl(null);
    setElapsed(0);
    setHasVoiceWarning(false);
  }

  if (mode === 'recording') {
    return (
      <div className="min-h-screen bg-ink-900 animate-fade-in">
        <div className="yellow-warn-stripes h-3" />
        <div className="min-h-[calc(100vh-12px)] flex flex-col">
          {/* Warning banner */}
          <div className="bg-amber-500 text-ink-900 px-4 py-3 flex items-center gap-3 font-bold text-sm text-center justify-center">
            <Volume2 size={20} className="shrink-0" />
            <span>УВАГА! Збільште гучність телефону на максимум кнопками збоку</span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-6">
            {/* Pulsing border container */}
            <div className="w-full max-w-sm rounded-3xl border-4 border-amber-500 animate-pulse-border p-8 bg-ink-800/80 flex flex-col items-center gap-6">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center ${
                recording ? 'bg-amber-500/20 animate-pulse-soft' : 'bg-ink-700'
              }`}>
                {recording ? (
                  <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center">
                    <Mic size={28} className="text-ink-900" />
                  </div>
                ) : (
                  <MicOff size={32} className="text-ink-300" />
                )}
              </div>

              <div className="text-center">
                <p className="text-amber-400 font-bold text-lg">
                  {recording ? 'Запис активний' : 'Запис зупинено'}
                </p>
                <p className="text-6xl font-mono font-bold text-white mt-2 tracking-wider">
                  {formatTime(elapsed)}
                </p>
                {recording && (
                  <p className="text-ink-200 text-sm mt-2">
                    {hasVoiceWarning ? 'Голосове попередження озвучено' : 'Режим запису без звуку'}
                  </p>
                )}
              </div>

              {recording ? (
                <button
                  onClick={stopRecording}
                  className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <Square size={20} fill="currentColor" /> Зупинити запис
                </button>
              ) : (
                <>
                  <p className="text-emerald-400 text-sm font-medium text-center">Запис збережено у пам'яті пристрою</p>
                  <button
                    onClick={downloadAudio}
                    className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20"
                  >
                    <Download size={24} /> Зберегти аудіодоказ на пристрій
                  </button>
                  <button
                    onClick={resetToMenu}
                    className="w-full py-3 text-ink-200 text-sm hover:text-white transition-colors"
                  >
                    ← Повернутися до меню
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Quick launch bar */}
          <QuickLaunchBar onGoYellow={() => resetToMenu()} onGoRed={onGoRed} current="yellow" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-900 flex flex-col animate-fade-in">
      <Header onBack={onBack} title="Голосовий щит" subtitle="Аудіофіксація та попередження" color="amber" />

      <div className="flex-1 flex flex-col p-6 gap-4">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-amber-200 text-sm leading-relaxed">
            Оберіть режим: з голосовим попередженням або тихий запис. Докази зберігаються лише на вашому пристрої.
          </p>
        </div>

        <button
          onClick={() => startRecording(true)}
          className="w-full py-6 bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-ink-900 font-bold text-xl rounded-3xl flex flex-col items-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-amber-500/20"
        >
          <Volume2 size={32} />
          Увімкнути голосове попередження
          <span className="text-sm font-normal opacity-80">Озвучить попередження + почне запис</span>
        </button>

        <button
          onClick={() => startRecording(false)}
          className="w-full py-6 bg-ink-700 hover:bg-ink-600 border border-ink-500 text-white font-bold text-xl rounded-3xl flex flex-col items-center gap-2 transition-all active:scale-[0.98]"
        >
          <Mic size={32} className="text-ink-100" />
          Тихий режим (Тільки запис)
          <span className="text-sm font-normal text-ink-200">Без звуку — лише таймер і запис</span>
        </button>

        <div className="mt-auto bg-ink-800 rounded-2xl p-4">
          <p className="text-ink-200 text-xs leading-relaxed">
            <Shield size={14} className="inline mr-1 text-amber-400" />
            Аудіозаписи зберігаються виключно локально на вашому пристрої і не передаються на сервер.
          </p>
        </div>
      </div>

      <QuickLaunchBar onGoYellow={() => {}} onGoRed={onGoRed} current="yellow" />
    </div>
  );
}

function Header({ onBack, title, subtitle, color }: { onBack: () => void; title: string; subtitle: string; color: 'green' | 'amber' | 'red' }) {
  const colorMap = {
    green: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
  };
  return (
    <div className="safe-top bg-ink-800/50 px-4 py-3 flex items-center gap-3 border-b border-ink-700">
      <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-ink-700 hover:bg-ink-600 transition-colors text-white">
        <ArrowLeft size={20} />
      </button>
      <div>
        <h1 className={`text-lg font-bold ${colorMap[color]}`}>{title}</h1>
        <p className="text-xs text-ink-200">{subtitle}</p>
      </div>
    </div>
  );
}

export function QuickLaunchBar({ onGoYellow, onGoRed, current }: { onGoYellow: () => void; onGoRed: () => void; current: string }) {
  return (
    <div className="safe-bottom sticky bottom-0 bg-ink-800/95 backdrop-blur border-t border-ink-600 px-4 py-2.5 flex gap-3">
      <button
        onClick={onGoYellow}
        disabled={current === 'yellow'}
        className="flex-1 py-3 bg-amber-500/15 hover:bg-amber-500/25 disabled:opacity-40 border border-amber-500/40 rounded-xl font-semibold text-amber-400 text-sm transition-all flex items-center justify-center gap-1.5"
      >
        🟡 Жовтий щит
      </button>
      <button
        onClick={onGoRed}
        disabled={current === 'red'}
        className="flex-1 py-3 bg-red-500/15 hover:bg-red-500/25 disabled:opacity-40 border border-red-500/40 rounded-xl font-semibold text-red-400 text-sm transition-all flex items-center justify-center gap-1.5"
      >
        🔴 Екстрений SOS
      </button>
    </div>
  );
}

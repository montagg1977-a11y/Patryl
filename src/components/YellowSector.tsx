import { useState, useRef, useEffect } from 'react';
import {
  Shield,
  Mic,
  Volume2,
  VolumeX,
  AlertTriangle,
  ArrowLeft,
  Square,
  Share2,
  CheckCircle2,
  WifiOff,
  X,
  RotateCcw,
} from 'lucide-react';

interface YellowSectorProps {
  onBack: () => void;
  onGoRed: () => void;
  onGoGreen: () => void;
}

type Phase = 'choose' | 'recording' | 'done';

const WARNING_TEXT = 'Увага! Ведеться фіксація порушення закону, докази будуть збережені.';
const OFFLINE_MESSAGE = "Файл збережено. Ви можете надіслати його, коли з'явиться інтернет";

const MIME_CANDIDATES: { mime: string; ext: string }[] = [
  { mime: 'audio/webm;codecs=opus', ext: 'webm' },
  { mime: 'audio/webm', ext: 'webm' },
  { mime: 'audio/mp4', ext: 'mp4' },
  { mime: 'audio/ogg;codecs=opus', ext: 'ogg' },
  { mime: 'audio/ogg', ext: 'ogg' },
];

function pickMimeType(): { mime: string; ext: string } | null {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return null;
  return MIME_CANDIDATES.find((c) => MediaRecorder.isTypeSupported(c.mime)) ?? null;
}

function extFromMime(mime: string): string {
  if (mime.includes('mp4') || mime.includes('aac')) return 'mp4';
  if (mime.includes('ogg')) return 'ogg';
  return 'webm';
}

function buildFileName(date: Date, ext: string): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `dokaz-${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}-${p(date.getHours())}-${p(date.getMinutes())}.${ext}`;
}

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mmss = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}

function triggerDownload(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function YellowSector({ onBack, onGoRed, onGoGreen }: YellowSectorProps) {
  const [phase, setPhase] = useState<Phase>('choose');
  const [withSound, setWithSound] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
    return () => {
      stopTimer();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => {});
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  function showToast(message: string) {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 6000);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function unlockAudio() {
    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctor();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      // A silent one-sample buffer fully unlocks audio output on iOS Safari.
      const buffer = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.start(0);
    } catch {
      /* audio unlock is best-effort */
    }
  }

  function speakWarning() {
    if (!('speechSynthesis' in window)) {
      playAttentionBeep();
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(WARNING_TEXT);
    const voices = synth.getVoices();
    const voice =
      voices.find((v) => v.lang === 'uk-UA' || v.lang.toLowerCase().startsWith('uk')) ??
      voices.find((v) => v.lang.toLowerCase().startsWith('ru')) ??
      voices.find((v) => v.lang.toLowerCase().startsWith('pl'));
    utter.lang = voice?.lang ?? 'uk-UA';
    if (voice) utter.voice = voice;
    utter.rate = 0.9;
    utter.pitch = 1;
    utter.volume = 1;
    utter.onerror = () => playAttentionBeep();
    synth.resume();
    synth.speak(utter);
  }

  function playAttentionBeep() {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
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
    } catch {
      /* ignore */
    }
  }

  async function startRecording(sound: boolean) {
    if (starting) return;
    setStarting(true);
    setWithSound(sound);

    // Audio unlock and speech must run synchronously inside the tap gesture,
    // before any await, or mobile browsers will block playback.
    if (sound) {
      unlockAudio();
      speakWarning();
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        throw new Error('unsupported');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const picked = pickMimeType();
      const mr = picked ? new MediaRecorder(stream, { mimeType: picked.mime }) : new MediaRecorder(stream);
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const mime = mr.mimeType || picked?.mime || 'audio/webm';
        const baseMime = mime.split(';')[0];
        const blob = new Blob(chunksRef.current, { type: baseMime });
        const name = buildFileName(new Date(startedAtRef.current), picked?.ext ?? extFromMime(mime));
        const recorded = new File([blob], name, { type: baseMime });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        setFile(recorded);
        setAudioUrl(URL.createObjectURL(recorded));
        setPhase('done');
        triggerDownload(recorded);
      };

      mr.start(1000);
      mediaRecorderRef.current = mr;
      startedAtRef.current = Date.now();
      setElapsed(0);
      setFile(null);
      setAudioUrl(null);
      setPhase('recording');

      stopTimer();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);
    } catch {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      showToast('Не вдалося отримати доступ до мікрофона. Перевірте дозволи у налаштуваннях браузера.');
    } finally {
      setStarting(false);
    }
  }

  function stopRecording() {
    stopTimer();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      mr.stop();
    }
  }

  async function shareAudio() {
    if (!file) return;

    const shareData: ShareData = { files: [file], title: 'Аудіодоказ' };
    const canShareFiles =
      typeof navigator.share === 'function' &&
      (typeof navigator.canShare !== 'function' || navigator.canShare(shareData));

    if (!navigator.onLine || !canShareFiles) {
      showToast(OFFLINE_MESSAGE);
      return;
    }

    try {
      await navigator.share(shareData);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      showToast(OFFLINE_MESSAGE);
    }
  }

  function resetToChoose() {
    setPhase('choose');
    setFile(null);
    setAudioUrl(null);
    setElapsed(0);
  }

  function leaveTo(go: () => void) {
    if (phase === 'recording') stopRecording();
    go();
  }

  return (
    <div className="min-h-screen bg-ink-900 flex flex-col animate-fade-in">
      {phase === 'recording' ? (
        <div className="yellow-warn-stripes h-3 safe-top" aria-hidden="true" />
      ) : (
        <Header
          onBack={() => (phase === 'done' ? resetToChoose() : onBack())}
          title="Голосовий щит"
          subtitle="Аудіофіксація та попередження"
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <main className="flex-1 flex flex-col">
        {phase === 'choose' && <ChooseMode starting={starting} onStart={startRecording} />}

        {phase === 'recording' && (
          <RecordingView withSound={withSound} elapsed={elapsed} onStop={stopRecording} />
        )}

        {phase === 'done' && file && (
          <DoneView
            fileName={file.name}
            audioUrl={audioUrl}
            elapsed={elapsed}
            onShare={shareAudio}
            onSaveAgain={() => triggerDownload(file)}
            onNew={resetToChoose}
          />
        )}
      </main>

      <QuickLaunchBar
        current="yellow"
        onGoYellow={() => {}}
        onGoGreen={() => leaveTo(onGoGreen)}
        onGoRed={() => leaveTo(onGoRed)}
      />
    </div>
  );
}

function ChooseMode({ starting, onStart }: { starting: boolean; onStart: (sound: boolean) => void }) {
  return (
    <div className="flex-1 flex flex-col p-6 gap-4 max-w-md mx-auto w-full">
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-amber-200 text-sm leading-relaxed">
          Оберіть режим запису. Докази зберігаються лише на вашому пристрої.
        </p>
      </div>

      <div className="flex-1 flex flex-col gap-4 justify-center">
        <button
          type="button"
          onClick={() => onStart(true)}
          disabled={starting}
          className="w-full py-8 px-5 bg-gradient-to-br from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-60 text-ink-900 rounded-3xl flex flex-col items-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-amber-500/25"
        >
          <span className="w-16 h-16 rounded-2xl bg-black/15 flex items-center justify-center">
            <Volume2 size={36} aria-hidden="true" />
          </span>
          <span className="font-bold text-2xl">Зі звуком</span>
          <span className="text-sm opacity-80 text-center text-pretty">
            Голосове попередження + запис з мікрофона
          </span>
        </button>

        <button
          type="button"
          onClick={() => onStart(false)}
          disabled={starting}
          className="w-full py-8 px-5 bg-ink-700 hover:bg-ink-600 disabled:opacity-60 border-2 border-amber-500/40 text-white rounded-3xl flex flex-col items-center gap-3 transition-all active:scale-[0.98]"
        >
          <span className="w-16 h-16 rounded-2xl bg-ink-800 flex items-center justify-center">
            <VolumeX size={36} className="text-amber-400" aria-hidden="true" />
          </span>
          <span className="font-bold text-2xl">Без звуку</span>
          <span className="text-sm text-ink-200 text-center text-pretty">
            Тихий запис без сигналів та озвучки
          </span>
        </button>
      </div>

      <div className="bg-ink-800 rounded-2xl p-4">
        <p className="text-ink-200 text-xs leading-relaxed">
          <Shield size={14} className="inline mr-1 text-amber-400" aria-hidden="true" />
          Аудіозаписи зберігаються виключно локально на вашому пристрої і не передаються на сервер.
        </p>
      </div>
    </div>
  );
}

function RecordingView({
  withSound,
  elapsed,
  onStop,
}: {
  withSound: boolean;
  elapsed: number;
  onStop: () => void;
}) {
  return (
    <>
      {withSound ? (
        <div className="bg-amber-500 text-ink-900 px-4 py-3 flex items-center gap-3 font-bold text-sm justify-center text-center">
          <Volume2 size={20} className="shrink-0" aria-hidden="true" />
          <span>Збільште гучність телефону на максимум кнопками збоку</span>
        </div>
      ) : (
        <div className="bg-ink-800 border-b border-amber-500/40 text-amber-300 px-4 py-3 flex items-center gap-3 font-bold text-sm justify-center">
          <VolumeX size={20} className="shrink-0" aria-hidden="true" />
          <span>Режим запису без звуку</span>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-3xl border-4 border-amber-500 animate-pulse-border p-8 bg-ink-800/80 flex flex-col items-center gap-6">
          <div className="w-24 h-24 rounded-full flex items-center justify-center bg-amber-500/20 animate-pulse-soft">
            <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center">
              <Mic size={28} className="text-ink-900" aria-hidden="true" />
            </div>
          </div>

          <div className="text-center" role="status" aria-live="polite">
            <p className="flex items-center justify-center gap-2 text-amber-400 font-bold text-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
              {withSound ? 'Запис активний' : 'Режим запису без звуку'}
            </p>
            <p
              className="text-6xl font-mono font-bold text-white mt-2 tracking-wider tabular-nums"
              aria-label={`Тривалість запису ${formatTime(elapsed)}`}
            >
              {formatTime(elapsed)}
            </p>
            {withSound && (
              <p className="text-ink-200 text-sm mt-2">Голосове попередження озвучено</p>
            )}
          </div>

          <button
            type="button"
            onClick={onStop}
            className="w-full py-5 bg-red-600 hover:bg-red-500 text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-red-600/25"
          >
            <Square size={20} fill="currentColor" aria-hidden="true" /> Зупинити запис
          </button>
        </div>
      </div>
    </>
  );
}

function DoneView({
  fileName,
  audioUrl,
  elapsed,
  onShare,
  onSaveAgain,
  onNew,
}: {
  fileName: string;
  audioUrl: string | null;
  elapsed: number;
  onShare: () => void;
  onSaveAgain: () => void;
  onNew: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-3xl border border-emerald-500/40 p-6 bg-ink-800/80 flex flex-col items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center">
          <CheckCircle2 size={44} className="text-emerald-400" aria-hidden="true" />
        </div>

        <div className="text-center">
          <p className="text-emerald-400 font-bold text-lg">Запис збережено на пристрій</p>
          <p className="text-ink-200 text-sm mt-1 break-all font-mono">{fileName}</p>
          <p className="text-ink-300 text-xs mt-1">Тривалість: {formatTime(elapsed)}</p>
        </div>

        {audioUrl && (
          <audio controls src={audioUrl} className="w-full" aria-label="Прослухати аудіодоказ" />
        )}

        <button
          type="button"
          onClick={onShare}
          className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xl rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/25"
        >
          <Share2 size={24} aria-hidden="true" /> Поділитися
        </button>

        <div className="w-full flex gap-3">
          <button
            type="button"
            onClick={onSaveAgain}
            className="flex-1 py-3 bg-ink-700 hover:bg-ink-600 border border-ink-500 text-ink-100 text-sm font-medium rounded-xl transition-colors"
          >
            Зберегти ще раз
          </button>
          <button
            type="button"
            onClick={onNew}
            className="flex-1 py-3 bg-ink-700 hover:bg-ink-600 border border-ink-500 text-ink-100 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <RotateCcw size={14} aria-hidden="true" /> Новий запис
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed top-4 inset-x-4 z-50 flex justify-center pointer-events-none safe-top">
      <div
        role="alert"
        className="pointer-events-auto w-full max-w-md bg-amber-500 text-ink-900 rounded-2xl shadow-2xl shadow-black/50 p-4 flex items-start gap-3 animate-fade-in"
      >
        <WifiOff size={20} className="shrink-0 mt-0.5" aria-hidden="true" />
        <p className="flex-1 text-sm font-semibold leading-snug">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 transition-colors"
          aria-label="Закрити повідомлення"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

function Header({ onBack, title, subtitle }: { onBack: () => void; title: string; subtitle: string }) {
  return (
    <header className="safe-top bg-ink-800/50 px-4 py-3 flex items-center gap-3 border-b border-ink-700">
      <button
        type="button"
        onClick={onBack}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-ink-700 hover:bg-ink-600 transition-colors text-white"
        aria-label="Назад"
      >
        <ArrowLeft size={20} />
      </button>
      <div>
        <h1 className="text-lg font-bold text-amber-400">{title}</h1>
        <p className="text-xs text-ink-200">{subtitle}</p>
      </div>
    </header>
  );
}

export function QuickLaunchBar({
  onGoYellow,
  onGoRed,
  onGoGreen,
  current,
}: {
  onGoYellow: () => void;
  onGoRed: () => void;
  onGoGreen?: () => void;
  current: string;
}) {
  const showGreen = current === 'yellow' && onGoGreen;
  return (
    <nav
      aria-label="Швидкий перехід"
      className="safe-bottom sticky bottom-0 bg-ink-800/95 backdrop-blur border-t border-ink-600 px-4 py-2.5 flex gap-3"
    >
      {showGreen ? (
        <button
          type="button"
          onClick={onGoGreen}
          className="flex-1 py-3 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 rounded-xl font-semibold text-emerald-400 text-sm transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
        >
          <Shield size={16} aria-hidden="true" /> Мої бронежилети
        </button>
      ) : (
        <button
          type="button"
          onClick={onGoYellow}
          disabled={current === 'yellow'}
          className="flex-1 py-3 bg-amber-500/15 hover:bg-amber-500/25 disabled:opacity-40 border border-amber-500/40 rounded-xl font-semibold text-amber-400 text-sm transition-all flex items-center justify-center gap-1.5"
        >
          <Volume2 size={16} aria-hidden="true" /> Жовтий щит
        </button>
      )}
      <button
        type="button"
        onClick={onGoRed}
        disabled={current === 'red'}
        className="flex-1 py-3 bg-red-500/15 hover:bg-red-500/25 disabled:opacity-40 border border-red-500/40 rounded-xl font-semibold text-red-400 text-sm transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
      >
        <AlertTriangle size={16} aria-hidden="true" /> Екстрений SOS
      </button>
    </nav>
  );
}

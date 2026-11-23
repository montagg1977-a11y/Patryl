import { useState } from 'react';
import { Shield, Volume2, AlertTriangle, Phone, X, FileText, Lock, Settings, ChevronRight } from 'lucide-react';
import type { Sector } from './types';
import { getIsPro, consumeUnlockParam, isInstallBannerDismissed, dismissInstallBanner } from './storage';
import { YellowSector } from './components/YellowSector';
import { RedSector } from './components/RedSector';
import { GreenSector } from './components/GreenSector';
import { LegalModal } from './components/LegalModal';
import { PaywallModal } from './components/PaywallModal';

export default function App() {
  const [sector, setSector] = useState<Sector>('home');
  const [isPro, setIsProState] = useState(() => consumeUnlockParam() || getIsPro());
  const [legalModal, setLegalModal] = useState<'offer' | 'privacy' | 'subscription' | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [openGreenAfterUnlock, setOpenGreenAfterUnlock] = useState(false);
  const [showBanner, setShowBanner] = useState(!isInstallBannerDismissed());

  function goGreen() {
    if (isPro || getIsPro()) {
      setIsProState(true);
      setSector('green');
      return;
    }
    setOpenGreenAfterUnlock(true);
    setPaywallOpen(true);
  }

  function openPaywall() {
    setOpenGreenAfterUnlock(false);
    setPaywallOpen(true);
  }

  function closePaywall() {
    setPaywallOpen(false);
    setOpenGreenAfterUnlock(false);
  }

  function handleUnlock() {
    setIsProState(true);
    if (openGreenAfterUnlock) setSector('green');
    setOpenGreenAfterUnlock(false);
  }

  const paywall = (
    <PaywallModal open={paywallOpen} onClose={closePaywall} onUnlocked={handleUnlock} />
  );

  function handleBannerClose() {
    setShowBanner(false);
    dismissInstallBanner();
  }

  if (sector === 'yellow') {
    return (
      <>
        <YellowSector
          onBack={() => setSector('home')}
          onGoRed={() => setSector('red')}
          onGoGreen={goGreen}
        />
        {paywall}
      </>
    );
  }

  if (sector === 'red') {
    return <RedSector onBack={() => setSector('home')} onGoYellow={() => setSector('yellow')} />;
  }

  if (sector === 'green' && isPro) {
    return (
      <GreenSector
        onBack={() => setSector('home')}
        onGoYellow={() => setSector('yellow')}
        onGoRed={() => setSector('red')}
        isPro={isPro}
        onUnlock={handleUnlock}
      />
    );
  }

  return (
    <div className="min-h-screen bg-ink-900 flex flex-col safe-top">
      <HomeScreen
        onSector={(s) => (s === 'green' ? goGreen() : setSector(s))}
        isPro={isPro}
        showBanner={showBanner}
        onBannerClose={handleBannerClose}
        onLegal={setLegalModal}
        onPaywall={openPaywall}
      />

      <LegalModal
        open={legalModal !== null}
        type={legalModal ?? 'offer'}
        onClose={() => setLegalModal(null)}
      />

      {paywall}
    </div>
  );
}

interface HomeScreenProps {
  onSector: (s: Sector) => void;
  isPro: boolean;
  showBanner: boolean;
  onBannerClose: () => void;
  onLegal: (type: 'offer' | 'privacy' | 'subscription') => void;
  onPaywall: () => void;
}

function HomeScreen({ onSector, isPro, showBanner, onBannerClose, onLegal, onPaywall }: HomeScreenProps) {
  return (
    <>
      <div className="flex-1 flex flex-col px-5 pt-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-ink-700 border border-ink-600 mb-3">
            <TrafficLightIcon />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">АІ Патруль</h1>
          <p className="text-ink-200 text-sm mt-1">Ваш правовий світлофор</p>
        </div>

        {/* 3 Big buttons */}
        <div className="flex-1 flex flex-col gap-3 max-w-md mx-auto w-full justify-center pb-4">
          <BigButton
            color="green"
            icon={<Shield size={28} />}
            title="Мої бронежилети"
            subtitle="Алгоритми дій та захист"
            onClick={() => onSector('green')}
          />
          <BigButton
            color="yellow"
            icon={<Volume2 size={28} />}
            title="Голосовий щит"
            subtitle="Попередження та аудіофіксація"
            onClick={() => onSector('yellow')}
          />
          <BigButton
            color="red"
            icon={<AlertTriangle size={28} />}
            title="Екстрений SOS"
            subtitle="Швидкі координати близьким"
            onClick={() => onSector('red')}
          />
        </div>

        {/* Install banner */}
        {showBanner && (
          <div className="max-w-md mx-auto w-full bg-ink-800 border border-ink-600 rounded-2xl p-4 mb-3 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-white text-sm font-medium leading-snug">
                  Додайте АІ Патруль на екран телефону, щоб відкривати одним натисканням без інтернету
                </p>
                <div className="mt-2 space-y-1 text-xs text-ink-200">
                  <p><span className="text-emerald-400 font-medium">iPhone:</span> Поділитися → На початковий екран</p>
                  <p><span className="text-sky-400 font-medium">Android:</span> Меню → Встановити додаток</p>
                </div>
              </div>
              <button
                onClick={onBannerClose}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-ink-600 hover:bg-ink-500 text-ink-200 transition-colors"
                aria-label="Закрити підказку"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="safe-bottom px-5 pt-3 pb-2 border-t border-ink-700 bg-ink-800/50">
        <p className="text-center text-xs text-ink-300 mb-3 leading-relaxed">
          Довідкова інформація. Не замінює консультацію юриста.
        </p>

        {/* Quick call */}
        <a
          href="tel:0800213103"
          className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 font-semibold mb-3 transition-all hover:bg-emerald-500/15 active:scale-[0.98]"
        >
          <Phone size={18} />
          Безоплатна правнича допомога
          <span className="font-mono font-bold">0 800 213 103</span>
        </a>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
          <button onClick={() => onLegal('offer')} className="text-ink-200 hover:text-white transition-colors flex items-center gap-1">
            <FileText size={12} /> Публічна оферта
          </button>
          <button onClick={() => onLegal('privacy')} className="text-ink-200 hover:text-white transition-colors flex items-center gap-1">
            <FileText size={12} /> Політика конфіденційності
          </button>
          <button onClick={() => onLegal('subscription')} className="text-ink-200 hover:text-white transition-colors flex items-center gap-1">
            <Settings size={12} /> Керування підпискою
          </button>
        </div>

        {/* Pro access quick link */}
        {!isPro && (
          <button
            onClick={onPaywall}
            className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 text-xs text-ink-300 hover:text-amber-400 transition-colors"
          >
            <Lock size={11} /> Вже оплатили? Ввести код доступу
          </button>
        )}

        {isPro && (
          <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-emerald-400">
            <Shield size={11} /> Повний доступ активовано
          </div>
        )}
      </footer>
    </>
  );
}

function BigButton({
  color,
  icon,
  title,
  subtitle,
  onClick,
}: {
  color: 'green' | 'yellow' | 'red';
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  const styles = {
    green: {
      className: 'from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-emerald-500/25',
      text: 'text-white',
    },
    yellow: {
      className: 'from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-amber-500/25',
      text: 'text-ink-900',
    },
    red: {
      className: 'from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-red-500/25',
      text: 'text-white',
    },
  };
  const s = styles[color];

  return (
    <button
      onClick={onClick}
      className={`relative w-full py-6 px-5 bg-gradient-to-br ${s.className} ${s.text} rounded-3xl flex items-center gap-4 transition-all active:scale-[0.98] shadow-lg`}
    >
      <div className="shrink-0 w-14 h-14 rounded-2xl bg-black/15 flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 text-left">
        <p className="font-bold text-xl">{title}</p>
        <p className="text-sm opacity-80 mt-0.5">{subtitle}</p>
      </div>
      <ChevronRight size={24} className="opacity-60 shrink-0" />
    </button>
  );
}

function TrafficLightIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <rect x="7" y="1" width="10" height="22" rx="3" fill="#1a1a1d" stroke="#33333a" strokeWidth="0.5" />
      <circle cx="12" cy="6" r="2.5" fill="#22c55e" />
      <circle cx="12" cy="12" r="2.5" fill="#facc15" />
      <circle cx="12" cy="18" r="2.5" fill="#ef4444" />
    </svg>
  );
}

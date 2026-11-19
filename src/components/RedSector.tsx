import { useState, useRef } from 'react';
import {
  ArrowLeft, Phone, MapPin, Send, Share2, UserPlus, Trash2,
  MessageSquare, AlertTriangle, Check, Loader2, Navigation,
} from 'lucide-react';
import { QuickLaunchBar } from './YellowSector';
import { getSosSettings, saveSosSettings } from '../storage';
import type { SosSettings, EmergencyContact } from '../types';

interface RedSectorProps {
  onBack: () => void;
  onGoYellow: () => void;
}

export function RedSector({ onBack, onGoYellow }: RedSectorProps) {
  const [settings, setSettings] = useState<SosSettings>(getSosSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapsUrl, setMapsUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [sentStatus, setSentStatus] = useState('');
  const shareRef = useRef<HTMLDivElement>(null);

  function addContact() {
    if (settings.contacts.length >= 2) return;
    setSettings({
      ...settings,
      contacts: [...settings.contacts, { name: '', phone: '' }],
    });
  }

  function updateContact(idx: number, field: keyof EmergencyContact, value: string) {
    const contacts = [...settings.contacts];
    contacts[idx] = { ...contacts[idx], [field]: value };
    setSettings({ ...settings, contacts });
  }

  function removeContact(idx: number) {
    const contacts = settings.contacts.filter((_, i) => i !== idx);
    setSettings({ ...settings, contacts });
  }

  function handleSaveSettings() {
    saveSosSettings(settings);
    setShowSettings(false);
  }

  function getSosMessage(): string {
    const base = settings.messageTemplate || 'Я в небезпеці! Мої координати:';
    if (mapsUrl) {
      return `${base} ${mapsUrl}`;
    }
    return base;
  }

  function handleSendSos() {
    setGeoError('');
    setSentStatus('');

    if (!navigator.geolocation) {
      setGeoError('Геолокація не підтримується вашим пристроєм');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const url = `https://maps.google.com/maps?q=${latitude},${longitude}`;
        setCoords({ lat: latitude, lng: longitude });
        setMapsUrl(url);
        setLoading(false);
        setSentStatus('Готово! Оберіть канал відправки нижче.');
      },
      (err) => {
        setLoading(false);
        const messages: Record<number, string> = {
          1: 'Доступ до геолокації заборонено. Дозвольте доступ у налаштуваннях.',
          2: 'Не вдалося визначити місцезнаходження.',
          3: 'Час очікування вийшов. Спробуйте ще раз.',
        };
        setGeoError(messages[err.code] || 'Помилка геолокації');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function sendSms() {
    const msg = getSosMessage();
    const phones = settings.contacts.map((c) => c.phone).filter(Boolean).join(',');
    window.location.href = `sms:${phones}?body=${encodeURIComponent(msg)}`;
  }

  function sendTelegram() {
    const msg = getSosMessage();
    window.open(`https://t.me/share/url?url=${encodeURIComponent(mapsUrl || '')}&text=${encodeURIComponent(msg)}`, '_blank');
  }

  function sendWhatsApp() {
    const msg = getSosMessage();
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  }

  async function shareApp() {
    const shareText = 'Встанови цей правовий світлофор на головний екран про всяк випадок';
    const shareUrl = window.location.origin;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'АІ Патруль', text: shareText, url: shareUrl });
      } catch { /* user cancelled */ }
    } else {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
    }
  }

  const hasContacts = settings.contacts.some((c) => c.phone.trim());

  return (
    <div className="min-h-screen bg-ink-900 flex flex-col animate-fade-in">
      <div className="safe-top bg-ink-800/50 px-4 py-3 flex items-center gap-3 border-b border-ink-700">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-ink-700 hover:bg-ink-600 transition-colors text-white">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-red-400">Екстрений SOS</h1>
          <p className="text-xs text-ink-200">Швидке сповіщення близьким</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-6 gap-4" ref={shareRef}>
        {/* Settings section */}
        <div className="bg-ink-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center justify-between px-4 py-4 text-left"
          >
            <div className="flex items-center gap-2">
              <UserPlus size={18} className="text-red-400" />
              <span className="font-semibold text-white text-sm">
                Контакти та шаблон {hasContacts && <span className="text-emerald-400">✓</span>}
              </span>
            </div>
            <span className="text-ink-300 text-xs">{showSettings ? 'Закрити' : 'Налаштувати'}</span>
          </button>

          {showSettings && (
            <div className="px-4 pb-4 space-y-3 animate-fade-in">
              {settings.contacts.map((contact, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={contact.name}
                    onChange={(e) => updateContact(idx, 'name', e.target.value)}
                    placeholder={`Ім'я контакту ${idx + 1}`}
                    className="flex-1 min-w-0 px-3 py-2.5 bg-ink-700 border border-ink-500 rounded-xl text-white placeholder-ink-300 text-sm focus:border-red-500 focus:outline-none"
                  />
                  <input
                    type="tel"
                    value={contact.phone}
                    onChange={(e) => updateContact(idx, 'phone', e.target.value)}
                    placeholder="+380..."
                    className="flex-1 min-w-0 px-3 py-2.5 bg-ink-700 border border-ink-500 rounded-xl text-white placeholder-ink-300 text-sm focus:border-red-500 focus:outline-none"
                  />
                  <button
                    onClick={() => removeContact(idx)}
                    className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {settings.contacts.length < 2 && (
                <button
                  onClick={addContact}
                  className="w-full py-2.5 border border-dashed border-ink-400 rounded-xl text-ink-200 text-sm hover:border-red-500 hover:text-red-400 transition-colors"
                >
                  + Додати контакт (до 2-х)
                </button>
              )}
              <div>
                <label className="block text-xs text-ink-200 mb-1.5">Шаблон повідомлення</label>
                <textarea
                  value={settings.messageTemplate}
                  onChange={(e) => setSettings({ ...settings, messageTemplate: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2.5 bg-ink-700 border border-ink-500 rounded-xl text-white text-sm focus:border-red-500 focus:outline-none resize-none"
                />
              </div>
              <button
                onClick={handleSaveSettings}
                className="w-full py-3 bg-ink-600 hover:bg-ink-500 text-white font-medium rounded-xl text-sm transition-colors"
              >
                Зберегти налаштування
              </button>
            </div>
          )}
        </div>

        {/* Location info */}
        {coords && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3 animate-fade-in">
            <MapPin size={20} className="text-emerald-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-emerald-300 text-sm font-medium">Координати визначено</p>
              <p className="text-ink-200 text-xs font-mono truncate">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </p>
            </div>
          </div>
        )}

        {geoError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{geoError}</p>
          </div>
        )}

        {/* SOS button */}
        <button
          onClick={handleSendSos}
          disabled={loading}
          className="w-full py-8 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:opacity-60 text-white font-bold text-2xl rounded-3xl flex flex-col items-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-red-500/30 animate-pulse-red"
        >
          {loading ? (
            <>
              <Loader2 size={32} className="animate-spin" />
              Визначення координат...
            </>
          ) : (
            <>
              <Send size={32} />
              НАДІСЛАТИ SOS ЗАРАЗ
            </>
          )}
        </button>

        {sentStatus && (
          <p className="text-center text-emerald-400 text-sm font-medium animate-fade-in">{sentStatus}</p>
        )}

        {/* Send channels */}
        {mapsUrl && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-center text-ink-200 text-sm">Оберіть канал відправки:</p>
            <button
              onClick={sendSms}
              className="w-full py-5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
            >
              <MessageSquare size={22} /> SMS
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={sendTelegram}
                className="py-5 bg-[#0088cc] hover:bg-[#0099dd] text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Send size={20} /> Telegram
              </button>
              <button
                onClick={sendWhatsApp}
                className="py-5 bg-[#25D366] hover:bg-[#2ee673] text-ink-900 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Phone size={20} /> WhatsApp
              </button>
            </div>
          </div>
        )}

        {/* Share app */}
        {hasContacts && (
          <button
            onClick={shareApp}
            className="w-full py-4 bg-ink-700 hover:bg-ink-600 border border-ink-500 text-white font-medium rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Share2 size={20} /> Поділитися АІ Патрулем із близькими
          </button>
        )}

        {/* Info */}
        <div className="bg-ink-800 rounded-2xl p-4 mt-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-ink-200 text-xs flex items-center gap-1.5">
              <Navigation size={12} className="text-red-400" /> Геолокація визначається у реальному часі
            </p>
          </div>
          <p className="text-ink-300 text-xs">
            <Check size={12} className="inline mr-1 text-emerald-400" />
            Контакти та налаштування зберігаються лише на вашому пристрої.
          </p>
        </div>
      </div>

      <QuickLaunchBar onGoYellow={onGoYellow} onGoRed={() => {}} current="red" />
    </div>
  );
}

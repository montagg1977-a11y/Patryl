import { useState, type FormEvent } from 'react';
import { Check, Crown, KeyRound, ExternalLink } from 'lucide-react';
import { Modal } from './Modal';
import { isValidAccessCode, setIsPro } from '../storage';

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  onUnlocked: () => void;
  context?: string;
}

const GUMROAD_URL = 'https://montagg.gumroad.com/l/socuf';

const BENEFITS = [
  'Повний доступ до всіх «Бронежилетів»',
  'Усі алгоритми дій у правових ситуаціях',
  'Регулярні оновлення та нові сценарії',
];

export function PaywallModal({ open, onClose, onUnlocked, context }: PaywallModalProps) {
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');

  const handlePayClick = () => {
    window.open(GUMROAD_URL, '_blank', 'noopener,noreferrer');
  };

  const handleCodeSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isValidAccessCode(codeInput)) {
      setIsPro(true);
      setCodeInput('');
      setCodeError('');
      onUnlocked();
      onClose();
    } else {
      setCodeError('Невірний код доступу. Спробуйте ще раз.');
    }
  };

  const handleClose = () => {
    setCodeInput('');
    setCodeError('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="AI Патруль — Клубний доступ">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
            <Crown size={24} className="text-emerald-400" />
          </div>
          <p className="text-ink-100 text-sm leading-relaxed">
            Відкрийте Зелений рівень «Мої бронежилети» повністю.
          </p>
        </div>

        <ul className="bg-ink-700 rounded-2xl p-4 space-y-2.5">
          {BENEFITS.map((b) => (
            <li key={b} className="flex gap-2 text-sm text-ink-100">
              <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
              {b}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={handlePayClick}
          className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-lg rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20"
        >
          Оформити підписку ($3.99 / міс)
          <ExternalLink size={18} aria-hidden="true" />
        </button>

        <form onSubmit={handleCodeSubmit} className="pt-4 border-t border-ink-600 space-y-2">
          <label htmlFor="access-code" className="flex items-center gap-1.5 text-sm text-ink-200">
            <KeyRound size={14} aria-hidden="true" /> Промокод або ключ доступу
          </label>
          <div className="flex gap-2">
            <input
              id="access-code"
              type="text"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={codeInput}
              onChange={(e) => { setCodeInput(e.target.value); setCodeError(''); }}
              placeholder="Введіть код"
              aria-invalid={codeError ? true : undefined}
              aria-describedby={codeError ? 'access-code-error' : undefined}
              className="flex-1 min-w-0 px-4 py-3 bg-ink-700 border border-ink-500 rounded-xl text-white placeholder-ink-300 focus:border-emerald-500 focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={!codeInput.trim()}
              className="shrink-0 px-4 py-3 bg-ink-600 hover:bg-ink-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
            >
              Активувати
            </button>
          </div>
          {codeError && (
            <p id="access-code-error" role="alert" className="text-red-400 text-sm">{codeError}</p>
          )}
        </form>

        {context && <p className="text-center text-xs text-ink-300">{context}</p>}
      </div>
    </Modal>
  );
}

import { useState } from 'react';
import { Lock, Check, Crown } from 'lucide-react';
import { Modal } from './Modal';
import { addAccessRequest, setIsPro } from '../storage';

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  onUnlocked: () => void;
  context?: string;
}

const ACCESS_CODE = 'PATRUL2026';

export function PaywallModal({ open, onClose, onUnlocked, context }: PaywallModalProps) {
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [stage, setStage] = useState<'plans' | 'demand' | 'code' | 'thanks'>('plans');
  const [contact, setContact] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');

  const handlePayClick = () => {
    window.open('https://montagg.gumroad.com/l/socuf');
    
    
  };

  const handleSubmitDemand = () => {
    if (contact.trim()) {
      addAccessRequest(contact.trim());
      setStage('thanks');
    }
  };

  const handleCodeSubmit = () => {
    if (codeInput.trim().toUpperCase() === ACCESS_CODE) {
      setIsPro(true);
      onUnlocked();
      setCodeError('');
      setCodeInput('');
      setStage('plans');
      onClose();
    } else {
      setCodeError('Невірний код доступу. Спробуйте ще раз.');
    }
  };

  const handleClose = () => {
    setStage('plans');
    setContact('');
    setCodeInput('');
    setCodeError('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Клубна підписка АІ Патруль">
      {stage === 'plans' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-amber-400 text-sm mb-2">
            <Crown size={18} />
            <span>Доступ до всіх правових алгоритмів</span>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => setPlan('yearly')}
              className={`relative flex items-start gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                plan === 'yearly'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-ink-600 bg-ink-700'
              }`}
            >
              <div className={`mt-1 w-5 h-5 rounded-full border-2 shrink-0 ${
                plan === 'yearly' ? 'border-emerald-500 bg-emerald-500' : 'border-ink-400'
              }`}>
                {plan === 'yearly' && <Check size={12} className="text-ink-900 m-auto mt-0.5" />}
              </div>
              <div className="flex-1">
                <p className="font-bold text-white text-lg">699 грн/рік <span className="text-ink-200 text-sm font-normal">(~$16.99/рік)</span></p>
                <p className="text-emerald-400 text-sm font-medium">Економія понад 60%</p>
                <p className="text-ink-200 text-xs mt-1">≈ 58 грн/міс — вигідніший варіант</p>
              </div>
              <span className="absolute top-3 right-3 text-xs font-bold text-emerald-500 bg-emerald-500/15 px-2 py-1 rounded-lg">Вигідно</span>
            </button>

            <button
              onClick={() => setPlan('monthly')}
              className={`flex items-start gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                plan === 'monthly'
                  ? 'border-sky-500 bg-sky-500/10'
                  : 'border-ink-600 bg-ink-700'
              }`}
            >
              <div className={`mt-1 w-5 h-5 rounded-full border-2 shrink-0 ${
                plan === 'monthly' ? 'border-sky-500 bg-sky-500' : 'border-ink-400'
              }`}>
                {plan === 'monthly' && <Check size={12} className="text-ink-900 m-auto mt-0.5" />}
              </div>
              <div className="flex-1">
                <p className="font-bold text-white text-lg">149 грн/міс <span className="text-ink-200 text-sm font-normal">(~$3.99/міс)</span></p>
                <p className="text-ink-200 text-xs mt-1">Гнучка підписка щомісяця</p>
              </div>
            </button>
          </div>

          <div className="bg-ink-700 rounded-2xl p-4 space-y-2">
            <p className="font-semibold text-white text-sm">Що входить у підписку:</p>
            <ul className="space-y-1.5 text-sm text-ink-100">
              <li className="flex gap-2"><Check size={16} className="text-emerald-400 shrink-0 mt-0.5" /> Усі правові алгоритми та сценарії</li>
              <li className="flex gap-2"><Check size={16} className="text-emerald-400 shrink-0 mt-0.5" /> Нові ситуації щотижня</li>
              <li className="flex gap-2"><Check size={16} className="text-emerald-400 shrink-0 mt-0.5" /> Повний доступ до всіх секторів</li>
              <li className="flex gap-2"><Check size={16} className="text-emerald-400 shrink-0 mt-0.5" /> Підтримка та оновлення</li>
            </ul>
          </div>

          <button
            onClick={handlePayClick}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-lg rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20"
          >
            Оплатити карткою / Apple Pay / Google Pay
          </button>

          <button
            onClick={() => setStage('code')}
            className="w-full flex items-center justify-center gap-2 py-3 text-ink-200 text-sm hover:text-white transition-colors"
          >
            <Lock size={14} /> Вже оплатили? Ввести код доступу
          </button>

          {context && <p className="text-center text-xs text-ink-300">{context}</p>}
        </div>
      )}

      {stage === 'demand' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
            <p className="text-amber-300 text-sm leading-relaxed">
              Платіжний модуль на фінальному тестуванні. Залиште ваш Telegram або Email, і ми відкриємо безкоштовний доступ на 7 днів одразу після запуску.
            </p>
          </div>
          <div>
            <label className="block text-sm text-ink-100 mb-2">Ваш контакт (Telegram або Email)</label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="@username або email@example.com"
              className="w-full px-4 py-3 bg-ink-700 border border-ink-500 rounded-xl text-white placeholder-ink-300 focus:border-emerald-500 focus:outline-none transition-colors"
            />
          </div>
          <button
            onClick={handleSubmitDemand}
            disabled={!contact.trim()}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-ink-500 disabled:text-ink-300 text-white font-bold rounded-2xl transition-all active:scale-[0.98]"
          >
            Отримати доступ
          </button>
          <button onClick={() => setStage('plans')} className="w-full text-center text-ink-200 text-sm hover:text-white">
            ← Назад до тарифів
          </button>
        </div>
      )}

      {stage === 'thanks' && (
        <div className="space-y-4 text-center py-6 animate-fade-in">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 flex items-center justify-center">
            <Check size={32} className="text-emerald-400" />
          </div>
          <p className="text-lg font-bold text-white">Дякуємо за інтерес!</p>
          <p className="text-ink-100 text-sm">
            Ваша заявка збережена. Ми повідомимо вас, як тільки платіжний модуль буде запущений, і відкриємо безкоштовний доступ на 7 днів.
          </p>
          <button onClick={handleClose} className="w-full py-3 bg-ink-600 hover:bg-ink-500 text-white font-medium rounded-2xl transition-colors">
            Закрити
          </button>
        </div>
      )}

      {stage === 'code' && (
        <div className="space-y-4 animate-fade-in">
          <p className="text-ink-100 text-sm">Введіть код доступу, який ви отримали після оплати:</p>
          <input
            type="text"
            value={codeInput}
            onChange={(e) => { setCodeInput(e.target.value); setCodeError(''); }}
            placeholder="Код доступу"
            className="w-full px-4 py-3 bg-ink-700 border border-ink-500 rounded-xl text-white placeholder-ink-300 focus:border-emerald-500 focus:outline-none text-center text-lg tracking-widest uppercase"
          />
          {codeError && <p className="text-red-400 text-sm text-center">{codeError}</p>}
          <button
            onClick={handleCodeSubmit}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl transition-all active:scale-[0.98]"
          >
            Розблокувати доступ
          </button>
          <button onClick={() => setStage('plans')} className="w-full text-center text-ink-200 text-sm hover:text-white">
            ← Назад до тарифів
          </button>
        </div>
      )}
    </Modal>
  );
}

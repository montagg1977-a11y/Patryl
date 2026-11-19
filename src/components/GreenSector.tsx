import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Lock, ChevronRight, ChevronDown, Shield, Lightbulb,
  Heart, ThumbsUp, Send, Eye, Megaphone, Lock as LockIcon,
  Volume2, Square, Headphones,
} from 'lucide-react';
import { QuickLaunchBar } from './YellowSector';
import { PaywallModal } from './PaywallModal';
import {
  getTopicVotes, saveTopicVotes, addAccessRequest,
  getAutoNarration, setAutoNarration,
} from '../storage';
import type { TopicVote } from '../types';
import { useSpeech } from '../hooks/useSpeech';

interface GreenSectorProps {
  onBack: () => void;
  onGoYellow: () => void;
  onGoRed: () => void;
  isPro: boolean;
  onUnlock: () => void;
}

interface Scenario {
  title: string;
  say: string;
  action: string;
  voiceText?: string;
}

interface Block {
  id: string;
  title: string;
  icon: typeof Shield;
  color: string;
  locked: boolean;
  freeScenarios: Scenario[];
  lockedScenarios: Scenario[];
}

const BLOCKS: Block[] = [
  {
    id: 'police-stop',
    title: 'Зупинка поліцією',
    icon: Shield,
    color: 'emerald',
    locked: false,
    freeScenarios: [
      {
        title: 'Безпричинна зупинка',
        say: '«Назвіть законну підставу зупинки згідно зі ст. 35 Закону про Нацполіцію».',
        action: 'Не виходьте з авто, тримайте вікно привідкритим.',
        voiceText:
          'Не хвилюйтеся. Зберігайте спокій і не виходьте з автомобіля. ' +
          'Інспектор зобов\'язаний назвати конкретну причину зупинки. ' +
          'Спокійно скажіть: Назвіть, будь ласка, законну підставу зупинки згідно зі статтею 35 Закону про Національну поліцію.',
      },
      {
        title: 'Вимагають вийти з авто',
        say: '«Вихід з авто передбачений лише у випадках ст. 35. Складайте протокол».',
        action: 'Увімкніть Жовтий щит.',
        voiceText:
          'Не панікуйте. Ви не зобов\'язані виходити з машини без законних підстав, ' +
          'таких як перевірка на стан сп\'яніння чи огляд. ' +
          'Скажіть інспектору: Вихід з авто передбачений лише у випадках статті 35. ' +
          'Якщо є порушення, складайте протокол. За потреби увімкніть Жовтий щит для фіксації.',
      },
      {
        title: 'Поверхнева перевірка',
        say: '«Прошу назвати підставу за ст. 34 та вести відеофіксацію».',
        action: 'Не передавайте речі в руки, показуйте візуально.',
        voiceText:
          'Тримайтеся впевнено. Поверхнева перевірка можлива лише за наявності підстав, ' +
          'і ви не повинні передавати особисті речі чи телефон у руки інспектору. ' +
          'Скажіть: Прошу назвати підставу за статтею 34 та вести відеофіксацію, я покажу речі візуально.',
      },
    ],
    lockedScenarios: [],
  },
  {
    id: 'tcc-check',
    title: 'Перевірка документів (ТЦК та СП)',
    icon: Megaphone,
    color: 'sky',
    locked: true,
    freeScenarios: [
      {
        title: 'Перевірка на вулиці',
        say: '«Прошу показати службове посвідчення та назвати правову підставу перевірки».',
        action: 'Фіксуйте на відео. Не чиніть опору, але вимагайте дотримання процедури.',
      },
    ],
    lockedScenarios: [
      {
        title: 'Вручення повістки',
        say: '«Прошу заповнити документ у моїй присутності. Якщо є порушення процедури, я вкажу це у зауваженнях».',
        action: 'Перевірте правильність ПІБ, дати, підпису та печатки. Не відмовляйтеся від підпису без фіксації причин, інакше складуть акт відмови.',
      },
      {
        title: 'Вимога проїхати для уточнення даних',
        say: '«Примусове доставлення можливе лише поліцією у випадках адміністративного затримання зі складанням протоколу».',
        action: 'Увімкніть Жовтий щит, повідомте близьких через Червоний SOS, вимагайте складання протоколу затримання.',
      },
      {
        title: 'Зупинка авто на блокпосту',
        say: '«Документи пред\'являю для перевірки. Огляд авто можливий лише за наявності законних підстав згідно з постановою КМУ № 1456».',
        action: 'Зменште швидкість, увімкніть аварійку, тримайте руки на кермі, не передавайте документи без перевірки повноважень.',
      },
    ],
  },
  {
    id: 'extortion',
    title: 'Шантаж, вимагання та шахраї',
    icon: Lightbulb,
    color: 'amber',
    locked: true,
    freeScenarios: [
      {
        title: 'Дзвінок про родича в біді',
        say: 'Не панікуйте. Покладіть слухавку і передзвоніть рідним на відомий номер.',
        action: 'Шахраї часто використовують емоційний тиск. Перевірте інформацію самостійно.',
      },
    ],
    lockedScenarios: [
      {
        title: 'Погрози та вимагання грошей',
        say: '«Усі розмови фіксуються. Я звертаюся із заявою до кіберполіції та на лінію 102».',
        action: 'Зробіть скріншоти листування, увімкніть запис розмови через Жовтий щит, нічого не переказуйте і заблокуйте контакт.',
      },
      {
        title: 'Фішингові посилання та фейкові виплати',
        say: '«Я не вводжу дані картки на сторонніх сайтах».',
        action: 'Не переходьте за посиланнями з SMS чи месенджерів, навіть якщо вони схожі на державні сервіси чи банки.',
      },
    ],
  },
];

const FUTURE_TOPICS_DEFAULT: TopicVote[] = [
  { id: 't-evacuation', title: 'Евакуація та виїзд з небезпечної зони', votes: 0, voted: false },
  { id: 't-search', title: 'Обшук житла: ваші права', votes: 0, voted: false },
  { id: 't-detention', title: 'Затримання: що робити перші хвилини', votes: 0, voted: false },
];

function buildFallbackVoiceText(scenario: Scenario): string {
  return `Не хвилюйтеся, дійте спокійно. Що сказати: ${scenario.say}. Дія: ${scenario.action}.`;
}

function getVoiceText(scenario: Scenario): string {
  if (scenario.voiceText) return scenario.voiceText;
  return buildFallbackVoiceText(scenario);
}

export function GreenSector({ onBack, onGoYellow, onGoRed, isPro, onUnlock }: GreenSectorProps) {
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallContext, setPaywallContext] = useState('');
  const [showProposal, setShowProposal] = useState(false);
  const [autoNarration, setAutoNarrationState] = useState(getAutoNarration());

  const { speak, stop, speaking, supported } = useSpeech();
  const currentlySpeakingKey = useRef<string | null>(null);

  // Stop speech when leaving the screen
  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel();
    };
  }, [supported]);

  const speakScenario = useCallback((key: string, scenario: Scenario) => {
    if (currentlySpeakingKey.current === key && speaking) {
      stop();
      currentlySpeakingKey.current = null;
      return;
    }
    stop();
    currentlySpeakingKey.current = key;
    speak(getVoiceText(scenario), { rate: 0.95 });
  }, [speak, stop, speaking]);

  function toggleAutoNarration() {
    const next = !autoNarration;
    setAutoNarrationState(next);
    setAutoNarration(next);
    if (!next) {
      stop();
      currentlySpeakingKey.current = null;
    }
  }

  function toggleBlock(id: string) {
    const block = BLOCKS.find((b) => b.id === id);
    if (block?.locked && !isPro && expandedBlock !== id) {
      setPaywallContext(block.title);
      setPaywallOpen(true);
      return;
    }
    stop();
    currentlySpeakingKey.current = null;
    setExpandedBlock(expandedBlock === id ? null : id);
    setExpandedScenario(null);
  }

  function toggleScenario(key: string, scenario: Scenario | null) {
    stop();
    currentlySpeakingKey.current = null;

    if (expandedScenario === key) {
      setExpandedScenario(null);
      return;
    }

    setExpandedScenario(key);

    if (autoNarration && scenario && scenario.say !== '—') {
      currentlySpeakingKey.current = key;
      speak(getVoiceText(scenario), { rate: 0.95 });
    }
  }

  function handlePaywallClose() {
    setPaywallOpen(false);
    setPaywallContext('');
  }

  return (
    <div className="min-h-screen bg-ink-900 flex flex-col animate-fade-in">
      <div className="safe-top bg-ink-800/50 px-4 py-3 flex items-center gap-3 border-b border-ink-700">
        <button onClick={() => { stop(); onBack(); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-ink-700 hover:bg-ink-600 transition-colors text-white">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-emerald-400">Мої бронежилети</h1>
          <p className="text-xs text-ink-200">Правові алгоритми дій та захисту</p>
        </div>
      </div>

      {/* Auto-narration toggle */}
      {supported && (
        <div className="px-4 py-2.5 bg-ink-800/30 border-b border-ink-700">
          <button
            onClick={toggleAutoNarration}
            className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-ink-700 hover:bg-ink-600 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-white">
              <Headphones size={18} className="text-emerald-400" />
              Автоозвучка підказок (для навушника)
            </span>
            <span className={`relative w-11 h-6 rounded-full transition-colors ${autoNarration ? 'bg-emerald-500' : 'bg-ink-500'}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${autoNarration ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </span>
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {BLOCKS.map((block) => {
          const Icon = block.icon;
          const isOpen = expandedBlock === block.id;
          const showLocked = block.locked && !isPro;
          const colorMap: Record<string, { text: string; border: string; bg: string; icon: string }> = {
            emerald: { text: 'text-emerald-400', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', icon: 'text-emerald-400' },
            sky: { text: 'text-sky-400', border: 'border-sky-500/40', bg: 'bg-sky-500/10', icon: 'text-sky-400' },
            amber: { text: 'text-amber-400', border: 'border-amber-500/40', bg: 'bg-amber-500/10', icon: 'text-amber-400' },
          };
          const c = colorMap[block.color];

          return (
            <div key={block.id} className={`rounded-2xl border-2 ${isOpen ? c.border : 'border-ink-600'} bg-ink-800 overflow-hidden transition-all`}>
              <button
                onClick={() => toggleBlock(block.id)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={24} className={c.icon} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-base">{block.title}</p>
                  <p className="text-xs text-ink-200 mt-0.5">
                    {block.freeScenarios.length + block.lockedScenarios.length} ситуацій
                    {showLocked && ` · ${block.lockedScenarios.length} заблоковано`}
                  </p>
                </div>
                {showLocked && <Lock size={18} className="text-ink-300 shrink-0" />}
                {isOpen ? <ChevronDown size={20} className="text-ink-200 shrink-0" /> : <ChevronRight size={20} className="text-ink-200 shrink-0" />}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-2 animate-fade-in">
                  {block.freeScenarios.map((scenario, idx) => {
                    const key = `${block.id}-free-${idx}`;
                    const isScenarioOpen = expandedScenario === key;
                    const isThisSpeaking = currentlySpeakingKey.current === key && speaking;
                    return (
                      <div key={key} className="bg-ink-700 rounded-xl overflow-hidden">
                        <button
                          onClick={() => toggleScenario(key, isScenarioOpen ? null : scenario)}
                          className="w-full flex items-center justify-between px-4 py-3 text-left"
                        >
                          <span className="font-medium text-white text-sm">{scenario.title}</span>
                          {isScenarioOpen ? <ChevronDown size={16} className="text-ink-200" /> : <ChevronRight size={16} className="text-ink-200" />}
                        </button>
                        {isScenarioOpen && (
                          <ScenarioDetails
                            scenario={scenario}
                            isSpeaking={isThisSpeaking}
                            onSpeak={() => speakScenario(key, scenario)}
                            supported={supported}
                          />
                        )}
                      </div>
                    );
                  })}

                  {block.lockedScenarios.map((scenario, idx) => {
                    const key = `${block.id}-locked-${idx}`;
                    const isScenarioOpen = expandedScenario === key;
                    const isThisSpeaking = currentlySpeakingKey.current === key && speaking;
                    return (
                      <div key={key} className="bg-ink-700/50 rounded-xl overflow-hidden">
                        <button
                          onClick={() => {
                            if (!isPro) {
                              setPaywallContext(block.title);
                              setPaywallOpen(true);
                            } else {
                              toggleScenario(key, isScenarioOpen ? null : scenario);
                            }
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 text-left"
                        >
                          <span className={`font-medium text-sm ${isPro ? 'text-white' : 'text-ink-300'}`}>{scenario.title}</span>
                          {!isPro ? (
                            <Lock size={14} className="text-ink-300" />
                          ) : isScenarioOpen ? (
                            <ChevronDown size={16} className="text-ink-200" />
                          ) : (
                            <ChevronRight size={16} className="text-ink-200" />
                          )}
                        </button>
                        {isPro && isScenarioOpen && (
                          <ScenarioDetails
                            scenario={scenario}
                            isSpeaking={isThisSpeaking}
                            onSpeak={() => speakScenario(key, scenario)}
                            supported={supported}
                          />
                        )}
                      </div>
                    );
                  })}

                  {showLocked && (
                    <button
                      onClick={() => { setPaywallContext(block.title); setPaywallOpen(true); }}
                      className="w-full py-3 bg-gradient-to-r from-emerald-500/20 to-sky-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 font-medium text-sm flex items-center justify-center gap-2 hover:from-emerald-500/30 hover:to-sky-500/30 transition-all"
                    >
                      <LockIcon size={14} /> Розблокувати {block.lockedScenarios.length} ситуацій
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Pro badge */}
        {isPro && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3">
            <Shield size={20} className="text-emerald-400" />
            <p className="text-emerald-300 text-sm font-medium">Усі бронежилети розблоковано</p>
          </div>
        )}

        {/* Propose situation */}
        <button
          onClick={() => { stop(); setShowProposal(!showProposal); }}
          className="w-full py-4 bg-ink-800 border border-ink-600 hover:border-emerald-500/40 rounded-2xl flex items-center justify-center gap-2 text-ink-100 font-medium transition-all"
        >
          <Lightbulb size={20} className="text-amber-400" />
          ❓ Запропонувати ситуацію
        </button>

        {showProposal && (
          <ProposalForm />
        )}
      </div>

      <QuickLaunchBar onGoYellow={() => { stop(); onGoYellow(); }} onGoRed={() => { stop(); onGoRed(); }} current="green" />

      <PaywallModal
        open={paywallOpen}
        onClose={handlePaywallClose}
        onUnlocked={onUnlock}
        context={paywallContext ? `Блок: ${paywallContext}` : undefined}
      />
    </div>
  );
}

function ScenarioDetails({
  scenario,
  isSpeaking,
  onSpeak,
  supported,
}: {
  scenario: Scenario;
  isSpeaking: boolean;
  onSpeak: () => void;
  supported: boolean;
}) {
  return (
    <div className="px-4 pb-4 space-y-3 animate-fade-in">
      <div className="bg-emerald-500/10 rounded-lg p-3">
        <p className="text-xs font-semibold text-emerald-400 mb-1">ЩО СКАЗАТИ</p>
        <p className="text-sm text-white leading-relaxed">{scenario.say}</p>
      </div>
      <div className="bg-amber-500/10 rounded-lg p-3">
        <p className="text-xs font-semibold text-amber-400 mb-1">ДІЯ</p>
        <p className="text-sm text-white leading-relaxed">{scenario.action}</p>
      </div>
      {supported && scenario.say !== '—' && (
        <button
          onClick={onSpeak}
          className={`w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
            isSpeaking
              ? 'bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/20'
              : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
          }`}
        >
          {isSpeaking ? (
            <><Square size={16} fill="currentColor" /> Зупинити озвучку</>
          ) : (
            <><Volume2 size={16} /> Прослухати інструкцію</>
          )}
        </button>
      )}
    </div>
  );
}

function ProposalForm() {
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [topics, setTopics] = useState<TopicVote[]>(() => {
    const saved = getTopicVotes();
    if (saved.length === 3) return saved;
    return FUTURE_TOPICS_DEFAULT;
  });

  function toggleVote(id: string) {
    const updated = topics.map((t) =>
      t.id === id
        ? { ...t, voted: !t.voted, votes: t.voted ? t.votes - 1 : t.votes + 1 }
        : t
    );
    setTopics(updated);
    saveTopicVotes(updated);
  }

  function handleSubmit() {
    if (description.trim() && contact.trim()) {
      addAccessRequest(`${contact.trim()} | Пропозиція: ${description.trim()}`);
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <div className="bg-ink-800 rounded-2xl p-6 text-center space-y-3 animate-fade-in">
        <Heart size={32} className="text-emerald-400 mx-auto" />
        <p className="text-white font-bold text-lg">Дякуємо за пропозицію!</p>
        <p className="text-ink-200 text-sm">
          Ми розглянемо вашу ситуацію. Якщо вона увійде у нове оновлення — ви отримаєте безкоштовний доступ.
        </p>
        <button
          onClick={() => { setSubmitted(false); setDescription(''); setContact(''); }}
          className="text-ink-200 text-sm hover:text-white"
        >
          ← Закрити
        </button>
      </div>
    );
  }

  return (
    <div className="bg-ink-800 rounded-2xl p-4 space-y-4 animate-fade-in">
      <div>
        <label className="block text-sm text-ink-100 mb-1.5">Опишіть ситуацію, якої не вистачає</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Наприклад: зупинка таксі з перевіркою документів..."
          className="w-full px-3 py-2.5 bg-ink-700 border border-ink-500 rounded-xl text-white placeholder-ink-300 text-sm focus:border-emerald-500 focus:outline-none resize-none"
        />
      </div>
      <div>
        <label className="block text-sm text-ink-100 mb-1.5">
          Контакт (Telegram або Email) — для безкоштовного доступу
        </label>
        <input
          type="text"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="@username або email@example.com"
          className="w-full px-3 py-2.5 bg-ink-700 border border-ink-500 rounded-xl text-white placeholder-ink-300 text-sm focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <div>
        <p className="text-sm text-ink-100 mb-2 flex items-center gap-1.5">
          <Eye size={14} className="text-ink-200" /> Майбутні теми — голосуйте лайком:
        </p>
        <div className="space-y-2">
          {topics.map((topic) => (
            <div key={topic.id} className="flex items-center justify-between bg-ink-700 rounded-xl px-3 py-2.5">
              <span className="text-sm text-white flex-1">{topic.title}</span>
              <button
                onClick={() => toggleVote(topic.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  topic.voted
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-ink-600 text-ink-200 hover:bg-ink-500'
                }`}
              >
                <ThumbsUp size={14} className={topic.voted ? 'fill-current' : ''} />
                {topic.votes}
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!description.trim() || !contact.trim()}
        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-ink-500 disabled:text-ink-300 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
      >
        <Send size={16} /> Надіслати пропозицію
      </button>
    </div>
  );
}

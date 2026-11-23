import type { SosSettings, AccessRequest, TopicVote } from './types';

const KEYS = {
  isPro: 'patrol_isPro',
  sos: 'patrol_sosSettings',
  accessRequests: 'patrol_accessRequests',
  topicVotes: 'patrol_topicVotes',
  installBannerDismissed: 'patrol_installDismissed',
  unlockConsumed: 'patrol_unlockConsumed',
  autoNarration: 'patrol_autoNarration',
};

const PRO_UNLOCKED_KEY = 'isProUnlocked';
export const PRO_ACCESS_CODE = 'pro2026';

export function getIsPro(): boolean {
  try {
    return (
      localStorage.getItem(PRO_UNLOCKED_KEY) === 'true' ||
      localStorage.getItem(KEYS.isPro) === 'true'
    );
  } catch {
    return false;
  }
}

export function setIsPro(value: boolean) {
  try {
    localStorage.setItem(PRO_UNLOCKED_KEY, value ? 'true' : 'false');
    localStorage.setItem(KEYS.isPro, value ? 'true' : 'false');
  } catch { /* ignore */ }
}

export function isValidAccessCode(code: string): boolean {
  return code.trim().toLowerCase() === PRO_ACCESS_CODE;
}

export function consumeUnlockParam(): boolean {
  if (typeof window === 'undefined') return false;
  const url = new URL(window.location.href);
  const unlock = url.searchParams.get('unlock');
  if (unlock === null) return false;

  url.searchParams.delete('unlock');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);

  if (!isValidAccessCode(unlock)) return false;
  setIsPro(true);
  return true;
}

export function getSosSettings(): SosSettings {
  const def: SosSettings = {
    contacts: [],
    messageTemplate: 'Я в небезпеці! Мої координати:',
  };
  try {
    const raw = localStorage.getItem(KEYS.sos);
    return raw ? { ...def, ...JSON.parse(raw) } : def;
  } catch {
    return def;
  }
}

export function saveSosSettings(settings: SosSettings) {
  try {
    localStorage.setItem(KEYS.sos, JSON.stringify(settings));
  } catch { /* ignore */ }
}

export function getAccessRequests(): AccessRequest[] {
  try {
    const raw = localStorage.getItem(KEYS.accessRequests);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addAccessRequest(contact: string) {
  const list = getAccessRequests();
  list.push({ contact, timestamp: Date.now() });
  try {
    localStorage.setItem(KEYS.accessRequests, JSON.stringify(list));
  } catch { /* ignore */ }
}

export function getTopicVotes(): TopicVote[] {
  try {
    const raw = localStorage.getItem(KEYS.topicVotes);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTopicVotes(votes: TopicVote[]) {
  try {
    localStorage.setItem(KEYS.topicVotes, JSON.stringify(votes));
  } catch { /* ignore */ }
}

export function isInstallBannerDismissed(): boolean {
  try {
    return localStorage.getItem(KEYS.installBannerDismissed) === 'true';
  } catch {
    return false;
  }
}

export function dismissInstallBanner() {
  try {
    localStorage.setItem(KEYS.installBannerDismissed, 'true');
  } catch { /* ignore */ }
}

export function getAutoNarration(): boolean {
  try {
    return localStorage.getItem(KEYS.autoNarration) === 'true';
  } catch {
    return false;
  }
}

export function setAutoNarration(value: boolean) {
  try {
    localStorage.setItem(KEYS.autoNarration, value ? 'true' : 'false');
  } catch { /* ignore */ }
}

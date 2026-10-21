export type PageScreen =
  | 'menu'
  | 'account'
  | 'challenge'
  | 'learning-practice'
  | 'timed-setup'
  | 'timed'
  | 'ranked'
  | 'achievements'
  | 'learn'
  | 'how-to-play'
  | 'journey'
  | 'completion';

export type PageLocation = Readonly<{
  screen: PageScreen;
  timedDurationSeconds: 120 | 240;
}>;

const PAGE_TO_SCREEN: Readonly<Record<string, PageScreen>> = {
  account: 'account',
  play: 'challenge',
  learn: 'learn',
  'learn-practice': 'learning-practice',
  timed: 'timed-setup',
  'timed-challenge': 'timed',
  ranked: 'ranked',
  achievements: 'achievements',
  'how-to-play': 'how-to-play',
  journey: 'journey',
  completion: 'completion',
};

const SCREEN_TO_PAGE: Readonly<Record<Exclude<PageScreen, 'menu'>, string>> = {
  account: 'account',
  challenge: 'play',
  'learning-practice': 'learn-practice',
  'timed-setup': 'timed',
  timed: 'timed-challenge',
  ranked: 'ranked',
  achievements: 'achievements',
  learn: 'learn',
  'how-to-play': 'how-to-play',
  journey: 'journey',
  completion: 'completion',
};

export function parsePageLocation(search: string): PageLocation {
  const parameters = new URLSearchParams(search);
  const page = parameters.get('page') ?? '';
  const screen = PAGE_TO_SCREEN[page] ?? 'menu';
  const timedDurationSeconds = parameters.get('duration') === '240' ? 240 : 120;
  return { screen, timedDurationSeconds };
}

export function buildPageHref(
  pathname: string,
  screen: PageScreen,
  timedDurationSeconds: 120 | 240,
): string {
  if (screen === 'menu') return pathname;
  const parameters = new URLSearchParams({ page: SCREEN_TO_PAGE[screen] });
  if (screen === 'timed') {
    parameters.set('duration', String(timedDurationSeconds));
  }
  return `${pathname}?${parameters.toString()}`;
}

export type BrowserNavigationHost = Readonly<{
  location: { pathname: string; search: string };
  history: {
    pushState(data: unknown, unused: string, url?: string | URL | null): void;
  };
  addEventListener(event: 'popstate', listener: () => void): void;
  removeEventListener(event: 'popstate', listener: () => void): void;
}>;

export function getBrowserNavigationHost(): BrowserNavigationHost | null {
  const candidate = globalThis as typeof globalThis & Partial<BrowserNavigationHost>;
  if (
    candidate.location === undefined
    || candidate.history?.pushState === undefined
    || candidate.addEventListener === undefined
    || candidate.removeEventListener === undefined
  ) return null;
  return candidate as BrowserNavigationHost;
}

export function readBrowserPage(host: BrowserNavigationHost): PageLocation {
  return parsePageLocation(host.location.search);
}

export function pushBrowserPage(
  host: BrowserNavigationHost,
  screen: PageScreen,
  timedDurationSeconds: 120 | 240,
): void {
  const href = buildPageHref(host.location.pathname, screen, timedDurationSeconds);
  host.history.pushState({ page: screen }, '', href);
}

export function subscribeToBrowserPages(
  host: BrowserNavigationHost,
  listener: (page: PageLocation) => void,
): () => void {
  const handlePopState = () => listener(readBrowserPage(host));
  host.addEventListener('popstate', handlePopState);
  return () => host.removeEventListener('popstate', handlePopState);
}

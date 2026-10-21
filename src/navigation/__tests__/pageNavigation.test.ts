import {
  buildPageHref,
  pushBrowserPage,
  readBrowserPage,
  subscribeToBrowserPages,
  parsePageLocation,
  type BrowserNavigationHost,
  type PageScreen,
} from '../pageNavigation';

describe('page navigation URLs', () => {
  it.each<[string, PageScreen]>([
    ['?page=account', 'account'],
    ['?page=play', 'challenge'],
    ['?page=learn', 'learn'],
    ['?page=learn-practice', 'learning-practice'],
    ['?page=timed', 'timed-setup'],
    ['?page=ranked', 'ranked'],
    ['?page=stats', 'achievements'],
    ['?page=achievements', 'achievements'],
    ['?page=how-to-play', 'how-to-play'],
    ['?page=journey', 'journey'],
    ['?page=completion', 'completion'],
  ])('opens %s as the %s page', (search, screen) => {
    expect(parsePageLocation(search)).toEqual({ screen, timedDurationSeconds: 120 });
  });

  it('keeps timed challenge duration in its direct link', () => {
    expect(parsePageLocation('?page=timed-challenge&duration=240')).toEqual({
      screen: 'timed',
      timedDurationSeconds: 240,
    });
    expect(parsePageLocation('?page=timed-challenge&duration=999')).toEqual({
      screen: 'timed',
      timedDurationSeconds: 120,
    });
  });

  it('falls back safely for unknown links', () => {
    expect(parsePageLocation('?page=not-real')).toEqual({
      screen: 'menu',
      timedDurationSeconds: 120,
    });
  });

  it('builds links under the deployed base path and returns home without a query', () => {
    expect(buildPageHref('/subnet/', 'ranked', 120)).toBe('/subnet/?page=ranked');
    expect(buildPageHref('/subnet/', 'achievements', 120)).toBe('/subnet/?page=stats');
    expect(buildPageHref('/subnet/', 'timed', 240)).toBe(
      '/subnet/?page=timed-challenge&duration=240',
    );
    expect(buildPageHref('/subnet/', 'menu', 120)).toBe('/subnet/');
  });

  it('pushes a link without reloading and reads the resulting browser location', () => {
    const host = createBrowserHost('/subnet/', '');

    pushBrowserPage(host, 'ranked', 120);

    expect(host.history.pushState).toHaveBeenCalledWith(
      { page: 'ranked' },
      '',
      '/subnet/?page=ranked',
    );
    host.location.search = '?page=ranked';
    expect(readBrowserPage(host)).toEqual({ screen: 'ranked', timedDurationSeconds: 120 });
  });

  it('restores pages from browser back and forward popstate events', () => {
    const host = createBrowserHost('/subnet/', '?page=learn');
    const listener = jest.fn();
    const unsubscribe = subscribeToBrowserPages(host, listener);

    host.location.search = '?page=timed';
    host.emitPopState();

    expect(listener).toHaveBeenCalledWith({ screen: 'timed-setup', timedDurationSeconds: 120 });
    unsubscribe();
    expect(host.removeEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));
  });
});

function createBrowserHost(pathname: string, search: string) {
  let popStateListener: (() => void) | undefined;
  const host = {
    location: { pathname, search },
    history: { pushState: jest.fn() },
    addEventListener: jest.fn((_event: 'popstate', listener: () => void) => {
      popStateListener = listener;
    }),
    removeEventListener: jest.fn(),
    emitPopState: () => popStateListener?.(),
  };
  return host satisfies BrowserNavigationHost & { emitPopState(): void };
}

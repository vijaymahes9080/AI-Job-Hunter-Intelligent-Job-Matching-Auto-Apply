import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Settings2,
  Sparkles,
  Sun,
  UserRound,
  X,
} from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { initials, relativeTime } from '../lib/format';
import { ROUTES, type RouteDefinition, type RoutePath } from '../lib/router';
import { useSession } from '../lib/session';
import { Progress } from './ui';

export function Layout({
  route,
  navigate,
  children,
}: {
  route: RouteDefinition;
  navigate: (path: RoutePath) => void;
  children: ReactNode;
}) {
  const { user, settings, demo, completeness, logout, setSettings } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => {
    const map = new Map<string, RouteDefinition[]>();
    for (const item of ROUTES) {
      const list = map.get(item.group) || [];
      list.push(item);
      map.set(item.group, list);
    }
    return [...map.entries()];
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await api.notifications.list();
        if (!cancelled) {
          setUnread(response.unread);
          setNotificationError(null);
        }
      } catch (caught) {
        if (!cancelled) setNotificationError(errorMessage(caught));
      }
    };
    void load();
    const interval = window.setInterval(load, 60_000);
    const onChange = () => void load();
    window.addEventListener('ajh:notifications-changed', onChange);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('ajh:notifications-changed', onChange);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenu(false);
  }, [route.path]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setUserMenu(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const toggleTheme = async () => {
    if (!settings) return;
    const next = { ...settings, theme: settings.theme === 'light' ? ('dark' as const) : ('light' as const) };
    setSettings(next);
    try {
      await api.settings.update({ theme: next.theme });
    } catch {
      // Theme already applied locally; server sync can be retried on save.
    }
  };

  const navContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 pb-4 pt-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg">
          <Sparkles size={17} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold tracking-tight text-[var(--text)]">AI Job Hunter</div>
          <div className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted-2)]">Career intelligence</div>
        </div>
        <button
          type="button"
          aria-label="Close navigation"
          className="ml-auto rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <X size={17} />
        </button>
      </div>

      <nav className="scroll-thin flex-1 overflow-y-auto px-2.5 pb-3" aria-label="Primary navigation">
        {groups.map(([group, items]) => (
          <div key={group} className="mb-3">
            <div className="px-2 pb-1 pt-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--muted-2)]">{group}</div>
            <div className="space-y-0.5">
              {items.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  className={`nav-item ${route.path === item.path ? 'active' : ''}`}
                  aria-current={route.path === item.path ? 'page' : undefined}
                  onClick={() => navigate(item.path)}
                >
                  <item.icon size={16} className="flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {item.path === 'notifications' && unread > 0 ? (
                    <span className="ml-auto rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[0.6rem] font-bold text-white">{unread}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--border)] p-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <div className="flex items-center justify-between text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted-2)]">
            <span>Profile evidence</span>
            <span className="text-[var(--text)]">{completeness}%</span>
          </div>
          <div className="mt-2">
            <Progress value={completeness} tone={completeness >= 70 ? 'success' : 'warning'} />
          </div>
          <button
            type="button"
            onClick={() => navigate('profile')}
            className="mt-2 text-[0.68rem] font-medium text-[var(--accent)] hover:underline"
          >
            {completeness >= 70 ? 'Review your profile' : 'Improve match reliability'}
          </button>
        </div>
        <div className="mt-2 flex items-center gap-1.5 px-1 text-[0.62rem] leading-relaxed text-[var(--muted-2)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
          Open-source data · evidence engines
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative z-10 min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[258px] border-r border-[var(--border)] bg-[var(--bg-soft)]/85 backdrop-blur-xl lg:block">
        {navContent}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] border-r border-[var(--border)] bg-[var(--bg-soft)] shadow-2xl">{navContent}</aside>
        </div>
      ) : null}

      <div className="lg:pl-[258px]">
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              aria-label="Open navigation"
              className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={19} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-sm font-semibold text-[var(--text)]">{route.label}</h1>
                {demo ? <span className="badge badge-warning hidden sm:inline-flex">Demo data</span> : null}
              </div>
              <p className="hidden truncate text-[0.68rem] text-[var(--muted-2)] sm:block">{route.description}</p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              {notificationError ? (
                <span className="hidden text-[0.65rem] text-[var(--warning)] sm:inline" title={notificationError}>
                  Alerts offline
                </span>
              ) : null}
              <button
                type="button"
                aria-label="Toggle light or dark theme"
                className="relative rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                onClick={toggleTheme}
              >
                {settings?.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <button
                type="button"
                aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
                className="relative rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                onClick={() => navigate('notifications')}
              >
                <Bell size={18} />
                {unread > 0 ? (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[0.58rem] font-bold text-white">
                    {unread > 99 ? '99+' : unread}
                  </span>
                ) : null}
              </button>
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  className="ml-1 flex items-center gap-2 rounded-xl border border-transparent p-1.5 pr-2 transition hover:border-[var(--border)] hover:bg-[var(--surface-2)]"
                  aria-haspopup="menu"
                  aria-expanded={userMenu}
                  onClick={() => setUserMenu((value) => !value)}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-[0.68rem] font-bold text-white">
                    {initials(user?.name || 'Candidate')}
                  </span>
                  <span className="hidden text-left sm:block">
                    <span className="block max-w-[130px] truncate text-xs font-semibold text-[var(--text)]">{user?.name}</span>
                    <span className="block max-w-[130px] truncate text-[0.6rem] text-[var(--muted-2)]">{user?.email}</span>
                  </span>
                  <ChevronDown size={13} className="text-[var(--muted-2)]" />
                </button>
                {userMenu ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+6px)] w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] p-1 shadow-2xl"
                  >
                    <div className="border-b border-[var(--border)] px-3 py-2">
                      <div className="text-xs font-semibold text-[var(--text)]">{user?.name}</div>
                      <div className="truncate text-[0.65rem] text-[var(--muted-2)]">{user?.email}</div>
                    </div>
                    <button type="button" role="menuitem" className="nav-item mt-1" onClick={() => navigate('profile')}>
                      <UserRound size={15} /> Profile
                    </button>
                    <button type="button" role="menuitem" className="nav-item" onClick={() => navigate('settings')}>
                      <Settings2 size={15} /> Settings
                    </button>
                    <button type="button" role="menuitem" className="nav-item text-[var(--danger)]" onClick={() => void logout()}>
                      <LogOut size={15} /> Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 sm:py-6">
          <div key={route.path} className="animate-rise">{children}</div>
          <footer className="mt-10 border-t border-[var(--border)] pt-4 text-[0.65rem] leading-relaxed text-[var(--muted-2)]">
            AI Job Hunter 2.0 · Public job data from Remotive, Greenhouse and Lever. AI assistance is optional and
            uses an open-weight, self-hosted endpoint. Verified evidence is separated from generated suggestions.
            Last refreshed {relativeTime(new Date().toISOString())}.
          </footer>
        </main>
      </div>
    </div>
  );
}

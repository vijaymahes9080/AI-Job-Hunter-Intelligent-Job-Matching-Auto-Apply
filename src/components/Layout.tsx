import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Settings2,
  UserRound,
  X,
} from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { initials } from '../lib/format';
import { ROUTES, type RouteDefinition, type RoutePath } from '../lib/router';
import { useSession } from '../lib/session';

export function Layout({
  route,
  navigate,
  children,
}: {
  route: RouteDefinition;
  navigate: (path: RoutePath) => void;
  children: ReactNode;
}) {
  const { user, demo, completeness, logout } = useSession();
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

  const navContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-xs font-bold text-white">
          AJ
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-[var(--text)]">AI Job Hunter</div>
          <div className="text-[0.62rem] text-[var(--muted-2)]">Career workspace</div>
        </div>
        <button
          type="button"
          aria-label="Close navigation"
          className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <X size={16} />
        </button>
      </div>

      <nav className="scroll-thin flex-1 overflow-y-auto px-2 pb-4" aria-label="Primary navigation">
        {groups.map(([group, items]) => (
          <div key={group} className="mb-3">
            <div className="px-2 pb-1 pt-1 text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--muted-2)]">{group}</div>
            <div className="space-y-0.5">
              {items.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  className={`nav-item ${route.path === item.path ? 'active' : ''}`}
                  aria-current={route.path === item.path ? 'page' : undefined}
                  onClick={() => navigate(item.path)}
                >
                  <item.icon size={15} className="flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {item.path === 'notifications' && unread > 0 ? (
                    <span className="ml-auto rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[0.58rem] font-bold text-white">{unread}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <button
        type="button"
        onClick={() => navigate('profile')}
        className="mx-2 mb-3 flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-left hover:bg-[var(--surface-2)]"
      >
        <UserRound size={14} className="text-[var(--muted-2)]" />
        <span className="min-w-0 flex-1">
          <span className="block text-[0.68rem] font-medium text-[var(--text)]">Profile evidence</span>
          <span className="block text-[0.6rem] text-[var(--muted-2)]">{completeness}% complete</span>
        </span>
        <span className="text-[0.65rem] font-semibold text-[var(--accent)]">Edit</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] border-r border-[var(--border)] bg-[var(--bg-soft)] lg:block">
        {navContent}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[260px] max-w-[85vw] border-r border-[var(--border)] bg-[var(--bg-soft)] shadow-xl">
            {navContent}
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-[240px]">
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg-soft)]/95 backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              aria-label="Open navigation"
              className="rounded-md p-2 text-[var(--muted)] hover:bg-[var(--surface-2)] lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-[var(--text)]">{route.label}</h1>
              <p className="hidden truncate text-[0.65rem] text-[var(--muted-2)] sm:block">{route.description}</p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              {demo ? <span className="badge badge-warning hidden sm:inline-flex">Demo</span> : null}
              {notificationError ? (
                <span className="hidden text-[0.65rem] text-[var(--warning)] sm:inline" title={notificationError}>
                  Alerts offline
                </span>
              ) : null}
              <button
                type="button"
                aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
                className="relative rounded-md p-2 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                onClick={() => navigate('notifications')}
              >
                <Bell size={17} />
                {unread > 0 ? (
                  <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[0.55rem] font-bold text-white">
                    {unread > 99 ? '99+' : unread}
                  </span>
                ) : null}
              </button>
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-md p-1.5 hover:bg-[var(--surface-2)]"
                  aria-haspopup="menu"
                  aria-expanded={userMenu}
                  onClick={() => setUserMenu((value) => !value)}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[0.65rem] font-bold text-[var(--accent)]">
                    {initials(user?.name || 'Candidate')}
                  </span>
                  <span className="hidden max-w-[140px] truncate text-xs font-medium text-[var(--text)] sm:block">{user?.name}</span>
                  <ChevronDown size={12} className="hidden text-[var(--muted-2)] sm:block" />
                </button>
                {userMenu ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+6px)] w-52 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-solid)] p-1 shadow-lg"
                  >
                    <div className="border-b border-[var(--border)] px-3 py-2">
                      <div className="truncate text-xs font-semibold text-[var(--text)]">{user?.name}</div>
                      <div className="truncate text-[0.62rem] text-[var(--muted-2)]">{user?.email}</div>
                    </div>
                    <button type="button" role="menuitem" className="nav-item mt-1" onClick={() => navigate('profile')}>
                      <UserRound size={14} /> Profile
                    </button>
                    <button type="button" role="menuitem" className="nav-item" onClick={() => navigate('settings')}>
                      <Settings2 size={14} /> Settings
                    </button>
                    <button type="button" role="menuitem" className="nav-item text-[var(--danger)]" onClick={() => void logout()}>
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6">
          <div key={route.path} className="animate-rise">{children}</div>
          <footer className="mt-10 border-t border-[var(--border)] pt-4 text-[0.62rem] leading-relaxed text-[var(--muted-2)]">
            AI Job Hunter · Public data from Remotive, Greenhouse and Lever · Human-approved applications only.
          </footer>
        </main>
      </div>
    </div>
  );
}

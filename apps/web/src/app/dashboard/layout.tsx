'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import OnboardingTour from '../../components/OnboardingTour';
import { useTheme } from '../../components/ThemeProvider';

interface Me {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: 'SUPERADMIN' | 'ADMIN' | 'USER';
  approvalStatus: 'PENDING' | 'APPROVED';
  blockedAt?: string | null;
  sessionExpiresAt?: number | null;
  isFirstLogin?: boolean;
}

interface SearchResult {
  videos: { id: string; title: string | null; originalName: string | null; analysisStatus: string; thumbnailPath: string | null }[];
  users: { id: string; name: string | null; email: string; role: string }[];
  logs: { id: string; action: string; message: string; createdAt: string }[];
}

interface Notification {
  id: string;
  type: string;
  message: string;
  videoId: string | null;
  read: boolean;
  createdAt: string;
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function SessionTimer({ expiresAt, onExpired }: { expiresAt: number; onExpired: () => void }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, expiresAt - Math.floor(Date.now() / 1000)));
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;

  useEffect(() => {
    const tick = () => {
      const secs = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
      setRemaining(secs);
      if (secs === 0) onExpiredRef.current();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const warn = remaining <= 300;
  const critical = remaining <= 60;

  return (
    <div
      title={`Sesja wygasa: ${new Date(expiresAt * 1000).toLocaleTimeString('pl-PL')}`}
      className={`hidden items-center gap-1.5 rounded-full border px-3 py-1 sm:flex ${
        critical
          ? 'border-red-500/30 bg-red-500/10 text-red-400'
          : warn
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
          : 'border-gray-700 bg-gray-800/60 text-gray-500'
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-3.5 w-3.5 shrink-0">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span className="text-xs">do końca sesji: <span className="font-mono font-semibold">{formatCountdown(remaining)}</span></span>
    </div>
  );
}

const API = process.env.NEXT_PUBLIC_API_URL ?? '/api';

const navItems = [
  {
    href: '/dashboard/videos',
    label: 'Nagrania',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
        <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.89L15 14" />
        <rect x="1" y="6" width="15" height="12" rx="2" />
      </svg>
    ),
  },
  {
    href: '/dashboard/training',
    label: 'Trening',
    adminOnly: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
        <path d="M4 6h16v12H4z" />
        <path d="m10 9 5 3-5 3z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/analysis',
    label: 'Analiza AI',
    adminOnly: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
        <path d="M12 2a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4z" />
        <path d="M12 14c-5 0-8 2-8 4v1h16v-1c0-2-3-4-8-4z" />
        <path d="M19 3l1.5 1.5L19 6" /><path d="M21 4.5H17" />
        <path d="M19 18l1.5 1.5L19 21" /><path d="M21 19.5H17" />
      </svg>
    ),
  },
  {
    href: '/dashboard/reports',
    label: 'Raporty',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    href: '/dashboard/logs',
    label: 'Logi',
    adminOnly: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    href: '/dashboard/users',
    label: 'Użytkownicy',
    adminOnly: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <path d="M20 8v6M17 11h6" />
      </svg>
    ),
  },
  {
    href: '/dashboard/profile',
    label: 'Profil',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
        <circle cx="12" cy="8" r="4" />
        <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
      </svg>
    ),
  },
  {
    href: '/dashboard/settings',
    label: 'Ustawienia',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<Me | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || user?.role === 'ADMIN' || user?.role === 'SUPERADMIN');

  const isOperatorUser = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
  const unreadCount = notifications.filter((n) => !n.read).length;
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`${API}/auth/me`, { credentials: 'include' })
      .then((r) => {
        if (r.status === 401) { router.replace('/login'); return null; }
        return r.json() as Promise<Me>;
      })
      .then((data) => { if (data) { setUser(data); if (data.isFirstLogin) setShowOnboarding(true); } })
      .catch(() => router.replace('/login'));
  }, [router]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (searchQuery.trim().length < 2) { setSearchResults(null); return; }
    searchTimerRef.current = setTimeout(async () => {
      const res = await fetch(`${API}/search?q=${encodeURIComponent(searchQuery.trim())}`, { credentials: 'include' });
      if (res.ok) { setSearchResults(await res.json()); setSearchOpen(true); }
    }, 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const loadNotifications = useCallback(async () => {
    const res = await fetch(`${API}/notifications`, { credentials: 'include' });
    if (res.ok) setNotifications(await res.json());
  }, []);

  useEffect(() => {
    loadNotifications();
    const id = setInterval(loadNotifications, 30_000);
    return () => clearInterval(id);
  }, [loadNotifications]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch(`${API}/health`, { credentials: 'include' });
        setApiOnline(res.ok);
      } catch {
        setApiOnline(false);
      }
    }
    checkHealth();
    const id = setInterval(checkHealth, 30_000);
    return () => clearInterval(id);
  }, []);

  async function markAllRead() {
    await fetch(`${API}/notifications/read-all`, { method: 'POST', credentials: 'include' });
    setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
  }

  async function deleteNotif(id: string) {
    await fetch(`${API}/notifications/${id}`, { method: 'DELETE', credentials: 'include' });
    setNotifications((ns) => ns.filter((n) => n.id !== id));
  }

  async function handleLogout() {
    await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
    router.replace('/login');
  }

  const initials = user
    ? (user.name ?? user.email).slice(0, 2).toUpperCase()
    : '..';

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {showOnboarding && <OnboardingTour onComplete={() => { setShowOnboarding(false); setUser((u) => u ? { ...u, isFirstLogin: false } : u); }} />}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-gray-800 bg-gray-900
          transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0
        `}
      >
        <div className="flex h-16 items-center gap-3 border-b border-gray-800 px-5">
          <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-black">
                <path d="M4 12h16M4 12l3-3m-3 3 3 3" />
                <circle cx="19" cy="12" r="2" />
                <path d="M12 5v14" strokeDasharray="2 2" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-wide text-white">
              railcross<span className="text-amber-400">-watch</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            Monitorowanie
          </p>
          <ul className="space-y-0.5">
            {visibleNavItems.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                      ${active
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      }
                    `}
                  >
                    <span className={active ? 'text-amber-400' : 'text-gray-500'}>
                      {item.icon}
                    </span>
                    {item.label}
                    {item.href === '/dashboard/alerts' && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500/20 px-1.5 text-[10px] font-bold text-red-400">
                        3
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-gray-800 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-400">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user?.name ?? '—'}</p>
              <p className="truncate text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b border-gray-800 bg-gray-900 px-4 lg:px-6">
          <button
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className="hidden items-center lg:flex">
            <span className="text-sm font-medium text-gray-400">
              {visibleNavItems.find((n) => n.href === pathname)?.label ?? 'Dashboard'}
            </span>
          </div>

          <div ref={searchRef} className="relative flex-1 max-w-sm lg:max-w-xs">
            <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4 shrink-0 text-gray-500">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Szukaj…"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); if (!e.target.value.trim()) setSearchOpen(false); }}
                onFocus={() => { if (searchResults) setSearchOpen(true); }}
                onKeyDown={(e) => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); } }}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchResults(null); setSearchOpen(false); }} className="text-gray-500 hover:text-white">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              )}
            </div>
            {searchOpen && searchResults && (
              <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-72 rounded-xl border border-gray-800 bg-gray-900 shadow-2xl">
                {searchResults.videos.length === 0 && searchResults.users.length === 0 && searchResults.logs.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-500">Brak wyników</p>
                ) : (
                  <div className="max-h-80 overflow-y-auto py-1">
                    {searchResults.videos.length > 0 && (
                      <>
                        <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Nagrania</p>
                        {searchResults.videos.map((v) => (
                          <Link
                            key={v.id}
                            href={`/dashboard/videos/${v.id}`}
                            onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4 shrink-0 text-gray-500"><path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.89L15 14" /><rect x="1" y="6" width="15" height="12" rx="2" /></svg>
                            <span className="truncate">{v.title ?? v.originalName ?? v.id}</span>
                          </Link>
                        ))}
                      </>
                    )}
                    {isOperatorUser && searchResults.users.length > 0 && (
                      <>
                        <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Użytkownicy</p>
                        {searchResults.users.map((u) => (
                          <Link
                            key={u.id}
                            href="/dashboard/users"
                            onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4 shrink-0 text-gray-500"><circle cx="12" cy="8" r="4" /><path d="M6 20v-2a6 6 0 0 1 12 0v2" /></svg>
                            <span className="truncate">{u.name ?? u.email}</span>
                            <span className="ml-auto text-[10px] text-gray-600">{u.email}</span>
                          </Link>
                        ))}
                      </>
                    )}
                    {isOperatorUser && searchResults.logs.length > 0 && (
                      <>
                        <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Logi</p>
                        {searchResults.logs.map((l) => (
                          <Link
                            key={l.id}
                            href="/dashboard/logs"
                            onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4 shrink-0 text-gray-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                            <span className="truncate">{l.message}</span>
                          </Link>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {apiOnline !== null && (
            <div className={`hidden items-center gap-2 rounded-full border px-3 py-1 sm:flex ${apiOnline ? 'border-green-500/20 bg-green-500/10' : 'border-red-500/20 bg-red-500/10'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${apiOnline ? 'animate-pulse bg-green-400' : 'bg-red-400'}`} />
              <span className={`text-xs font-medium ${apiOnline ? 'text-green-400' : 'text-red-400'}`}>
                {apiOnline ? 'API online' : 'API offline'}
              </span>
            </div>
          )}

          {user?.sessionExpiresAt && (
            <SessionTimer
              expiresAt={user.sessionExpiresAt}
              onExpired={handleLogout}
            />
          )}

          <div ref={notifRef} className="relative">
            <button
              onClick={() => { setNotifOpen((v) => !v); if (!notifOpen) loadNotifications(); }}
              className="relative rounded-lg p-2 text-gray-400 transition hover:bg-gray-800 hover:text-white"
              title="Powiadomienia"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-xl border border-gray-800 bg-gray-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
                  <span className="text-sm font-semibold text-white">Powiadomienia</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-gray-500 hover:text-amber-400 transition">
                      Oznacz wszystkie
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-gray-500">Brak powiadomień</p>
                ) : (
                  <ul className="max-h-96 divide-y divide-gray-800 overflow-y-auto">
                    {notifications.map((n) => (
                      <li
                        key={n.id}
                        className={`flex items-start gap-3 px-4 py-3 transition hover:bg-gray-800/60 ${n.read ? '' : 'bg-amber-500/5'}`}
                      >
                        <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-gray-700' : 'bg-amber-400'}`} />
                        <div className="flex-1 min-w-0">
                          {n.videoId ? (
                            <Link
                              href={`/dashboard/videos/${n.videoId}`}
                              onClick={() => setNotifOpen(false)}
                              className="block text-xs text-gray-300 hover:text-white"
                            >
                              {n.message}
                            </Link>
                          ) : (
                            <p className="text-xs text-gray-300">{n.message}</p>
                          )}
                          <p className="mt-0.5 text-[10px] text-gray-600">
                            {new Date(n.createdAt).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteNotif(n.id)}
                          className="shrink-0 text-gray-700 hover:text-red-400 transition"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Przełącz na jasny motyw' : 'Przełącz na ciemny motyw'}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-800 hover:text-amber-400"
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          <div className="flex items-center gap-3">
            <div className="hidden flex-col items-end sm:flex">
              <span className="text-sm font-medium text-white">{user?.name ?? user?.email}</span>
              <span className="text-xs text-gray-500">
                {user?.role === 'SUPERADMIN' ? 'Superadmin' : user?.role === 'ADMIN' ? 'Administrator' : 'Operator'}
              </span>
            </div>
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-amber-500/40" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-400 ring-2 ring-amber-500/40">
                {initials}
              </div>
            )}
            <button
              onClick={handleLogout}
              title="Wyloguj się"
              className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-800 hover:text-red-400"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

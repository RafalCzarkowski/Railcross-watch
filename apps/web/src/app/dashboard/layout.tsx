'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface Me {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: 'SUPERADMIN' | 'ADMIN' | 'USER';
  approvalStatus: 'PENDING' | 'APPROVED';
  blockedAt?: string | null;
  sessionExpiresAt?: number | null;
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
    href: '/dashboard',
    label: 'Przegląd',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/dashboard/crossings',
    label: 'Przejazdy',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
        <path d="M4 12h16M4 12l3-3m-3 3 3 3" />
        <circle cx="19" cy="12" r="2" />
        <path d="M12 5v14" strokeDasharray="2 2" />
      </svg>
    ),
  },
  {
    href: '/dashboard/alerts',
    label: 'Alerty',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    href: '/dashboard/cameras',
    label: 'Kamery',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" />
        <circle cx="12" cy="13" r="3" />
      </svg>
    ),
  },
  {
    href: '/dashboard/map',
    label: 'Mapa',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
        <line x1="9" y1="3" x2="9" y2="18" />
        <line x1="15" y1="6" x2="15" y2="21" />
      </svg>
    ),
  },
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

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || user?.role === 'ADMIN' || user?.role === 'SUPERADMIN');

  useEffect(() => {
    fetch(`${API}/auth/me`, { credentials: 'include' })
      .then((r) => {
        if (r.status === 401) { router.replace('/login'); return null; }
        return r.json() as Promise<Me>;
      })
      .then((data) => { if (data) setUser(data); })
      .catch(() => router.replace('/login'));
  }, [router]);

  async function handleLogout() {
    await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
    router.replace('/login');
  }

  const initials = user
    ? (user.name ?? user.email).slice(0, 2).toUpperCase()
    : '..';

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
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

          <div className="flex-1">
            <span className="text-sm font-medium text-gray-400">
              {visibleNavItems.find((n) => n.href === pathname)?.label ?? 'Dashboard'}
            </span>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
            <span className="text-xs font-medium text-green-400">System aktywny</span>
          </div>

          {user?.sessionExpiresAt && (
            <SessionTimer
              expiresAt={user.sessionExpiresAt}
              onExpired={handleLogout}
            />
          )}

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

'use client';

import { useEffect, useState, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? '/api';

interface Actor { id: string; name: string | null; email: string; }
interface LogEntry {
  id: string;
  action: string;
  message: string;
  actor: Actor | null;
  targetId: string | null;
  targetType: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

type ActionGroup = 'auth' | 'mfa' | 'user-mgmt' | 'video' | 'other';

interface ActionMeta {
  label: string;
  color: string;
  group: ActionGroup;
}

const ACTION_META: Record<string, ActionMeta> = {
  USER_LOGIN:          { label: 'Logowanie',             color: 'text-green-400 bg-green-500/10 border-green-500/20',   group: 'auth' },
  USER_LOGIN_OAUTH:    { label: 'Logowanie OAuth',        color: 'text-green-400 bg-green-500/10 border-green-500/20',   group: 'auth' },
  USER_REGISTER:       { label: 'Rejestracja',            color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',      group: 'auth' },
  USER_REGISTER_OAUTH: { label: 'Rejestracja OAuth',      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',      group: 'auth' },
  USER_LOGOUT:         { label: 'Wylogowanie',            color: 'text-gray-400 bg-gray-500/10 border-gray-500/20',      group: 'auth' },
  LOGIN_FAILED:        { label: 'Błąd logowania',         color: 'text-red-400 bg-red-500/10 border-red-500/20',         group: 'auth' },
  LOGIN_MFA_PENDING:   { label: 'Oczekuje na OTP',        color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',   group: 'mfa' },
  MFA_LOGIN_SUCCESS:   { label: 'Weryfikacja OTP — OK',   color: 'text-green-400 bg-green-500/10 border-green-500/20',   group: 'mfa' },
  MFA_CODE_FAILED:     { label: 'Błędny kod OTP',         color: 'text-red-400 bg-red-500/10 border-red-500/20',         group: 'mfa' },
  MFA_SETUP_STARTED:   { label: 'Konfiguracja MFA',       color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',   group: 'mfa' },
  MFA_ENABLED:         { label: 'MFA włączone',           color: 'text-green-400 bg-green-500/10 border-green-500/20',   group: 'mfa' },
  MFA_DISABLED:        { label: 'MFA wyłączone',          color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', group: 'mfa' },
  USER_APPROVED:       { label: 'Konto zatwierdzone',     color: 'text-green-400 bg-green-500/10 border-green-500/20',   group: 'user-mgmt' },
  USER_BLOCKED:        { label: 'Konto zablokowane',      color: 'text-red-400 bg-red-500/10 border-red-500/20',         group: 'user-mgmt' },
  USER_UNBLOCKED:      { label: 'Konto odblokowane',      color: 'text-green-400 bg-green-500/10 border-green-500/20',   group: 'user-mgmt' },
  USER_GRANTED_ADMIN:  { label: 'Rola admina nadana',     color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', group: 'user-mgmt' },
  USER_REVOKED_ADMIN:  { label: 'Rola admina cofnięta',   color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', group: 'user-mgmt' },
  VIDEO_UPLOAD:        { label: 'Wgranie pliku',          color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',         group: 'video' },
  VIDEO_LINK_ADD:      { label: 'Dodanie linku',          color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',         group: 'video' },
  VIDEO_APPROVE:       { label: 'Nagranie zatwierdzone',  color: 'text-green-400 bg-green-500/10 border-green-500/20',   group: 'video' },
  VIDEO_REJECT:        { label: 'Nagranie odrzucone',     color: 'text-red-400 bg-red-500/10 border-red-500/20',         group: 'video' },
  VIDEO_UPDATE:        { label: 'Edycja nagrania',        color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',   group: 'video' },
  VIDEO_DELETE:        { label: 'Usunięcie nagrania',     color: 'text-red-400 bg-red-500/10 border-red-500/20',         group: 'video' },
};

const GROUP_FILTERS: { value: ActionGroup | 'all'; label: string }[] = [
  { value: 'all',       label: 'Wszystkie' },
  { value: 'auth',      label: 'Logowanie' },
  { value: 'mfa',       label: 'OTP / MFA' },
  { value: 'user-mgmt', label: 'Zarządzanie użytkownikami' },
  { value: 'video',     label: 'Nagrania' },
];

const LIMIT_OPTIONS = [10, 25, 50, 100];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'medium' });
}

function ActionBadge({ action }: { action: string }) {
  const meta = ACTION_META[action];
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta?.color ?? 'text-gray-400 bg-gray-800 border-gray-700'}`}>
      {meta?.label ?? action}
    </span>
  );
}

function LogIcon({ action }: { action: string }) {
  const group = ACTION_META[action]?.group ?? 'other';
  const s = 'h-4 w-4';

  if (action === 'LOGIN_FAILED' || action === 'MFA_CODE_FAILED') {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500/10">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`${s} text-red-400`}>
          <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      </span>
    );
  }
  if (action === 'USER_LOGOUT') {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-700/40">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`${s} text-gray-400`}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </span>
    );
  }
  if (group === 'auth') {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-500/10">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`${s} text-green-400`}>
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
        </svg>
      </span>
    );
  }
  if (group === 'mfa') {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`${s} text-amber-400`}>
          <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /><circle cx="12" cy="16" r="1" fill="currentColor" />
        </svg>
      </span>
    );
  }
  if (group === 'user-mgmt') {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`${s} text-purple-400`}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" />
        </svg>
      </span>
    );
  }
  if (group === 'video') {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500/10">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`${s} text-sky-400`}>
          <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.89L15 14" /><rect x="1" y="6" width="15" height="12" rx="2" />
        </svg>
      </span>
    );
  }
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-700/40">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`${s} text-gray-500`}>
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    </span>
  );
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [groupFilter, setGroupFilter] = useState<ActionGroup | 'all'>('all');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadLogs(l: number, s: string) {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(l) });
    if (s) params.set('search', s);
    const res = await fetch(`${API}/logs?${params}`, { credentials: 'include' });
    if (res.ok) setLogs(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadLogs(limit, search); }, [limit, search]);

  function onSearchChange(val: string) {
    setSearchInput(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setSearch(val), 400);
  }

  const filtered = groupFilter === 'all'
    ? logs
    : logs.filter((l) => (ACTION_META[l.action]?.group ?? 'other') === groupFilter);

  const groupCounts = logs.reduce<Record<string, number>>((acc, l) => {
    const g = ACTION_META[l.action]?.group ?? 'other';
    acc[g] = (acc[g] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Logi aktywności</h1>
          <p className="mt-0.5 text-sm text-gray-500">Pełna historia operacji — logowania, OTP, nagrania, zarządzanie</p>
        </div>
        <button
          onClick={() => loadLogs(limit, search)}
          className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-400 transition hover:border-gray-600 hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Odśwież
        </button>
      </div>


      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Szukaj — e-mail, akcja, treść…"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-amber-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Pokaż</span>
          <div className="flex overflow-hidden rounded-lg border border-gray-700">
            {LIMIT_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setLimit(n)}
                className={`px-3 py-2 text-xs font-medium transition ${limit === n ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>


      <div className="flex flex-wrap gap-2">
        {GROUP_FILTERS.map(({ value, label }) => {
          const count = value === 'all' ? logs.length : (groupCounts[value] ?? 0);
          const active = groupFilter === value;
          return (
            <button
              key={value}
              onClick={() => setGroupFilter(value)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                active
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                  : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-white'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? 'bg-amber-500/20 text-amber-300' : 'bg-gray-700 text-gray-400'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mr-3 h-5 w-5 animate-spin">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Ładowanie logów…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 py-16 text-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mx-auto mb-3 h-10 w-10 text-gray-700">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <p className="text-sm text-gray-500">
            {search ? `Brak wyników dla „${search}".` : 'Brak logów w tej kategorii.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
          <div className="divide-y divide-gray-800">
            {filtered.map((log) => (
              <div key={log.id} className="flex items-start gap-3 px-5 py-3.5 transition hover:bg-gray-800/50">
                <div className="mt-0.5">
                  <LogIcon action={log.action} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <ActionBadge action={log.action} />
                    <span className="text-sm text-white">{log.message}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                    {log.actor ? (
                      <span className="font-medium text-gray-400">{log.actor.name ?? log.actor.email}</span>
                    ) : (
                      <span className="italic text-gray-600">System / nieznany</span>
                    )}
                    <span>{formatDate(log.createdAt)}</span>
                    {log.ipAddress && (
                      <span className="font-mono text-gray-600" title={log.userAgent ?? undefined}>{log.ipAddress}</span>
                    )}
                    {log.targetId && log.targetType !== 'USER' && (
                      <span className="font-mono text-gray-700">#{log.targetId.slice(-8)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="text-center text-xs text-gray-600">
          {filtered.length} {filtered.length === 1 ? 'wpis' : filtered.length < 5 ? 'wpisy' : 'wpisów'}
          {groupFilter !== 'all' && ` · filtr: ${GROUP_FILTERS.find(f => f.value === groupFilter)?.label}`}
          {search && ` · fraza: „${search}"`}
        </p>
      )}
    </div>
  );
}
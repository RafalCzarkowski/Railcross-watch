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
  createdAt: string;
}

const ACTION_META: Record<string, { label: string; color: string }> = {
  VIDEO_UPLOAD:    { label: 'Wgranie pliku',       color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  VIDEO_LINK_ADD:  { label: 'Dodanie linku',        color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  VIDEO_APPROVE:   { label: 'Zatwierdzono',         color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  VIDEO_REJECT:    { label: 'Odrzucono',            color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  VIDEO_UPDATE:    { label: 'Edycja metadanych',    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  VIDEO_DELETE:    { label: 'Usunięcie nagrania',   color: 'text-red-400 bg-red-500/10 border-red-500/20' },
};

const LIMIT_OPTIONS = [10, 25, 50, 100];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'medium' });
}

function ActionBadge({ action }: { action: string }) {
  const meta = ACTION_META[action];
  if (meta) {
    return (
      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.color}`}>
        {meta.label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-gray-700 bg-gray-800 px-2 py-0.5 text-[10px] font-semibold text-gray-400">
      {action}
    </span>
  );
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Logi aktywności</h1>
          <p className="mt-0.5 text-sm text-gray-500">Historia wszystkich operacji w systemie</p>
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
        <div className="relative flex-1 min-w-48">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Szukaj w logach (wiadomość, akcja, użytkownik…)"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-amber-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Pokaż</span>
          <div className="flex rounded-lg border border-gray-700 overflow-hidden">
            {LIMIT_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setLimit(n)}
                className={`px-3 py-2 text-xs font-medium transition ${
                  limit === n
                    ? 'bg-amber-500 text-black'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-500">logów</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mr-3 h-5 w-5 animate-spin">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Ładowanie logów…
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 py-16 text-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mx-auto mb-3 h-10 w-10 text-gray-700">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
          </svg>
          <p className="text-sm text-gray-500">{search ? 'Brak wyników dla podanej frazy.' : 'Brak logów.'}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
          <div className="divide-y divide-gray-800">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-4 px-5 py-4 transition hover:bg-gray-800/50">
                <div className="mt-0.5 shrink-0">
                  <LogIcon action={log.action} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <ActionBadge action={log.action} />
                    <span className="text-sm text-white">{log.message}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                    {log.actor ? (
                      <span className="font-medium text-gray-400">
                        {log.actor.name ?? log.actor.email}
                      </span>
                    ) : (
                      <span className="italic text-gray-600">System</span>
                    )}
                    <span>{formatDate(log.createdAt)}</span>
                    {log.targetId && (
                      <span className="font-mono text-gray-700">#{log.targetId.slice(-8)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && logs.length > 0 && (
        <p className="text-center text-xs text-gray-600">
          Wyświetlono {logs.length} {logs.length === 1 ? 'wpis' : logs.length < 5 ? 'wpisy' : 'wpisów'}
          {search && ` dla frazy „${search}"`}
        </p>
      )}
    </div>
  );
}

function LogIcon({ action }: { action: string }) {
  const cls = 'h-4 w-4';
  if (action === 'VIDEO_APPROVE') {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500/10">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`${cls} text-green-400`}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
    );
  }
  if (action === 'VIDEO_REJECT' || action === 'VIDEO_DELETE') {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/10">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`${cls} text-red-400`}>
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </span>
    );
  }
  if (action === 'VIDEO_UPDATE') {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/10">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`${cls} text-amber-400`}>
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </span>
    );
  }
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/10">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`${cls} text-blue-400`}>
        <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.89L15 14" />
        <rect x="1" y="6" width="15" height="12" rx="2" />
      </svg>
    </span>
  );
}

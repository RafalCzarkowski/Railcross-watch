'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? '/api';

interface DailyStat { date: string; count: number; }
interface Summary {
  users: { total: number; pendingApproval: number; withMfa: number; byRole: Record<string, number> };
  videos: {
    total: number;
    byApprovalStatus: Record<string, number>;
    byAnalysisStatus: Record<string, number>;
    bySourceType: Record<string, number>;
    totalSizeBytes: number;
    uploadsLast30Days: DailyStat[];
  };
  activity: { totalLogs: number; last30Days: DailyStat[]; byAction: { action: string; count: number }[]; failedLogins7Days: number };
}

interface LogEntry {
  id: string;
  action: string;
  message: string;
  actor: { name: string | null; email: string } | null;
  createdAt: string;
}

const ACTION_COLOR: Record<string, string> = {
  LOGOWANIE:         'bg-green-500',
  LOGOWANIE_OAUTH:   'bg-green-500',
  WYLOGOWANIE:        'bg-gray-500',
  LOGOWANIE_NIEUDANE:       'bg-red-500',
  OTP_KOD_BLEDNY:    'bg-red-500',
  OTP_WERYFIKACJA_OK:  'bg-green-500',
  REJESTRACJA:      'bg-blue-500',
  REJESTRACJA_OAUTH:'bg-blue-500',
  KONTO_ZATWIERDZONE:      'bg-green-500',
  KONTO_ZABLOKOWANE:       'bg-red-500',
  WIDEO_WGRANO:       'bg-sky-500',
  WIDEO_LINK_DODANO:     'bg-sky-500',
  WIDEO_ZATWIERDZONE:      'bg-green-500',
  WIDEO_ODRZUCONE:       'bg-red-500',
  WIDEO_USUNIETO:       'bg-red-500',
  WIDEO_ANALIZA_KOLEJKA: 'bg-amber-500',
};

const ACTION_LABEL: Record<string, string> = {
  LOGOWANIE:            'Logowanie',
  LOGOWANIE_OAUTH:      'Logowanie OAuth',
  WYLOGOWANIE:           'Wylogowanie',
  LOGOWANIE_NIEUDANE:          'Błąd logowania',
  OTP_KOD_BLEDNY:       'Błędny kod OTP',
  OTP_WERYFIKACJA_OK:     'Weryfikacja OTP',
  MFA_WLACZONE:           'MFA włączone',
  MFA_WYLACZONE:          'MFA wyłączone',
  REJESTRACJA:         'Rejestracja',
  REJESTRACJA_OAUTH:   'Rejestracja OAuth',
  KONTO_ZATWIERDZONE:         'Konto zatwierdzone',
  KONTO_ZABLOKOWANE:          'Konto zablokowane',
  KONTO_ODBLOKOWANE:        'Konto odblokowane',
  KONTO_ADMIN_NADANO:    'Nadano admina',
  KONTO_ADMIN_COFNIETO:    'Cofnięto admina',
  WIDEO_WGRANO:          'Wgrano nagranie',
  WIDEO_LINK_DODANO:        'Dodano link',
  WIDEO_ZATWIERDZONE:         'Zatwierdzono nagranie',
  WIDEO_ODRZUCONE:          'Odrzucono nagranie',
  WIDEO_USUNIETO:          'Usunięto nagranie',
  WIDEO_EDYTOWANO:          'Edytowano nagranie',
  WIDEO_ANALIZA_KOLEJKA: 'Zlecono analizę',
};

function formatBytes(b: number) {
  if (!b) return '0 B';
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(0)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s temu`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min temu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h temu`;
  return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
}

export default function DashboardPage() {
  const [time, setTime] = useState(new Date());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    async function load() {
      const meRes = await fetch(`${API}/auth/me`, { credentials: 'include' });
      if (!meRes.ok) { setLoading(false); return; }
      const me = await meRes.json();
      const admin = me.role === 'ADMIN' || me.role === 'SUPERADMIN';
      setIsAdmin(admin);

      const promises: Promise<void>[] = [];

      if (admin) {
        promises.push(
          fetch(`${API}/reports/summary`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setSummary(d); }),
          fetch(`${API}/logs?limit=8`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : [])
            .then(d => setLogs(Array.isArray(d) ? d : [])),
        );
      } else {
        promises.push(
          fetch(`${API}/videos`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : [])
            .then((vids: any[]) => {
              const approved = vids.filter(v => v.approvalStatus === 'APPROVED').length;
              const pending  = vids.filter(v => v.approvalStatus === 'PENDING').length;
              setSummary({
                users: { total: 0, pendingApproval: 0, withMfa: 0, byRole: {} },
                videos: {
                  total: vids.length,
                  byApprovalStatus: { APPROVED: approved, PENDING: pending },
                  byAnalysisStatus: {},
                  bySourceType: {},
                  totalSizeBytes: vids.reduce((s: number, v: any) => s + (v.size ?? 0), 0),
                  uploadsLast30Days: [],
                },
                activity: { totalLogs: 0, last30Days: [], byAction: [], failedLogins7Days: 0 },
              });
            }),
        );
      }

      await Promise.all(promises);
      setLoading(false);
    }
    load();
  }, []);

  const maxActivity = summary ? Math.max(...summary.activity.last30Days.map(d => d.count), 1) : 1;
  const maxUploads  = summary ? Math.max(...summary.videos.uploadsLast30Days.map(d => d.count), 1) : 1;

  const analysisDone       = summary?.videos.byAnalysisStatus['DONE'] ?? 0;
  const analysisProcessing = summary?.videos.byAnalysisStatus['PROCESSING'] ?? 0;
  const analysisPending    = summary?.videos.byAnalysisStatus['PENDING'] ?? 0;
  const analysisError      = summary?.videos.byAnalysisStatus['ERROR'] ?? 0;

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Przegląd systemu</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {time.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {' · '}
            <span className="font-mono text-amber-400">{time.toLocaleTimeString('pl-PL')}</span>
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); setSummary(null); setLogs([]); }}
          className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-300 transition hover:border-gray-600 hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Odśwież
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mr-3 h-5 w-5 animate-spin">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Ładowanie danych…
        </div>
      ) : (
        <>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <div className="relative overflow-hidden rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent bg-gray-900 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Nagrania</p>
                  <p className="mt-2 text-3xl font-bold text-white">{summary?.videos.total ?? 0}</p>
                  <p className="mt-1 text-xs text-gray-500">{formatBytes(summary?.videos.totalSizeBytes ?? 0)}</p>
                </div>
                <div className="rounded-lg bg-gray-800/80 p-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-6 w-6 text-amber-400">
                    <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.89L15 14" />
                    <rect x="1" y="6" width="15" height="12" rx="2" />
                  </svg>
                </div>
              </div>
            </div>


            <div className="relative overflow-hidden rounded-xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 to-transparent bg-gray-900 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Oczekuje na zatwierdzenie</p>
                  <p className="mt-2 text-3xl font-bold text-white">{summary?.videos.byApprovalStatus['PENDING'] ?? 0}</p>
                  <p className="mt-1 text-xs text-gray-500">{summary?.videos.byApprovalStatus['APPROVED'] ?? 0} zatwierdzonych</p>
                </div>
                <div className="rounded-lg bg-gray-800/80 p-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-6 w-6 text-sky-400">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
              </div>
            </div>


            <div className="relative overflow-hidden rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-transparent bg-gray-900 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Analiz ukończonych</p>
                  <p className="mt-2 text-3xl font-bold text-white">{analysisDone}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {analysisProcessing > 0 && <span className="text-amber-400">{analysisProcessing} w trakcie · </span>}
                    {analysisPending} oczekuje
                  </p>
                </div>
                <div className="rounded-lg bg-gray-800/80 p-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-6 w-6 text-green-400">
                    <path d="M12 2a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4z" />
                    <path d="M12 14c-5 0-8 2-8 4v1h16v-1c0-2-3-4-8-4z" />
                    <polyline points="17 11 19 13 23 9" />
                  </svg>
                </div>
              </div>
            </div>


            {isAdmin ? (
              <div className="relative overflow-hidden rounded-xl border border-red-500/20 bg-gradient-to-br from-red-500/10 to-transparent bg-gray-900 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Błędy użytkowników (7 dni)</p>
                    <p className="mt-2 text-3xl font-bold text-white">{summary?.activity.failedLogins7Days ?? 0}</p>
                    <p className="mt-1 text-xs text-gray-500">nieudane próby działań w systemie</p>
                  </div>
                  <div className="rounded-lg bg-gray-800/80 p-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-6 w-6 text-red-400">
                      <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
                      <line x1="12" y1="15" x2="12" y2="17" />
                    </svg>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-transparent bg-gray-900 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Błędy analizy</p>
                    <p className="mt-2 text-3xl font-bold text-white">{analysisError}</p>
                    <p className="mt-1 text-xs text-gray-500">nagrań wymaga ponownej analizy</p>
                  </div>
                  <div className="rounded-lg bg-gray-800/80 p-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-6 w-6 text-purple-400">
                      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>


          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">


            <div className="rounded-xl border border-gray-800 bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
                <h2 className="text-sm font-semibold text-white">Ostatnia aktywność</h2>
                {isAdmin && (
                  <Link href="/dashboard/logs" className="text-xs font-medium text-amber-400 hover:text-amber-300">
                    Wszystkie logi →
                  </Link>
                )}
              </div>
              {logs.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-gray-600">Brak zdarzeń do wyświetlenia.</div>
              ) : (
                <ul className="divide-y divide-gray-800">
                  {logs.map((log) => (
                    <li key={log.id} className="flex items-start gap-3 px-5 py-3">
                      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${ACTION_COLOR[log.action] ?? 'bg-gray-600'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-white">{log.message}</p>
                        <p className="mt-0.5 text-xs text-gray-600">
                          {log.actor?.name ?? log.actor?.email ?? 'System'}
                          {' · '}{ACTION_LABEL[log.action] ?? log.action}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-gray-600">{timeAgo(log.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>


            <div className="rounded-xl border border-gray-800 bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
                <h2 className="text-sm font-semibold text-white">Status analizy</h2>
                <Link href="/dashboard/analysis" className="text-xs font-medium text-amber-400 hover:text-amber-300">
                  Otwórz analizę →
                </Link>
              </div>
              <div className="p-5 space-y-4">
                {[
                  { label: 'Oczekuje na analizę', value: analysisPending,    total: summary?.videos.total ?? 1, color: 'bg-gray-600',   text: 'text-gray-400' },
                  { label: 'W trakcie przetwarzania', value: analysisProcessing, total: summary?.videos.total ?? 1, color: 'bg-amber-500 animate-pulse', text: 'text-amber-400' },
                  { label: 'Analiza ukończona',   value: analysisDone,       total: summary?.videos.total ?? 1, color: 'bg-green-500',  text: 'text-green-400' },
                  { label: 'Błąd analizy',        value: analysisError,      total: summary?.videos.total ?? 1, color: 'bg-red-500',    text: 'text-red-400' },
                ].map(({ label, value, total, color, text }) => (
                  <div key={label}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-gray-400">{label}</span>
                      <span className={`font-semibold ${text}`}>{value}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${color}`}
                        style={{ width: total > 0 ? `${(value / total) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                ))}


                {summary && Object.keys(summary.videos.bySourceType).length > 0 && (
                  <div className="mt-4 border-t border-gray-800 pt-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-600">Źródła nagrań</p>
                    <div className="flex gap-4">
                      {Object.entries(summary.videos.bySourceType).map(([type, count]) => (
                        <div key={type} className="text-center">
                          <p className="text-lg font-black text-white">{count}</p>
                          <p className="text-[10px] text-gray-500">{{ FILE: 'Plik', YOUTUBE: 'YouTube', STREAM: 'Stream' }[type] ?? type}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>


          {isAdmin && summary && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">


              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">Zdarzenia systemowe — ostatnie 30 dni</h2>
                  <span className="text-xs text-gray-500">{summary.activity.totalLogs} łącznie</span>
                </div>
                <div className="flex h-24 items-end gap-0.5">
                  {summary.activity.last30Days.map((d) => (
                    <div
                      key={d.date}
                      title={`${d.date}: ${d.count}`}
                      className="flex-1 rounded-t bg-purple-500/40 transition-all hover:bg-purple-500/70 min-w-0"
                      style={{ height: `${Math.max(4, (d.count / maxActivity) * 100)}%` }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-gray-600">
                  <span>30 dni temu</span><span>dziś</span>
                </div>
              </div>


              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">Nowe nagrania — ostatnie 30 dni</h2>
                  <span className="text-xs text-gray-500">{summary.videos.total} łącznie</span>
                </div>
                <div className="flex h-24 items-end gap-0.5">
                  {summary.videos.uploadsLast30Days.map((d) => (
                    <div
                      key={d.date}
                      title={`${d.date}: ${d.count}`}
                      className="flex-1 rounded-t bg-amber-500/40 transition-all hover:bg-amber-500/70 min-w-0"
                      style={{ height: `${Math.max(4, (d.count / maxUploads) * 100)}%` }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-gray-600">
                  <span>30 dni temu</span><span>dziś</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const API = process.env.NEXT_PUBLIC_API_URL ?? '/api';

interface DailyStat { date: string; count: number; }
interface Summary {
  users: {
    total: number;
    byRole: Record<string, number>;
    pendingApproval: number;
    withMfa: number;
    registrationsLast30Days: DailyStat[];
  };
  videos: {
    total: number;
    bySourceType: Record<string, number>;
    byApprovalStatus: Record<string, number>;
    byAnalysisStatus: Record<string, number>;
    totalSizeBytes: number;
    uploadsLast30Days: DailyStat[];
  };
  activity: {
    totalLogs: number;
    last30Days: DailyStat[];
    byAction: { action: string; count: number }[];
    failedLogins7Days: number;
  };
}

function formatBytes(b: number) {
  if (b === 0) return '0 B';
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

function shortDate(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}.${m}`;
}

const CHART_COLORS = {
  amber:  '#f59e0b',
  blue:   '#38bdf8',
  green:  '#4ade80',
  red:    '#f87171',
  purple: '#c084fc',
  orange: '#fb923c',
  gray:   '#6b7280',
};

const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN: CHART_COLORS.purple,
  ADMIN:      CHART_COLORS.amber,
  USER:       CHART_COLORS.blue,
};

const APPROVAL_COLORS: Record<string, string> = {
  APPROVED: CHART_COLORS.green,
  PENDING:  CHART_COLORS.amber,
  REJECTED: CHART_COLORS.red,
};

const SOURCE_COLORS: Record<string, string> = {
  FILE:    CHART_COLORS.blue,
  YOUTUBE: CHART_COLORS.red,
  STREAM:  CHART_COLORS.orange,
};

const ACTION_LABELS: Record<string, string> = {
  USER_LOGIN:          'Logowanie',
  USER_LOGIN_OAUTH:    'Logowanie OAuth',
  USER_REGISTER:       'Rejestracja',
  USER_REGISTER_OAUTH: 'Rejestracja OAuth',
  USER_LOGOUT:         'Wylogowanie',
  LOGIN_FAILED:        'Błąd logowania',
  LOGIN_MFA_PENDING:   'Oczekuje OTP',
  MFA_LOGIN_SUCCESS:   'OTP — sukces',
  MFA_CODE_FAILED:     'OTP — błąd',
  MFA_ENABLED:         'MFA włączone',
  MFA_DISABLED:        'MFA wyłączone',
  VIDEO_UPLOAD:        'Wgranie pliku',
  VIDEO_LINK_ADD:      'Dodanie linku',
  VIDEO_APPROVE:       'Zatwierdzono',
  VIDEO_REJECT:        'Odrzucono',
  VIDEO_DELETE:        'Usunięto',
  VIDEO_UPDATE:        'Edycja nagrania',
  USER_APPROVED:       'Konto zatwierdzone',
  USER_BLOCKED:        'Konto zablokowane',
  USER_GRANTED_ADMIN:  'Nadano admina',
  USER_REVOKED_ADMIN:  'Cofnięto admina',
};

const GRID = 'stroke-[#1f2937]';
const AXIS_TICK = { fill: '#6b7280', fontSize: 11 };
const TOOLTIP_STYLE = { backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#f9fafb', fontSize: 12 };

function StatCard({ label, value, sub, color = 'amber' }: { label: string; value: string | number; sub?: string; color?: 'amber' | 'blue' | 'red' | 'green' | 'purple' }) {
  const cfg: Record<string, string> = {
    amber:  'text-amber-400 border-amber-500/20 bg-amber-500/5',
    blue:   'text-sky-400   border-sky-500/20   bg-sky-500/5',
    red:    'text-red-400   border-red-500/20   bg-red-500/5',
    green:  'text-green-400 border-green-500/20 bg-green-500/5',
    purple: 'text-purple-400 border-purple-500/20 bg-purple-500/5',
  };
  return (
    <div className={`rounded-xl border p-5 ${cfg[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
      {sub && <p className="mt-1 text-xs opacity-60">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500">{children}</h2>;
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <p className="mb-4 text-sm font-semibold text-gray-300">{title}</p>
      {children}
    </div>
  );
}

function SimplePie({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="py-6 text-center text-xs text-gray-600">Brak danych</p>;
  return (
    <div className="flex items-center gap-6">
      <ResponsiveContainer width={130} height={130}>
        <PieChart>
          <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v} (${((v / total) * 100).toFixed(0)}%)`, '']} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-1.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-xs text-gray-400">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: d.color }} />
            <span>{d.name}</span>
            <span className="ml-auto font-semibold text-white">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/reports/summary`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 403 ? 'Brak dostępu — wymagana rola admina.' : 'Błąd ładowania raportów.');
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mr-3 h-5 w-5 animate-spin">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        Generowanie raportów…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-400">
        {error || 'Nie udało się załadować raportów.'}
      </div>
    );
  }

  const { users, videos, activity } = data;

  const rolePie = Object.entries(users.byRole).map(([name, value]) => ({
    name: { SUPERADMIN: 'Superadmin', ADMIN: 'Admin', USER: 'Użytkownik' }[name] ?? name,
    value,
    color: ROLE_COLORS[name] ?? CHART_COLORS.gray,
  }));

  const sourcePie = Object.entries(videos.bySourceType).map(([name, value]) => ({
    name: { FILE: 'Plik', YOUTUBE: 'YouTube', STREAM: 'Stream' }[name] ?? name,
    value,
    color: SOURCE_COLORS[name] ?? CHART_COLORS.gray,
  }));

  const approvalPie = Object.entries(videos.byApprovalStatus).map(([name, value]) => ({
    name: { APPROVED: 'Zatwierdzone', PENDING: 'Oczekuje', REJECTED: 'Odrzucone' }[name] ?? name,
    value,
    color: APPROVAL_COLORS[name] ?? CHART_COLORS.gray,
  }));

  const actionBars = activity.byAction.map((a) => ({
    name: ACTION_LABELS[a.action] ?? a.action,
    count: a.count,
  })).sort((a, b) => a.count - b.count);

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Raporty</h1>
          <p className="mt-0.5 text-sm text-gray-500">Analityka systemu — ostatnie 30 dni</p>
        </div>
        <button
          onClick={() => { setLoading(true); setData(null); fetch(`${API}/reports/summary`, { credentials: 'include' }).then(r => r.json()).then(setData).finally(() => setLoading(false)); }}
          className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-400 transition hover:border-gray-600 hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Odśwież
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Użytkownicy" value={users.total} sub={`${users.pendingApproval} oczekuje`} color="blue" />
        <StatCard label="Nagrania" value={videos.total} sub={formatBytes(videos.totalSizeBytes)} color="amber" />
        <StatCard label="Zdarzenia" value={activity.totalLogs} sub="łącznie w logach" color="purple" />
        <StatCard label="Błędy logowania" value={activity.failedLogins7Days} sub="ostatnie 7 dni" color="red" />
      </div>

      {/* ── Users ── */}
      <div className="space-y-4">
        <SectionTitle>Użytkownicy</SectionTitle>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartCard title="Rejestracje — ostatnie 30 dni">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={users.registrationsLast30Days} barSize={8}>
                  <CartesianGrid strokeDasharray="3 3" className={GRID} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS_TICK} tickLine={false} axisLine={false} interval={4} />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={shortDate} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="count" name="Rejestracje" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <ChartCard title="Rozkład ról">
            <SimplePie data={rolePie} />
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-gray-800 pt-4">
              <div className="text-center">
                <p className="text-xl font-black text-white">{users.withMfa}</p>
                <p className="text-xs text-gray-500">z MFA</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-black text-amber-400">{users.pendingApproval}</p>
                <p className="text-xs text-gray-500">oczekuje</p>
              </div>
            </div>
          </ChartCard>
        </div>
      </div>

      {/* ── Videos ── */}
      <div className="space-y-4">
        <SectionTitle>Nagrania</SectionTitle>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartCard title="Uploady — ostatnie 30 dni">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={videos.uploadsLast30Days} barSize={8}>
                  <CartesianGrid strokeDasharray="3 3" className={GRID} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS_TICK} tickLine={false} axisLine={false} interval={4} />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={shortDate} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="count" name="Nagrania" fill={CHART_COLORS.amber} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <div className="flex flex-col gap-4">
            <ChartCard title="Źródło nagrań">
              <SimplePie data={sourcePie} />
            </ChartCard>
            <ChartCard title="Status zatwierdzenia">
              <SimplePie data={approvalPie} />
            </ChartCard>
          </div>
        </div>
      </div>

      {/* ── Activity ── */}
      <div className="space-y-4">
        <SectionTitle>Aktywność systemu</SectionTitle>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="Zdarzenia systemowe — ostatnie 30 dni">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={activity.last30Days}>
                <defs>
                  <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={CHART_COLORS.purple} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.purple} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className={GRID} vertical={false} />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS_TICK} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={shortDate} cursor={{ stroke: CHART_COLORS.purple, strokeWidth: 1 }} />
                <Area type="monotone" dataKey="count" name="Zdarzenia" stroke={CHART_COLORS.purple} fill="url(#actGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top 10 akcji">
            {actionBars.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-600">Brak danych</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={actionBars} layout="vertical" barSize={10}>
                  <CartesianGrid strokeDasharray="3 3" className={GRID} horizontal={false} />
                  <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} width={110} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="count" name="Liczba" fill={CHART_COLORS.amber} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

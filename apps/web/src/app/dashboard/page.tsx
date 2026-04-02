'use client';

import { useEffect, useState } from 'react';

interface StatCard {
  label: string;
  value: string;
  sub: string;
  trend: 'up' | 'down' | 'neutral';
  color: string;
  icon: React.ReactNode;
}

const alertsData = [
  { id: 1, location: 'Przejazd A-14 · Warszawa Zachodnia', type: 'Awaria sygnalizacji', time: '2 min temu', severity: 'high' },
  { id: 2, location: 'Przejazd B-07 · Kraków Główny', type: 'Brak obrazu z kamery', time: '18 min temu', severity: 'medium' },
  { id: 3, location: 'Przejazd C-22 · Gdańsk Wrzeszcz', type: 'Opóźnienie rogatki', time: '41 min temu', severity: 'low' },
];

const crossingsData = [
  { id: 'A-14', name: 'Warszawa Zachodnia', status: 'alert', lastCheck: '1 min temu', trains: 142 },
  { id: 'B-07', name: 'Kraków Główny', status: 'warning', lastCheck: '3 min temu', trains: 98 },
  { id: 'C-22', name: 'Gdańsk Wrzeszcz', status: 'ok', lastCheck: '2 min temu', trains: 67 },
  { id: 'D-03', name: 'Wrocław Główny', status: 'ok', lastCheck: '1 min temu', trains: 211 },
  { id: 'E-11', name: 'Poznań Główny', status: 'ok', lastCheck: '4 min temu', trains: 88 },
];

const statusConfig = {
  ok:      { label: 'Aktywny',    dot: 'bg-green-400',  badge: 'bg-green-500/10 text-green-400 border-green-500/20' },
  warning: { label: 'Ostrzeżenie', dot: 'bg-amber-400',  badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  alert:   { label: 'Awaria',     dot: 'bg-red-400',    badge: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

const severityConfig = {
  high:   { bar: 'bg-red-500',   label: 'Krytyczny', text: 'text-red-400' },
  medium: { bar: 'bg-amber-500', label: 'Ważny',     text: 'text-amber-400' },
  low:    { bar: 'bg-blue-500',  label: 'Niski',     text: 'text-blue-400' },
};

export default function DashboardPage() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const stats: StatCard[] = [
    {
      label: 'Aktywne przejazdy',
      value: '247',
      sub: '+3 od ostatniej godz.',
      trend: 'up',
      color: 'from-amber-500/20 to-transparent border-amber-500/20',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-6 w-6 text-amber-400">
          <path d="M4 12h16M4 12l3-3m-3 3 3 3" />
          <circle cx="19" cy="12" r="2" />
          <path d="M12 5v14" strokeDasharray="2 2" />
        </svg>
      ),
    },
    {
      label: 'Aktywne alerty',
      value: '3',
      sub: '↓ 2 mniej niż wczoraj',
      trend: 'down',
      color: 'from-red-500/20 to-transparent border-red-500/20',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-6 w-6 text-red-400">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
    {
      label: 'Dostępność systemu',
      value: '99.8%',
      sub: 'Ostatnie 30 dni',
      trend: 'neutral',
      color: 'from-green-500/20 to-transparent border-green-500/20',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-6 w-6 text-green-400">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      ),
    },
    {
      label: 'Pociągi dziś',
      value: '1 847',
      sub: '+12% vs. poprzedni tydzień',
      trend: 'up',
      color: 'from-blue-500/20 to-transparent border-blue-500/20',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-6 w-6 text-blue-400">
          <rect x="4" y="3" width="16" height="12" rx="2" />
          <path d="M4 11h16M8 3v8M16 3v8" />
          <path d="M8 19l-2 2M16 19l2 2M8 19h8" />
        </svg>
      ),
    },
  ];

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
        <button className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-300 transition hover:border-gray-600 hover:text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Odśwież
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${stat.color} bg-gray-900 p-5`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold text-white">{stat.value}</p>
                <p className="mt-1 text-xs text-gray-500">{stat.sub}</p>
              </div>
              <div className="rounded-lg bg-gray-800/80 p-2">{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-800 bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
            <h2 className="text-sm font-semibold text-white">Aktywne alerty</h2>
            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-bold text-red-400">3</span>
          </div>
          <ul className="divide-y divide-gray-800">
            {alertsData.map((alert) => {
              const s = severityConfig[alert.severity as keyof typeof severityConfig];
              return (
                <li key={alert.id} className="flex items-start gap-4 px-5 py-4">
                  <div className={`mt-1 h-2 w-1 flex-none rounded-full ${s.bar}`} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-white">{alert.location}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{alert.type}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-semibold uppercase ${s.text}`}>{s.label}</span>
                    <span className="text-xs text-gray-600">{alert.time}</span>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-gray-800 px-5 py-3">
            <button className="text-xs font-medium text-amber-400 hover:text-amber-300">
              Zobacz wszystkie alerty →
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
            <h2 className="text-sm font-semibold text-white">Status przejazdów</h2>
            <span className="text-xs text-gray-500">247 aktywnych</span>
          </div>
          <ul className="divide-y divide-gray-800">
            {crossingsData.map((c) => {
              const s = statusConfig[c.status as keyof typeof statusConfig];
              return (
                <li key={c.id} className="flex items-center gap-4 px-5 py-3.5">
                  <span className="w-10 text-xs font-mono font-semibold text-gray-400">{c.id}</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-white">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.trains} pociągów · {c.lastCheck}</p>
                  </div>
                  <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${s.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${c.status === 'ok' ? 'animate-pulse' : ''}`} />
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-gray-800 px-5 py-3">
            <button className="text-xs font-medium text-amber-400 hover:text-amber-300">
              Wszystkie przejazdy →
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Aktywność przejazdów — ostatnie 24h</h2>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" />Przejazdy</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-400" />Alerty</span>
          </div>
        </div>
        <div className="flex h-28 items-end gap-1.5">
          {[42,58,35,71,63,48,55,80,92,76,68,84,95,88,74,91,87,79,65,72,58,69,77,83].map((val, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-amber-500/30 transition-all hover:bg-amber-500/50"
                style={{ height: `${val}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-gray-600">
          <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
        </div>
      </div>
    </div>
  );
}

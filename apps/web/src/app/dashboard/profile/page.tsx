'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? '/api';

interface Me {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  approvalStatus: string;
  mfaEnabled: boolean;
  createdAt?: string;
}

interface RecentLog {
  id: string;
  action: string;
  message: string;
  ipAddress: string | null;
  createdAt: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pl-PL', { dateStyle: 'medium', timeStyle: 'short' });
}

function Avatar({ name, avatarUrl, size = 'lg' }: { name: string | null; avatarUrl: string | null; size?: 'sm' | 'lg' }) {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = name ? name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() : '?';
  const cls = size === 'lg' ? 'h-20 w-20 text-2xl' : 'h-10 w-10 text-sm';

  if (avatarUrl && !imgFailed) {
    return (
      <img
        src={avatarUrl}
        alt="avatar"
        onError={() => setImgFailed(true)}
        className={`${cls} rounded-full object-cover ring-2 ring-amber-500/40`}
      />
    );
  }
  return (
    <span className={`${cls} flex items-center justify-center rounded-full bg-amber-500/20 font-bold text-amber-400 ring-2 ring-amber-500/40`}>
      {initials}
    </span>
  );
}

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: 'Superadmin',
  ADMIN: 'Administrator',
  USER: 'Operator',
};

const LOG_ACTION_LABELS: Record<string, { label: string; color: string }> = {
  LOGOWANIE:       { label: 'Logowanie', color: 'text-green-400' },
  LOGOWANIE_OAUTH: { label: 'Logowanie OAuth', color: 'text-green-400' },
  WYLOGOWANIE:      { label: 'Wylogowanie', color: 'text-gray-400' },
  LOGOWANIE_NIEUDANE:     { label: 'Błędne logowanie', color: 'text-red-400' },
  OTP_WERYFIKACJA_OK: { label: 'Logowanie OTP', color: 'text-green-400' },
  OTP_KOD_BLEDNY:  { label: 'Błędny kod OTP', color: 'text-red-400' },
};

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [form, setForm] = useState({ name: '', avatarUrl: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/auth/me`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((data: Me | null) => {
        if (!data) { router.replace('/login'); return; }
        setMe(data);
        setForm({ name: data.name ?? '', avatarUrl: data.avatarUrl ?? '' });
      });

    fetch(`${API}/logs?limit=10`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : [])
      .then((logs: RecentLog[]) => {
        setRecentLogs(logs.filter((l) =>
          ['LOGOWANIE', 'LOGOWANIE_OAUTH', 'WYLOGOWANIE', 'LOGOWANIE_NIEUDANE', 'OTP_WERYFIKACJA_OK', 'OTP_KOD_BLEDNY'].includes(l.action)
        ).slice(0, 5));
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`${API}/auth/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name || undefined,
          avatarUrl: form.avatarUrl || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(Array.isArray(d.message) ? d.message.join(', ') : (d.message ?? 'Błąd zapisu'));
        return;
      }
      const updated = await res.json();
      setMe((m) => m ? { ...m, ...updated } : m);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  if (!me) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mr-3 h-5 w-5 animate-spin">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        Ładowanie profilu…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-bold text-white">Profil</h1>
        <p className="mt-0.5 text-sm text-gray-500">Zarządzaj swoimi danymi i ustawieniami konta</p>
      </div>


      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <div className="flex items-center gap-5">
          <Avatar name={form.name || me.name} avatarUrl={form.avatarUrl || me.avatarUrl} />
          <div>
            <p className="text-lg font-semibold text-white">{me.name ?? me.email}</p>
            <p className="text-sm text-gray-500">{me.email}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400">
                {ROLE_LABELS[me.role] ?? me.role}
              </span>
              {me.mfaEnabled && (
                <span className="rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-green-400">
                  MFA aktywne
                </span>
              )}
              <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                me.approvalStatus === 'APPROVED'
                  ? 'border-green-500/20 bg-green-500/10 text-green-400'
                  : 'border-amber-500/20 bg-amber-500/10 text-amber-400'
              }`}>
                {me.approvalStatus === 'APPROVED' ? 'Konto aktywne' : 'Oczekuje aktywacji'}
              </span>
            </div>
          </div>
        </div>
      </div>


      <form onSubmit={handleSave} className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-5">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500">Edytuj dane</h2>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-400">Imię i nazwisko</label>
          <input
            type="text"
            placeholder="np. Jan Kowalski"
            value={form.name}
            maxLength={100}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-600 focus:border-amber-400"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-400">URL avatara (opcjonalnie)</label>
          <input
            type="text"
            placeholder="https://example.com/avatar.jpg"
            value={form.avatarUrl}
            onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-600 focus:border-amber-400"
          />
          {form.avatarUrl && (
            <div className="mt-2 flex items-center gap-3">
              <span className="text-xs text-gray-500">Podgląd:</span>
              <img
                src={form.avatarUrl}
                alt="podgląd avatara"
                onError={(e) => (e.currentTarget.style.display = 'none')}
                className="h-10 w-10 rounded-full object-cover border border-gray-700"
              />
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
        )}
        {saved && (
          <p className="rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-xs text-green-400">
            Profil zaktualizowany pomyślnie.
          </p>
        )}

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => router.push('/dashboard/settings')}
            className="text-xs text-gray-500 hover:text-amber-400 transition-colors"
          >
            Ustawienia bezpieczeństwa (MFA) →
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-50"
          >
            {saving ? 'Zapisywanie…' : 'Zapisz zmiany'}
          </button>
        </div>
      </form>


      {recentLogs.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500">Ostatnia aktywność konta</h2>
          <div className="divide-y divide-gray-800">
            {recentLogs.map((log) => {
              const meta = LOG_ACTION_LABELS[log.action];
              return (
                <div key={log.id} className="flex items-center justify-between py-2.5 text-xs">
                  <span className={`font-medium ${meta?.color ?? 'text-gray-400'}`}>
                    {meta?.label ?? log.action}
                  </span>
                  <div className="flex items-center gap-3 text-gray-600">
                    {log.ipAddress && <span className="font-mono">{log.ipAddress}</span>}
                    <span>{formatDate(log.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

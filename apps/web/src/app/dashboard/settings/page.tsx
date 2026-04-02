'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? '/api';

type MfaSetup = { secret: string; qrCodeDataUrl: string };

export default function SettingsPage() {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [setup, setSetup] = useState<MfaSetup | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/auth/me`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setMfaEnabled(d.mfaEnabled ?? false))
      .catch(() => {});
  }, []);

  async function startSetup() {
    setError(''); setSuccess('');
    const res = await fetch(`${API}/auth/mfa/setup`, { credentials: 'include' });
    if (!res.ok) { setError('Błąd generowania kodu'); return; }
    setSetup(await res.json());
    setCode('');
  }

  async function handleEnable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/auth/mfa/enable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.message ?? 'Nieprawidłowy kod'); return; }
      setMfaEnabled(true); setSetup(null); setCode('');
      setSuccess('Weryfikacja dwuetapowa została włączona.');
    } catch { setError('Błąd połączenia'); }
    finally { setLoading(false); }
  }

  async function handleDisable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/auth/mfa/disable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.message ?? 'Nieprawidłowy kod'); return; }
      setMfaEnabled(false); setCode('');
      setSuccess('Weryfikacja dwuetapowa została wyłączona.');
    } catch { setError('Błąd połączenia'); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Ustawienia</h1>
        <p className="mt-0.5 text-sm text-gray-500">Zarządzaj bezpieczeństwem swojego konta</p>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5 text-amber-400">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                <circle cx="12" cy="16" r="1" fill="currentColor" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Weryfikacja dwuetapowa (2FA)</p>
              <p className="text-xs text-gray-500">Google Authenticator, Authy lub inna aplikacja TOTP</p>
            </div>
          </div>
          <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
            mfaEnabled
              ? 'border-green-500/20 bg-green-500/10 text-green-400'
              : 'border-gray-700 bg-gray-800 text-gray-400'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${mfaEnabled ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
            {mfaEnabled ? 'Aktywna' : 'Nieaktywna'}
          </span>
        </div>

        <div className="px-6 py-5">
          {success && (
            <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
              {success}
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {!mfaEnabled && !setup && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Weryfikacja dwuetapowa dodaje dodatkową warstwę ochrony. Po włączeniu, każde logowanie będzie wymagać podania kodu z aplikacji.
              </p>
              <button
                onClick={startSetup}
                className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Włącz weryfikację dwuetapową
              </button>
            </div>
          )}

          {!mfaEnabled && setup && (
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-sm font-medium text-white">1. Zeskanuj kod QR</p>
                <p className="text-xs text-gray-500">Otwórz Google Authenticator lub Authy i zeskanuj poniższy kod QR.</p>
                <div className="inline-block rounded-xl border border-gray-700 bg-white p-3">
                  <img src={setup.qrCodeDataUrl} alt="QR code MFA" className="h-40 w-40" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Lub wprowadź klucz ręcznie:</p>
                <code className="block rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-sm tracking-widest text-amber-400">
                  {setup.secret}
                </code>
              </div>
              <form onSubmit={handleEnable} className="space-y-3">
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-white">2. Potwierdź kodem</p>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className="w-40 rounded-xl border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-center font-mono text-lg tracking-widest text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-50"
                  >
                    {loading ? 'Weryfikacja…' : 'Aktywuj 2FA'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSetup(null); setError(''); }}
                    className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 transition hover:border-gray-600 hover:text-white"
                  >
                    Anuluj
                  </button>
                </div>
              </form>
            </div>
          )}

          {mfaEnabled && (
            <form onSubmit={handleDisable} className="space-y-4">
              <p className="text-sm text-gray-400">
                Aby wyłączyć weryfikację dwuetapową, podaj aktualny kod z aplikacji.
              </p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white">Kod weryfikacyjny</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="w-40 rounded-xl border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-center font-mono text-lg tracking-widest text-white outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-400/20"
                />
              </div>
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
              >
                {loading ? 'Wyłączanie…' : 'Wyłącz weryfikację dwuetapową'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

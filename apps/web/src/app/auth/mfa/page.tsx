'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? '/api';

export default function MfaPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/mfa/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? 'Nieprawidłowy kod');
        setCode('');
        inputRef.current?.focus();
        return;
      }
      router.replace('/dashboard');
    } catch {
      setError('Błąd połączenia');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-black">
              <path d="M4 12h16M4 12l3-3m-3 3 3 3" />
              <circle cx="19" cy="12" r="2" />
              <path d="M12 5v14" strokeDasharray="2 2" />
            </svg>
          </div>
          <span className="text-lg font-bold text-white">
            railcross<span className="text-amber-400">-watch</span>
          </span>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8">
          <div className="mb-6 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-7 w-7 text-amber-400">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                <circle cx="12" cy="16" r="1" fill="currentColor" />
              </svg>
            </div>
          </div>

          <h1 className="mb-1 text-center text-lg font-bold text-white">Weryfikacja dwuetapowa</h1>
          <p className="mb-6 text-center text-sm text-gray-500">
            Podaj 6-cyfrowy kod z aplikacji<br />Microsoft Authenticator lub Authy.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
            />

            {error && (
              <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-center text-sm text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-50"
            >
              {loading ? 'Weryfikacja…' : 'Potwierdź'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-gray-600">
            Kod jest ważny przez 30 sekund
          </p>
        </div>
      </div>
    </main>
  );
}

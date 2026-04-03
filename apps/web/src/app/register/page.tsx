'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? '/api';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name || undefined, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? 'Nie udało się utworzyć konta');
        return;
      }

      router.replace('/login?registered=1');
    } catch {
      setError('Błąd połączenia');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 px-6 py-12 text-white">
      <div className="mx-auto flex max-w-5xl overflow-hidden rounded-[32px] border border-white/10 bg-gray-900 shadow-2xl shadow-black/30">
        <section className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-gray-950 via-gray-900 to-amber-950/40 p-10 lg:flex">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Dostęp do systemu wymaga zatwierdzenia
            </div>
            <h1 className="mt-8 text-4xl font-bold tracking-tight">Załóż konto operatora</h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-gray-400">
              Po rejestracji konto trafia do weryfikacji. Administrator musi je zaakceptować, zanim logowanie zostanie odblokowane.
            </p>
          </div>

          <div className="space-y-4 text-sm text-gray-300">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              1. Wypełnij formularz rejestracyjny.
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              2. Administrator zatwierdzi konto w panelu użytkowników.
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              3. Po akceptacji możesz zalogować się i skonfigurować MFA.
            </div>
          </div>
        </section>

        <section className="w-full bg-gray-50 px-6 py-10 text-gray-900 lg:w-1/2 lg:px-10">
          <div className="mx-auto max-w-md">
            <a href="/login" className="text-sm font-medium text-amber-700 hover:text-amber-800">
              ← Wróć do logowania
            </a>

            <div className="mt-8">
              <h2 className="text-3xl font-bold tracking-tight">Rejestracja</h2>
              <p className="mt-2 text-sm text-gray-500">
                Utworzone konto będzie oczekiwać na akceptację administratora.
              </p>
            </div>

            <form onSubmit={handleRegister} className="mt-8 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Imię i nazwisko
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jan Kowalski"
                  className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-amber-400 focus:ring-3 focus:ring-amber-100"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ty@us.edu.pl"
                  className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-amber-400 focus:ring-3 focus:ring-amber-100"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Hasło
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 znaków"
                  className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-amber-400 focus:ring-3 focus:ring-amber-100"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-amber-400 px-4 py-3 text-sm font-semibold text-gray-950 transition hover:bg-amber-300 active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? 'Tworzenie konta…' : 'Utwórz konto'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

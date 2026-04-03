'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? '/api';

type PendingUser = {
  id: string;
  email: string;
  name: string | null;
  role: 'SUPERADMIN' | 'ADMIN' | 'USER';
  createdAt: string;
};

type ApprovedUser = {
  id: string;
  email: string;
  name: string | null;
  role: 'SUPERADMIN' | 'ADMIN' | 'USER';
  approvedAt: string | null;
  blockedAt: string | null;
};

type Me = {
  id: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'USER';
};

export default function UsersPage() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'blocked'>('all');
  const [query, setQuery] = useState('');
  const [me, setMe] = useState<Me | null>(null);
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<ApprovedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    setError('');

    try {
      const meRes = await fetch(`${API}/auth/me`, { credentials: 'include' });
      if (!meRes.ok) {
        setError('Brak dostępu do danych użytkownika');
        setUsers([]);
        setApprovedUsers([]);
        return;
      }

      const meData = await meRes.json();
      setMe(meData);

      const [pendingRes, approvedRes] = await Promise.all([
        fetch(`${API}/auth/admin/pending-users`, { credentials: 'include' }),
        fetch(`${API}/auth/admin/users`, { credentials: 'include' }),
      ]);

      if (!pendingRes.ok || !approvedRes.ok) {
        const data = await pendingRes.json().catch(() => null);
        setError(data?.message ?? 'Brak dostępu do listy użytkowników');
        setUsers([]);
        setApprovedUsers([]);
        return;
      }

      setUsers(await pendingRes.json());
      setApprovedUsers(await approvedRes.json());
    } catch {
      setError('Błąd połączenia');
      setUsers([]);
      setApprovedUsers([]);
    } finally {
      setLoading(false);
    }
  }

  async function approveUser(userId: string) {
    setProcessingId(userId);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API}/auth/admin/users/${userId}/approve`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? 'Nie udało się zaakceptować użytkownika');
        return;
      }

      setUsers((current) => current.filter((user) => user.id !== userId));
      await fetchAll();
      setSuccess('Użytkownik został zaakceptowany i może się zalogować jako zwykły użytkownik.');
    } catch {
      setError('Błąd połączenia');
    } finally {
      setProcessingId(null);
    }
  }

  async function grantAdmin(userId: string) {
    setProcessingId(userId);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API}/auth/superadmin/users/${userId}/grant-admin`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? 'Nie udało się nadać roli administratora');
        return;
      }

      setApprovedUsers((current) =>
        current.map((user) => (user.id === userId ? { ...user, role: 'ADMIN' } : user)),
      );
      setSuccess('Rola administratora została nadana.');
    } catch {
      setError('Błąd połączenia');
    } finally {
      setProcessingId(null);
    }
  }

  async function toggleBlock(userId: string, blocked: boolean) {
    setProcessingId(userId);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API}/auth/admin/users/${userId}/${blocked ? 'unblock' : 'block'}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? 'Nie udało się zmienić statusu blokady');
        return;
      }

      setApprovedUsers((current) =>
        current.map((user) =>
          user.id === userId
            ? { ...user, blockedAt: blocked ? null : new Date().toISOString() }
            : user,
        ),
      );
      setSuccess(blocked ? 'Konto zostało odblokowane.' : 'Konto zostało zablokowane.');
    } catch {
      setError('Błąd połączenia');
    } finally {
      setProcessingId(null);
    }
  }

  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = (user: { email: string; name: string | null }) =>
    !normalizedQuery ||
    user.email.toLowerCase().includes(normalizedQuery) ||
    (user.name ?? '').toLowerCase().includes(normalizedQuery);

  const visiblePendingUsers =
    filter === 'all' || filter === 'pending'
      ? users.filter(matchesQuery)
      : [];
  const visibleApprovedUsers = approvedUsers.filter((user) => {
    if (!matchesQuery(user)) return false;
    if (filter === 'all') return true;
    if (filter === 'active') return !user.blockedAt;
    if (filter === 'blocked') return Boolean(user.blockedAt);
    return false;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Akceptacja użytkowników</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Nowe konta pozostają zablokowane, dopóki administrator ich nie zaakceptuje.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'Wszystko' },
          { id: 'pending', label: 'Oczekujące' },
          { id: 'active', label: 'Aktywne' },
          { id: 'blocked', label: 'Zablokowane' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id as 'all' | 'pending' | 'active' | 'blocked')}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              filter === item.id
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="max-w-md">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj po emailu lub nazwie"
          className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
        />
      </div>

      {success && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          {success}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {(filter === 'all' || filter === 'pending') && (
      <div className="rounded-xl border border-gray-800 bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Konta oczekujące</h2>
          <button
            onClick={fetchAll}
            className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 transition hover:border-gray-600 hover:text-white"
          >
            Odśwież
          </button>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-sm text-gray-500">Ładowanie listy użytkowników…</div>
        ) : visiblePendingUsers.length === 0 ? (
          <div className="px-5 py-8 text-sm text-gray-500">Brak kont oczekujących na akceptację.</div>
        ) : (
          <ul className="divide-y divide-gray-800">
            {visiblePendingUsers.map((user) => (
              <li key={user.id} className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{user.name || 'Bez nazwy'}</p>
                  <p className="mt-1 text-sm text-gray-400">{user.email}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Rejestracja: {new Date(user.createdAt).toLocaleString('pl-PL')}
                  </p>
                </div>

                <button
                  onClick={() => approveUser(user.id)}
                  disabled={processingId === user.id}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-50"
                >
                  {processingId === user.id ? 'Akceptowanie…' : 'Akceptuj konto'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      )}

      {(filter === 'all' || filter === 'active' || filter === 'blocked') && (
      <div className="rounded-xl border border-gray-800 bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Aktywne konta</h2>
          {me?.role === 'SUPERADMIN' && (
            <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
              Superadmin może nadawać admina
            </span>
          )}
        </div>

        {loading ? (
          <div className="px-5 py-8 text-sm text-gray-500">Ładowanie listy użytkowników…</div>
        ) : visibleApprovedUsers.length === 0 ? (
          <div className="px-5 py-8 text-sm text-gray-500">
            {filter === 'blocked' ? 'Brak zablokowanych kont.' : 'Brak kont dla wybranego filtra.'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-800">
            {visibleApprovedUsers.map((user) => (
              <li key={user.id} className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{user.name || 'Bez nazwy'}</p>
                  <p className="mt-1 text-sm text-gray-400">{user.email}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Rola: {user.role} · Aktywacja: {user.approvedAt ? new Date(user.approvedAt).toLocaleString('pl-PL') : '—'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Status: {user.blockedAt ? 'Zablokowane' : 'Aktywne'}
                  </p>
                </div>

                <div className="flex flex-col gap-2 md:items-end">
                  {me?.role === 'SUPERADMIN' && user.role === 'USER' && (
                    <button
                      onClick={() => grantAdmin(user.id)}
                      disabled={processingId === user.id || Boolean(user.blockedAt)}
                      className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-400 transition hover:bg-amber-500/20 disabled:opacity-50"
                    >
                      {processingId === user.id ? 'Nadawanie…' : 'Nadaj admina'}
                    </button>
                  )}

                  {user.role !== 'SUPERADMIN' && (
                    <button
                      onClick={() => toggleBlock(user.id, Boolean(user.blockedAt))}
                      disabled={processingId === user.id || (me?.role === 'ADMIN' && user.role !== 'USER')}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                        user.blockedAt
                          ? 'border border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                          : 'border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                      }`}
                    >
                      {processingId === user.id ? 'Zapisywanie…' : user.blockedAt ? 'Odblokuj konto' : 'Zablokuj konto'}
                    </button>
                  )}

                  {user.role === 'SUPERADMIN' && (
                    <span className="text-xs text-gray-500">Konto nadrzędne</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      )}
    </div>
  );
}

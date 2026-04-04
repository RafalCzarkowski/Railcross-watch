'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? '/api';

type Role = 'SUPERADMIN' | 'ADMIN' | 'USER';

type PendingUser = { id: string; email: string; name: string | null; role: Role; createdAt: string; };
type ApprovedUser = { id: string; email: string; name: string | null; role: Role; approvedAt: string | null; blockedAt: string | null; };
type Me = { id: string; role: Role; };

function RoleBadge({ role }: { role: Role }) {
  const cfg: Record<Role, string> = {
    SUPERADMIN: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    ADMIN:      'text-amber-400  bg-amber-500/10  border-amber-500/20',
    USER:       'text-gray-400   bg-gray-700/40   border-gray-700',
  };
  const label: Record<Role, string> = { SUPERADMIN: 'Superadmin', ADMIN: 'Admin', USER: 'Użytkownik' };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg[role]}`}>
      {label[role]}
    </span>
  );
}

interface ConfirmModal {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export default function UsersPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'blocked'>('all');
  const [query, setQuery] = useState('');
  const [me, setMe] = useState<Me | null>(null);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<ApprovedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmModal | null>(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    setError('');
    try {
      const meRes = await fetch(`${API}/auth/me`, { credentials: 'include' });
      if (!meRes.ok) { setError('Brak dostępu'); return; }
      const meData = await meRes.json();
      setMe(meData);

      const [pendingRes, approvedRes] = await Promise.all([
        fetch(`${API}/auth/admin/pending-users`, { credentials: 'include' }),
        fetch(`${API}/auth/admin/users`, { credentials: 'include' }),
      ]);
      if (!pendingRes.ok || !approvedRes.ok) { setError('Brak dostępu do listy użytkowników'); return; }
      setPendingUsers(await pendingRes.json());
      setApprovedUsers(await approvedRes.json());
    } catch {
      setError('Błąd połączenia');
    } finally {
      setLoading(false);
    }
  }

  function showSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  }

  async function approveUser(userId: string) {
    setProcessingId(userId);
    setError('');
    try {
      const res = await fetch(`${API}/auth/admin/users/${userId}/approve`, { method: 'POST', credentials: 'include' });
      if (!res.ok) { const d = await res.json().catch(() => null); setError(d?.message ?? 'Błąd'); return; }
      await fetchAll();
      showSuccess('Konto zostało zaakceptowane.');
    } catch { setError('Błąd połączenia'); } finally { setProcessingId(null); }
  }

  async function doGrantAdmin(userId: string) {
    setProcessingId(userId);
    setError('');
    try {
      const res = await fetch(`${API}/auth/superadmin/users/${userId}/grant-admin`, { method: 'POST', credentials: 'include' });
      if (!res.ok) { const d = await res.json().catch(() => null); setError(d?.message ?? 'Błąd'); return; }
      setApprovedUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: 'ADMIN' } : u));
      showSuccess('Rola administratora została nadana.');
    } catch { setError('Błąd połączenia'); } finally { setProcessingId(null); }
  }

  async function doRevokeAdmin(userId: string, isSelf: boolean) {
    setProcessingId(userId);
    setError('');
    try {
      const res = await fetch(`${API}/auth/superadmin/users/${userId}/revoke-admin`, { method: 'POST', credentials: 'include' });
      if (!res.ok) { const d = await res.json().catch(() => null); setError(d?.message ?? 'Błąd'); return; }
      setApprovedUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: 'USER' } : u));
      showSuccess('Rola administratora została cofnięta.');
      if (isSelf) {
        await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
        router.replace('/login');
      }
    } catch { setError('Błąd połączenia'); } finally { setProcessingId(null); }
  }

  function grantAdmin(userId: string) {
    doGrantAdmin(userId);
  }

  function revokeAdmin(userId: string, email: string) {
    const isSelf = userId === me?.id;
    if (isSelf) {
      setConfirm({
        title: 'Cofnąć własną rolę admina?',
        message: `Zamierzasz cofnąć sobie rolę administratora. Po potwierdzeniu Twoja sesja zostanie zakończona i będziesz musiał zalogować się ponownie jako zwykły użytkownik.`,
        confirmLabel: 'Tak, cofnij i wyloguj',
        onConfirm: () => { setConfirm(null); doRevokeAdmin(userId, true); },
      });
    } else {
      setConfirm({
        title: 'Cofnąć rolę admina?',
        message: `Użytkownik ${email} straci uprawnienia administratora i wróci do roli zwykłego użytkownika.`,
        confirmLabel: 'Cofnij uprawnienia',
        onConfirm: () => { setConfirm(null); doRevokeAdmin(userId, false); },
      });
    }
  }

  async function toggleBlock(userId: string, blocked: boolean) {
    setProcessingId(userId);
    setError('');
    try {
      const res = await fetch(`${API}/auth/admin/users/${userId}/${blocked ? 'unblock' : 'block'}`, { method: 'POST', credentials: 'include' });
      if (!res.ok) { const d = await res.json().catch(() => null); setError(d?.message ?? 'Błąd'); return; }
      setApprovedUsers((prev) => prev.map((u) => u.id === userId ? { ...u, blockedAt: blocked ? null : new Date().toISOString() } : u));
      showSuccess(blocked ? 'Konto zostało odblokowane.' : 'Konto zostało zablokowane.');
    } catch { setError('Błąd połączenia'); } finally { setProcessingId(null); }
  }

  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = (u: { email: string; name: string | null }) =>
    !normalizedQuery || u.email.toLowerCase().includes(normalizedQuery) || (u.name ?? '').toLowerCase().includes(normalizedQuery);

  const visiblePending = (filter === 'all' || filter === 'pending') ? pendingUsers.filter(matchesQuery) : [];
  const visibleApproved = approvedUsers.filter((u) => {
    if (!matchesQuery(u)) return false;
    if (filter === 'active') return !u.blockedAt;
    if (filter === 'blocked') return Boolean(u.blockedAt);
    return filter === 'all';
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Zarządzanie użytkownikami</h1>
        <p className="mt-0.5 text-sm text-gray-500">Akceptacja kont, zarządzanie rolami i blokady.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'pending', 'active', 'blocked'] as const).map((id) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              filter === id
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600 hover:text-white'
            }`}
          >
            {{ all: 'Wszystko', pending: 'Oczekujące', active: 'Aktywne', blocked: 'Zablokowane' }[id]}
          </button>
        ))}
      </div>

      <div className="max-w-md">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj po emailu lub nazwie…"
          className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
        />
      </div>

      {success && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">{success}</div>
      )}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {(filter === 'all' || filter === 'pending') && (
        <div className="rounded-xl border border-gray-800 bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
            <h2 className="text-sm font-semibold text-white">
              Konta oczekujące
              {visiblePending.length > 0 && (
                <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">{visiblePending.length}</span>
              )}
            </h2>
            <button onClick={fetchAll} className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 transition hover:border-gray-600 hover:text-white">
              Odśwież
            </button>
          </div>
          {loading ? (
            <div className="px-5 py-8 text-sm text-gray-500">Ładowanie…</div>
          ) : visiblePending.length === 0 ? (
            <div className="px-5 py-8 text-sm text-gray-500">Brak kont oczekujących na akceptację.</div>
          ) : (
            <ul className="divide-y divide-gray-800">
              {visiblePending.map((user) => (
                <li key={user.id} className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{user.name || 'Bez nazwy'}</p>
                    <p className="mt-0.5 text-sm text-gray-400">{user.email}</p>
                    <p className="mt-1 text-xs text-gray-500">Rejestracja: {new Date(user.createdAt).toLocaleString('pl-PL')}</p>
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
          <div className="border-b border-gray-800 px-5 py-4">
            <h2 className="text-sm font-semibold text-white">Aktywne konta</h2>
          </div>
          {loading ? (
            <div className="px-5 py-8 text-sm text-gray-500">Ładowanie…</div>
          ) : visibleApproved.length === 0 ? (
            <div className="px-5 py-8 text-sm text-gray-500">
              {filter === 'blocked' ? 'Brak zablokowanych kont.' : 'Brak kont.'}
            </div>
          ) : (
            <ul className="divide-y divide-gray-800">
              {visibleApproved.map((user) => {
                const isSelf = user.id === me?.id;
                const isProcessing = processingId === user.id;
                return (
                  <li key={user.id} className={`flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between ${isSelf ? 'bg-amber-500/3' : ''}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white">{user.name || 'Bez nazwy'}</p>
                        <RoleBadge role={user.role} />
                        {isSelf && (
                          <span className="rounded-full bg-gray-700 px-2 py-0.5 text-[10px] font-semibold text-gray-400">Ty</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-gray-400">{user.email}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        Aktywacja: {user.approvedAt ? new Date(user.approvedAt).toLocaleString('pl-PL') : '—'}
                        {user.blockedAt && <span className="ml-2 text-red-400">· Zablokowane</span>}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 md:justify-end">
                      {me?.role === 'SUPERADMIN' && user.role === 'USER' && !user.blockedAt && (
                        <button
                          onClick={() => grantAdmin(user.id)}
                          disabled={isProcessing}
                          className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 transition hover:bg-amber-500/20 disabled:opacity-50"
                        >
                          {isProcessing ? '…' : 'Nadaj admina'}
                        </button>
                      )}

                      {me?.role === 'SUPERADMIN' && user.role === 'ADMIN' && (
                        <button
                          onClick={() => revokeAdmin(user.id, user.email)}
                          disabled={isProcessing}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                            isSelf
                              ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                              : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500 hover:text-white'
                          }`}
                        >
                          {isProcessing ? '…' : isSelf ? 'Cofnij własnego admina' : 'Cofnij admina'}
                        </button>
                      )}

                      {user.role !== 'SUPERADMIN' && (
                        <button
                          onClick={() => toggleBlock(user.id, Boolean(user.blockedAt))}
                          disabled={isProcessing || (me?.role === 'ADMIN' && user.role !== 'USER')}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                            user.blockedAt
                              ? 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                              : 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                          }`}
                        >
                          {isProcessing ? '…' : user.blockedAt ? 'Odblokuj' : 'Zablokuj'}
                        </button>
                      )}

                      {user.role === 'SUPERADMIN' && !isSelf && (
                        <span className="text-xs text-gray-600">Konto nadrzędne</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <h3 className="mb-2 text-base font-bold text-white">{confirm.title}</h3>
            <p className="mb-6 text-sm text-gray-400">{confirm.message}</p>
            <div className="flex gap-3">
              <button
                onClick={confirm.onConfirm}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white transition hover:bg-red-400"
              >
                {confirm.confirmLabel}
              </button>
              <button
                onClick={() => setConfirm(null)}
                className="rounded-xl border border-gray-700 px-5 py-2.5 text-sm text-gray-400 transition hover:border-gray-600 hover:text-white"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
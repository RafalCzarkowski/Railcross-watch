'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? '/api';

type Role = 'SUPERADMIN' | 'ADMIN' | 'USER';

interface UploadedBy { id: string; name: string | null; email: string; }
interface Video {
  id: string;
  sourceType: 'FILE' | 'YOUTUBE' | 'STREAM';
  originalName: string | null;
  sourceUrl: string | null;
  title: string | null;
  description: string | null;
  location: string | null;
  tags: string[];
  thumbnailPath: string | null;
  size: number | null;
  analysisStatus: string;
  approvalStatus: string;
  uploadedBy: UploadedBy;
  createdAt: string;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' });
}

const analysisConfig: Record<string, { label: string; color: string }> = {
  PENDING:    { label: 'Oczekuje',         color: 'text-gray-400 border-gray-700 bg-gray-800' },
  PROCESSING: { label: 'Analizuje',        color: 'text-amber-400 border-amber-500/20 bg-amber-500/10' },
  DONE:       { label: 'Przeanalizowano',  color: 'text-green-400 border-green-500/20 bg-green-500/10' },
  ERROR:      { label: 'Błąd',            color: 'text-red-400 border-red-500/20 bg-red-500/10' },
};

const approvalConfig: Record<string, { label: string; color: string }> = {
  PENDING:  { label: 'Oczekuje na zatwierdzenie', color: 'text-amber-400 border-amber-500/20 bg-amber-500/10' },
  APPROVED: { label: 'Zatwierdzone',               color: 'text-green-400 border-green-500/20 bg-green-500/10' },
  REJECTED: { label: 'Odrzucone',                  color: 'text-red-400 border-red-500/20 bg-red-500/10' },
};

function VideoThumbnail({ video }: { video: Video }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (video.sourceType === 'YOUTUBE' && video.sourceUrl) {
    return (
      <iframe
        src={video.sourceUrl}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full"
      />
    );
  }

  if (video.sourceType === 'FILE' && video.thumbnailPath && !imgFailed) {
    return (
      <img
        src={`${API}/videos/${video.id}/thumbnail`}
        alt="thumbnail"
        onError={() => setImgFailed(true)}
        className="h-full w-full object-cover"
      />
    );
  }

  if (video.sourceType === 'STREAM' && video.sourceUrl) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8 text-gray-600">
          <path d="M8 17l-5-5 5-5" /><path d="M16 17l5-5-5-5" /><line x1="12" y1="3" x2="12" y2="21" />
        </svg>
        <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20">Stream</span>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} className="h-12 w-12 text-gray-700">
        <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.89L15 14" />
        <rect x="1" y="6" width="15" height="12" rx="2" />
      </svg>
    </div>
  );
}

function TagChipInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('');

  function addTag(val: string) {
    const tag = val.trim().toLowerCase();
    if (tag && !tags.includes(tag)) onChange([...tags, tag]);
    setInput('');
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(input); }
    if (e.key === 'Backspace' && !input && tags.length > 0) onChange(tags.slice(0, -1));
  }

  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 focus-within:border-amber-400">
      {tags.map((t) => (
        <span key={t} className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400 border border-amber-500/20">
          {t}
          <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} className="hover:text-red-400">×</button>
        </span>
      ))}
      <input
        type="text"
        placeholder={tags.length === 0 ? 'Dodaj tag (Enter)' : ''}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        className="min-w-20 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-gray-600"
      />
    </div>
  );
}

const emptyEditForm = { title: '', description: '', location: '', tags: [] as string[] };
const emptyLinkForm = { url: '', sourceType: 'YOUTUBE' as 'YOUTUBE' | 'STREAM', title: '', description: '', location: '', tags: [] as string[] };

function isOperator(role: Role | null) {
  return role === 'ADMIN' || role === 'SUPERADMIN';
}

export default function VideosPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkForm, setLinkForm] = useState(emptyLinkForm);
  const [linkSaving, setLinkSaving] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [analysisStatusFilter, setAnalysisStatusFilter] = useState('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  async function loadVideos(params?: Record<string, string>) {
    const qs = params && Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`${API}/videos${qs}`, { credentials: 'include' });
    if (res.ok) setVideos(await res.json());
  }

  function buildFilterParams() {
    const params: Record<string, string> = {};
    if (search.trim().length >= 2) params.search = search.trim();
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    if (analysisStatusFilter) params.analysisStatus = analysisStatusFilter;
    if (sourceTypeFilter) params.sourceType = sourceTypeFilter;
    return params;
  }

  const activeFilterCount = [
    search.trim().length >= 2,
    !!dateFrom,
    !!dateTo,
    !!analysisStatusFilter,
    !!sourceTypeFilter,
  ].filter(Boolean).length;

  async function loadTags() {
    const res = await fetch(`${API}/videos/tags`, { credentials: 'include' });
    if (res.ok) setAllTags(await res.json());
  }

  useEffect(() => {
    fetch(`${API}/auth/me`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((me) => { if (me) { setRole(me.role); setMyId(me.id); } });
    loadTags();
  }, []);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      loadVideos(buildFilterParams());
    }, search ? 400 : 0);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, dateFrom, dateTo, analysisStatusFilter, sourceTypeFilter]);

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadProgress(0);
    const form = new FormData();
    form.append('file', file);
    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API}/videos/upload`);
      xhr.withCredentials = true;
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        setUploading(false);
        if (xhr.status < 300) {
          loadVideos(buildFilterParams());
          loadTags();
          if (!isOperator(role)) showSuccess('Nagranie zostało przesłane i oczekuje na zatwierdzenie przez administratora.');
        }
        resolve();
      };
      xhr.onerror = () => { setUploading(false); resolve(); };
      xhr.send(form);
    });
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  async function handleDelete(id: string) {
    if (!confirm('Usunąć ten film?')) return;
    await fetch(`${API}/videos/${id}`, { method: 'DELETE', credentials: 'include' });
    setVideos((v) => v.filter((x) => x.id !== id));
    setSelectedIds((s) => { const n = new Set(s); n.delete(id); return n; });
    loadTags();
  }

  async function handleApprove(id: string) {
    const res = await fetch(`${API}/videos/${id}/approve`, { method: 'PATCH', credentials: 'include' });
    if (res.ok) {
      const updated = await res.json();
      setVideos((v) => v.map((x) => (x.id === id ? updated : x)));
    }
  }

  async function handleReject(id: string) {
    if (!confirm('Odrzucić to nagranie?')) return;
    const res = await fetch(`${API}/videos/${id}/reject`, { method: 'PATCH', credentials: 'include' });
    if (res.ok) {
      const updated = await res.json();
      setVideos((v) => v.map((x) => (x.id === id ? updated : x)));
    }
  }

  function startEdit(video: Video) {
    setEditingId(video.id);
    setEditForm({ title: video.title ?? '', description: video.description ?? '', location: video.location ?? '', tags: video.tags ?? [] });
  }

  async function saveEdit(id: string) {
    const res = await fetch(`${API}/videos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      const updated = await res.json();
      setVideos((v) => v.map((x) => (x.id === id ? updated : x)));
      loadTags();
    }
    setEditingId(null);
  }

  async function handleAddLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLinkError('');
    setLinkSaving(true);
    try {
      const res = await fetch(`${API}/videos/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          url: linkForm.url,
          sourceType: linkForm.sourceType,
          title: linkForm.title || undefined,
          description: linkForm.description || undefined,
          location: linkForm.location || undefined,
          tags: linkForm.tags.length > 0 ? linkForm.tags : undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setLinkError(Array.isArray(d.message) ? d.message.join(', ') : (d.message ?? 'Błąd'));
        return;
      }
      setShowLinkModal(false);
      setLinkForm(emptyLinkForm);
      loadVideos(buildFilterParams());
      loadTags();
      if (!isOperator(role)) showSuccess('Link został dodany i oczekuje na zatwierdzenie przez administratora.');
    } finally {
      setLinkSaving(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredForBulk.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredForBulk.map((v) => v.id)));
    }
  }

  async function handleBulkAction(action: 'approve' | 'reject' | 'delete') {
    if (action === 'delete' && !confirm(`Usunąć ${selectedIds.size} nagrań?`)) return;
    setBulkLoading(true);
    try {
      const res = await fetch(`${API}/videos/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, ids: [...selectedIds] }),
      });
      if (res.ok) {
        const { succeeded, failed } = await res.json() as { succeeded: string[]; failed: string[] };
        const msg = action === 'approve'
          ? `Zatwierdzono ${succeeded.length} nagrań`
          : action === 'reject'
          ? `Odrzucono ${succeeded.length} nagrań`
          : `Usunięto ${succeeded.length} nagrań`;
        showSuccess(failed.length > 0 ? `${msg} (${failed.length} błędów)` : msg);
        setSelectedIds(new Set());
        setBulkMode(false);
        await loadVideos(buildFilterParams());
        loadTags();
      }
    } finally {
      setBulkLoading(false);
    }
  }

  const pendingVideos = videos.filter((v) => v.approvalStatus === 'PENDING');
  const displayVideos = isOperator(role) ? videos.filter((v) => v.approvalStatus !== 'PENDING') : videos;

  const filteredVideos = displayVideos.filter((v) => {
    if (tagFilter && !(v.tags ?? []).includes(tagFilter)) return false;
    if (locationFilter && v.location !== locationFilter) return false;
    return true;
  });

  const filteredForBulk = filteredVideos;

  const uniqueLocations = [...new Set(videos.map((v) => v.location).filter(Boolean) as string[])].sort();

  const canEdit = (video: Video) => isOperator(role) || video.uploadedBy.id === myId;
  const canDelete = (video: Video) => isOperator(role) || video.uploadedBy.id === myId;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Nagrania przejazdów</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {videos.length} pozycji
            {isOperator(role) && pendingVideos.length > 0 && (
              <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20">
                {pendingVideos.length} oczekuje na zatwierdzenie
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${showFilters || activeFilterCount > 0 ? 'border-amber-500/40 bg-amber-500/10 text-amber-400' : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600 hover:text-white'}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
              <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="12" y1="18" x2="12" y2="18" strokeLinecap="round" strokeWidth={2.5} />
            </svg>
            Filtry
            {activeFilterCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-black">
                {activeFilterCount}
              </span>
            )}
          </button>
          {isOperator(role) && (
            <button
              onClick={() => { setBulkMode((v) => !v); setSelectedIds(new Set()); }}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${bulkMode ? 'border-blue-500/40 bg-blue-500/10 text-blue-400' : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600 hover:text-white'}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
                <rect x="3" y="5" width="4" height="4" rx="1" /><line x1="10" y1="7" x2="21" y2="7" />
                <rect x="3" y="12" width="4" height="4" rx="1" /><line x1="10" y1="14" x2="21" y2="14" />
                <rect x="3" y="19" width="4" height="4" rx="1" /><line x1="10" y1="21" x2="21" y2="21" />
              </svg>
              {bulkMode ? 'Anuluj zaznaczanie' : 'Zaznacz'}
            </button>
          )}
          <button
            onClick={() => { setShowLinkModal(true); setLinkError(''); setLinkForm(emptyLinkForm); }}
            className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition hover:border-gray-600 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            Dodaj link
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Wgraj nagranie
          </button>
          <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={onFileChange} />
        </div>
      </div>

      {successMsg && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm text-green-400">
          {successMsg}
        </div>
      )}

      {uploading && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-amber-400">Przesyłanie...</span>
            <span className="font-mono text-amber-400">{uploadProgress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
            <div className="h-full rounded-full bg-amber-500 transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 transition ${dragging ? 'border-amber-400 bg-amber-500/5' : 'border-gray-700 hover:border-gray-600'}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8 text-gray-600">
          <path d="M15 10l-4 4-4-4" /><path d="M11 14V3" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        </svg>
        <p className="text-sm text-gray-500">Przeciągnij plik wideo lub <span className="text-amber-400">kliknij</span></p>
        <p className="text-xs text-gray-600">MP4, WebM, MOV, AVI, MKV · maks. 2 GB</p>
      </div>

      {showFilters && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Filtry zaawansowane</span>
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setAnalysisStatusFilter(''); setSourceTypeFilter(''); }}
                className="text-xs text-gray-500 hover:text-red-400 transition"
              >
                Wyczyść wszystkie
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400">Szukaj</label>
              <input
                type="text"
                placeholder="Tytuł, nazwa pliku, lokalizacja…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400">Data od</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400">Data do</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400">Status analizy</label>
              <select
                value={analysisStatusFilter}
                onChange={(e) => setAnalysisStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
              >
                <option value="">Wszystkie</option>
                <option value="PENDING">Oczekuje</option>
                <option value="PROCESSING">Analizuje</option>
                <option value="DONE">Przeanalizowane</option>
                <option value="ERROR">Błąd</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400">Typ źródła</label>
              <select
                value={sourceTypeFilter}
                onChange={(e) => setSourceTypeFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
              >
                <option value="">Wszystkie</option>
                <option value="FILE">Plik</option>
                <option value="YOUTUBE">YouTube</option>
                <option value="STREAM">Stream</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {(allTags.length > 0 || uniqueLocations.length > 0) && (
        <div className="flex flex-wrap items-center gap-3">
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs text-gray-500 self-center">Tag:</span>
              <button
                onClick={() => setTagFilter(null)}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${!tagFilter ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white'}`}
              >
                Wszystkie
              </button>
              {allTags.map((t) => (
                <button
                  key={t}
                  onClick={() => setTagFilter(tagFilter === t ? null : t)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${tagFilter === t ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          {uniqueLocations.length > 0 && (
            <select
              value={locationFilter ?? ''}
              onChange={(e) => setLocationFilter(e.target.value || null)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-300 outline-none focus:border-amber-400"
            >
              <option value="">Wszystkie lokalizacje</option>
              {uniqueLocations.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          )}
        </div>
      )}

      {isOperator(role) && pendingVideos.length > 0 && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Do zatwierdzenia ({pendingVideos.length})
          </h2>
          <div className="divide-y divide-gray-800 rounded-xl border border-amber-500/20 bg-gray-900 overflow-hidden">
            {pendingVideos.map((video) => (
              <div key={video.id} className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {video.title || video.originalName || 'Bez tytułu'}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {video.sourceType === 'FILE' ? 'Plik' : video.sourceType === 'YOUTUBE' ? 'YouTube' : 'Stream'}
                    {' · '}{video.uploadedBy.name ?? video.uploadedBy.email}
                    {' · '}{formatDate(video.createdAt)}
                    {video.size ? ` · ${formatBytes(video.size)}` : ''}
                  </p>
                  {video.location && <p className="mt-0.5 text-xs text-gray-600">{video.location}</p>}
                  {(video.tags ?? []).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {video.tags.map((t) => (
                        <span key={t} className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 border border-amber-500/20">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => handleApprove(video.id)} className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-semibold text-green-400 transition hover:bg-green-500/20">Zatwierdź</button>
                  <button onClick={() => handleReject(video.id)} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20">Odrzuć</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredVideos.length === 0 && !uploading ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 py-16 text-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mx-auto mb-3 h-10 w-10 text-gray-700">
            <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.89L15 14" />
            <rect x="1" y="6" width="15" height="12" rx="2" />
          </svg>
          <p className="text-sm text-gray-500">
            {tagFilter || locationFilter ? 'Brak nagrań pasujących do wybranych filtrów.' : 'Brak nagrań. Wgraj film lub dodaj link powyżej.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {isOperator(role) && filteredVideos.length > 0 && pendingVideos.length > 0 && (
            <h2 className="text-sm font-semibold text-gray-400">Zatwierdzone ({filteredVideos.length})</h2>
          )}
          {bulkMode && filteredForBulk.length > 0 && (
            <div className="flex items-center gap-3 pb-1">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition"
              >
                <span className={`flex h-4 w-4 items-center justify-center rounded border ${selectedIds.size === filteredForBulk.length && filteredForBulk.length > 0 ? 'border-amber-500 bg-amber-500' : 'border-gray-600 bg-gray-800'}`}>
                  {selectedIds.size === filteredForBulk.length && filteredForBulk.length > 0 && (
                    <svg viewBox="0 0 12 12" fill="none" stroke="black" strokeWidth={2} className="h-3 w-3"><polyline points="2 6 5 9 10 3" /></svg>
                  )}
                </span>
                {selectedIds.size === filteredForBulk.length && filteredForBulk.length > 0 ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
              </button>
              {selectedIds.size > 0 && (
                <span className="text-xs text-amber-400 font-medium">{selectedIds.size} zaznaczonych</span>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredVideos.map((video) => {
              const ast = analysisConfig[video.analysisStatus] ?? analysisConfig.PENDING;
              const apst = approvalConfig[video.approvalStatus] ?? approvalConfig.PENDING;
              const isEditing = editingId === video.id;
              const isSelected = selectedIds.has(video.id);

              return (
                <div
                  key={video.id}
                  className={`flex flex-col overflow-hidden rounded-xl border bg-gray-900 transition-colors ${isSelected ? 'border-amber-500/50' : 'border-gray-800'}`}
                  onClick={bulkMode ? () => toggleSelect(video.id) : undefined}
                  style={bulkMode ? { cursor: 'pointer' } : undefined}
                >
                  <div className="relative block aspect-video bg-gray-950">
                    {bulkMode ? (
                      <div className="h-full w-full opacity-70">
                        <VideoThumbnail video={video} />
                      </div>
                    ) : (
                      <Link href={`/dashboard/videos/${video.id}`} className="block h-full w-full hover:opacity-90 transition-opacity">
                        <VideoThumbnail video={video} />
                      </Link>
                    )}
                    {bulkMode && (
                      <div className={`absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded border ${isSelected ? 'border-amber-500 bg-amber-500' : 'border-white/60 bg-black/40'}`}>
                        {isSelected && <svg viewBox="0 0 12 12" fill="none" stroke="black" strokeWidth={2.5} className="h-3 w-3"><polyline points="2 6 5 9 10 3" /></svg>}
                      </div>
                    )}
                    <span className={`absolute right-2 top-2 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ast.color}`}>
                      {ast.label}
                    </span>
                    {video.sourceType !== 'FILE' && !bulkMode && (
                      <span className="absolute left-2 top-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                        {video.sourceType === 'YOUTUBE' ? 'YouTube' : 'Stream'}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-4">
                    {!isOperator(role) && (
                      <span className={`self-start rounded-full border px-2 py-0.5 text-[10px] font-semibold ${apst.color}`}>
                        {apst.label}
                      </span>
                    )}

                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          placeholder="Tytuł"
                          value={editForm.title}
                          onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white outline-none focus:border-amber-400"
                        />
                        <input
                          placeholder="Lokalizacja (np. A-14 Warszawa)"
                          value={editForm.location}
                          onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white outline-none focus:border-amber-400"
                        />
                        <TagChipInput tags={editForm.tags} onChange={(t) => setEditForm((f) => ({ ...f, tags: t }))} />
                        <textarea
                          placeholder="Opis"
                          rows={2}
                          value={editForm.description}
                          onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white outline-none focus:border-amber-400"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(video.id)} className="flex-1 rounded-lg bg-amber-500 py-1.5 text-xs font-semibold text-black hover:bg-amber-400">
                            Zapisz
                          </button>
                          <button onClick={() => setEditingId(null)} className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:text-white">
                            Anuluj
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          {bulkMode ? (
                            <span className="block truncate text-sm font-semibold text-white">{video.title || video.originalName || 'Bez tytułu'}</span>
                          ) : (
                            <Link href={`/dashboard/videos/${video.id}`} className="block truncate text-sm font-semibold text-white hover:text-amber-400 transition-colors">
                              {video.title || video.originalName || 'Bez tytułu'}
                            </Link>
                          )}
                          {video.location && (
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3 shrink-0">
                                <path d="M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7z" /><circle cx="12" cy="9" r="2.5" />
                              </svg>
                              {video.location}
                            </p>
                          )}
                          {(video.tags ?? []).length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {video.tags.map((t) => (
                                <button
                                  key={t}
                                  onClick={() => setTagFilter(tagFilter === t ? null : t)}
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition ${tagFilter === t ? 'border-amber-500 bg-amber-500/20 text-amber-300' : 'border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'}`}
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
                          )}
                          {video.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-gray-500">{video.description}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-800 pt-3 text-xs text-gray-500">
                          <div>
                            <p className="font-medium text-gray-400">{video.uploadedBy.name ?? video.uploadedBy.email}</p>
                            <p>{formatDate(video.createdAt)}{video.size ? ` · ${formatBytes(video.size)}` : ''}</p>
                          </div>
                          <div className="flex gap-1">
                            {!bulkMode && canEdit(video) && (
                              <button onClick={(e) => { e.stopPropagation(); startEdit(video); }} title="Edytuj"
                                className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-800 hover:text-amber-400">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                            )}
                            {!bulkMode && canDelete(video) && (
                              <button onClick={(e) => { e.stopPropagation(); handleDelete(video.id); }} title="Usuń"
                                className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-800 hover:text-red-400">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                  <path d="M10 11v6M14 11v6" />
                                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {bulkMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-2xl border border-gray-700 bg-gray-900 px-5 py-3 shadow-2xl shadow-black/60">
            <span className="text-sm font-semibold text-white">{selectedIds.size} zaznaczonych</span>
            <div className="h-4 w-px bg-gray-700" />
            {isOperator(role) && (
              <>
                <button
                  disabled={bulkLoading}
                  onClick={() => handleBulkAction('approve')}
                  className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-semibold text-green-400 transition hover:bg-green-500/20 disabled:opacity-50"
                >
                  Zatwierdź
                </button>
                <button
                  disabled={bulkLoading}
                  onClick={() => handleBulkAction('reject')}
                  className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 transition hover:bg-amber-500/20 disabled:opacity-50"
                >
                  Odrzuć
                </button>
              </>
            )}
            <button
              disabled={bulkLoading}
              onClick={() => handleBulkAction('delete')}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
            >
              {bulkLoading ? 'Przetwarzanie…' : 'Usuń'}
            </button>
            <button
              onClick={() => { setSelectedIds(new Set()); setBulkMode(false); }}
              className="ml-1 rounded-lg p-1.5 text-gray-500 transition hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        </div>
      )}

      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="mb-4 text-base font-bold text-white">Dodaj link do nagrania</h2>
            {!isOperator(role) && (
              <p className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
                Link zostanie dodany jako oczekujący i będzie widoczny po zatwierdzeniu przez administratora.
              </p>
            )}
            <form onSubmit={handleAddLink} className="space-y-4">
              <div className="flex gap-2">
                {(['YOUTUBE', 'STREAM'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setLinkForm((f) => ({ ...f, sourceType: t }))}
                    className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${linkForm.sourceType === t ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white'}`}>
                    {t === 'YOUTUBE' ? 'YouTube' : 'Stream / inny'}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400">{linkForm.sourceType === 'YOUTUBE' ? 'Link YouTube' : 'URL streamu'}</label>
                <input required type="url" placeholder={linkForm.sourceType === 'YOUTUBE' ? 'https://youtube.com/watch?v=...' : 'https://...'} value={linkForm.url}
                  onChange={(e) => setLinkForm((f) => ({ ...f, url: e.target.value }))}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-amber-400" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400">Tytuł (opcjonalnie)</label>
                <input type="text" placeholder="np. Przejazd A-14 — incydent" value={linkForm.title}
                  onChange={(e) => setLinkForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-amber-400" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400">Lokalizacja (opcjonalnie)</label>
                <input type="text" placeholder="np. A-14 Warszawa Zachodnia" value={linkForm.location}
                  onChange={(e) => setLinkForm((f) => ({ ...f, location: e.target.value }))}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-amber-400" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400">Tagi (opcjonalnie)</label>
                <TagChipInput tags={linkForm.tags} onChange={(t) => setLinkForm((f) => ({ ...f, tags: t }))} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400">Opis (opcjonalnie)</label>
                <textarea rows={2} value={linkForm.description}
                  onChange={(e) => setLinkForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-amber-400" />
              </div>

              {linkError && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">{linkError}</p>}

              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={linkSaving}
                  className="flex-1 rounded-lg bg-amber-500 py-2 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-50">
                  {linkSaving ? 'Zapisywanie…' : 'Dodaj'}
                </button>
                <button type="button" onClick={() => setShowLinkModal(false)}
                  className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 transition hover:border-gray-600 hover:text-white">
                  Anuluj
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

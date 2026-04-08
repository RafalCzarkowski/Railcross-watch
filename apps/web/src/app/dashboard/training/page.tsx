'use client';

import { useEffect, useRef, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? '/api';

interface UploadedBy { id: string; name: string | null; email: string; }
interface TrainingAsset {
  id: string;
  originalName: string;
  title: string | null;
  notes: string | null;
  tags: string[];
  size: number;
  createdAt: string;
  uploadedBy: UploadedBy;
  analysisStatus: string;
  framesCount: number | null;
  framesDir: string | null;
  detectionsJson: string | null;
  analysisError: string | null;
}

interface TrainingRun {
  id: string;
  status: string;
  epochs: number;
  modelPath: string | null;
  metrics: string | null;
  errorMsg: string | null;
  createdAt: string;
  startedBy: UploadedBy;
}

function formatBytes(b: number) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'bg-gray-700 text-gray-300',
    PROCESSING: 'bg-blue-500/20 text-blue-400',
    DONE: 'bg-green-500/20 text-green-400',
    ERROR: 'bg-red-500/20 text-red-400',
  };
  const label: Record<string, string> = {
    PENDING: 'Oczekuje',
    PROCESSING: 'W toku…',
    DONE: 'Gotowe',
    ERROR: 'Błąd',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${map[status] ?? 'bg-gray-700 text-gray-400'}`}>
      {label[status] ?? status}
    </span>
  );
}

export default function TrainingPage() {
  const [assets, setAssets] = useState<TrainingAsset[]>([]);
  const [runs, setRuns] = useState<TrainingRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', notes: '', tags: '' });
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', notes: '', tags: '' });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [epochs, setEpochs] = useState(50);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [aRes, rRes] = await Promise.all([
        fetch(`${API}/training-assets`, { credentials: 'include' }),
        fetch(`${API}/training-assets/runs`, { credentials: 'include' }),
      ]);
      if (aRes.ok) {
        setAssets(await aRes.json());
      } else {
        const d = await aRes.json().catch(() => ({}));
        showError(`Błąd pobierania materiałów: ${aRes.status} ${d.message ?? ''}`);
      }
      if (rRes.ok) setRuns(await rRes.json());
    } catch (e) {
      showError(`Błąd połączenia z API: ${String(e)}`);
    }
    setLoading(false);
  }

  function showSuccess(msg: string) { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000); }
  function showError(msg: string) { setErrorMsg(msg); setTimeout(() => setErrorMsg(''), 5000); }

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadProgress(0);
    const form = new FormData();
    form.append('file', file);
    if (uploadForm.title.trim()) form.append('title', uploadForm.title.trim());
    if (uploadForm.notes.trim()) form.append('notes', uploadForm.notes.trim());
    if (uploadForm.tags.trim()) form.append('tags', uploadForm.tags.trim());

    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API}/training-assets/upload`);
      xhr.withCredentials = true;
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = async () => {
        setUploading(false);
        if (xhr.status < 300) {
          setUploadForm({ title: '', notes: '', tags: '' });
          setShowUploadForm(false);
          showSuccess('Materiał treningowy dodany.');
          await load();
        } else {
          try {
            const d = JSON.parse(xhr.responseText);
            showError(Array.isArray(d.message) ? d.message.join(', ') : (d.message ?? 'Błąd wgrywania'));
          } catch { showError('Błąd wgrywania'); }
        }
        resolve();
      };
      xhr.onerror = () => { setUploading(false); showError('Błąd połączenia'); resolve(); };
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

  function startEdit(asset: TrainingAsset) {
    setEditingId(asset.id);
    setEditForm({ title: asset.title ?? '', notes: asset.notes ?? '', tags: asset.tags.join(', ') });
  }

  async function saveEdit(id: string) {
    const tags = editForm.tags.split(',').map((t) => t.trim()).filter(Boolean);
    const res = await fetch(`${API}/training-assets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: editForm.title || undefined, notes: editForm.notes || undefined, tags }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAssets((prev) => prev.map((a) => (a.id === id ? updated : a)));
      showSuccess('Zapisano zmiany.');
    }
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm('Usunąć ten materiał treningowy?')) return;
    const res = await fetch(`${API}/training-assets/${id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok || res.status === 204) {
      setAssets((prev) => prev.filter((a) => a.id !== id));
      showSuccess('Materiał usunięty.');
    }
  }

  async function handleAnalyze(id: string) {
    setActionLoading(`analyze-${id}`);
    const res = await fetch(`${API}/training-assets/${id}/analyze`, { method: 'POST', credentials: 'include' });
    if (res.ok) {
      const updated = await res.json();
      setAssets((prev) => prev.map((a) => (a.id === id ? updated : a)));
      showSuccess('Analiza AI zlecona.');
    } else {
      const d = await res.json().catch(() => ({}));
      showError(d.message ?? 'Błąd zlecania analizy');
    }
    setActionLoading(null);
  }

  async function handleExtract(id: string) {
    setActionLoading(`extract-${id}`);
    const res = await fetch(`${API}/training-assets/${id}/extract-frames`, { method: 'POST', credentials: 'include' });
    if (res.ok) {
      const updated = await res.json();
      setAssets((prev) => prev.map((a) => (a.id === id ? updated : a)));
      showSuccess('Ekstrakcja klatek zlecona.');
    } else {
      const d = await res.json().catch(() => ({}));
      showError(d.message ?? 'Błąd zlecania ekstrakcji');
    }
    setActionLoading(null);
  }

  async function handleTrain() {
    if (!confirm(`Uruchomić fine-tuning YOLOv8 (${epochs} epok)?`)) return;
    setActionLoading('train');
    const res = await fetch(`${API}/training-assets/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ epochs }),
    });
    if (res.ok) {
      const run = await res.json();
      setRuns((prev) => [run, ...prev]);
      showSuccess(`Uruchomiono trening (run ${run.id.slice(0, 8)}…).`);
    } else {
      const d = await res.json().catch(() => ({}));
      showError(d.message ?? 'Błąd uruchamiania treningu');
    }
    setActionLoading(null);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Materiały treningowe</h1>
          <p className="mt-0.5 text-sm text-gray-500">{assets.length} materiałów</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUploadForm((v) => !v)}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Dodaj materiał
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm text-green-400">{successMsg}</div>
      )}
      {errorMsg && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">{errorMsg}</div>
      )}

      {showUploadForm && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">Nowy materiał</h2>
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
            <p className="text-xs text-gray-600">MP4, WebM, MOV, AVI · maks. 2 GB</p>
          </div>
          <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={onFileChange} />

          {uploading && (
            <div>
              <div className="mb-1.5 flex justify-between text-xs text-amber-400">
                <span>Wgrywanie…</span><span className="font-mono">{uploadProgress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
                <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400">Tytuł (opcjonalnie)</label>
              <input
                value={uploadForm.title}
                onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400">Tagi (oddzielone przecinkiem)</label>
              <input
                value={uploadForm.tags}
                onChange={(e) => setUploadForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="noc, deszcz, rowerzysta"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-gray-400">Notatki (opcjonalnie)</label>
              <textarea
                value={uploadForm.notes}
                onChange={(e) => setUploadForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
              />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 py-12 text-center text-sm text-gray-500">Ładowanie…</div>
      ) : assets.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 py-16 text-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mx-auto mb-3 h-10 w-10 text-gray-700">
            <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.89L15 14" />
            <rect x="1" y="6" width="15" height="12" rx="2" />
          </svg>
          <p className="text-sm text-gray-500">Brak materiałów. Dodaj pierwsze nagranie treningowe.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-800 rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
          {assets.map((asset) => {
            const isEditing = editingId === asset.id;
            const isAnalyzing = actionLoading === `analyze-${asset.id}`;
            const isExtracting = actionLoading === `extract-${asset.id}`;
            return (
              <div key={asset.id} className="px-5 py-4">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-400">Tytuł</label>
                        <input
                          value={editForm.title}
                          onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white outline-none focus:border-amber-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-400">Tagi</label>
                        <input
                          value={editForm.tags}
                          onChange={(e) => setEditForm((f) => ({ ...f, tags: e.target.value }))}
                          placeholder="noc, deszcz, rowerzysta"
                          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white outline-none focus:border-amber-400"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-medium text-gray-400">Notatki</label>
                        <textarea
                          value={editForm.notes}
                          onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                          rows={2}
                          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(asset.id)} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber-400">Zapisz</button>
                      <button onClick={() => setEditingId(null)} className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:text-white">Anuluj</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-gray-500">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
                        <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.89L15 14" />
                        <rect x="1" y="6" width="15" height="12" rx="2" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-white">{asset.title || asset.originalName}</p>
                        <StatusBadge status={asset.analysisStatus} />
                      </div>
                      {asset.title && <p className="truncate text-xs text-gray-600">{asset.originalName}</p>}
                      <p className="mt-0.5 text-xs text-gray-500">
                        {asset.uploadedBy.name ?? asset.uploadedBy.email} · {formatDate(asset.createdAt)} · {formatBytes(asset.size)}
                      </p>
                      {asset.framesCount != null && (
                        <p className="mt-0.5 text-xs text-gray-500">Klatki: {asset.framesCount}</p>
                      )}
                      {asset.analysisError && (
                        <p className="mt-0.5 text-xs text-red-400 truncate">{asset.analysisError}</p>
                      )}
                      {asset.tags.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {asset.tags.map((t) => (
                            <span key={t} className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">{t}</span>
                          ))}
                        </div>
                      )}
                      {asset.notes && <p className="mt-1 text-xs text-gray-500 line-clamp-2">{asset.notes}</p>}

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button
                          onClick={() => handleAnalyze(asset.id)}
                          disabled={isAnalyzing || asset.analysisStatus === 'PROCESSING'}
                          className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400 transition hover:bg-blue-500/20 disabled:opacity-40"
                        >
                          {isAnalyzing ? 'Zlecam…' : 'Analizuj AI'}
                        </button>
                        <button
                          onClick={() => handleExtract(asset.id)}
                          disabled={isExtracting || asset.analysisStatus === 'PROCESSING'}
                          className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-400 transition hover:bg-purple-500/20 disabled:opacity-40"
                        >
                          {isExtracting ? 'Zlecam…' : 'Ekstrahuj klatki'}
                        </button>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => startEdit(asset)}
                        className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-800 hover:text-amber-400"
                        title="Edytuj"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(asset.id)}
                        className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-800 hover:text-red-400"
                        title="Usuń"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Fine-tuning modelu YOLOv8</h2>
            <p className="text-xs text-gray-500 mt-0.5">Douczy model na wyekstrahowanych klatkach ze wszystkich materiałów.</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">Epoki</label>
            <input
              type="number"
              min={1}
              max={500}
              value={epochs}
              onChange={(e) => setEpochs(Number(e.target.value))}
              className="w-16 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-center text-sm text-white outline-none focus:border-amber-400"
            />
            <button
              onClick={handleTrain}
              disabled={actionLoading === 'train'}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-500 disabled:opacity-40"
            >
              {actionLoading === 'train' ? 'Uruchamiam…' : 'Trenuj model'}
            </button>
          </div>
        </div>

        {runs.length > 0 && (
          <div className="divide-y divide-gray-800 rounded-lg border border-gray-800 overflow-hidden">
            {runs.slice(0, 10).map((run) => (
              <div key={run.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-gray-400">{run.id.slice(0, 8)}</span>
                    <StatusBadge status={run.status} />
                    <span className="text-xs text-gray-500">{run.epochs} epok</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {run.startedBy.name ?? run.startedBy.email} · {formatDate(run.createdAt)}
                  </p>
                  {run.modelPath && <p className="mt-0.5 text-xs text-green-400 truncate">{run.modelPath}</p>}
                  {run.errorMsg && <p className="mt-0.5 text-xs text-red-400 truncate">{run.errorMsg}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

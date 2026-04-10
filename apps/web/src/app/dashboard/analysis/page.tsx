'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? '/api';

interface UploadedBy { id: string; name: string | null; email: string; }
interface Video {
  id: string;
  sourceType: 'FILE' | 'YOUTUBE' | 'STREAM';
  originalName: string | null;
  title: string | null;
  location: string | null;
  analysisStatus: string;
  approvalStatus: string;
  detectionsJson: string | null;
  annotatedPath: string | null;
  analysisError: string | null;
  uploadedBy: UploadedBy;
  createdAt: string;
}

interface BBox {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  conf: number;
}

interface FrameResult {
  frameIndex: number;
  timestampMs: number;
  violation: string | null;
  boxes: BBox[];
}

type ActiveTab = 'all' | 'pending' | 'processing' | 'done' | 'error';

const STATUS_CFG: Record<string, { label: string; color: string; dot: string }> = {
  PENDING:    { label: 'Oczekuje',        color: 'text-gray-400  border-gray-700    bg-gray-800',             dot: 'bg-gray-500' },
  PROCESSING: { label: 'Przetwarzanie',   color: 'text-amber-400 border-amber-500/20 bg-amber-500/10',        dot: 'bg-amber-400 animate-pulse' },
  DONE:       { label: 'Ukończono',       color: 'text-green-400 border-green-500/20 bg-green-500/10',        dot: 'bg-green-400' },
  ERROR:      { label: 'Błąd analizy',    color: 'text-red-400   border-red-500/20   bg-red-500/10',          dot: 'bg-red-400' },
};

const VIOLATION_LABELS: Record<string, string> = {
  red_light:       'Przejazd na czerwonym',
  barrier_down:    'Przejazd przy zamkniętym szlabanie',
  wrong_direction: 'Zły kierunek jazdy',
  pedestrian:      'Pieszy na torach',
  none:            'Brak wykroczeń',
};

const BBOX_COLORS: Record<string, string> = {
  car:        '#38bdf8',
  truck:      '#818cf8',
  person:     '#fb923c',
  motorcycle: '#a78bfa',
  bicycle:    '#34d399',
  red_light:  '#f87171',
  barrier:    '#fbbf24',
};

function bboxColor(label: string) {
  return BBOX_COLORS[label] ?? '#e2e8f0';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' });
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${cfg.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function AnnotatedPlayer({ video, detections }: { video: Video; detections: FrameResult[] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentFrame, setCurrentFrame] = useState<FrameResult | null>(null);

  const findFrame = useCallback((timeMs: number): FrameResult | null => {
    if (!detections.length) return null;
    let best = detections[0];
    for (const f of detections) {
      if (Math.abs(f.timestampMs - timeMs) < Math.abs(best.timestampMs - timeMs)) best = f;
    }
    return Math.abs(best.timestampMs - timeMs) < 500 ? best : null;
  }, [detections]);

  useEffect(() => {
    const vid = videoRef.current;
    const canvas = canvasRef.current;
    if (!vid || !canvas) return;

    const onTime = () => {
      const ms = vid.currentTime * 1000;
      const frame = findFrame(ms);
      setCurrentFrame(frame);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = vid.videoWidth || vid.clientWidth;
      canvas.height = vid.videoHeight || vid.clientHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!frame) return;
      const W = canvas.width;
      const H = canvas.height;

      for (const box of frame.boxes) {
        const x = box.x * W;
        const y = box.y * H;
        const w = box.w * W;
        const h = box.h * H;
        const color = bboxColor(box.label);

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - w / 2, y - h / 2, w, h);

        ctx.fillStyle = color;
        ctx.font = 'bold 11px monospace';
        const label = `${box.label} ${Math.round(box.conf * 100)}%`;
        const tw = ctx.measureText(label).width;
        ctx.fillRect(x - w / 2, y - h / 2 - 16, tw + 6, 16);
        ctx.fillStyle = '#000';
        ctx.fillText(label, x - w / 2 + 3, y - h / 2 - 3);
      }

      if (frame.violation && frame.violation !== 'none') {
        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = 'rgba(239,68,68,0.85)';
        ctx.fillRect(8, 8, 320, 26);
        ctx.fillStyle = '#fff';
        ctx.fillText(`⚠ ${VIOLATION_LABELS[frame.violation] ?? frame.violation}`, 14, 26);
      }
    };

    vid.addEventListener('timeupdate', onTime);
    return () => vid.removeEventListener('timeupdate', onTime);
  }, [findFrame]);

  const violations = detections.filter((f) => f.violation && f.violation !== 'none');
  const allLabels = Array.from(new Set(detections.flatMap((f) => f.boxes.map((b) => b.label))));

  return (
    <div className="space-y-4">
<div className="relative overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          src={`${API}/videos/${video.id}/stream`}
          controls
          preload="metadata"
          className="w-full"
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
      </div>

<div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-3 text-center">
          <p className="text-xl font-black text-white">{detections.length}</p>
          <p className="text-xs text-gray-500">przeanalizowanych klatek</p>
        </div>
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-center">
          <p className="text-xl font-black text-red-400">{violations.length}</p>
          <p className="text-xs text-gray-500">wykrytych wykroczeń</p>
        </div>
        <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3 text-center">
          <p className="text-xl font-black text-sky-400">{allLabels.length}</p>
          <p className="text-xs text-gray-500">klas obiektów</p>
        </div>
      </div>


      {allLabels.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allLabels.map((label) => (
            <span
              key={label}
              className="flex items-center gap-1.5 rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-xs font-medium text-gray-300"
            >
              <span className="h-2 w-2 rounded-sm" style={{ background: bboxColor(label) }} />
              {label}
            </span>
          ))}
        </div>
      )}


      {violations.length > 0 && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-red-400">Wykroczone momenty</p>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {violations.map((f) => (
              <button
                key={f.frameIndex}
                onClick={() => { if (videoRef.current) videoRef.current.currentTime = f.timestampMs / 1000; }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-left text-xs transition hover:bg-red-500/10"
              >
                <span className="font-mono text-gray-500">{(f.timestampMs / 1000).toFixed(1)}s</span>
                <span className="text-red-300">{VIOLATION_LABELS[f.violation!] ?? f.violation}</span>
                <span className="ml-auto text-gray-600">klatka #{f.frameIndex}</span>
              </button>
            ))}
          </div>
        </div>
      )}


      {currentFrame && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-2 text-xs text-gray-500">
          Klatka #{currentFrame.frameIndex} ·{' '}
          {currentFrame.boxes.length} obiektów ·{' '}
          {currentFrame.violation && currentFrame.violation !== 'none'
            ? <span className="text-red-400 font-medium">{VIOLATION_LABELS[currentFrame.violation] ?? currentFrame.violation}</span>
            : <span className="text-green-500">brak wykroczeń</span>
          }
        </div>
      )}
    </div>
  );
}

interface QueueData {
  processing: Video[];
  pendingCount: number;
  recentlyDone: Video[];
}

export default function AnalysisPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ActiveTab>('all');
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [detections, setDetections] = useState<FrameResult[]>([]);
  const [loadingDetections, setLoadingDetections] = useState(false);
  const [enqueueing, setEnqueueing] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [queue, setQueue] = useState<QueueData | null>(null);

  async function loadVideos() {
    const res = await fetch(`${API}/videos`, { credentials: 'include' });
    if (res.ok) {
      const all: Video[] = await res.json();
      setVideos(all.filter((v) => v.approvalStatus === 'APPROVED'));
    }
    setLoading(false);
  }

  const loadQueue = useCallback(async () => {
    const res = await fetch(`${API}/videos/queue`, { credentials: 'include' });
    if (res.ok) setQueue(await res.json());
  }, []);

  useEffect(() => {
    fetch(`${API}/auth/me`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((me) => { if (me?.role === 'ADMIN' || me?.role === 'SUPERADMIN') { setIsAdmin(true); loadQueue(); } });
    loadVideos();
  }, [loadQueue]);

  useEffect(() => {
    if (!isAdmin) return;
    const hasProcessing = (queue?.processing.length ?? 0) > 0;
    if (!hasProcessing) return;
    const id = setInterval(loadQueue, 5_000);
    return () => clearInterval(id);
  }, [isAdmin, queue?.processing.length, loadQueue]);

  async function enqueue(id: string) {
    setEnqueueing(id);
    const res = await fetch(`${API}/videos/${id}/analyze`, { method: 'POST', credentials: 'include' });
    if (res.ok) {
      const updated = await res.json();
      setVideos((prev) => prev.map((v) => v.id === id ? { ...v, analysisStatus: updated.analysisStatus } : v));
    }
    setEnqueueing(null);
  }

  async function openAnalysis(video: Video) {
    if (activeVideo === video.id) { setActiveVideo(null); return; }
    setActiveVideo(video.id);
    setDetections([]);

    if (video.analysisStatus !== 'DONE') return;
    if (!video.detectionsJson) return;

    setLoadingDetections(true);
    try {
      const parsed = JSON.parse(video.detectionsJson);
      setDetections(Array.isArray(parsed) ? parsed : []);
    } catch {
      setDetections([]);
    } finally {
      setLoadingDetections(false);
    }
  }

  const filtered = videos.filter((v) => {
    if (tab === 'all') return true;
    return v.analysisStatus === tab.toUpperCase();
  });

  const counts: Record<string, number> = {
    all: videos.length,
    pending: videos.filter((v) => v.analysisStatus === 'PENDING').length,
    processing: videos.filter((v) => v.analysisStatus === 'PROCESSING').length,
    done: videos.filter((v) => v.analysisStatus === 'DONE').length,
    error: videos.filter((v) => v.analysisStatus === 'ERROR').length,
  };

  const TABS: { id: ActiveTab; label: string }[] = [
    { id: 'all',        label: 'Wszystkie' },
    { id: 'pending',    label: 'Oczekujące' },
    { id: 'processing', label: 'Przetwarzane' },
    { id: 'done',       label: 'Ukończone' },
    { id: 'error',      label: 'Błędy' },
  ];

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-xl font-bold text-white">Analiza AI</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          YOLO26 + OpenCV — detekcja wykroczeń na przejazdach kolejowych
        </p>
      </div>


      <div className="flex items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="mt-0.5 h-4 w-4 shrink-0 text-sky-400">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div className="text-xs text-sky-300">
          <p className="font-semibold">Jak działa analiza?</p>
          <p className="mt-0.5 text-sky-400/80">
            Nagranie trafia do kolejki Redis → worker Python (YOLO26) analizuje każdą klatkę → wykrywa pojazdy, stan szlabanu i sygnalizacji.
            Wyniki nakładane są na <strong>canvas</strong> zsynchronizowany z playerem wideo — zarówno offline jak i live stream.
          </p>
        </div>
      </div>

      {isAdmin && queue && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4 text-amber-400">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" strokeWidth={2.5} /><line x1="3" y1="12" x2="3.01" y2="12" strokeWidth={2.5} /><line x1="3" y1="18" x2="3.01" y2="18" strokeWidth={2.5} />
              </svg>
              Kolejka AI
            </h2>
            <button onClick={loadQueue} className="text-xs text-gray-500 hover:text-white transition">Odśwież</button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                W trakcie ({queue.processing.length})
              </p>
              {queue.processing.length === 0 ? (
                <p className="text-xs text-gray-600">Brak aktywnych zadań</p>
              ) : (
                <ul className="space-y-1">
                  {queue.processing.map((v) => (
                    <li key={v.id} className="flex items-center gap-2 text-xs text-gray-300">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3 animate-spin text-amber-400 shrink-0"><path d="M21 12a9 9 0 1 1-9-9" /></svg>
                      <span className="truncate">{v.title ?? v.originalName ?? v.id}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>


            <div className="rounded-lg border border-gray-800 bg-gray-800/50 p-3">
              <p className="text-xs font-semibold text-gray-400 mb-2">Oczekuje na analizę</p>
              <p className="text-2xl font-black text-white">{queue.pendingCount}</p>
              <p className="text-xs text-gray-600 mt-0.5">zatwierdzonych nagrań</p>
            </div>


            <div className="rounded-lg border border-gray-800 bg-gray-800/50 p-3">
              <p className="text-xs font-semibold text-gray-400 mb-2">Ostatnio zakończone</p>
              {queue.recentlyDone.length === 0 ? (
                <p className="text-xs text-gray-600">Brak w ostatniej godzinie</p>
              ) : (
                <ul className="space-y-1">
                  {queue.recentlyDone.map((v) => (
                    <li key={v.id} className="flex items-center gap-2 text-xs">
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${v.analysisStatus === 'DONE' ? 'bg-green-400' : 'bg-red-400'}`} />
                      <span className="truncate text-gray-300">{v.title ?? v.originalName ?? v.id}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}


      <div className="flex flex-wrap gap-2">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              tab === id
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600 hover:text-white'
            }`}
          >
            {label}
            {counts[id] > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab === id ? 'bg-amber-500/20 text-amber-300' : 'bg-gray-800 text-gray-500'}`}>
                {counts[id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mr-3 h-5 w-5 animate-spin">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Ładowanie nagrań…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 py-16 text-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mx-auto mb-3 h-10 w-10 text-gray-700">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <p className="text-sm text-gray-500">
            {tab === 'all' ? 'Brak zatwierdzonych nagrań do analizy.' : `Brak nagrań w kategorii „${TABS.find(t => t.id === tab)?.label}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((video) => {
            const isOpen = activeVideo === video.id;
            const canAnalyze = video.analysisStatus === 'PENDING' || video.analysisStatus === 'ERROR';
            const isDone = video.analysisStatus === 'DONE';
            const isProcessing = video.analysisStatus === 'PROCESSING';

            return (
              <div key={video.id} className={`rounded-xl border bg-gray-900 transition ${isOpen ? 'border-amber-500/30' : 'border-gray-800'}`}>

                <div className="flex items-center gap-4 px-5 py-4">

                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isDone ? 'bg-green-500/10' : isProcessing ? 'bg-amber-500/10' : 'bg-gray-800'}`}>
                    {isDone ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-green-400">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    ) : isProcessing ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 animate-spin text-amber-400">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5 text-gray-500">
                        <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.89L15 14" />
                        <rect x="1" y="6" width="15" height="12" rx="2" />
                      </svg>
                    )}
                  </div>


                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-white">
                        {video.title || video.originalName || 'Bez tytułu'}
                      </p>
                      <StatusBadge status={video.analysisStatus} />
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {video.uploadedBy.name ?? video.uploadedBy.email}
                      {video.location && ` · ${video.location}`}
                      {' · '}{formatDate(video.createdAt)}
                    </p>
                    {video.analysisError && (
                      <p className="mt-1 text-xs text-red-400">{video.analysisError}</p>
                    )}
                  </div>


                  <div className="flex shrink-0 items-center gap-2">
                    {canAnalyze && video.sourceType === 'FILE' && (
                      <button
                        onClick={() => enqueue(video.id)}
                        disabled={enqueueing === video.id}
                        className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-amber-400 disabled:opacity-50"
                      >
                        {enqueueing === video.id ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 animate-spin">
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        )}
                        Analizuj
                      </button>
                    )}
                    {isDone && (
                      <button
                        onClick={() => openAnalysis(video)}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                          isOpen
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                            : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600 hover:text-white'
                        }`}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                          <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
                        </svg>
                        {isOpen ? 'Zamknij' : 'Wyniki'}
                      </button>
                    )}
                    {isProcessing && (
                      <span className="text-xs text-amber-400">Przetwarzanie w toku…</span>
                    )}
                  </div>
                </div>


                {isOpen && isDone && (
                  <div className="border-t border-gray-800 p-5">
                    {loadingDetections ? (
                      <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4 animate-spin">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        Ładowanie detekcji…
                      </div>
                    ) : video.sourceType !== 'FILE' ? (
                      <p className="py-4 text-sm text-gray-500">Podgląd z nałożonymi detekcjami dostępny tylko dla nagrań lokalnych (FILE).</p>
                    ) : detections.length > 0 ? (
                      <AnnotatedPlayer video={video} detections={detections} />
                    ) : (
                      <p className="py-4 text-sm text-gray-500">
                        Analiza ukończona — brak zapisanych detekcji w bazie. Worker musi zapisać <code className="text-xs bg-gray-800 px-1 py-0.5 rounded">detectionsJson</code>.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

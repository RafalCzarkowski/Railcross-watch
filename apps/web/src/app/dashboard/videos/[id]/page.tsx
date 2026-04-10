'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const API = process.env.NEXT_PUBLIC_API_URL ?? '/api';

interface BBox { label: string; x: number; y: number; w: number; h: number; conf: number; }
interface FrameResult { frameIndex: number; timestampMs: number; violation: string | null; boxes: BBox[]; }

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
  detectionsJson: string | null;
  uploadedBy: UploadedBy;
  createdAt: string;
}

const VIOLATION_LABELS: Record<string, string> = {
  red_light:       'Czerwone światło',
  barrier_down:    'Szlaban opuszczony',
  wrong_direction: 'Zły kierunek',
  pedestrian:      'Pieszy na torach',
  none:            'Brak naruszenia',
};

const VIOLATION_COLORS: Record<string, string> = {
  red_light:       '#f87171',
  barrier_down:    '#fb923c',
  wrong_direction: '#facc15',
  pedestrian:      '#60a5fa',
  none:            '#4b5563',
};

const AXIS_TICK = { fill: '#6b7280', fontSize: 11 };
const TOOLTIP_STYLE = { backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#f9fafb', fontSize: 12 };

function AnalyticsSection({ detectionsJson }: { detectionsJson: string }) {
  let frames: FrameResult[] = [];
  try { frames = JSON.parse(detectionsJson); } catch { return null; }

  const totalFrames = frames.length;
  const framesWithDetection = frames.filter((f) => f.boxes.length > 0).length;
  const violationFrames = frames.filter((f) => f.violation && f.violation !== 'none');
  const allConfs = frames.flatMap((f) => f.boxes.map((b) => b.conf));
  const avgConf = allConfs.length > 0 ? (allConfs.reduce((s, c) => s + c, 0) / allConfs.length * 100).toFixed(0) : '—';

  const violationCounts: Record<string, number> = {};
  for (const f of violationFrames) {
    if (f.violation && f.violation !== 'none') {
      violationCounts[f.violation] = (violationCounts[f.violation] ?? 0) + 1;
    }
  }
  const violationPie = Object.entries(violationCounts).map(([k, v]) => ({
    name: VIOLATION_LABELS[k] ?? k, value: v, color: VIOLATION_COLORS[k] ?? '#6b7280',
  }));

  const bucketSize = 5000;
  const timelineMap = new Map<number, number>();
  for (const f of frames) {
    const bucket = Math.floor(f.timestampMs / bucketSize) * bucketSize;
    timelineMap.set(bucket, (timelineMap.get(bucket) ?? 0) + f.boxes.length);
  }
  const timeline = Array.from(timelineMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([ts, count]) => ({ t: `${(ts / 1000).toFixed(0)}s`, count }));

  const violations = violationFrames
    .slice(0, 20)
    .map((f) => ({ ts: (f.timestampMs / 1000).toFixed(1), type: f.violation! }));

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500">Wyniki analizy AI</h2>


      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Klatek łącznie', value: totalFrames, color: 'text-gray-300' },
          { label: 'Z detekcją', value: framesWithDetection, color: 'text-sky-400' },
          { label: 'Naruszeń', value: violationFrames.length, color: violationFrames.length > 0 ? 'text-red-400' : 'text-green-400' },
          { label: 'Śr. pewność', value: avgConf === '—' ? '—' : `${avgConf}%`, color: 'text-amber-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-center">
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="mt-0.5 text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>


      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-gray-800 bg-gray-900 p-4">
          <p className="mb-3 text-sm font-semibold text-gray-300">Detekcje w czasie</p>
          {timeline.length === 0 ? (
            <p className="py-6 text-center text-xs text-gray-600">Brak detekcji</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={timeline} barSize={6}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="t" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="count" name="Obiekty" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <p className="mb-3 text-sm font-semibold text-gray-300">Typy naruszeń</p>
          {violationPie.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8 text-green-500/40">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <p className="text-xs text-green-500/60">Brak naruszeń</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <ResponsiveContainer width="100%" height={100}>
                <PieChart>
                  <Pie data={violationPie} dataKey="value" cx="50%" cy="50%" innerRadius={25} outerRadius={45} paddingAngle={2}>
                    {violationPie.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [v, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1">
                {violationPie.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: d.color }} />
                    <span className="flex-1 truncate">{d.name}</span>
                    <span className="font-semibold text-white">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>


      {violations.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <p className="mb-3 text-sm font-semibold text-gray-300">Incydenty (pierwsze 20)</p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {violations.map((v, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-950 px-3 py-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: VIOLATION_COLORS[v.type] ?? '#6b7280' }}
                />
                <span className="flex-1 text-xs text-gray-300">{VIOLATION_LABELS[v.type] ?? v.type}</span>
                <span className="font-mono text-xs text-gray-600">{v.ts}s</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string | null; email: string } | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pl-PL', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatBytes(bytes: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function Avatar({ name }: { name: string | null }) {
  const initials = name ? name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() : '?';
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-400">
      {initials}
    </span>
  );
}

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;

  const [video, setVideo] = useState<Video | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [meRole, setMeRole] = useState<string>('USER');
  const [commentBody, setCommentBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function fetchVideo() {
    const r = await fetch(`${API}/videos/${videoId}`, { credentials: 'include' });
    if (!r.ok) throw new Error('Nie znaleziono nagrania');
    return r.json() as Promise<Video>;
  }

  useEffect(() => {
    fetch(`${API}/auth/me`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((me) => { if (me) { setMeId(me.id); setMeRole(me.role); } });

    fetchVideo()
      .then(setVideo)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingVideo(false));

    loadComments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  useEffect(() => {
    if (video?.analysisStatus !== 'PROCESSING') return;
    const id = setInterval(() => {
      fetchVideo().then(setVideo).catch(() => {});
    }, 5_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.analysisStatus, videoId]);

  async function loadComments() {
    setLoadingComments(true);
    const res = await fetch(`${API}/comments?videoId=${videoId}`, { credentials: 'include' });
    if (res.ok) setComments(await res.json());
    setLoadingComments(false);
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setSubmitting(true);
    const res = await fetch(`${API}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ videoId, body: commentBody.trim() }),
    });
    if (res.ok) {
      const newComment = await res.json();
      setComments((c) => [...c, newComment]);
      setCommentBody('');
    }
    setSubmitting(false);
  }

  async function deleteComment(id: string) {
    if (!confirm('Usunąć komentarz?')) return;
    await fetch(`${API}/comments/${id}`, { method: 'DELETE', credentials: 'include' });
    setComments((c) => c.filter((x) => x.id !== id));
  }

  if (loadingVideo) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mr-3 h-5 w-5 animate-spin">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        Ładowanie nagrania…
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-400">
        {error || 'Nie udało się załadować nagrania.'}
      </div>
    );
  }

  const isOperator = meRole === 'ADMIN' || meRole === 'SUPERADMIN';

  return (
    <div className="space-y-6">

      <button
        onClick={() => router.push('/dashboard/videos')}
        className="flex items-center gap-2 text-sm text-gray-500 transition hover:text-white"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Wróć do nagrań
      </button>


      <div>
        <h1 className="text-xl font-bold text-white">{video.title || video.originalName || 'Bez tytułu'}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span>{video.uploadedBy.name ?? video.uploadedBy.email}</span>
          <span>{formatDate(video.createdAt)}</span>
          {video.size && <span>{formatBytes(video.size)}</span>}
          {video.location && (
            <span className="flex items-center gap-1">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3">
                <path d="M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7z" /><circle cx="12" cy="9" r="2.5" />
              </svg>
              {video.location}
            </span>
          )}
        </div>
        {(video.tags ?? []).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {video.tags.map((t) => (
              <span key={t} className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>


      <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-950">
        <div className="aspect-video w-full">
          {video.sourceType === 'YOUTUBE' && video.sourceUrl ? (
            <iframe src={video.sourceUrl} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="h-full w-full" />
          ) : video.sourceType === 'STREAM' && video.sourceUrl ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-12 w-12 text-gray-600">
                <path d="M8 17l-5-5 5-5" /><path d="M16 17l5-5-5-5" /><line x1="12" y1="3" x2="12" y2="21" />
              </svg>
              <a href={video.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-amber-400 hover:underline">{video.sourceUrl}</a>
            </div>
          ) : (
            <video
              key={video.id}
              controls
              preload="metadata"
              className="h-full w-full object-contain"
            >
              <source src={`${API}/videos/${video.id}/stream`} />
              Twoja przeglądarka nie obsługuje odtwarzacza wideo.
            </video>
          )}
        </div>
      </div>


      {video.description && (
        <p className="text-sm text-gray-400 leading-relaxed">{video.description}</p>
      )}


      {video.analysisStatus === 'DONE' && video.detectionsJson && (
        <AnalyticsSection detectionsJson={video.detectionsJson} />
      )}

      {video.analysisStatus === 'PROCESSING' && (
        <div className="overflow-hidden rounded-full h-1 bg-gray-800">
          <div className="h-full w-1/3 rounded-full bg-amber-400 animate-[progress-indeterminate_1.5s_ease-in-out_infinite]" style={{ animation: 'slide 1.5s ease-in-out infinite' }} />
          <style>{`@keyframes slide { 0%{transform:translateX(-100%)} 100%{transform:translateX(400%)} }`}</style>
        </div>
      )}


      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Analiza AI:</span>
        {{
          PENDING:    <span className="rounded-full border border-gray-700 bg-gray-800 px-2.5 py-0.5 text-xs font-semibold text-gray-400">Oczekuje</span>,
          PROCESSING: <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 animate-pulse">Analizuje…</span>,
          DONE:       <span className="rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-400">Przeanalizowano</span>,
          ERROR:      <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-400">Błąd</span>,
        }[video.analysisStatus] ?? null}
        {isOperator && video.approvalStatus === 'APPROVED' && video.analysisStatus !== 'PROCESSING' && (
          <button
            onClick={async () => {
              await fetch(`${API}/videos/${videoId}/analyze`, { method: 'POST', credentials: 'include' });
              setVideo((v) => v ? { ...v, analysisStatus: 'PROCESSING' } : v);
            }}
            className="ml-auto rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 transition hover:bg-amber-500/20"
          >
            Uruchom analizę AI
          </button>
        )}
      </div>


      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500">
          Komentarze ({comments.length})
        </h2>

        {loadingComments ? (
          <p className="text-xs text-gray-600">Ładowanie komentarzy…</p>
        ) : comments.length === 0 ? (
          <div className="rounded-xl border border-gray-800 bg-gray-900 py-8 text-center">
            <p className="text-sm text-gray-600">Brak komentarzy. Bądź pierwszy!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => {
              const canDelete = isOperator || comment.author?.id === meId;
              return (
                <div key={comment.id} className="flex gap-3 rounded-xl border border-gray-800 bg-gray-900 p-4">
                  <Avatar name={comment.author?.name ?? null} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-gray-300">
                        {comment.author?.name ?? comment.author?.email ?? 'Nieznany'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">{formatDate(comment.createdAt)}</span>
                        {canDelete && (
                          <button
                            onClick={() => deleteComment(comment.id)}
                            className="text-gray-600 transition hover:text-red-400"
                            title="Usuń komentarz"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-3.5 w-3.5">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-gray-300 whitespace-pre-wrap">{comment.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}


        <form onSubmit={submitComment} className="space-y-2">
          <textarea
            ref={textareaRef}
            placeholder="Dodaj komentarz…"
            rows={3}
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-amber-400 resize-none"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !commentBody.trim()}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-40"
            >
              {submitting ? 'Wysyłanie…' : 'Dodaj komentarz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

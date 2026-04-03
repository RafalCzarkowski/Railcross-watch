import Link from 'next/link';

const TIES = Array.from({ length: 28 }, (_, i) => i * 36);

const STARS: [number, number, number][] = [
  [5, 18, 0.5], [40, 8, 0.3], [95, 28, 0.6], [155, 12, 0.4],
  [210, 35, 0.5], [275, 5, 0.3], [340, 22, 0.7], [400, 38, 0.4],
  [455, 10, 0.5], [510, 30, 0.3], [560, 16, 0.6], [610, 42, 0.4],
  [650, 7, 0.5], [690, 25, 0.3],
];

export default function NotFound() {
  return (
    <>
      <style>{`
        @keyframes trainPass {
          0%          { transform: translateX(-320px); }
          74%         { transform: translateX(1060px); }
          74.01%, 100% { transform: translateX(-320px); }
        }
        @keyframes barrierArm {
          0%, 10%     { transform: rotate(-84deg); }
          20%, 63%    { transform: rotate(2deg); }
          73%, 100%   { transform: rotate(-84deg); }
        }
        @keyframes warnA {
          0%, 14%      { opacity: 0.12; }
          15%, 22%     { opacity: 1; }
          23%, 30%     { opacity: 0.12; }
          31%, 38%     { opacity: 1; }
          39%, 46%     { opacity: 0.12; }
          47%, 54%     { opacity: 1; }
          55%, 62%     { opacity: 0.12; }
          63%, 70%     { opacity: 1; }
          71%, 100%    { opacity: 0.12; }
        }
        @keyframes warnB {
          0%, 14%      { opacity: 0.12; }
          15%, 22%     { opacity: 0.12; }
          23%, 30%     { opacity: 1; }
          31%, 38%     { opacity: 0.12; }
          39%, 46%     { opacity: 1; }
          47%, 54%     { opacity: 0.12; }
          55%, 62%     { opacity: 1; }
          63%, 70%     { opacity: 0.12; }
          71%, 100%    { opacity: 0.12; }
        }
        @keyframes puff1 {
          0%   { transform: translate(0px, 0px) scale(0.5); opacity: 0.55; }
          100% { transform: translate(-10px, -32px) scale(1.6); opacity: 0; }
        }
        @keyframes puff2 {
          0%   { transform: translate(0px, 0px) scale(0.35); opacity: 0.4; }
          100% { transform: translate(8px, -26px) scale(1.3); opacity: 0; }
        }
        @keyframes puff3 {
          0%   { transform: translate(0px, 0px) scale(0.25); opacity: 0.3; }
          100% { transform: translate(-4px, -20px) scale(1.1); opacity: 0; }
        }
        @keyframes float404 {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-10px); }
        }
        @keyframes fadeSignal {
          0%, 14%   { opacity: 0.18; }
          15%, 72%  { opacity: 1; }
          73%, 100% { opacity: 0.18; }
        }
        @keyframes trainLight {
          0%   { opacity: 1; }
          50%  { opacity: 0.7; }
          100% { opacity: 1; }
        }
        @keyframes clickety {
          0%, 100% { transform: translateY(0); }
          25%      { transform: translateY(-0.5px); }
          75%      { transform: translateY(0.5px); }
        }
      `}</style>

      <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-gray-950 px-6 py-10 text-center">

        {/* ── 404 heading ── */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-400">
            Błąd · Strona nie istnieje
          </p>
          <h1
            className="text-[8rem] font-black leading-none tracking-tighter text-white sm:text-[10rem]"
            style={{ animation: 'float404 3.5s ease-in-out infinite' }}
          >
            404
          </h1>
          <p className="mt-3 text-base text-gray-400">
            Tej strony nie ma na żadnym rozkładzie jazdy.
          </p>
        </div>

        {/* ── Railway crossing scene ── */}
        <div
          className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-800"
          style={{ height: '210px', position: 'relative', background: '#030712' }}
        >
          {/* Sky gradient */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #030712 0%, #071b38 55%, #0a1a2e 100%)' }} />

          {/* Stars */}
          {STARS.map(([x, y, op], i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${x}px`,
                top: `${y}px`,
                width: '2px',
                height: '2px',
                borderRadius: '50%',
                background: '#fff',
                opacity: op,
              }}
            />
          ))}

          {/* Moon */}
          <div style={{ position: 'absolute', right: '40px', top: '20px', width: '22px', height: '22px', borderRadius: '50%', background: '#fef3c7', opacity: 0.7, boxShadow: '0 0 18px 4px rgba(254,243,199,0.2)' }} />
          <div style={{ position: 'absolute', right: '35px', top: '18px', width: '18px', height: '18px', borderRadius: '50%', background: '#030712' }} />

          {/* Ground */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', background: '#0d1117' }} />

          {/* Road (vertical strip) */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 'calc(50% - 58px)', width: '116px', background: '#111827' }} />
          {/* Road center dash line */}
          <div style={{
            position: 'absolute', top: 0, bottom: 0,
            left: 'calc(50% - 2px)', width: '4px',
            background: 'repeating-linear-gradient(to bottom, transparent 0, transparent 9px, #374151 9px, #374151 18px)',
          }} />
          {/* Road edge lines */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 'calc(50% - 56px)', width: '2px', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 'calc(50% + 54px)', width: '2px', background: 'rgba(255,255,255,0.06)' }} />

          {/* Sleepers / ties */}
          {TIES.map((x) => (
            <div
              key={x}
              style={{
                position: 'absolute',
                left: `${x}px`,
                top: '135px',
                width: '10px',
                height: '30px',
                background: '#3b1702',
                borderRadius: '2px',
                opacity: 0.95,
              }}
            />
          ))}

          {/* Rail highlights (top of each rail) */}
          <div style={{ position: 'absolute', top: '141px', left: 0, right: 0, height: '2px', background: '#d1d5db', opacity: 0.2 }} />
          <div style={{ position: 'absolute', top: '158px', left: 0, right: 0, height: '2px', background: '#d1d5db', opacity: 0.2 }} />
          {/* Rails */}
          <div style={{ position: 'absolute', top: '141px', left: 0, right: 0, height: '7px', background: 'linear-gradient(to bottom, #9ca3af 0%, #6b7280 100%)', borderRadius: '2px' }} />
          <div style={{ position: 'absolute', top: '158px', left: 0, right: 0, height: '7px', background: 'linear-gradient(to bottom, #9ca3af 0%, #6b7280 100%)', borderRadius: '2px' }} />

          {/* ── LEFT BARRIER ASSEMBLY ── */}
          {/* pole */}
          <div style={{
            position: 'absolute',
            left: 'calc(50% - 100px)',
            top: '78px',
            width: '10px',
            height: '90px',
            background: 'linear-gradient(to right, #1f2937, #374151)',
            borderRadius: '3px 3px 0 0',
          }} />
          {/* warning light box */}
          <div style={{
            position: 'absolute',
            left: 'calc(50% - 116px)',
            top: '56px',
            width: '36px',
            height: '26px',
            background: '#111827',
            border: '1.5px solid #374151',
            borderRadius: '5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-evenly',
            animation: 'fadeSignal 8s linear infinite',
          }}>
            <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#ef4444', animation: 'warnA 8s linear infinite', boxShadow: '0 0 6px 2px rgba(239,68,68,0.6)' }} />
            <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#ef4444', animation: 'warnB 8s linear infinite', boxShadow: '0 0 6px 2px rgba(239,68,68,0.6)' }} />
          </div>
          {/* small pole cap */}
          <div style={{ position: 'absolute', left: 'calc(50% - 102px)', top: '74px', width: '14px', height: '6px', background: '#4b5563', borderRadius: '3px' }} />
          {/* LEFT ARM — pivot at left (pole side) */}
          <div style={{
            position: 'absolute',
            left: 'calc(50% - 91px)',
            top: '80px',
            width: '112px',
            height: '9px',
            transformOrigin: '0% 50%',
            borderRadius: '0 5px 5px 0',
            background: 'repeating-linear-gradient(90deg, #ef4444 0px, #ef4444 20px, #f9fafb 20px, #f9fafb 38px)',
            animation: 'barrierArm 8s linear infinite',
            boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
          }} />
          {/* arm tip weight */}
          <div style={{
            position: 'absolute',
            left: 'calc(50% - 91px)',
            top: '76px',
            width: '112px',
            height: '17px',
            transformOrigin: '0% 50%',
            borderRadius: '0 6px 6px 0',
            background: 'transparent',
            animation: 'barrierArm 8s linear infinite',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: '3px',
          }}>
            <div style={{ width: '12px', height: '14px', background: '#374151', borderRadius: '3px', border: '1px solid #4b5563' }} />
          </div>

          {/* ── RIGHT BARRIER ASSEMBLY ── */}
          {/* pole */}
          <div style={{
            position: 'absolute',
            left: 'calc(50% + 90px)',
            top: '78px',
            width: '10px',
            height: '90px',
            background: 'linear-gradient(to right, #1f2937, #374151)',
            borderRadius: '3px 3px 0 0',
          }} />
          {/* warning light box */}
          <div style={{
            position: 'absolute',
            left: 'calc(50% + 80px)',
            top: '56px',
            width: '36px',
            height: '26px',
            background: '#111827',
            border: '1.5px solid #374151',
            borderRadius: '5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-evenly',
            animation: 'fadeSignal 8s linear infinite',
          }}>
            <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#ef4444', animation: 'warnB 8s linear infinite', boxShadow: '0 0 6px 2px rgba(239,68,68,0.6)' }} />
            <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#ef4444', animation: 'warnA 8s linear infinite', boxShadow: '0 0 6px 2px rgba(239,68,68,0.6)' }} />
          </div>
          {/* small pole cap */}
          <div style={{ position: 'absolute', left: 'calc(50% + 88px)', top: '74px', width: '14px', height: '6px', background: '#4b5563', borderRadius: '3px' }} />
          {/* RIGHT ARM — pivot at right (pole side) */}
          <div style={{
            position: 'absolute',
            left: 'calc(50% - 21px)',
            top: '80px',
            width: '112px',
            height: '9px',
            transformOrigin: '100% 50%',
            borderRadius: '5px 0 0 5px',
            background: 'repeating-linear-gradient(-90deg, #ef4444 0px, #ef4444 20px, #f9fafb 20px, #f9fafb 38px)',
            animation: 'barrierArm 8s linear infinite',
            boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
          }} />
          {/* right arm tip weight */}
          <div style={{
            position: 'absolute',
            left: 'calc(50% - 21px)',
            top: '76px',
            width: '112px',
            height: '17px',
            transformOrigin: '100% 50%',
            borderRadius: '5px 0 0 5px',
            background: 'transparent',
            animation: 'barrierArm 8s linear infinite',
            display: 'flex',
            alignItems: 'center',
            paddingLeft: '3px',
          }}>
            <div style={{ width: '12px', height: '14px', background: '#374151', borderRadius: '3px', border: '1px solid #4b5563' }} />
          </div>

          {/* ── TRAIN (animated) ── */}
          <div
            style={{
              position: 'absolute',
              top: '97px',
              animation: 'trainPass 8s linear infinite, clickety 0.22s linear infinite',
            }}
          >
            {/* Steam puffs (relative to train) */}
            <div style={{ position: 'absolute', left: '12px', top: '-30px', width: '14px', height: '14px', borderRadius: '50%', background: '#6b7280', animation: 'puff1 1.1s ease-out infinite' }} />
            <div style={{ position: 'absolute', left: '16px', top: '-24px', width: '11px', height: '11px', borderRadius: '50%', background: '#6b7280', animation: 'puff2 1.4s ease-out infinite 0.25s' }} />
            <div style={{ position: 'absolute', left: '10px', top: '-18px', width: '9px', height: '9px', borderRadius: '50%', background: '#6b7280', animation: 'puff3 1.7s ease-out infinite 0.5s' }} />

            <svg width="295" height="55" viewBox="0 0 295 55" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* ── LOCOMOTIVE ── */}
              {/* main body */}
              <rect x="0" y="7" width="92" height="39" rx="3" fill="#1e293b" />
              {/* body gradient overlay */}
              <rect x="0" y="7" width="92" height="10" rx="3" fill="#243447" opacity="0.6" />
              {/* cab */}
              <rect x="58" y="0" width="34" height="13" rx="2" fill="#0f172a" />
              {/* cab window */}
              <rect x="65" y="2" width="15" height="9" rx="1.5" fill="#7dd3fc" opacity="0.6" />
              <rect x="66" y="3" width="13" height="7" rx="1" fill="#bae6fd" opacity="0.15" />
              {/* chimney */}
              <rect x="5" y="0" width="11" height="10" rx="2" fill="#334155" />
              <rect x="3" y="7" width="15" height="4" rx="1" fill="#475569" />
              {/* body detail stripe */}
              <rect x="0" y="32" width="92" height="6" rx="0" fill="#334155" opacity="0.5" />
              {/* amber stripe */}
              <rect x="0" y="30" width="58" height="3" fill="#d97706" opacity="0.7" />
              {/* front face */}
              <rect x="87" y="7" width="8" height="39" rx="2" fill="#334155" />
              {/* headlight */}
              <circle cx="91" cy="27" r="5" fill="#fef9c3" style={{ animation: 'trainLight 2s ease-in-out infinite' }} />
              <circle cx="91" cy="27" r="3" fill="#fef3c7" />
              {/* headlight glow */}
              <circle cx="91" cy="27" r="7" fill="#fef9c3" opacity="0.15" />
              {/* front buffer */}
              <rect x="93" y="22" width="5" height="12" rx="1" fill="#4b5563" />
              {/* wheels */}
              <circle cx="17" cy="46" r="9" fill="#0f172a" stroke="#64748b" strokeWidth="2.5" />
              <circle cx="17" cy="46" r="3.5" fill="#94a3b8" />
              <circle cx="17" cy="46" r="1.5" fill="#1e293b" />
              <circle cx="46" cy="46" r="9" fill="#0f172a" stroke="#64748b" strokeWidth="2.5" />
              <circle cx="46" cy="46" r="3.5" fill="#94a3b8" />
              <circle cx="46" cy="46" r="1.5" fill="#1e293b" />
              <circle cx="74" cy="46" r="9" fill="#0f172a" stroke="#64748b" strokeWidth="2.5" />
              <circle cx="74" cy="46" r="3.5" fill="#94a3b8" />
              <circle cx="74" cy="46" r="1.5" fill="#1e293b" />
              {/* connecting rod */}
              <rect x="14" y="42" width="63" height="3" rx="1.5" fill="#475569" opacity="0.7" />
              {/* coupling hook */}
              <rect x="92" y="25" width="10" height="5" rx="1" fill="#4b5563" />

              {/* ── CAR 1 (blue freight) ── */}
              <rect x="102" y="13" width="84" height="33" rx="2" fill="#1e3a5f" />
              <rect x="102" y="13" width="84" height="6" rx="2" fill="#1a3356" />
              <rect x="102" y="40" width="84" height="6" rx="2" fill="#162a47" />
              {/* ribs */}
              <line x1="122" y1="13" x2="122" y2="46" stroke="#172d4a" strokeWidth="2" />
              <line x1="144" y1="13" x2="144" y2="46" stroke="#172d4a" strokeWidth="2" />
              <line x1="166" y1="13" x2="166" y2="46" stroke="#172d4a" strokeWidth="2" />
              {/* wheels */}
              <circle cx="117" cy="46" r="9" fill="#0f172a" stroke="#64748b" strokeWidth="2" />
              <circle cx="117" cy="46" r="3.5" fill="#94a3b8" />
              <circle cx="117" cy="46" r="1.5" fill="#1e293b" />
              <circle cx="170" cy="46" r="9" fill="#0f172a" stroke="#64748b" strokeWidth="2" />
              <circle cx="170" cy="46" r="3.5" fill="#94a3b8" />
              <circle cx="170" cy="46" r="1.5" fill="#1e293b" />
              {/* coupling */}
              <rect x="185" y="25" width="10" height="5" rx="1" fill="#4b5563" />

              {/* ── CAR 2 (dark gray) ── */}
              <rect x="195" y="13" width="84" height="33" rx="2" fill="#1f2937" />
              <rect x="195" y="13" width="84" height="6" rx="2" fill="#1a2433" />
              <rect x="195" y="40" width="84" height="6" rx="2" fill="#161e2b" />
              <line x1="215" y1="13" x2="215" y2="46" stroke="#111827" strokeWidth="2" />
              <line x1="237" y1="13" x2="237" y2="46" stroke="#111827" strokeWidth="2" />
              <line x1="259" y1="13" x2="259" y2="46" stroke="#111827" strokeWidth="2" />
              {/* wheels */}
              <circle cx="210" cy="46" r="9" fill="#0f172a" stroke="#64748b" strokeWidth="2" />
              <circle cx="210" cy="46" r="3.5" fill="#94a3b8" />
              <circle cx="210" cy="46" r="1.5" fill="#1e293b" />
              <circle cx="263" cy="46" r="9" fill="#0f172a" stroke="#64748b" strokeWidth="2" />
              <circle cx="263" cy="46" r="3.5" fill="#94a3b8" />
              <circle cx="263" cy="46" r="1.5" fill="#1e293b" />
            </svg>
          </div>

          {/* Bottom shadow/reflection on ground */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '20px', background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.4))' }} />

          {/* "STOP" road text painted on ground (before left barrier) */}
          <div style={{
            position: 'absolute',
            bottom: '30px',
            left: 'calc(50% - 52px)',
            width: '40px',
            fontSize: '7px',
            fontWeight: 900,
            letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.15)',
            textAlign: 'center',
            transform: 'rotate(-90deg)',
            transformOrigin: 'center center',
            userSelect: 'none',
          }}>
            STOP
          </div>
        </div>

        {/* ── Message ── */}
        <div className="space-y-5">
          <div className="space-y-1">
            <p className="text-base text-gray-300">
              <span className="font-bold text-amber-400">Bądź bezpieczny</span> — nie przechodź przez zamknięty przejazd!
            </p>
            <p className="text-sm text-gray-600">
              Poczekaj aż szlabany się podniosą, czyli wróć na właściwą stronę.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
                <path d="M3 12h18M3 12l7-7M3 12l7 7" />
              </svg>
              Wróć do dashboardu
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-700 px-6 py-2.5 text-sm font-medium text-gray-400 transition hover:border-gray-600 hover:text-white"
            >
              Strona główna
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

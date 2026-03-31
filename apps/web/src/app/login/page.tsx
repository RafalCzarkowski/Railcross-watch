'use client'

import { useEffect, useState } from 'react'

function useCctvTime() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const fmt = () => {
      const now = new Date()
      const d = now.toISOString().slice(0, 10)
      const t = now.toTimeString().slice(0, 8)
      setTime(`${d}  ${t}`)
    }
    fmt()
    const id = setInterval(fmt, 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

export default function LoginPage() {
  const time = useCctvTime()
  return (
    <main className="flex min-h-screen">

      {/* Lewa strona — branding */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gray-950 p-12 lg:flex">

        {/* Siatka w tle */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Dekoracyjne okręgi */}
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-600 opacity-20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-violet-600 opacity-20 blur-3xl" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
            <RailIcon />
          </div>
          <span className="text-lg font-semibold text-white">railcross-watch</span>
        </div>

        {/* Środkowa grafika */}
        <div className="relative flex flex-col items-center justify-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-indigo-500 opacity-20 blur-2xl" />
            <div className="relative rounded-3xl border border-white/10 bg-white/5 p-10 backdrop-blur-sm">
              <TrainCrossing />
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">Monitoring przejazdów</h2>
            <p className="mt-2 text-sm text-gray-400">
              Inteligentna analiza wideo - wykrywaj zagrożenia szybciej niż ludzkie oko
            </p>
          </div>
        </div>

        {/* Stopka */}
        <p className="relative text-xs text-gray-600">&copy; 2026 railcross-watch</p>
      </div>

      {/* Prawa strona — formularz */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-gray-50 px-6 py-12">

        <style>{`
          @keyframes float-a {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          @keyframes float-b {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
          @keyframes float-c {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-12px); }
          }
          @keyframes static-noise {
            0%, 69%, 100% { opacity: 0; }
            70% { opacity: 1; }
            71% { opacity: 0.6; }
            72% { opacity: 1; }
            73% { opacity: 0.3; }
            74% { opacity: 0.8; }
            75% { opacity: 0; }
          }
          @keyframes card-static {
            0%, 69%, 76%, 100% {
              filter: none;
              opacity: 1;
            }
            70%, 72%, 74% {
              filter: grayscale(1) contrast(2) brightness(1.8);
              opacity: 0.7;
            }
            71%, 73%, 75% {
              filter: grayscale(1) brightness(0.4);
              opacity: 0.5;
            }
          }
          @keyframes cam-rotate {
            0%   { transform: rotate(-30deg); }
            40%  { transform: rotate(30deg); }
            60%  { transform: rotate(30deg); }
            100% { transform: rotate(-30deg); }
          }
          @keyframes cam-blink {
            0%, 49%, 100% { opacity: 1; }
            50%, 99%      { opacity: 0; }
          }
          @keyframes scanline {
            0% { top: -2px; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
          .float-a { animation: float-a 5s ease-in-out infinite, card-static 8s steps(1) infinite; }
          .float-b { animation: float-b 6s ease-in-out infinite 1s, card-static 11s steps(1) infinite 3s; }
          .float-c { animation: float-c 7s ease-in-out infinite 2.5s, card-static 9s steps(1) infinite 6s; }
          .noise-overlay { animation: static-noise 8s steps(1) infinite; }
          .noise-overlay-b { animation: static-noise 11s steps(1) infinite 3s; }
          .noise-overlay-c { animation: static-noise 9s steps(1) infinite 6s; }
          .cam-lens { animation: cam-rotate 6s ease-in-out infinite; transform-origin: 50% 80%; }
          .cam-dot { animation: cam-blink 1.2s steps(1) infinite; }
          .scanline { animation: scanline 4s linear infinite; }
          @keyframes float-d {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-14px) rotate(6deg); }
          }
          @keyframes float-e {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-9px) rotate(-8deg); }
          }
          @keyframes float-f {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-11px) rotate(5deg); }
          }
          @keyframes float-g {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-7px) rotate(-4deg); }
          }
          .float-d { animation: float-d 7s ease-in-out infinite 0.5s; }
          .float-e { animation: float-e 9s ease-in-out infinite 2s; }
          .float-f { animation: float-f 6s ease-in-out infinite 4s; }
          .float-g { animation: float-g 8s ease-in-out infinite 1.5s; }
          @keyframes signal-1 { 0%,100%{opacity:0.9} 30%{opacity:0.2} 60%{opacity:1} }
          @keyframes signal-2 { 0%,100%{opacity:0.9} 20%{opacity:0.1} 50%{opacity:0.3} 70%{opacity:0.9} }
          @keyframes signal-3 { 0%,100%{opacity:0.9} 10%{opacity:0.1} 40%{opacity:0.2} 80%{opacity:0.8} }
          .sig-1 { animation: signal-1 3s steps(1) infinite; }
          .sig-2 { animation: signal-2 3s steps(1) infinite 0.4s; }
          .sig-3 { animation: signal-3 3s steps(1) infinite 0.8s; }
          @keyframes gps-ping {
            0% { transform: scale(1); opacity: 0.8; }
            100% { transform: scale(2.8); opacity: 0; }
          }
          .gps-ping { animation: gps-ping 2s ease-out infinite; }
          .gps-ping-b { animation: gps-ping 2s ease-out infinite 0.7s; }
          .gps-ping-c { animation: gps-ping 2s ease-out infinite 1.4s; }
        `}</style>

        {/* Dot grid w tle */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle, #374151 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Narożniki celownika */}
        <div className="pointer-events-none absolute inset-8 select-none">
          {/* lewy górny */}
          <div className="absolute left-0 top-0 h-5 w-5 border-l-2 border-t-2 border-red-400/30" />
          {/* prawy górny */}
          <div className="absolute right-0 top-0 h-5 w-5 border-r-2 border-t-2 border-red-400/30" />
          {/* lewy dolny */}
          <div className="absolute bottom-0 left-0 h-5 w-5 border-b-2 border-l-2 border-red-400/30" />
          {/* prawy dolny */}
          <div className="absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 border-red-400/30" />
        </div>

        {/* Vignette */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.18) 100%)',
          }}
        />

        {/* Timestamp CCTV */}
        <div className="pointer-events-none absolute bottom-10 left-10 select-none font-mono text-xs tracking-widest text-red-500">
          CAM-01 &nbsp; {time}
        </div>

        {/* Badge REC */}
        <div className="pointer-events-none absolute right-10 top-10 flex items-center gap-1.5 select-none">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <span className="text-xs font-bold tracking-widest text-red-500/60">REC</span>
        </div>

        {/* Scan line + glow */}
        <div className="scanline pointer-events-none absolute left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_3px_rgba(239,68,68,0.6)]" />
        <div className="scanline pointer-events-none absolute left-0 h-16 w-full bg-gradient-to-b from-red-500/10 to-transparent" style={{ animationDuration: '4s' }} />

        {/* Pływające karty statystyk */}
        <div className="float-a pointer-events-none absolute left-6 top-16 select-none opacity-60">
          <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-white/90 px-4 py-3 shadow-md">
            <p className="text-xs font-medium text-gray-400">Przejazdy dziś</p>
            <p className="text-xl font-bold text-gray-700">247</p>
            <div className="noise-overlay absolute inset-0 rounded-xl" style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.08) 0px, rgba(180,180,180,0.15) 1px, rgba(255,255,255,0.1) 2px, rgba(100,100,100,0.1) 3px)', backgroundSize: '100% 3px' }} />
          </div>
        </div>

        <div className="float-b pointer-events-none absolute bottom-28 left-8 select-none opacity-60">
          <div className="relative overflow-hidden rounded-xl border border-red-200 bg-white/90 px-4 py-3 shadow-md">
            <p className="text-xs font-medium text-gray-400">Aktywne alerty</p>
            <p className="text-xl font-bold text-red-500">3</p>
            <div className="noise-overlay-b absolute inset-0 rounded-xl" style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.08) 0px, rgba(180,180,180,0.15) 1px, rgba(255,255,255,0.1) 2px, rgba(100,100,100,0.1) 3px)', backgroundSize: '100% 3px' }} />
          </div>
        </div>

        <div className="float-c pointer-events-none absolute right-6 top-1/3 select-none opacity-60">
          <div className="relative overflow-hidden rounded-xl border border-green-200 bg-white/90 px-4 py-3 shadow-md">
            <p className="text-xs font-medium text-gray-400">Dostępność</p>
            <p className="text-xl font-bold text-green-600">99.8%</p>
            <div className="noise-overlay-c absolute inset-0 rounded-xl" style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.08) 0px, rgba(180,180,180,0.15) 1px, rgba(255,255,255,0.1) 2px, rgba(100,100,100,0.1) 3px)', backgroundSize: '100% 3px' }} />
          </div>
        </div>

        {/* Pływająca ikona — kamera */}
        <div className="float-d pointer-events-none absolute right-12 top-20 select-none opacity-20">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 7 16 12 23 17V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
        </div>

        {/* Pływająca ikona — rogatka */}
        <div className="float-e pointer-events-none absolute left-12 top-1/2 select-none opacity-20">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="2" x2="12" y2="22"/><line x1="12" y1="6" x2="20" y2="6"/>
            <path d="M12 6 Q16 4 20 6"/>
          </svg>
        </div>

        {/* Pływająca ikona — ostrzeżenie */}
        <div className="float-f pointer-events-none absolute right-16 bottom-40 select-none opacity-20">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>

        {/* Pływająca ikona — sygnał transmisji z animacją zasięgu */}
        <div className="float-g pointer-events-none absolute left-8 top-1/2 select-none opacity-25">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path className="sig-3" d="M1.42 9a16 16 0 0 1 21.16 0" stroke="#374151" strokeWidth="1.5"/>
            <path className="sig-2" d="M5 12.55a11 11 0 0 1 14.08 0" stroke="#374151" strokeWidth="1.5"/>
            <path className="sig-1" d="M8.53 16.11a6 6 0 0 1 6.95 0" stroke="#374151" strokeWidth="1.5"/>
            <circle cx="12" cy="20" r="1" fill="#374151"/>
          </svg>
        </div>

        {/* GPS pingi */}
        <div className="pointer-events-none absolute left-16 top-2/3 select-none">
          <div className="relative flex h-3 w-3 items-center justify-center">
            <div className="gps-ping absolute h-3 w-3 rounded-full bg-red-400 opacity-40" />
            <div className="relative h-1.5 w-1.5 rounded-full bg-red-500 opacity-60" />
          </div>
        </div>

        <div className="pointer-events-none absolute right-20 top-1/4 select-none">
          <div className="relative flex h-3 w-3 items-center justify-center">
            <div className="gps-ping-b absolute h-3 w-3 rounded-full bg-amber-400 opacity-40" />
            <div className="relative h-1.5 w-1.5 rounded-full bg-amber-500 opacity-60" />
          </div>
        </div>

        <div className="pointer-events-none absolute right-8 bottom-52 select-none">
          <div className="relative flex h-3 w-3 items-center justify-center">
            <div className="gps-ping-c absolute h-3 w-3 rounded-full bg-red-400 opacity-40" />
            <div className="relative h-1.5 w-1.5 rounded-full bg-red-500 opacity-60" />
          </div>
        </div>

        {/* Logo mobilne */}
        <div className="mb-10 flex items-center gap-2 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-950">
            <RailIcon className="text-white" size={16} />
          </div>
          <span className="font-semibold text-gray-900">railcross-watch</span>
        </div>

        <div className="w-full max-w-sm">

          {/* Badge systemu */}
          <div className="mb-6 flex justify-center">
            <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
              </span>
              <span className="text-xs font-medium text-amber-700">System monitorowania · Aktywny</span>
            </div>
          </div>

          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Zaloguj się</h1>
            <div className="mt-2 flex items-center justify-center gap-2">
              {/* Miniaturowa animowana kamera */}
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Podstawa słupka */}
                <rect x="13" y="18" width="2" height="6" rx="1" fill="#9ca3af"/>
                {/* Obudowa kamery - obraca się */}
                <g className="cam-lens">
                  <rect x="7" y="10" width="14" height="9" rx="3" fill="#374151"/>
                  <circle cx="14" cy="14" r="3.5" fill="#1f2937"/>
                  <circle cx="14" cy="14" r="2" fill="#111827"/>
                  <circle cx="15" cy="13" r="0.7" fill="#6366f1" opacity="0.8"/>
                </g>
                {/* Dioda */}
                <circle cx="19" cy="11" r="1.5" fill="#ef4444" className="cam-dot"/>
              </svg>
              <span className="text-sm text-gray-500">Identyfikacja operatora</span>
            </div>
          </div>

          {/* Social login */}
          <div className="flex flex-col gap-3">
            <button className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-xs transition hover:bg-gray-50 active:scale-[0.99]">
              <GoogleIcon />
              Kontynuuj z Google
            </button>
            <button className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-xs transition hover:bg-gray-50 active:scale-[0.99]">
              <GitHubIcon />
              Kontynuuj z GitHub
            </button>
          </div>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">lub email i hasło</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {/* Formularz */}
          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="ty@us.edu.pl"
                className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-amber-400 focus:ring-3 focus:ring-amber-100"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Hasło
                </label>
                <a href="#" className="text-xs text-amber-600 hover:text-amber-800">
                  Zapomniałeś hasła?
                </a>
              </div>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-amber-400 focus:ring-3 focus:ring-amber-100"
              />
            </div>
            <button
              type="submit"
              className="mt-1 w-full rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-gray-950 transition hover:bg-amber-300 active:scale-[0.99]"
            >
              Zaloguj się
            </button>
          </form>

          {/* Stopka bezpieczeństwa */}
          <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>Połączenie szyfrowane · TLS 1.3</span>
          </div>

        </div>
      </div>
    </main>
  )
}

function RailIcon({ className, size = 18 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
      <line x1="20" y1="22" x2="20" y2="15" />
    </svg>
  )
}

function TrainCrossing() {
  return (
    <div className="relative">
      <style>{`
        @keyframes pulse-light {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.15; }
        }
        @keyframes scan-line {
          0% { transform: translateY(0px); opacity: 0.6; }
          100% { transform: translateY(140px); opacity: 0; }
        }
        @keyframes fov-pulse {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.35; }
        }
        @keyframes barrier-down {
          0%, 40% { transform: rotate(0deg); }
          50%, 100% { transform: rotate(-75deg); }
        }
        .pulse-light { animation: pulse-light 1s ease-in-out infinite; }
        .scan-line { animation: scan-line 3s linear infinite; }
        .fov-pulse { animation: fov-pulse 2s ease-in-out infinite; }
        .barrier { transform-origin: 2px 2px; animation: barrier-down 4s ease-in-out infinite; }
      `}</style>

      <svg width="200" height="155" viewBox="0 0 200 155" fill="none" xmlns="http://www.w3.org/2000/svg">

        {/* === KAMERA CCTV — lewy górny === */}
        {/* Słup */}
        <rect x="18" y="40" width="4" height="70" rx="2" fill="#94a3b8" opacity="0.7"/>
        {/* Ramię */}
        <rect x="18" y="40" width="22" height="4" rx="2" fill="#94a3b8" opacity="0.7"/>
        {/* Obudowa kamery */}
        <rect x="34" y="32" width="20" height="12" rx="3" fill="#cbd5e1" opacity="0.9"/>
        <circle cx="57" cy="38" r="4" fill="#1e293b" opacity="0.9"/>
        <circle cx="57" cy="38" r="2" fill="#0f172a"/>
        {/* Pole widzenia kamery — trójkąt */}
        <polygon
          points="57,38 110,15 110,62"
          fill="#fbbf24"
          className="fov-pulse"
        />
        {/* Linia skanowania w polu widzenia */}
        <line
          x1="57" y1="38" x2="110" y2="38"
          stroke="#fbbf24"
          strokeWidth="1.5"
          opacity="0.8"
          className="scan-line"
          style={{ transformOrigin: '57px 38px' }}
        />
        {/* Czerwona dioda kamery */}
        <circle cx="36" cy="34" r="2.5" fill="#ef4444" className="pulse-light"/>

        {/* === TORY === */}
        <line x1="0" y1="120" x2="200" y2="120" stroke="#4f46e5" strokeWidth="3" strokeDasharray="12 6" opacity="0.6"/>
        <line x1="0" y1="135" x2="200" y2="135" stroke="#4f46e5" strokeWidth="3" strokeDasharray="12 6" opacity="0.6"/>
        {[15, 45, 75, 105, 135, 165, 190].map((x) => (
          <rect key={x} x={x} y="116" width="6" height="24" rx="2" fill="#6366f1" opacity="0.35"/>
        ))}

        {/* === POCIĄG === */}
        <rect x="20" y="72" width="105" height="52" rx="8" fill="#4f46e5" opacity="0.9"/>
        <rect x="26" y="78" width="93" height="32" rx="4" fill="#6366f1" opacity="0.4"/>
        {[34, 62, 90].map((x) => (
          <rect key={x} x={x} y="83" width="22" height="20" rx="3" fill="#c7d2fe" opacity="0.9"/>
        ))}
        {/* Koła */}
        <circle cx="50" cy="122" r="9" fill="#3730a3"/>
        <circle cx="50" cy="122" r="4.5" fill="#6366f1"/>
        <circle cx="100" cy="122" r="9" fill="#3730a3"/>
        <circle cx="100" cy="122" r="4.5" fill="#6366f1"/>

        {/* === ROGATKA === */}
        {/* Słup rogatki */}
        <rect x="158" y="50" width="5" height="75" rx="2" fill="#e2e8f0" opacity="0.7"/>
        {/* Ramię rogatki — animowane */}
        <g className="barrier">
          <rect x="160" y="52" width="38" height="5" rx="2" fill="#ef4444" opacity="0.9"/>
          {/* Paski ostrzegawcze */}
          {[0, 1, 2].map((i) => (
            <rect key={i} x={168 + i * 10} y="52" width="5" height="5" rx="1" fill="#fbbf24" opacity="0.9"/>
          ))}
        </g>

        {/* === SYGNALIZATOR === */}
        {/* Obudowa */}
        <rect x="150" y="22" width="18" height="28" rx="4" fill="#1e293b" opacity="0.9"/>
        {/* Czerwone — miga */}
        <circle cx="159" cy="31" r="5" fill="#ef4444" className="pulse-light"/>
        <circle cx="159" cy="31" r="2.5" fill="#fca5a5" className="pulse-light"/>
        {/* Zielone — wyłączone */}
        <circle cx="159" cy="43" r="5" fill="#166534" opacity="0.5"/>

      </svg>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
    </svg>
  )
}

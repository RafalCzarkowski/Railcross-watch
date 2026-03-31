export default function LoginPage() {
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
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12">

        {/* Logo mobilne */}
        <div className="mb-10 flex items-center gap-2 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-950">
            <RailIcon className="text-white" size={16} />
          </div>
          <span className="font-semibold text-gray-900">railcross-watch</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Zaloguj się</h1>
            <p className="mt-1 text-sm text-gray-500">Witaj z powrotem</p>
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
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-xs text-gray-400">lub email i hasło</span>
            <div className="h-px flex-1 bg-gray-100" />
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
                className="rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Hasło
                </label>
                <a href="#" className="text-xs text-indigo-600 hover:text-indigo-800">
                  Zapomniałeś hasła?
                </a>
              </div>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                className="rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100"
              />
            </div>
            <button
              type="submit"
              className="mt-1 w-full rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 active:scale-[0.99]"
            >
              Zaloguj się
            </button>
          </form>

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

'use client';

import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? '/api';

const STEPS = [
  {
    title: 'Witaj w RailCross Watch!',
    body: 'System monitorowania przejazdów kolejowych. Możesz wgrywać nagrania, uruchamiać analizę i zarządzać użytkownikami.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-10 w-10 text-amber-400">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    title: 'Nagrania przejazdów',
    body: 'W sekcji "Nagrania" możesz wgrywać pliki wideo lub dodawać linki YouTube/Stream. Użyj tagów i lokalizacji, aby łatwiej organizować materiały.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-10 w-10 text-sky-400">
        <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.89L15 14" />
        <rect x="1" y="6" width="15" height="12" rx="2" />
      </svg>
    ),
  },
  {
    title: 'Analiza',
    body: 'Sekcja "Analiza" pozwala przeglądać wyniki analizy nagrań — algorytm YOLO/OpenCV wykrywa obiekty i oznacza je ramkami na nagraniu.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-10 w-10 text-purple-400">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
        <path d="M9 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: 'Ustawienia konta',
    body: 'W ustawieniach (ikona koła zębatego) możesz włączyć weryfikację dwuetapową (MFA) i zarządzać bezpieczeństwem swojego konta.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-10 w-10 text-green-400">
        <circle cx="12" cy="8" r="4" />
        <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
      </svg>
    ),
  },
];

interface Props {
  onComplete: () => void;
}

export default function OnboardingTour({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [completing, setCompleting] = useState(false);

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  async function finish() {
    setCompleting(true);
    try {
      await fetch(`${API}/auth/onboarding/complete`, { method: 'POST', credentials: 'include' });
    } catch { /* non-critical */ }
    onComplete();
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
        {/* Progress bar */}
        <div className="flex gap-1 p-4 pb-0">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= step ? 'bg-amber-500' : 'bg-gray-700'}`}
            />
          ))}
        </div>

        <div className="p-8 text-center">
          <div className="mb-5 flex justify-center">{current.icon}</div>
          <h2 className="mb-2 text-lg font-bold text-white">{current.title}</h2>
          <p className="text-sm leading-relaxed text-gray-400">{current.body}</p>
        </div>

        <div className="flex items-center justify-between border-t border-gray-800 px-6 py-4">
          <button
            onClick={finish}
            disabled={completing}
            className="text-xs text-gray-500 transition hover:text-gray-300 disabled:opacity-40"
          >
            Pomiń tour
          </button>

          <div className="flex items-center gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 transition hover:border-gray-600 hover:text-white"
              >
                Wstecz
              </button>
            )}
            <button
              onClick={isLast ? finish : () => setStep((s) => s + 1)}
              disabled={completing}
              className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-50"
            >
              {isLast ? (completing ? 'Zapisywanie…' : 'Zaczynajmy!') : 'Dalej'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

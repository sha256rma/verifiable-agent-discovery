'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { COMFORT_SCALE, SURVEY_COPY } from '@/lib/demo';
import type { LargerPaymentAnswer, SurveyPhase } from '@/lib/types';

const LARGER_OPTIONS: { value: LargerPaymentAnswer; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'no', label: 'No' }
];

/**
 * The measurement.
 *
 * Asked twice: once after a payment has gone through with no verification, and
 * again after the participant has watched a mismatch stop one. The comparison
 * between those two comfort ratings is the entire output of this prototype, so
 * the phase is recorded alongside every answer.
 *
 * No name, no email, nothing identifying — a participant is a counter.
 */
export function TrustSurvey({
  phase,
  onSubmit
}: {
  phase: SurveyPhase;
  onSubmit: (answers: {
    comfort: number | null;
    larger: LargerPaymentAnswer | null;
    freeText: string | null;
  }) => Promise<void>;
}) {
  const copy = SURVEY_COPY[phase];
  const [comfort, setComfort] = useState<number | null>(null);
  const [larger, setLarger] = useState<LargerPaymentAnswer | null>(null);
  const [freeText, setFreeText] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function send() {
    setBusy(true);
    try {
      await onSubmit({ comfort, larger, freeText: freeText.trim() || null });
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card animate-pop-in flex items-center gap-2.5 px-4 py-3.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">
          <Check className="h-3 w-3" strokeWidth={3.5} />
        </span>
        <p className="text-sm font-medium text-ink-muted">Thank you.</p>
      </div>
    );
  }

  return (
    <div className="card animate-fade-up overflow-hidden">
      <div className="border-b border-line bg-sunken px-4 py-3">
        <span className="label-eyebrow text-ink-muted">{copy.eyebrow}</span>
      </div>

      <div className="space-y-5 px-4 py-4">
        <fieldset>
          <legend className="text-[15px] font-semibold leading-snug text-ink">{copy.comfort}</legend>
          <div className="mt-3 space-y-1.5">
            {COMFORT_SCALE.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setComfort(option.value)}
                aria-pressed={comfort === option.value}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                  comfort === option.value
                    ? 'border-ink bg-ink text-ink-invert'
                    : 'border-line bg-surface text-ink-muted'
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                    comfort === option.value ? 'bg-white/15' : 'bg-sunken text-ink'
                  }`}
                >
                  {option.value}
                </span>
                <span className="text-sm font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-[15px] font-semibold leading-snug text-ink">{copy.larger}</legend>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {LARGER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setLarger(option.value)}
                aria-pressed={larger === option.value}
                className={`rounded-xl border px-2 py-3 text-sm font-semibold transition-colors ${
                  larger === option.value
                    ? 'border-ink bg-ink text-ink-invert'
                    : 'border-line bg-surface text-ink-muted'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        {copy.freeText ? (
          <div>
            <label htmlFor="survey-free-text" className="text-[15px] font-semibold leading-snug text-ink">
              {copy.freeText}
            </label>
            <textarea
              id="survey-free-text"
              value={freeText}
              onChange={(event) => setFreeText(event.target.value)}
              rows={3}
              placeholder="Optional"
              className="mt-3 w-full resize-none rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-ink"
            />
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => void send()}
          disabled={busy || (comfort === null && larger === null && !freeText.trim())}
          className="btn-primary w-full"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Submit
        </button>
      </div>
    </div>
  );
}

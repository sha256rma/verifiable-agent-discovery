'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Lock, ShieldOff } from 'lucide-react';
import {
  COMFORT_SCALE,
  MATTERED_OPTIONS,
  NOTICED_OPTIONS,
  SPEND_BANDS,
  SURVEY,
  SWITCH_OPTIONS
} from '@/lib/demo';
import type { SurveyAnswers } from '@/lib/types';

/**
 * The measurement.
 *
 * Shown ONCE, only after the participant has seen both a payment that nobody
 * checked and a payment that got stopped. An earlier version asked about
 * comfort straight after the unverified payment, which primed them to go
 * looking for a problem before they had been shown one and contaminated the
 * baseline. Asking both conditions retrospectively keeps the comparison and
 * removes the cue.
 *
 * Question order is deliberate:
 *   1-2  comfort, without then with        the headline delta
 *   3-4  spend limit, without then with    the real outcome — "willingness to
 *                                          delegate" is literally an amount,
 *                                          and a band is harder to answer
 *                                          politely than a 1-5 rating
 *   5    did you notice?                   tests whether the problem is
 *                                          genuinely invisible. If people say
 *                                          they spotted it, the premise is
 *                                          weaker than we think
 *   6    which half mattered?              separates "it blocked the payment"
 *                                          from "I could see what ran" — these
 *                                          are different products
 *   7    would you switch?                 willingness to act, not just to feel
 *   8    free text                          the quote you will actually reuse
 *
 * Every field is optional and submit is always live, because a partial answer
 * is real data and someone walking away mid-survey should not cost us the
 * answers they did give.
 */
export function TrustSurvey({
  onSubmit
}: {
  onSubmit: (answers: SurveyAnswers) => Promise<void>;
}) {
  const root = useRef<HTMLDivElement | null>(null);
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [freeText, setFreeText] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // This card is taller than a phone screen, so it puts its own top edge at the
  // top of the viewport rather than letting the transcript scroll past it.
  useEffect(() => {
    root.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  function set<K extends keyof SurveyAnswers>(key: K, value: SurveyAnswers[K]) {
    setAnswers((current) => ({ ...current, [key]: value }));
  }

  async function send() {
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ ...answers, freeText: freeText.trim() || null });
      setDone(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save that. Try once more?');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card animate-pop-in flex items-center gap-2.5 px-4 py-3.5">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-white">
          <Check className="h-3 w-3" strokeWidth={3.5} />
        </span>
        <p className="text-sm font-medium text-ink-muted">Saved — thank you.</p>
      </div>
    );
  }

  const answered = Object.values(answers).filter((v) => v !== null && v !== undefined).length;

  return (
    <div ref={root} className="card animate-fade-up overflow-hidden scroll-mt-2">
      <div className="border-b border-line bg-sunken px-4 py-3">
        <p className="text-sm font-semibold text-ink">{SURVEY.intro}</p>
      </div>

      <div className="space-y-6 px-4 py-4">
        {/* 1-2 — the headline delta */}
        <ScaleQuestion
          label={SURVEY.comfortWithout}
          badge="unchecked"
          value={answers.comfortWithout ?? null}
          onPick={(v) => set('comfortWithout', v)}
        />
        <ScaleQuestion
          label={SURVEY.comfortWith}
          badge="checked"
          value={answers.comfortWith ?? null}
          onPick={(v) => set('comfortWith', v)}
        />

        <div className="divider" />

        {/* 3-4 — the real outcome */}
        <ChoiceQuestion
          label={SURVEY.limitWithout}
          badge="unchecked"
          options={SPEND_BANDS}
          value={answers.limitWithout ?? null}
          onPick={(v) => set('limitWithout', v as SurveyAnswers['limitWithout'])}
        />
        <ChoiceQuestion
          label={SURVEY.limitWith}
          badge="checked"
          options={SPEND_BANDS}
          value={answers.limitWith ?? null}
          onPick={(v) => set('limitWith', v as SurveyAnswers['limitWith'])}
        />

        <div className="divider" />

        {/* 5-7 */}
        <ChoiceQuestion
          label={SURVEY.noticedSwap}
          options={NOTICED_OPTIONS}
          columns={3}
          value={answers.noticedSwap ?? null}
          onPick={(v) => set('noticedSwap', v as SurveyAnswers['noticedSwap'])}
        />
        <ChoiceQuestion
          label={SURVEY.whatMattered}
          options={MATTERED_OPTIONS}
          value={answers.whatMattered ?? null}
          onPick={(v) => set('whatMattered', v as SurveyAnswers['whatMattered'])}
        />
        <ChoiceQuestion
          label={SURVEY.wouldSwitch}
          options={SWITCH_OPTIONS}
          columns={3}
          value={answers.wouldSwitch ?? null}
          onPick={(v) => set('wouldSwitch', v as SurveyAnswers['wouldSwitch'])}
        />

        <div className="divider" />

        {/* 8 */}
        <div>
          <label htmlFor="survey-free-text" className="text-[15px] font-semibold leading-snug text-ink">
            {SURVEY.freeText}
          </label>
          <textarea
            id="survey-free-text"
            value={freeText}
            onChange={(event) => setFreeText(event.target.value)}
            rows={3}
            placeholder="Optional"
            className="mt-2.5 w-full resize-none rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-ink"
          />
        </div>

        {error ? (
          <p className="rounded-xl border border-warn/30 bg-warn-wash px-4 py-3 text-sm font-medium text-ink-muted">
            {error}
          </p>
        ) : null}

        <button type="button" onClick={() => void send()} disabled={busy} className="btn-primary w-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {answered === 0 && !freeText.trim() ? 'Skip' : 'Submit'}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * The condition badge. The two paired questions are only meaningful if the
 * participant is certain which of the two payments each one is about, and a
 * lock/no-lock chip does that faster than re-reading the sentence.
 */
function ConditionBadge({ kind }: { kind: 'checked' | 'unchecked' }) {
  const checked = kind === 'checked';
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
        checked ? 'border-brand/25 bg-brand/10 text-brand' : 'border-warn/25 bg-warn/10 text-warn'
      }`}
    >
      {checked ? (
        <Lock className="h-2.5 w-2.5" strokeWidth={3} />
      ) : (
        <ShieldOff className="h-2.5 w-2.5" strokeWidth={3} />
      )}
      {checked ? 'Checked' : 'Not checked'}
    </span>
  );
}

function QuestionHead({ label, badge }: { label: string; badge?: 'checked' | 'unchecked' }) {
  return (
    <div>
      {badge ? (
        <div className="mb-1.5">
          <ConditionBadge kind={badge} />
        </div>
      ) : null}
      <p className="text-[15px] font-semibold leading-snug text-ink">{label}</p>
    </div>
  );
}

function ScaleQuestion({
  label,
  badge,
  value,
  onPick
}: {
  label: string;
  badge?: 'checked' | 'unchecked';
  value: number | null;
  onPick: (value: number) => void;
}) {
  return (
    <fieldset>
      <QuestionHead label={label} badge={badge} />
      {/* A 1-5 row of numbers rather than five stacked rows: it keeps the two
          paired questions close enough together to actually compare. */}
      <div className="mt-2.5 grid grid-cols-5 gap-1.5">
        {COMFORT_SCALE.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onPick(option.value)}
            aria-pressed={value === option.value}
            aria-label={`${option.value} — ${option.label}`}
            className={`rounded-xl border py-2.5 text-base font-bold transition-colors ${
              value === option.value
                ? 'border-ink bg-ink text-ink-invert'
                : 'border-line bg-surface text-ink-muted'
            }`}
          >
            {option.value}
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-2xs text-ink-subtle">
        <span>{COMFORT_SCALE[0].label}</span>
        <span>{COMFORT_SCALE[4].label}</span>
      </div>
    </fieldset>
  );
}

function ChoiceQuestion({
  label,
  badge,
  options,
  value,
  onPick,
  columns = 1
}: {
  label: string;
  badge?: 'checked' | 'unchecked';
  options: readonly { value: string; label: string }[];
  value: string | null;
  onPick: (value: string) => void;
  columns?: 1 | 3;
}) {
  return (
    <fieldset>
      <QuestionHead label={label} badge={badge} />
      <div className={`mt-2.5 ${columns === 3 ? 'grid grid-cols-3 gap-2' : 'space-y-1.5'}`}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onPick(option.value)}
            aria-pressed={value === option.value}
            className={`w-full rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
              columns === 3 ? 'text-center' : 'text-left'
            } ${
              value === option.value
                ? 'border-ink bg-ink text-ink-invert'
                : 'border-line bg-surface text-ink-muted'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

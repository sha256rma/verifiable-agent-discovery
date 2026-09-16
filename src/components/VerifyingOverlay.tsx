'use client';

import { Check, Loader2, ShieldQuestion } from 'lucide-react';
import { VERIFY_STAGES } from '@/lib/demo';

/**
 * The verification beat.
 *
 * Three named stages rather than one spinner, because the participant needs to
 * understand that something specific is being checked. The stage labels are the
 * only explanation of the mechanism the demo gives before the verdict — spec
 * asks us NOT to teach commitment schemes here.
 */
export function VerifyingOverlay({ stage }: { stage: number }) {
  return (
    <div className="card animate-fade-up overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line bg-sunken px-4 py-3">
        <ShieldQuestion className="h-4 w-4 text-ink-muted" strokeWidth={2.2} />
        <span className="label-eyebrow text-ink-muted">Verifying AI execution…</span>
      </div>

      <ol className="space-y-3 px-4 py-4">
        {VERIFY_STAGES.map((label, index) => {
          const done = index < stage;
          const active = index === stage;
          return (
            <li key={label} className="flex items-center gap-3">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
                  done
                    ? 'border-brand bg-brand text-white'
                    : active
                      ? 'border-ink-subtle text-ink-muted'
                      : 'border-line text-ink-subtle'
                }`}
              >
                {done ? (
                  <Check className="h-3 w-3" strokeWidth={3.5} />
                ) : active ? (
                  <Loader2 className="h-3 w-3 animate-spin" strokeWidth={3} />
                ) : null}
              </span>
              <span
                className={`text-sm transition-colors duration-300 ${
                  done || active ? 'font-medium text-ink' : 'text-ink-subtle'
                }`}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** The verification-OFF equivalent: one soft beat, no mechanism implied. */
export function ProcessingBubble() {
  return (
    <div className="flex animate-fade-up items-center gap-2.5 px-1">
      <Loader2 className="h-4 w-4 animate-spin text-ink-subtle" />
      <span className="text-sm text-ink-muted">AI is processing…</span>
    </div>
  );
}

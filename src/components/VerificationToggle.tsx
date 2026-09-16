'use client';

import { Lock, ShieldOff } from 'lucide-react';
import { TOGGLE_COPY } from '@/lib/demo';

/**
 * The independent variable, and the only control on the customer phone.
 *
 * Presented as a settings row rather than a bare switch: an icon that changes
 * state, a name, and one line saying what the setting actually does right now.
 * The point is that a participant should be able to tell, at a glance and
 * without being prompted, whether anything is protecting them.
 */
export function VerificationToggle({
  on,
  onToggle
}: {
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors active:scale-[0.99] ${
        on ? 'border-brand/30 bg-brand/[0.05]' : 'border-line bg-surface'
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
          on ? 'bg-brand text-white' : 'bg-sunken text-ink-subtle'
        }`}
      >
        {on ? (
          <Lock className="h-4 w-4" strokeWidth={2.6} />
        ) : (
          <ShieldOff className="h-4 w-4" strokeWidth={2.6} />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="text-sm font-bold text-ink">{TOGGLE_COPY.label}</span>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${
              on ? 'text-brand' : 'text-ink-subtle'
            }`}
          >
            {on ? 'On' : 'Off'}
          </span>
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-ink-muted">
          {on ? TOGGLE_COPY.onDetail : TOGGLE_COPY.offDetail}
        </span>
      </span>

      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
          on ? 'bg-brand' : 'bg-line-strong'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200 ${
            on ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  );
}

'use client';

import { Loader2, Lock, ShieldOff, Zap } from 'lucide-react';
import { formatInr } from '@/lib/format';
import { DEFAULT_PAYMENT, type PaymentIntent } from '@/lib/demo';

/**
 * The confirmation step. One tap, no PIN pad — every extra step here is time the
 * participant spends on mechanics instead of on the question being asked.
 *
 * The footer states whether this particular payment will be checked, BEFORE
 * they commit to it. Putting it here rather than only on the receipt means the
 * difference between the two conditions is something they were told in advance,
 * not something revealed afterwards.
 */
export function PaymentCard({
  intent,
  verified,
  state,
  onConfirm
}: {
  intent: PaymentIntent;
  verified: boolean;
  state: 'pending' | 'working' | 'done';
  onConfirm: () => void;
}) {
  return (
    <div className="card animate-fade-up overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line bg-sunken px-4 py-3">
        <Zap className="h-4 w-4 text-ink-muted" strokeWidth={2.2} />
        <span className="label-eyebrow text-ink-muted">Confirm payment</span>
      </div>

      <div className="px-4 py-4">
        <p className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-subtle">
          {intent.label}
        </p>
        <p className="mt-1 text-[34px] font-bold leading-none tracking-tight text-ink">
          {formatInr(intent.amountPaise)}
        </p>
        <p className="mt-2 text-sm text-ink-muted">{intent.recipient}</p>
        {intent.label === DEFAULT_PAYMENT.label ? (
          <p className="mt-0.5 font-mono text-[11px] text-ink-subtle">
            {DEFAULT_PAYMENT.consumerNo}
          </p>
        ) : null}

        {state === 'done' ? null : (
          <>
            <button
              type="button"
              onClick={onConfirm}
              disabled={state === 'working'}
              className="btn-primary mt-4 w-full"
            >
              {state === 'working' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {state === 'working' ? 'Paying…' : `Pay ${formatInr(intent.amountPaise)}`}
            </button>

            <p
              className={`mt-2.5 flex items-center justify-center gap-1.5 text-center text-[11px] font-medium leading-tight ${
                verified ? 'text-brand-deep' : 'text-warn'
              }`}
            >
              {verified ? (
                <Lock className="h-3 w-3 shrink-0" strokeWidth={2.8} />
              ) : (
                <ShieldOff className="h-3 w-3 shrink-0" strokeWidth={2.8} />
              )}
              {verified
                ? 'The model will be checked before this is sent'
                : 'Nobody will check which model handles this'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import { CheckCircle2, HelpCircle, Lock, ShieldOff } from 'lucide-react';
import { UNVERIFIED_UNKNOWNS, VERIFIED_ASSURANCES } from '@/lib/demo';
import { formatInr, istStamp } from '@/lib/format';
import { VerdictRow, VerdictTable } from './VerdictTable';
import type { VerificationReceipt } from '@/lib/types';

/**
 * The completed-payment receipt, in two deliberately different versions.
 *
 * This component is where the experiment actually lives, so the difference
 * between the two is worth stating plainly:
 *
 *   NOT_PERFORMED  Reads like any UPI app: "Payment completed", a reference
 *                  number, a timestamp. It does NOT say "approved" — nothing
 *                  approved anything, and borrowing the language of a check
 *                  that never happened is the exact illusion this demo exists
 *                  to break. Underneath, it lists what nobody can tell you.
 *
 *   VALID          "Payment verified". A lock, the model that actually ran, and
 *                  three narrow things this establishes.
 *
 * The first version of this demo got the unverified case wrong: a clean receipt
 * with a reference number felt safe, which is precisely the failure mode. The
 * unknowns list is the fix, and it is stated as absence rather than as alarm —
 * the participant should draw the conclusion, not be handed it.
 */
export function PaymentApproved({
  receipt,
  onDetails
}: {
  receipt: VerificationReceipt;
  onDetails?: () => void;
}) {
  const verified = receipt.result === 'VALID';

  return (
    <div className={`card animate-pop-in overflow-hidden ${verified ? 'border-brand/30' : ''}`}>
      {/* Header */}
      <div
        className={`flex items-center gap-2 border-b px-4 py-3 ${
          verified ? 'border-brand/20 bg-brand/[0.07]' : 'border-line bg-sunken'
        }`}
      >
        {verified ? (
          <Lock className="h-4 w-4 shrink-0 text-brand" strokeWidth={2.6} />
        ) : (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-ink-muted" strokeWidth={2.4} />
        )}
        <span className={`label-eyebrow ${verified ? 'text-brand' : 'text-ink-muted'}`}>
          {verified ? 'Payment verified' : 'Payment completed'}
        </span>
      </div>

      <div className="px-4 py-4">
        {/* Amount */}
        <p className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-subtle">
          {receipt.payeeLabel}
        </p>
        <p
          className={`mt-1 text-3xl font-bold tracking-tight ${verified ? 'text-brand' : 'text-ink'}`}
        >
          {formatInr(receipt.amountPaise)}
        </p>
        <p className="mt-1 text-sm text-ink-muted">paid to {receipt.payeeName}</p>

        {/* Rail details — identical in both versions, because a real UPI
            receipt tells you this much and no more. */}
        <div className="card-inset mt-4 grid grid-cols-2 gap-3 px-3 py-3">
          <div>
            <p className="label-eyebrow">Reference</p>
            <p className="mt-0.5 break-all font-mono text-[11px] text-ink-muted">
              {receipt.transactionRef}
            </p>
          </div>
          <div>
            <p className="label-eyebrow">Status</p>
            <p className="mt-0.5 font-mono text-[11px] text-ink-muted">COMPLETED</p>
          </div>
        </div>

        <p className="mt-2.5 text-2xs text-ink-subtle">
          {istStamp(new Date(receipt.decidedAt))}
        </p>

        {verified ? (
          <>
            {/* What the check establishes. */}
            <div className="mt-4 rounded-xl border border-brand/25 bg-brand-wash px-3.5 py-3">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-deep">
                <Lock className="h-3 w-3" strokeWidth={2.8} />
                Checked before the money moved
              </p>
              <ul className="mt-2 space-y-1.5">
                {VERIFIED_ASSURANCES.map((line) => (
                  <li key={line} className="flex gap-2 text-xs leading-snug text-ink-muted">
                    <CheckCircle2
                      className="mt-0.5 h-3 w-3 shrink-0 text-brand"
                      strokeWidth={3}
                    />
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <VerdictTable className="mt-3">
              <VerdictRow label="Model that ran this" value={receipt.authorizedModel} />
              <VerdictRow label="Model ID" value={receipt.authorizedModelId} />
              <VerdictRow label="Fingerprint" value={receipt.authorizedCommitment} tone="brand" />
            </VerdictTable>
          </>
        ) : (
          /* The absence, stated plainly. */
          <div className="mt-4 rounded-xl border border-warn/30 bg-warn-wash px-3.5 py-3">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-warn">
              <ShieldOff className="h-3 w-3" strokeWidth={2.8} />
              What this receipt cannot tell you
            </p>
            <ul className="mt-2 space-y-1.5">
              {UNVERIFIED_UNKNOWNS.map((line) => (
                <li key={line} className="flex gap-2 text-xs leading-snug text-ink-muted">
                  <HelpCircle className="mt-0.5 h-3 w-3 shrink-0 text-warn" strokeWidth={2.6} />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}

        {onDetails ? (
          <button
            type="button"
            onClick={onDetails}
            className="mt-3 text-2xs font-bold uppercase tracking-wider text-ink-subtle underline decoration-line-strong underline-offset-4"
          >
            {verified ? 'View check details' : 'What was not checked?'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

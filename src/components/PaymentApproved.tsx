'use client';

import { BadgeCheck, CheckCircle2, ShieldCheck } from 'lucide-react';
import { formatInr, istStamp } from '@/lib/format';
import { VerdictRow, VerdictTable } from './VerdictTable';
import type { VerificationReceipt } from '@/lib/types';

/**
 * Approved-payment receipt. Covers both approval paths, and the difference
 * between them is the whole control/experiment contrast:
 *
 *   result = NOT_PERFORMED  verification was off. The receipt says nothing about
 *                           any model, because nothing was checked. This has to
 *                           feel completely smooth and unremarkable — that is
 *                           the vulnerability being demonstrated.
 *
 *   result = VALID          verification ran and matched, so the model identity
 *                           block appears above the payment confirmation.
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
    <div className="space-y-3">
      {verified ? (
        <div className="card animate-pop-in overflow-hidden border-brand/30">
          <div className="relative flex items-center justify-between gap-3 overflow-hidden border-b border-brand/20 bg-brand/[0.07] px-4 py-3">
            <span className="pointer-events-none absolute inset-y-0 -left-full w-1/2 animate-sweep bg-gradient-to-r from-transparent via-brand/10 to-transparent" />
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand" strokeWidth={2.4} />
              <span className="label-eyebrow text-ink-muted">Model verified</span>
            </span>
            <span className="pill-brand">
              <Check3 /> Match
            </span>
          </div>

          <VerdictTable className="px-4 py-1">
            <VerdictRow label="Model" value={receipt.authorizedModel} />
            <VerdictRow label="Model ID" value={receipt.authorizedModelId} />
            <VerdictRow label="Commitment" value={receipt.authorizedCommitment} tone="brand" />
            <VerdictRow label="Execution" value="VALID" tone="brand" />
          </VerdictTable>
        </div>
      ) : null}

      <div className="card animate-pop-in overflow-hidden border-brand/30">
        <div className="flex items-center gap-2 border-b border-brand/20 bg-brand/[0.07] px-4 py-3">
          <CheckCircle2 className="h-4 w-4 text-brand" strokeWidth={2.4} />
          <span className="label-eyebrow text-ink-muted">Payment approved</span>
        </div>

        <div className="px-4 py-4">
          <p className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-subtle">
            {receipt.payeeLabel}
          </p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-brand">
            {formatInr(receipt.amountPaise)}
          </p>
          <p className="mt-1 text-sm text-ink-muted">paid to {receipt.payeeName}</p>

          <div className="card-inset mt-4 grid grid-cols-2 gap-3 px-3 py-3">
            <div>
              <p className="label-eyebrow">Reference</p>
              <p className="mt-0.5 break-all font-mono text-[11px] text-ink-muted">
                {receipt.transactionRef}
              </p>
            </div>
            <div>
              <p className="label-eyebrow">Status</p>
              <p className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-brand">
                <BadgeCheck className="h-3 w-3" strokeWidth={3} /> COMPLETED
              </p>
            </div>
          </div>

          <p className="mt-3 text-2xs text-ink-subtle">{istStamp(new Date(receipt.decidedAt))}</p>

          {onDetails ? (
            <button
              type="button"
              onClick={onDetails}
              className="mt-3 text-2xs font-bold uppercase tracking-wider text-ink-subtle underline decoration-line-strong underline-offset-4"
            >
              View verification details
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Check3() {
  return <CheckCircle2 className="h-3 w-3" strokeWidth={3} />;
}

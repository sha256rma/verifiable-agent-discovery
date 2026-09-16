'use client';

import { Ban, HelpCircle, ShieldAlert, X } from 'lucide-react';
import { formatInr } from '@/lib/format';
import { PRODUCTION_NOTE, SIMULATION_LABEL } from '@/lib/demo';
import { VerdictRow, VerdictTable } from './VerdictTable';
import type { VerificationReceipt } from '@/lib/types';

/**
 * THE screen.
 *
 * It is a full takeover rather than another chat card, deliberately: the block
 * should not feel like the assistant declining, it should feel like something
 * underneath the assistant refusing to let the money move.
 *
 * The body is a comparison table and nothing else. No prose verdict, no "we
 * couldn't verify this" hedge, no apology. Two commitments, a cross, a result,
 * an action. The point a participant needs to reach on their own is that this is
 * an identity comparison rather than a judgement call — so the UI shows the
 * comparison and lets them draw it.
 */
export function VerificationFailed({
  receipt,
  onWhy,
  onDetails,
  onDismiss
}: {
  receipt: VerificationReceipt;
  onWhy: () => void;
  onDetails: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-base">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-safe pt-safe">
        {/* Verdict header */}
        <div className="animate-shake pt-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-danger/30 bg-danger-wash text-danger">
            <ShieldAlert className="h-6 w-6" strokeWidth={2.4} />
          </span>
          <h1 className="mt-4 text-[26px] font-bold leading-tight tracking-tight text-danger">
            Verification failed
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
            The model used for this computation does not match the model
            authorized by the customer.
          </p>
        </div>

        {/* The deterministic comparison */}
        <div className="card mt-5 overflow-hidden border-danger/30">
          <div className="border-b border-danger/20 bg-danger/[0.06] px-4 py-2.5">
            <span className="label-eyebrow text-danger">Model identity comparison</span>
          </div>

          {/* Paired rather than grouped: every authorized value sits directly
              above its reported counterpart, so the mismatch is something the
              participant sees rather than something the UI has to assert. */}
          <VerdictTable className="px-4">
            <VerdictRow label="Authorized model" value={receipt.authorizedModel} />
            <VerdictRow label="Model used" value={receipt.detectedModel} tone="danger" />
            <VerdictRow label="Authorized model ID" value={receipt.authorizedModelId} />
            <VerdictRow label="Reported model ID" value={receipt.detectedModelId} tone="danger" />
            <VerdictRow label="Expected commitment" value={receipt.authorizedCommitment} />
            <VerdictRow label="Reported commitment" value={receipt.reportedCommitment} tone="danger" />
            <VerdictRow
              label="Match"
              tone="danger"
              value={<span className="text-lg leading-none">✕</span>}
            />
            <VerdictRow label="Result" value="VERIFICATION FAILED" tone="danger" />
            <VerdictRow label="Action" value="BLOCKED" tone="danger" />
          </VerdictTable>
        </div>

        {/* Consequence */}
        <div className="mt-4 rounded-2xl border border-danger/30 bg-danger-wash px-4 py-4">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-danger">
            <Ban className="h-4 w-4" strokeWidth={2.6} />
            Payment blocked
          </p>
          <p className="mt-1.5 text-[15px] font-semibold text-ink">
            {formatInr(receipt.amountPaise)} was NOT sent.
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {receipt.payeeLabel} · {receipt.payeeName}
          </p>
        </div>

        <div className="mt-4 space-y-2.5">
          <button type="button" onClick={onWhy} className="btn-primary w-full">
            <HelpCircle className="h-4 w-4" />
            Why was my payment blocked?
          </button>
          <button type="button" onClick={onDetails} className="btn-ghost w-full">
            View verification details
          </button>
        </div>

        <div className="mt-auto space-y-3 pt-6">
          <p className="text-center text-2xs leading-relaxed text-ink-subtle">{PRODUCTION_NOTE}</p>
          <p className="text-center text-2xs text-ink-subtle">{SIMULATION_LABEL}</p>
          <button
            type="button"
            onClick={onDismiss}
            className="mx-auto flex items-center gap-1.5 py-2 text-2xs font-semibold uppercase tracking-wider text-ink-subtle"
          >
            <X className="h-3 w-3" />
            Back to assistant
          </button>
        </div>
      </div>
    </div>
  );
}

/** Compact summary that stays in the transcript once the takeover is dismissed. */
export function BlockedSummaryCard({
  receipt,
  onReopen
}: {
  receipt: VerificationReceipt;
  onReopen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onReopen}
      className="card w-full overflow-hidden border-danger/30 text-left"
    >
      <div className="flex items-center justify-between gap-3 border-b border-danger/20 bg-danger/[0.06] px-4 py-3">
        <span className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-danger" strokeWidth={2.4} />
          <span className="label-eyebrow text-danger">Payment blocked</span>
        </span>
        <span className="pill-danger">Model mismatch</span>
      </div>
      <div className="px-4 py-3">
        <p className="text-sm text-ink-muted">
          {formatInr(receipt.amountPaise)} was not sent. Tap to see why.
        </p>
      </div>
    </button>
  );
}

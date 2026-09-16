'use client';

import { Ban, HelpCircle, ShieldAlert } from 'lucide-react';
import { BLOCKED_COPY } from '@/lib/demo';
import { formatInr } from '@/lib/format';
import { VerdictRow, VerdictTable } from './VerdictTable';
import type { VerificationReceipt } from '@/lib/types';

/**
 * THE screen.
 *
 * A full takeover rather than another chat card, deliberately: the block should
 * not feel like the assistant declining, it should feel like something
 * underneath the assistant refusing to let the money move.
 *
 * The headline and caption are plain prose — "you were being served a cheaper
 * model", not "model mismatch". Protocol vocabulary is precise and means
 * nothing to a participant at a networking event; what happened TO THEM is that
 * somebody quietly swapped in a cheaper model and tried to charge them anyway.
 * The comparison table stays underneath as the evidence, but it is no longer
 * carrying the explanation on its own.
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
    <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-canvas">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-safe pt-safe">
        <div className="animate-shake pt-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-danger/30 bg-danger-wash text-danger">
            <ShieldAlert className="h-6 w-6" strokeWidth={2.4} />
          </span>
          <h1 className="mt-4 text-[27px] font-bold leading-tight tracking-tight text-danger">
            {BLOCKED_COPY.title}
          </h1>
          <p className="mt-2.5 text-[15px] leading-relaxed text-ink">
            {BLOCKED_COPY.caption(
              receipt.authorizedModel,
              receipt.detectedModel ?? 'a different model'
            )}
          </p>
        </div>

        {/* Consequence, immediately after the plain-language explanation. */}
        <div className="mt-5 rounded-2xl border border-danger/30 bg-danger-wash px-4 py-4">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-danger">
            <Ban className="h-4 w-4" strokeWidth={2.6} />
            Nothing was paid
          </p>
          <p className="mt-1.5 text-[15px] font-semibold text-ink">
            {formatInr(receipt.amountPaise)} is still in your account.
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {receipt.payeeLabel} · {receipt.payeeName}
          </p>
        </div>

        {/* The evidence. */}
        <div className="card mt-4 overflow-hidden border-danger/30">
          <div className="border-b border-danger/20 bg-danger/[0.06] px-4 py-2.5">
            <span className="label-eyebrow text-danger">{BLOCKED_COPY.tableTitle}</span>
          </div>
          <VerdictTable className="px-4">
            <VerdictRow label="You approved" value={receipt.authorizedModel} />
            <VerdictRow label="Actually used" value={receipt.detectedModel} tone="danger" />
            <VerdictRow label="Approved model ID" value={receipt.authorizedModelId} />
            <VerdictRow label="Model ID that ran" value={receipt.detectedModelId} tone="danger" />
            <VerdictRow label="Expected fingerprint" value={receipt.authorizedCommitment} />
            <VerdictRow label="Reported fingerprint" value={receipt.reportedCommitment} tone="danger" />
            <VerdictRow
              label="Same model?"
              tone="danger"
              value={<span className="text-[15px] leading-none">No ✕</span>}
            />
            <VerdictRow label="Payment" value="STOPPED" tone="danger" />
          </VerdictTable>
        </div>

        <div className="mt-4 space-y-2.5">
          <button type="button" onClick={onWhy} className="btn-primary w-full">
            <HelpCircle className="h-4 w-4" />
            Why was my payment stopped?
          </button>
          <button type="button" onClick={onDetails} className="btn-ghost w-full">
            View check details
          </button>
        </div>

        <div className="mt-auto pt-6">
          <button
            type="button"
            onClick={onDismiss}
            className="mx-auto flex items-center gap-1.5 py-2 text-2xs font-semibold uppercase tracking-wider text-ink-subtle"
          >
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
          <span className="label-eyebrow text-danger">{BLOCKED_COPY.title}</span>
        </span>
        <span className="pill-danger">{BLOCKED_COPY.pill}</span>
      </div>
      <div className="px-4 py-3">
        <p className="text-sm leading-snug text-ink-muted">
          {formatInr(receipt.amountPaise)} was not sent — a cheaper model was being used. Tap to
          see why.
        </p>
      </div>
    </button>
  );
}

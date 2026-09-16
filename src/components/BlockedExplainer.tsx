'use client';

import { BLOCKED_EXPLAINER, PRODUCTION_NOTE, SIMULATION_LABEL } from '@/lib/demo';
import { Sheet } from './Sheet';
import { VerdictRow, VerdictTable } from './VerdictTable';
import type { VerificationReceipt } from '@/lib/types';

/**
 * "Why was my payment blocked?"
 *
 * Framed as protection rather than failure. The participant did not lose a
 * payment; a payment they did not actually authorize was stopped. That reframe
 * is what we are testing, so the title carries it.
 */
export function BlockedExplainer({
  receipt,
  onClose
}: {
  receipt: VerificationReceipt;
  onClose: () => void;
}) {
  return (
    <Sheet title="Payment protection" onClose={onClose}>
      <h3 className="text-xl font-bold leading-tight tracking-tight text-ink">
        {BLOCKED_EXPLAINER.title}
      </h3>

      <div className="mt-3 space-y-2.5">
        {BLOCKED_EXPLAINER.body.map((line) => (
          <p key={line} className="text-[15px] leading-relaxed text-ink-muted">
            {line}
          </p>
        ))}
      </div>

      <div className="card-inset mt-5 px-4 py-1">
        <VerdictTable>
          <VerdictRow label="Authorized" value={receipt.authorizedModel} />
          <VerdictRow label="Detected" value={receipt.detectedModel} tone="danger" />
          <VerdictRow label="Verification" value="FAILED" tone="danger" />
          <VerdictRow label="Payment" value="BLOCKED" tone="danger" />
        </VerdictTable>
      </div>

      <div className="mt-5 space-y-2 border-t border-line pt-4">
        <p className="text-2xs leading-relaxed text-ink-subtle">{PRODUCTION_NOTE}</p>
        <p className="text-2xs text-ink-subtle">{SIMULATION_LABEL}</p>
      </div>
    </Sheet>
  );
}

'use client';

import { BLOCKED_EXPLAINER } from '@/lib/demo';
import { Sheet } from './Sheet';
import { VerdictRow, VerdictTable } from './VerdictTable';
import type { VerificationReceipt } from '@/lib/types';

/**
 * "Why was my payment stopped?"
 *
 * Framed as protection rather than failure. The participant did not lose a
 * payment; a payment they never actually authorised was stopped. The closing
 * line is the one that does the work for the research question — it names the
 * counterfactual, which is the thing they cannot see for themselves.
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
          <VerdictRow label="You approved" value={receipt.authorizedModel} />
          <VerdictRow label="Actually used" value={receipt.detectedModel} tone="danger" />
          <VerdictRow label="Payment" value="STOPPED" tone="danger" />
        </VerdictTable>
      </div>

      <p className="mt-5 rounded-xl border border-warn/30 bg-warn-wash px-4 py-3 text-sm leading-relaxed text-ink-muted">
        {BLOCKED_EXPLAINER.footer}
      </p>
    </Sheet>
  );
}

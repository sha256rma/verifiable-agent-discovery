'use client';

import { NARROW_CLAIM } from '@/lib/demo';
import { Sheet } from './Sheet';
import { VerdictRow, VerdictTable } from './VerdictTable';
import type { VerificationReceipt } from '@/lib/types';

/**
 * Optional technical panel, for the participant who asks how it works.
 *
 * Shows the architecture, not invented mathematics. There is no fake proof
 * transcript and no hex blob pretending to be something it is not — exposing
 * imaginary cryptography would teach participants the wrong thing about what
 * they are being asked to trust. The narrow-claim note is the important part of
 * this screen: it is the one place that says what the check does NOT cover.
 */
export function VerificationDetails({
  receipt,
  sessionCode,
  onClose
}: {
  receipt: VerificationReceipt;
  sessionCode: string;
  onClose: () => void;
}) {
  const performed = receipt.result !== 'NOT_PERFORMED';
  const matched = receipt.match === true;

  return (
    <Sheet title={performed ? 'Check details' : 'What was not checked'} onClose={onClose}>
      {!performed ? (
        <p className="rounded-xl border border-warn/30 bg-warn-wash px-4 py-3 text-sm leading-relaxed text-ink-muted">
          Verification was switched off for this payment. Nobody looked at which model handled it,
          so none of the values below were compared — the payment went through on the provider&apos;s
          word alone.
        </p>
      ) : null}

      <p className="label-eyebrow mt-5">Model identity</p>
      <div className="card-inset mt-2 px-4 py-1">
        <VerdictTable>
          <VerdictRow label="You approved" value={receipt.authorizedModelId} />
          <VerdictRow label="Expected fingerprint" value={receipt.authorizedCommitment} />
          <VerdictRow
            label="Reported by provider"
            tone={!performed ? 'muted' : matched ? 'brand' : 'danger'}
            value={performed ? receipt.reportedCommitment : 'Never requested'}
          />
          <VerdictRow
            label="Same model?"
            tone={!performed ? 'muted' : matched ? 'brand' : 'danger'}
            value={!performed ? 'NOT CHECKED' : matched ? 'Yes' : 'No'}
          />
        </VerdictTable>
      </div>

      <p className="label-eyebrow mt-5">This payment</p>
      <div className="card-inset mt-2 px-4 py-1">
        <VerdictTable>
          <VerdictRow label="Session" value={sessionCode} />
          <VerdictRow label="One-time code" value={receipt.nonce} />
          <VerdictRow label="Reference" value={receipt.transactionRef} />
          <VerdictRow
            label="Outcome"
            tone={!performed ? 'muted' : matched ? 'brand' : 'danger'}
            value={!performed ? 'NOT CHECKED' : matched ? 'Payment allowed' : 'Payment stopped'}
          />
        </VerdictTable>
      </div>

      <div className="mt-5 space-y-2 border-t border-line pt-4">
        <p className="text-2xs font-bold uppercase tracking-[0.12em] text-ink-subtle">
          What this check does and does not cover
        </p>
        <p className="text-2xs leading-relaxed text-ink-subtle">{NARROW_CLAIM}</p>
      </div>
    </Sheet>
  );
}

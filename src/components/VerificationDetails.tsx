'use client';

import { NARROW_CLAIM, SIMULATION_LABEL } from '@/lib/demo';
import { Sheet } from './Sheet';
import { VerdictRow, VerdictTable } from './VerdictTable';
import type { VerificationReceipt } from '@/lib/types';

/**
 * Optional technical panel.
 *
 * Shows the architecture, not fake mathematics. There is no invented proof
 * transcript, no polynomial anything, no hex blob pretending to be a SNARK —
 * exposing imaginary cryptography would misrepresent what has been built and
 * would teach participants the wrong thing about what they are being asked to
 * trust. The narrow-claim note at the bottom is the important part of this
 * screen.
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
    <Sheet title="Verification details" onClose={onClose}>
      <p className="label-eyebrow">Model identity</p>
      <div className="card-inset mt-2 px-4 py-1">
        <VerdictTable>
          <VerdictRow label="Authorized" value={receipt.authorizedModelId} />
          <VerdictRow label="Commitment" value={receipt.authorizedCommitment} />
          <VerdictRow label="Execution proof" value={performed ? 'Received' : 'Not requested'} />
          <VerdictRow
            label="Model commitment"
            tone={!performed ? 'muted' : matched ? 'brand' : 'danger'}
            value={!performed ? 'NOT CHECKED' : matched ? 'MATCH' : 'MISMATCH'}
          />
        </VerdictTable>
      </div>

      <p className="label-eyebrow mt-5">Session</p>
      <div className="card-inset mt-2 px-4 py-1">
        <VerdictTable>
          <VerdictRow label="Session ID" value={sessionCode} />
          <VerdictRow label="Nonce" value={receipt.nonce} />
          <VerdictRow label="Transaction" value={receipt.transactionRef} />
          <VerdictRow
            label="Result"
            tone={!performed ? 'muted' : matched ? 'brand' : 'danger'}
            value={!performed ? 'NOT PERFORMED' : matched ? 'VALID' : 'INVALID'}
          />
        </VerdictTable>
      </div>

      {!performed ? (
        <p className="mt-4 rounded-xl border border-warn/30 bg-warn-wash px-4 py-3 text-sm leading-relaxed text-ink-muted">
          Verification was switched off for this payment, so no model identity
          check was performed and none of the values above were compared.
        </p>
      ) : null}

      <div className="mt-5 space-y-2 border-t border-line pt-4">
        <p className="text-2xs font-bold uppercase tracking-[0.12em] text-ink-subtle">
          What this check does and does not cover
        </p>
        <p className="text-2xs leading-relaxed text-ink-subtle">{NARROW_CLAIM}</p>
        <p className="text-2xs text-ink-subtle">{SIMULATION_LABEL}</p>
      </div>
    </Sheet>
  );
}

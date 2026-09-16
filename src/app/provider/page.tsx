'use client';

import { useState } from 'react';
import { AlertTriangle, ArrowDownCircle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { setModel } from '@/lib/rigClient';
import { useProviderRig } from '@/lib/useRig';
import { formatInr } from '@/lib/format';
import { AUTHORIZED_MODEL, DOWNGRADED_MODEL } from '@/lib/demo';
import { ConnectionPill } from '@/components/ConnectionPill';
import { ResearcherPanel } from '@/components/ResearcherPanel';
import { VerdictRow, VerdictTable } from '@/components/VerdictTable';
import type { RigRow } from '@/lib/types';

/**
 * PHONE B — model-provider console plus researcher controls.
 *
 * Deliberately sparse: one enormous model button and a live read-out of what
 * the customer phone is doing, so the swap can be made one-handed, without
 * looking, while talking to someone.
 *
 * This screen is the PROVIDER's internal state. The customer phone never
 * mirrors it — a downgrade here is invisible over there until the check runs.
 */
export default function ProviderPage() {
  const { rig, link, error, apply } = useProviderRig();
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'downgrade' | 'restore' | null>(null);

  async function changeModel(action: 'downgrade' | 'restore') {
    setBusy(action);
    setActionError(null);
    try {
      apply(await setModel(action));
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not change the model.');
    } finally {
      setBusy(null);
    }
  }

  if (!rig) {
    return (
      <main className="theme-provider flex min-h-dvh items-center justify-center bg-canvas px-6">
        <div className="flex flex-col items-center gap-3 text-center">
          {error ? (
            <>
              <AlertTriangle className="h-6 w-6 text-warn" />
              <p className="text-sm font-medium text-ink-muted">{error}</p>
            </>
          ) : (
            <Loader2 className="h-6 w-6 animate-spin text-ink-subtle" />
          )}
        </div>
      </main>
    );
  }

  const downgraded = rig.model_state === 'MODEL_DOWNGRADED';
  const tier = downgraded ? DOWNGRADED_MODEL.tier : AUTHORIZED_MODEL.tier;

  return (
    <main className="theme-provider min-h-dvh bg-canvas">
      <div className="mx-auto w-full max-w-md space-y-4 px-4 pb-10 pt-safe">
        <header className="flex items-start justify-between gap-3 pt-2">
          <div className="min-w-0">
            <h1 className="text-sm font-bold uppercase tracking-[0.14em] text-ink">
              Model serving control
            </h1>
            <p className="mt-0.5 text-2xs text-ink-subtle">Provider infrastructure · internal</p>
          </div>
          <ConnectionPill link={link} className="mt-1 shrink-0" />
        </header>

        {/* Deployed model */}
        <section
          className={`card overflow-hidden ${downgraded ? 'border-warn/40 shadow-glow-warn' : 'border-brand/30'}`}
        >
          <div
            className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${
              downgraded ? 'border-warn/25 bg-warn/[0.08]' : 'border-brand/20 bg-brand/[0.07]'
            }`}
          >
            <span className="label-eyebrow">Now serving</span>
            <span className={downgraded ? 'pill-warn' : 'pill-brand'}>
              {downgraded ? (
                <>
                  <AlertTriangle className="h-3 w-3" strokeWidth={3} /> Downgraded
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3" strokeWidth={3} /> As authorized
                </>
              )}
            </span>
          </div>

          <div className="px-4 py-5">
            <p className="text-3xl font-bold leading-tight tracking-tight text-ink">
              {rig.current_model}
            </p>
            <p className="mt-1 text-xs text-ink-subtle">{tier}</p>
            <p
              className={`mt-2.5 text-xs font-bold uppercase tracking-wider ${downgraded ? 'text-warn' : 'text-brand'}`}
            >
              {downgraded
                ? '● Not the model the customer approved'
                : '● The model the customer approved'}
            </p>

            <VerdictTable className="mt-4">
              <VerdictRow label="Model ID" value={rig.current_model_id} />
              <VerdictRow label="Fingerprint" value={rig.current_commitment} />
              <VerdictRow label="Customer approved" value={rig.authorized_model_id} />
            </VerdictTable>
          </div>
        </section>

        {/* The one control */}
        {downgraded ? (
          <button
            type="button"
            onClick={() => void changeModel('restore')}
            disabled={busy !== null}
            className="btn-brand btn-slab"
          >
            {busy === 'restore' ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <ShieldCheck className="h-6 w-6" />
            )}
            Restore {AUTHORIZED_MODEL.name}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void changeModel('downgrade')}
            disabled={busy !== null}
            className="btn-warn btn-slab"
          >
            {busy === 'downgrade' ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <ArrowDownCircle className="h-6 w-6" />
            )}
            Downgrade to {DOWNGRADED_MODEL.name}
          </button>
        )}

        {actionError ? (
          <p className="animate-fade-up rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            {actionError}
          </p>
        ) : null}

        <CustomerMirror rig={rig} />
        <ResearcherPanel rig={rig} onRow={apply} onError={setActionError} />
      </div>
    </main>
  );
}

/**
 * What the participant is seeing right now, so the researcher can narrate
 * without leaning over to look at the other phone.
 */
function CustomerMirror({ rig }: { rig: RigRow }) {
  const receipt = rig.last_verification;

  const verdict = (() => {
    if (rig.payment_status === 'BLOCKED') return { tone: 'pill-danger', text: 'Payment stopped' };
    if (rig.payment_status === 'APPROVED') {
      return rig.verification_status === 'PASS'
        ? { tone: 'pill-brand', text: 'Paid · checked' }
        : { tone: 'pill-warn', text: 'Paid · unchecked' };
    }
    return { tone: 'pill-neutral', text: 'Waiting' };
  })();

  return (
    <section className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="label-eyebrow">Customer phone</span>
        <span className={verdict.tone}>{verdict.text}</span>
      </div>

      <VerdictTable className="mt-3">
        <VerdictRow
          label="Verification"
          value={rig.verification_enabled ? 'ON' : 'OFF'}
          tone={rig.verification_enabled ? 'brand' : 'muted'}
        />
        <VerdictRow label="Questions" value={rig.survey_open ? 'SHOWING' : 'hidden'} tone={rig.survey_open ? 'brand' : 'muted'} />
        <VerdictRow label="Amount" value={formatInr(rig.payment_amount_paise)} />
        <VerdictRow label="Last event" value={rig.last_event} mono={false} />
      </VerdictTable>

      {receipt && receipt.result !== 'NOT_PERFORMED' ? (
        <p className="mt-3 text-2xs leading-relaxed text-ink-subtle">
          They saw: approved <span className="font-mono text-ink-muted">{receipt.authorizedModel}</span>,
          actually ran <span className="font-mono text-ink-muted">{receipt.detectedModel}</span>
        </p>
      ) : null}
    </section>
  );
}

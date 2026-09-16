'use client';

import { use, useEffect, useState } from 'react';
import { AlertTriangle, ArrowDownCircle, CheckCircle2, Loader2, ShieldCheck, X } from 'lucide-react';
import { setModel } from '@/lib/rigClient';
import { useProviderRig } from '@/lib/useRig';
import { formatInr } from '@/lib/format';
import { SIMULATION_LABEL } from '@/lib/demo';
import { ConnectionPill } from '@/components/ConnectionPill';
import { ResearcherPanel } from '@/components/ResearcherPanel';
import { VerdictRow, VerdictTable } from '@/components/VerdictTable';
import type { RigRow } from '@/lib/types';

const PAIRED_KEY = 'vdemo:paired';

/**
 * PHONE B — model-provider console + researcher controls.
 *
 * Deliberately sparse: two enormous model buttons and a live read-out of what
 * the customer phone is doing. The researcher presses these one-handed, without
 * looking, while talking to someone.
 *
 * This screen represents the PROVIDER's internal state. The customer phone
 * never mirrors it — a downgrade here is invisible over there until the
 * verification layer reports it.
 */
export default function ProviderPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const rigCode = code.toUpperCase();

  const { rig, link, error, apply } = useProviderRig(rigCode);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'downgrade' | 'restore' | null>(null);
  const [showPairing, setShowPairing] = useState(false);

  useEffect(() => {
    try {
      setShowPairing(localStorage.getItem(`${PAIRED_KEY}:${rigCode}`) !== '1');
    } catch {
      setShowPairing(true);
    }
  }, [rigCode]);

  function dismissPairing() {
    try {
      localStorage.setItem(`${PAIRED_KEY}:${rigCode}`, '1');
    } catch {
      /* non-fatal */
    }
    setShowPairing(false);
  }

  async function changeModel(action: 'downgrade' | 'restore') {
    setBusy(action);
    setActionError(null);
    try {
      apply(await setModel(rigCode, action));
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not change the model.');
    } finally {
      setBusy(null);
    }
  }

  if (!rig) {
    return (
      <main className="theme-provider flex min-h-dvh items-center justify-center bg-base px-6">
        <div className="flex flex-col items-center gap-3 text-center">
          {error ? (
            <>
              <AlertTriangle className="h-6 w-6 text-warn" />
              <p className="text-sm font-medium text-ink-muted">{error}</p>
            </>
          ) : (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-ink-subtle" />
              <p className="text-sm text-ink-subtle">Loading session {rigCode}…</p>
            </>
          )}
        </div>
      </main>
    );
  }

  const downgraded = rig.model_state === 'MODEL_DOWNGRADED';

  return (
    <main className="theme-provider min-h-dvh bg-base">
      <div className="mx-auto w-full max-w-md space-y-4 px-4 pb-10 pt-safe">
        {/* Header */}
        <header className="flex items-start justify-between gap-3 pt-2">
          <div className="min-w-0">
            <h1 className="text-sm font-bold uppercase tracking-[0.14em] text-ink">
              Frontier Model Control
            </h1>
            <p className="mt-0.5 text-2xs text-ink-subtle">Provider infrastructure · internal</p>
          </div>
          <ConnectionPill link={link} className="mt-1 shrink-0" />
        </header>

        {/* One-time pairing helper. Dismissed once the customer phone is joined. */}
        {showPairing ? (
          <section className="card animate-fade-up border-line-strong p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="label-eyebrow">Pair the customer phone — once</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                  Open this site on the other phone, tap{' '}
                  <span className="font-semibold text-ink">Join as customer</span>, and enter:
                </p>
              </div>
              <button
                type="button"
                onClick={dismissPairing}
                aria-label="Customer phone is paired"
                className="-mr-1 -mt-1 shrink-0 rounded-lg p-2 text-ink-subtle hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-center text-5xl font-bold tracking-[0.2em] text-ink">
              {rig.rig_code}
            </p>
            <button type="button" onClick={dismissPairing} className="btn-ghost mt-3 w-full py-3 text-sm">
              Done — phone is paired
            </button>
          </section>
        ) : null}

        {/* Deployed model */}
        <section
          className={`card overflow-hidden ${downgraded ? 'border-warn/40 shadow-glow-warn' : 'border-brand/30'}`}
        >
          <div
            className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${
              downgraded ? 'border-warn/25 bg-warn/[0.08]' : 'border-brand/20 bg-brand/[0.07]'
            }`}
          >
            <span className="label-eyebrow">Deployed model</span>
            <span className={downgraded ? 'pill-warn' : 'pill-brand'}>
              {downgraded ? (
                <>
                  <AlertTriangle className="h-3 w-3" strokeWidth={3} /> Downgraded
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3" strokeWidth={3} /> Verified model
                </>
              )}
            </span>
          </div>

          <div className="px-4 py-5">
            <p className="text-3xl font-bold leading-tight tracking-tight text-ink">
              {rig.current_model}
            </p>
            <p
              className={`mt-2 text-xs font-bold uppercase tracking-wider ${downgraded ? 'text-warn' : 'text-brand'}`}
            >
              {downgraded ? '● Not the customer-authorized model' : '● Customer-authorized model'}
            </p>

            <VerdictTable className="mt-4">
              <VerdictRow label="Model ID" value={rig.current_model_id} />
              <VerdictRow label="Model commitment" value={rig.current_commitment} />
            </VerdictTable>
          </div>
        </section>

        {/* The two controls */}
        {downgraded ? (
          <button
            type="button"
            onClick={() => void changeModel('restore')}
            disabled={busy !== null}
            className="btn-brand btn-slab"
          >
            {busy === 'restore' ? <Loader2 className="h-6 w-6 animate-spin" /> : <ShieldCheck className="h-6 w-6" />}
            Restore verified model
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void changeModel('downgrade')}
            disabled={busy !== null}
            className="btn-warn btn-slab"
          >
            {busy === 'downgrade' ? <Loader2 className="h-6 w-6 animate-spin" /> : <ArrowDownCircle className="h-6 w-6" />}
            Downgrade model
          </button>
        )}

        {actionError ? (
          <p className="animate-fade-up rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            {actionError}
          </p>
        ) : null}

        {/* Live read-out of the customer phone */}
        <CustomerMirror rig={rig} />

        <ResearcherPanel rig={rig} onRow={apply} onError={setActionError} />

        <p className="px-2 pt-1 text-center text-2xs leading-relaxed text-ink-subtle">
          {SIMULATION_LABEL}
        </p>
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
    if (rig.payment_status === 'BLOCKED') {
      return { tone: 'pill-danger', text: 'Payment blocked' };
    }
    if (rig.payment_status === 'APPROVED') {
      return {
        tone: rig.verification_status === 'PASS' ? 'pill-brand' : 'pill-warn',
        text: rig.verification_status === 'PASS' ? 'Approved · verified' : 'Approved · unverified'
      };
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
        <VerdictRow label="Pending amount" value={formatInr(rig.payment_amount_paise)} />
        <VerdictRow label="Last event" value={rig.last_event} mono={false} />
      </VerdictTable>

      {receipt && receipt.result !== 'NOT_PERFORMED' ? (
        <p className="mt-3 text-2xs text-ink-subtle">
          Customer saw: authorized{' '}
          <span className="font-mono text-ink-muted">{receipt.authorizedCommitment}</span> vs reported{' '}
          <span className="font-mono text-ink-muted">{receipt.reportedCommitment}</span>
        </p>
      ) : null}
    </section>
  );
}

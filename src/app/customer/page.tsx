'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowUp, Loader2, Sparkles } from 'lucide-react';
import { requestPayment, setVerification, submitSurvey } from '@/lib/rigClient';
import { useCustomerRig } from '@/lib/useRig';
import { delay, istClock } from '@/lib/format';
import { PAYMENT_INTENTS, TIMING, VERIFY_STAGES, matchIntent, type PaymentIntent } from '@/lib/demo';
import { ConnectionPill } from '@/components/ConnectionPill';
import { TrustBanner } from '@/components/TrustBanner';
import { VerificationToggle } from '@/components/VerificationToggle';
import { PaymentCard } from '@/components/PaymentCard';
import { PaymentApproved } from '@/components/PaymentApproved';
import { ProcessingBubble, VerifyingOverlay } from '@/components/VerifyingOverlay';
import { BlockedSummaryCard, VerificationFailed } from '@/components/VerificationFailed';
import { BlockedExplainer } from '@/components/BlockedExplainer';
import { VerificationDetails } from '@/components/VerificationDetails';
import { TrustSurvey } from '@/components/TrustSurvey';
import type {
  CustomerRigView,
  LinkStatus,
  RigRow,
  SurveyAnswers,
  VerificationReceipt
} from '@/lib/types';

/**
 * PHONE A — the phone handed to a participant.
 *
 * Everything the researcher needs is on the other phone. The only control here
 * is the verification toggle, which is the independent variable of the
 * experiment and therefore belongs in the participant's hands.
 */
export default function CustomerPage() {
  const { rig, link, error, apply } = useCustomerRig();

  // Handoff: NEXT PARTICIPANT changes the session id and everything below
  // remounts via `key`. The brief card makes the reset legible rather than
  // looking like a glitch.
  const [handingOff, setHandingOff] = useState(false);
  const knownSession = useRef<string | null>(null);

  // Depends on the session id, NOT on `rig` — the synced row is a fresh object
  // on every poll, and depending on it would let the next tick's cleanup cancel
  // the timer that dismisses this card, leaving the phone stuck on it forever.
  const sessionId = rig?.session_id;
  useEffect(() => {
    if (!sessionId) return;
    if (knownSession.current === null) {
      knownSession.current = sessionId;
      return;
    }
    if (knownSession.current === sessionId) return;

    knownSession.current = sessionId;
    setHandingOff(true);
    const timer = setTimeout(() => setHandingOff(false), TIMING.handoff);
    return () => clearTimeout(timer);
  }, [sessionId]);

  if (!rig) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6">
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

  if (handingOff) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6">
        <div className="animate-pop-in flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-surface">
            <Sparkles className="h-5 w-5 text-ink-muted" strokeWidth={2.2} />
          </span>
          <p className="text-lg font-bold tracking-tight text-ink">Ready for the next person</p>
          <p className="text-sm text-ink-muted">Fresh start — nothing carried over.</p>
        </div>
      </main>
    );
  }

  return <CustomerSession key={rig.session_id} rig={rig} link={link} onRow={apply} />;
}

/* -------------------------------------------------------------------------- */

type Message =
  | { id: string; kind: 'agent'; text: string; time: string }
  | { id: string; kind: 'user'; text: string; time: string }
  | { id: string; kind: 'payment'; intent: PaymentIntent }
  | { id: string; kind: 'approved'; receipt: VerificationReceipt }
  | { id: string; kind: 'blocked'; receipt: VerificationReceipt }
  | { id: string; kind: 'survey' };

type Phase = 'idle' | 'parsing' | 'processing' | 'verifying' | 'resolved';

function CustomerSession({
  rig,
  link,
  onRow
}: {
  rig: CustomerRigView;
  link: LinkStatus;
  onRow: (row: RigRow) => void;
}) {
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 'greeting',
      kind: 'agent',
      text: 'Hi — I can pay bills and send money for you. What would you like to pay?',
      time: istClock()
    }
  ]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [verifyStage, setVerifyStage] = useState(0);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<{ messageId: string; intent: PaymentIntent } | null>(null);
  const [failure, setFailure] = useState<VerificationReceipt | null>(null);
  const [sheet, setSheet] = useState<'why' | 'details' | null>(null);
  const [detailsFor, setDetailsFor] = useState<VerificationReceipt | null>(null);
  const [optimisticVerify, setOptimisticVerify] = useState<boolean | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const counter = useRef(0);
  const scroller = useRef<HTMLDivElement | null>(null);
  const surveyShown = useRef(false);

  const nextId = (prefix: string) => {
    counter.current += 1;
    return `${prefix}-${counter.current}`;
  };
  const push = (message: Message) => setMessages((current) => [...current, message]);

  // Keep the newest card in view. The verdict is the point of the whole demo —
  // it must never land below the fold.
  //
  // The survey is the exception: it is taller than the viewport, so scrolling to
  // the bottom would hand the participant the submit button instead of the first
  // question. It scrolls itself to the top on mount instead.
  const lastIsSurvey = messages[messages.length - 1]?.kind === 'survey';
  useEffect(() => {
    const node = scroller.current;
    if (!node || lastIsSurvey) return;
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  }, [messages, phase, verifyStage, lastIsSurvey]);

  /**
   * The survey is researcher-triggered only, never automatic.
   *
   * It has to come after the participant has seen BOTH an unchecked payment go
   * through and a checked one get stopped. Popping it up straight after the
   * unchecked payment — which is what this used to do — primed them to look for
   * a problem before they had been shown one.
   */
  useEffect(() => {
    if (!rig.survey_open || surveyShown.current) return;
    surveyShown.current = true;
    push({ id: nextId('survey'), kind: 'survey' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rig.survey_open]);

  // Show the participant's own tap immediately, then reconcile with the row the
  // RPC returns. Falls back to the synced value if the call fails.
  const verificationOn = optimisticVerify ?? rig.verification_enabled;

  useEffect(() => {
    if (optimisticVerify !== null && rig.verification_enabled === optimisticVerify) {
      setOptimisticVerify(null);
    }
  }, [rig.verification_enabled, optimisticVerify]);

  async function toggleVerification() {
    const next = !verificationOn;
    setOptimisticVerify(next);
    setActionError(null);
    try {
      onRow(await setVerification(next));
    } catch (cause) {
      setOptimisticVerify(null);
      setActionError(cause instanceof Error ? cause.message : 'Could not change that setting.');
    }
  }

  async function submitRequest(text: string) {
    const trimmed = text.trim();
    if (!trimmed || phase !== 'idle') return;

    setDraft('');
    setActionError(null);
    push({ id: nextId('user'), kind: 'user', text: trimmed, time: istClock() });

    setPhase('parsing');
    await delay(520);

    const intent = matchIntent(trimmed);
    push({
      id: nextId('agent'),
      kind: 'agent',
      text: `Found your ${intent.label.toLowerCase()}. Ready when you are.`,
      time: istClock()
    });
    const messageId = nextId('pay');
    setPending({ messageId, intent });
    push({ id: messageId, kind: 'payment', intent });
    setPhase('idle');
  }

  async function confirmPayment() {
    if (!pending || phase !== 'idle') return;
    const verifying = verificationOn;

    setPhase(verifying ? 'verifying' : 'processing');
    setVerifyStage(0);

    // The verdict is already decided by the time this resolves — the database
    // froze it under a row lock at the instant of the request. The choreography
    // below is pacing for a human, and cannot contradict the result.
    const decision = requestPayment({
      label: pending.intent.label,
      recipient: pending.intent.recipient,
      amountPaise: pending.intent.amountPaise
    });

    if (verifying) {
      for (let index = 0; index < VERIFY_STAGES.length; index += 1) {
        await delay(TIMING.verifyStage);
        setVerifyStage(index + 1);
      }
    } else {
      await delay(TIMING.unverifiedThinking);
    }

    let row;
    try {
      row = await decision;
    } catch (cause) {
      setPhase('idle');
      setActionError(cause instanceof Error ? cause.message : 'The payment could not be processed.');
      return;
    }

    await delay(TIMING.verdictReveal);

    const receipt = row.last_verification;
    if (!receipt) {
      setPhase('idle');
      setActionError('No result came back.');
      return;
    }

    onRow(row);
    // Clearing `pending` returns the composer and the suggestions to a usable
    // state, so another payment can be started straight away.
    setPending(null);

    if (receipt.paymentStatus === 'BLOCKED') {
      setFailure(receipt);
      push({ id: nextId('blocked'), kind: 'blocked', receipt });
    } else {
      push({ id: nextId('approved'), kind: 'approved', receipt });
      push({
        id: nextId('agent'),
        kind: 'agent',
        text:
          receipt.result === 'VALID'
            ? `Done. I checked that ${receipt.authorizedModel} handled it before sending the money.`
            : `Done. Your ${receipt.payeeLabel.toLowerCase()} is paid.`,
        time: istClock()
      });
    }

    setPhase('idle');
  }

  async function sendSurvey(answers: SurveyAnswers) {
    onRow(await submitSurvey(answers));
  }

  const busy = phase === 'parsing' || phase === 'processing' || phase === 'verifying';
  const detailsReceipt = detailsFor ?? failure ?? lastReceipt(messages);

  return (
    <>
      <main className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden">
        {/* Header */}
        <header className="shrink-0 border-b border-line bg-surface">
          <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-safe">
            <h1 className="text-[17px] font-bold tracking-tight text-ink">AI Payment Assistant</h1>
            <ConnectionPill link={link} />
          </div>

          <div className="flex items-center justify-between gap-3 px-4 pb-2.5">
            <div className="min-w-0">
              <p className="label-eyebrow">Your model</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-ink">
                {rig.authorized_model}
              </p>
            </div>
          </div>

          <div className="px-4 pb-3">
            <VerificationToggle on={verificationOn} onToggle={() => void toggleVerification()} />
          </div>

          <TrustBanner on={verificationOn} />
        </header>

        {/* Transcript */}
        <div ref={scroller} className="scroll-slim min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((message) => {
            switch (message.kind) {
              case 'user':
                return (
                  <div key={message.id} className="flex animate-fade-up justify-end">
                    <div className="max-w-[85%]">
                      <div className="rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-[15px] leading-relaxed text-ink-invert">
                        {message.text}
                      </div>
                      <p className="mt-1 pr-1 text-right text-2xs text-ink-subtle">
                        You · {message.time}
                      </p>
                    </div>
                  </div>
                );

              case 'agent':
                return (
                  <div key={message.id} className="flex animate-fade-up items-start gap-2.5">
                    <AgentAvatar />
                    <div className="min-w-0 max-w-[88%]">
                      <div className="rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-2.5 text-[15px] leading-relaxed text-ink">
                        {message.text}
                      </div>
                      <p className="mt-1 pl-1 text-2xs text-ink-subtle">
                        Assistant · {message.time}
                      </p>
                    </div>
                  </div>
                );

              case 'payment':
                return (
                  <PaymentCard
                    key={message.id}
                    intent={message.intent}
                    verified={verificationOn}
                    state={pending?.messageId === message.id ? (busy ? 'working' : 'pending') : 'done'}
                    onConfirm={() => void confirmPayment()}
                  />
                );

              case 'approved':
                return (
                  <PaymentApproved
                    key={message.id}
                    receipt={message.receipt}
                    onDetails={() => {
                      setDetailsFor(message.receipt);
                      setSheet('details');
                    }}
                  />
                );

              case 'blocked':
                return (
                  <BlockedSummaryCard
                    key={message.id}
                    receipt={message.receipt}
                    onReopen={() => setFailure(message.receipt)}
                  />
                );

              case 'survey':
                return <TrustSurvey key={message.id} onSubmit={sendSurvey} />;

              default:
                return null;
            }
          })}

          {phase === 'verifying' ? <VerifyingOverlay stage={verifyStage} /> : null}
          {phase === 'processing' || phase === 'parsing' ? <ProcessingBubble /> : null}

          {actionError ? (
            <p className="animate-fade-up rounded-xl border border-warn/30 bg-warn-wash px-4 py-3 text-sm font-medium text-ink-muted">
              {actionError}
            </p>
          ) : null}
        </div>

        {/* Composer. The suggestions stay available for the whole session — they
            used to disappear after the first message, which stranded the
            participant with no obvious way to pay anything else. */}
        <div className="shrink-0 border-t border-line bg-surface px-4 pb-safe pt-3">
          <div className="scroll-slim -mx-1 mb-2.5 flex gap-2 overflow-x-auto px-1 pb-1">
            {PAYMENT_INTENTS.map((intent) => (
              <button
                key={intent.prompt}
                type="button"
                onClick={() => void submitRequest(intent.prompt)}
                disabled={busy}
                className="shrink-0 rounded-full border border-line bg-sunken px-3.5 py-2 text-[13px] font-medium text-ink-muted transition-colors active:scale-[0.98] disabled:opacity-40"
              >
                {intent.prompt}
              </button>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitRequest(draft);
            }}
            className="flex items-center gap-2"
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask me to pay something…"
              aria-label="Payment request"
              autoComplete="off"
              disabled={busy}
              className="min-w-0 flex-1 rounded-xl border border-line bg-sunken px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-ink-subtle disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              aria-label="Send"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ink text-ink-invert transition-all active:scale-95 disabled:opacity-30"
            >
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ArrowUp className="h-5 w-5" strokeWidth={2.6} />
              )}
            </button>
          </form>
        </div>
      </main>

      {failure ? (
        <VerificationFailed
          receipt={failure}
          onWhy={() => setSheet('why')}
          onDetails={() => {
            setDetailsFor(failure);
            setSheet('details');
          }}
          onDismiss={() => setFailure(null)}
        />
      ) : null}

      {sheet === 'why' && failure ? (
        <BlockedExplainer receipt={failure} onClose={() => setSheet(null)} />
      ) : null}

      {sheet === 'details' && detailsReceipt ? (
        <VerificationDetails
          receipt={detailsReceipt}
          sessionCode={rig.session_code}
          onClose={() => {
            setSheet(null);
            setDetailsFor(null);
          }}
        />
      ) : null}
    </>
  );
}

function lastReceipt(messages: Message[]): VerificationReceipt | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.kind === 'approved' || message.kind === 'blocked') return message.receipt;
  }
  return null;
}

function AgentAvatar() {
  return (
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-line bg-sunken text-ink-muted">
      <Sparkles className="h-4 w-4" strokeWidth={2.2} />
    </span>
  );
}

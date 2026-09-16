'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, ServerCog, Smartphone } from 'lucide-react';
import { createRig } from '@/lib/rigClient';
import { normalizeCode } from '@/lib/demo';
import { SimulationBadge } from '@/components/SimulationBadge';

const LAST_RIG_KEY = 'vdemo:lastRig';
const ROLE_KEY = 'vdemo:role';

/**
 * Setup screen. Used twice, once per phone, before the event starts — and then
 * never again. A participant never sees this: handoff between participants
 * happens entirely on the researcher's phone.
 */
export default function LandingPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [remembered, setRemembered] = useState<{ code: string; role: string } | null>(null);

  // A phone that was already paired gets a one-tap way back in, so a reload or
  // a battery swap mid-event is not a setup problem.
  useEffect(() => {
    try {
      const code = localStorage.getItem(LAST_RIG_KEY);
      const role = localStorage.getItem(ROLE_KEY);
      if (code && role) setRemembered({ code, role });
    } catch {
      /* private mode, or storage blocked — the manual path still works. */
    }
  }, []);

  async function startRig() {
    setBusy(true);
    setError(null);
    try {
      const rig = await createRig();
      try {
        localStorage.setItem(LAST_RIG_KEY, rig.rig_code);
        localStorage.setItem(ROLE_KEY, 'provider');
      } catch {
        /* non-fatal */
      }
      router.push(`/rig/${rig.rig_code}/provider`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create a demo session.');
      setBusy(false);
    }
  }

  function joinAsCustomer(event: React.FormEvent) {
    event.preventDefault();
    const code = normalizeCode(joinCode);
    if (code.length !== 4) {
      setError('Enter the 4-character code shown on the researcher phone.');
      return;
    }
    try {
      localStorage.setItem(LAST_RIG_KEY, code);
      localStorage.setItem(ROLE_KEY, 'customer');
    } catch {
      /* non-fatal */
    }
    router.push(`/rig/${code}/customer`);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-7 px-5 py-10">
      <header className="space-y-2">
        <p className="label-eyebrow">Two-phone research demo</p>
        <h1 className="text-[27px] font-bold leading-tight tracking-tight text-ink">
          Verifiable AI agents for financial actions
        </h1>
        <p className="text-sm leading-relaxed text-ink-muted">
          Set up each phone once. Pick a role below.
        </p>
      </header>

      {remembered ? (
        <button
          type="button"
          onClick={() => router.push(`/rig/${remembered.code}/${remembered.role}`)}
          className="card flex items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:border-line-strong"
        >
          <span className="min-w-0">
            <span className="label-eyebrow block">Resume this phone</span>
            <span className="mt-0.5 block truncate text-sm font-semibold text-ink">
              {remembered.role === 'provider' ? 'Researcher / provider' : 'Customer'} · {remembered.code}
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-ink-subtle" />
        </button>
      ) : null}

      {/* Phone B */}
      <section className="card space-y-4 p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-sunken text-ink-muted">
            <ServerCog className="h-4 w-4" strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-ink">Researcher phone</h2>
            <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">
              The model-provider dashboard and your demo controls. Start here.
            </p>
          </div>
        </div>
        <button type="button" onClick={startRig} disabled={busy} className="btn-primary w-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy ? 'Creating…' : 'Start new demo'}
        </button>
      </section>

      {/* Phone A */}
      <section className="card space-y-4 p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-sunken text-ink-muted">
            <Smartphone className="h-4 w-4" strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-ink">Customer phone</h2>
            <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">
              This is the phone you hand to people. Pair it once, now — after
              this it resets itself between participants.
            </p>
          </div>
        </div>
        <form onSubmit={joinAsCustomer} className="space-y-3">
          <input
            value={joinCode}
            onChange={(event) => setJoinCode(normalizeCode(event.target.value).slice(0, 4))}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="A7K4"
            aria-label="Demo code from the researcher phone"
            className="w-full rounded-xl border border-line-strong bg-surface px-4 py-3.5 text-center text-2xl font-bold uppercase tracking-[0.35em] text-ink outline-none transition-colors placeholder:text-ink-subtle/50 placeholder:tracking-[0.35em] focus:border-ink"
          />
          <button type="submit" className="btn-ghost w-full">
            Join as customer
          </button>
        </form>
      </section>

      {error ? (
        <p className="animate-fade-up rounded-xl border border-danger/25 bg-danger-wash px-4 py-3 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}

      <footer className="mt-auto space-y-3">
        <div className="divider" />
        <SimulationBadge />
        <p className="text-center text-2xs leading-relaxed text-ink-subtle">
          No real payments. No real cryptographic proofs. No account, email, or
          personal information is collected from participants.
        </p>
      </footer>
    </main>
  );
}

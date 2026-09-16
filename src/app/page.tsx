'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ServerCog, Smartphone } from 'lucide-react';

const ROLE_KEY = 'vdemo:role';

/**
 * Role picker.
 *
 * There is one shared demo and one operator, so there are no pairing codes: one
 * phone taps Customer, the other taps Provider, and that is the whole setup.
 * The choice is remembered, so a phone that reloads or wakes up goes straight
 * back to where it was.
 */
export default function LandingPage() {
  const router = useRouter();
  const [remembered, setRemembered] = useState<string | null>(null);

  useEffect(() => {
    try {
      setRemembered(localStorage.getItem(ROLE_KEY));
    } catch {
      /* private mode, or storage blocked — the buttons still work */
    }
  }, []);

  function pick(role: 'customer' | 'provider') {
    try {
      localStorage.setItem(ROLE_KEY, role);
    } catch {
      /* non-fatal */
    }
    router.push(`/${role}`);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
      <header className="space-y-2">
        <p className="label-eyebrow">Two-phone demo</p>
        <h1 className="text-[27px] font-bold leading-tight tracking-tight text-ink">
          Verifiable AI agents for payments
        </h1>
        <p className="text-sm leading-relaxed text-ink-muted">
          Pick what this phone is. Both phones share one live demo.
        </p>
      </header>

      <button
        type="button"
        onClick={() => pick('customer')}
        className="card flex items-start gap-3.5 p-5 text-left transition-colors active:scale-[0.99]"
      >
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-sunken text-ink-muted">
          <Smartphone className="h-4.5 w-4.5" strokeWidth={2.2} />
        </span>
        <span className="min-w-0">
          <span className="block text-base font-bold text-ink">Customer</span>
          <span className="mt-0.5 block text-sm leading-relaxed text-ink-muted">
            The payment assistant. This is the phone you hand to people.
          </span>
          {remembered === 'customer' ? (
            <span className="pill-neutral mt-2">Last used on this phone</span>
          ) : null}
        </span>
      </button>

      <button
        type="button"
        onClick={() => pick('provider')}
        className="card flex items-start gap-3.5 p-5 text-left transition-colors active:scale-[0.99]"
      >
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-sunken text-ink-muted">
          <ServerCog className="h-4.5 w-4.5" strokeWidth={2.2} />
        </span>
        <span className="min-w-0">
          <span className="block text-base font-bold text-ink">Model provider</span>
          <span className="mt-0.5 block text-sm leading-relaxed text-ink-muted">
            The provider console and your demo controls. Keep this one.
          </span>
          {remembered === 'provider' ? (
            <span className="pill-neutral mt-2">Last used on this phone</span>
          ) : null}
        </span>
      </button>
    </main>
  );
}

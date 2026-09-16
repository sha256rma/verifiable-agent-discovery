import { Lock, ShieldOff } from 'lucide-react';
import { TRUST_BANNER } from '@/lib/demo';

/**
 * The always-on assurance line, modelled on how messaging apps state
 * end-to-end encryption: a lock, one short sentence, present whether or not the
 * person is currently thinking about security.
 *
 * The OFF state matters as much as the ON state. The first run of this demo
 * failed precisely because an unchecked payment looked and felt completely
 * normal — so when verification is off this says so in plain words, sitting in
 * exactly the place the reassurance would otherwise be.
 */
export function TrustBanner({ on }: { on: boolean }) {
  return (
    <div
      className={`flex items-center justify-center gap-1.5 px-4 py-2 text-center text-[11px] font-medium leading-tight transition-colors ${
        on ? 'bg-brand-wash text-brand-deep' : 'bg-warn-wash text-warn'
      }`}
    >
      {on ? (
        <Lock className="h-3 w-3 shrink-0" strokeWidth={2.6} />
      ) : (
        <ShieldOff className="h-3 w-3 shrink-0" strokeWidth={2.6} />
      )}
      {on ? TRUST_BANNER.on : TRUST_BANNER.off}
    </div>
  );
}

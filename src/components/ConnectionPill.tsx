import type { LinkStatus } from '@/lib/types';

/**
 * Live link indicator. Shown small on the customer phone and prominently on the
 * researcher's, because the researcher is the one who needs to notice.
 *
 * "Reconnecting" is honest about the Realtime socket specifically — the 1.5s
 * poll keeps running underneath, so a demo in this state is degraded, not dead.
 */
export function ConnectionPill({ link, className = '' }: { link: LinkStatus; className?: string }) {
  if (link === 'connected') {
    return (
      <span className={`inline-flex items-center gap-1.5 text-2xs font-semibold text-ink-subtle ${className}`}>
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-brand/60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
        </span>
        Connected
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-2xs font-semibold text-warn ${className}`}>
      <span className="h-2 w-2 animate-blink rounded-full border border-warn" />
      {link === 'connecting' ? 'Connecting…' : 'Reconnecting…'}
    </span>
  );
}

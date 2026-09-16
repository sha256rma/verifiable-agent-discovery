import { FlaskConical } from 'lucide-react';
import { SIMULATION_LABEL, SIMULATION_LABEL_SHORT } from '@/lib/demo';

/**
 * Appears on every screen of both phones.
 *
 * This prototype simulates a verification layer; it does not implement one. The
 * label is not a disclaimer bolted on at the end — it is the thing that keeps
 * the demo honest while it is being shown to strangers.
 */
export function SimulationBadge({ compact = false }: { compact?: boolean }) {
  return (
    <p className="flex items-center justify-center gap-1.5 text-center text-2xs font-medium text-ink-subtle">
      <FlaskConical className="h-3 w-3 shrink-0" strokeWidth={2.2} />
      {compact ? SIMULATION_LABEL_SHORT : SIMULATION_LABEL}
    </p>
  );
}

/**
 * The comparison table used by every verification surface on both phones.
 *
 * Row-based rather than a CSS grid, for two reasons that both showed up on a
 * real 390px phone: a grid put the rule on each cell, so every row had a visible
 * gap in its underline where the column gap fell; and a label long enough to
 * wrap ("REPORTED COMMITMENT") dropped out of alignment with its value.
 *
 * `divide-y` gives one continuous rule between rows and none at either end, so
 * the table reads as a single machine read-out — which is the whole point of
 * this screen. The value column is monospace and never wraps; the label column
 * is allowed to.
 */

type Tone = 'default' | 'brand' | 'danger' | 'muted';

const TONE: Record<Tone, string> = {
  default: 'text-ink',
  brand: 'text-brand',
  danger: 'text-danger',
  muted: 'text-ink-subtle'
};

export function VerdictTable({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <dl className={`divide-y divide-line ${className}`}>{children}</dl>;
}

export function VerdictRow({
  label,
  value,
  tone = 'default',
  mono = true
}: {
  label: string;
  value: React.ReactNode;
  tone?: Tone;
  /** Prose values (a free-text event breadcrumb) read better in the UI font. */
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="min-w-0 text-[10px] font-bold uppercase leading-relaxed tracking-[0.1em] text-ink-subtle">
        {label}
      </dt>
      <dd
        className={`shrink-0 text-right text-[13px] font-medium ${
          mono ? 'whitespace-nowrap font-mono' : 'max-w-[62%] text-xs'
        } ${TONE[tone]}`}
      >
        {value}
      </dd>
    </div>
  );
}

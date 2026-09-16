/**
 * Money + time formatting. `formatInr` is ported verbatim from the sibling SPOT
 * project (`src/lib/paymentGateway.ts`) so amounts render identically across both
 * codebases: integer paise in, Indian digit grouping out (1,23,456).
 */

/** All money in this prototype moves as integer paise. 1 INR = 100 paise. */
export type Paise = number;

export const toPaise = (rupees: number): Paise => Math.round(rupees * 100);
export const toRupees = (paise: Paise): number => paise / 100;

/** Formats paise using the Indian digit grouping convention (1,23,456). */
export function formatInr(paise: Paise, options: { decimals?: boolean } = {}): string {
  const { decimals = false } = options;
  const negative = paise < 0;
  const fixed = Math.abs(toRupees(paise)).toFixed(2);
  const [whole, fraction] = fixed.split('.');
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}` : last3;
  return `${negative ? '-' : ''}₹${grouped}${decimals ? `.${fraction}` : ''}`;
}

/** e.g. "02:41 PM" in IST. Used for chat timestamps. */
export function istClock(date: Date = new Date()): string {
  return date.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/** e.g. "16 Sep 2026, 14:41:08 IST". Used on receipts. */
export function istStamp(date: Date = new Date()): string {
  const formatted = date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  return `${formatted} IST`;
}

export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

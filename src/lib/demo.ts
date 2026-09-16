/**
 * Every constant and every participant-facing string, in one file.
 *
 * The wording is the experiment. A receipt that reads "Payment approved" when
 * nothing was checked is a different stimulus from one that reads "Payment
 * completed" alongside a list of what nobody can tell you — so the copy lives in
 * one place where it can be reviewed as a whole rather than drifting per screen.
 */

import type { ModelState } from './types';

/* -------------------------------------------------------------------------- */
/*  Models                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Real model names, because "Frontier Model X" never sounded like something a
 * person pays for — and the downgrade only bites if the participant understands
 * that the substitute is the cheap one.
 */
export const AUTHORIZED_MODEL = {
  name: 'Claude Opus 5',
  id: 'claude-opus-5',
  commitment: '0x83ab...7f21',
  tier: 'Most capable'
} as const;

export const DOWNGRADED_MODEL = {
  name: 'Claude Haiku 4.5',
  id: 'claude-haiku-4-5',
  commitment: '0x91cd...42aa',
  tier: 'Fastest, cheapest'
} as const;

export function modelFor(state: ModelState) {
  return state === 'MODEL_DOWNGRADED' ? DOWNGRADED_MODEL : AUTHORIZED_MODEL;
}

/* -------------------------------------------------------------------------- */
/*  Payment                                                                   */
/* -------------------------------------------------------------------------- */

/** All money is integer paise. 1 INR = 100 paise. */
export const DEFAULT_PAYMENT = {
  amountPaise: 185_000, // Rs 1,850
  label: 'Electricity Bill',
  recipient: 'Maharashtra State Electricity Board',
  consumerNo: 'MSEDCL 4417 2290'
} as const;

export const FIRST_NONCE = '829173';
export const TXN_PREFIX = 'SIMULATED-UPI-';

/* -------------------------------------------------------------------------- */
/*  Requests the customer can make                                            */
/* -------------------------------------------------------------------------- */

export interface PaymentIntent {
  prompt: string;
  label: string;
  recipient: string;
  amountPaise: number;
  keywords: string[];
}

export const PAYMENT_INTENTS: PaymentIntent[] = [
  {
    prompt: 'Pay my electricity bill',
    label: 'Electricity Bill',
    recipient: 'Maharashtra State Electricity Board',
    amountPaise: 185_000,
    keywords: ['electric', 'electricity', 'power', 'current', 'mseb', 'msedcl']
  },
  {
    prompt: 'Pay my rent',
    label: 'Monthly Rent',
    recipient: 'Anjali Deshmukh',
    amountPaise: 2_400_000,
    keywords: ['rent', 'landlord', 'house', 'flat']
  },
  {
    prompt: 'Send ₹500 to Priya',
    label: 'Transfer to Priya',
    recipient: 'Priya Sharma',
    amountPaise: 50_000,
    keywords: ['priya', '500']
  },
  {
    prompt: 'Pay my phone bill',
    label: 'Mobile Postpaid',
    recipient: 'Airtel Postpaid',
    amountPaise: 79_900,
    keywords: ['phone', 'mobile', 'airtel', 'jio', 'postpaid', 'recharge']
  },
  {
    prompt: 'Send ₹2,000 to Mom',
    label: 'Transfer to Mom',
    recipient: 'Sunita Sharma',
    amountPaise: 200_000,
    keywords: ['mom', 'mother', 'mum', 'maa', '2000', '2,000']
  }
];

/**
 * Deliberately simple keyword matching — this is a scripted demo, not an NLU
 * exercise. Anything unrecognised falls back to the electricity bill so the
 * flow never dead-ends in front of a participant.
 */
export function matchIntent(input: string): PaymentIntent {
  const text = input.toLowerCase();
  const hit = PAYMENT_INTENTS.find((intent) =>
    intent.keywords.some((keyword) => text.includes(keyword))
  );
  return hit ?? PAYMENT_INTENTS[0];
}

/* -------------------------------------------------------------------------- */
/*  Choreography timings (ms)                                                 */
/* -------------------------------------------------------------------------- */

export const TIMING = {
  unverifiedThinking: 1_200,
  verifyStage: 600,
  verdictReveal: 320,
  handoff: 1_100
} as const;

export const VERIFY_STAGES = [
  'Checking which model ran this',
  'Comparing it against what you approved',
  'Confirming the record is genuine'
] as const;

/* -------------------------------------------------------------------------- */
/*  Trust framing                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The always-on assurance line, modelled on how messaging apps state
 * end-to-end encryption: one short sentence, a lock, present whether or not
 * anyone is thinking about it. Its absence has to be as legible as its presence,
 * which is why the OFF copy is a plain statement of fact and not a warning.
 */
export const TRUST_BANNER = {
  on: 'The model you chose is checked before any money moves',
  off: 'Nobody is checking which model handles your money'
} as const;

export const TOGGLE_COPY = {
  label: 'Model verification',
  onDetail: `Every payment is checked against ${AUTHORIZED_MODEL.name} before it goes through.`,
  offDetail: 'Payments go through on the provider’s word alone.'
} as const;

/**
 * What an unverified receipt cannot tell you.
 *
 * This list is the fix for the most important thing the first run got wrong: a
 * clean receipt with a reference number felt safe, which is exactly the
 * illusion the product exists to break. Stating the absence plainly is more
 * honest than a warning icon, and it gives the participant something concrete
 * to react to.
 */
export const UNVERIFIED_UNKNOWNS = [
  'Which AI model actually handled this payment',
  'Whether the model you chose is the one that ran',
  'Whether a cheaper model was quietly used instead',
  'Nothing here is independently checked — this is the provider’s word'
] as const;

/** What a verified receipt does establish. Deliberately narrow. */
export const VERIFIED_ASSURANCES = [
  `${AUTHORIZED_MODEL.name} is the model that actually ran this`,
  'Checked independently, not just claimed by the provider',
  'If it had not matched, this payment would have been stopped'
] as const;

/* -------------------------------------------------------------------------- */
/*  Blocked-payment copy                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Plain prose, not protocol vocabulary. "Model mismatch" is precise and means
 * nothing to a participant; "you were served a cheaper model" is what actually
 * happened to them.
 */
export const BLOCKED_COPY = {
  title: 'Payment stopped',
  caption: (authorized: string, used: string) =>
    `You were being served a cheaper model. You approved ${authorized}, but ${used} is what actually handled this request — so the payment was not sent.`,
  tableTitle: 'What was checked',
  pill: 'Downgraded model'
} as const;

export const BLOCKED_EXPLAINER = {
  title: 'Your money stayed put.',
  body: [
    `You told this assistant to use ${AUTHORIZED_MODEL.name}.`,
    `The request was actually handled by ${DOWNGRADED_MODEL.name} — a cheaper model you never agreed to.`,
    'Because those two did not match, the payment was stopped before any money moved.'
  ],
  footer:
    'Without this check, the payment would simply have gone through, and nothing on your screen would have looked wrong.'
} as const;

export const NARROW_CLAIM =
  'This check answers one question: was the request handled by the model you approved? It does not judge whether the model is safe or unbiased, whether its answer was correct, or whether the payment itself was a good idea.';

/* -------------------------------------------------------------------------- */
/*  Survey                                                                    */
/* -------------------------------------------------------------------------- */

export const COMFORT_SCALE = [
  { value: 1, label: 'Not comfortable' },
  { value: 2, label: 'Slightly uncomfortable' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Comfortable' },
  { value: 5, label: 'Very comfortable' }
] as const;

export const SPEND_BANDS = [
  { value: 'none', label: 'Nothing' },
  { value: 'upto_500', label: 'Up to ₹500' },
  { value: 'upto_5k', label: 'Up to ₹5,000' },
  { value: 'upto_50k', label: 'Up to ₹50,000' },
  { value: 'any', label: 'Any amount' }
] as const;

/**
 * One survey, shown only after the participant has seen BOTH a payment with no
 * checking and a payment that got stopped.
 *
 * The earlier design asked about comfort straight after the unverified payment,
 * which primed them to hunt for a problem before they had been shown one, and
 * contaminated the baseline. Asking both conditions retrospectively keeps the
 * comparison and removes the cue.
 *
 * The spend-limit pair matters more than the comfort pair: "willingness to
 * delegate" is literally an amount, and a band is harder to answer politely
 * than a 1-5 rating.
 */
export const SURVEY = {
  intro: 'You just saw the same payment two ways. A few quick questions.',
  comfortWithout: 'Thinking back to the first payment — how comfortable were you letting this assistant pay on your behalf?',
  comfortWith: 'And with the check switched on?',
  limitWithout: 'With no checking, what is the most you would let an AI agent pay without asking you first?',
  limitWith: 'With the check switched on, what is the most you would let it pay?',
  noticedSwap: 'Before we showed you, did you have any idea a different model had been used?',
  whatMattered: 'Which part mattered more to you?',
  wouldSwitch: 'Would you move to a provider that shows you this check?',
  freeText: 'What would make you trust an AI agent with your money?'
} as const;

export const NOTICED_OPTIONS = [
  { value: 'no', label: 'No idea' },
  { value: 'unsure', label: 'Not sure' },
  { value: 'yes', label: 'I suspected' }
] as const;

export const MATTERED_OPTIONS = [
  { value: 'blocked', label: 'That the payment was stopped' },
  { value: 'visibility', label: 'That I could see which model ran' },
  { value: 'both', label: 'Both equally' },
  { value: 'neither', label: 'Neither really' }
] as const;

export const SWITCH_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'no', label: 'No' }
] as const;

/* -------------------------------------------------------------------------- */
/*  Misc                                                                      */
/* -------------------------------------------------------------------------- */

export function generateNonce(): string {
  return String(Math.floor(100_000 + Math.random() * 900_000));
}

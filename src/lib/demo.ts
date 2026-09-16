/**
 * Every constant and every participant-facing string, in one file.
 *
 * Two reasons this is centralised rather than inlined in components:
 *   1. The demo values have to be identical on both phones and in the exported
 *      research data, or the verdict table stops being convincing.
 *   2. The honest-scope wording is the part of this prototype most likely to be
 *      edited under time pressure. Keeping it in one place makes it hard to
 *      accidentally leave an overclaim on one screen.
 */

import type { ModelState } from './types';

/* -------------------------------------------------------------------------- */
/*  Models                                                                    */
/* -------------------------------------------------------------------------- */

export const AUTHORIZED_MODEL = {
  name: 'Frontier Model X',
  id: 'FL-LLM-001',
  commitment: '0x83ab...7f21'
} as const;

export const DOWNGRADED_MODEL = {
  name: 'Frontier Model Lite',
  id: 'FL-LLM-002',
  commitment: '0x91cd...42aa'
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
  /** Shown in the receipt so it reads like a real biller reference. */
  consumerNo: 'MSEDCL 4417 2290'
} as const;

/**
 * The first nonce matches the value in the product spec so the very first demo of
 * the day reads exactly as designed; later attempts get a fresh one, because a
 * nonce that never changes would misrepresent what a nonce is for.
 */
export const FIRST_NONCE = '829173';

export const TXN_PREFIX = 'SIMULATED-UPI-';

/* -------------------------------------------------------------------------- */
/*  Requests the customer can make                                            */
/* -------------------------------------------------------------------------- */

export interface PaymentIntent {
  /** Tappable suggestion text, also what matches free-text input. */
  prompt: string;
  label: string;
  recipient: string;
  amountPaise: number;
  keywords: string[];
}

/**
 * Electricity is first and is the recommended opener: a bill is more relatable
 * than "send Rs 100", and a bill the participant recognises makes the blocked
 * screen land harder.
 */
export const PAYMENT_INTENTS: PaymentIntent[] = [
  {
    prompt: 'Pay my electricity bill',
    label: 'Electricity Bill',
    recipient: 'Maharashtra State Electricity Board',
    amountPaise: 185_000,
    keywords: ['electric', 'electricity', 'power', 'current', 'mseb', 'msedcl', 'bill']
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
 * researcher's flow never dead-ends in front of a participant.
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

/**
 * Tuned so that: downgrade -> blocked -> restore -> approved fits inside the
 * ten seconds a person will stand still for at a networking event.
 */
export const TIMING = {
  /** Verification OFF: one soft "thinking" beat, then approval. */
  unverifiedThinking: 1_200,
  /** Verification ON: three stages, ~1.8s total. */
  verifyStage: 600,
  /** Beat between the final stage resolving and the verdict appearing. */
  verdictReveal: 320,
  /** How long "Ready for next participant" shows before the clean slate. */
  handoff: 1_100
} as const;

export const VERIFY_STAGES = [
  'Requesting model identity',
  'Comparing model commitment',
  'Checking execution record'
] as const;

/* -------------------------------------------------------------------------- */
/*  Honest-scope copy                                                         */
/* -------------------------------------------------------------------------- */

/**
 * The single most important string in the codebase. It appears on every screen
 * of both phones. This prototype simulates a verification layer; it does not
 * implement one, and it must never imply otherwise.
 */
export const SIMULATION_LABEL = 'Research prototype — cryptographic verification simulated';

export const SIMULATION_LABEL_SHORT = 'Simulated verification';

export const PRODUCTION_NOTE =
  'In a production system, this verification would be backed by cryptographic proofs. This demo simulates the result.';

/** Shown in the verification details panel, so the narrow claim stays visible. */
export const NARROW_CLAIM =
  'This check only asks whether the computation was associated with the model identity you authorized. It does not assess whether the model is safe, unbiased, correct, or whether the payment itself is a good idea.';

export const BLOCKED_EXPLAINER = {
  title: 'Your payment was protected.',
  body: [
    'You authorized Frontier Model X for this action.',
    'The system detected that the computation was associated with a different model.',
    'Because the model identity did not match your authorization, the payment was not executed.'
  ]
} as const;

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

export const SURVEY_COPY = {
  baseline_unverified: {
    eyebrow: 'One quick question',
    comfort: 'How comfortable would you be allowing this AI agent to make a payment on your behalf?',
    larger: 'Would you allow the agent to make a larger payment?',
    freeText: null
  },
  after_verification: {
    eyebrow: 'Same question, one more time',
    comfort: 'How comfortable would you NOW be allowing this AI agent to make a payment on your behalf?',
    larger: 'Would you allow the agent to make a larger payment?',
    freeText: 'What would make you trust an AI agent with your money?'
  }
} as const;

/* -------------------------------------------------------------------------- */
/*  Session codes                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Crockford-ish alphabet: no 0/O, no 1/I/L, no U. A code is read aloud and typed
 * once by the researcher during setup, so ambiguous glyphs are pure downside.
 */
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

export function generateCode(length = 4): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

export function generateNonce(): string {
  return String(Math.floor(100_000 + Math.random() * 900_000));
}

export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^0-9A-Z]/g, '');
}

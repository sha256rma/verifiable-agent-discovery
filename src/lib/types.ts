/**
 * Shared types for the two-phone demo.
 *
 * The whole live demo is ONE database row (`vdemo_rigs`). Both phones subscribe to it.
 * That is a deliberate reliability choice: one channel, one subscription, one failure mode.
 */

/** The demo state machine. Only the server writes this field. */
export type DemoState =
  | 'INITIALIZED'
  | 'PAYMENT_REQUESTED'
  | 'VERIFYING'
  | 'VERIFICATION_SUCCESS'
  | 'VERIFICATION_FAILURE'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_BLOCKED';

/** Which model the provider currently has deployed. Written by the provider phone. */
export type ModelState = 'MODEL_VERIFIED' | 'MODEL_DOWNGRADED';

/**
 * Outcome of the simulated verification.
 *
 * `NOT_PERFORMED` is its own value rather than a null, because "we never checked"
 * is the entire control condition of the experiment and deserves to be explicit
 * in the data we export.
 */
export type VerificationStatus = 'IDLE' | 'PASS' | 'FAIL' | 'NOT_PERFORMED';

export type PaymentStatus = 'IDLE' | 'APPROVED' | 'BLOCKED';

/** Which of the two survey moments a response belongs to. */
export type SurveyPhase = 'baseline_unverified' | 'after_verification';

export type LargerPaymentAnswer = 'yes' | 'maybe' | 'no';

/**
 * The receipt for one payment attempt, decided server-side and frozen at request time.
 * Stored as jsonb on the rig row and rendered verbatim by the verification screens.
 */
export interface VerificationReceipt {
  /** What the customer authorized. */
  authorizedModel: string;
  authorizedModelId: string;
  authorizedCommitment: string;
  /**
   * What the provider actually had deployed at the instant of the request.
   * Absent when verification was off — we genuinely did not look.
   */
  detectedModel: string | null;
  detectedModelId: string | null;
  reportedCommitment: string | null;
  /** null when no check was performed. */
  match: boolean | null;
  result: 'VALID' | 'INVALID' | 'NOT_PERFORMED';
  paymentStatus: Extract<PaymentStatus, 'APPROVED' | 'BLOCKED'>;
  /** Session freshness value, regenerated per attempt. */
  nonce: string;
  sessionCode: string;
  transactionRef: string;
  amountPaise: number;
  payeeLabel: string;
  payeeName: string;
  verificationEnabled: boolean;
  decidedAt: string;
}

/** The live row, exactly as it comes back from Postgres. */
export interface RigRow {
  id: string;
  rig_code: string;
  session_id: string;
  session_code: string;
  participant_no: number;

  authorized_model: string;
  authorized_model_id: string;
  authorized_commitment: string;

  current_model: string;
  current_model_id: string;
  current_commitment: string;
  model_state: ModelState;

  verification_enabled: boolean;
  verification_status: VerificationStatus;
  payment_status: PaymentStatus;
  state: DemoState;

  payment_amount_paise: number;
  payment_label: string;
  payment_recipient: string;

  last_verification: VerificationReceipt | null;
  last_event: string;
  /** Set by the researcher to summon a survey on the customer phone. */
  survey_prompt: SurveyPhase | null;

  created_at: string;
  updated_at: string;
}

/**
 * What the CUSTOMER phone is allowed to hold in state.
 *
 * Every provider-controlled field is stripped the instant a payload arrives, so the
 * currently-deployed model never reaches customer component state or React devtools.
 * See `toCustomerView` in `lib/rigView.ts` and the honest-scope note in the README.
 */
export type CustomerRigView = Omit<
  RigRow,
  'current_model' | 'current_model_id' | 'current_commitment' | 'model_state' | 'last_event'
>;

/** Connection state for the header pill. */
export type LinkStatus = 'connecting' | 'connected' | 'reconnecting';

export interface SurveyResponseRow {
  id: string;
  rig_code: string;
  session_id: string;
  session_code: string;
  participant_no: number;
  phase: SurveyPhase;
  comfort: number | null;
  larger_payment: LargerPaymentAnswer | null;
  free_text: string | null;
  verification_enabled_at_time: boolean;
  created_at: string;
}

import type { CustomerRigView, RigRow } from './types';

/**
 * Strips every provider-controlled field from a rig payload.
 *
 * The demo hinges on the customer NOT learning that the model was swapped until
 * the verification layer tells them. Both phones subscribe to the same row, so
 * this runs the instant a payload arrives — before anything reaches React state
 * — which keeps the deployed model out of component state and devtools.
 *
 * Honest limitation, also stated in the README: a determined participant reading
 * the raw WebSocket frame in a debugger could still see it. Per-role redacted
 * channels are the production fix; this is a demo, and the correct move is to be
 * upfront about the gap rather than imply a guarantee we do not have.
 */
export function toCustomerView(row: RigRow): CustomerRigView {
  const {
    current_model: _model,
    current_model_id: _modelId,
    current_commitment: _commitment,
    model_state: _modelState,
    last_event: _lastEvent,
    ...safe
  } = row;
  return safe;
}

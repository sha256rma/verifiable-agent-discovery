'use client';

import { supabaseBrowser } from './supabaseBrowser';
import type { LargerPaymentAnswer, RigRow, SurveyPhase } from './types';

/**
 * Thin wrappers over the SECURITY DEFINER functions that own the state machine.
 *
 * The browser has no write access to any table. Everything below is an RPC, so
 * the set of transitions a phone can request is exactly the set the database is
 * willing to perform — nothing wider.
 */

function client() {
  const supabase = supabaseBrowser();
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }
  return supabase;
}

async function rpc(fn: string, args: Record<string, unknown> = {}): Promise<RigRow> {
  const { data, error } = await client().rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as RigRow;
}

/** Called once by the researcher, before the event. */
export function createRig(): Promise<RigRow> {
  return rpc('vdemo_create_rig');
}

export async function fetchRig(rigCode: string): Promise<RigRow | null> {
  const { data, error } = await client()
    .from('vdemo_rigs')
    .select('*')
    .eq('rig_code', rigCode.toUpperCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as RigRow | null) ?? null;
}

export function setModel(rigCode: string, action: 'downgrade' | 'restore'): Promise<RigRow> {
  return rpc('vdemo_set_model', { p_rig_code: rigCode, p_action: action });
}

export function setVerification(rigCode: string, enabled: boolean): Promise<RigRow> {
  return rpc('vdemo_set_verification', { p_rig_code: rigCode, p_enabled: enabled });
}

/**
 * The gate. Returns the decided row — the verdict is already final when this
 * resolves, which is why the animation that follows can never contradict it.
 */
export function requestPayment(
  rigCode: string,
  payment?: { label: string; recipient: string; amountPaise: number }
): Promise<RigRow> {
  return rpc('vdemo_request_payment', {
    p_rig_code: rigCode,
    p_label: payment?.label ?? null,
    p_recipient: payment?.recipient ?? null,
    p_amount_paise: payment?.amountPaise ?? null
  });
}

export function resetRig(
  rigCode: string,
  mode: 'next_participant' | 'reset_demo'
): Promise<RigRow> {
  return rpc('vdemo_reset', { p_rig_code: rigCode, p_mode: mode });
}

export function promptSurvey(rigCode: string, phase: SurveyPhase | null): Promise<RigRow> {
  return rpc('vdemo_prompt_survey', { p_rig_code: rigCode, p_phase: phase });
}

export function submitSurvey(
  rigCode: string,
  phase: SurveyPhase,
  answers: { comfort?: number | null; larger?: LargerPaymentAnswer | null; freeText?: string | null }
): Promise<RigRow> {
  return rpc('vdemo_submit_survey', {
    p_rig_code: rigCode,
    p_phase: phase,
    p_comfort: answers.comfort ?? null,
    p_larger: answers.larger ?? null,
    p_free_text: answers.freeText ?? null
  });
}

/** Research data. The browser key cannot read the responses table directly. */
export async function exportRig(rigCode: string): Promise<unknown> {
  const { data, error } = await client().rpc('vdemo_export', { p_rig_code: rigCode });
  if (error) throw new Error(error.message);
  return data;
}

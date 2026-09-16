'use client';

import { supabaseBrowser } from './supabaseBrowser';
import type { RigRow, SurveyAnswers } from './types';

/**
 * Thin wrappers over the SECURITY DEFINER functions that own the state machine.
 *
 * The browser has no write access to any table. Everything below is an RPC, so
 * the set of transitions a phone can request is exactly the set the database is
 * willing to perform — nothing wider.
 */

/**
 * There is one demo rig, shared by the two phones. No pairing codes: one phone
 * picks customer, the other picks provider, and that is the entire setup.
 */
export const RIG = 'SOLO';

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

/** Get-or-create the shared rig. Safe to call from both phones at once. */
export function soloRig(): Promise<RigRow> {
  return rpc('vdemo_solo_rig');
}

export async function fetchRig(): Promise<RigRow | null> {
  const { data, error } = await client()
    .from('vdemo_rigs')
    .select('*')
    .eq('rig_code', RIG)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as RigRow | null) ?? null;
}

export function setModel(action: 'downgrade' | 'restore'): Promise<RigRow> {
  return rpc('vdemo_set_model', { p_rig_code: RIG, p_action: action });
}

export function setVerification(enabled: boolean): Promise<RigRow> {
  return rpc('vdemo_set_verification', { p_rig_code: RIG, p_enabled: enabled });
}

/**
 * The gate. Returns the decided row — the verdict is already final when this
 * resolves, which is why the animation that follows can never contradict it.
 */
export function requestPayment(payment?: {
  label: string;
  recipient: string;
  amountPaise: number;
}): Promise<RigRow> {
  return rpc('vdemo_request_payment', {
    p_rig_code: RIG,
    p_label: payment?.label ?? null,
    p_recipient: payment?.recipient ?? null,
    p_amount_paise: payment?.amountPaise ?? null
  });
}

export function resetRig(mode: 'next_participant' | 'reset_demo'): Promise<RigRow> {
  return rpc('vdemo_reset', { p_rig_code: RIG, p_mode: mode });
}

export function promptSurvey(open: boolean): Promise<RigRow> {
  return rpc('vdemo_prompt_survey', { p_rig_code: RIG, p_open: open });
}

export function submitSurvey(answers: SurveyAnswers): Promise<RigRow> {
  return rpc('vdemo_submit_survey', {
    p_rig_code: RIG,
    p_comfort_without: answers.comfortWithout ?? null,
    p_comfort_with: answers.comfortWith ?? null,
    p_limit_without: answers.limitWithout ?? null,
    p_limit_with: answers.limitWith ?? null,
    p_noticed_swap: answers.noticedSwap ?? null,
    p_would_switch: answers.wouldSwitch ?? null,
    p_what_mattered: answers.whatMattered ?? null,
    p_free_text: answers.freeText ?? null
  });
}

/** Research data. The browser key cannot read the responses table directly. */
export async function exportRig(): Promise<unknown> {
  const { data, error } = await client().rpc('vdemo_export', { p_rig_code: RIG });
  if (error) throw new Error(error.message);
  return data;
}

/** Shown in the researcher panel so it is obvious answers are landing. */
export async function responseCount(): Promise<number> {
  const { data, error } = await client().rpc('vdemo_response_count', { p_rig_code: RIG });
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}

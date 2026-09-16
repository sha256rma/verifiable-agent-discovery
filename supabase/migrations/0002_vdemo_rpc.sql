-- ===========================================================================
--  The state machine, as SECURITY DEFINER functions.
--
--  The browser never writes to a table. It holds a publishable key with SELECT
--  on vdemo_rigs and nothing else, and every transition goes through one of the
--  narrow functions below. Two things follow:
--
--    * A participant holding the customer phone cannot write their own verdict.
--    * The payment gate is one locked, atomic statement, so the verdict is
--      frozen at the instant of the request and a downgrade landing mid-
--      animation cannot flip an outcome already on screen.
--
--  All functions pin search_path and schema-qualify every reference.
-- ===========================================================================

-- Unambiguous alphabet: no 0/O, no 1/I/L, no U. Codes get read aloud.
create or replace function public.vdemo_gen_code(p_len integer default 4)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_alphabet constant text := '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_out text := '';
  i integer;
begin
  for i in 1..p_len loop
    v_out := v_out || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
  end loop;
  return v_out;
end;
$$;

create or replace function public.vdemo_gen_nonce()
returns text
language sql
set search_path = ''
as $$
  select lpad((100000 + floor(random() * 900000))::int::text, 6, '0');
$$;

-- ---------------------------------------------------------------------------
--  Create a rig. Called once, by the researcher, before the event.
-- ---------------------------------------------------------------------------
create or replace function public.vdemo_create_rig()
returns public.vdemo_rigs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rig public.vdemo_rigs;
  v_code text;
  v_tries integer := 0;
begin
  loop
    v_tries := v_tries + 1;
    v_code := public.vdemo_gen_code(4);
    begin
      insert into public.vdemo_rigs (rig_code, session_code, last_event)
      values (v_code, public.vdemo_gen_code(4), 'Rig created')
      returning * into v_rig;
      exit;
    exception when unique_violation then
      if v_tries >= 12 then
        raise exception 'could not allocate a free rig code';
      end if;
    end;
  end loop;

  insert into public.vdemo_events (rig_code, session_id, participant_no, kind, payload)
  values (v_rig.rig_code, v_rig.session_id, v_rig.participant_no, 'RIG_CREATED', null);

  return v_rig;
end;
$$;

-- ---------------------------------------------------------------------------
--  Provider: downgrade / restore the deployed model.
-- ---------------------------------------------------------------------------
create or replace function public.vdemo_set_model(p_rig_code text, p_action text)
returns public.vdemo_rigs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rig public.vdemo_rigs;
begin
  if p_action not in ('downgrade', 'restore') then
    raise exception 'unknown model action: %', p_action;
  end if;

  select * into v_rig from public.vdemo_rigs where rig_code = upper(p_rig_code) for update;
  if not found then
    raise exception 'no such rig: %', p_rig_code;
  end if;

  if p_action = 'downgrade' then
    update public.vdemo_rigs set
      current_model      = 'Frontier Model Lite',
      current_model_id   = 'FL-LLM-002',
      current_commitment = '0x91cd...42aa',
      model_state        = 'MODEL_DOWNGRADED',
      last_event         = 'Provider downgraded the deployed model'
    where id = v_rig.id
    returning * into v_rig;
  else
    update public.vdemo_rigs set
      current_model      = authorized_model,
      current_model_id   = authorized_model_id,
      current_commitment = authorized_commitment,
      model_state        = 'MODEL_VERIFIED',
      last_event         = 'Provider restored the authorized model'
    where id = v_rig.id
    returning * into v_rig;
  end if;

  insert into public.vdemo_events (rig_code, session_id, participant_no, kind, payload)
  values (v_rig.rig_code, v_rig.session_id, v_rig.participant_no,
          case when p_action = 'downgrade' then 'MODEL_DOWNGRADED' else 'MODEL_RESTORED' end,
          jsonb_build_object('current_model', v_rig.current_model));

  return v_rig;
end;
$$;

-- ---------------------------------------------------------------------------
--  Verification toggle. Writable by the customer AND by the researcher.
-- ---------------------------------------------------------------------------
create or replace function public.vdemo_set_verification(p_rig_code text, p_enabled boolean)
returns public.vdemo_rigs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rig public.vdemo_rigs;
begin
  update public.vdemo_rigs set
    verification_enabled = p_enabled,
    last_event = case when p_enabled then 'Verification turned ON' else 'Verification turned OFF' end
  where rig_code = upper(p_rig_code)
  returning * into v_rig;

  if not found then
    raise exception 'no such rig: %', p_rig_code;
  end if;

  insert into public.vdemo_events (rig_code, session_id, participant_no, kind, payload)
  values (v_rig.rig_code, v_rig.session_id, v_rig.participant_no, 'VERIFICATION_TOGGLED',
          jsonb_build_object('enabled', p_enabled));

  return v_rig;
end;
$$;

-- ---------------------------------------------------------------------------
--  THE GATE.
--
--  Reads the row under a lock, decides, writes the final state, returns it.
--  Comparison is on the commitment rather than the display name, because the
--  claim being simulated is about cryptographic identity and not about a label.
--
--  When verification is OFF the model columns are never consulted and the
--  receipt records detected_* as null: we genuinely did not look. That is the
--  control condition, and it deserves to be explicit in the exported data.
--
--  This is the ONLY place a verdict is produced. See "Replacing the simulation
--  with real verification" in the README.
-- ---------------------------------------------------------------------------
create or replace function public.vdemo_request_payment(
  p_rig_code      text,
  p_label         text default null,
  p_recipient     text default null,
  p_amount_paise  integer default null
)
returns public.vdemo_rigs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rig     public.vdemo_rigs;
  v_status  text;
  v_payment text;
  v_state   text;
  v_result  text;
  v_match   boolean;
  v_nonce   text;
  v_amount  integer;
  v_label   text;
  v_payee   text;
  v_receipt jsonb;
begin
  select * into v_rig from public.vdemo_rigs where rig_code = upper(p_rig_code) for update;
  if not found then
    raise exception 'no such rig: %', p_rig_code;
  end if;

  v_amount := coalesce(p_amount_paise, v_rig.payment_amount_paise);
  v_label  := coalesce(nullif(p_label, ''), v_rig.payment_label);
  v_payee  := coalesce(nullif(p_recipient, ''), v_rig.payment_recipient);

  -- The first attempt of each participant uses the nonce from the product spec,
  -- so the very first screen a participant sees reads exactly as designed.
  -- Later attempts get a fresh one, because a nonce that never changes would
  -- misrepresent what a nonce is for.
  v_nonce := case when v_rig.last_verification is null then '829173' else public.vdemo_gen_nonce() end;

  if not v_rig.verification_enabled then
    v_status := 'NOT_PERFORMED'; v_payment := 'APPROVED';
    v_state  := 'PAYMENT_APPROVED'; v_result := 'NOT_PERFORMED'; v_match := null;
  elsif v_rig.current_commitment = v_rig.authorized_commitment then
    v_status := 'PASS'; v_payment := 'APPROVED';
    v_state  := 'PAYMENT_APPROVED'; v_result := 'VALID'; v_match := true;
  else
    v_status := 'FAIL'; v_payment := 'BLOCKED';
    v_state  := 'PAYMENT_BLOCKED'; v_result := 'INVALID'; v_match := false;
  end if;

  v_receipt := jsonb_build_object(
    'authorizedModel',      v_rig.authorized_model,
    'authorizedModelId',    v_rig.authorized_model_id,
    'authorizedCommitment', v_rig.authorized_commitment,
    'detectedModel',        case when v_rig.verification_enabled then v_rig.current_model      else null end,
    'detectedModelId',      case when v_rig.verification_enabled then v_rig.current_model_id   else null end,
    'reportedCommitment',   case when v_rig.verification_enabled then v_rig.current_commitment else null end,
    'match',                v_match,
    'result',               v_result,
    'paymentStatus',        v_payment,
    'nonce',                v_nonce,
    'sessionCode',          v_rig.session_code,
    'transactionRef',       'SIMULATED-UPI-' || v_nonce,
    'amountPaise',          v_amount,
    'payeeLabel',           v_label,
    'payeeName',            v_payee,
    'verificationEnabled',  v_rig.verification_enabled,
    'decidedAt',            to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );

  update public.vdemo_rigs set
    verification_status  = v_status,
    payment_status       = v_payment,
    state                = v_state,
    payment_amount_paise = v_amount,
    payment_label        = v_label,
    payment_recipient    = v_payee,
    last_verification    = v_receipt,
    last_event           = case
                             when v_payment = 'BLOCKED' then 'Payment BLOCKED — model mismatch'
                             when v_status  = 'PASS'    then 'Payment approved after verification'
                             else 'Payment approved with NO verification'
                           end
  where id = v_rig.id
  returning * into v_rig;

  insert into public.vdemo_events (rig_code, session_id, participant_no, kind, payload)
  values (v_rig.rig_code, v_rig.session_id, v_rig.participant_no, 'PAYMENT_DECIDED', v_receipt);

  return v_rig;
end;
$$;

-- ---------------------------------------------------------------------------
--  Reset.
--
--  'next_participant' assigns a fresh session_id/session_code and rewrites
--  EVERY state column back to its default. The write is exhaustive rather than
--  partial on purpose: that is what makes it impossible for a value to survive
--  from one participant to the next.
--
--  'reset_demo' does the same but keeps the current participant and session,
--  for when something goes sideways mid-conversation.
-- ---------------------------------------------------------------------------
create or replace function public.vdemo_reset(p_rig_code text, p_mode text default 'next_participant')
returns public.vdemo_rigs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rig public.vdemo_rigs;
begin
  if p_mode not in ('next_participant', 'reset_demo') then
    raise exception 'unknown reset mode: %', p_mode;
  end if;

  select * into v_rig from public.vdemo_rigs where rig_code = upper(p_rig_code) for update;
  if not found then
    raise exception 'no such rig: %', p_rig_code;
  end if;

  update public.vdemo_rigs set
    session_id           = case when p_mode = 'next_participant' then gen_random_uuid() else session_id end,
    session_code         = case when p_mode = 'next_participant' then public.vdemo_gen_code(4) else session_code end,
    participant_no       = case when p_mode = 'next_participant' then participant_no + 1 else participant_no end,

    current_model        = authorized_model,
    current_model_id     = authorized_model_id,
    current_commitment   = authorized_commitment,
    model_state          = 'MODEL_VERIFIED',

    verification_enabled = false,
    verification_status  = 'IDLE',
    payment_status       = 'IDLE',
    state                = 'INITIALIZED',

    payment_amount_paise = 185000,
    payment_label        = 'Electricity Bill',
    payment_recipient    = 'Maharashtra State Electricity Board',

    last_verification    = null,
    survey_prompt        = null,
    last_event           = case when p_mode = 'next_participant'
                                then 'Ready for next participant'
                                else 'Demo reset' end
  where id = v_rig.id
  returning * into v_rig;

  insert into public.vdemo_events (rig_code, session_id, participant_no, kind, payload)
  values (v_rig.rig_code, v_rig.session_id, v_rig.participant_no,
          case when p_mode = 'next_participant' then 'NEXT_PARTICIPANT' else 'DEMO_RESET' end, null);

  return v_rig;
end;
$$;

-- ---------------------------------------------------------------------------
--  Survey: summon on the customer phone, and record an answer.
-- ---------------------------------------------------------------------------
create or replace function public.vdemo_prompt_survey(p_rig_code text, p_phase text default null)
returns public.vdemo_rigs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rig public.vdemo_rigs;
begin
  if p_phase is not null and p_phase not in ('baseline_unverified', 'after_verification') then
    raise exception 'unknown survey phase: %', p_phase;
  end if;

  update public.vdemo_rigs set
    survey_prompt = p_phase,
    last_event = case when p_phase is null then 'Survey dismissed' else 'Survey shown: ' || p_phase end
  where rig_code = upper(p_rig_code)
  returning * into v_rig;

  if not found then
    raise exception 'no such rig: %', p_rig_code;
  end if;

  return v_rig;
end;
$$;

-- `verification_enabled_at_time` exists so a response can never be
-- mis-attributed to the wrong experimental condition. Reading the LIVE toggle
-- at submit time defeats that: a participant who takes a while to answer while
-- the researcher flips verification would be recorded under the wrong
-- condition. Derive it from the receipt of the run actually being rated.
create or replace function public.vdemo_submit_survey(
  p_rig_code   text,
  p_phase      text,
  p_comfort    integer default null,
  p_larger     text default null,
  p_free_text  text default null
)
returns public.vdemo_rigs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rig       public.vdemo_rigs;
  v_condition boolean;
begin
  select * into v_rig from public.vdemo_rigs where rig_code = upper(p_rig_code) for update;
  if not found then
    raise exception 'no such rig: %', p_rig_code;
  end if;

  v_condition := coalesce(
    (v_rig.last_verification->>'verificationEnabled')::boolean,
    v_rig.verification_enabled
  );

  insert into public.vdemo_responses (
    rig_code, session_id, session_code, participant_no, phase,
    comfort, larger_payment, free_text, verification_enabled_at_time
  ) values (
    v_rig.rig_code, v_rig.session_id, v_rig.session_code, v_rig.participant_no, p_phase,
    p_comfort, nullif(p_larger, ''), nullif(btrim(coalesce(p_free_text, '')), ''), v_condition
  )
  on conflict (session_id, phase) do update set
    comfort        = coalesce(excluded.comfort, public.vdemo_responses.comfort),
    larger_payment = coalesce(excluded.larger_payment, public.vdemo_responses.larger_payment),
    free_text      = coalesce(excluded.free_text, public.vdemo_responses.free_text),
    created_at     = now();

  update public.vdemo_rigs set
    survey_prompt = null,
    last_event = 'Survey answered: ' || p_phase
  where id = v_rig.id
  returning * into v_rig;

  return v_rig;
end;
$$;

-- ---------------------------------------------------------------------------
--  Export. The browser key cannot SELECT vdemo_responses, so the researcher's
--  export comes back through this definer function instead.
-- ---------------------------------------------------------------------------
create or replace function public.vdemo_export(p_rig_code text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'rig_code', upper(p_rig_code),
    'exported_at', now(),
    'responses', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.participant_no, r.phase)
      from public.vdemo_responses r where r.rig_code = upper(p_rig_code)
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.created_at)
      from public.vdemo_events e where e.rig_code = upper(p_rig_code)
    ), '[]'::jsonb)
  );
$$;

-- ---------------------------------------------------------------------------
--  Grants. Explicit rather than relying on the PUBLIC default.
-- ---------------------------------------------------------------------------
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.vdemo_create_rig()',
    'public.vdemo_set_model(text, text)',
    'public.vdemo_set_verification(text, boolean)',
    'public.vdemo_request_payment(text, text, text, integer)',
    'public.vdemo_reset(text, text)',
    'public.vdemo_prompt_survey(text, text)',
    'public.vdemo_submit_survey(text, text, integer, text, text)',
    'public.vdemo_export(text)'
  ] loop
    execute format('revoke all on function %s from public', fn);
    execute format('grant execute on function %s to anon, authenticated', fn);
  end loop;
end
$$;

-- Internal helpers stay off the public API surface. Supabase sets default
-- privileges that grant EXECUTE to anon/authenticated directly on new functions
-- in `public`, so revoking from PUBLIC alone leaves those direct grants intact —
-- they have to be named explicitly.
revoke all on function public.vdemo_gen_code(integer) from public, anon, authenticated;
revoke all on function public.vdemo_gen_nonce() from public, anon, authenticated;
revoke all on function public.vdemo_touch_updated_at() from public, anon, authenticated;

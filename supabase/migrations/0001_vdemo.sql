-- ===========================================================================
--  Verifiable-agent research prototype — schema
--
--  Three tables, all namespaced `vdemo_` so they sit safely alongside the
--  unrelated tables already in this project.
--
--    vdemo_rigs       THE live row. One per pairing of two phones. Holds the
--                     entire demo state; both phones subscribe to it.
--    vdemo_responses  Survey answers. Keyed to session_id, so they survive
--                     participant handoff. This is the research output.
--    vdemo_events     Append-only timeline, for reconstructing a demo afterwards.
--
--  There is no auth and no PII by design: a participant never creates an
--  account, gives an email, or is identified by anything but a counter.
-- ===========================================================================

-- ---------------------------------------------------------------------------
--  vdemo_rigs
-- ---------------------------------------------------------------------------
-- A "rig" is the persistent pairing between the researcher's phone and the
-- customer phone. It lives for the whole event. A "session" is one participant
-- and lives INSIDE this row as session_id / session_code.
--
-- NEXT PARTICIPANT does not re-pair anything: it rewrites every state column
-- back to its default and assigns a fresh session_id. Because that write is
-- column-wise and exhaustive rather than partial, no value can survive from one
-- participant to the next. That is the isolation guarantee.

create table if not exists public.vdemo_rigs (
  id                     uuid        primary key default gen_random_uuid(),
  rig_code               text        not null unique,

  -- Current participant.
  session_id             uuid        not null default gen_random_uuid(),
  session_code           text        not null,
  participant_no         integer     not null default 1,

  -- What the customer authorized. Constant for the whole demo.
  authorized_model       text        not null default 'Frontier Model X',
  authorized_model_id    text        not null default 'FL-LLM-001',
  authorized_commitment  text        not null default '0x83ab...7f21',

  -- What the provider actually has deployed. Written by the provider phone.
  current_model          text        not null default 'Frontier Model X',
  current_model_id       text        not null default 'FL-LLM-001',
  current_commitment     text        not null default '0x83ab...7f21',
  model_state            text        not null default 'MODEL_VERIFIED'
                                     check (model_state in ('MODEL_VERIFIED', 'MODEL_DOWNGRADED')),

  -- Customer-controlled. Starts OFF: the control condition comes first.
  verification_enabled   boolean     not null default false,

  -- Server-written only. The customer phone cannot set its own verdict.
  verification_status    text        not null default 'IDLE'
                                     check (verification_status in ('IDLE', 'PASS', 'FAIL', 'NOT_PERFORMED')),
  payment_status         text        not null default 'IDLE'
                                     check (payment_status in ('IDLE', 'APPROVED', 'BLOCKED')),
  state                  text        not null default 'INITIALIZED'
                                     check (state in (
                                       'INITIALIZED', 'PAYMENT_REQUESTED', 'VERIFYING',
                                       'VERIFICATION_SUCCESS', 'VERIFICATION_FAILURE',
                                       'PAYMENT_APPROVED', 'PAYMENT_BLOCKED'
                                     )),

  -- The pending / most recent payment. Integer paise.
  payment_amount_paise   integer     not null default 185000,
  payment_label          text        not null default 'Electricity Bill',
  payment_recipient      text        not null default 'Maharashtra State Electricity Board',

  -- Frozen receipt for the most recent attempt, rendered by the verdict screens.
  last_verification      jsonb,

  -- Human-readable breadcrumb for the researcher's live strip.
  last_event             text        not null default 'Rig created',

  -- Set by the researcher to summon a survey on the customer phone.
  survey_prompt          text        check (survey_prompt in ('baseline_unverified', 'after_verification')),

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists vdemo_rigs_rig_code_idx on public.vdemo_rigs (rig_code);

-- ---------------------------------------------------------------------------
--  vdemo_responses — the actual research data
-- ---------------------------------------------------------------------------
-- One row per (participant, phase). `phase` is what makes the experiment
-- readable: baseline_unverified is measured after the participant has seen a
-- payment succeed with no verification, after_verification is measured once
-- they have seen the model-mismatch block.

create table if not exists public.vdemo_responses (
  id                           uuid        primary key default gen_random_uuid(),
  rig_code                     text        not null,
  session_id                   uuid        not null,
  session_code                 text        not null,
  participant_no               integer     not null,
  phase                        text        not null
                                           check (phase in ('baseline_unverified', 'after_verification')),
  comfort                      integer     check (comfort between 1 and 5),
  larger_payment               text        check (larger_payment in ('yes', 'maybe', 'no')),
  free_text                    text,
  -- Recorded so a response can never be mis-attributed to the wrong condition.
  verification_enabled_at_time boolean     not null default false,
  created_at                   timestamptz not null default now(),

  -- One answer per phase per participant; re-submitting updates in place.
  unique (session_id, phase)
);

create index if not exists vdemo_responses_rig_idx on public.vdemo_responses (rig_code, participant_no);

-- ---------------------------------------------------------------------------
--  vdemo_events — append-only timeline
-- ---------------------------------------------------------------------------

create table if not exists public.vdemo_events (
  id             uuid        primary key default gen_random_uuid(),
  rig_code       text        not null,
  session_id     uuid        not null,
  participant_no integer     not null,
  kind           text        not null,
  payload        jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists vdemo_events_session_idx on public.vdemo_events (session_id, created_at);

-- ---------------------------------------------------------------------------
--  updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.vdemo_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists vdemo_rigs_touch on public.vdemo_rigs;
create trigger vdemo_rigs_touch
  before update on public.vdemo_rigs
  for each row execute function public.vdemo_touch_updated_at();

-- ---------------------------------------------------------------------------
--  RLS
-- ---------------------------------------------------------------------------
-- The browser key gets SELECT and nothing else. That is exactly what Realtime
-- needs to stream the rig row, and it means a participant holding the customer
-- phone cannot write their own verdict. Every mutation in this app goes through
-- a server route handler using the secret key, which bypasses RLS.
--
-- These policies are scoped to the vdemo_* tables only; nothing else in this
-- project is affected.

alter table public.vdemo_rigs      enable row level security;
alter table public.vdemo_responses enable row level security;
alter table public.vdemo_events    enable row level security;

drop policy if exists vdemo_rigs_read on public.vdemo_rigs;
create policy vdemo_rigs_read
  on public.vdemo_rigs for select
  to anon, authenticated
  using (true);

-- vdemo_responses and vdemo_events get RLS enabled and NO policies at all, so
-- the browser key cannot read or write them. The researcher's export comes back
-- through the vdemo_export() definer function in 0002 instead.

-- ---------------------------------------------------------------------------
--  Realtime
-- ---------------------------------------------------------------------------
-- Only the rig row is published. Survey answers and the event log do not need
-- to be pushed anywhere.
--
-- REPLICA IDENTITY FULL so an UPDATE payload carries the complete new row and
-- the client never has to re-fetch to learn what changed.

alter table public.vdemo_rigs replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'vdemo_rigs'
  ) then
    alter publication supabase_realtime add table public.vdemo_rigs;
  end if;
end
$$;

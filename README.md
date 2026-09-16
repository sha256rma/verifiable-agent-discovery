# Verifiable AI agents for payments — two-phone research demo

A mobile-first, two-phone demo instrument for in-person user research. It exists to test one
hypothesis:

> Does verifiable model identity actually change a user's willingness to delegate financial
> actions to an AI agent?

**Live:** https://customer-discovery-theta.vercel.app

You hold one phone (the model-provider console) and hand the other to a participant (a polished AI
payment assistant). Mid-conversation you silently swap Claude Opus 5 for Claude Haiku 4.5. With
verification off, the participant's ₹1,850 payment completes and nothing on their screen looks
wrong. With verification on, the same payment is stopped and told, in plain words, that they were
being served a cheaper model. One post-demo survey then measures both conditions.

The whole loop takes 1–2 minutes per participant.

---

## What is real and what is not

There are **no real payments** — no UPI rail, no money movement.

There is **no real cryptographic verification**. No proofs are generated or checked. The
"fingerprints" are fixed display strings, and the check itself is a string comparison between two
database columns wrapped in a 1.8-second animation.

**No model is ever loaded or called.** "Claude Opus 5" and "Claude Haiku 4.5" are labels on a row.
The demo simulates a generic provider substituting a cheaper model; it does not depict anything any
specific provider does.

There is deliberately **no disclaimer badge in the app**, because you are standing next to the
participant and explaining it out loud. If this is ever left unattended or shown without narration,
add one back.

### What this demo does NOT prove

The simulated check stands in for exactly one narrow property:

> *Was this request handled by the model the customer approved?*

It says nothing about whether the model is safe, aligned or unbiased; whether it contains
backdoors; whether its output was correct; whether the agent decided well; or whether the payment
itself was a good idea. It also does not require participants to understand commitment schemes,
SNARKs, or trusted hardware — and deliberately never mentions them.

The product question is much smaller:

| | The participant's position |
|---|---|
| **Verification off** | "I have to trust the provider." |
| **Verification on** | "I can check that the model I chose is the one that ran." |

---

## Run of show (the 90-second demo)

Open the site on each phone once and pick a role — **Model provider** on yours, **Customer** on
theirs. There are no pairing codes. Each phone remembers its role, so a reload or a battery swap
needs one tap.

| # | You (provider phone) | Participant (customer phone) | What you say |
|---|---|---|---|
| 1 | — | Hand it over. Verification is **OFF**. | "This pays your bills. You picked Claude Opus 5." |
| 2 | Tap **Downgrade to Claude Haiku 4.5** | Nothing visibly changes. | *(say nothing)* |
| 3 | — | Taps a bill → **Pay ₹1,850** | "Go ahead and pay it." |
| 4 | Mirror reads `Paid · unchecked` | **Payment completed**, with a reference number — and a list of what the receipt cannot tell them | **"Would you have known the model had changed?"** ← let them answer. Do not answer for them. |
| 5 | *(model still downgraded)* | Participant flips **Model verification → ON** | "Now turn that on." |
| 6 | — | Same request → **Payment stopped** · "You were being served a cheaper model" | *(stay quiet and let them read it)* |
| 7 | — | Taps **Why was my payment stopped?** | "Have a look." |
| 8 | Tap **Restore Claude Opus 5** | Same request → **Payment verified** | "And now?" |
| 9 | Researcher controls → **Ask the questions** | The survey appears | "Two minutes, if you don't mind." |
| 10 | Tap **Next participant** | Resets itself in ~1s | Walk to the next person. |

Step 2 is the one to get right: press it while they are still reading step 1, so the swap is
genuinely invisible.

**The survey is deliberately not automatic**, and it only ever appears once, at step 9. An earlier
version popped it up straight after the unchecked payment, which primed people to go hunting for a
problem before they had been shown one and contaminated the baseline. It now asks about both
conditions retrospectively, after they have seen both.

Measured against the live deployment: tap → completed ≈ 1.9s, tap → stopped ≈ 2.3s,
stopped → restored → verified ≈ 3.3s, participant handoff ≈ 0.8s, toggle ≈ 50ms.

### If something goes wrong mid-conversation

Researcher controls → **Reset demo**. Keeps the same person and the same record, clears everything
else. **Next participant** is the harder reset: new record, so the next person's answers can never
land in this one's row.


## Architecture

```
┌──────────────────────┐                      ┌──────────────────────┐
│  PHONE A  customer   │                      │  PHONE B  provider   │
│  /rig/<code>/customer│                      │  /rig/<code>/provider│
│  light consumer UI   │                      │  dark infra console   │
└──────────┬───────────┘                      └───────────┬──────────┘
           │  SELECT + Realtime (publishable key)          │
           │  RPC calls (narrow, definer-owned)            │
           └──────────────────┬───────────────────────────┘
                              ▼
                  ┌────────────────────────┐
                  │  Supabase / Postgres   │
                  │                        │
                  │  vdemo_rigs      ← THE live row
                  │  vdemo_responses ← research data
                  │  vdemo_events    ← timeline
                  │                        │
                  │  vdemo_request_payment()  ← the gate
                  │  vdemo_set_model()        │
                  │  vdemo_set_verification() │
                  │  vdemo_reset()            │
                  │  vdemo_submit_survey()    │
                  └────────────────────────┘
```

Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind 3.4 · Supabase.
Six runtime dependencies. No state library, no component library, no server routes.

### One live row

**The entire live demo is one database row**, and both phones subscribe to it. This is the
central design decision and it is made for reliability: one channel, one subscription, one thing
that can break, at an event where the network is someone's hotspot.

There is exactly one rig (`rig_code = 'SOLO'`), created on demand by whichever phone opens first —
`vdemo_solo_rig()` is a safe-to-race get-or-create. There are no pairing codes because there is one
operator: a phone picks a role and it is already looking at the right demo.

A **session** is one participant, identified by `session_id` / `session_code` *inside* that row.
`session_code` is shown only in the researcher panel, for your debugging; it is never part of the
participant experience.

### No secret key, and the browser cannot write

There is no service-role key in this app. The browser holds only the publishable key, which has
`SELECT` on `vdemo_rigs` and **no write access to anything** — verified by direct probe: `UPDATE`
and `DELETE` affect zero rows and `INSERT` is refused by RLS.

Every state transition goes through a `SECURITY DEFINER` Postgres function. The set of
transitions a phone can request is therefore exactly the set the database is willing to perform.
Two consequences that matter:

1. A participant holding the customer phone **cannot write their own verdict**.
2. Deployment needs two public environment variables. Nothing to leak, nothing to rotate.

### How the two phones stay in sync

Supabase Realtime (`postgres_changes`, `REPLICA IDENTITY FULL` so an update payload carries the
whole row) is the fast path. Alongside it, a **1.5s poll runs unconditionally** — not as a
fallback that engages on failure, because a fallback that only runs once something has already
broken is a fallback you discover is broken at the worst possible moment.

Updates are ordered by `updated_at`, so a slow poll response can never clobber a newer Realtime
push, and an unchanged poll does not re-render anything. The phones also re-read on
`visibilitychange` and `online`, so a phone that has been asleep in your pocket is correct the
instant it is handed over rather than one poll interval later.

The header pill reads `● Connected` or `○ Reconnecting…` based on the Realtime channel only. A
demo showing `Reconnecting…` is degraded, not dead — polling is still carrying it.

Sync latency barely affects correctness anyway, because of the next section.

### How verification is simulated

`vdemo_request_payment()` is the gate. It reads the row **under a row lock**, decides, writes the
final state, and returns the decided row in one atomic call:

```sql
if not verification_enabled then
  -- control condition: the model columns are never consulted
  verification_status := 'NOT_PERFORMED';  payment_status := 'APPROVED';
elsif current_commitment = authorized_commitment then
  verification_status := 'PASS';           payment_status := 'APPROVED';
else
  verification_status := 'FAIL';           payment_status := 'BLOCKED';
end if;
```

Three properties this buys:

1. **Determinism.** The verdict is frozen at the instant of the request. A downgrade landing
   mid-animation cannot flip an outcome the participant is already watching. The 1.8s
   choreography on the client is pacing for a human and *cannot* contradict the result.
2. **The customer genuinely cannot know.** The client learns nothing about the deployed model
   until it asks.
3. The comparison is on the **commitment**, not the display name — the simulated claim is about
   cryptographic identity, so the demo compares identities rather than labels.

When verification is off, the receipt records `detectedModel: null`. We did not look, and the
exported data says so rather than implying a check that never happened.

### How the downgrade is simulated

`vdemo_set_model(code, 'downgrade')` rewrites three columns and sets `model_state`:

| | model | id | fingerprint | tier shown |
|---|---|---|---|---|
| authorized | Claude Opus 5 | `claude-opus-5` | `0x83ab...7f21` | Most capable |
| downgraded | Claude Haiku 4.5 | `claude-haiku-4-5` | `0x91cd...42aa` | Fastest, cheapest |

Real names, because "Frontier Model X" never sounded like something a person pays for — and the
swap only bites if the participant understands the substitute is the cheap one. Both live in
`src/lib/demo.ts` and `vdemo_set_model()`; changing the pair means editing both. Opus → Haiku is
the sharpest contrast, but Sonnet is a one-constant change if you want a subtler substitution.

The provider console shows this immediately. The customer phone does not, by construction:
`toCustomerView()` (`src/lib/rigView.ts`) strips every provider-controlled field the instant a
payload arrives, before it reaches React state.

**Honest limitation:** both phones subscribe to the same row, so the deployed model *is* present
in the raw WebSocket frame and in the payment RPC's response body. A participant who opened
devtools on the phone could find it. It never enters component state or React devtools, and no
participant at a networking event is going to do this — but the correct fix is per-role redacted
channels, and it is not implemented. Do not describe the secrecy as a guarantee.

### Session isolation between participants

`Next participant` assigns a fresh `session_id` and `session_code` and rewrites **every** state
column back to its default. The write is exhaustive rather than partial on purpose: that is what
makes it impossible for a value to survive from one participant to the next. Verified in the test
suite by asserting each field equals its default and that the previous participant's survey rows
still exist against the old `session_id`.

The participant never sees or types anything. The customer phone follows the new session over
Realtime in about a second and shows a brief "Ready for the next person" card so the reset reads as
intentional rather than as a glitch.

`Reset demo` deliberately does *not* start a new record — it keeps the same participant, for
recovering mid-conversation. That distinction matters for the data: a survey answered after a reset
updates that participant's existing row, which is correct, and is also why the test suite normalises
with `Next participant` rather than `Reset demo`.

---

## State machine

```
INITIALIZED
    │  customer submits a request
    ▼
PAYMENT_REQUESTED ──────► VERIFYING          (only when verification_enabled)
    │                         │
    │  verification OFF       ├── commitment matches ──► VERIFICATION_SUCCESS ──► PAYMENT_APPROVED
    │                         │
    └────────────────────────►└── mismatch ───────────► VERIFICATION_FAILURE ──► PAYMENT_BLOCKED
    │
    └─ (no check performed) ──────────────────────────────────────────────────► PAYMENT_APPROVED
```

| Actor | May change |
|---|---|
| Provider (Phone B) | `model_state`, `current_model*` |
| Customer (Phone A) | `verification_enabled`, and triggers the gate |
| Researcher (Phone B) | all of the above, plus `NEXT PARTICIPANT` / `RESET DEMO` / survey prompt |
| **Server only** | `verification_status`, `payment_status`, `state`, `last_verification` |

---

## Data model

`vdemo_rigs` — the live row (one per phone pairing)

| column | notes |
|---|---|
| `rig_code` | 4 chars, persistent for the event. Typed once, by you |
| `session_id`, `session_code`, `participant_no` | the current participant |
| `authorized_model`, `authorized_model_id`, `authorized_commitment` | what the customer authorized |
| `current_model`, `current_model_id`, `current_commitment`, `model_state` | what the provider deployed |
| `verification_enabled` | the independent variable. Starts `false` |
| `verification_status`, `payment_status`, `state` | server-written only |
| `payment_amount_paise`, `payment_label`, `payment_recipient` | integer paise |
| `last_verification` | frozen receipt (jsonb) for the most recent attempt |
| `last_event`, `survey_prompt` | researcher-facing breadcrumb, survey trigger |

`vdemo_responses` — **the research output.** One row per participant, keyed to `session_id`.

Both conditions sit side by side in the same row, because the comparison is the finding:

| column | question |
|---|---|
| `comfort_without`, `comfort_with` | 1–5 comfort, unchecked vs checked — the headline delta |
| `limit_without`, `limit_with` | most they would let an agent pay unasked, as a band. **This is the stronger measure**: willingness to delegate is literally an amount, and a band is harder to answer politely than a rating |
| `noticed_swap` | did they suspect the swap before being told? If people say yes, the premise is weaker than we think |
| `what_mattered` | the block, the visibility, both, or neither — these are different products |
| `would_switch` | willingness to act, not just to feel better |
| `free_text` | "What would make you trust an AI agent with your money?" |

Every field is optional and submit is always live: a partial answer is real data, and someone
walking away mid-survey should not cost us the answers they did give. Re-submitting upserts on
`session_id`, so a participant has exactly one row and can change an answer without creating a
second.

`vdemo_events` — append-only timeline, for reconstructing a demo afterwards.

No account, no email, no PII. A participant is a counter.

### Export

Researcher controls → **CSV** or **JSON**. The panel also shows a live count of saved responses,
so it is obvious at a glance that answers are reaching the backend rather than only the screen.

The publishable key cannot read `vdemo_responses` directly; the export comes back through
`vdemo_export()`.

---


## Local development

```bash
npm install
cp .env.local.example .env.local   # fill in the two values
npm run dev                        # http://localhost:3000
```

```bash
npm run build       # production build
npm run typecheck   # tsc --noEmit
npm run lint
```

### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

Both are public by design. Supabase dashboard → Project Settings → **Data API** for the URL,
**API Keys** for the publishable key.

### Database setup from scratch

Against a new Supabase project, run `supabase/migrations/0001_vdemo.sql` in the SQL editor (or
`supabase db push`). It creates the three tables, the `updated_at` trigger, RLS with a
`SELECT`-only policy for `anon` on the rig row, `REPLICA IDENTITY FULL`, and adds `vdemo_rigs` to
the `supabase_realtime` publication.

Then run the state-machine functions in `supabase/migrations/0002_vdemo_rpc.sql`, which also
revokes `EXECUTE` from `PUBLIC` and grants it explicitly to `anon` and `authenticated`.

No Realtime configuration is needed in the dashboard — the migration handles the publication.

### Deploying to Vercel

Deployed at **https://customer-discovery-theta.vercel.app** (Vercel project
`kartikeya-sharma-s-projects/customer-discovery`, linked to this repo). Pushing to `main` deploys
automatically; `npx vercel --prod` deploys from the working tree.

`.env.production` is committed, so **a fresh clone deploys with zero configuration** — there is no
environment-variable step to forget on the morning of an event. That is safe here because both
values are public: `NEXT_PUBLIC_*` vars are inlined into the client bundle by Next.js either way,
and the Supabase publishable key is designed to ship in a browser. It holds `SELECT` on the rig
row and no write access to anything.

To point the demo at a different Supabase project, edit `.env.production` (or override the two
variables in Vercel → Settings → Environment Variables, which takes precedence). There are no
server routes, no secrets, and no webhooks to configure.

---

## Testing

```bash
npm run build && npm start     # or npm run dev
npm run test:e2e               # BASE_URL=https://... to point at the deployment
```

`npm run typecheck` covers the static side. `tests/twophone.js` drives two independent browser
contexts — two real phones, separate storage — through the entire script, using your installed
Google Chrome so there is no browser to download:

- the customer phone **cannot** see the downgrade
- verification OFF + downgraded model → payment approved anyway (the vulnerability)
- verification ON + downgraded model → verification failed, payment blocked
- the failure screen names both models, both commitments, the cross, and "was NOT sent"
- restore → retry → verified and approved, inside 10 seconds
- `NEXT PARTICIPANT` clears the conversation, the questions, the model and the toggle, advances
  the counter, and leaks nothing — in under 5 seconds with no typing
- an unchecked receipt reads "completed", never "approved" or "verified", and lists its unknowns
- the survey does **not** appear on its own after the unchecked payment
- the suggestion chips and the text input still work after a payment has completed
- the survey opens on its first question rather than scrolled to the submit button
- a value the verdict table renders as rose is actually rose in computed pixels
- each participant gets their own response row, verified by delta rather than absolute count
- no console or page errors on either phone

Each run creates a real rig and leaves its rows behind on purpose, so you can inspect them. Clear
them with `delete from vdemo_events; delete from vdemo_responses; delete from vdemo_rigs;`.

Two real bugs were caught this way and are worth knowing about if you refactor:

- The handoff card was permanently stuck, because its dismiss effect depended on the whole synced
  row — a new object reference every poll — so each poll's cleanup cancelled the timer. Depend on
  `session_id`, not on `rig`.
- The verification toggle lagged up to 1.5s because it waited for a sync round-trip instead of
  using the row the RPC already returns. It is now optimistic and reconciles on response.
- A colour token named `base` collided with Tailwind's `text-base` font-size utility, so that class
  emitted **both** a font-size and `color: var(--vd-canvas)`. `.btn` uses `text-base`, so every
  button was one missing colour class away from rendering canvas-on-canvas, and one verdict value
  was already invisible. The token is now `canvas`; never name a colour after a size-scale step
  (`xs`, `sm`, `base`, `lg`, …). The suite now asserts computed colour, not class names.
- The survey auto-scrolled to the bottom of the transcript, which on a card taller than the screen
  handed the participant the submit button instead of the first question.

---

## Replacing the simulation with real verification

The simulation is deliberately confined to one function. `vdemo_request_payment()` is the only
place a verdict is produced, and it is the only thing that would need to change.

Today:

```sql
current_commitment = authorized_commitment   -- a string comparison
```

A real implementation keeps the same shape and the same state machine, and swaps the body:

1. **Resolve the commitment.** Fetch the signed parameter commitment for the model the customer
   authorized from wherever it is published, and pin it on first use.
2. **Request the inference with a proof.** The provider returns the agent's output plus an
   execution proof and the verifying key.
3. **Verify, in this order.** Hash the runtime verifying key and compare it to the pinned digest
   *first*; only then check the proof itself.

Step 3's ordering is the security argument, and it is also a product argument. A downgrading
provider can produce proofs that are internally valid — correct proofs about the wrong model.
Checking identity *before* validity, and reporting the two failures as distinct outcomes, is what
turns "verification failed" into "your model was substituted". This prototype already models that
distinction: `VERIFICATION_FAILURE` is specifically a model-identity mismatch, not a generic error,
and the UI never says "something went wrong".

What would have to change beyond that function:

- `authorized_commitment` becomes a real digest, pinned per customer at authorization time rather
  than a constant default.
- `last_verification` gains the real proof reference and verifying-key digest. The receipt shape
  in `src/lib/types.ts` already has the fields; they would stop being display strings.
- The customer's redaction would move from client-side projection to per-role channels, closing
  the WebSocket leak noted above.
- Everything else — both UIs, the state machine, the survey, the handoff — is unchanged, because
  nothing outside the gate knows how the verdict was reached.

---

## Project layout

```
src/
├── app/
│   ├── page.tsx                      one-time pairing screen
│   ├── rig/[code]/customer/page.tsx  PHONE A
│   ├── rig/[code]/provider/page.tsx  PHONE B
│   ├── layout.tsx · globals.css      design tokens, two palettes
│   └── icon.svg
├── components/
│   ├── VerificationFailed.tsx        the screen that matters
│   ├── VerdictTable.tsx              the comparison table, shared everywhere
│   ├── PaymentApproved.tsx · PaymentCard.tsx
│   ├── VerifyingOverlay.tsx          the 3-stage beat
│   ├── BlockedExplainer.tsx · VerificationDetails.tsx · Sheet.tsx
│   ├── TrustSurvey.tsx               the measurement
│   ├── ResearcherPanel.tsx · ConnectionPill.tsx · SimulationBadge.tsx
└── lib/
    ├── demo.ts        every constant and every participant-facing string
    ├── useRig.ts      Realtime + polling + link status + redaction
    ├── rigClient.ts   RPC wrappers
    ├── rigView.ts     toCustomerView() — the redaction
    ├── types.ts · format.ts · supabaseBrowser.ts
```

`src/lib/demo.ts` is worth knowing about: the demo values, the timings, and all of the
honest-scope copy live there, so the wording that keeps this prototype truthful is in one file and
hard to leave stale on one screen.

### Design system

Colour discipline is load-bearing rather than decorative:

- **emerald** — verified / success, nothing else
- **rose** — verification failure, nothing else
- **amber** — warnings, including the provider's downgraded state
- **near-black** — primary actions

Rose appears nowhere in the app except a stopped payment, which is what makes that one screen
land. Amber does the opposite work: it marks the *absence* of a check, on the toggle, the trust
banner, the payment card and the unchecked receipt.

The assurance line under the header is modelled on how messaging apps state end-to-end encryption —
a lock, one short sentence, always present. Its OFF state is as loud as its ON state, because the
first build of this demo failed precisely by making an unchecked payment feel completely normal. The customer phone renders on a light consumer canvas and the provider phone on a dark
infrastructure canvas; both bind the same semantic tokens, so every component class works on
either surface untouched. Tokens and primitives are ported from the sibling `SPOT` project.

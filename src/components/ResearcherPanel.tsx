'use client';

import { useState } from 'react';
import {
  ChevronDown,
  Download,
  Loader2,
  MessageSquareQuote,
  RotateCcw,
  ShieldCheck,
  UserPlus
} from 'lucide-react';
import { exportRig, promptSurvey, resetRig, setVerification } from '@/lib/rigClient';
import type { RigRow, SurveyPhase } from '@/lib/types';

/**
 * The researcher's controls, kept behind a disclosure so the dashboard above
 * still reads as a provider console when a participant glances at it.
 *
 * NEXT PARTICIPANT is the one that matters. It is the top item, full width, and
 * does not ask for confirmation — at a networking event, a confirmation dialog
 * between two conversations is the difference between a demo and a fumble.
 */
export function ResearcherPanel({
  rig,
  onRow,
  onError
}: {
  rig: RigRow;
  onRow: (row: RigRow) => void;
  onError: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, action: () => Promise<RigRow>) {
    setBusy(key);
    try {
      onRow(await action());
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : 'Action failed.');
    } finally {
      setBusy(null);
    }
  }

  async function download(kind: 'json' | 'csv') {
    setBusy(kind);
    try {
      const data = (await exportRig(rig.rig_code)) as {
        responses: Record<string, unknown>[];
      };

      let blob: Blob;
      let filename: string;

      if (kind === 'json') {
        blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        filename = `vdemo-${rig.rig_code}.json`;
      } else {
        const columns = [
          'participant_no',
          'phase',
          'comfort',
          'larger_payment',
          'verification_enabled_at_time',
          'free_text',
          'session_code',
          'created_at'
        ];
        const escape = (value: unknown) => {
          const text = value === null || value === undefined ? '' : String(value);
          return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        };
        const rows = (data.responses ?? []).map((row) =>
          columns.map((column) => escape(row[column])).join(',')
        );
        blob = new Blob([[columns.join(','), ...rows].join('\n')], { type: 'text/csv' });
        filename = `vdemo-${rig.rig_code}.csv`;
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : 'Export failed.');
    } finally {
      setBusy(null);
    }
  }

  const surveyPhase: SurveyPhase = rig.verification_status === 'IDLE'
    ? 'baseline_unverified'
    : 'after_verification';

  return (
    <section className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="label-eyebrow">Researcher controls</span>
          <span className="pill-neutral">P{String(rig.participant_no).padStart(3, '0')}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ink-subtle transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <div className="animate-fade-up space-y-3 border-t border-line px-4 py-4">
          <button
            type="button"
            onClick={() => void run('next', () => resetRig(rig.rig_code, 'next_participant'))}
            disabled={busy !== null}
            className="btn-primary w-full py-5 text-base"
          >
            {busy === 'next' ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
            Next participant
          </button>
          <p className="text-2xs leading-relaxed text-ink-subtle">
            New session, model restored, verification off, conversation and
            questions cleared. The customer phone follows automatically — nothing
            to type or scan.
          </p>

          <div className="divider" />

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void run('reset', () => resetRig(rig.rig_code, 'reset_demo'))}
              disabled={busy !== null}
              className="btn-ghost px-3 py-3 text-sm"
            >
              {busy === 'reset' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Reset demo
            </button>
            <button
              type="button"
              onClick={() =>
                void run('verify', () => setVerification(rig.rig_code, !rig.verification_enabled))
              }
              disabled={busy !== null}
              className="btn-ghost px-3 py-3 text-sm"
            >
              {busy === 'verify' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Verify {rig.verification_enabled ? 'off' : 'on'}
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              void run('survey', () =>
                promptSurvey(rig.rig_code, rig.survey_prompt ? null : surveyPhase)
              )
            }
            disabled={busy !== null}
            className="btn-ghost w-full px-3 py-3 text-sm"
          >
            {busy === 'survey' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareQuote className="h-4 w-4" />}
            {rig.survey_prompt ? 'Hide trust questions' : 'Ask trust questions'}
          </button>

          <div className="divider" />

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void download('csv')}
              disabled={busy !== null}
              className="btn-ghost px-3 py-3 text-sm"
            >
              {busy === 'csv' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              CSV
            </button>
            <button
              type="button"
              onClick={() => void download('json')}
              disabled={busy !== null}
              className="btn-ghost px-3 py-3 text-sm"
            >
              {busy === 'json' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              JSON
            </button>
          </div>

          {/* Debug only — deliberately small, and never shown to a participant. */}
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 pt-1 text-2xs text-ink-subtle">
            <dt>Rig</dt>
            <dd className="text-right font-mono text-ink-muted">{rig.rig_code}</dd>
            <dt>Session</dt>
            <dd className="text-right font-mono text-ink-muted">{rig.session_code}</dd>
            <dt>State</dt>
            <dd className="text-right font-mono text-ink-muted">{rig.state}</dd>
          </dl>
        </div>
      ) : null}
    </section>
  );
}

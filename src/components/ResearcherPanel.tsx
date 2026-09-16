'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ChevronDown,
  Database,
  Download,
  Loader2,
  MessageSquareQuote,
  RotateCcw,
  ShieldCheck,
  UserPlus
} from 'lucide-react';
import { exportRig, promptSurvey, resetRig, responseCount, setVerification } from '@/lib/rigClient';
import type { RigRow } from '@/lib/types';

/**
 * The researcher's controls, behind a disclosure so the dashboard above still
 * reads as a provider console when a participant glances at it.
 *
 * Neither reset asks for confirmation: mid-conversation at a networking event,
 * a confirmation dialog is the difference between a demo and a fumble.
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
  const [saved, setSaved] = useState<number | null>(null);

  // Surfaced so it is obvious at a glance that answers are reaching the
  // backend — otherwise the only way to know is to export and look.
  const refreshCount = useCallback(async () => {
    try {
      setSaved(await responseCount());
    } catch {
      /* non-fatal: the count is reassurance, not function */
    }
  }, []);

  useEffect(() => {
    if (open) void refreshCount();
  }, [open, rig.last_event, refreshCount]);

  async function run(key: string, action: () => Promise<RigRow>) {
    setBusy(key);
    try {
      onRow(await action());
      await refreshCount();
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : 'Action failed.');
    } finally {
      setBusy(null);
    }
  }

  async function download(kind: 'json' | 'csv') {
    setBusy(kind);
    try {
      const data = (await exportRig()) as { responses: Record<string, unknown>[] };

      let blob: Blob;
      let filename: string;

      if (kind === 'json') {
        blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        filename = 'verifiable-agent-research.json';
      } else {
        const columns = [
          'participant_no',
          'comfort_without',
          'comfort_with',
          'limit_without',
          'limit_with',
          'noticed_swap',
          'what_mattered',
          'would_switch',
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
        filename = 'verifiable-agent-research.csv';
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
          {/* The survey is researcher-triggered on purpose: it must only appear
              after the participant has seen BOTH payments, and only you know
              when that moment has arrived. */}
          <button
            type="button"
            onClick={() => void run('survey', () => promptSurvey(!rig.survey_open))}
            disabled={busy !== null}
            className="btn-brand w-full py-5 text-base"
          >
            {busy === 'survey' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <MessageSquareQuote className="h-5 w-5" />
            )}
            {rig.survey_open ? 'Hide questions' : 'Ask the questions'}
          </button>
          <p className="text-2xs leading-relaxed text-ink-subtle">
            Show this only after they have seen an unchecked payment go through
            <em> and </em> a checked one get stopped. It asks about both.
          </p>

          <div className="divider" />

          <button
            type="button"
            onClick={() => void run('next', () => resetRig('next_participant'))}
            disabled={busy !== null}
            className="btn-primary w-full py-5 text-base"
          >
            {busy === 'next' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <UserPlus className="h-5 w-5" />
            )}
            Next participant
          </button>
          <p className="text-2xs leading-relaxed text-ink-subtle">
            Starts a fresh record, so the next person&apos;s answers can never land in this
            one&apos;s row. Model restored, verification off, conversation and questions cleared.
            The customer phone follows on its own.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void run('reset', () => resetRig('reset_demo'))}
              disabled={busy !== null}
              className="btn-ghost px-3 py-3 text-sm"
            >
              {busy === 'reset' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Reset demo
            </button>
            <button
              type="button"
              onClick={() => void run('verify', () => setVerification(!rig.verification_enabled))}
              disabled={busy !== null}
              className="btn-ghost px-3 py-3 text-sm"
            >
              {busy === 'verify' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              Check {rig.verification_enabled ? 'off' : 'on'}
            </button>
          </div>
          <p className="text-2xs leading-relaxed text-ink-subtle">
            Reset demo keeps the same person and the same record — use it if something goes wrong
            mid-conversation.
          </p>

          <div className="divider" />

          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-2xs font-semibold text-ink-muted">
              <Database className="h-3 w-3" />
              {saved === null ? 'Checking…' : `${saved} response${saved === 1 ? '' : 's'} saved`}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void download('csv')}
                disabled={busy !== null}
                className="btn-ghost px-3 py-2 text-xs"
              >
                {busy === 'csv' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                CSV
              </button>
              <button
                type="button"
                onClick={() => void download('json')}
                disabled={busy !== null}
                className="btn-ghost px-3 py-2 text-xs"
              >
                {busy === 'json' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                JSON
              </button>
            </div>
          </div>

          {/* Debug only. */}
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 pt-1 text-2xs text-ink-subtle">
            <dt>Record</dt>
            <dd className="text-right font-mono text-ink-muted">{rig.session_code}</dd>
            <dt>State</dt>
            <dd className="text-right font-mono text-ink-muted">{rig.state}</dd>
          </dl>
        </div>
      ) : null}
    </section>
  );
}

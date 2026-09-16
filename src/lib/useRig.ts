'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RIG, fetchRig, soloRig } from './rigClient';
import { supabaseBrowser } from './supabaseBrowser';
import { toCustomerView } from './rigView';
import type { CustomerRigView, LinkStatus, RigRow } from './types';

/** Poll interval. One tiny row, so this is cheap enough to always run. */
const POLL_MS = 1_500;

interface RigSync<T> {
  rig: T | null;
  link: LinkStatus;
  error: string | null;
  /** Force an immediate re-read. Used after a local action and on wake-from-sleep. */
  refresh: () => Promise<void>;
  /** Apply a row we already have in hand (e.g. an RPC return) without waiting. */
  apply: (row: RigRow) => void;
}

/**
 * Keeps one rig row in sync.
 *
 * Realtime is the fast path, but a 1.5s poll runs unconditionally alongside it
 * rather than as a fallback that only engages on failure — a fallback that only
 * runs when something has already broken is a fallback you find out is broken
 * at the worst possible moment. Event Wi-Fi does not deserve that trust.
 *
 * Writes are ordered by `updated_at`, so a slow poll response can never
 * clobber a newer Realtime push.
 */
function useRigRow<T>(project: (row: RigRow) => T): RigSync<T> {
  const [rig, setRig] = useState<T | null>(null);
  const [link, setLink] = useState<LinkStatus>('connecting');
  const [error, setError] = useState<string | null>(null);

  // Newest `updated_at` we have accepted, so out-of-order arrivals are dropped.
  const seenAt = useRef<string>('');
  const projectRef = useRef(project);
  projectRef.current = project;

  const accept = useCallback((row: RigRow) => {
    // Drop anything not strictly newer. This orders Realtime against polling,
    // and also stops an unchanged poll response from re-rendering the tree
    // (and re-creating the projected row) every 1.5s for no reason.
    if (row.updated_at && seenAt.current && row.updated_at <= seenAt.current) return;
    seenAt.current = row.updated_at ?? seenAt.current;
    setRig(projectRef.current(row));
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      // Either phone may be first to open the demo, so a missing rig is a normal
      // cold start rather than an error: create it and carry on.
      const row = (await fetchRig()) ?? (await soloRig());
      accept(row);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not reach the demo.');
    }
  }, [accept]);

  // Initial read + unconditional polling.
  useEffect(() => {
    let alive = true;

    void refresh();
    const timer = setInterval(() => {
      if (alive) void refresh();
    }, POLL_MS);

    // A phone that has been asleep in a pocket should be correct the instant it
    // is handed to someone, not one poll interval later.
    const onWake = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('online', onWake);

    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('online', onWake);
    };
  }, [refresh]);

  // Realtime fast path.
  useEffect(() => {
    const supabase = supabaseBrowser();
    if (!supabase) {
      // No Realtime available: polling alone still runs the demo correctly.
      setLink('connected');
      return;
    }

    const channel = supabase
      .channel(`rig:${RIG}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vdemo_rigs',
          filter: `rig_code=eq.${RIG}`
        },
        (payload) => {
          const row = payload.new as RigRow | undefined;
          if (row?.rig_code) accept(row);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setLink('connected');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setLink('reconnecting');
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [accept]);

  return { rig, link, error, refresh, apply: accept };
}

const identity = (row: RigRow): RigRow => row;

/** Provider / researcher phone: sees everything. */
export function useProviderRig(): RigSync<RigRow> {
  return useRigRow(identity);
}

/**
 * Customer phone: provider-controlled fields are stripped before the row ever
 * reaches React state, so the deployed model cannot leak into the UI or
 * devtools ahead of the verification result.
 */
export function useCustomerRig(): RigSync<CustomerRigView> {
  return useRigRow(toCustomerView);
}

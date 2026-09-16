'use client';

import { X } from 'lucide-react';

/**
 * Bottom sheet. Full-bleed and bottom-anchored on a phone, centred on anything
 * wider, so the same component works when this is mirrored to a laptop.
 */
export function Sheet({
  title,
  onClose,
  children
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-[88dvh] w-full max-w-md animate-slide-up overflow-y-auto rounded-t-4xl border border-line bg-surface shadow-sheet sm:animate-pop-in sm:rounded-4xl">
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-line bg-surface/95 px-5 py-4 backdrop-blur">
          <h2 className="text-base font-bold tracking-tight text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 rounded-lg p-2 text-ink-subtle hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 pb-safe pt-4">{children}</div>
      </div>
    </div>
  );
}

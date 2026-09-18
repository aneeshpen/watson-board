/**
 * Backend connectivity banner.
 *
 * The dashboard previously did `.catch(() => {})` and silently kept rendering
 * hardcoded placeholder numbers when the API was unreachable — nothing on
 * screen distinguished live data from stale fiction. This makes the state
 * explicit.
 */

import { AlertTriangle, DatabaseZap } from "lucide-react";

export function BackendStatus({
  isError,
  isLoading,
  usingFixtures,
}: {
  isError: boolean;
  isLoading: boolean;
  usingFixtures?: boolean;
}) {
  if (isLoading) return null;

  if (isError) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300"
      >
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          <strong className="font-semibold">Backend offline.</strong> Figures below are
          placeholders, not live case data.
        </span>
      </div>
    );
  }

  if (usingFixtures) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-[11px] text-primary/90"
      >
        <DatabaseZap className="h-3.5 w-3.5 shrink-0" />
        <span>
          Live dataset connected. Case counters are demo fixtures for the seeded case file.
        </span>
      </div>
    );
  }

  return null;
}

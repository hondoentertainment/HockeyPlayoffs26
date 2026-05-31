import Link from "next/link";
import {
  formatAsOfDate,
  PLAYOFF_AS_OF,
  STANLEY_CUP_FINAL
} from "@/lib/playoff-state";

export function PlayoffBanner() {
  return (
    <div className="border-b border-amber-200 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-700">
            {STANLEY_CUP_FINAL.headline} · as of {formatAsOfDate(PLAYOFF_AS_OF)}
          </p>
          <p className="truncate text-sm font-semibold text-playoff">
            {STANLEY_CUP_FINAL.matchup}
          </p>
          {STANLEY_CUP_FINAL.recap && (
            <p className="text-xs text-amber-900/90">{STANLEY_CUP_FINAL.recap}</p>
          )}
          <p className="text-xs text-amber-900/80">{STANLEY_CUP_FINAL.nextGame}</p>
        </div>
        <Link
          href="/bracket"
          className="shrink-0 text-xs font-medium text-playoff underline hover:no-underline"
        >
          View bracket →
        </Link>
      </div>
    </div>
  );
}

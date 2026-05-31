import Link from "next/link";
import { formatWinChance } from "@/lib/scoring";

type PodiumEntry = {
  rank: number;
  name: string;
  win: number;
  total: number;
};

export function LeaderboardSummary({
  playerCount,
  seriesCompleted,
  seriesTotal,
  leader
}: {
  playerCount: number;
  seriesCompleted: number;
  seriesTotal: number;
  leader: PodiumEntry | null;
}) {
  const progressPct =
    seriesTotal > 0 ? Math.round((seriesCompleted / seriesTotal) * 100) : 0;

  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-3">
      <StatCard label="Players" value={String(playerCount)} />
      <StatCard
        label="Bracket progress"
        value={`${seriesCompleted}/${seriesTotal}`}
        hint={`${progressPct}% complete`}
      />
      <StatCard
        label="Current leader"
        value={leader ? leader.name : "—"}
        hint={
          leader
            ? `${formatWinChance(leader.win)} win · ${leader.total} pts`
            : "No picks yet"
        }
        href={leader ? `/picks/${encodeURIComponent(leader.name)}` : undefined}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  href
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-bold text-playoff">{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-slate-500">{hint}</p>}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-playoff/30 hover:shadow"
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      {inner}
    </div>
  );
}

export function LeaderboardPodium({ topThree }: { topThree: PodiumEntry[] }) {
  if (topThree.length === 0) return null;

  const order =
    topThree.length >= 3
      ? [topThree[1], topThree[0], topThree[2]]
      : topThree.length === 2
        ? [topThree[1], topThree[0]]
        : [topThree[0]];

  const heights = ["mt-6", "mt-0", "mt-8"];
  const styles = [
    "border-slate-300 bg-gradient-to-b from-slate-100 to-white",
    "border-amber-300 bg-gradient-to-b from-amber-50 to-white ring-2 ring-amber-200/60",
    "border-orange-300 bg-gradient-to-b from-orange-50 to-white"
  ];
  const medals = ["🥈", "🥇", "🥉"];

  return (
    <div
      className={
        "mb-6 grid items-end gap-3 " +
        (order.length === 1
          ? "max-w-xs mx-auto"
          : order.length === 2
            ? "grid-cols-2 max-w-md mx-auto"
            : "grid-cols-3")
      }
    >
      {order.map((entry, i) => (
        <Link
          key={entry.name}
          href={`/picks/${encodeURIComponent(entry.name)}`}
          className={
            "block rounded-t-xl border-x border-t p-4 text-center shadow-sm transition hover:shadow-md " +
            (order.length === 1 ? "" : heights[i]) +
            " " +
            (order.length === 1 ? styles[1] : styles[i])
          }
        >
          <span className="text-2xl" aria-hidden>
            {order.length === 1 ? "🥇" : medals[i]}
          </span>
          <p className="mt-1 truncate font-bold text-playoff">{entry.name}</p>
          <p className="text-2xl font-bold tabular-nums text-playoff">
            {formatWinChance(entry.win)}
          </p>
          <p className="text-xs text-slate-500">{entry.total} pts</p>
        </Link>
      ))}
    </div>
  );
}

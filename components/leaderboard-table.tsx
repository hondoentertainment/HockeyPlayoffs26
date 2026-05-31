"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatWinChance } from "@/lib/scoring";
import { ROUND_LABEL, type RoundCode } from "@/lib/series";

export type LeaderboardRow = {
  rank: number;
  playerId: number;
  name: string;
  win: number;
  total: number;
  maxPossible: number;
  correctWinners: number;
  perRound: Record<RoundCode, number>;
};

function rankBadge(rank: number) {
  if (rank === 1) return "bg-amber-100 text-amber-800 ring-amber-200";
  if (rank === 2) return "bg-slate-200 text-slate-700 ring-slate-300";
  if (rank === 3) return "bg-orange-100 text-orange-800 ring-orange-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function WinChanceBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 justify-end">
      <div
        className="hidden sm:block h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-playoff transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tabular-nums font-medium min-w-[3.5rem] text-right">
        {formatWinChance(value)}
      </span>
    </div>
  );
}

function ProgressBar({ earned, max }: { earned: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (earned / max) * 100) : 0;
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="tabular-nums">{earned}</span>
      <div
        className="hidden md:block h-1 w-12 rounded-full bg-slate-100 overflow-hidden"
        title={`${earned} of ${max} max possible points`}
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function LeaderboardTable({
  rows,
  maxWin
}: {
  rows: LeaderboardRow[];
  maxWin: number;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="sr-only" htmlFor="leaderboard-search">
          Search players
        </label>
        <input
          id="leaderboard-search"
          type="search"
          placeholder="Search players…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-playoff focus:outline-none focus:ring-2 focus:ring-playoff/20"
        />
        {query && (
          <p className="text-xs text-slate-500">
            {filtered.length} of {rows.length} players
          </p>
        )}
      </div>

      {/* Mobile card layout */}
      <div className="space-y-2 md:hidden">
        {filtered.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
            No players match &ldquo;{query}&rdquo;
          </p>
        ) : (
          filtered.map((row) => (
            <Link
              key={row.playerId}
              href={`/picks/${encodeURIComponent(row.name)}`}
              className={
                "block rounded-lg border bg-white p-4 shadow-sm transition hover:border-playoff/30 hover:shadow " +
                (row.rank <= 3 ? "border-playoff/20" : "border-slate-200")
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-1 " +
                      rankBadge(row.rank)
                    }
                  >
                    {row.rank}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{row.name}</p>
                    <p className="text-xs text-slate-500">
                      {row.correctWinners} correct · {row.total}/
                      {row.maxPossible} pts
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-playoff tabular-nums">
                    {formatWinChance(row.win)}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">
                    win chance
                  </p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3 w-12">#</th>
              <th className="px-3 py-3">Player</th>
              <th className="px-3 py-3 text-right">Win %</th>
              <th className="px-3 py-3 text-right">Points</th>
              <th className="px-3 py-3 text-right hidden lg:table-cell">
                Max
              </th>
              <th className="px-3 py-3 text-right hidden lg:table-cell">
                Winners
              </th>
              {(["R1", "R2", "CF", "SCF"] as RoundCode[]).map((r) => (
                <th
                  key={r}
                  className="px-3 py-3 text-right hidden xl:table-cell"
                  title={ROUND_LABEL[r]}
                >
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-3 py-8 text-center text-slate-500"
                >
                  No players match &ldquo;{query}&rdquo;
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.playerId}
                  className={
                    "border-t border-slate-100 transition hover:bg-ice/40 " +
                    (row.rank === 1 ? "bg-amber-50/60" : "")
                  }
                >
                  <td className="px-3 py-2.5">
                    <span
                      className={
                        "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ring-1 " +
                        rankBadge(row.rank)
                      }
                    >
                      {row.rank}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/picks/${encodeURIComponent(row.name)}`}
                      className="font-medium text-playoff hover:underline"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <WinChanceBar value={row.win} max={maxWin} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <ProgressBar earned={row.total} max={row.maxPossible} />
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-500 tabular-nums hidden lg:table-cell">
                    {row.maxPossible}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums hidden lg:table-cell">
                    {row.correctWinners}
                  </td>
                  {(["R1", "R2", "CF", "SCF"] as RoundCode[]).map((r) => (
                    <td
                      key={r}
                      className="px-3 py-2.5 text-right tabular-nums text-slate-600 hidden xl:table-cell"
                    >
                      {row.perRound[r] || (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

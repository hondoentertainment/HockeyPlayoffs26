import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAllPicks, getAllPlayers, getAllSeries, getConfig } from "@/lib/db";
import { rankPlayers, resolveSeries, scorePlayers } from "@/lib/scoring";
import { ROUNDS } from "@/lib/series";

export const dynamic = "force-dynamic";

function csvField(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const [series, players, picks, config] = await Promise.all([
    getAllSeries(),
    getAllPlayers(),
    getAllPicks(),
    getConfig()
  ]);
  const resolved = resolveSeries(series, config);
  const ranked = rankPlayers(scorePlayers(players, picks, resolved, config));

  const header = [
    "rank",
    "player",
    "total",
    "max_possible",
    "correct_winners",
    ...ROUNDS
  ];
  const lines = [header.join(",")];
  ranked.forEach((s, i) => {
    const row = [
      i + 1,
      s.player.name,
      s.total,
      s.total + s.maxRemaining,
      s.correctWinners,
      ...ROUNDS.map((r) => s.perRound[r])
    ];
    lines.push(row.map(csvField).join(","));
  });

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="nhl-playoffs-2026-leaderboard.csv"'
    }
  });
}

import playoffState from "@/playoff_results.json";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import { SERIES, type RoundCode } from "./series";

export type SeriesResult = { winner: string; games: number };

export type PlayoffSeriesRow = {
  id: string;
  round_code: RoundCode;
  team1_source: string | null;
  team2_source: string | null;
  team1: string | null;
  team2: string | null;
  winner: string | null;
  games: number | null;
};

export const PLAYOFF_AS_OF = playoffState.asOf;

export const ROUND1_MATCHUPS = playoffState.round1Matchups as unknown as Record<
  string,
  [string, string]
>;

export const PLAYOFF_RESULTS = playoffState.results as Record<
  string,
  SeriesResult
>;

export const STANLEY_CUP_FINAL = playoffState.stanleyCupFinal as {
  headline: string;
  matchup: string;
  nextGame: string;
  recap?: string;
};

export function formatAsOfDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}

/** Build series rows from playoff_results.json (no DB required). */
export function seriesFromPlayoffJson(): PlayoffSeriesRow[] {
  return SERIES.map((s) => {
    const matchups = ROUND1_MATCHUPS[s.id];
    const result = PLAYOFF_RESULTS[s.id];
    return {
      id: s.id,
      round_code: s.round,
      team1_source: s.team1Source,
      team2_source: s.team2Source,
      team1: matchups?.[0] ?? null,
      team2: matchups?.[1] ?? null,
      winner: result?.winner ?? null,
      games: result?.games ?? null
    };
  });
}

/** Push official matchups + results from JSON into Postgres. */
export async function syncPlayoffStateToDb(
  q: NeonQueryFunction<false, false>
): Promise<void> {
  for (const [id, teams] of Object.entries(ROUND1_MATCHUPS)) {
    await q`UPDATE series SET team1 = ${teams[0]}, team2 = ${teams[1]} WHERE id = ${id}`;
  }
  for (const [id, result] of Object.entries(PLAYOFF_RESULTS)) {
    await q`UPDATE series SET winner = ${result.winner}, games = ${result.games} WHERE id = ${id}`;
  }
  await q`UPDATE series SET winner = NULL, games = NULL WHERE id = 'SCF'`;
}

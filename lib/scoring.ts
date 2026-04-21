import { ROUNDS, RoundCode, SERIES, seriesById } from "./series";
import { norm } from "./teams";
import type { PickRow, PlayerRow, SeriesRow } from "./db";

export type ResolvedSeries = SeriesRow & {
  resolvedTeam1: string | null;
  resolvedTeam2: string | null;
  pointsForRound: number;
};

export function resolveSeries(
  rows: SeriesRow[],
  config: Record<string, number>
): ResolvedSeries[] {
  const byId = new Map(rows.map((r) => [r.id, r]));

  const resolveSlot = (sourceId: string | null, fallback: string | null) => {
    if (!sourceId) return fallback;
    const src = byId.get(sourceId);
    return src?.winner ?? null;
  };

  return SERIES.map((def) => {
    const row = byId.get(def.id)!;
    const t1 = def.team1Source ? resolveSlot(def.team1Source, null) : row.team1;
    const t2 = def.team2Source ? resolveSlot(def.team2Source, null) : row.team2;
    return {
      ...row,
      resolvedTeam1: t1,
      resolvedTeam2: t2,
      pointsForRound: config[def.pointsKey] ?? 0
    };
  });
}

export type PlayerScore = {
  player: PlayerRow;
  total: number;
  correctWinners: number;
  perSeries: Record<string, number>;
  perRound: Record<RoundCode, number>;
  maxRemaining: number;
};

export function scorePlayers(
  players: PlayerRow[],
  picks: PickRow[],
  resolved: ResolvedSeries[],
  config: Record<string, number>
): PlayerScore[] {
  const bonus = config["GAMES_BONUS"] ?? 0;
  const picksByPlayer = new Map<number, Map<string, PickRow>>();
  for (const p of picks) {
    if (!picksByPlayer.has(p.player_id)) picksByPlayer.set(p.player_id, new Map());
    picksByPlayer.get(p.player_id)!.set(p.series_id, p);
  }

  return players.map((player) => {
    const playerPicks = picksByPlayer.get(player.id) ?? new Map();
    const perSeries: Record<string, number> = {};
    const perRound: Record<RoundCode, number> = { R1: 0, R2: 0, CF: 0, SCF: 0 };
    let total = 0;
    let correctWinners = 0;
    let maxRemaining = 0;

    for (const series of resolved) {
      const def = seriesById.get(series.id)!;
      const pick = playerPicks.get(series.id);
      const roundPts = series.pointsForRound;

      if (series.winner) {
        if (pick && norm(pick.winner) === norm(series.winner)) {
          correctWinners += 1;
          let earned = roundPts;
          if (
            pick.games !== null &&
            pick.games !== undefined &&
            series.games !== null &&
            pick.games === series.games
          ) {
            earned += bonus;
          }
          perSeries[series.id] = earned;
          perRound[def.round] += earned;
          total += earned;
        } else {
          perSeries[series.id] = 0;
        }
      } else {
        perSeries[series.id] = 0;
        if (pick) {
          const pickedTeam = norm(pick.winner);
          const t1 = norm(series.resolvedTeam1);
          const t2 = norm(series.resolvedTeam2);
          const teamStillAlive =
            (!t1 && !t2) || pickedTeam === t1 || pickedTeam === t2;
          if (teamStillAlive) {
            maxRemaining += roundPts + bonus;
          }
        } else {
          maxRemaining += roundPts + bonus;
        }
      }
    }

    return { player, total, correctWinners, perSeries, perRound, maxRemaining };
  });
}

export function rankPlayers(scores: PlayerScore[]): PlayerScore[] {
  return [...scores].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (b.correctWinners !== a.correctWinners)
      return b.correctWinners - a.correctWinners;
    return a.player.name.localeCompare(b.player.name);
  });
}

export { ROUNDS };

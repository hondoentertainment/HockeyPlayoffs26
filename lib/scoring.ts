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

export type WinChance = {
  player: PlayerRow;
  winProbability: number;
};

const DEFAULT_TRIALS = 10000;

// Estimates each player's chance of finishing first by Monte Carlo: every
// undecided series is replayed as a 50/50 coin flip with an equally likely
// game count (4-7), winners propagate down the bracket, and the resulting
// standings are scored with the real scoring rules. A trial's win is split
// evenly among players tied on (total, correct winners) — the alphabetical
// tiebreak is treated as a coin we don't model.
export function simulateWinChances(
  players: PlayerRow[],
  picks: PickRow[],
  rows: SeriesRow[],
  config: Record<string, number>,
  options: { trials?: number; rng?: () => number } = {}
): WinChance[] {
  if (players.length === 0) return [];
  const trials = Math.max(1, Math.floor(options.trials ?? DEFAULT_TRIALS));
  const rng = options.rng ?? Math.random;

  const byId = new Map(rows.map((r) => [r.id, r]));
  const wins = new Map<number, number>();
  for (const p of players) wins.set(p.id, 0);

  for (let t = 0; t < trials; t++) {
    const sim = new Map<
      string,
      { team1: string | null; team2: string | null; winner: string | null; games: number | null }
    >();

    // SERIES is in dependency order, so every source resolves before its consumer.
    for (const def of SERIES) {
      const row = byId.get(def.id)!;
      const team1 = def.team1Source ? sim.get(def.team1Source)?.winner ?? null : row.team1;
      const team2 = def.team2Source ? sim.get(def.team2Source)?.winner ?? null : row.team2;

      if (row.winner) {
        sim.set(def.id, { team1, team2, winner: row.winner, games: row.games });
        continue;
      }

      const candidates = [team1, team2].filter((x): x is string => !!x);
      let winner: string | null = null;
      let games: number | null = null;
      if (candidates.length === 2) {
        winner = rng() < 0.5 ? candidates[0] : candidates[1];
        games = 4 + Math.floor(rng() * 4);
      } else if (candidates.length === 1) {
        winner = candidates[0];
        games = 4 + Math.floor(rng() * 4);
      }
      sim.set(def.id, { team1, team2, winner, games });
    }

    const resolvedSim: ResolvedSeries[] = SERIES.map((def) => {
      const row = byId.get(def.id)!;
      const s = sim.get(def.id)!;
      return {
        ...row,
        winner: s.winner,
        games: s.games,
        resolvedTeam1: s.team1,
        resolvedTeam2: s.team2,
        pointsForRound: config[def.pointsKey] ?? 0
      };
    });

    const scored = scorePlayers(players, picks, resolvedSim, config);
    const maxTotal = Math.max(...scored.map((s) => s.total));
    const contenders = scored.filter((s) => s.total === maxTotal);
    const maxCorrect = Math.max(...contenders.map((s) => s.correctWinners));
    const topPlayers = contenders.filter((s) => s.correctWinners === maxCorrect);
    const credit = 1 / topPlayers.length;
    for (const s of topPlayers) {
      wins.set(s.player.id, (wins.get(s.player.id) ?? 0) + credit);
    }
  }

  return players
    .map((player) => ({
      player,
      winProbability: (wins.get(player.id) ?? 0) / trials
    }))
    .sort((a, b) =>
      b.winProbability !== a.winProbability
        ? b.winProbability - a.winProbability
        : a.player.name.localeCompare(b.player.name)
    );
}

export function formatWinChance(p: number): string {
  if (p <= 0) return "—";
  if (p < 0.001) return "<0.1%";
  if (p > 0.999) return ">99.9%";
  return `${(p * 100).toFixed(1)}%`;
}

export { ROUNDS };

import {
  Player,
  ScoringConfig,
  SERIES,
  SeriesId,
  SeriesResult,
} from "./bracket";

const ROUND_KEY: Record<string, keyof ScoringConfig> = {
  R1: "R1",
  R2: "R2",
  CF: "CF",
  SCF: "SCF",
};

export interface SeriesScore {
  points: number;
  winnerCorrect: boolean;
  gamesCorrect: boolean;
}

export function scoreSeries(
  pickWinner: string | undefined,
  pickGames: number | undefined,
  actual: SeriesResult | undefined,
  roundPoints: number,
  gamesBonus: number,
): SeriesScore {
  if (!actual?.winner || !pickWinner) {
    return { points: 0, winnerCorrect: false, gamesCorrect: false };
  }
  const winnerCorrect = pickWinner === actual.winner;
  if (!winnerCorrect) return { points: 0, winnerCorrect, gamesCorrect: false };
  const gamesCorrect = !!pickGames && !!actual.games && pickGames === actual.games;
  return {
    points: roundPoints + (gamesCorrect ? gamesBonus : 0),
    winnerCorrect,
    gamesCorrect,
  };
}

export function scorePlayer(
  player: Player,
  results: Partial<Record<SeriesId, SeriesResult>>,
  config: ScoringConfig,
): { perSeries: Record<SeriesId, SeriesScore>; total: number } {
  const perSeries = {} as Record<SeriesId, SeriesScore>;
  let total = 0;
  for (const def of SERIES) {
    const pick = player.picks[def.id];
    const roundKey = ROUND_KEY[def.round];
    const s = scoreSeries(
      pick?.winner,
      pick?.games,
      results[def.id],
      config[roundKey] as number,
      config.gamesBonus,
    );
    perSeries[def.id] = s;
    total += s.points;
  }
  return { perSeries, total };
}

export interface LeaderboardEntry {
  rank: number;
  player: Player;
  total: number;
}

export function leaderboard(
  players: Player[],
  results: Partial<Record<SeriesId, SeriesResult>>,
  config: ScoringConfig,
): LeaderboardEntry[] {
  const scored = players.map((p) => ({
    player: p,
    total: scorePlayer(p, results, config).total,
  }));
  scored.sort((a, b) => b.total - a.total || a.player.name.localeCompare(b.player.name));
  return scored.map((s, i) => ({ rank: i + 1, ...s }));
}

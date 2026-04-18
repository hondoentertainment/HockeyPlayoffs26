export type RoundCode = "R1" | "R2" | "CF" | "SCF";

export type SeriesId =
  | "E1" | "E2" | "E3" | "E4"
  | "W1" | "W2" | "W3" | "W4"
  | "E5" | "E6" | "W5" | "W6"
  | "E7" | "W7"
  | "SCF";

export interface SeriesDef {
  id: SeriesId;
  round: RoundCode;
  source1: SeriesId | null;
  source2: SeriesId | null;
}

export const ROUND_LABELS: Record<RoundCode, string> = {
  R1: "Round 1",
  R2: "Round 2",
  CF: "Conference Final",
  SCF: "Stanley Cup Final",
};

export const ROUND_COLORS: Record<RoundCode, string> = {
  R1: "bg-ice",
  R2: "bg-round2",
  CF: "bg-conf",
  SCF: "bg-final",
};

export const SERIES: SeriesDef[] = [
  { id: "E1", round: "R1", source1: null, source2: null },
  { id: "E2", round: "R1", source1: null, source2: null },
  { id: "E3", round: "R1", source1: null, source2: null },
  { id: "E4", round: "R1", source1: null, source2: null },
  { id: "W1", round: "R1", source1: null, source2: null },
  { id: "W2", round: "R1", source1: null, source2: null },
  { id: "W3", round: "R1", source1: null, source2: null },
  { id: "W4", round: "R1", source1: null, source2: null },
  { id: "E5", round: "R2", source1: "E1", source2: "E2" },
  { id: "E6", round: "R2", source1: "E3", source2: "E4" },
  { id: "W5", round: "R2", source1: "W1", source2: "W2" },
  { id: "W6", round: "R2", source1: "W3", source2: "W4" },
  { id: "E7", round: "CF", source1: "E5", source2: "E6" },
  { id: "W7", round: "CF", source1: "W5", source2: "W6" },
  { id: "SCF", round: "SCF", source1: "E7", source2: "W7" },
];

export const SERIES_BY_ID: Record<SeriesId, SeriesDef> = SERIES.reduce(
  (acc, s) => ({ ...acc, [s.id]: s }),
  {} as Record<SeriesId, SeriesDef>,
);

export interface SeriesResult {
  team1?: string;
  team2?: string;
  winner?: string;
  games?: number;
}

export interface PlayerPick {
  winner?: string;
  games?: number;
}

export interface Player {
  id: string;
  name: string;
  picks: Partial<Record<SeriesId, PlayerPick>>;
}

export interface ScoringConfig {
  R1: number;
  R2: number;
  CF: number;
  SCF: number;
  gamesBonus: number;
}

export const DEFAULT_CONFIG: ScoringConfig = {
  R1: 2,
  R2: 4,
  CF: 6,
  SCF: 10,
  gamesBonus: 1,
};

/** Resolve the team in a slot for a series, walking back through bracket. */
export function resolveTeam(
  sid: SeriesId,
  slot: 1 | 2,
  results: Partial<Record<SeriesId, SeriesResult>>,
): string | undefined {
  const def = SERIES_BY_ID[sid];
  const source = slot === 1 ? def.source1 : def.source2;
  if (source === null) {
    const r = results[sid];
    return slot === 1 ? r?.team1 : r?.team2;
  }
  return results[source]?.winner || undefined;
}

/** Round 1 has user-entered teams; later rounds derive from earlier winners. */
export function effectiveTeams(
  sid: SeriesId,
  results: Partial<Record<SeriesId, SeriesResult>>,
): { team1?: string; team2?: string } {
  return {
    team1: resolveTeam(sid, 1, results),
    team2: resolveTeam(sid, 2, results),
  };
}

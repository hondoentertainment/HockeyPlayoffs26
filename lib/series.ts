import seriesData from "@/series.json";

export type RoundCode = "R1" | "R2" | "CF" | "SCF";

export type SeriesDef = {
  id: string;
  round: RoundCode;
  pointsKey: "R1_PTS" | "R2_PTS" | "CF_PTS" | "SCF_PTS";
  team1Source: string | null;
  team2Source: string | null;
};

export const SERIES: SeriesDef[] = seriesData.series as SeriesDef[];

export const ROUND_LABEL: Record<RoundCode, string> =
  seriesData.roundLabels as Record<RoundCode, string>;

export const ROUNDS: RoundCode[] = seriesData.roundOrder as RoundCode[];

export const DEFAULT_CONFIG: Record<string, number> =
  seriesData.defaultConfig as Record<string, number>;

export const seriesById = new Map(SERIES.map((s) => [s.id, s]));

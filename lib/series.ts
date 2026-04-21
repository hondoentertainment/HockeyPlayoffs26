export type RoundCode = "R1" | "R2" | "CF" | "SCF";

export type SeriesDef = {
  id: string;
  round: RoundCode;
  pointsKey: "R1_PTS" | "R2_PTS" | "CF_PTS" | "SCF_PTS";
  team1Source: string | null;
  team2Source: string | null;
};

export const SERIES: SeriesDef[] = [
  { id: "E1", round: "R1", pointsKey: "R1_PTS", team1Source: null, team2Source: null },
  { id: "E2", round: "R1", pointsKey: "R1_PTS", team1Source: null, team2Source: null },
  { id: "E3", round: "R1", pointsKey: "R1_PTS", team1Source: null, team2Source: null },
  { id: "E4", round: "R1", pointsKey: "R1_PTS", team1Source: null, team2Source: null },
  { id: "W1", round: "R1", pointsKey: "R1_PTS", team1Source: null, team2Source: null },
  { id: "W2", round: "R1", pointsKey: "R1_PTS", team1Source: null, team2Source: null },
  { id: "W3", round: "R1", pointsKey: "R1_PTS", team1Source: null, team2Source: null },
  { id: "W4", round: "R1", pointsKey: "R1_PTS", team1Source: null, team2Source: null },
  { id: "E5", round: "R2", pointsKey: "R2_PTS", team1Source: "E1", team2Source: "E2" },
  { id: "E6", round: "R2", pointsKey: "R2_PTS", team1Source: "E3", team2Source: "E4" },
  { id: "W5", round: "R2", pointsKey: "R2_PTS", team1Source: "W1", team2Source: "W2" },
  { id: "W6", round: "R2", pointsKey: "R2_PTS", team1Source: "W3", team2Source: "W4" },
  { id: "E7", round: "CF", pointsKey: "CF_PTS", team1Source: "E5", team2Source: "E6" },
  { id: "W7", round: "CF", pointsKey: "CF_PTS", team1Source: "W5", team2Source: "W6" },
  { id: "SCF", round: "SCF", pointsKey: "SCF_PTS", team1Source: "E7", team2Source: "W7" }
];

export const ROUND_LABEL: Record<RoundCode, string> = {
  R1: "Round 1",
  R2: "Round 2",
  CF: "Conference Final",
  SCF: "Stanley Cup Final"
};

export const ROUNDS: RoundCode[] = ["R1", "R2", "CF", "SCF"];

export const seriesById = new Map(SERIES.map((s) => [s.id, s]));

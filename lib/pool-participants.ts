import poolData from "@/pool_participants.json";
import type { PickRow, PlayerRow } from "./db";

/** Excel pool game id → series id in series.json */
const GAME_TO_SERIES: Record<string, string> = {
  g1: "W1",
  g2: "W2",
  g3: "W3",
  g4: "W4",
  g5: "E3",
  g6: "E4",
  g7: "E1",
  g8: "E2",
  g9: "W5",
  g10: "W6",
  g11: "E5",
  g12: "E6",
  g13: "W7",
  g14: "E7",
  g15: "SCF"
};

const ABBR_TO_TEAM: Record<string, string> = {
  ANA: "Anaheim Ducks",
  BOS: "Boston Bruins",
  BUF: "Buffalo Sabres",
  CAR: "Carolina Hurricanes",
  COL: "Colorado Avalanche",
  DAL: "Dallas Stars",
  EDM: "Edmonton Oilers",
  LAK: "Los Angeles Kings",
  MIN: "Minnesota Wild",
  MTL: "Montreal Canadiens",
  OTT: "Ottawa Senators",
  PHI: "Philadelphia Flyers",
  PIT: "Pittsburgh Penguins",
  TBL: "Tampa Bay Lightning",
  UTA: "Utah Mammoth",
  UTH: "Utah Mammoth",
  UHC: "Utah Mammoth",
  VGK: "Vegas Golden Knights"
};

type PoolPlayer = {
  id: string;
  name: string;
  picks: Record<string, string>;
};

type PoolFile = {
  players: PoolPlayer[];
};

const file = poolData as PoolFile;

export function abbrToTeamName(abbr: string): string {
  const key = abbr.trim().toUpperCase();
  return ABBR_TO_TEAM[key] ?? abbr;
}

export function getPoolPlayers(): PlayerRow[] {
  return file.players.map((p) => ({
    id: Number.parseInt(p.id, 10),
    name: p.name
  }));
}

export function getPoolPicks(): PickRow[] {
  const picks: PickRow[] = [];
  for (const player of file.players) {
    const playerId = Number.parseInt(player.id, 10);
    for (const [gameId, abbr] of Object.entries(player.picks)) {
      const seriesId = GAME_TO_SERIES[gameId];
      if (!seriesId || !abbr) continue;
      picks.push({
        player_id: playerId,
        series_id: seriesId,
        winner: abbrToTeamName(abbr),
        games: null
      });
    }
  }
  return picks;
}

export const POOL_PARTICIPANT_COUNT = file.players.length;

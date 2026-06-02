/**
 * Import pool_participants.json into Postgres (players + picks).
 *
 * Usage:
 *   DATABASE_URL=postgres://... node scripts/import-pool-participants.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pool = JSON.parse(
  readFileSync(join(root, "pool_participants.json"), "utf8")
);

const GAME_TO_SERIES = {
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

const ABBR_TO_TEAM = {
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

function abbrToTeamName(abbr) {
  return ABBR_TO_TEAM[abbr.trim().toUpperCase()] ?? abbr;
}

const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!url) {
  console.error("No DATABASE_URL set.");
  process.exit(1);
}

const sql = neon(url);

async function main() {
  for (const player of pool.players) {
    const id = Number.parseInt(player.id, 10);
    await sql`
      INSERT INTO players (id, name) VALUES (${id}, ${player.name})
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name`;
    for (const [gameId, abbr] of Object.entries(player.picks)) {
      const seriesId = GAME_TO_SERIES[gameId];
      if (!seriesId || !abbr) continue;
      await sql`
        INSERT INTO picks (player_id, series_id, winner, games)
        VALUES (${id}, ${seriesId}, ${abbrToTeamName(abbr)}, NULL)
        ON CONFLICT (player_id, series_id)
        DO UPDATE SET winner = EXCLUDED.winner, games = EXCLUDED.games`;
    }
    console.log(`Imported ${player.name}`);
  }
  console.log(`\nImported ${pool.players.length} players.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

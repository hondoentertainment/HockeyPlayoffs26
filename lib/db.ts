import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { DEFAULT_CONFIG, SERIES } from "./series";

let _sql: NeonQueryFunction<false, false> | null = null;
let initPromise: Promise<void> | null = null;

export function sql(): NeonQueryFunction<false, false> {
  if (!_sql) {
    const url =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_PRISMA_URL;
    if (!url) {
      throw new Error(
        "No database URL set. Provide DATABASE_URL (or POSTGRES_URL) in your env."
      );
    }
    _sql = neon(url);
  }
  return _sql;
}

export async function ensureSchema(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const q = sql();
      await q`CREATE TABLE IF NOT EXISTS series (
        id TEXT PRIMARY KEY,
        round_code TEXT NOT NULL,
        team1_source TEXT,
        team2_source TEXT,
        team1 TEXT,
        team2 TEXT,
        winner TEXT,
        games INTEGER
      )`;
      await q`CREATE TABLE IF NOT EXISTS players (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await q`CREATE TABLE IF NOT EXISTS picks (
        player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
        series_id TEXT REFERENCES series(id),
        winner TEXT NOT NULL,
        games INTEGER,
        PRIMARY KEY (player_id, series_id)
      )`;
      await q`CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value INTEGER NOT NULL
      )`;

      for (const s of SERIES) {
        await q`INSERT INTO series (id, round_code, team1_source, team2_source)
          VALUES (${s.id}, ${s.round}, ${s.team1Source}, ${s.team2Source})
          ON CONFLICT (id) DO NOTHING`;
      }
      for (const [k, v] of Object.entries(DEFAULT_CONFIG)) {
        await q`INSERT INTO config (key, value) VALUES (${k}, ${v})
          ON CONFLICT (key) DO NOTHING`;
      }
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

export type SeriesRow = {
  id: string;
  round_code: "R1" | "R2" | "CF" | "SCF";
  team1_source: string | null;
  team2_source: string | null;
  team1: string | null;
  team2: string | null;
  winner: string | null;
  games: number | null;
};

export type PlayerRow = { id: number; name: string };

export type PickRow = {
  player_id: number;
  series_id: string;
  winner: string;
  games: number | null;
};

export async function getAllSeries(): Promise<SeriesRow[]> {
  await ensureSchema();
  return (await sql()`SELECT * FROM series`) as unknown as SeriesRow[];
}

export async function getAllPlayers(): Promise<PlayerRow[]> {
  await ensureSchema();
  return (await sql()`SELECT id, name FROM players ORDER BY name ASC`) as unknown as PlayerRow[];
}

export async function getAllPicks(): Promise<PickRow[]> {
  await ensureSchema();
  return (await sql()`SELECT * FROM picks`) as unknown as PickRow[];
}

export async function getConfig(): Promise<Record<string, number>> {
  await ensureSchema();
  const rows = (await sql()`SELECT * FROM config`) as unknown as {
    key: string;
    value: number;
  }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

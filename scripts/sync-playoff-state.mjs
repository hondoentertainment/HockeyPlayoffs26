/**
 * Push playoff_results.json matchups + results into Postgres.
 *
 * Usage:
 *   DATABASE_URL=postgres://... node scripts/sync-playoff-state.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const state = JSON.parse(readFileSync(join(root, "playoff_results.json"), "utf8"));

const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!url) {
  console.error(
    "No DATABASE_URL set. Add it to .env.local or pass it when running this script."
  );
  process.exit(1);
}

const sql = neon(url);

async function main() {
  for (const [id, teams] of Object.entries(state.round1Matchups)) {
    const [team1, team2] = teams;
    await sql`UPDATE series SET team1 = ${team1}, team2 = ${team2} WHERE id = ${id}`;
    console.log(`R1 ${id}: ${team1} vs ${team2}`);
  }

  for (const [id, result] of Object.entries(state.results)) {
    await sql`UPDATE series SET winner = ${result.winner}, games = ${result.games} WHERE id = ${id}`;
    console.log(`${id}: ${result.winner} in ${result.games}`);
  }

  // SCF is still undecided — clear any stale result
  await sql`UPDATE series SET winner = NULL, games = NULL WHERE id = 'SCF'`;
  console.log("SCF: cleared (Final not started)");

  console.log(`\nSynced playoff state as of ${state.asOf}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

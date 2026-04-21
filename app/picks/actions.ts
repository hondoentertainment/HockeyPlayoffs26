"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureSchema, sql } from "@/lib/db";
import { SERIES } from "@/lib/series";

export async function submitPicks(formData: FormData) {
  await ensureSchema();
  const q = sql();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");

  const rows = (await q`
    INSERT INTO players (name) VALUES (${name})
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id`) as unknown as { id: number }[];
  const playerId = rows[0].id;

  for (const s of SERIES) {
    const winner = String(formData.get(`winner_${s.id}`) ?? "").trim();
    const gamesRaw = String(formData.get(`games_${s.id}`) ?? "").trim();
    if (!winner) continue;
    const games = gamesRaw ? parseInt(gamesRaw, 10) : null;
    if (games !== null && (Number.isNaN(games) || games < 4 || games > 7)) {
      throw new Error(`Invalid games count for ${s.id}: must be 4-7`);
    }
    await q`
      INSERT INTO picks (player_id, series_id, winner, games)
      VALUES (${playerId}, ${s.id}, ${winner}, ${games})
      ON CONFLICT (player_id, series_id)
      DO UPDATE SET winner = EXCLUDED.winner, games = EXCLUDED.games`;
  }

  revalidatePath("/");
  revalidatePath("/picks");
  redirect(`/picks/${encodeURIComponent(name)}`);
}

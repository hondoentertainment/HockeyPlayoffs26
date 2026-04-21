"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureSchema, sql } from "@/lib/db";
import { isAdmin, loginAdmin, logoutAdmin } from "@/lib/auth";
import { norm, TEAMS } from "@/lib/teams";
import { SERIES, seriesById } from "@/lib/series";

async function requireAdmin() {
  if (!(await isAdmin())) {
    throw new Error("Not authorized");
  }
}

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const ok = await loginAdmin(password);
  if (!ok) redirect("/admin/login?error=1");
  redirect("/admin");
}

export async function logoutAction() {
  await logoutAdmin();
  redirect("/admin/login");
}

export async function setRound1Matchups(formData: FormData) {
  await requireAdmin();
  await ensureSchema();
  const q = sql();
  const r1Ids = SERIES.filter((s) => s.round === "R1").map((s) => s.id);
  for (const id of r1Ids) {
    const t1 = String(formData.get(`team1_${id}`) ?? "").trim() || null;
    const t2 = String(formData.get(`team2_${id}`) ?? "").trim() || null;
    if (t1 && !TEAMS.includes(t1)) throw new Error(`Unknown team: ${t1}`);
    if (t2 && !TEAMS.includes(t2)) throw new Error(`Unknown team: ${t2}`);
    await q`UPDATE series SET team1 = ${t1}, team2 = ${t2} WHERE id = ${id}`;
  }
  revalidatePath("/");
  revalidatePath("/bracket");
  revalidatePath("/admin");
}

export async function setSeriesResult(formData: FormData) {
  await requireAdmin();
  await ensureSchema();
  const q = sql();
  const id = String(formData.get("series_id") ?? "");
  if (!seriesById.has(id)) throw new Error(`Unknown series: ${id}`);
  const winnerRaw = String(formData.get("winner") ?? "").trim();
  const gamesRaw = String(formData.get("games") ?? "").trim();
  const winner = winnerRaw || null;
  const games = gamesRaw ? parseInt(gamesRaw, 10) : null;
  if (games !== null && (Number.isNaN(games) || games < 4 || games > 7)) {
    throw new Error("Games must be 4-7");
  }
  if (winner && games === null) {
    throw new Error("Games is required when setting a winner");
  }

  if (winner) {
    const rows = (await q`
      SELECT team1, team2 FROM series WHERE id = ${id}`) as unknown as {
      team1: string | null;
      team2: string | null;
    }[];
    const t1 = rows[0]?.team1 ?? null;
    const t2 = rows[0]?.team2 ?? null;
    if (t1 && t2) {
      const w = norm(winner);
      if (w !== norm(t1) && w !== norm(t2)) {
        throw new Error(`Winner must be ${t1} or ${t2}`);
      }
    }
  }

  await q`UPDATE series SET winner = ${winner}, games = ${games} WHERE id = ${id}`;
  revalidatePath("/");
  revalidatePath("/bracket");
  revalidatePath("/admin");
}

export async function clearSeriesResult(formData: FormData) {
  await requireAdmin();
  await ensureSchema();
  const id = String(formData.get("series_id") ?? "");
  await sql()`UPDATE series SET winner = NULL, games = NULL WHERE id = ${id}`;
  revalidatePath("/");
  revalidatePath("/bracket");
  revalidatePath("/admin");
}

export async function updateConfig(formData: FormData) {
  await requireAdmin();
  await ensureSchema();
  const q = sql();
  const keys = ["R1_PTS", "R2_PTS", "CF_PTS", "SCF_PTS", "GAMES_BONUS"];
  for (const k of keys) {
    const v = parseInt(String(formData.get(k) ?? ""), 10);
    if (!Number.isFinite(v) || v < 0) throw new Error(`Invalid value for ${k}`);
    await q`UPDATE config SET value = ${v} WHERE key = ${k}`;
  }
  revalidatePath("/");
  revalidatePath("/admin");
}

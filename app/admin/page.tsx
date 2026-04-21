import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getAllSeries, getConfig } from "@/lib/db";
import { resolveSeries } from "@/lib/scoring";
import { ROUND_LABEL, SERIES } from "@/lib/series";
import { TEAMS } from "@/lib/teams";
import {
  clearSeriesResult,
  logoutAction,
  setRound1Matchups,
  setSeriesResult,
  updateConfig
} from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const [series, config] = await Promise.all([getAllSeries(), getConfig()]);
  const resolved = resolveSeries(series, config);
  const byId = new Map(resolved.map((r) => [r.id, r]));
  const r1 = SERIES.filter((s) => s.round === "R1");

  return (
    <section className="space-y-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin</h1>
        <form action={logoutAction}>
          <button className="text-sm text-slate-600 underline">Sign out</button>
        </form>
      </header>

      <section>
        <h2 className="text-lg font-semibold mb-3">Round 1 matchups</h2>
        <form action={setRound1Matchups} className="space-y-2">
          {r1.map((def) => {
            const r = byId.get(def.id)!;
            return (
              <div key={def.id} className="flex flex-wrap gap-2 items-center">
                <span className="w-10 text-xs text-slate-500">{def.id}</span>
                <TeamSelect name={`team1_${def.id}`} value={r.team1} />
                <span className="text-slate-400">vs</span>
                <TeamSelect name={`team2_${def.id}`} value={r.team2} />
              </div>
            );
          })}
          <button className="rounded bg-playoff px-4 py-2 text-white text-sm font-semibold mt-2">
            Save R1 matchups
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Series results</h2>
        <div className="space-y-2">
          {SERIES.map((def) => {
            const r = byId.get(def.id)!;
            const t1 = r.resolvedTeam1;
            const t2 = r.resolvedTeam2;
            return (
              <form
                key={def.id}
                action={setSeriesResult}
                className="flex flex-wrap items-center gap-2 rounded border border-slate-200 bg-white p-2 text-sm"
              >
                <input type="hidden" name="series_id" value={def.id} />
                <span className="w-10 text-xs text-slate-500">{def.id}</span>
                <span className="text-xs text-slate-500 w-32">
                  {ROUND_LABEL[def.round]}
                </span>
                <span className="w-56">
                  {t1 ?? "TBD"} vs. {t2 ?? "TBD"}
                </span>
                <select
                  name="winner"
                  defaultValue={r.winner ?? ""}
                  className="rounded border border-slate-300 px-2 py-1"
                  disabled={!t1 || !t2}
                >
                  <option value="">--</option>
                  {t1 && <option value={t1}>{t1}</option>}
                  {t2 && <option value={t2}>{t2}</option>}
                </select>
                <input
                  type="number"
                  name="games"
                  min={4}
                  max={7}
                  defaultValue={r.games ?? ""}
                  className="w-16 rounded border border-slate-300 px-2 py-1"
                  placeholder="games"
                />
                <button className="rounded bg-slate-800 text-white px-3 py-1 text-xs">
                  Save
                </button>
                {r.winner && (
                  <button
                    formAction={clearSeriesResult}
                    className="text-xs text-red-600 underline"
                  >
                    Clear
                  </button>
                )}
              </form>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Scoring config</h2>
        <form
          action={updateConfig}
          className="flex flex-wrap gap-3 items-end text-sm"
        >
          {(["R1_PTS", "R2_PTS", "CF_PTS", "SCF_PTS", "GAMES_BONUS"] as const).map(
            (k) => (
              <label key={k} className="flex flex-col">
                <span className="text-xs text-slate-500">{k}</span>
                <input
                  name={k}
                  type="number"
                  min={0}
                  defaultValue={config[k]}
                  className="w-20 rounded border border-slate-300 px-2 py-1"
                />
              </label>
            )
          )}
          <button className="rounded bg-playoff text-white px-4 py-2 text-sm font-semibold">
            Save config
          </button>
        </form>
      </section>
    </section>
  );
}

function TeamSelect({
  name,
  value
}: {
  name: string;
  value: string | null;
}) {
  return (
    <select
      name={name}
      defaultValue={value ?? ""}
      className="rounded border border-slate-300 px-2 py-1 text-sm"
    >
      <option value="">--</option>
      {TEAMS.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}

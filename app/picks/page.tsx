import { getAllSeries, getConfig } from "@/lib/db";
import { resolveSeries } from "@/lib/scoring";
import { ROUND_LABEL, SERIES } from "@/lib/series";
import { TEAMS } from "@/lib/teams";
import { submitPicks } from "./actions";

export const dynamic = "force-dynamic";

export default async function PicksPage() {
  const [series, config] = await Promise.all([getAllSeries(), getConfig()]);
  const resolved = resolveSeries(series, config);
  const byId = new Map(resolved.map((r) => [r.id, r]));

  return (
    <section>
      <h1 className="text-2xl font-bold mb-2">Submit your picks</h1>
      <p className="text-sm text-slate-600 mb-6">
        For each series, pick the winner and predict the game count (4-7).
        Submitting again with the same name updates your picks. Once a series
        completes you can&apos;t change that pick.
      </p>
      <form action={submitPicks} className="space-y-6">
        <label className="block">
          <span className="text-sm font-semibold">Your name</span>
          <input
            name="name"
            required
            maxLength={64}
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
            placeholder="e.g. Jane Doe"
          />
        </label>

        <div className="space-y-3">
          {SERIES.map((def) => {
            const r = byId.get(def.id)!;
            const t1 = r.resolvedTeam1;
            const t2 = r.resolvedTeam2;
            const locked = !!r.winner;
            const options =
              t1 && t2 ? [t1, t2] : TEAMS;
            return (
              <div
                key={def.id}
                className="rounded border border-slate-200 bg-white p-3"
              >
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  {ROUND_LABEL[def.round]} · {def.id}
                </div>
                <div className="mt-1 text-sm text-slate-700">
                  {t1 ?? "TBD"} vs. {t2 ?? "TBD"}
                </div>
                <div className="mt-2 flex flex-wrap gap-3 items-center">
                  <label className="text-sm">
                    Winner:{" "}
                    <select
                      name={`winner_${def.id}`}
                      disabled={locked}
                      className="rounded border border-slate-300 px-2 py-1 disabled:bg-slate-100"
                    >
                      <option value="">--</option>
                      {options.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    Games:{" "}
                    <input
                      name={`games_${def.id}`}
                      type="number"
                      min={4}
                      max={7}
                      disabled={locked}
                      className="w-16 rounded border border-slate-300 px-2 py-1 disabled:bg-slate-100"
                    />
                  </label>
                  {locked && (
                    <span className="text-xs text-slate-500">
                      Series complete (winner: {r.winner}, in {r.games})
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="submit"
          className="rounded bg-playoff px-4 py-2 text-white font-semibold hover:opacity-90"
        >
          Submit picks
        </button>
      </form>
    </section>
  );
}

import { notFound } from "next/navigation";
import {
  ensureSchema,
  getAllPicks,
  getAllSeries,
  getConfig,
  sql,
  type PickRow
} from "@/lib/db";
import { resolveSeries, scorePlayers } from "@/lib/scoring";
import { ROUND_LABEL, SERIES } from "@/lib/series";
import { norm } from "@/lib/teams";

export const dynamic = "force-dynamic";

export default async function PlayerPicksPage({
  params
}: {
  params: { name: string };
}) {
  await ensureSchema();
  const name = decodeURIComponent(params.name);
  const rows = (await sql()`
    SELECT id, name FROM players WHERE name = ${name} LIMIT 1`) as unknown as {
    id: number;
    name: string;
  }[];
  if (rows.length === 0) notFound();
  const player = rows[0];

  const [series, allPicks, config] = await Promise.all([
    getAllSeries(),
    getAllPicks(),
    getConfig()
  ]);
  const myPicks: PickRow[] = allPicks.filter((p) => p.player_id === player.id);
  const myPickById = new Map(myPicks.map((p) => [p.series_id, p]));
  const resolved = resolveSeries(series, config);
  const byId = new Map(resolved.map((r) => [r.id, r]));
  const scored = scorePlayers([player], myPicks, resolved, config)[0];
  const picksLocked = !!config.PICKS_LOCKED;

  return (
    <section>
      <h1 className="text-2xl font-bold mb-2">{player.name}</h1>
      <p className="text-sm text-slate-600 mb-4">
        Total: <strong>{scored.total}</strong> · Max possible:{" "}
        <strong>{scored.total + scored.maxRemaining}</strong> · Correct
        winners: <strong>{scored.correctWinners}</strong>
      </p>
      {!picksLocked && (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Picks are hidden until the admin locks picks for the pool. Only
          completed series (where the winner is already public) are shown.
        </div>
      )}
      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="px-3 py-2">Series</th>
              <th className="px-3 py-2">Round</th>
              <th className="px-3 py-2">Pick</th>
              <th className="px-3 py-2">Games</th>
              <th className="px-3 py-2">Actual</th>
              <th className="px-3 py-2 text-right">Pts</th>
            </tr>
          </thead>
          <tbody>
            {SERIES.map((def) => {
              const r = byId.get(def.id)!;
              const pick = myPickById.get(def.id);
              const correct =
                r.winner && pick && norm(pick.winner) === norm(r.winner);
              // Before lock, only reveal picks for series the pool already
              // knows the result of. That keeps late entrants from copying.
              const revealPick = picksLocked || !!r.winner;
              return (
                <tr key={def.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-500">{def.id}</td>
                  <td className="px-3 py-2">{ROUND_LABEL[def.round]}</td>
                  <td
                    className={
                      "px-3 py-2 " +
                      (r.winner
                        ? correct
                          ? "text-green-700"
                          : "text-red-600"
                        : "")
                    }
                  >
                    {revealPick ? (
                      pick?.winner ?? <span className="text-slate-400">—</span>
                    ) : (
                      <span className="text-slate-400">hidden</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {revealPick ? pick?.games ?? "—" : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {r.winner ? (
                      `${r.winner} in ${r.games}`
                    ) : (
                      <span className="text-slate-400">pending</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {scored.perSeries[def.id] ?? 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

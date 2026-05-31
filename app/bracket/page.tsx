import { getAllSeries, getConfig } from "@/lib/db";
import { STANLEY_CUP_FINAL } from "@/lib/playoff-state";
import { resolveSeries } from "@/lib/scoring";
import { ROUNDS, ROUND_LABEL, SERIES } from "@/lib/series";

export const dynamic = "force-dynamic";

export default async function BracketPage() {
  const [series, config] = await Promise.all([getAllSeries(), getConfig()]);
  const resolved = resolveSeries(series, config);
  const byId = new Map(resolved.map((r) => [r.id, r]));
  const scf = byId.get("SCF");

  return (
    <section>
      <h1 className="text-2xl font-bold mb-2 text-playoff">Bracket</h1>
      {scf && !scf.winner && scf.resolvedTeam1 && scf.resolvedTeam2 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <p className="font-semibold text-playoff">{STANLEY_CUP_FINAL.headline}</p>
          <p className="text-slate-700">
            {scf.resolvedTeam1} vs. {scf.resolvedTeam2}
          </p>
          <p className="text-xs text-slate-500 mt-1">{STANLEY_CUP_FINAL.nextGame}</p>
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-4">
        {ROUNDS.map((round) => (
          <div key={round}>
            <h2 className="text-sm font-semibold uppercase text-slate-600 mb-2">
              {ROUND_LABEL[round]}
            </h2>
            <div className="space-y-2">
              {SERIES.filter((s) => s.round === round).map((def) => {
                const r = byId.get(def.id)!;
                return (
                  <div
                    key={def.id}
                    className={
                      "rounded border bg-white p-2 text-xs " +
                      (def.id === "SCF" && !r.winner
                        ? "border-amber-300 ring-1 ring-amber-200"
                        : "border-slate-200")
                    }
                  >
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>{def.id}</span>
                      <span>
                        {r.pointsForRound} pt
                        {r.pointsForRound === 1 ? "" : "s"}
                      </span>
                    </div>
                    <Slot
                      team={r.resolvedTeam1}
                      isWinner={
                        !!r.winner &&
                        r.winner.trim().toUpperCase() ===
                          (r.resolvedTeam1 ?? "").trim().toUpperCase()
                      }
                    />
                    <Slot
                      team={r.resolvedTeam2}
                      isWinner={
                        !!r.winner &&
                        r.winner.trim().toUpperCase() ===
                          (r.resolvedTeam2 ?? "").trim().toUpperCase()
                      }
                    />
                    {r.winner && r.games && (
                      <div className="mt-1 text-slate-500">in {r.games}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Points shown are per correct winner. Picking the exact game count (4-7)
        adds +{config.GAMES_BONUS} bonus only when the winner pick is also
        correct.
      </p>
    </section>
  );
}

function Slot({ team, isWinner }: { team: string | null; isWinner: boolean }) {
  return (
    <div
      className={
        "px-2 py-1 rounded " +
        (isWinner
          ? "bg-green-100 font-semibold"
          : team
          ? "bg-slate-50"
          : "bg-slate-50 text-slate-400 italic")
      }
    >
      {team ?? "TBD"}
    </div>
  );
}

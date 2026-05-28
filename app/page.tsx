import {
  getAllPicks,
  getAllPlayers,
  getAllSeries,
  getConfig
} from "@/lib/db";
import { resolveSeries, scorePlayers, simulateWinChances } from "@/lib/scoring";
import { ROUNDS } from "@/lib/series";

export const dynamic = "force-dynamic";

const SIM_TRIALS = 10000;

function formatWinChance(p: number): string {
  if (p <= 0) return "—";
  if (p < 0.001) return "<0.1%";
  if (p > 0.999) return ">99.9%";
  return `${(p * 100).toFixed(1)}%`;
}

export default async function LeaderboardPage() {
  const [series, players, picks, config] = await Promise.all([
    getAllSeries(),
    getAllPlayers(),
    getAllPicks(),
    getConfig()
  ]);
  const resolved = resolveSeries(series, config);
  const scores = scorePlayers(players, picks, resolved, config);
  const winById = new Map(
    simulateWinChances(players, picks, series, config, {
      trials: SIM_TRIALS
    }).map((w) => [w.player.id, w.winProbability])
  );

  const ranked = scores
    .map((s) => ({ s, win: winById.get(s.player.id) ?? 0 }))
    .sort((a, b) => {
      if (b.win !== a.win) return b.win - a.win;
      if (b.s.total !== a.s.total) return b.s.total - a.s.total;
      if (b.s.correctWinners !== a.s.correctWinners)
        return b.s.correctWinners - a.s.correctWinners;
      return a.s.player.name.localeCompare(b.s.player.name);
    });

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">Leaderboard</h1>
      {ranked.length === 0 ? (
        <p className="text-slate-600">
          No picks submitted yet.{" "}
          <a className="text-blue-600 underline" href="/picks">
            Be the first.
          </a>
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Player</th>
                <th className="px-3 py-2 text-right">Win %</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Max Possible</th>
                <th className="px-3 py-2 text-right">Correct Winners</th>
                {ROUNDS.map((r) => (
                  <th key={r} className="px-3 py-2 text-right">
                    {r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranked.map(({ s, win }, i) => (
                <tr
                  key={s.player.id}
                  className={i === 0 ? "bg-yellow-50 font-semibold" : ""}
                >
                  <td className="px-3 py-2">{i + 1}</td>
                  <td className="px-3 py-2">{s.player.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatWinChance(win)}
                  </td>
                  <td className="px-3 py-2 text-right">{s.total}</td>
                  <td className="px-3 py-2 text-right text-slate-500">
                    {s.total + s.maxRemaining}
                  </td>
                  <td className="px-3 py-2 text-right">{s.correctWinners}</td>
                  {ROUNDS.map((r) => (
                    <td key={r} className="px-3 py-2 text-right">
                      {s.perRound[r]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-xs text-slate-500">
        Scoring: R1 {config.R1_PTS} pts · R2 {config.R2_PTS} pts · CF{" "}
        {config.CF_PTS} pts · SCF {config.SCF_PTS} pts · +
        {config.GAMES_BONUS} bonus for correct game count.
      </p>
      <p className="mt-1 text-xs text-slate-400">
        Win % is each player&apos;s chance of finishing first across{" "}
        {SIM_TRIALS.toLocaleString()} simulated playoff outcomes, where every
        undecided series is a 50/50 coin flip with an equally likely game count
        (4–7). Ties are split.
      </p>
    </section>
  );
}

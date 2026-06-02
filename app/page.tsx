import Link from "next/link";
import {
  LeaderboardPodium,
  LeaderboardSummary
} from "@/components/leaderboard-summary";
import {
  LeaderboardTable,
  type LeaderboardRow
} from "@/components/leaderboard-table";
import {
  getAllPicks,
  getAllPlayers,
  getAllSeries,
  getConfig
} from "@/lib/db";
import { POOL_PARTICIPANT_COUNT } from "@/lib/pool-participants";
import {
  resolveSeries,
  scorePlayers,
  simulateWinChances
} from "@/lib/scoring";

export const dynamic = "force-dynamic";

const SIM_TRIALS = 10000;

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

  const rows: LeaderboardRow[] = ranked.map(({ s, win }, i) => ({
    rank: i + 1,
    playerId: s.player.id,
    name: s.player.name,
    win,
    total: s.total,
    maxPossible: s.total + s.maxRemaining,
    correctWinners: s.correctWinners,
    perRound: s.perRound
  }));

  const maxWin = Math.max(...rows.map((r) => r.win), 0.01);
  const seriesCompleted = resolved.filter((s) => s.winner).length;
  const leader = rows[0] ?? null;

  return (
    <section>
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-playoff">Leaderboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            Ranked by simulated win probability, then total points.
            {rows.length === POOL_PARTICIPANT_COUNT && (
              <span className="text-slate-500">
                {" "}
                · {POOL_PARTICIPANT_COUNT} players from Excel import
              </span>
            )}
          </p>
        </div>
        <Link
          href="/picks"
          className="inline-flex items-center justify-center rounded-lg bg-playoff px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-playoff/90"
        >
          Submit picks
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <p className="text-lg font-medium text-slate-700">No picks yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Be the first to submit a bracket and claim the top spot.
          </p>
          <Link
            href="/picks"
            className="mt-4 inline-block text-sm font-medium text-playoff underline hover:no-underline"
          >
            Submit picks →
          </Link>
        </div>
      ) : (
        <>
          <LeaderboardSummary
            playerCount={rows.length}
            seriesCompleted={seriesCompleted}
            seriesTotal={resolved.length}
            leader={
              leader
                ? {
                    rank: leader.rank,
                    name: leader.name,
                    win: leader.win,
                    total: leader.total
                  }
                : null
            }
          />

          {rows.length >= 2 && (
            <LeaderboardPodium
              topThree={rows.slice(0, 3).map((r) => ({
                rank: r.rank,
                name: r.name,
                win: r.win,
                total: r.total
              }))}
            />
          )}

          <LeaderboardTable rows={rows} maxWin={maxWin} />
        </>
      )}

      <details className="mt-6 rounded-lg border border-slate-200 bg-white text-sm shadow-sm">
        <summary className="cursor-pointer px-4 py-3 font-medium text-slate-700 hover:text-playoff">
          How scoring &amp; win % work
        </summary>
        <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500 space-y-2">
          <p>
            <strong className="text-slate-700">Scoring:</strong> R1{" "}
            {config.R1_PTS} pts · R2 {config.R2_PTS} pts · CF {config.CF_PTS}{" "}
            pts · SCF {config.SCF_PTS} pts · +{config.GAMES_BONUS} bonus for
            correct game count.
          </p>
          <p>
            <strong className="text-slate-700">Win %:</strong> Each
            player&apos;s chance of finishing first across{" "}
            {SIM_TRIALS.toLocaleString()} simulated playoff outcomes, where
            every undecided series is a 50/50 coin flip with an equally likely
            game count (4–7). Ties are split.
          </p>
          <p className="text-slate-400">
            Tap a player name to view their full bracket and per-series scores.
          </p>
        </div>
      </details>
    </section>
  );
}

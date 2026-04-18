"use client";

import { leaderboard } from "@/lib/scoring";
import { useApp } from "@/lib/state";

export function LeaderboardTab() {
  const { state } = useApp();
  const board = leaderboard(state.players, state.results, state.config);

  if (board.length === 0) {
    return (
      <p className="rounded border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-600">
        Add players on the Picks tab to see the leaderboard.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-gray-300">
      <table>
        <thead>
          <tr>
            <th className="w-20 text-center">Rank</th>
            <th>Player</th>
            <th className="w-32 text-right">Total Points</th>
          </tr>
        </thead>
        <tbody>
          {board.map((e) => (
            <tr key={e.player.id} className={e.rank === 1 ? "bg-final font-bold" : ""}>
              <td className="text-center">{e.rank}</td>
              <td>{e.player.name}</td>
              <td className="text-right">{e.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

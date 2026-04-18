"use client";

import { ROUND_COLORS, ROUND_LABELS, SERIES } from "@/lib/bracket";
import { scorePlayer } from "@/lib/scoring";
import { useApp } from "@/lib/state";

function pointsClass(pts: number): string {
  if (pts <= 0) return "bg-white";
  if (pts <= 2) return "bg-green-50";
  if (pts <= 4) return "bg-green-100";
  if (pts <= 6) return "bg-green-200";
  if (pts <= 8) return "bg-green-300";
  return "bg-green-400";
}

export function ScoresTab() {
  const { state } = useApp();
  const { players, results, config } = state;

  if (players.length === 0) {
    return (
      <p className="rounded border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-600">
        Add players on the Picks tab to see scores.
      </p>
    );
  }

  const scored = players.map((p) => ({
    player: p,
    scoring: scorePlayer(p, results, config),
  }));

  return (
    <div className="overflow-x-auto rounded border border-gray-300">
      <table>
        <thead>
          <tr>
            <th className="w-32">Round</th>
            <th className="w-16">Series</th>
            <th className="w-20">Pts</th>
            <th className="w-40">Actual</th>
            {scored.map((s) => (
              <th key={s.player.id} className="min-w-[120px] text-center">
                {s.player.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SERIES.map((def) => {
            const r = results[def.id];
            const roundPts = config[def.round as "R1" | "R2" | "CF" | "SCF"];
            return (
              <tr key={def.id}>
                <td className={ROUND_COLORS[def.round] + " font-medium"}>
                  {ROUND_LABELS[def.round]}
                </td>
                <td className={ROUND_COLORS[def.round] + " text-center"}>
                  {def.id}
                </td>
                <td className="text-center">{roundPts}</td>
                <td className="text-xs">
                  {r?.winner ? (
                    <>
                      <span className="font-medium">{r.winner}</span>
                      {r.games ? ` in ${r.games}` : ""}
                    </>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                {scored.map((s) => {
                  const ss = s.scoring.perSeries[def.id];
                  return (
                    <td
                      key={s.player.id}
                      className={pointsClass(ss.points) + " text-center"}
                      title={
                        ss.winnerCorrect
                          ? ss.gamesCorrect
                            ? "Correct winner + games"
                            : "Correct winner"
                          : "Incorrect"
                      }
                    >
                      {ss.points || ""}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          <tr>
            <td colSpan={4} className="bg-header text-right font-bold text-white">
              TOTAL
            </td>
            {scored.map((s) => (
              <td
                key={s.player.id}
                className="bg-final text-center text-base font-bold"
              >
                {s.scoring.total}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

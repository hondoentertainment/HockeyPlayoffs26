"use client";

import {
  effectiveTeams,
  ROUND_COLORS,
  ROUND_LABELS,
  SERIES,
  SeriesId,
} from "@/lib/bracket";
import { useApp } from "@/lib/state";

export function BracketTab() {
  const { state, setResult } = useApp();
  const { results } = state;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-700">
        <span className="rounded bg-input px-1.5 py-0.5">Yellow</span> cells are
        for you to fill in.{" "}
        <span className="rounded bg-formula px-1.5 py-0.5">Green</span> cells
        auto-fill from earlier winners.
      </p>

      <div className="overflow-x-auto rounded border border-gray-300">
        <table>
          <thead>
            <tr>
              <th className="w-32">Round</th>
              <th className="w-16">Series</th>
              <th className="w-56">Team 1</th>
              <th className="w-56">Team 2</th>
              <th className="w-56">Winner</th>
              <th className="w-24">Games</th>
            </tr>
          </thead>
          <tbody>
            {SERIES.map((def) => {
              const result = results[def.id] ?? {};
              const { team1, team2 } = effectiveTeams(def.id, results);
              const isR1 = def.round === "R1";
              const winnerOptions = [team1, team2].filter(
                (t): t is string => !!t,
              );
              return (
                <tr key={def.id}>
                  <td className={ROUND_COLORS[def.round] + " font-medium"}>
                    {ROUND_LABELS[def.round]}
                  </td>
                  <td className={ROUND_COLORS[def.round] + " text-center"}>
                    {def.id}
                  </td>
                  <td className={isR1 ? "bg-input" : "bg-formula"}>
                    {isR1 ? (
                      <input
                        type="text"
                        className="w-full"
                        value={team1 ?? ""}
                        placeholder="Team name"
                        onChange={(e) =>
                          setResult(def.id, { team1: e.target.value })
                        }
                      />
                    ) : (
                      <span className="text-sm">{team1 ?? "—"}</span>
                    )}
                  </td>
                  <td className={isR1 ? "bg-input" : "bg-formula"}>
                    {isR1 ? (
                      <input
                        type="text"
                        className="w-full"
                        value={team2 ?? ""}
                        placeholder="Team name"
                        onChange={(e) =>
                          setResult(def.id, { team2: e.target.value })
                        }
                      />
                    ) : (
                      <span className="text-sm">{team2 ?? "—"}</span>
                    )}
                  </td>
                  <td className="bg-input">
                    <select
                      className="w-full"
                      value={result.winner ?? ""}
                      onChange={(e) =>
                        setResult(def.id, { winner: e.target.value || undefined })
                      }
                      disabled={winnerOptions.length === 0}
                    >
                      <option value="">—</option>
                      {winnerOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="bg-input">
                    <input
                      type="number"
                      min={4}
                      max={7}
                      className="w-16"
                      value={result.games ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setResult(def.id as SeriesId, {
                          games: v ? Number(v) : undefined,
                        });
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

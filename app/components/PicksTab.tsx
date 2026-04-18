"use client";

import { useState } from "react";
import {
  effectiveTeams,
  ROUND_COLORS,
  ROUND_LABELS,
  SERIES,
} from "@/lib/bracket";
import { useApp } from "@/lib/state";

export function PicksTab() {
  const { state, addPlayer, renamePlayer, removePlayer, setPick } = useApp();
  const { players, results } = state;
  const [newName, setNewName] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={newName}
          placeholder="Player name"
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newName.trim()) {
              addPlayer(newName.trim());
              setNewName("");
            }
          }}
        />
        <button
          onClick={() => {
            if (newName.trim()) {
              addPlayer(newName.trim());
              setNewName("");
            }
          }}
          disabled={!newName.trim()}
        >
          Add player
        </button>
        <span className="text-sm text-gray-600">
          {players.length} player{players.length === 1 ? "" : "s"}
        </span>
      </div>

      {players.length === 0 ? (
        <p className="rounded border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-600">
          No players yet. Add a player above to start entering picks.
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-300">
          <table>
            <thead>
              <tr>
                <th className="w-32">Round</th>
                <th className="w-16">Series</th>
                <th className="w-40">Matchup</th>
                {players.map((p) => (
                  <th key={p.id} className="min-w-[200px]">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => renamePlayer(p.id, e.target.value)}
                        className="w-full bg-white text-header"
                      />
                      <button
                        className="ghost !px-2 !py-0.5 !text-white hover:!bg-red-700"
                        title="Remove player"
                        onClick={() => {
                          if (
                            confirm(`Remove player "${p.name}" and all picks?`)
                          )
                            removePlayer(p.id);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SERIES.map((def) => {
                const { team1, team2 } = effectiveTeams(def.id, results);
                const opts = [team1, team2].filter(
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
                    <td className="text-xs text-gray-700">
                      {team1 ?? "?"} vs {team2 ?? "?"}
                    </td>
                    {players.map((p) => {
                      const pick = p.picks[def.id] ?? {};
                      return (
                        <td key={p.id} className="bg-input">
                          <div className="flex items-center gap-1">
                            <select
                              className="flex-1"
                              value={pick.winner ?? ""}
                              onChange={(e) =>
                                setPick(p.id, def.id, {
                                  winner: e.target.value || undefined,
                                })
                              }
                            >
                              <option value="">—</option>
                              {opts.map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                              {pick.winner && !opts.includes(pick.winner) && (
                                <option value={pick.winner}>{pick.winner}</option>
                              )}
                            </select>
                            <input
                              type="number"
                              min={4}
                              max={7}
                              className="w-14"
                              value={pick.games ?? ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                setPick(p.id, def.id, {
                                  games: v ? Number(v) : undefined,
                                });
                              }}
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

"use client";

import { DEFAULT_CONFIG, ScoringConfig } from "@/lib/bracket";
import { useApp } from "@/lib/state";

const FIELDS: { key: keyof ScoringConfig; label: string }[] = [
  { key: "R1", label: "Round 1 points" },
  { key: "R2", label: "Round 2 points" },
  { key: "CF", label: "Conference Final points" },
  { key: "SCF", label: "Stanley Cup Final points" },
  { key: "gamesBonus", label: "Correct-games bonus" },
];

export function ConfigTab() {
  const { state, setConfig, resetAll } = useApp();
  const { config } = state;

  return (
    <div className="space-y-6">
      <div className="rounded border border-gray-300 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold text-header">Scoring</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <label key={f.key} className="flex items-center justify-between gap-3">
              <span className="text-sm">{f.label}</span>
              <input
                type="number"
                min={0}
                className="w-24"
                value={config[f.key]}
                onChange={(e) =>
                  setConfig({ [f.key]: Number(e.target.value) || 0 } as Partial<ScoringConfig>)
                }
              />
            </label>
          ))}
        </div>
        <div className="mt-4">
          <button className="ghost" onClick={() => setConfig(DEFAULT_CONFIG)}>
            Restore defaults
          </button>
        </div>
      </div>

      <div className="rounded border border-red-200 bg-red-50 p-4">
        <h2 className="mb-2 text-lg font-semibold text-red-800">Danger zone</h2>
        <p className="mb-3 text-sm text-red-900">
          Wipe all bracket results, players, picks, and scoring config from this
          browser.
        </p>
        <button
          className="danger"
          onClick={() => {
            if (
              confirm(
                "Erase ALL bracket data, players, picks, and scoring config?",
              )
            ) {
              resetAll();
            }
          }}
        >
          Reset everything
        </button>
      </div>
    </div>
  );
}

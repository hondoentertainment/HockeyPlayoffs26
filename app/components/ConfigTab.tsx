"use client";

import { useRef, useState } from "react";
import { DEFAULT_CONFIG, ScoringConfig } from "@/lib/bracket";
import { buildExport, parseImport } from "@/lib/io";
import { useApp } from "@/lib/state";

const FIELDS: { key: keyof ScoringConfig; label: string }[] = [
  { key: "R1", label: "Round 1 points" },
  { key: "R2", label: "Round 2 points" },
  { key: "CF", label: "Conference Final points" },
  { key: "SCF", label: "Stanley Cup Final points" },
  { key: "gamesBonus", label: "Correct-games bonus" },
];

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ConfigTab() {
  const { state, setConfig, resetAll, replaceState } = useApp();
  const { config } = state;
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);

  const onImport = async (file: File) => {
    setImportErr(null);
    setImportMsg(null);
    try {
      const text = await file.text();
      const next = parseImport(text);
      if (
        !confirm(
          `Replace current data with import?\n\n${next.players.length} player(s), ${
            Object.keys(next.results).length
          } series with results.`,
        )
      ) {
        return;
      }
      replaceState(next);
      setImportMsg(`Imported ${file.name}.`);
    } catch (e) {
      setImportErr(e instanceof Error ? e.message : String(e));
    }
  };

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

      <div className="rounded border border-gray-300 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold text-header">Backup &amp; restore</h2>
        <p className="mb-3 text-sm text-gray-700">
          Bracket data lives in this browser&rsquo;s storage. Export to back up
          or to move state to another device.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              const stamp = new Date().toISOString().replace(/[:.]/g, "-");
              downloadJson(`hockey-playoffs-26-${stamp}.json`, buildExport(state));
            }}
          >
            Export JSON
          </button>
          <button className="ghost" onClick={() => fileRef.current?.click()}>
            Import JSON…
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
              e.target.value = "";
            }}
          />
        </div>
        {importMsg && (
          <p className="mt-2 text-sm text-green-700">{importMsg}</p>
        )}
        {importErr && (
          <p className="mt-2 text-sm text-red-700">Import failed: {importErr}</p>
        )}
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

import { DEFAULT_CONFIG, Player, ScoringConfig, SeriesId, SeriesResult } from "./bracket";
import type { AppState } from "./state";

export const EXPORT_VERSION = 1;

export interface ExportFile {
  app: "hockey-playoffs-26";
  version: number;
  exportedAt: string;
  state: AppState;
}

export function buildExport(state: AppState): ExportFile {
  return {
    app: "hockey-playoffs-26",
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    state,
  };
}

/** Parse + lightly validate an imported file. Throws on failure. */
export function parseImport(text: string): AppState {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("File is not valid JSON.");
  }
  if (typeof raw !== "object" || raw === null) {
    throw new Error("File does not look like an exported bracket.");
  }
  const obj = raw as Partial<ExportFile> & Partial<AppState>;
  // Accept either a wrapped ExportFile or a bare AppState (forward-compat).
  const stateLike: unknown = "state" in obj && obj.state ? obj.state : obj;
  if (typeof stateLike !== "object" || stateLike === null) {
    throw new Error("Missing 'state' in import file.");
  }
  const s = stateLike as Partial<AppState>;
  const results = (s.results ?? {}) as Partial<Record<SeriesId, SeriesResult>>;
  const players = Array.isArray(s.players) ? (s.players as Player[]) : [];
  const config: ScoringConfig = { ...DEFAULT_CONFIG, ...(s.config ?? {}) };
  // Minimal shape check on players.
  for (const p of players) {
    if (typeof p?.id !== "string" || typeof p?.name !== "string" || typeof p?.picks !== "object") {
      throw new Error("Players block is malformed.");
    }
  }
  return { results, players, config };
}

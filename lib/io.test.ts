import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "./bracket";
import { buildExport, parseImport } from "./io";
import type { AppState } from "./state";

const sample: AppState = {
  results: { E1: { team1: "BOS", team2: "TOR", winner: "BOS", games: 6 } },
  players: [{ id: "p1", name: "Alice", picks: { E1: { winner: "BOS", games: 6 } } }],
  config: DEFAULT_CONFIG,
};

describe("buildExport / parseImport", () => {
  it("round-trips state through an ExportFile envelope", () => {
    const text = JSON.stringify(buildExport(sample));
    expect(parseImport(text)).toEqual(sample);
  });

  it("accepts a bare AppState payload", () => {
    expect(parseImport(JSON.stringify(sample))).toEqual(sample);
  });

  it("fills missing config keys with defaults", () => {
    const partial = JSON.stringify({ ...sample, config: { R1: 5 } });
    const parsed = parseImport(partial);
    expect(parsed.config.R1).toBe(5);
    expect(parsed.config.SCF).toBe(DEFAULT_CONFIG.SCF);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseImport("not json")).toThrow(/valid JSON/);
  });

  it("throws on malformed players block", () => {
    const bad = JSON.stringify({ players: [{ name: 123 }] });
    expect(() => parseImport(bad)).toThrow(/Players block/);
  });
});

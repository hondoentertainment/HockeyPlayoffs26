import { describe, expect, it } from "vitest";
import { effectiveTeams, resolveTeam, SeriesId, SeriesResult } from "./bracket";

const r = (
  patches: Partial<Record<SeriesId, SeriesResult>>,
): Partial<Record<SeriesId, SeriesResult>> => patches;

describe("resolveTeam / effectiveTeams", () => {
  it("returns user-entered teams for Round 1", () => {
    const results = r({ E1: { team1: "BOS", team2: "TOR" } });
    expect(resolveTeam("E1", 1, results)).toBe("BOS");
    expect(resolveTeam("E1", 2, results)).toBe("TOR");
  });

  it("derives Round 2 teams from Round 1 winners", () => {
    const results = r({
      E1: { team1: "BOS", team2: "TOR", winner: "BOS" },
      E2: { team1: "FLA", team2: "TBL", winner: "TBL" },
    });
    expect(effectiveTeams("E5", results)).toEqual({ team1: "BOS", team2: "TBL" });
  });

  it("returns undefined when source winner is missing", () => {
    const results = r({ E1: { team1: "BOS", team2: "TOR" } });
    expect(resolveTeam("E5", 1, results)).toBeUndefined();
  });

  it("derives Stanley Cup Final teams from CF winners", () => {
    const results = r({ E7: { winner: "BOS" }, W7: { winner: "EDM" } });
    expect(effectiveTeams("SCF", results)).toEqual({ team1: "BOS", team2: "EDM" });
  });
});

import { describe, expect, it } from "vitest";
import type { PickRow, PlayerRow, SeriesRow } from "./db";
import {
  formatWinChance,
  rankPlayers,
  resolveSeries,
  scorePlayers,
  simulateWinChances
} from "./scoring";
import { SERIES } from "./series";

// Deterministic PRNG so simulation tests are reproducible.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CONFIG = { R1_PTS: 2, R2_PTS: 4, CF_PTS: 6, SCF_PTS: 10, GAMES_BONUS: 1 };

function baseSeriesRows(): SeriesRow[] {
  return SERIES.map((s) => ({
    id: s.id,
    round_code: s.round,
    team1_source: s.team1Source,
    team2_source: s.team2Source,
    team1: null,
    team2: null,
    winner: null,
    games: null
  }));
}

function setRow(rows: SeriesRow[], id: string, patch: Partial<SeriesRow>) {
  const idx = rows.findIndex((r) => r.id === id);
  rows[idx] = { ...rows[idx], ...patch };
}

const alice: PlayerRow = { id: 1, name: "Alice" };
const bob: PlayerRow = { id: 2, name: "Bob" };

describe("resolveSeries", () => {
  it("propagates R1 winner into the R2 slot that sources from it", () => {
    const rows = baseSeriesRows();
    setRow(rows, "E1", {
      team1: "Boston Bruins",
      team2: "Buffalo Sabres",
      winner: "Boston Bruins",
      games: 6
    });
    setRow(rows, "E2", { team1: "Montreal Canadiens", team2: "Tampa Bay Lightning" });

    const resolved = resolveSeries(rows, CONFIG);
    const e5 = resolved.find((r) => r.id === "E5")!;
    expect(e5.resolvedTeam1).toBe("Boston Bruins");
    expect(e5.resolvedTeam2).toBeNull();
  });

  it("attaches the correct points for each round", () => {
    const resolved = resolveSeries(baseSeriesRows(), CONFIG);
    expect(resolved.find((r) => r.id === "E1")!.pointsForRound).toBe(2);
    expect(resolved.find((r) => r.id === "E5")!.pointsForRound).toBe(4);
    expect(resolved.find((r) => r.id === "E7")!.pointsForRound).toBe(6);
    expect(resolved.find((r) => r.id === "SCF")!.pointsForRound).toBe(10);
  });
});

describe("scorePlayers", () => {
  it("awards round points when the winner pick matches", () => {
    const rows = baseSeriesRows();
    setRow(rows, "E1", {
      team1: "Boston Bruins",
      team2: "Buffalo Sabres",
      winner: "Boston Bruins",
      games: 6
    });
    const picks: PickRow[] = [
      { player_id: alice.id, series_id: "E1", winner: "Boston Bruins", games: 7 }
    ];
    const [scored] = scorePlayers([alice], picks, resolveSeries(rows, CONFIG), CONFIG);
    expect(scored.total).toBe(2);
    expect(scored.correctWinners).toBe(1);
    expect(scored.perSeries.E1).toBe(2);
    expect(scored.perRound.R1).toBe(2);
  });

  it("adds the games bonus only when both winner and games match", () => {
    const rows = baseSeriesRows();
    setRow(rows, "E1", {
      team1: "Boston Bruins",
      team2: "Buffalo Sabres",
      winner: "Boston Bruins",
      games: 6
    });
    const picks: PickRow[] = [
      { player_id: alice.id, series_id: "E1", winner: "Boston Bruins", games: 6 }
    ];
    const [scored] = scorePlayers([alice], picks, resolveSeries(rows, CONFIG), CONFIG);
    expect(scored.total).toBe(3);
    expect(scored.perSeries.E1).toBe(3);
  });

  it("does not award the games bonus when the winner pick is wrong", () => {
    const rows = baseSeriesRows();
    setRow(rows, "E1", {
      team1: "Boston Bruins",
      team2: "Buffalo Sabres",
      winner: "Boston Bruins",
      games: 6
    });
    const picks: PickRow[] = [
      { player_id: alice.id, series_id: "E1", winner: "Buffalo Sabres", games: 6 }
    ];
    const [scored] = scorePlayers([alice], picks, resolveSeries(rows, CONFIG), CONFIG);
    expect(scored.total).toBe(0);
    expect(scored.perSeries.E1).toBe(0);
  });

  it("normalizes case/whitespace when comparing winners", () => {
    const rows = baseSeriesRows();
    setRow(rows, "E1", {
      team1: "Boston Bruins",
      team2: "Buffalo Sabres",
      winner: "boston bruins",
      games: 5
    });
    const picks: PickRow[] = [
      { player_id: alice.id, series_id: "E1", winner: "  BOSTON BRUINS  ", games: 5 }
    ];
    const [scored] = scorePlayers([alice], picks, resolveSeries(rows, CONFIG), CONFIG);
    expect(scored.total).toBe(3);
  });

  it("counts maxRemaining only for series where the picked team is still alive", () => {
    const rows = baseSeriesRows();
    setRow(rows, "E1", {
      team1: "Boston Bruins",
      team2: "Buffalo Sabres",
      winner: "Boston Bruins",
      games: 6
    });
    setRow(rows, "E2", { team1: "Montreal Canadiens", team2: "Tampa Bay Lightning" });
    const picks: PickRow[] = [
      // R1 winner: correct
      { player_id: alice.id, series_id: "E1", winner: "Boston Bruins", games: 6 },
      // R2 pick is Boston (still alive after winning E1) — should count toward maxRemaining
      { player_id: alice.id, series_id: "E5", winner: "Boston Bruins", games: 5 },
      // Alice picked Sabres to advance in E5 — Sabres are eliminated, so E5 max=0 for this pick
      { player_id: bob.id, series_id: "E5", winner: "Buffalo Sabres", games: 7 }
    ];
    const resolved = resolveSeries(rows, CONFIG);
    const scored = scorePlayers([alice, bob], picks, resolved, CONFIG);
    const aliceScore = scored.find((s) => s.player.id === alice.id)!;
    const bobScore = scored.find((s) => s.player.id === bob.id)!;

    // Alice: E1 correct winner + correct games = R1_PTS (2) + bonus (1) = 3.
    expect(aliceScore.total).toBe(3);
    // Bob: picked Sabres in E5, but Sabres are eliminated; E5 should NOT add to max
    const bobE5Contribution = bobScore.maxRemaining;
    // Expect Bob's max to be 5 less than Alice's (the E5 slot is dead for Bob)
    expect(aliceScore.maxRemaining - bobScore.maxRemaining).toBe(5);
    expect(bobE5Contribution).toBeGreaterThan(0); // still has other pending series
  });

  it("gives zero for a player with no picks on completed series", () => {
    const rows = baseSeriesRows();
    setRow(rows, "E1", {
      team1: "Boston Bruins",
      team2: "Buffalo Sabres",
      winner: "Boston Bruins",
      games: 6
    });
    const [scored] = scorePlayers([alice], [], resolveSeries(rows, CONFIG), CONFIG);
    expect(scored.total).toBe(0);
    expect(scored.perSeries.E1).toBe(0);
  });
});

describe("rankPlayers", () => {
  it("sorts by total desc, then correctWinners desc, then name asc", () => {
    const make = (name: string, total: number, correct: number) => ({
      player: { id: 0, name },
      total,
      correctWinners: correct,
      perSeries: {},
      perRound: { R1: 0, R2: 0, CF: 0, SCF: 0 },
      maxRemaining: 0
    });
    const ranked = rankPlayers([
      make("Charlie", 10, 5),
      make("Alice", 10, 6),
      make("Bob", 10, 5),
      make("Dan", 12, 4)
    ]);
    expect(ranked.map((r) => r.player.name)).toEqual(["Dan", "Alice", "Bob", "Charlie"]);
  });
});

describe("simulateWinChances", () => {
  it("returns an empty array when there are no players", () => {
    expect(simulateWinChances([], [], baseSeriesRows(), CONFIG)).toEqual([]);
  });

  it("gives the certain leader 100% when every series is decided", () => {
    // Fully decide the bracket: R1 winners propagate up to the Cup.
    const winners: Record<string, string> = {
      E1: "Boston Bruins",
      E2: "Montreal Canadiens",
      E3: "Ottawa Senators",
      E4: "Philadelphia Flyers",
      W1: "Los Angeles Kings",
      W2: "Minnesota Wild",
      W3: "Utah Mammoth",
      W4: "Anaheim Ducks",
      E5: "Boston Bruins",
      E6: "Ottawa Senators",
      W5: "Los Angeles Kings",
      W6: "Utah Mammoth",
      E7: "Boston Bruins",
      W7: "Los Angeles Kings",
      SCF: "Boston Bruins"
    };
    const rows = baseSeriesRows();
    setRow(rows, "E1", { team1: "Boston Bruins", team2: "Buffalo Sabres" });
    setRow(rows, "E2", { team1: "Montreal Canadiens", team2: "Tampa Bay Lightning" });
    setRow(rows, "E3", { team1: "Ottawa Senators", team2: "Carolina Hurricanes" });
    setRow(rows, "E4", { team1: "Philadelphia Flyers", team2: "Pittsburgh Penguins" });
    setRow(rows, "W1", { team1: "Los Angeles Kings", team2: "Colorado Avalanche" });
    setRow(rows, "W2", { team1: "Minnesota Wild", team2: "Dallas Stars" });
    setRow(rows, "W3", { team1: "Utah Mammoth", team2: "Vegas Golden Knights" });
    setRow(rows, "W4", { team1: "Anaheim Ducks", team2: "Edmonton Oilers" });
    for (const [id, winner] of Object.entries(winners)) {
      setRow(rows, id, { winner, games: 5 });
    }

    // Alice nails every winner; Bob gets none.
    const picks: PickRow[] = [];
    for (const [id, winner] of Object.entries(winners)) {
      picks.push({ player_id: alice.id, series_id: id, winner, games: 5 });
      picks.push({ player_id: bob.id, series_id: id, winner: "Nobody", games: 5 });
    }

    const chances = simulateWinChances([alice, bob], picks, rows, CONFIG, {
      trials: 50
    });
    const byName = Object.fromEntries(
      chances.map((c) => [c.player.name, c.winProbability])
    );
    expect(byName.Alice).toBe(1);
    expect(byName.Bob).toBe(0);
  });

  it("splits roughly 50/50 for a single undecided series", () => {
    const rows = baseSeriesRows();
    setRow(rows, "E1", { team1: "Boston Bruins", team2: "Buffalo Sabres" });
    // The only differing picks are on E1; everything else is left untouched
    // (those series score 0 for both players regardless of the simulation).
    const picks: PickRow[] = [
      { player_id: alice.id, series_id: "E1", winner: "Boston Bruins", games: 5 },
      { player_id: bob.id, series_id: "E1", winner: "Buffalo Sabres", games: 5 }
    ];
    const chances = simulateWinChances([alice, bob], picks, rows, CONFIG, {
      trials: 20000,
      rng: mulberry32(12345)
    });
    const byName = Object.fromEntries(
      chances.map((c) => [c.player.name, c.winProbability])
    );
    expect(byName.Alice).toBeGreaterThan(0.45);
    expect(byName.Alice).toBeLessThan(0.55);
    expect(byName.Alice + byName.Bob).toBeCloseTo(1, 5);
  });

  it("orders results from highest to lowest win probability", () => {
    const rows = baseSeriesRows();
    setRow(rows, "E1", { team1: "Boston Bruins", team2: "Buffalo Sabres" });
    // Alice already banked a correct, completed series; Bob has nothing.
    setRow(rows, "E2", {
      team1: "Montreal Canadiens",
      team2: "Tampa Bay Lightning",
      winner: "Montreal Canadiens",
      games: 5
    });
    const picks: PickRow[] = [
      { player_id: alice.id, series_id: "E2", winner: "Montreal Canadiens", games: 5 },
      { player_id: alice.id, series_id: "E1", winner: "Boston Bruins", games: 5 },
      { player_id: bob.id, series_id: "E1", winner: "Buffalo Sabres", games: 5 }
    ];
    const chances = simulateWinChances([alice, bob], picks, rows, CONFIG, {
      trials: 5000,
      rng: mulberry32(7)
    });
    expect(chances[0].player.name).toBe("Alice");
    expect(chances[0].winProbability).toBeGreaterThanOrEqual(
      chances[1].winProbability
    );
    const sum = chances.reduce((acc, c) => acc + c.winProbability, 0);
    expect(sum).toBeCloseTo(1, 5);
  });
});

describe("formatWinChance", () => {
  it("renders an em dash for zero and a normal percent otherwise", () => {
    expect(formatWinChance(0)).toBe("—");
    expect(formatWinChance(0.5)).toBe("50.0%");
    expect(formatWinChance(0.123)).toBe("12.3%");
  });

  it("clamps tiny and near-certain probabilities to readable bounds", () => {
    expect(formatWinChance(0.0005)).toBe("<0.1%");
    expect(formatWinChance(0.9995)).toBe(">99.9%");
    expect(formatWinChance(1)).toBe(">99.9%");
  });
});

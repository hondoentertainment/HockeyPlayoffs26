import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  Player,
  SeriesId,
  SeriesResult,
} from "./bracket";
import { leaderboard, scorePlayer, scoreSeries } from "./scoring";

const player = (id: string, name: string, picks: Player["picks"]): Player => ({
  id,
  name,
  picks,
});

describe("scoreSeries", () => {
  it("awards 0 when actual winner is unknown", () => {
    expect(scoreSeries("BOS", 6, undefined, 2, 1).points).toBe(0);
    expect(scoreSeries("BOS", 6, { winner: undefined }, 2, 1).points).toBe(0);
  });

  it("awards 0 when player has no pick", () => {
    expect(scoreSeries(undefined, 6, { winner: "BOS", games: 6 }, 2, 1).points).toBe(0);
  });

  it("awards round points for correct winner only", () => {
    const s = scoreSeries("BOS", 5, { winner: "BOS", games: 6 }, 2, 1);
    expect(s).toEqual({ points: 2, winnerCorrect: true, gamesCorrect: false });
  });

  it("awards round points + bonus for correct winner and games", () => {
    const s = scoreSeries("BOS", 6, { winner: "BOS", games: 6 }, 2, 1);
    expect(s).toEqual({ points: 3, winnerCorrect: true, gamesCorrect: true });
  });

  it("awards 0 for wrong winner regardless of games", () => {
    const s = scoreSeries("TOR", 6, { winner: "BOS", games: 6 }, 2, 1);
    expect(s).toEqual({ points: 0, winnerCorrect: false, gamesCorrect: false });
  });
});

describe("scorePlayer", () => {
  it("sums per-series points using the configured round values", () => {
    const results: Partial<Record<SeriesId, SeriesResult>> = {
      E1: { team1: "BOS", team2: "TOR", winner: "BOS", games: 6 },
      W1: { team1: "EDM", team2: "LAK", winner: "EDM", games: 5 },
      SCF: { winner: "BOS", games: 7 },
    };
    const p = player("p1", "Alice", {
      E1: { winner: "BOS", games: 6 }, // R1 correct + bonus → 2 + 1 = 3
      W1: { winner: "LAK", games: 5 }, // wrong winner → 0
      SCF: { winner: "BOS", games: 6 }, // SCF winner only → 10
    });
    const { total, perSeries } = scorePlayer(p, results, DEFAULT_CONFIG);
    expect(perSeries.E1.points).toBe(3);
    expect(perSeries.W1.points).toBe(0);
    expect(perSeries.SCF.points).toBe(10);
    expect(total).toBe(13);
  });
});

describe("leaderboard", () => {
  it("ranks players by total descending and breaks ties by name", () => {
    const results: Partial<Record<SeriesId, SeriesResult>> = {
      E1: { winner: "BOS", games: 6 },
    };
    const players = [
      player("a", "Charlie", { E1: { winner: "BOS", games: 6 } }), // 3
      player("b", "Alice", { E1: { winner: "BOS", games: 6 } }), // 3 (tie → first by name)
      player("c", "Bob", { E1: { winner: "TOR" } }), // 0
    ];
    const board = leaderboard(players, results, DEFAULT_CONFIG);
    expect(board.map((e) => [e.rank, e.player.name, e.total])).toEqual([
      [1, "Alice", 3],
      [2, "Charlie", 3],
      [3, "Bob", 0],
    ]);
  });
});

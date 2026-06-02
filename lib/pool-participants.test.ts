import { describe, expect, it } from "vitest";
import { getPoolPicks, getPoolPlayers, POOL_PARTICIPANT_COUNT } from "./pool-participants";
import { getAllSeries, getConfig } from "./db";
import { resolveSeries, scorePlayers } from "./scoring";

describe("pool participants import", () => {
  it("loads 27 players from Excel import", () => {
    expect(POOL_PARTICIPANT_COUNT).toBe(27);
    expect(getPoolPlayers()).toHaveLength(27);
  });

  it("maps each player to 15 series picks", () => {
    const picks = getPoolPicks();
    expect(picks.length).toBe(27 * 15);
    expect(picks.every((p) => p.winner.length > 0)).toBe(true);
  });

  it("scores imported picks against official results", async () => {
    const [series, config] = await Promise.all([getAllSeries(), getConfig()]);
    const players = getPoolPlayers();
    const picks = getPoolPicks();
    const resolved = resolveSeries(series, config);
    const scores = scorePlayers(players, picks, resolved, config);
    const top = scores.sort((a, b) => b.total - a.total)[0];
    expect(top.player.name).toBeTruthy();
    expect(top.total).toBeGreaterThan(0);
  });
});

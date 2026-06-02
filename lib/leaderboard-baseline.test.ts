import { describe, expect, it } from "vitest";
import baseline from "./leaderboard-baseline.json";
import { getAllSeries, getConfig } from "./db";
import {
  PLAYOFF_RESULTS,
  ROUND1_MATCHUPS,
  seriesFromPlayoffJson
} from "./playoff-state";
import { getPoolPicks, getPoolPlayers } from "./pool-participants";
import { resolveSeries, scorePlayers } from "./scoring";
import { SERIES } from "./series";
import { norm, TEAMS } from "./teams";

type BaselineRow = (typeof baseline)[number];

describe("playoff results integrity", () => {
  it("has 14 completed series and SCF still open", () => {
    expect(Object.keys(PLAYOFF_RESULTS)).toHaveLength(14);
    expect(PLAYOFF_RESULTS).not.toHaveProperty("SCF");
  });

  it("uses valid round 1 matchups from the 2026 bracket", () => {
    expect(Object.keys(ROUND1_MATCHUPS)).toHaveLength(8);
    for (const [id, teams] of Object.entries(ROUND1_MATCHUPS)) {
      expect(SERIES.some((s) => s.id === id)).toBe(true);
      for (const team of teams) {
        expect(TEAMS).toContain(team);
      }
    }
  });

  it("propagates winners through the bracket without gaps", async () => {
    const config = await getConfig();
    const resolved = resolveSeries(seriesFromPlayoffJson(), config);
    const scf = resolved.find((s) => s.id === "SCF")!;
    expect(scf.resolvedTeam1).toBe("Carolina Hurricanes");
    expect(scf.resolvedTeam2).toBe("Vegas Golden Knights");
    expect(scf.winner).toBeNull();
    expect(resolved.filter((s) => s.winner).length).toBe(14);
  });

  it("only awards winners that were in each series", () => {
    const byId = new Map(seriesFromPlayoffJson().map((s) => [s.id, s]));
    for (const [id, result] of Object.entries(PLAYOFF_RESULTS)) {
      const row = byId.get(id)!;
      const resolved = resolveSeries(seriesFromPlayoffJson(), {
        R1_PTS: 1,
        R2_PTS: 2,
        CF_PTS: 4,
        SCF_PTS: 8,
        GAMES_BONUS: 1
      }).find((s) => s.id === id)!;
      const t1 = norm(resolved.resolvedTeam1);
      const t2 = norm(resolved.resolvedTeam2);
      const w = norm(result.winner);
      expect(w === t1 || w === t2).toBe(true);
      expect(result.games).toBeGreaterThanOrEqual(4);
      expect(result.games).toBeLessThanOrEqual(7);
    }
  });
});

describe("leaderboard baseline (27 Excel players)", () => {
  async function scoreAll() {
    const [series, config] = await Promise.all([getAllSeries(), getConfig()]);
    return scorePlayers(
      getPoolPlayers(),
      getPoolPicks(),
      resolveSeries(series, config),
      config
    );
  }

  it("matches the golden snapshot for every player", async () => {
    const scores = await scoreAll();
    const byName = new Map(scores.map((s) => [s.player.name, s]));
    expect(byName.size).toBe(27);

    for (const expected of baseline as BaselineRow[]) {
      const actual = byName.get(expected.name);
      expect(actual, `missing player ${expected.name}`).toBeDefined();
      expect(actual!.total).toBe(expected.total);
      expect(actual!.correctWinners).toBe(expected.correctWinners);
      expect(actual!.total + actual!.maxRemaining).toBe(expected.maxPossible);
      expect(actual!.perRound).toEqual(expected.perRound);
    }
  });

  it("ranks Jay first by total points", async () => {
    const scores = await scoreAll();
    const ranked = [...scores].sort((a, b) => b.total - a.total);
    expect(ranked[0]!.player.name).toBe("Jay");
    expect(ranked[0]!.total).toBe(18);
  });

  it("awards no SCF points while the Final is undecided", async () => {
    const scores = await scoreAll();
    expect(scores.every((s) => s.perRound.SCF === 0)).toBe(true);
  });
});

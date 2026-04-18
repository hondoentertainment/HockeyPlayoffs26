"use client";

import { Tabs } from "./components/Tabs";
import { BracketTab } from "./components/BracketTab";
import { PicksTab } from "./components/PicksTab";
import { ScoresTab } from "./components/ScoresTab";
import { LeaderboardTab } from "./components/LeaderboardTab";
import { ConfigTab } from "./components/ConfigTab";
import { useApp } from "@/lib/state";

export default function Page() {
  const { ready } = useApp();
  if (!ready) {
    return (
      <p className="text-sm text-gray-500">Loading saved bracket…</p>
    );
  }
  return (
    <Tabs
      tabs={[
        { id: "bracket", label: "Bracket", content: <BracketTab /> },
        { id: "picks", label: "Picks", content: <PicksTab /> },
        { id: "scores", label: "Scores", content: <ScoresTab /> },
        { id: "leaderboard", label: "Leaderboard", content: <LeaderboardTab /> },
        { id: "config", label: "Config", content: <ConfigTab /> },
      ]}
    />
  );
}

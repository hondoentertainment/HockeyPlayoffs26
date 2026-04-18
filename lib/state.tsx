"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  DEFAULT_CONFIG,
  Player,
  ScoringConfig,
  SeriesId,
  SeriesResult,
} from "./bracket";

const STORAGE_KEY = "hockey-playoffs-26:v1";

export interface AppState {
  results: Partial<Record<SeriesId, SeriesResult>>;
  players: Player[];
  config: ScoringConfig;
}

const INITIAL: AppState = {
  results: {},
  players: [],
  config: DEFAULT_CONFIG,
};

interface AppCtx {
  state: AppState;
  ready: boolean;
  setResult: (sid: SeriesId, patch: Partial<SeriesResult>) => void;
  addPlayer: (name: string) => void;
  renamePlayer: (id: string, name: string) => void;
  removePlayer: (id: string) => void;
  setPick: (
    playerId: string,
    sid: SeriesId,
    patch: { winner?: string; games?: number },
  ) => void;
  setConfig: (patch: Partial<ScoringConfig>) => void;
  resetAll: () => void;
}

const Ctx = createContext<AppCtx | null>(null);

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

export function StateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(INITIAL);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppState>;
        setState({
          results: parsed.results ?? {},
          players: parsed.players ?? [],
          config: { ...DEFAULT_CONFIG, ...(parsed.config ?? {}) },
        });
      }
    } catch {
      // ignore corrupt storage
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, ready]);

  const setResult = useCallback((sid: SeriesId, patch: Partial<SeriesResult>) => {
    setState((s) => ({
      ...s,
      results: { ...s.results, [sid]: { ...(s.results[sid] ?? {}), ...patch } },
    }));
  }, []);

  const addPlayer = useCallback((name: string) => {
    setState((s) => ({
      ...s,
      players: [...s.players, { id: makeId(), name, picks: {} }],
    }));
  }, []);

  const renamePlayer = useCallback((id: string, name: string) => {
    setState((s) => ({
      ...s,
      players: s.players.map((p) => (p.id === id ? { ...p, name } : p)),
    }));
  }, []);

  const removePlayer = useCallback((id: string) => {
    setState((s) => ({ ...s, players: s.players.filter((p) => p.id !== id) }));
  }, []);

  const setPick = useCallback(
    (
      playerId: string,
      sid: SeriesId,
      patch: { winner?: string; games?: number },
    ) => {
      setState((s) => ({
        ...s,
        players: s.players.map((p) => {
          if (p.id !== playerId) return p;
          const prev = p.picks[sid] ?? {};
          return { ...p, picks: { ...p.picks, [sid]: { ...prev, ...patch } } };
        }),
      }));
    },
    [],
  );

  const setConfig = useCallback((patch: Partial<ScoringConfig>) => {
    setState((s) => ({ ...s, config: { ...s.config, ...patch } }));
  }, []);

  const resetAll = useCallback(() => setState(INITIAL), []);

  return (
    <Ctx.Provider
      value={{
        state,
        ready,
        setResult,
        addPlayer,
        renamePlayer,
        removePlayer,
        setPick,
        setConfig,
        resetAll,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useApp(): AppCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside <StateProvider>");
  return v;
}

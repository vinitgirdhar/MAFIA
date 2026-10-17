import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { PHASES, type Action, type GameState, initialState, reducer } from './game/engine';
import { audio } from './audio';

const GAME_KEY = 'mafia.game.v1';
const PREFS_KEY = 'mafia.prefs.v1';

export interface Prefs {
  sfx: boolean;
  voice: boolean;
  discussionMin: 0 | 2 | 3 | 5; // 0 = unlimited
  countdown: boolean;
  tourSeen: boolean;
}
const defaultPrefs: Prefs = { sfx: true, voice: false, discussionMin: 3, countdown: true, tourSeen: false };

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / quota: the game still runs, it just can't survive a refresh */
  }
}

function loadGame(): GameState {
  const saved = read<GameState>(GAME_KEY);
  const ok = saved && saved.v === 1 && PHASES.includes(saved.phase) && Array.isArray(saved.players) && Array.isArray(saved.checkpoints);
  return ok ? { ...initialState, ...saved } : initialState;
}

// Persist inside the reducer wrapper so every accepted action hits storage before the next event.
function persistingReducer(s: GameState, a: Action): GameState {
  const next = reducer(s, a);
  if (next !== s) write(GAME_KEY, next);
  return next;
}

interface Ctx {
  state: GameState;
  dispatch: (a: Action) => void;
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
  timerMs: number | null;
}
export const GameCtx = createContext<Ctx>(null as never);
export const useGame = () => useContext(GameCtx);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(persistingReducer, undefined, loadGame);
  const [prefs, setPrefsState] = useState<Prefs>(() => ({ ...defaultPrefs, ...read<Partial<Prefs>>(PREFS_KEY) }));

  useEffect(() => {
    audio.sfx = prefs.sfx;
    audio.voice = prefs.voice;
    write(PREFS_KEY, prefs);
  }, [prefs]);

  const setPrefs = useCallback((p: Partial<Prefs>) => setPrefsState((old) => ({ ...old, ...p })), []);
  const timerMs = prefs.discussionMin === 0 ? null : prefs.discussionMin * 60_000;
  const value = useMemo(() => ({ state, dispatch, prefs, setPrefs, timerMs }), [state, prefs, setPrefs, timerMs]);
  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

/** Collision-safe id that also works on plain-http LAN URLs (no crypto.randomUUID there). */
export function uid() {
  const b = new Uint8Array(6);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

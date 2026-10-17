// Deterministic game state machine. Pure: no clock, no randomness, no I/O.
// Anything non-deterministic (shuffle, "now", timer length) arrives inside the action.
// An action the rules reject returns the SAME state object, so `next === state` means "refused".

export type Role = 'MAFIA' | 'DOCTOR' | 'POLICE' | 'CITIZEN';
export type Team = 'CITY' | 'MAFIA';

export const PHASES = [
  'HOME',
  'MAYOR_SETUP',
  'PLAYER_REGISTRATION',
  'ROLE_ASSIGNMENT',
  'PRIVATE_ROLE_REVEAL',
  'MAYOR_HANDOFF',
  'NIGHT_START',
  'MAFIA_ACTION',
  'DOCTOR_ACTION',
  'POLICE_ACTION',
  'MORNING_ANNOUNCEMENT',
  'DISCUSSION',
  'VOTING',
  'VOTING_RESULTS',
  'RUNOFF_VOTING',
  'ELIMINATION',
  // VICTORY_CHECK is part of the machine but never rests: it is resolved inside the reducer
  // (see `afterDay` / MORNING_NEXT) so a refresh can never land on it.
  'VICTORY_CHECK',
  'GAME_OVER',
] as const;
export type Phase = (typeof PHASES)[number];

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 20;
export const MAX_NAME = 18;

export interface Player {
  id: string;
  name: string;
  role: Role | null;
  alive: boolean;
  roleViewed: boolean;
  eliminatedRound: number | null;
}

export type NightActor = 'mafia' | 'doctor' | 'police';
export interface NightPicks {
  mafia: string | null;
  doctor: string | null;
  police: string | null;
  policeIsMafia: boolean | null;
}
export interface NightRecord {
  round: number;
  mafiaTarget: string | null;
  doctorTarget: string | null;
  policeTarget: string | null;
  policeIsMafia: boolean | null;
  victimId: string | null;
  saved: boolean;
}

export interface VoteSession {
  stage: 'main' | 'runoff';
  voters: string[];
  candidates: string[];
  ballots: Record<string, string>;
}
export interface VoteResult {
  round: number;
  stage: 'main' | 'runoff';
  tally: Record<string, number>;
  leaders: string[];
  eliminatedId: string | null;
}

export interface LogEntry {
  round: number;
  kind: 'night_kill' | 'night_safe' | 'vote_out' | 'tie' | 'no_elim';
  playerId?: string;
  text: string;
  secret?: string;
}

export interface Timer {
  durationMs: number | null; // null = unlimited
  remainingMs: number;
  startedAt: number | null;
}

export interface GameState {
  v: 1;
  phase: Phase;
  onHome: boolean;
  mayorName: string;
  passcode: string | null;
  players: Player[];
  round: number; // Night N and Day N share the number N
  night: NightPicks;
  nightStep: 'wake' | 'sleep';
  nights: NightRecord[];
  vote: VoteSession | null;
  lastResult: VoteResult | null;
  log: LogEntry[];
  winner: Team | null;
  endedEarly: boolean;
  revealId: string | null;
  locked: boolean; // phone is "with the table": Mayor must unlock before secret screens
  paused: boolean;
  timer: Timer;
  checkpoints: Checkpoint[];
}
export type Snapshot = Omit<GameState, 'checkpoints'>;
export interface Checkpoint {
  id: string;
  label: string;
  snapshot: Snapshot;
}

export type Action =
  | { type: 'HARD_RESET' }
  | { type: 'NEW_GAME' }
  | { type: 'GO_HOME' }
  | { type: 'RESUME' }
  | { type: 'SET_MAYOR'; name: string; passcode: string | null }
  | { type: 'ADD_PLAYER'; id: string; name: string }
  | { type: 'RENAME_PLAYER'; id: string; name: string }
  | { type: 'REMOVE_PLAYER'; id: string }
  | { type: 'CLEAR_PLAYERS' }
  | { type: 'ASSIGN_ROLES'; roles: Record<string, Role> }
  | { type: 'PICK_REVEAL'; id: string }
  | { type: 'CLOSE_REVEAL' }
  | { type: 'FINISH_REVEAL' }
  | { type: 'TO_MAYOR' }
  | { type: 'UNLOCK' }
  | { type: 'START_FIRST_NIGHT' }
  | { type: 'OPEN_NIGHT' }
  | { type: 'PICK_TARGET'; who: NightActor; id: string }
  | { type: 'NIGHT_NEXT' }
  | { type: 'NIGHT_BACK' }
  | { type: 'MORNING_NEXT'; timerMs: number | null }
  | { type: 'TIMER_SET'; durationMs: number | null }
  | { type: 'TIMER_START'; now: number }
  | { type: 'TIMER_PAUSE'; now: number }
  | { type: 'TIMER_SKIP' }
  | { type: 'BACK_TO_MORNING' }
  | { type: 'GO_VOTE' }
  | { type: 'BACK_TO_DISCUSSION' }
  | { type: 'CAST_VOTE'; voter: string; candidate: string }
  | { type: 'VOID_VOTE'; voter: string }
  | { type: 'RESET_VOTE' }
  | { type: 'CLOSE_VOTE' }
  | { type: 'RESULTS_NEXT' }
  | { type: 'ELIMINATION_NEXT' }
  | { type: 'REWIND'; id: string }
  | { type: 'SET_PAUSED'; paused: boolean; now: number }
  | { type: 'END_GAME' };

// ───────────────────────────── helpers ─────────────────────────────

export const NO_PICKS: NightPicks = { mafia: null, doctor: null, police: null, policeIsMafia: null };
const NO_TIMER: Timer = { durationMs: null, remainingMs: 0, startedAt: null };

export const initialState: GameState = {
  v: 1,
  phase: 'HOME',
  onHome: true,
  mayorName: '',
  passcode: null,
  players: [],
  round: 0,
  night: NO_PICKS,
  nightStep: 'wake',
  nights: [],
  vote: null,
  lastResult: null,
  log: [],
  winner: null,
  endedEarly: false,
  revealId: null,
  locked: false,
  paused: false,
  timer: NO_TIMER,
  checkpoints: [],
};

export const ROLE_OF_ACTOR: Record<NightActor, Role> = { mafia: 'MAFIA', doctor: 'DOCTOR', police: 'POLICE' };
export const PHASE_OF_ACTOR: Record<NightActor, Phase> = { mafia: 'MAFIA_ACTION', doctor: 'DOCTOR_ACTION', police: 'POLICE_ACTION' };
export const ACTOR_OF_PHASE: Partial<Record<Phase, NightActor>> = {
  MAFIA_ACTION: 'mafia',
  DOCTOR_ACTION: 'doctor',
  POLICE_ACTION: 'police',
};

export const living = (s: { players: Player[] }) => s.players.filter((p) => p.alive);
export const byId = (s: { players: Player[] }, id: string | null | undefined) => s.players.find((p) => p.id === id);
export const withRole = (s: { players: Player[] }, role: Role) => s.players.find((p) => p.role === role);
export const livingWithRole = (s: { players: Player[] }, role: Role) => s.players.find((p) => p.role === role && p.alive);
export const actorAlive = (s: GameState, who: NightActor) => !!livingWithRole(s, ROLE_OF_ACTOR[who]);

/** Role split for N players: always one Mafia, one Doctor, one Police, the rest Citizens. */
export const composition = (n: number) => ({ mafia: 1, doctor: 1, police: 1, citizens: Math.max(0, n - 3) });

export function checkWinner(s: { players: Player[] }): Team | null {
  const alive = living(s);
  const mafia = alive.filter((p) => p.role === 'MAFIA').length;
  if (mafia === 0) return 'CITY';
  if (alive.length - mafia <= mafia) return 'MAFIA';
  return null;
}

export function normalizeName(raw: string) {
  return raw.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
}
export function nameTaken(players: Player[], name: string, exceptId?: string) {
  const key = name.toLocaleLowerCase();
  return players.some((p) => p.id !== exceptId && p.name.toLocaleLowerCase() === key);
}

export function timerRemaining(t: Timer, now: number) {
  return t.startedAt === null ? t.remainingMs : Math.max(0, t.remainingMs - (now - t.startedAt));
}

export function voteProgress(v: VoteSession | null) {
  if (!v) return { done: 0, total: 0, complete: false };
  const done = v.voters.filter((id) => v.ballots[id]).length;
  return { done, total: v.voters.length, complete: done === v.voters.length };
}

export const roundLabel = (s: GameState) => {
  if (s.round === 0) return 'Setup';
  const night = ['NIGHT_START', 'MAFIA_ACTION', 'DOCTOR_ACTION', 'POLICE_ACTION'].includes(s.phase);
  return `${night ? 'Night' : 'Day'} ${s.round}`;
};

export const PHASE_LABEL: Record<Phase, string> = {
  HOME: 'Home',
  MAYOR_SETUP: 'Mayor setup',
  PLAYER_REGISTRATION: 'Registering players',
  ROLE_ASSIGNMENT: 'Handing out identities',
  PRIVATE_ROLE_REVEAL: 'A player is viewing their role',
  MAYOR_HANDOFF: 'Handing phone to Mayor',
  NIGHT_START: 'Night falls',
  MAFIA_ACTION: 'Mafia is choosing',
  DOCTOR_ACTION: 'Doctor is choosing',
  POLICE_ACTION: 'Police is investigating',
  MORNING_ANNOUNCEMENT: 'Morning announcement',
  DISCUSSION: 'Discussion',
  VOTING: 'Voting',
  VOTING_RESULTS: 'Vote results',
  RUNOFF_VOTING: 'Runoff vote',
  ELIMINATION: 'Elimination',
  VICTORY_CHECK: 'Victory check',
  GAME_OVER: 'Game over',
};

/** Roles assigned and game not yet finished. */
export const gameInProgress = (s: GameState) => !['HOME', 'MAYOR_SETUP', 'PLAYER_REGISTRATION', 'GAME_OVER'].includes(s.phase);

function snapshot(s: GameState): Snapshot {
  const { checkpoints: _drop, ...rest } = s;
  void _drop;
  return rest;
}

function withCheckpoint(s: GameState, id: string, label: string): GameState {
  const kept = s.checkpoints.filter((c) => c.id !== id);
  return { ...s, checkpoints: [...kept, { id, label, snapshot: snapshot({ ...s, checkpoints: [] }) }] };
}

const nameOf = (s: { players: Player[] }, id: string | null | undefined) => byId(s, id)?.name ?? 'Someone';

function kill(players: Player[], id: string, round: number): Player[] {
  return players.map((p) => (p.id === id ? { ...p, alive: false, eliminatedRound: round } : p));
}

function gameOver(s: GameState, winner: Team | null, endedEarly = false): GameState {
  return { ...s, phase: 'GAME_OVER', winner, endedEarly, locked: false, paused: false, vote: null, revealId: null };
}

function startNight(s: GameState, locked: boolean): GameState {
  if (checkWinner(s)) return s; // never start a round after a winner exists
  const round = s.round + 1;
  const next: GameState = {
    ...s,
    phase: 'NIGHT_START',
    round,
    locked,
    night: NO_PICKS,
    nightStep: 'wake',
    vote: null,
    lastResult: null,
    timer: NO_TIMER,
    revealId: null,
  };
  return withCheckpoint(next, `night-${round}`, `Night ${round}`);
}

/** Victory check after a day ends (elimination applied, or nobody eliminated). */
function afterDay(s: GameState): GameState {
  const winner = checkWinner(s);
  return winner ? gameOver(s, winner) : startNight(s, true);
}

function resolveNight(s: GameState): GameState {
  const mafiaTarget = actorAlive(s, 'mafia') ? s.night.mafia : null;
  const doctorTarget = actorAlive(s, 'doctor') ? s.night.doctor : null;
  const policeTarget = actorAlive(s, 'police') ? s.night.police : null;
  const policeIsMafia = policeTarget ? s.night.policeIsMafia : null;
  const saved = mafiaTarget !== null && doctorTarget === mafiaTarget;
  const victimId = mafiaTarget && !saved ? mafiaTarget : null;
  const record: NightRecord = { round: s.round, mafiaTarget, doctorTarget, policeTarget, policeIsMafia, victimId, saved };
  const secret = [
    `Mafia targeted ${nameOf(s, mafiaTarget)}`,
    doctorTarget ? `Doctor protected ${nameOf(s, doctorTarget)}${saved ? ' (saved a life)' : ''}` : 'Doctor was out of the game',
    policeTarget ? `Police checked ${nameOf(s, policeTarget)}: ${policeIsMafia ? 'MAFIA' : 'not the Mafia'}` : 'Police was out of the game',
  ].join(' · ');
  const entry: LogEntry = victimId
    ? { round: s.round, kind: 'night_kill', playerId: victimId, text: `${nameOf(s, victimId)} was killed in the night`, secret }
    : { round: s.round, kind: 'night_safe', text: 'No one died in the night', secret };
  return {
    ...s,
    phase: 'MORNING_ANNOUNCEMENT',
    players: victimId ? kill(s.players, victimId, s.round) : s.players,
    nights: [...s.nights, record],
    log: [...s.log, entry],
    night: NO_PICKS,
    nightStep: 'wake',
    locked: false,
  };
}

function closeVote(s: GameState): GameState {
  const v = s.vote;
  if (!v || !voteProgress(v).complete) return s;
  const tally: Record<string, number> = Object.fromEntries(v.candidates.map((id) => [id, 0]));
  for (const c of Object.values(v.ballots)) tally[c] = (tally[c] ?? 0) + 1;
  const top = Math.max(...Object.values(tally));
  const leaders = v.candidates.filter((id) => tally[id] === top);
  const eliminatedId = leaders.length === 1 ? leaders[0] : null;
  const result: VoteResult = { round: s.round, stage: v.stage, tally, leaders, eliminatedId };
  const counts = v.candidates
    .filter((id) => tally[id] > 0)
    .sort((a, b) => tally[b] - tally[a])
    .map((id) => tally[id])
    .join('–');
  let log: LogEntry;
  if (eliminatedId)
    log = { round: s.round, kind: 'vote_out', playerId: eliminatedId, text: `${nameOf(s, eliminatedId)} was voted out (${counts})` };
  else if (v.stage === 'main')
    log = { round: s.round, kind: 'tie', text: `The vote tied: ${leaders.map((id) => nameOf(s, id)).join(' & ')} (${counts})` };
  else log = { round: s.round, kind: 'no_elim', text: `The runoff tied again — nobody was eliminated` };
  return {
    ...s,
    phase: 'VOTING_RESULTS',
    players: eliminatedId ? kill(s.players, eliminatedId, s.round) : s.players,
    lastResult: result,
    log: [...s.log, log],
  };
}

// ───────────────────────────── reducer ─────────────────────────────

export function reducer(s: GameState, a: Action): GameState {
  // Once a game is over only "leave" actions work: no round can ever start after a winner.
  if (s.phase === 'GAME_OVER' && !['HARD_RESET', 'NEW_GAME', 'GO_HOME', 'RESUME', 'CLEAR_PLAYERS', 'ASSIGN_ROLES'].includes(a.type))
    return s;

  switch (a.type) {
    case 'HARD_RESET':
      return { ...initialState, mayorName: s.mayorName, passcode: s.passcode };

    case 'NEW_GAME': {
      // Roles already dealt = a real game: wipe it. Otherwise keep names typed so far.
      const fresh = gameInProgress(s) || s.phase === 'GAME_OVER';
      return {
        ...initialState,
        mayorName: s.mayorName,
        passcode: s.passcode,
        players: fresh ? [] : s.players,
        phase: 'MAYOR_SETUP',
        onHome: false,
      };
    }

    case 'GO_HOME':
      return s.onHome ? s : { ...s, onHome: true };
    case 'RESUME':
      return s.onHome ? { ...s, onHome: false } : s;

    case 'SET_MAYOR': {
      if (s.phase !== 'MAYOR_SETUP') return s;
      const passcode = a.passcode && /^\d{4}$/.test(a.passcode) ? a.passcode : null;
      return { ...s, mayorName: normalizeName(a.name) || 'Mayor', passcode, phase: 'PLAYER_REGISTRATION' };
    }

    case 'ADD_PLAYER': {
      if (s.phase !== 'PLAYER_REGISTRATION' || s.players.length >= MAX_PLAYERS) return s;
      const name = normalizeName(a.name);
      if (!name || nameTaken(s.players, name)) return s;
      const player: Player = { id: a.id, name, role: null, alive: true, roleViewed: false, eliminatedRound: null };
      return { ...s, players: [...s.players, player] };
    }
    case 'RENAME_PLAYER': {
      if (s.phase !== 'PLAYER_REGISTRATION') return s;
      const name = normalizeName(a.name);
      if (!name || nameTaken(s.players, name, a.id)) return s;
      return { ...s, players: s.players.map((p) => (p.id === a.id ? { ...p, name } : p)) };
    }
    case 'REMOVE_PLAYER':
      if (s.phase !== 'PLAYER_REGISTRATION') return s;
      return { ...s, players: s.players.filter((p) => p.id !== a.id) };
    case 'CLEAR_PLAYERS':
      return { ...initialState, mayorName: s.mayorName, passcode: s.passcode, phase: 'PLAYER_REGISTRATION', onHome: false };

    case 'ASSIGN_ROLES': {
      // Also serves "Play again" and "Restart": fresh roles, fresh game, same people.
      const n = s.players.length;
      if (s.phase === 'HOME' || s.phase === 'MAYOR_SETUP' || n < MIN_PLAYERS || n > MAX_PLAYERS) return s;
      const values = s.players.map((p) => a.roles[p.id]);
      const count = (r: Role) => values.filter((v) => v === r).length;
      if (count('MAFIA') !== 1 || count('DOCTOR') !== 1 || count('POLICE') !== 1 || values.some((v) => !v)) return s;
      return {
        ...initialState,
        mayorName: s.mayorName,
        passcode: s.passcode,
        onHome: false,
        phase: 'ROLE_ASSIGNMENT',
        players: s.players.map((p) => ({ ...p, role: a.roles[p.id], alive: true, roleViewed: false, eliminatedRound: null })),
      };
    }

    case 'PICK_REVEAL': {
      const p = byId(s, a.id);
      if (s.phase !== 'ROLE_ASSIGNMENT' || !p || p.roleViewed) return s;
      return { ...s, phase: 'PRIVATE_ROLE_REVEAL', revealId: p.id };
    }
    case 'CLOSE_REVEAL':
      return s.phase === 'PRIVATE_ROLE_REVEAL' ? { ...s, phase: 'ROLE_ASSIGNMENT', revealId: null } : s;
    case 'FINISH_REVEAL': {
      // Marks the role as seen (called when the player taps "Hide My Role"); the screen stays on
      // PRIVATE_ROLE_REVEAL showing the neutral "identity secured" page until CLOSE_REVEAL.
      const p = byId(s, s.revealId);
      if (s.phase !== 'PRIVATE_ROLE_REVEAL' || !p || p.roleViewed) return s;
      return { ...s, players: s.players.map((x) => (x.id === p.id ? { ...x, roleViewed: true } : x)) };
    }
    case 'TO_MAYOR':
      if (s.phase !== 'ROLE_ASSIGNMENT' || !s.players.every((p) => p.roleViewed)) return s;
      return { ...s, phase: 'MAYOR_HANDOFF', locked: true };

    case 'UNLOCK':
      return s.locked ? { ...s, locked: false } : s;

    case 'START_FIRST_NIGHT':
      return s.phase === 'MAYOR_HANDOFF' ? startNight(s, false) : s;
    case 'OPEN_NIGHT':
      return s.phase === 'NIGHT_START' ? { ...s, phase: 'MAFIA_ACTION', nightStep: 'wake' } : s;

    case 'PICK_TARGET': {
      if (s.phase !== PHASE_OF_ACTOR[a.who] || s.nightStep !== 'wake') return s;
      const target = byId(s, a.id);
      if (!target?.alive || !actorAlive(s, a.who)) return s; // the dead neither act nor are targeted
      if (a.who === 'mafia' && target.role === 'MAFIA') return s;
      if (a.who === 'police') {
        if (target.role === 'POLICE') return s;
        return { ...s, night: { ...s.night, police: target.id, policeIsMafia: target.role === 'MAFIA' } };
      }
      return { ...s, night: { ...s.night, [a.who]: target.id } };
    }

    case 'NIGHT_NEXT': {
      const who = ACTOR_OF_PHASE[s.phase];
      if (!who) return s;
      if (s.nightStep === 'wake') {
        if (actorAlive(s, who) && s.night[who] === null) return s; // a living actor must choose
        return { ...s, nightStep: 'sleep' };
      }
      if (s.phase === 'MAFIA_ACTION') return { ...s, phase: 'DOCTOR_ACTION', nightStep: 'wake' };
      if (s.phase === 'DOCTOR_ACTION') return { ...s, phase: 'POLICE_ACTION', nightStep: 'wake' };
      return resolveNight(s);
    }
    case 'NIGHT_BACK': {
      if (!ACTOR_OF_PHASE[s.phase]) return s;
      if (s.nightStep === 'sleep') return { ...s, nightStep: 'wake' };
      if (s.phase === 'MAFIA_ACTION') return { ...s, phase: 'NIGHT_START' };
      return { ...s, phase: s.phase === 'DOCTOR_ACTION' ? 'MAFIA_ACTION' : 'DOCTOR_ACTION', nightStep: 'wake' };
    }

    case 'MORNING_NEXT': {
      if (s.phase !== 'MORNING_ANNOUNCEMENT') return s;
      const winner = checkWinner(s);
      if (winner) return gameOver(s, winner);
      const timer: Timer = { durationMs: a.timerMs, remainingMs: a.timerMs ?? 0, startedAt: null };
      return { ...s, phase: 'DISCUSSION', timer };
    }
    case 'BACK_TO_MORNING':
      return s.phase === 'DISCUSSION' ? { ...s, phase: 'MORNING_ANNOUNCEMENT', timer: NO_TIMER } : s;

    case 'TIMER_SET':
      if (s.phase !== 'DISCUSSION' || s.timer.startedAt !== null) return s;
      return { ...s, timer: { durationMs: a.durationMs, remainingMs: a.durationMs ?? 0, startedAt: null } };
    case 'TIMER_START':
      if (s.phase !== 'DISCUSSION' || s.timer.startedAt !== null || s.timer.durationMs === null || s.timer.remainingMs <= 0) return s;
      return { ...s, timer: { ...s.timer, startedAt: a.now } };
    case 'TIMER_PAUSE':
      if (s.timer.startedAt === null) return s;
      return { ...s, timer: { ...s.timer, remainingMs: timerRemaining(s.timer, a.now), startedAt: null } };
    case 'TIMER_SKIP':
      return s.phase === 'DISCUSSION' ? { ...s, timer: { ...s.timer, remainingMs: 0, startedAt: null } } : s;

    case 'GO_VOTE': {
      if (s.phase !== 'DISCUSSION') return s;
      const ids = living(s).map((p) => p.id);
      const next: GameState = {
        ...s,
        phase: 'VOTING',
        locked: false,
        lastResult: null,
        vote: { stage: 'main', voters: ids, candidates: ids, ballots: {} },
        timer: { ...s.timer, startedAt: null },
      };
      return withCheckpoint(next, `vote-${s.round}`, `Day ${s.round} vote`);
    }
    case 'BACK_TO_DISCUSSION':
      if (s.phase !== 'VOTING' || !s.vote || Object.keys(s.vote.ballots).length > 0) return s;
      return { ...s, phase: 'DISCUSSION', vote: null, checkpoints: s.checkpoints.filter((c) => c.id !== `vote-${s.round}`) };

    case 'CAST_VOTE': {
      const v = s.vote;
      if (!v || (s.phase !== 'VOTING' && s.phase !== 'RUNOFF_VOTING')) return s;
      if (!v.voters.includes(a.voter) || !byId(s, a.voter)?.alive || v.ballots[a.voter]) return s; // one living voter, one ballot
      if (!v.candidates.includes(a.candidate) || !byId(s, a.candidate)?.alive || a.candidate === a.voter) return s;
      return { ...s, vote: { ...v, ballots: { ...v.ballots, [a.voter]: a.candidate } } };
    }
    case 'VOID_VOTE': {
      const v = s.vote;
      if (!v || !v.ballots[a.voter] || (s.phase !== 'VOTING' && s.phase !== 'RUNOFF_VOTING')) return s;
      const { [a.voter]: _gone, ...ballots } = v.ballots;
      void _gone;
      return { ...s, vote: { ...v, ballots } };
    }
    case 'RESET_VOTE':
      if (!s.vote || (s.phase !== 'VOTING' && s.phase !== 'RUNOFF_VOTING') || !Object.keys(s.vote.ballots).length) return s;
      return { ...s, vote: { ...s.vote, ballots: {} } };

    case 'CLOSE_VOTE':
      return s.phase === 'VOTING' || s.phase === 'RUNOFF_VOTING' ? closeVote(s) : s;

    case 'RESULTS_NEXT': {
      const r = s.lastResult;
      if (s.phase !== 'VOTING_RESULTS' || !r) return s;
      if (r.eliminatedId) return { ...s, phase: 'ELIMINATION' };
      if (r.stage === 'main') {
        const voters = living(s)
          .map((p) => p.id)
          .filter((id) => !r.leaders.includes(id));
        if (voters.length > 0) {
          return { ...s, phase: 'RUNOFF_VOTING', vote: { stage: 'runoff', voters, candidates: r.leaders, ballots: {} } };
        }
        // Everyone alive is tied: nobody is left to break it. Never pick at random.
        const entry: LogEntry = { round: s.round, kind: 'no_elim', text: 'Nobody was left to break the tie — nobody was eliminated' };
        return afterDay({ ...s, log: [...s.log, entry] });
      }
      return afterDay(s);
    }
    case 'ELIMINATION_NEXT':
      return s.phase === 'ELIMINATION' ? afterDay(s) : s;

    case 'REWIND': {
      const i = s.checkpoints.findIndex((c) => c.id === a.id);
      if (i < 0) return s;
      // Restoring a full snapshot discards every later night, vote and elimination, so the
      // affected phases are necessarily replayed and nothing can be left inconsistent.
      return {
        ...s.checkpoints[i].snapshot,
        checkpoints: s.checkpoints.slice(0, i + 1),
        mayorName: s.mayorName,
        passcode: s.passcode,
        onHome: false,
        locked: false,
        paused: false,
      };
    }

    case 'SET_PAUSED': {
      if (s.paused === a.paused) return s;
      const timer =
        a.paused && s.timer.startedAt !== null ? { ...s.timer, remainingMs: timerRemaining(s.timer, a.now), startedAt: null } : s.timer;
      return { ...s, paused: a.paused, timer };
    }

    case 'END_GAME':
      return gameInProgress(s) ? gameOver(s, null, true) : s;
  }
}

// ───────────────────────────── assignment & dashboard helpers ─────────────────────────────

/** Uniform integer in [0, n) without modulo bias. */
export function randomInt(n: number, rng: () => number = cryptoUnit): number {
  return Math.floor(rng() * n);
}
function cryptoUnit(): number {
  const buf = new Uint32Array(2);
  crypto.getRandomValues(buf);
  return (buf[0] * 2 ** 21 + (buf[1] >>> 11)) / 2 ** 53; // 53 uniform bits
}

/** Fisher–Yates over crypto randomness. */
export function shuffle<T>(items: readonly T[], rng?: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1, rng);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function dealRoles(players: readonly Pick<Player, 'id'>[], rng?: () => number): Record<string, Role> {
  const order = shuffle(
    players.map((p) => p.id),
    rng,
  );
  const roles: Record<string, Role> = {};
  order.forEach((id, i) => (roles[id] = i === 0 ? 'MAFIA' : i === 1 ? 'DOCTOR' : i === 2 ? 'POLICE' : 'CITIZEN'));
  return roles;
}

/** The action behind the current phase's main button, for the Mayor's "Continue" control. */
export function continueAction(s: GameState, timerMs: number | null): Action | null {
  switch (s.phase) {
    case 'MAYOR_HANDOFF':
      return { type: 'START_FIRST_NIGHT' };
    case 'NIGHT_START':
      return { type: 'OPEN_NIGHT' };
    case 'MAFIA_ACTION':
    case 'DOCTOR_ACTION':
    case 'POLICE_ACTION':
      return { type: 'NIGHT_NEXT' };
    case 'MORNING_ANNOUNCEMENT':
      return { type: 'MORNING_NEXT', timerMs };
    case 'DISCUSSION':
      return { type: 'GO_VOTE' };
    case 'VOTING':
    case 'RUNOFF_VOTING':
      return { type: 'CLOSE_VOTE' };
    case 'VOTING_RESULTS':
      return { type: 'RESULTS_NEXT' };
    case 'ELIMINATION':
      return { type: 'ELIMINATION_NEXT' };
    default:
      return null;
  }
}

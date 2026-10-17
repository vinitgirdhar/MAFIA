import { describe, expect, it } from 'vitest';
import {
  type Action,
  type GameState,
  type Role,
  checkWinner,
  composition,
  continueAction,
  dealRoles,
  initialState,
  living,
  livingWithRole,
  reducer,
  shuffle,
  withRole,
} from './engine';

const NAMES = [
  'Aarav',
  'Rohan',
  'Priya',
  'Vinit',
  'Kashish',
  'Aditya',
  'Neha',
  'Zoya',
  'Ishan',
  'Mira',
  'Kabir',
  'Diya',
  'Arjun',
  'Tara',
  'Veer',
  'Anya',
  'Dev',
  'Rhea',
  'Om',
  'Isha',
];

function run(s: GameState, ...actions: Action[]) {
  return actions.reduce((st, a) => reducer(st, a), s);
}

function seeded(seed: number) {
  return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
}

/** A game that has just been dealt, with everyone having seen their role, Mayor holding the phone. */
function newGame(n: number, rng = seeded(7)): GameState {
  let s = run(initialState, { type: 'NEW_GAME' }, { type: 'SET_MAYOR', name: 'Mayor', passcode: null });
  NAMES.slice(0, n).forEach((name, i) => (s = reducer(s, { type: 'ADD_PLAYER', id: `p${i}`, name })));
  s = reducer(s, { type: 'ASSIGN_ROLES', roles: dealRoles(s.players, rng) });
  for (const p of s.players) s = run(s, { type: 'PICK_REVEAL', id: p.id }, { type: 'FINISH_REVEAL' }, { type: 'CLOSE_REVEAL' });
  return run(s, { type: 'TO_MAYOR' }, { type: 'UNLOCK' }, { type: 'START_FIRST_NIGHT' });
}

const id = (s: GameState, role: Role) => withRole(s, role)!.id;

/** Play one full night. Doctor/Police picks are ignored (and not required) when they are dead. */
function night(s: GameState, mafia: string, doctor?: string, police?: string) {
  const doc = livingWithRole(s, 'DOCTOR');
  const pol = livingWithRole(s, 'POLICE');
  s = run(s, { type: 'OPEN_NIGHT' }, { type: 'PICK_TARGET', who: 'mafia', id: mafia }, { type: 'NIGHT_NEXT' }, { type: 'NIGHT_NEXT' });
  if (doc) s = reducer(s, { type: 'PICK_TARGET', who: 'doctor', id: doctor ?? doc.id });
  s = run(s, { type: 'NIGHT_NEXT' }, { type: 'NIGHT_NEXT' });
  if (pol) s = reducer(s, { type: 'PICK_TARGET', who: 'police', id: police ?? withRole(s, 'MAFIA')!.id });
  return run(s, { type: 'NIGHT_NEXT' }, { type: 'NIGHT_NEXT' });
}

/** Everyone eligible votes for `target` (or for `pick(voter)`), then the vote is counted. */
function vote(s: GameState, pick: (voter: string) => string) {
  for (const v of s.vote!.voters) s = reducer(s, { type: 'CAST_VOTE', voter: v, candidate: pick(v) });
  return reducer(s, { type: 'CLOSE_VOTE' });
}

const toVote = (s: GameState) => run(s, { type: 'MORNING_NEXT', timerMs: null }, { type: 'GO_VOTE' });

describe('roles', () => {
  it('always deals exactly one Mafia, Doctor and Police for 4–20 players', () => {
    for (let n = 4; n <= 20; n++) {
      const roles = Object.values(dealRoles(NAMES.slice(0, n).map((x) => ({ id: x }))));
      expect(roles.filter((r) => r === 'MAFIA')).toHaveLength(1);
      expect(roles.filter((r) => r === 'DOCTOR')).toHaveLength(1);
      expect(roles.filter((r) => r === 'POLICE')).toHaveLength(1);
      expect(roles.filter((r) => r === 'CITIZEN')).toHaveLength(composition(n).citizens);
    }
  });

  it('shuffle is unbiased (every position roughly equally likely)', () => {
    const hits = [0, 0, 0, 0];
    for (let i = 0; i < 8000; i++) hits[shuffle([0, 1, 2, 3]).indexOf(0)]++;
    for (const h of hits) expect(h).toBeGreaterThan(1700);
  });

  it('a role can be viewed once; the Mayor handoff waits for everyone', () => {
    let s = run(initialState, { type: 'NEW_GAME' }, { type: 'SET_MAYOR', name: 'M', passcode: '1234' });
    NAMES.slice(0, 4).forEach((name, i) => (s = reducer(s, { type: 'ADD_PLAYER', id: `p${i}`, name })));
    s = reducer(s, { type: 'ASSIGN_ROLES', roles: dealRoles(s.players) });
    s = run(s, { type: 'PICK_REVEAL', id: 'p0' }, { type: 'FINISH_REVEAL' }, { type: 'CLOSE_REVEAL' });
    expect(reducer(s, { type: 'PICK_REVEAL', id: 'p0' })).toBe(s);
    expect(reducer(s, { type: 'TO_MAYOR' })).toBe(s);
  });

  it('rejects duplicate names and too few players', () => {
    let s = run(initialState, { type: 'NEW_GAME' }, { type: 'SET_MAYOR', name: 'M', passcode: null });
    s = run(s, { type: 'ADD_PLAYER', id: 'a', name: 'Aarav' });
    expect(reducer(s, { type: 'ADD_PLAYER', id: 'b', name: '  aarav ' })).toBe(s);
    s = run(s, { type: 'ADD_PLAYER', id: 'b', name: 'Rohan' });
    expect(reducer(s, { type: 'ASSIGN_ROLES', roles: { a: 'MAFIA', b: 'DOCTOR' } })).toBe(s);
  });
});

describe('night', () => {
  it('Doctor saving the Mafia target means no one dies', () => {
    let s = newGame(6);
    const victim = s.players.find((p) => p.role === 'CITIZEN')!.id;
    s = night(s, victim, victim, id(s, 'MAFIA'));
    expect(s.phase).toBe('MORNING_ANNOUNCEMENT');
    expect(living(s)).toHaveLength(6);
    expect(s.nights[0].saved).toBe(true);
    expect(s.nights[0].policeIsMafia).toBe(true);
  });

  it('an unsaved target dies and cannot be targeted again', () => {
    let s = newGame(6);
    const victim = s.players.find((p) => p.role === 'CITIZEN')!.id;
    s = night(s, victim, id(s, 'DOCTOR'), id(s, 'MAFIA'));
    expect(s.players.find((p) => p.id === victim)!.alive).toBe(false);
    s = run(s, { type: 'MORNING_NEXT', timerMs: null }, { type: 'GO_VOTE' });
    expect(s.vote!.voters).not.toContain(victim);
    expect(reducer(s, { type: 'CAST_VOTE', voter: victim, candidate: id(s, 'MAFIA') })).toBe(s);
  });

  it('the Mafia cannot target itself; the Doctor may protect themselves', () => {
    let s = run(newGame(5), { type: 'OPEN_NIGHT' });
    expect(reducer(s, { type: 'PICK_TARGET', who: 'mafia', id: id(s, 'MAFIA') })).toBe(s);
    s = run(s, { type: 'PICK_TARGET', who: 'mafia', id: id(s, 'POLICE') }, { type: 'NIGHT_NEXT' }, { type: 'NIGHT_NEXT' });
    expect(reducer(s, { type: 'PICK_TARGET', who: 'doctor', id: id(s, 'DOCTOR') })).not.toBe(s);
  });

  it('a living actor must choose before moving on; secrets reset each night', () => {
    const s = run(newGame(5), { type: 'OPEN_NIGHT' });
    expect(reducer(s, { type: 'NIGHT_NEXT' })).toBe(s);
    const after = night(newGame(5), newGame(5).players.find((p) => p.role === 'CITIZEN')!.id);
    expect(after.night.mafia).toBeNull();
  });

  it('dead Doctor and Police cannot act', () => {
    let s = newGame(8);
    const [doc, pol, maf] = [id(s, 'DOCTOR'), id(s, 'POLICE'), id(s, 'MAFIA')];
    s = night(s, doc, maf); // Mafia kills the Doctor, who protected someone else
    const cit = s.players.find((p) => p.role === 'CITIZEN')!.id;
    s = vote(toVote(s), (v) => (v === maf ? cit : v === pol ? cit : pol)); // police voted out
    expect(s.lastResult!.eliminatedId).toBe(pol);
    s = run(s, { type: 'RESULTS_NEXT' }, { type: 'ELIMINATION_NEXT' }, { type: 'UNLOCK' }, { type: 'OPEN_NIGHT' });
    expect(s.phase).toBe('MAFIA_ACTION');
    s = run(
      s,
      { type: 'PICK_TARGET', who: 'mafia', id: s.players.find((p) => p.role === 'CITIZEN' && p.alive)!.id },
      { type: 'NIGHT_NEXT' },
      { type: 'NIGHT_NEXT' },
    );
    expect(s.phase).toBe('DOCTOR_ACTION');
    expect(reducer(s, { type: 'PICK_TARGET', who: 'doctor', id: maf })).toBe(s);
    s = run(s, { type: 'NIGHT_NEXT' }, { type: 'NIGHT_NEXT' }, { type: 'NIGHT_NEXT' }, { type: 'NIGHT_NEXT' });
    expect(s.phase).toBe('MORNING_ANNOUNCEMENT');
    expect(s.nights[1].doctorTarget).toBeNull();
    expect(s.nights[1].policeTarget).toBeNull();
  });
});

describe('voting', () => {
  it('counts only legal ballots: no self-votes, no double votes, nobody left out', () => {
    let s = newGame(7);
    s = toVote(night(s, id(s, 'POLICE'), id(s, 'POLICE')));
    const [a, b, c] = s.vote!.voters;
    expect(reducer(s, { type: 'CAST_VOTE', voter: a, candidate: a })).toBe(s);
    s = reducer(s, { type: 'CAST_VOTE', voter: a, candidate: c });
    expect(reducer(s, { type: 'CAST_VOTE', voter: a, candidate: b })).toBe(s);
    expect(reducer(s, { type: 'CLOSE_VOTE' })).toBe(s); // not everyone has voted yet
  });

  it('a tie goes to a runoff of non-candidates; a tied runoff eliminates nobody (never random)', () => {
    let s = newGame(8);
    s = toVote(night(s, id(s, 'POLICE'), id(s, 'POLICE'))); // nobody dies → 8 voters
    const [t1, t2] = s.vote!.voters;
    let k = 0;
    s = vote(s, (v) => (v === t1 ? t2 : v === t2 ? t1 : [t1, t2][k++ % 2]));
    expect(s.phase).toBe('VOTING_RESULTS');
    expect(s.lastResult!.eliminatedId).toBeNull();
    expect(s.lastResult!.leaders.sort()).toEqual([t1, t2].sort());
    s = reducer(s, { type: 'RESULTS_NEXT' });
    expect(s.phase).toBe('RUNOFF_VOTING');
    expect(s.vote!.voters).toHaveLength(6);
    expect(s.vote!.voters).not.toContain(t1);
    expect(s.vote!.voters).not.toContain(t2);
    expect(s.vote!.candidates.sort()).toEqual([t1, t2].sort());
    let j = 0;
    s = vote(s, () => [t1, t2][j++ % 2]); // 3–3
    expect(s.lastResult!.eliminatedId).toBeNull();
    s = reducer(s, { type: 'RESULTS_NEXT' });
    expect(s.phase).toBe('NIGHT_START');
    expect(living(s)).toHaveLength(8);
    expect(s.round).toBe(2);
  });

  it('a runoff with a clear leader eliminates that player', () => {
    let s = newGame(8);
    s = toVote(night(s, id(s, 'POLICE'), id(s, 'POLICE')));
    const [t1, t2] = s.vote!.voters;
    let k = 0;
    s = vote(s, (v) => (v === t1 ? t2 : v === t2 ? t1 : [t1, t2][k++ % 2]));
    s = reducer(s, { type: 'RESULTS_NEXT' });
    s = vote(s, () => t2);
    expect(s.lastResult!.eliminatedId).toBe(t2);
    expect(s.players.find((p) => p.id === t2)!.alive).toBe(false);
  });

  it('voting the Mafia out ends the game immediately — no next night', () => {
    let s = newGame(6);
    const mafia = id(s, 'MAFIA');
    s = toVote(night(s, id(s, 'POLICE'), id(s, 'POLICE')));
    s = vote(s, (v) => (v === mafia ? id(s, 'POLICE') : mafia));
    s = run(s, { type: 'RESULTS_NEXT' }, { type: 'ELIMINATION_NEXT' });
    expect(s.phase).toBe('GAME_OVER');
    expect(s.winner).toBe('CITY');
    expect(reducer(s, { type: 'OPEN_NIGHT' })).toBe(s);
    expect(reducer(s, { type: 'CAST_VOTE', voter: 'p0', candidate: 'p1' })).toBe(s);
  });

  it('Mafia wins at parity after a vote', () => {
    let s = newGame(4); // M, D, P, C
    const cit = id(s, 'CITIZEN');
    s = night(s, id(s, 'POLICE'), id(s, 'DOCTOR')); // police dies → M, D, C
    expect(checkWinner(s)).toBeNull();
    s = vote(toVote(s), (v) => (v === cit ? id(s, 'DOCTOR') : cit)); // citizen voted out → M, D
    s = run(s, { type: 'RESULTS_NEXT' }, { type: 'ELIMINATION_NEXT' });
    expect(s.phase).toBe('GAME_OVER');
    expect(s.winner).toBe('MAFIA');
  });

  it('Mafia wins straight after a night kill when that reaches parity', () => {
    let s = newGame(4);
    s = night(s, id(s, 'POLICE'), id(s, 'DOCTOR')); // M, D, C
    const [d, c] = [id(s, 'DOCTOR'), id(s, 'CITIZEN')];
    s = vote(toVote(s), (v) => (v === d ? c : d)); // d voted out (2 votes... c + m), M, C left
    expect(living(s)).toHaveLength(2);
    expect(checkWinner(s)).toBe('MAFIA');
    s = run(s, { type: 'RESULTS_NEXT' }, { type: 'ELIMINATION_NEXT' });
    expect(s.winner).toBe('MAFIA');
  });
});

describe('corrections', () => {
  it('rewinding to a night restores everything after it (kill, vote, elimination)', () => {
    let s = newGame(7);
    const roles = s.players.map((p) => p.role);
    s = night(s, id(s, 'CITIZEN'), id(s, 'POLICE'));
    s = vote(toVote(s), (v) => (v === id(s, 'DOCTOR') ? id(s, 'MAFIA') : id(s, 'DOCTOR')));
    expect(living(s).length).toBeLessThan(6);
    s = reducer(s, { type: 'REWIND', id: 'night-1' });
    expect(s.phase).toBe('NIGHT_START');
    expect(living(s)).toHaveLength(7);
    expect(s.nights).toHaveLength(0);
    expect(s.log).toHaveLength(0);
    expect(s.vote).toBeNull();
    expect(s.players.map((p) => p.role)).toEqual(roles); // roles never reshuffle
  });

  it('rewinding to a vote replays only the vote; voiding a ballot lets that voter vote again', () => {
    let s = newGame(7);
    s = toVote(night(s, id(s, 'POLICE'), id(s, 'POLICE')));
    const [a, b, c] = s.vote!.voters;
    s = run(s, { type: 'CAST_VOTE', voter: a, candidate: b }, { type: 'VOID_VOTE', voter: a });
    expect(s.vote!.ballots[a]).toBeUndefined();
    s = reducer(s, { type: 'CAST_VOTE', voter: a, candidate: c });
    expect(s.vote!.ballots[a]).toBe(c);
    s = vote(s, (v) => (v === b ? c : b));
    expect(s.lastResult).not.toBeNull();
    s = reducer(s, { type: 'REWIND', id: 'vote-1' });
    expect(s.phase).toBe('VOTING');
    expect(s.vote!.ballots).toEqual({});
    expect(s.lastResult).toBeNull();
    expect(living(s)).toHaveLength(7);
    expect(s.nights).toHaveLength(1); // the night stands
  });

  it('stepping back inside the night keeps picks and changes nothing else', () => {
    let s = run(newGame(5), { type: 'OPEN_NIGHT' });
    const target = id(s, 'POLICE');
    s = run(s, { type: 'PICK_TARGET', who: 'mafia', id: target }, { type: 'NIGHT_NEXT' }, { type: 'NIGHT_NEXT' });
    expect(s.phase).toBe('DOCTOR_ACTION');
    s = run(s, { type: 'NIGHT_BACK' });
    expect(s.phase).toBe('MAFIA_ACTION');
    expect(s.night.mafia).toBe(target);
    expect(living(s)).toHaveLength(5);
  });
});

describe('full simulated games', () => {
  it('always end with a winner, never start a night after one, and keep exactly one of each special role', () => {
    for (let seed = 1; seed <= 150; seed++) {
      const rng = seeded(seed);
      const n = 4 + Math.floor(rng() * 17);
      let s = newGame(n, rng);
      const specials = s.players.map((p) => p.role).filter((r) => r !== 'CITIZEN').length;
      expect(specials).toBe(3);
      let guard = 0;
      while (s.phase !== 'GAME_OVER' && guard++ < 400) {
        const pickAlive = (ok: (id: string) => boolean) => {
          const pool = living(s)
            .map((p) => p.id)
            .filter(ok);
          return pool[Math.floor(rng() * pool.length)];
        };
        const prev = s;
        switch (s.phase) {
          case 'MAFIA_ACTION':
          case 'DOCTOR_ACTION':
          case 'POLICE_ACTION': {
            const who = s.phase === 'MAFIA_ACTION' ? 'mafia' : s.phase === 'DOCTOR_ACTION' ? 'doctor' : 'police';
            if (s.nightStep === 'wake')
              s = reducer(s, {
                type: 'PICK_TARGET',
                who,
                id:
                  pickAlive(
                    (x) => x !== s.players.find((p) => p.role === (who === 'mafia' ? 'MAFIA' : 'POLICE'))?.id || who === 'doctor',
                  ) ?? '',
              });
            s = reducer(s, { type: 'NIGHT_NEXT' });
            break;
          }
          case 'VOTING':
          case 'RUNOFF_VOTING': {
            for (const v of s.vote!.voters) {
              const cands = s.vote!.candidates.filter((c) => c !== v);
              s = reducer(s, { type: 'CAST_VOTE', voter: v, candidate: cands[Math.floor(rng() * cands.length)] });
            }
            s = reducer(s, { type: 'CLOSE_VOTE' });
            break;
          }
          default: {
            if (s.locked) s = reducer(s, { type: 'UNLOCK' });
            const a = continueAction(s, null);
            s = a ? reducer(s, a) : s;
          }
        }
        if (s === prev) throw new Error(`stuck in ${s.phase}/${s.nightStep} (seed ${seed})`);
        // invariants
        expect(s.players.filter((p) => p.role === 'MAFIA')).toHaveLength(1);
        if (s.phase === 'NIGHT_START' || s.phase === 'DISCUSSION' || s.phase === 'VOTING') expect(checkWinner(s)).toBeNull();
        if (s.phase === 'GAME_OVER') expect(checkWinner(s) === s.winner).toBe(true);
      }
      expect(s.phase).toBe('GAME_OVER');
      expect(['CITY', 'MAFIA']).toContain(s.winner);
    }
  });
});

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { byId, checkWinner, living, timerRemaining, voteProgress } from '../game/engine';
import { buzz, play } from '../audio';
import { useGame } from '../store';
import { Btn, Chip, Heading, Icon, Page, PlayerCard, cn } from '../ui/kit';
import { GateSheet } from '../ui/Gate';

// ───────────────────────────── discussion ─────────────────────────────

const OPTIONS: { min: 0 | 2 | 3 | 5; label: string }[] = [
  { min: 2, label: '2 min' },
  { min: 3, label: '3 min' },
  { min: 5, label: '5 min' },
  { min: 0, label: 'Unlimited' },
];
const mmss = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function Discussion() {
  const { state, dispatch, setPrefs } = useGame();
  const t = state.timer;
  const [now, setNow] = useState(() => Date.now());
  const running = t.startedAt !== null;
  const remaining = timerRemaining(t, now);
  const unlimited = t.durationMs === null;
  const fresh = !running && t.durationMs !== null && t.remainingMs === t.durationMs;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (running && remaining <= 0) {
      dispatch({ type: 'TIMER_PAUSE', now: Date.now() });
      play('bell');
      buzz([200, 100, 200]);
    }
  }, [running, remaining, dispatch]);

  const fraction = unlimited || !t.durationMs ? 1 : remaining / t.durationMs;
  const C = 2 * Math.PI * 54;
  const over = !unlimited && remaining <= 0;
  const alive = living(state);
  const dead = state.players.length - alive.length;

  return (
    <Page
      footer={
        <Btn onClick={() => dispatch({ type: 'GO_VOTE' })}>
          <Icon name="vote" className="size-5" />
          Proceed to Voting
        </Btn>
      }
    >
      <div className="space-y-6 pt-1">
        <Heading kicker="Day discussion" title="CITY DISCUSSION" sub="Someone among you is lying." />

        <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/8">
          <div className="flex items-center gap-5">
            <div className="relative size-28 shrink-0">
              <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
                <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="6" />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={C * (1 - fraction)}
                  className={cn('transition-[stroke-dashoffset] duration-300', over ? 'text-mafia-hi' : 'text-day')}
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center text-center" role="timer" aria-live="off">
                {unlimited ? (
                  <span className="text-3xl font-bold">∞</span>
                ) : (
                  <span className={cn('text-[1.7rem] font-bold tabular-nums', over && 'text-mafia-hi')}>{mmss(remaining)}</span>
                )}
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {unlimited ? (
                <p className="text-[15px] text-ivory/60">No time limit. Talk until you’re ready to vote.</p>
              ) : over ? (
                <p className="text-[17px] font-semibold text-mafia-hi">Time’s up.</p>
              ) : (
                <div className="flex gap-2">
                  <Btn
                    small
                    className="flex-1"
                    onClick={() => dispatch(running ? { type: 'TIMER_PAUSE', now: Date.now() } : { type: 'TIMER_START', now: Date.now() })}
                  >
                    <Icon name={running ? 'pause' : 'play'} className="size-4" />
                    {running ? 'Pause' : t.remainingMs < (t.durationMs ?? 0) ? 'Resume' : 'Start'}
                  </Btn>
                  <Btn small variant="secondary" className="flex-1" onClick={() => dispatch({ type: 'TIMER_SKIP' })}>
                    Skip
                  </Btn>
                </div>
              )}
            </div>
          </div>
          {(fresh || unlimited || over || !running) && (
            <div className="mt-4 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Discussion length">
              {OPTIONS.map((o) => {
                const on = (o.min === 0 ? null : o.min * 60_000) === t.durationMs;
                return (
                  <button
                    key={o.min}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      setPrefs({ discussionMin: o.min });
                      dispatch({ type: 'TIMER_SET', durationMs: o.min === 0 ? null : o.min * 60_000 });
                    }}
                    className={cn(
                      'min-h-10 flex-1 rounded-full px-3 text-[14px] font-semibold whitespace-nowrap ring-1 transition',
                      on ? 'bg-ivory text-ink ring-ivory' : 'bg-white/6 text-ivory/70 ring-white/10 active:bg-white/12',
                    )}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-[0.18em] text-ivory/50 uppercase">The city</h2>
            <Chip>
              {alive.length} alive{dead > 0 ? ` · ${dead} eliminated` : ''}
            </Chip>
          </div>
          <ul className="grid grid-cols-2 gap-2.5">
            {state.players.map((p) => (
              <li key={p.id}>
                <PlayerCard compact name={p.name} state={p.alive ? 'idle' : 'dead'} note={p.alive ? 'Alive' : 'Eliminated'} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Page>
  );
}

// ───────────────────────────── voting ─────────────────────────────

export function Voting() {
  const { state, dispatch } = useGame();
  const v = state.vote;
  const [voter, setVoter] = useState<string | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [gate, setGate] = useState(false);

  useEffect(() => {
    if (!submitted) return;
    const id = setTimeout(() => setSubmitted(false), 2200);
    return () => clearTimeout(id);
  }, [submitted]);

  if (!v) return null;
  const prog = voteProgress(v);
  const runoff = v.stage === 'runoff';
  const voterPlayer = byId(state, voter);

  if (submitted) {
    return (
      <Page center footer={<Btn onClick={() => setSubmitted(false)}>Pass the Phone</Btn>}>
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6 text-center"
          role="status"
        >
          <div className="mx-auto grid size-20 place-items-center rounded-full bg-doctor/15 text-doctor-hi ring-1 ring-doctor/40">
            <Icon name="check" className="size-10" />
          </div>
          <Heading title="VOTE SUBMITTED" sub="Pass the phone to the next voter." />
          <p className="text-[15px] text-ivory/45">
            {prog.done} / {prog.total} votes in
          </p>
        </motion.div>
      </Page>
    );
  }

  if (voterPlayer) {
    const options = v.candidates.filter((id) => id !== voterPlayer.id);
    return (
      <Page
        footer={
          <>
            {choice && (
              <p className="text-center text-[15px] text-ivory/60">
                Your Vote: <b className="font-semibold text-ivory">{byId(state, choice)?.name}</b>
              </p>
            )}
            <Btn
              disabled={!choice}
              onClick={() => {
                if (!choice) return;
                dispatch({ type: 'CAST_VOTE', voter: voterPlayer.id, candidate: choice });
                play('vote');
                buzz(20);
                setChoice(null); // hide the selection immediately
                setVoter(null);
                setSubmitted(true);
              }}
            >
              Confirm Vote
            </Btn>
            <Btn
              variant="ghost"
              small
              onClick={() => {
                setVoter(null);
                setChoice(null);
              }}
            >
              That’s not me
            </Btn>
          </>
        }
      >
        <div className="space-y-6 pt-1">
          <Heading
            kicker={<>Voter: {voterPlayer.name}</>}
            title={runoff ? 'RUNOFF BALLOT' : 'CAST YOUR VOTE'}
            sub="Choose who should be eliminated."
          />
          <div className={cn('grid gap-2.5', options.length > 8 ? 'grid-cols-2' : 'grid-cols-1')}>
            {options.map((id) => {
              const p = byId(state, id)!;
              return (
                <PlayerCard
                  key={id}
                  compact={options.length > 8}
                  name={p.name}
                  tone="mafia"
                  state={choice === id ? 'selected' : 'idle'}
                  onClick={() => setChoice(id)}
                />
              );
            })}
          </div>
        </div>
      </Page>
    );
  }

  const candidates = v.candidates.map((id) => byId(state, id)?.name).join(' and ');
  return (
    <>
      <Page
        footer={
          prog.complete ? (
            <Btn onClick={() => setGate(true)}>
              <Icon name="lock" className="size-5" />
              Count the Votes (Mayor)
            </Btn>
          ) : (
            <p className="text-center text-[14px] text-ivory/45">Voters tap their own name. The Mayor does not vote.</p>
          )
        }
      >
        <div className="space-y-6 pt-1">
          <Heading
            kicker={runoff ? 'The city is divided' : 'Public vote'}
            title={runoff ? 'RUNOFF VOTE' : 'TIME TO VOTE'}
            sub={runoff ? `Choose between ${candidates}.` : 'Who do you think is the Mafia?'}
          />
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-[17px] font-bold tabular-nums">
                {prog.done} / {prog.total} Votes Submitted
              </p>
              {prog.complete && <span className="text-sm font-semibold text-doctor-hi">All in</span>}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-ivory"
                animate={{ width: `${prog.total ? (prog.done / prog.total) * 100 : 0}%` }}
              />
            </div>
          </div>
          <AnimatePresence mode="wait">
            {prog.complete ? (
              <motion.div
                key="done"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-3xl bg-doctor/10 p-6 text-center ring-1 ring-doctor/30"
              >
                <p className="text-2xl font-extrabold">ALL VOTES ARE IN</p>
                <p className="mt-2 text-[15px] text-ivory/60">Hand the phone to the Mayor to count them.</p>
              </motion.div>
            ) : (
              <motion.div key="list" className="space-y-2.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="text-center text-[13px] font-semibold tracking-[0.16em] text-ivory/45 uppercase">Tap your name to vote</p>
                <div className={cn('grid gap-2.5', v.voters.length > 8 ? 'grid-cols-2' : 'grid-cols-1')}>
                  {v.voters.map((id) => {
                    const p = byId(state, id)!;
                    const voted = !!v.ballots[id];
                    return (
                      <PlayerCard
                        key={id}
                        compact={v.voters.length > 8}
                        name={p.name}
                        state={voted ? 'done' : 'idle'}
                        note={voted ? 'Voted' : undefined}
                        onClick={() => setVoter(id)}
                      />
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Page>
      <GateSheet open={gate} onClose={() => setGate(false)} onPass={() => dispatch({ type: 'CLOSE_VOTE' })} title="Count the votes" />
    </>
  );
}

// ───────────────────────────── results ─────────────────────────────

export function VotingResults() {
  const { state, dispatch } = useGame();
  const r = state.lastResult;
  useEffect(() => {
    play('reveal');
  }, []);
  if (!r) return null;
  const rows = Object.entries(r.tally)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  const max = rows[0]?.[1] ?? 1;
  const total = rows.reduce((n, [, c]) => n + c, 0);
  const tie = !r.eliminatedId;
  const runoffPossible = r.stage === 'main' && living(state).some((p) => !r.leaders.includes(p.id));
  const title = !tie ? 'THE CITY HAS DECIDED' : r.stage === 'main' ? 'THE CITY IS DIVIDED' : 'STILL DIVIDED';
  const names = r.leaders.map((id) => byId(state, id)?.name).join(' and ');

  return (
    <Page
      footer={
        !tie ? (
          <Btn onClick={() => dispatch({ type: 'RESULTS_NEXT' })}>Reveal the Verdict</Btn>
        ) : runoffPossible ? (
          <Btn onClick={() => dispatch({ type: 'RESULTS_NEXT' })}>Begin Runoff Vote</Btn>
        ) : (
          <Btn onClick={() => dispatch({ type: 'RESULTS_NEXT' })}>
            <Icon name="moon" className="size-5" />
            Continue to Night
          </Btn>
        )
      }
    >
      <div className="space-y-7 pt-1">
        <Heading
          kicker={r.stage === 'runoff' ? 'Runoff result' : 'Voting result'}
          title={title}
          sub={`${total} vote${total === 1 ? '' : 's'} counted`}
        />
        <ul className="space-y-3.5" aria-label="Vote counts">
          {rows.map(([id, n], i) => {
            const lead = r.leaders.includes(id);
            return (
              <li key={id}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="truncate text-[17px] font-semibold">{byId(state, id)?.name}</span>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 + i * 0.25 }}
                    className="text-xl font-extrabold tabular-nums"
                  >
                    {n}
                  </motion.span>
                </div>
                <div className="h-3.5 overflow-hidden rounded-full bg-white/8">
                  <motion.div
                    className={cn('h-full rounded-full', lead ? 'bg-mafia' : 'bg-ivory/45')}
                    initial={{ width: 0 }}
                    animate={{ width: `${(n / max) * 100}%` }}
                    transition={{ duration: 0.9, delay: 0.3 + i * 0.25, ease: [0.2, 0.8, 0.2, 1] }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        {tie && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 + rows.length * 0.25 }}
            className="rounded-2xl bg-white/5 p-4 text-center ring-1 ring-white/8"
          >
            {runoffPossible ? (
              <p className="text-[15px] leading-snug text-ivory/75">
                <b>{names}</b> are tied. Only the rest of the city votes again, between these two.
              </p>
            ) : (
              <p className="text-[15px] leading-snug text-ivory/75">
                {r.stage === 'runoff' ? 'The runoff is tied.' : 'There’s nobody left to break the tie.'} <b>Nobody is eliminated today.</b>
              </p>
            )}
          </motion.div>
        )}
      </div>
    </Page>
  );
}

// ───────────────────────────── elimination ─────────────────────────────

export function Elimination() {
  const { state, dispatch } = useGame();
  const [shown, setShown] = useState(false);
  const p = byId(state, state.lastResult?.eliminatedId);
  const winner = checkWinner(state);

  useEffect(() => {
    play('suspense');
    const t = setTimeout(() => {
      play('reveal');
      buzz([40, 60, 40]);
      setShown(true);
    }, 2800);
    return () => clearTimeout(t);
  }, []);

  if (!p) return null;
  return (
    <Page
      center
      footer={
        shown ? (
          <Btn onClick={() => dispatch({ type: 'ELIMINATION_NEXT' })}>{winner ? 'See the Verdict' : 'Hand the Phone to the Mayor'}</Btn>
        ) : (
          <Btn disabled>…</Btn>
        )
      }
    >
      <AnimatePresence mode="wait">
        {!shown ? (
          <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 text-center">
            <Heading kicker="By the decision of the city" title="The verdict…" />
            <div className="flex justify-center gap-2.5">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="size-3 rounded-full bg-ivory"
                  animate={{ opacity: [0.15, 1, 0.15] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.3 }}
                />
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="shown" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-7 text-center" role="status">
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 12 }}
              className="mx-auto grid size-24 place-items-center rounded-full bg-white/8 ring-2 ring-ivory/30"
            >
              <Icon name="skull" className="size-11 text-ivory/80" />
            </motion.div>
            <div>
              <motion.p
                initial={{ opacity: 0, scale: 1.25, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                transition={{ delay: 0.2, duration: 0.9 }}
                className="text-[clamp(2.6rem,13vw,4rem)] leading-none font-black tracking-tight break-words uppercase"
              >
                {p.name}
              </motion.p>
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-4 text-2xl font-extrabold tracking-tight"
              >
                HAS BEEN ELIMINATED
              </motion.h1>
            </div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="text-[17px] text-ivory/60">
              By the decision of the city.
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  );
}

import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  type GameState,
  ACTOR_OF_PHASE,
  PHASE_LABEL,
  actorAlive,
  byId,
  continueAction,
  dealRoles,
  living,
  reducer,
  roundLabel,
  voteProgress,
} from '../game/engine';
import { useGame } from '../store';
import { MayorGate } from './Gate';
import { HistoryList } from './History';
import { Btn, Chip, Confirm, Icon, IconBtn, cn } from './kit';
import { ROLE_UI, RoleBadge } from './roles';

const CONTINUE_LABEL: Partial<Record<GameState['phase'], string>> = {
  MAYOR_HANDOFF: 'Begin Night 1',
  NIGHT_START: 'Open the night',
  MAFIA_ACTION: 'Next night step',
  DOCTOR_ACTION: 'Next night step',
  POLICE_ACTION: 'Next night step',
  MORNING_ANNOUNCEMENT: 'Begin discussion',
  DISCUSSION: 'Proceed to voting',
  VOTING: 'Count the votes',
  RUNOFF_VOTING: 'Count the votes',
  VOTING_RESULTS: 'Continue from results',
  ELIMINATION: 'Continue after elimination',
};

function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-[12px] font-semibold tracking-[0.2em] text-ivory/50 uppercase">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

type Pending = null | { title: string; body: string; label: string; run: () => void };

export function Dashboard({
  open,
  onClose,
  onSettings,
  onGuide,
}: {
  open: boolean;
  onClose: () => void;
  onSettings: () => void;
  onGuide: (g: 'how' | 'tour') => void;
}) {
  const { state, dispatch, timerMs } = useGame();
  const [unlocked, setUnlocked] = useState(false);
  const [showRoles, setShowRoles] = useState(false);
  const [pending, setPending] = useState<Pending>(null);

  // Every opening starts locked and with roles hidden.
  useEffect(() => {
    if (!open) {
      setUnlocked(false);
      setShowRoles(false);
      setPending(null);
    }
  }, [open]);

  const alive = living(state);
  const dead = state.players.length - alive.length;
  const prog = voteProgress(state.vote);
  const cont = continueAction(state, timerMs);
  const canContinue = !!cont && reducer(state, cont) !== state;
  const nightPhase = !!ACTOR_OF_PHASE[state.phase] || state.phase === 'NIGHT_START';
  const canBack = !!ACTOR_OF_PHASE[state.phase] || state.phase === 'DISCUSSION' || (state.phase === 'VOTING' && prog.done === 0);
  const back = ACTOR_OF_PHASE[state.phase]
    ? ({ type: 'NIGHT_BACK' } as const)
    : state.phase === 'DISCUSSION'
      ? ({ type: 'BACK_TO_MORNING' } as const)
      : ({ type: 'BACK_TO_DISCUSSION' } as const);
  const voting = state.phase === 'VOTING' || state.phase === 'RUNOFF_VOTING';
  const over = state.phase === 'GAME_OVER';
  const rewinds = [...state.checkpoints].reverse();
  const ask = (p: NonNullable<Pending>) => setPending(p);

  const picks = (['mafia', 'doctor', 'police'] as const).map((w) => ({
    w,
    out: !actorAlive(state, w),
    // during the day, a resolved night means every living actor has acted
    done: nightPhase ? state.night[w] !== null : state.nights.some((n) => n.round === state.round),
  }));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex flex-col bg-ink"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-label="Mayor control center"
        >
          <div className="mx-auto flex min-h-0 w-full max-w-[460px] flex-1 flex-col pt-[env(safe-area-inset-top)]">
            <header className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.24em] text-ivory/45 uppercase">Mayor only</p>
                <h1 className="text-xl font-extrabold tracking-tight">Control Center</h1>
              </div>
              <IconBtn label="Close control center" onClick={onClose}>
                <Icon name="x" />
              </IconBtn>
            </header>

            {!unlocked ? (
              <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-5 pb-10">
                <p className="mb-8 text-center text-[17px] text-ivory/65">
                  This screen shows secret identities.
                  <br />
                  Make sure only the Mayor is looking.
                </p>
                <MayorGate onPass={() => setUnlocked(true)} />
              </div>
            ) : (
              <div className="min-h-0 flex-1 space-y-7 overflow-y-auto overscroll-contain px-5 pt-1 pb-[max(2rem,env(safe-area-inset-bottom))]">
                <div className="flex flex-wrap gap-2">
                  <Chip className="!bg-white/12 !text-ivory">
                    <Icon name={nightPhase ? 'moon' : 'sun'} className="size-4" />
                    {roundLabel(state)}
                  </Chip>
                  <Chip>{PHASE_LABEL[state.phase]}</Chip>
                  {state.paused && <Chip className="!text-day">Paused</Chip>}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <Stat label="Living" value={alive.length} />
                  <Stat label="Eliminated" value={dead} />
                  <Stat label="Votes in" value={state.vote ? `${prog.done} / ${prog.total}` : '—'} />
                  <div className="rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/8">
                    <p className="text-[12px] font-medium text-ivory/50">Night actions</p>
                    <div className="mt-1.5 flex gap-1.5">
                      {picks.map(({ w, out, done }) => (
                        <span
                          key={w}
                          title={w}
                          className={cn(
                            'grid size-7 place-items-center rounded-full text-[11px] font-bold ring-1',
                            out
                              ? 'bg-white/5 text-ivory/30 ring-white/10 line-through'
                              : done
                                ? 'bg-doctor/20 text-doctor-hi ring-doctor/40'
                                : 'bg-white/8 text-ivory/50 ring-white/12',
                          )}
                        >
                          {w[0].toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {!over && (
                  <Section title="Controls">
                    <Btn
                      disabled={!canContinue}
                      onClick={() => {
                        if (cont) dispatch(cont);
                        onClose();
                      }}
                    >
                      {CONTINUE_LABEL[state.phase] ?? 'Continue'}
                    </Btn>
                    <div className="grid grid-cols-2 gap-2.5">
                      <Btn
                        variant="secondary"
                        small
                        disabled={!canBack}
                        onClick={() => {
                          dispatch(back);
                          onClose();
                        }}
                      >
                        <Icon name="back" className="size-4" />
                        Previous step
                      </Btn>
                      <Btn
                        variant="secondary"
                        small
                        onClick={() => {
                          dispatch({ type: 'SET_PAUSED', paused: !state.paused, now: Date.now() });
                          onClose();
                        }}
                      >
                        <Icon name={state.paused ? 'play' : 'pause'} className="size-4" />
                        {state.paused ? 'Resume' : 'Pause game'}
                      </Btn>
                    </div>
                  </Section>
                )}

                {voting && state.vote && (
                  <Section
                    title="Voting session"
                    aside={
                      <Chip>
                        {prog.done} / {prog.total}
                      </Chip>
                    }
                  >
                    <ul className="space-y-2">
                      {state.vote.voters.map((id) => {
                        const voted = !!state.vote!.ballots[id];
                        return (
                          <li
                            key={id}
                            className="flex min-h-12 items-center gap-3 rounded-2xl bg-white/5 py-1 pr-1.5 pl-4 ring-1 ring-white/8"
                          >
                            <span className="min-w-0 flex-1 truncate font-medium">{byId(state, id)?.name}</span>
                            {voted ? (
                              <>
                                <span className="text-[13px] font-semibold text-doctor-hi">Voted</span>
                                <button
                                  type="button"
                                  onClick={() => dispatch({ type: 'VOID_VOTE', voter: id })}
                                  className="min-h-10 rounded-xl bg-white/8 px-3 text-[13px] font-semibold active:bg-white/16"
                                >
                                  Let them re-vote
                                </button>
                              </>
                            ) : (
                              <span className="pr-3 text-[13px] text-ivory/40">Waiting</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    <p className="text-[13px] text-ivory/45">A re-vote erases that ballot without revealing it. Ballots are never shown.</p>
                    <Btn
                      variant="secondary"
                      small
                      disabled={prog.done === 0}
                      onClick={() =>
                        ask({
                          title: 'Reset this voting session?',
                          body: 'Every ballot cast so far is erased and everyone votes again.',
                          label: 'Reset voting',
                          run: () => dispatch({ type: 'RESET_VOTE' }),
                        })
                      }
                    >
                      Reset voting session
                    </Btn>
                  </Section>
                )}

                <Section
                  title="Secret roles"
                  aside={
                    <Chip>
                      {state.players.filter((p) => p.roleViewed).length} / {state.players.length} viewed
                    </Chip>
                  }
                >
                  {showRoles ? (
                    <>
                      <ul className="space-y-2">
                        {state.players.map((p) => (
                          <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-white/5 p-2.5 ring-1 ring-white/8">
                            <RoleBadge role={p.role!} size="size-10" />
                            <span className={cn('min-w-0 flex-1 truncate font-semibold', !p.alive && 'text-ivory/50 line-through')}>
                              {p.name}
                            </span>
                            <span className={cn('text-[14px] font-semibold', ROLE_UI[p.role!].text)}>{ROLE_UI[p.role!].name}</span>
                          </li>
                        ))}
                      </ul>
                      <Btn variant="secondary" small onClick={() => setShowRoles(false)}>
                        Hide roles
                      </Btn>
                    </>
                  ) : (
                    <Btn variant="secondary" onClick={() => setShowRoles(true)}>
                      <Icon name="eye" className="size-5" />
                      Reveal role assignments
                    </Btn>
                  )}
                </Section>

                {(nightPhase || state.log.length > 0) && (
                  <Section title="Night selections & history">
                    {nightPhase && (
                      <div className="rounded-2xl bg-white/5 p-4 text-[15px] leading-relaxed ring-1 ring-white/8">
                        <p className="mb-1 text-[12px] font-semibold tracking-[0.16em] text-ivory/45 uppercase">Tonight so far</p>
                        <p>
                          <b className="text-mafia-hi">Mafia</b> →{' '}
                          {byId(state, state.night.mafia)?.name ?? <i className="text-ivory/40">not chosen</i>}
                        </p>
                        <p>
                          <b className="text-doctor-hi">Doctor</b> →{' '}
                          {actorAlive(state, 'doctor') ? (
                            (byId(state, state.night.doctor)?.name ?? <i className="text-ivory/40">not chosen</i>)
                          ) : (
                            <i className="text-ivory/40">out of the game</i>
                          )}
                        </p>
                        <p>
                          <b className="text-police-hi">Police</b> →{' '}
                          {actorAlive(state, 'police') ? (
                            byId(state, state.night.police) ? (
                              <>
                                {byId(state, state.night.police)?.name} · {state.night.policeIsMafia ? 'MAFIA' : 'not Mafia'}
                              </>
                            ) : (
                              <i className="text-ivory/40">not chosen</i>
                            )
                          ) : (
                            <i className="text-ivory/40">out of the game</i>
                          )}
                        </p>
                      </div>
                    )}
                    <HistoryList state={state} showPrivate />
                  </Section>
                )}

                {!over && rewinds.length > 0 && (
                  <Section title="Correct a mistake">
                    <p className="text-[13px] leading-snug text-ivory/50">
                      Rewind to the start of an earlier step. Everything that happened after it is erased and replayed, so nothing can be
                      left inconsistent. Roles never change.
                    </p>
                    <div className="space-y-2">
                      {rewinds.map((c) => (
                        <Btn
                          key={c.id}
                          variant="secondary"
                          small
                          className="!justify-start"
                          onClick={() =>
                            ask({
                              title: `Rewind to ${c.label}?`,
                              body: `Everything after the start of “${c.label}” is discarded and must be replayed: night choices, votes and eliminations.`,
                              label: 'Rewind',
                              run: () => {
                                dispatch({ type: 'REWIND', id: c.id });
                                onClose();
                              },
                            })
                          }
                        >
                          <Icon name="rewind" className="size-4" />
                          {c.label}
                        </Btn>
                      ))}
                    </div>
                  </Section>
                )}

                <Section title="Game">
                  <div className="grid grid-cols-2 gap-2.5">
                    <Btn variant="secondary" small onClick={() => onGuide('how')}>
                      <Icon name="book" className="size-4" />
                      How to play
                    </Btn>
                    <Btn variant="secondary" small onClick={() => onGuide('tour')}>
                      <Icon name="info" className="size-4" />
                      Mayor tour
                    </Btn>
                    <Btn variant="secondary" small onClick={onSettings}>
                      <Icon name="sliders" className="size-4" />
                      Settings
                    </Btn>
                    <Btn
                      variant="secondary"
                      small
                      onClick={() => {
                        dispatch({ type: 'GO_HOME' });
                        onClose();
                      }}
                    >
                      Save & exit
                    </Btn>
                  </div>
                  {!over && (
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <Btn
                        variant="danger"
                        small
                        onClick={() =>
                          ask({
                            title: 'Restart game?',
                            body: 'Same players, brand-new random roles. This game’s progress is lost and everyone discovers their identity again.',
                            label: 'Restart game',
                            run: () => {
                              onClose();
                              dispatch({ type: 'ASSIGN_ROLES', roles: dealRoles(state.players) });
                            },
                          })
                        }
                      >
                        Restart game
                      </Btn>
                      <Btn
                        variant="danger"
                        small
                        onClick={() =>
                          ask({
                            title: 'End the game now?',
                            body: 'The game stops with no winner and every identity is revealed.',
                            label: 'End game',
                            run: () => {
                              dispatch({ type: 'END_GAME' });
                              onClose();
                            },
                          })
                        }
                      >
                        End game
                      </Btn>
                    </div>
                  )}
                </Section>
              </div>
            )}
          </div>
          <Confirm
            open={!!pending}
            danger
            title={pending?.title ?? ''}
            body={pending?.body}
            confirmLabel={pending?.label ?? ''}
            onConfirm={() => pending?.run()}
            onClose={() => setPending(null)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/8">
      <p className="text-[12px] font-medium text-ivory/50">{label}</p>
      <p className="mt-0.5 text-2xl font-extrabold tabular-nums">{value}</p>
    </div>
  );
}

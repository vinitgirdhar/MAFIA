import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, MotionConfig, motion, useIsPresent } from 'motion/react';
import { type Phase, gameInProgress, living, roundLabel } from './game/engine';
import { unlockAudio } from './audio';
import { GameCtx, useGame } from './store';
import { Backdrop, Icon, IconBtn, type Tone } from './ui/kit';
import { GateScreen } from './ui/Gate';
import { Dashboard } from './ui/Dashboard';
import { HistorySheet } from './ui/History';
import { HowToPlay, MayorTour, Settings } from './ui/Guides';
import { Home, MayorSetup, Registration } from './screens/Setup';
import { MayorBriefing, RoleAssignment, RoleReveal } from './screens/Roles';
import { Morning, NightAction, NightStart } from './screens/Night';
import { Discussion, Elimination, Voting, VotingResults } from './screens/Day';
import { GameOver } from './screens/GameOver';

const NIGHT: Phase[] = ['NIGHT_START', 'MAFIA_ACTION', 'DOCTOR_ACTION', 'POLICE_ACTION'];
const DAY: Phase[] = ['MORNING_ANNOUNCEMENT', 'DISCUSSION', 'VOTING', 'VOTING_RESULTS', 'RUNOFF_VOTING', 'ELIMINATION'];

/**
 * A screen that is fading out must keep showing the state it was rendered with (its phase is already
 * gone from the live state) and must not take taps, so a double-tap can't act on the next screen.
 */
function Frozen({ children }: { children: ReactNode }) {
  const live = useContext(GameCtx);
  const present = useIsPresent();
  const last = useRef(live);
  if (present) last.current = live;
  return (
    <GameCtx.Provider value={last.current}>
      <div className="contents" style={present ? undefined : { pointerEvents: 'none' }}>
        {children}
      </div>
    </GameCtx.Provider>
  );
}

export default function App() {
  const { state, dispatch, prefs, setPrefs } = useGame();
  const [dash, setDash] = useState(false);
  const [history, setHistory] = useState(false);
  const [settings, setSettings] = useState(false);
  const [guide, setGuide] = useState<'how' | 'tour' | null>(null);
  const { phase } = state;
  const inGame = gameInProgress(state) && !state.onHome;

  // Browsers only allow audio after a gesture.
  useEffect(() => {
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    return () => window.removeEventListener('pointerdown', unlockAudio);
  }, []);

  // Keep the screen awake during a game (phones love to lock mid-night).
  useEffect(() => {
    if (!inGame || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | undefined;
    const acquire = () =>
      navigator.wakeLock
        .request('screen')
        .then((l) => (lock = l))
        .catch(() => undefined);
    const onVisible = () => document.visibilityState === 'visible' && acquire();
    acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release();
    };
  }, [inGame]);

  let tone: Tone = 'neutral';
  if (!state.onHome) {
    if (NIGHT.includes(phase)) tone = 'night';
    else if (DAY.includes(phase)) tone = 'day';
  }

  let key: string = phase;
  let screen: ReactNode = null;
  if (state.onHome) {
    key = 'home';
    screen = <Home onHowTo={() => setGuide('how')} onSettings={() => setSettings(true)} />;
  } else if (state.locked && inGame) {
    key = `lock-${phase}`;
    screen = <GateScreen kicker={phase === 'MAYOR_HANDOFF' ? 'All identities assigned' : `Night ${state.round} awaits`} />;
  } else {
    switch (phase) {
      case 'MAYOR_SETUP':
        screen = <MayorSetup onTour={() => setGuide('tour')} />;
        break;
      case 'PLAYER_REGISTRATION':
        screen = <Registration />;
        break;
      case 'ROLE_ASSIGNMENT':
        screen = <RoleAssignment />;
        break;
      case 'PRIVATE_ROLE_REVEAL':
        key = `reveal-${state.revealId}`;
        screen = <RoleReveal />;
        break;
      case 'MAYOR_HANDOFF':
        screen = <MayorBriefing />;
        break;
      case 'NIGHT_START':
        key = `night-${state.round}`;
        screen = <NightStart />;
        break;
      case 'MAFIA_ACTION':
      case 'DOCTOR_ACTION':
      case 'POLICE_ACTION':
        key = `${phase}-${state.nightStep}`;
        screen = <NightAction />;
        break;
      case 'MORNING_ANNOUNCEMENT':
        key = `morning-${state.round}`;
        screen = <Morning />;
        break;
      case 'DISCUSSION':
        screen = <Discussion />;
        break;
      case 'VOTING':
      case 'RUNOFF_VOTING':
        key = `vote-${state.vote?.stage}-${state.round}`;
        screen = <Voting />;
        break;
      case 'VOTING_RESULTS':
        key = `results-${state.lastResult?.stage}`;
        screen = <VotingResults />;
        break;
      case 'ELIMINATION':
        screen = <Elimination />;
        break;
      case 'GAME_OVER':
        screen = <GameOver />;
        break;
      default:
        break; // HOME / VICTORY_CHECK never rest here
    }
  }

  const muted = !prefs.sfx && !prefs.voice;
  const setup = !state.onHome && (phase === 'MAYOR_SETUP' || phase === 'PLAYER_REGISTRATION');
  const showBar = !state.onHome && phase !== 'PRIVATE_ROLE_REVEAL';
  const secretTools = inGame && !state.locked;

  return (
    <MotionConfig reducedMotion="user">
      <div className="fixed inset-0 overflow-hidden">
        <Backdrop tone={tone} moon={!state.onHome && phase === 'NIGHT_START'} />
        <div className="relative mx-auto flex h-full w-full max-w-[460px] flex-col pt-[env(safe-area-inset-top)]">
          {showBar && (
            <header className="flex min-h-14 shrink-0 items-center justify-between px-3 pl-5">
              {setup ? (
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'GO_HOME' })}
                  className="-ml-3 flex min-h-11 items-center gap-1 rounded-full pr-3 pl-2 text-[15px] font-medium text-ivory/70 active:bg-white/10"
                >
                  <Icon name="back" className="size-5" />
                  Home
                </button>
              ) : (
                <div className="min-w-0">
                  <p className="text-[13px] font-extrabold tracking-[0.3em]">MAFIA</p>
                  {inGame && state.round > 0 && !state.locked && (
                    <p className="truncate text-[12px] text-ivory/50">
                      {roundLabel(state)} · {living(state).length} alive
                    </p>
                  )}
                </div>
              )}
              <div className="flex items-center">
                {secretTools && state.log.length > 0 && (
                  <IconBtn label="Game history" onClick={() => setHistory(true)}>
                    <Icon name="clock" className="size-5" />
                  </IconBtn>
                )}
                <IconBtn label={muted ? 'Unmute' : 'Mute'} onClick={() => setPrefs(muted ? { sfx: true } : { sfx: false, voice: false })}>
                  <Icon name={muted ? 'volumeOff' : 'volumeOn'} className="size-5" />
                </IconBtn>
                {secretTools && (
                  <IconBtn label="Mayor control center" onClick={() => setDash(true)}>
                    <Icon name="shield" className="size-5" />
                  </IconBtn>
                )}
              </div>
            </header>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={key}
              className="flex min-h-0 flex-1 flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
            >
              <Frozen>{screen}</Frozen>
            </motion.div>
          </AnimatePresence>
        </div>

        <Dashboard open={dash} onClose={() => setDash(false)} onSettings={() => setSettings(true)} onGuide={setGuide} />
        <HistorySheet open={history} onClose={() => setHistory(false)} state={state} />
        <HowToPlay open={guide === 'how'} onClose={() => setGuide(null)} onTour={() => setGuide('tour')} />
        <MayorTour open={guide === 'tour'} onClose={() => setGuide(null)} />
        <Settings open={settings} onClose={() => setSettings(false)} />

        <AnimatePresence>
          {state.paused && !state.onHome && (
            <motion.div
              className="fixed inset-0 z-[60] grid place-items-center bg-ink/95 px-6 backdrop-blur-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              role="alertdialog"
              aria-label="Game paused"
            >
              <div className="w-full max-w-xs space-y-6 text-center">
                <div className="mx-auto grid size-20 place-items-center rounded-full bg-white/8 ring-1 ring-white/12">
                  <Icon name="pause" className="size-9" />
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight">GAME PAUSED</h1>
                  <p className="mt-2 text-[16px] text-ivory/55">The city holds its breath.</p>
                </div>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'SET_PAUSED', paused: false, now: Date.now() })}
                  className="min-h-14 w-full rounded-2xl bg-ivory text-[17px] font-semibold text-ink active:scale-[0.98]"
                >
                  Resume game
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

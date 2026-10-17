import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { type NightActor, ACTOR_OF_PHASE, actorAlive, byId, checkWinner, living } from '../game/engine';
import { play, say, stopSpeaking } from '../audio';
import { useGame } from '../store';
import { Btn, Heading, Icon, Page, PlayerCard, Say, cn } from '../ui/kit';
import { ROLE_UI, RoleIcon } from '../ui/roles';

// ───────────────────────────── night start ─────────────────────────────

export function NightStart() {
  const { state, dispatch, prefs } = useGame();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    play('night');
    say('The city sleeps.');
    return stopSpeaking;
  }, []);

  useEffect(() => {
    if (count === null) return;
    if (count === 0) {
      dispatch({ type: 'OPEN_NIGHT' });
      return;
    }
    const t = setTimeout(() => {
      play('tick');
      setCount(count - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [count, dispatch]);

  return (
    <>
      <Page
        center
        footer={
          <>
            <Btn onClick={() => (prefs.countdown ? setCount(5) : dispatch({ type: 'OPEN_NIGHT' }))}>
              <Icon name="moon" className="size-5" />
              Begin the Night
            </Btn>
          </>
        }
      >
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1 }} className="space-y-8">
          <Heading xl kicker="Mayor narration" title={<>NIGHT {state.round}</>} sub="The city falls silent." />
          <Say>Everyone, close your eyes.</Say>
        </motion.div>
      </Page>
      <AnimatePresence>
        {count !== null && (
          <motion.button
            type="button"
            aria-label="Skip countdown"
            onClick={() => setCount(0)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 grid place-items-center bg-black/85 backdrop-blur-sm"
          >
            <div className="text-center">
              <p className="mb-6 text-lg tracking-wide text-ivory/70">Everyone, close your eyes…</p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={count}
                  initial={{ opacity: 0, scale: 1.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[8rem] leading-none font-black tabular-nums"
                >
                  {count}
                </motion.p>
              </AnimatePresence>
              <p className="mt-6 text-sm text-ivory/40">Tap to skip</p>
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}

// ───────────────────────────── night actions ─────────────────────────────

const ACTORS: Record<
  NightActor,
  {
    stepNo: number;
    wake: string;
    close: string;
    sayOpen: string;
    sayClose: string;
    question: string;
    hint: string;
    speakWake: string;
    speakClose: string;
    next: string;
    confirm: string;
  }
> = {
  mafia: {
    stepNo: 1,
    wake: 'MAFIA, WAKE UP',
    close: 'MAFIA, CLOSE YOUR EYES',
    sayOpen: 'Mafia, open your eyes.',
    sayClose: 'Mafia, close your eyes.',
    question: 'Who will the Mafia kill?',
    hint: 'The Mafia silently points. Tap the name they choose.',
    speakWake: 'Mafia, wake up.',
    speakClose: 'Mafia, close your eyes.',
    next: 'Continue to Doctor',
    confirm: 'Confirm target',
  },
  doctor: {
    stepNo: 2,
    wake: 'DOCTOR, WAKE UP',
    close: 'DOCTOR, CLOSE YOUR EYES',
    sayOpen: 'Doctor, open your eyes.',
    sayClose: 'Doctor, close your eyes.',
    question: 'Who will the Doctor save?',
    hint: 'The Doctor may protect themselves. Tap the name they point at.',
    speakWake: 'Doctor, wake up.',
    speakClose: 'Doctor, close your eyes.',
    next: 'Continue to Police',
    confirm: 'Confirm protection',
  },
  police: {
    stepNo: 3,
    wake: 'POLICE, WAKE UP',
    close: 'POLICE, CLOSE YOUR EYES',
    sayOpen: 'Police, open your eyes.',
    sayClose: 'Police, close your eyes.',
    question: 'Who will the Police investigate?',
    hint: 'The Police silently points. Tap the name, then show them the result.',
    speakWake: 'Police, wake up.',
    speakClose: 'Police, close your eyes.',
    next: 'End Night',
    confirm: 'Lock in investigation',
  },
};
const ROLE_FOR = { mafia: 'MAFIA', doctor: 'DOCTOR', police: 'POLICE' } as const;

export function NightAction() {
  const { state, dispatch } = useGame();
  const who = ACTOR_OF_PHASE[state.phase]!;
  const a = ACTORS[who];
  const role = ROLE_FOR[who];
  const r = ROLE_UI[role];
  const alive = actorAlive(state, who);
  const step = state.nightStep;
  const picked = state.night[who];

  useEffect(() => {
    say(step === 'wake' ? a.speakWake : a.speakClose);
    return stopSpeaking;
  }, [step, who, a.speakWake, a.speakClose]);

  const candidates = living(state).filter((p) => (who === 'mafia' ? p.role !== 'MAFIA' : who === 'police' ? p.role !== 'POLICE' : true));
  const header = (
    <div className="mb-5 flex items-center justify-center gap-2 text-[12px] font-semibold tracking-[0.18em] text-ivory/45 uppercase">
      <Icon name="eye" className="size-4" />
      Mayor only · Night {state.round} · Step {a.stepNo} of 3
    </div>
  );

  if (step === 'sleep') {
    return (
      <Page
        center
        footer={
          <>
            <Btn tone={r.tone} onClick={() => dispatch({ type: 'NIGHT_NEXT' })}>
              {a.next}
            </Btn>
            <Btn variant="ghost" small onClick={() => dispatch({ type: 'NIGHT_BACK' })}>
              {alive ? 'Change choice' : 'Back'}
            </Btn>
          </>
        }
      >
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          {header}
          <div className={cn('mx-auto mb-6 grid size-24 place-items-center rounded-full opacity-60 ring-1', r.bg, r.ring, r.text)}>
            <RoleIcon role={role} className="size-12" />
          </div>
          <Heading title={a.close} titleClass={r.text} sub={alive ? 'Choice locked in.' : undefined} />
          <div className="mt-8">
            <Say>{a.sayClose}</Say>
          </div>
        </motion.div>
      </Page>
    );
  }

  // wake step
  if (!alive) {
    return (
      <Page
        center
        footer={
          <>
            <Btn tone={r.tone} onClick={() => dispatch({ type: 'NIGHT_NEXT' })}>
              {r.name}, close your eyes
            </Btn>
            <Btn variant="ghost" small onClick={() => dispatch({ type: 'NIGHT_BACK' })}>
              Back
            </Btn>
          </>
        }
      >
        {header}
        <Heading title={a.wake} titleClass={r.text} />
        <div className="mt-6 space-y-4">
          <Say>{a.sayOpen}</Say>
          <div className="mx-auto max-w-sm rounded-2xl bg-white/5 p-4 text-center ring-1 ring-white/8">
            <p className="font-semibold">The {r.name} is no longer in the game.</p>
            <p className="mt-1 text-[14px] leading-snug text-ivory/55">
              Narrate as normal and pause a few seconds, so nobody can tell. Dead players never act and their role stays hidden.
            </p>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page
      footer={
        <>
          {who === 'police' && picked && (
            <PoliceResult key={picked} isMafia={!!state.night.policeIsMafia} name={byId(state, picked)?.name ?? ''} />
          )}
          <Btn tone={r.tone} disabled={!picked} onClick={() => dispatch({ type: 'NIGHT_NEXT' })}>
            {who === 'police' ? 'Police, close your eyes' : a.confirm}
          </Btn>
          <Btn variant="ghost" small onClick={() => dispatch({ type: 'NIGHT_BACK' })}>
            Back
          </Btn>
        </>
      }
    >
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        {header}
        <Heading title={a.wake} titleClass={r.text} />
        <Say>{a.sayOpen}</Say>
        <div>
          <h2 className="text-center text-xl font-bold">{a.question}</h2>
          <p className="mx-auto mt-1 max-w-[34ch] text-center text-[14px] text-ivory/50">{a.hint}</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {candidates.map((p) => (
            <PlayerCard
              key={p.id}
              compact
              name={p.name}
              tone={r.tone}
              state={picked === p.id ? 'selected' : 'idle'}
              onClick={() => dispatch({ type: 'PICK_TARGET', who, id: p.id })}
            />
          ))}
        </div>
      </motion.div>
    </Page>
  );
}

/** Result is visible only while a finger is held down, so it can't be read from across the table. */
function PoliceResult({ isMafia, name }: { isMafia: boolean; name: string }) {
  const [peek, setPeek] = useState(false);
  const off = () => setPeek(false);
  return (
    <div className="space-y-2 rounded-2xl bg-police/10 p-2.5 ring-1 ring-police/30">
      <div className="grid min-h-[4.5rem] place-items-center rounded-xl bg-black/35 px-3 text-center" role="status">
        {peek ? (
          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}>
            <p className={cn('text-[1.7rem] leading-none font-black tracking-tight', isMafia ? 'text-mafia-hi' : 'text-ivory')}>
              {isMafia ? 'MAFIA DETECTED' : 'NOT THE MAFIA'}
            </p>
            <p className="mt-1.5 text-[13px] text-ivory/55">{isMafia ? 'Silent signal: thumbs-up' : 'Silent signal: thumbs-down'}</p>
          </motion.div>
        ) : (
          <p className="text-[14px] text-ivory/50">
            Investigating <b className="font-semibold text-ivory/80">{name}</b> — result hidden
          </p>
        )}
      </div>
      <button
        type="button"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture?.(e.pointerId);
          setPeek(true);
        }}
        onPointerUp={off}
        onPointerCancel={off}
        onLostPointerCapture={off}
        onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && setPeek(true)}
        onKeyUp={off}
        onBlur={off}
        onContextMenu={(e) => e.preventDefault()}
        style={{ touchAction: 'none' }}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-police text-[16px] font-semibold text-white active:bg-police/80"
      >
        <Icon name="eye" className="size-5" />
        Hold to see result
      </button>
    </div>
  );
}

// ───────────────────────────── morning ─────────────────────────────

export function Morning() {
  const { state, dispatch, timerMs } = useGame();
  const [stage, setStage] = useState<'idle' | 'building' | 'revealed'>('idle');
  const night = state.nights.find((n) => n.round === state.round);
  const victim = byId(state, night?.victimId);
  const winner = checkWinner(state);

  useEffect(() => {
    play('dawn');
    say('City, wake up.');
    return stopSpeaking;
  }, []);

  useEffect(() => {
    if (stage !== 'building') return;
    play('suspense');
    const t = setTimeout(() => {
      play('reveal');
      setStage('revealed');
    }, 2800);
    return () => clearTimeout(t);
  }, [stage]);

  return (
    <Page
      center
      footer={
        stage === 'revealed' ? (
          <>
            <Btn onClick={() => dispatch({ type: 'MORNING_NEXT', timerMs })}>{winner ? 'See the Verdict' : 'Begin Discussion'}</Btn>
          </>
        ) : (
          <Btn disabled={stage === 'building'} onClick={() => setStage('building')}>
            {stage === 'building' ? 'Listen…' : 'Reveal the Night'}
          </Btn>
        )
      }
    >
      <AnimatePresence mode="wait">
        {stage !== 'revealed' ? (
          <motion.div
            key="pre"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <Heading xl kicker="The sun rises over the city" title={<>DAY {state.round}</>} />
            <Say>City, wake up.</Say>
            {stage === 'building' && (
              <div className="flex justify-center gap-2" aria-label="Revealing">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="size-2.5 rounded-full bg-ivory"
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ repeat: Infinity, duration: 1.1, delay: i * 0.25 }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        ) : victim ? (
          <motion.div
            key="dead"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="space-y-7 text-center"
            role="status"
          >
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 12, delay: 0.15 }}
              className="mx-auto grid size-24 place-items-center rounded-full bg-mafia/15 text-mafia-hi ring-2 ring-mafia/50 shadow-[0_0_70px_6px_rgba(196,40,60,0.35)]"
            >
              <Icon name="skull" className="size-11" />
            </motion.div>
            <div>
              <motion.p
                initial={{ opacity: 0, scale: 1.25, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                transition={{ delay: 0.35, duration: 0.9 }}
                className="text-[clamp(2.6rem,13vw,4rem)] leading-none font-black tracking-tight break-words text-mafia-hi uppercase"
              >
                {victim.name}
              </motion.p>
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-4 text-2xl font-extrabold tracking-tight"
              >
                WAS KILLED LAST NIGHT
              </motion.h1>
            </div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="text-[17px] text-ivory/60">
              Another life has been lost.
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            key="safe"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="space-y-7 text-center"
            role="status"
          >
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 12, delay: 0.15 }}
              className="mx-auto grid size-24 place-items-center rounded-full bg-day/12 text-day ring-2 ring-day/40 shadow-[0_0_70px_6px_rgba(240,183,101,0.25)]"
            >
              <Icon name="sun" className="size-11" />
            </motion.div>
            <h1 className="text-[2.2rem] leading-tight font-black tracking-tight">NO ONE DIED LAST NIGHT</h1>
            <p className="text-[17px] text-ivory/60">Someone survived the darkness.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  );
}

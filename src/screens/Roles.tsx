import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { byId, composition } from '../game/engine';
import { play, buzz } from '../audio';
import { useGame } from '../store';
import { Btn, Chip, Heading, HoldButton, Icon, Page, PlayerCard, Say } from '../ui/kit';
import { ROLE_UI, RoleIcon } from '../ui/roles';

/** Grid of names: each player taps their own, in turn. */
export function RoleAssignment() {
  const { state, dispatch } = useGame();
  const done = state.players.filter((p) => p.roleViewed).length;
  const total = state.players.length;

  if (done === total) {
    return (
      <Page center footer={<Btn onClick={() => dispatch({ type: 'TO_MAYOR' })}>Hand Phone to Mayor</Btn>}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="space-y-6 text-center"
        >
          <div className="mx-auto grid size-20 place-items-center rounded-full bg-doctor/15 text-doctor-hi ring-1 ring-doctor/40">
            <Icon name="check" className="size-10" />
          </div>
          <Heading kicker="Every player has a secret" title="ALL IDENTITIES ASSIGNED" sub="The city is ready." />
          <p className="text-[15px] text-ivory/50">Pass the phone to {state.mayorName}. Nobody else should look at the screen.</p>
        </motion.div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="space-y-6 pt-1">
        <Heading kicker="Secret roles" title="DISCOVER YOUR IDENTITY" sub="Pass the phone to the next player." />
        <div className="flex justify-center">
          <Chip>
            {done} / {total} identities secured
          </Chip>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {state.players.map((p) => (
            <PlayerCard
              key={p.id}
              compact
              name={p.name}
              state={p.roleViewed ? 'done' : 'idle'}
              note={p.roleViewed ? 'Identity secured' : undefined}
              onClick={() => dispatch({ type: 'PICK_REVEAL', id: p.id })}
            />
          ))}
        </div>
        <p className="text-center text-[13px] text-ivory/40">Tap only your own name. Roles can’t be viewed twice.</p>
      </div>
    </Page>
  );
}

/** One player's private moment: confirm → hold to reveal → hide → secured. */
export function RoleReveal() {
  const { state, dispatch } = useGame();
  const player = byId(state, state.revealId);
  const [shown, setShown] = useState(false);

  // A role must never stay on screen if the app is backgrounded or the phone locks.
  useEffect(() => {
    const hide = () => document.hidden && setShown(false);
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', hide);
    return () => {
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', hide);
    };
  }, []);

  if (!player?.role) return null;
  const r = ROLE_UI[player.role];

  if (player.roleViewed) {
    return (
      <Page center footer={<Btn onClick={() => dispatch({ type: 'CLOSE_REVEAL' })}>Done</Btn>}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 text-center">
          <div className="mx-auto grid size-20 place-items-center rounded-full bg-white/8 ring-1 ring-white/12">
            <Icon name="lock" className="size-9" />
          </div>
          <Heading title="Identity secured." sub="Pass the phone to the next player." />
        </motion.div>
      </Page>
    );
  }

  if (!shown) {
    return (
      <Page
        center
        footer={
          <>
            <HoldButton
              label={
                <>
                  <Icon name="eye" className="size-6" />
                  Hold to Reveal
                </>
              }
              onComplete={() => {
                setShown(true);
                play('reveal');
                buzz([30, 40, 30]);
              }}
            />
            <Btn variant="ghost" small onClick={() => dispatch({ type: 'CLOSE_REVEAL' })}>
              That’s not me
            </Btn>
          </>
        }
      >
        <Heading kicker="Private screen" title={<>Are you {player.name}?</>} sub="Make sure nobody else can see your screen." />
      </Page>
    );
  }

  return (
    <>
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: `radial-gradient(70% 45% at 50% 38%, ${r.glow}40, transparent 72%)` }}
        aria-hidden
      />
      <Page
        center
        footer={
          <Btn
            onClick={() => {
              setShown(false);
              dispatch({ type: 'FINISH_REVEAL' });
            }}
          >
            Hide My Role
          </Btn>
        }
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, filter: 'blur(12px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
          className="relative space-y-6 text-center"
          role="status"
          aria-live="polite"
        >
          <p className="text-xs font-semibold tracking-[0.3em] text-ivory/50 uppercase">{player.name}, your secret identity</p>
          <motion.div
            initial={{ scale: 0.6, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 14, stiffness: 140, delay: 0.1 }}
            className={`mx-auto grid size-40 place-items-center rounded-full ring-2 ${r.bg} ${r.ring} ${r.text}`}
            style={{ boxShadow: `0 0 80px 8px ${r.glow}40` }}
          >
            <RoleIcon role={player.role} className="size-24" />
          </motion.div>
          <div>
            <h1 className={`text-[2rem] leading-tight font-black tracking-tight ${r.text}`}>{r.title}</h1>
            <p className="mx-auto mt-3 max-w-[26ch] text-[19px] leading-snug text-ivory/85">{r.blurb}</p>
          </div>
          <p className="mx-auto max-w-[32ch] text-[14px] leading-snug text-ivory/50">{r.duty}</p>
          {player.role !== 'CITIZEN' && <p className="text-[13px] text-ivory/40">The Mayor will wake you at night.</p>}
        </motion.div>
      </Page>
    </>
  );
}

/** Mayor-only briefing once every identity is handed out. */
export function MayorBriefing() {
  const { state, dispatch } = useGame();
  const c = composition(state.players.length);
  return (
    <Page
      center
      footer={
        <Btn onClick={() => dispatch({ type: 'START_FIRST_NIGHT' })}>
          <Icon name="moon" className="size-5" />
          Begin Night 1
        </Btn>
      }
    >
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <Heading
          kicker="Mayor briefing"
          title={<>Welcome back, {state.mayorName}.</>}
          sub={`${state.players.length} players each hold a secret.`}
        />
        <p className="-mt-3 text-center text-[15px] font-medium text-ivory/65">
          <span className="whitespace-nowrap text-mafia-hi">{c.mafia} Mafia</span> ·{' '}
          <span className="whitespace-nowrap text-doctor-hi">{c.doctor} Doctor</span> ·{' '}
          <span className="whitespace-nowrap text-police-hi">{c.police} Police</span> ·{' '}
          <span className="whitespace-nowrap text-citizen">{c.citizens} Citizens</span>
        </p>
        <ul className="space-y-2.5 text-[15px] leading-snug text-ivory/70">
          {[
            ['shield', 'The shield icon (top right) opens your Control Center: who is who, night choices, corrections.'],
            ['moon', 'Night: say each line aloud, then tap the player the secret role points at.'],
            ['vote', 'Day: the phone goes in the middle of the table for secret voting.'],
          ].map(([icon, text]) => (
            <li key={text} className="flex gap-3 rounded-2xl bg-white/5 p-3.5 ring-1 ring-white/8">
              <Icon name={icon as 'shield'} className="mt-0.5 size-5 shrink-0 text-ivory/60" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
        <Say>The city sleeps. Everyone, close your eyes.</Say>
      </motion.div>
    </Page>
  );
}

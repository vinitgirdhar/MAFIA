import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Role } from '../game/engine';
import { useGame } from '../store';
import { Btn, Icon, type IconName, Reveal, Sheet, Toggle, cn } from './kit';
import { TimeRuler } from './TimeRuler';
import { ROLE_UI, RoleBadge } from './roles';

const ROLE_LINE: Record<Role, string> = {
  MAFIA: 'Kills one person each night',
  DOCTOR: 'Saves one person each night',
  POLICE: 'Checks if someone is Mafia',
  CITIZEN: 'Talks, votes, finds the Mafia',
};

const ROUNDS: { icon: IconName; title: string; line: string }[] = [
  { icon: 'moon', title: 'Night', line: 'Eyes closed' },
  { icon: 'sun', title: 'Day', line: 'Talk it out' },
  { icon: 'vote', title: 'Vote', line: 'Most votes out' },
];

export function HowToPlay({ open, onClose, onTour }: { open: boolean; onClose: () => void; onTour: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="How to Play">
      <div className="space-y-4 pb-1">
        <Reveal>
          <p className="text-center text-[16px] leading-snug text-ivory/80">
            One phone. One <b>Mayor</b> runs the game. Everyone else hides a secret role.
          </p>
        </Reveal>

        <div className="grid grid-cols-2 gap-2">
          {(['MAFIA', 'DOCTOR', 'POLICE', 'CITIZEN'] as const).map((r, i) => (
            <Reveal key={r} delay={0.08 + i * 0.07} y={12}>
              <div className="flex h-full items-center gap-2.5 rounded-2xl bg-white/5 p-2.5 ring-1 ring-white/8">
                <RoleBadge role={r} size="size-11" />
                <div className="min-w-0">
                  <p className={cn('text-[15px] leading-tight font-bold', ROLE_UI[r].text)}>{ROLE_UI[r].name}</p>
                  <p className="text-[12.5px] leading-snug text-ivory/60">{ROLE_LINE[r]}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-1.5">
          {ROUNDS.flatMap((r, i) => [
            <Reveal key={r.title} delay={0.4 + i * 0.1} y={12}>
              <div className="flex flex-col items-center gap-1 rounded-2xl bg-white/5 px-1.5 py-2.5 text-center ring-1 ring-white/8">
                <Icon name={r.icon} className="size-5 text-night" />
                <p className="text-[14px] leading-none font-bold">{r.title}</p>
                <p className="text-[11.5px] leading-tight text-ivory/55">{r.line}</p>
              </div>
            </Reveal>,
            i < ROUNDS.length - 1 ? <Icon key={`a${i}`} name="back" className="size-3.5 self-center rotate-180 text-ivory/30" /> : null,
          ])}
        </div>

        <Reveal delay={0.75} className="space-y-1.5">
          <p className="rounded-2xl bg-day/8 px-3.5 py-2.5 text-[14.5px] ring-1 ring-day/25">
            <b className="text-day">City wins</b> <span className="text-ivory/70">when the Mafia is voted out.</span>
          </p>
          <p className="rounded-2xl bg-mafia/10 px-3.5 py-2.5 text-[14.5px] ring-1 ring-mafia/30">
            <b className="text-mafia-hi">Mafia wins</b> <span className="text-ivory/70">when only one innocent is left.</span>
          </p>
        </Reveal>

        <Reveal delay={0.9}>
          <Btn
            variant="secondary"
            small
            onClick={() => {
              onClose();
              onTour();
            }}
          >
            <Icon name="info" className="size-4" />
            Mayor’s tour: what to say
          </Btn>
        </Reveal>
      </div>
    </Sheet>
  );
}

const TOUR: { icon: IconName; title: string; body: string; say?: string[] }[] = [
  {
    icon: 'shield',
    title: 'You’re the Mayor',
    body: 'You host. You never get a role, vote or die. You narrate in the dark and tap names on the phone for everyone else. Guard the phone — it holds every secret.',
  },
  {
    icon: 'plus',
    title: 'Add the players',
    body: 'Enter everyone’s name except yours (4–20 players). The app shuffles roles at random: always one Mafia, one Doctor, one Police, the rest Citizens.',
  },
  {
    icon: 'lock',
    title: 'Pass the phone around',
    body: 'Each player taps their own name, presses and holds to see their role, then hides it. Nobody can view a role twice. When all are done, the phone returns to you.',
  },
  {
    icon: 'moon',
    title: 'Night: say these lines',
    body: 'Read each line, then tap the player the secret role points at. Tap Confirm, then close their eyes.',
    say: [
      'Everyone, close your eyes.',
      'Mafia, open your eyes. … Mafia, close your eyes.',
      'Doctor, open your eyes. … Doctor, close your eyes.',
    ],
  },
  {
    icon: 'eye',
    title: 'The Police’s answer',
    body: 'After the Police points, press and hold “Hold to see result”. Answer silently: thumbs-up for Mafia, thumbs-down for not. Nothing is ever spoken aloud.',
    say: ['Police, open your eyes. … Police, close your eyes.'],
  },
  {
    icon: 'skull',
    title: 'Dead roles keep waking',
    body: 'If the Doctor or Police is out, keep the routine anyway and pause a few seconds. Their roles are secret, so the table must not be able to tell.',
  },
  {
    icon: 'sun',
    title: 'Morning',
    body: 'Read the line, then reveal the night on the phone. It shows who died or that no one did. It never shows who was saved.',
    say: ['City, wake up.'],
  },
  {
    icon: 'vote',
    title: 'Discuss, then vote',
    body: 'Start the optional timer. When you proceed to voting, set the phone in the middle: each living player taps their name and votes in secret. You count the votes with your passcode.',
  },
  {
    icon: 'rewind',
    title: 'Made a mistake?',
    body: 'The shield icon opens your Control Center: peek at roles, review night choices, let someone re-vote, step back or rewind. Replayed phases are always rebuilt cleanly.',
  },
];

export function MayorTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { setPrefs } = useGame();
  const [i, setI] = useState(0);
  const step = TOUR[i];
  const last = i === TOUR.length - 1;
  const close = () => {
    setPrefs({ tourSeen: true });
    setI(0);
    onClose();
  };
  return (
    <Sheet open={open} onClose={close} title="Mayor’s tour" tall>
      <div className="flex h-full min-h-[26rem] flex-col">
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22 }}
              className="space-y-5 pt-4 text-center"
            >
              <div className="mx-auto grid size-20 place-items-center rounded-full bg-night/12 text-night ring-1 ring-night/30">
                <Icon name={step.icon} className="size-9" />
              </div>
              <h3 className="text-2xl font-extrabold tracking-tight">{step.title}</h3>
              <p className="mx-auto max-w-[34ch] text-[16.5px] leading-snug text-ivory/70">{step.body}</p>
              {step.say && (
                <div className="mx-auto max-w-sm space-y-2 text-left">
                  {step.say.map((s) => (
                    <p key={s} className="rounded-2xl bg-white/5 px-4 py-3 text-[16px] text-ivory/90 italic ring-1 ring-white/8">
                      “{s}”
                    </p>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="mt-6 flex items-center justify-center gap-1.5" aria-label={`Step ${i + 1} of ${TOUR.length}`}>
          {TOUR.map((_, k) => (
            <span key={k} className={cn('h-1.5 rounded-full transition-all', k === i ? 'w-6 bg-ivory' : 'w-1.5 bg-white/25')} />
          ))}
        </div>
        <div className="mt-5 grid grid-cols-[1fr_2fr] gap-2.5">
          <Btn variant="secondary" disabled={i === 0} onClick={() => setI(i - 1)}>
            Back
          </Btn>
          <Btn onClick={() => (last ? close() : setI(i + 1))}>{last ? 'Got it' : 'Next'}</Btn>
        </div>
      </div>
    </Sheet>
  );
}

export function Settings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { prefs, setPrefs } = useGame();
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
  return (
    <Sheet open={open} onClose={onClose} title="Settings">
      <div className="space-y-2.5 pb-2">
        <Toggle on={prefs.sfx} onChange={(v) => setPrefs({ sfx: v })} label="Sound effects" hint="Atmosphere, reveals and vibration" />
        <Toggle
          on={prefs.voice && canSpeak}
          onChange={(v) => setPrefs({ voice: v })}
          label="Voice narration"
          hint={canSpeak ? 'Speaks fixed lines like “Mafia, wake up.” Never names or results' : 'Not supported on this browser'}
        />
        <Toggle
          on={prefs.countdown}
          onChange={(v) => setPrefs({ countdown: v })}
          label="Night countdown"
          hint="5-second “close your eyes” countdown"
        />
        <div className="rounded-2xl bg-white/5 px-4 pt-4 pb-3 ring-1 ring-white/8">
          <p className="mb-1 text-center text-[16px] font-medium">Default discussion timer</p>
          <TimeRuler value={prefs.discussionMin} onChange={(m) => setPrefs({ discussionMin: m })} />
        </div>
        <p className="px-1 pt-2 text-center text-[12.5px] leading-snug text-ivory/40">
          Animations follow your device’s “reduce motion” setting. Everything is stored on this device only.
        </p>
        <Btn variant="secondary" onClick={onClose}>
          Done
        </Btn>
      </div>
    </Sheet>
  );
}

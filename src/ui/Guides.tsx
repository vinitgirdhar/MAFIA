import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Role } from '../game/engine';
import { useGame } from '../store';
import { Btn, Icon, type IconName, Sheet, Toggle, cn } from './kit';
import { ROLE_UI, RoleBadge } from './roles';

const ROLE_TEXT: Record<Role, string> = {
  MAFIA: 'Secretly kills one player every night. Wins by outnumbering the innocents — with one Mafia, that means only one innocent left.',
  DOCTOR: 'Secretly protects one player every night, themselves included. If the Mafia picked that person, nobody dies.',
  POLICE:
    'Secretly investigates one player every night and privately learns whether they are the Mafia. Must persuade the others — carefully.',
  CITIZEN: 'No night power. Listen, accuse, defend and vote. Citizens, Doctor and Police are one team.',
};

export function HowToPlay({ open, onClose, onTour }: { open: boolean; onClose: () => void; onTour: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="How to Play" tall>
      <div className="space-y-8 pb-4">
        <div className="text-center">
          <p className="text-[17px] leading-snug text-ivory/80">
            One phone. One <b>Mayor</b> who runs the game. Everyone else is hiding a role. Find the killer before the city falls.
          </p>
        </div>

        <section className="space-y-2.5">
          <h3 className="text-[12px] font-semibold tracking-[0.2em] text-ivory/50 uppercase">The roles</h3>
          {(['MAFIA', 'DOCTOR', 'POLICE', 'CITIZEN'] as const).map((r) => (
            <div key={r} className="flex gap-3.5 rounded-2xl bg-white/5 p-3.5 ring-1 ring-white/8">
              <RoleBadge role={r} size="size-14" />
              <div className="min-w-0">
                <p className={cn('text-[17px] leading-tight font-bold', ROLE_UI[r].text)}>{ROLE_UI[r].name}</p>
                {r !== 'CITIZEN' && <p className="text-[12px] font-medium text-ivory/40">Exactly one in every game</p>}
                <p className="mt-0.5 text-[14.5px] leading-snug text-ivory/65">{ROLE_TEXT[r]}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-2.5">
          <h3 className="text-[12px] font-semibold tracking-[0.2em] text-ivory/50 uppercase">Every round</h3>
          {[
            [
              'moon',
              'Night',
              'Everyone closes their eyes. The Mayor wakes the Mafia, then the Doctor, then the Police — each silently points at a player.',
            ],
            [
              'sun',
              'Morning',
              'The city wakes. The Mayor announces who died — or that no one did. Nobody learns who was saved or investigated.',
            ],
            ['vote', 'Discussion', 'Talk, accuse, defend, bluff. Dead players are out and their roles stay secret.'],
            [
              'check',
              'Vote',
              'The phone goes in the middle. Each living player votes in secret. Most votes is eliminated. A tie triggers a runoff; a tied runoff means nobody goes.',
            ],
          ].map(([icon, title, body], i) => (
            <div key={title} className="flex gap-3 rounded-2xl bg-white/5 p-3.5 ring-1 ring-white/8">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-bold">{i + 1}</span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-bold">
                  <Icon name={icon as IconName} className="size-4 text-ivory/60" />
                  {title}
                </p>
                <p className="mt-0.5 text-[14.5px] leading-snug text-ivory/65">{body}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-2.5">
          <h3 className="text-[12px] font-semibold tracking-[0.2em] text-ivory/50 uppercase">How it ends</h3>
          <div className="grid gap-2.5">
            <div className="rounded-2xl bg-day/8 p-3.5 ring-1 ring-day/25">
              <p className="font-bold text-day">The city wins</p>
              <p className="text-[14.5px] text-ivory/65">The moment the Mafia is voted out. The game stops right there.</p>
            </div>
            <div className="rounded-2xl bg-mafia/10 p-3.5 ring-1 ring-mafia/30">
              <p className="font-bold text-mafia-hi">The Mafia wins</p>
              <p className="text-[14.5px] text-ivory/65">
                When living innocents are no more than living Mafia — in practice, the Mafia and one innocent are all that’s left.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-1.5 text-[14px] leading-snug text-ivory/55">
          <h3 className="text-[12px] font-semibold tracking-[0.2em] text-ivory/50 uppercase">Good to know</h3>
          <p>• 4 to 20 players, plus the Mayor, who never plays or votes.</p>
          <p>• Roles are random and revealed one person at a time by press-and-hold.</p>
          <p>• Your game is saved automatically — refreshing or locking the phone is safe.</p>
          <p>• Works offline once loaded. Browsers can’t block screenshots, so keep screens covered.</p>
        </section>

        <Btn
          variant="secondary"
          onClick={() => {
            onClose();
            onTour();
          }}
        >
          <Icon name="info" className="size-5" />
          Mayor’s tour: what to say
        </Btn>
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
        <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/8">
          <p className="text-[16px] font-medium">Default discussion timer</p>
          <div className="mt-2.5 grid grid-cols-4 gap-2" role="radiogroup" aria-label="Default discussion timer">
            {([2, 3, 5, 0] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={prefs.discussionMin === m}
                onClick={() => setPrefs({ discussionMin: m })}
                className={cn(
                  'min-h-11 rounded-xl text-[14px] font-semibold ring-1 transition',
                  prefs.discussionMin === m ? 'bg-ivory text-ink ring-ivory' : 'bg-white/6 ring-white/10 active:bg-white/12',
                )}
              >
                {m === 0 ? '∞' : `${m} min`}
              </button>
            ))}
          </div>
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

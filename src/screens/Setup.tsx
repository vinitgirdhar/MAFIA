import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  dealRoles,
  composition,
  gameInProgress,
  living,
  MAX_NAME,
  MAX_PLAYERS,
  MIN_PLAYERS,
  nameTaken,
  normalizeName,
  roundLabel,
} from '../game/engine';
import { play, unlockAudio } from '../audio';
import { useInstall } from '../pwa';
import { uid, useGame } from '../store';
import { Btn, Chip, Confirm, EASE, Heading, Icon, IconBtn, Letters, Page, Reveal, Sheet, Skyline, Toggle, cn } from '../ui/kit';

// ───────────────────────────── home ─────────────────────────────

export function Home({ onHowTo, onSettings }: { onHowTo: () => void; onSettings: () => void }) {
  const { state, dispatch } = useGame();
  const install = useInstall();
  const [confirmNew, setConfirmNew] = useState(false);
  const resumable = gameInProgress(state);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-[8%] right-[14%] size-11 rounded-full bg-[radial-gradient(circle_at_35%_35%,#fffdf4,#d3dbef_55%,#8f9cc0)] shadow-[0_0_50px_12px_rgba(150,175,255,0.2)]"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 0.9, y: 0 }}
        transition={{ duration: 2.4, ease: EASE, delay: 0.3 }}
      >
        <span className="absolute inset-0 animate-float rounded-full" />
      </motion.div>
      <motion.div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[44%]"
        initial={{ y: 70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1.8, ease: EASE }}
      >
        <Skyline
          className="size-full opacity-80"
          style={{
            WebkitMaskImage:
              'linear-gradient(to top, transparent 2%, black 48%), linear-gradient(to right, transparent, black 14%, black 86%, transparent)',
            maskImage:
              'linear-gradient(to top, transparent 2%, black 48%), linear-gradient(to right, transparent, black 14%, black 86%, transparent)',
            WebkitMaskComposite: 'source-in',
            maskComposite: 'intersect',
          }}
        />
      </motion.div>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <Page
          center
          footer={
            <>
              {resumable && (
                <Btn variant="secondary" tone="ivory" onClick={() => dispatch({ type: 'RESUME' })} className="!justify-between">
                  <span className="flex items-center gap-2">
                    <Icon name="play" className="size-5" />
                    Resume Game
                  </span>
                  <span className="text-sm font-medium text-ivory/55">
                    {roundLabel(state)} · {living(state).length} alive
                  </span>
                </Btn>
              )}
              <Btn
                onClick={() => {
                  unlockAudio();
                  if (resumable) setConfirmNew(true);
                  else dispatch({ type: 'NEW_GAME' });
                }}
              >
                Create New Game
              </Btn>
              <Btn variant="secondary" onClick={onHowTo}>
                <Icon name="book" className="size-5" />
                How to Play
              </Btn>
              <div className="flex items-center justify-center gap-1 pt-1">
                <IconBtn label="Settings" onClick={onSettings}>
                  <Icon name="sliders" className="size-5" />
                </IconBtn>
                {install && (
                  <IconBtn label="Install app" onClick={install}>
                    <Icon name="download" className="size-5" />
                  </IconBtn>
                )}
              </div>
            </>
          }
        >
          <div className="text-center">
            <h1 className="pl-[0.1em] text-[clamp(3rem,18.5vw,5rem)] leading-none font-black tracking-[0.1em]">
              <Letters text="MAFIA" delay={0.25} letterClass="bg-gradient-to-b from-ivory to-ivory/45 bg-clip-text text-transparent" />
            </h1>
            <Reveal delay={0.95} y={10}>
              <p className="mt-4 pl-[0.4em] text-[clamp(0.85rem,4.2vw,1.1rem)] font-light tracking-[0.4em] text-night uppercase">
                The City Sleeps
              </p>
            </Reveal>
            <Reveal delay={1.25}>
              <p className="mx-auto mt-10 max-w-[30ch] text-[17px] leading-snug text-balance text-ivory/60">
                “One city. One killer. Trust no one.”
              </p>
              <p className="mt-2 text-sm font-medium tracking-wide text-ivory/35">Everyone has a role. Someone is lying.</p>
            </Reveal>
          </div>
        </Page>
      </div>
      <Confirm
        open={confirmNew}
        danger
        title="Start over?"
        body="You have a game in progress. Creating a new game will discard it."
        confirmLabel="Discard & create new"
        onConfirm={() => dispatch({ type: 'NEW_GAME' })}
        onClose={() => setConfirmNew(false)}
      />
    </div>
  );
}

// ───────────────────────────── mayor setup ─────────────────────────────

export function MayorSetup({ onTour }: { onTour: () => void }) {
  const { state, dispatch, prefs } = useGame();
  const [name, setName] = useState(state.mayorName);
  const [usePin, setUsePin] = useState(false);
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const pinOk = !usePin || (/^\d{4}$/.test(pin) && pin === pin2);
  const digits = (v: string) => v.replace(/\D/g, '').slice(0, 4);

  return (
    <Page
      center
      footer={
        <Btn disabled={!pinOk} onClick={() => dispatch({ type: 'SET_MAYOR', name, passcode: usePin ? pin : null })}>
          Continue to Players
        </Btn>
      }
    >
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-7">
        <Heading kicker="You are the Mayor" title="Welcome, Mayor." sub="You control the city. Keep its secrets safe." />
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-ivory/60">Your name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_NAME}
            placeholder="Mayor"
            autoComplete="off"
            enterKeyHint="done"
            className="h-14 w-full rounded-2xl bg-white/6 px-4 text-[17px] ring-1 ring-white/10 placeholder:text-ivory/30 focus:ring-2 focus:ring-ivory/70 focus:outline-none"
          />
        </label>
        <p className="-mt-3 text-[13px] leading-snug text-ivory/45">
          You moderate the game. You don’t get a role, can’t vote and can’t be killed.
        </p>

        <div className="space-y-3">
          <Toggle
            on={usePin}
            onChange={setUsePin}
            label="Passcode for Mayor screens"
            hint="Optional · 4 digits · guards the dashboard and every night"
          />
          <AnimatePresence initial={false}>
            {usePin && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-3 p-1">
                  <PinField label="Passcode" value={pin} onChange={(v) => setPin(digits(v))} />
                  <PinField label="Repeat" value={pin2} onChange={(v) => setPin2(digits(v))} invalid={pin2.length === 4 && pin2 !== pin} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!prefs.tourSeen && (
          <button
            type="button"
            onClick={onTour}
            className="flex w-full items-center gap-3 rounded-2xl bg-night/10 px-4 py-3 text-left ring-1 ring-night/25 active:bg-night/20"
          >
            <Icon name="info" className="size-6 shrink-0 text-night" />
            <span className="text-[15px] leading-snug">
              <b className="font-semibold">First time as Mayor?</b>{' '}
              <span className="text-ivory/60">Take the 1-minute tour of what to say and do.</span>
            </span>
          </button>
        )}
      </motion.div>
    </Page>
  );
}

function PinField({ label, value, onChange, invalid }: { label: string; value: string; onChange: (v: string) => void; invalid?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ivory/55">{label}</span>
      <input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        pattern="[0-9]*"
        maxLength={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="••••"
        className={cn(
          'h-14 w-full rounded-2xl bg-white/6 px-4 text-center text-2xl tracking-[0.5em] ring-1 focus:ring-2 focus:outline-none',
          invalid ? 'ring-mafia-hi' : 'ring-white/10 focus:ring-ivory/70',
        )}
      />
    </label>
  );
}

// ───────────────────────────── player registration ─────────────────────────────

export function Registration() {
  const { state, dispatch } = useGame();
  const { players } = state;
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [starting, setStarting] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const listEnd = useRef<HTMLDivElement>(null);
  const prevCount = useRef(players.length);
  const n = players.length;

  // Keep the name just typed in view; the input itself is pinned to the top.
  useEffect(() => {
    if (n > prevCount.current) listEnd.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    prevCount.current = n;
  }, [n]);
  const comp = composition(n);
  const full = n >= MAX_PLAYERS;

  function add(e: FormEvent) {
    e.preventDefault();
    const name = normalizeName(draft);
    if (!name) return;
    if (nameTaken(players, name))
      return setError(
        `There’s already a “${players.find((p) => p.name.toLocaleLowerCase() === name.toLocaleLowerCase())?.name}” in the city. Use a different name.`,
      );
    if (name.toLocaleLowerCase() === state.mayorName.toLocaleLowerCase())
      return setError('That’s the Mayor’s name — the Mayor doesn’t play.');
    dispatch({ type: 'ADD_PLAYER', id: uid(), name });
    play('pop');
    setDraft('');
    setError('');
    input.current?.focus();
  }

  function saveEdit(id: string) {
    const name = normalizeName(editDraft);
    if (!name) return;
    if (nameTaken(players, name, id)) return setError(`There’s already a “${name}” in the city.`);
    dispatch({ type: 'RENAME_PLAYER', id, name });
    setEditing(null);
    setError('');
  }

  return (
    <>
      <Page
        footer={
          <>
            <Btn disabled={n < MIN_PLAYERS} onClick={() => setStarting(true)}>
              {n < MIN_PLAYERS ? `Add ${MIN_PLAYERS - n} more to start` : 'Start Game'}
            </Btn>
          </>
        }
      >
        <div className="space-y-5 pt-1">
          <Heading kicker="Step 2" title="Who’s in the city?" sub="Add every player. You, the Mayor, sit this one out." />
          <div className="sticky top-0 z-10 -mx-5 space-y-1 bg-ink/90 px-5 pt-2 pb-1 backdrop-blur-md">
            <form onSubmit={add} className="flex gap-2">
              <input
                ref={input}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setError('');
                }}
                maxLength={MAX_NAME}
                disabled={full}
                placeholder={full ? 'The city is full' : 'Player name'}
                autoComplete="off"
                autoCapitalize="words"
                enterKeyHint="done"
                aria-label="Player name"
                className="h-14 min-w-0 flex-1 rounded-2xl bg-white/6 px-4 text-[17px] ring-1 ring-white/10 placeholder:text-ivory/30 focus:ring-2 focus:ring-ivory/70 focus:outline-none disabled:opacity-40"
              />
              <button
                type="submit"
                disabled={!draft.trim() || full}
                aria-label="Add player"
                className="grid size-14 shrink-0 place-items-center rounded-2xl bg-ivory text-ink transition active:scale-95 disabled:opacity-35"
              >
                <Icon name="plus" />
              </button>
            </form>
            <p role="alert" className={cn('min-h-5 text-[14px] text-mafia-hi', !error && 'invisible')}>
              {error || '.'}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <Chip>
              {n} / {MAX_PLAYERS} players
            </Chip>
            <span className="text-[13px] text-ivory/45">Minimum {MIN_PLAYERS}</span>
          </div>

          <ol className="space-y-2">
            <AnimatePresence initial={false}>
              {players.map((p, i) => (
                <motion.li
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, x: -30 }}
                  className="flex min-h-14 items-center gap-3 rounded-2xl bg-white/5 pr-1 pl-4 ring-1 ring-white/8"
                >
                  <span className="w-5 text-sm font-semibold text-ivory/40 tabular-nums">{i + 1}</span>
                  {editing === p.id ? (
                    <form
                      className="flex min-w-0 flex-1 items-center gap-1"
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveEdit(p.id);
                      }}
                    >
                      <input
                        autoFocus
                        value={editDraft}
                        maxLength={MAX_NAME}
                        onChange={(e) => setEditDraft(e.target.value)}
                        aria-label={`Rename ${p.name}`}
                        className="h-11 min-w-0 flex-1 rounded-xl bg-white/8 px-3 text-[17px] focus:ring-2 focus:ring-ivory/70 focus:outline-none"
                      />
                      <IconBtn label="Save name" onClick={() => saveEdit(p.id)}>
                        <Icon name="check" />
                      </IconBtn>
                      <IconBtn
                        label="Cancel"
                        onClick={() => {
                          setEditing(null);
                          setError('');
                        }}
                      >
                        <Icon name="x" />
                      </IconBtn>
                    </form>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 truncate text-[17px] font-semibold">{p.name}</span>
                      <IconBtn
                        label={`Edit ${p.name}`}
                        onClick={() => {
                          setEditing(p.id);
                          setEditDraft(p.name);
                          setError('');
                        }}
                      >
                        <Icon name="pencil" className="size-5" />
                      </IconBtn>
                      <IconBtn
                        label={`Remove ${p.name}`}
                        onClick={() => {
                          play('drop');
                          dispatch({ type: 'REMOVE_PLAYER', id: p.id });
                        }}
                      >
                        <Icon name="trash" className="size-5" />
                      </IconBtn>
                    </>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
          {n === 0 && <p className="py-6 text-center text-[15px] text-ivory/40">No players yet. Type a name above and tap +.</p>}
          <div ref={listEnd} />
        </div>
      </Page>

      <Sheet open={starting} onClose={() => setStarting(false)} title="Ready?">
        <div className="space-y-5 text-center">
          <div>
            <p className="text-2xl font-extrabold tracking-tight">{n} players are entering the city.</p>
            <p className="mt-3 text-[17px] font-medium text-ivory/75">
              <span className="text-mafia-hi">1 Mafia</span> · <span className="text-doctor-hi">1 Doctor</span> ·{' '}
              <span className="text-police-hi">1 Police</span> ·{' '}
              <span className="text-citizen">
                {comp.citizens} Citizen{comp.citizens === 1 ? '' : 's'}
              </span>
            </p>
          </div>
          <p className="text-[14px] leading-snug text-ivory/50">
            Roles are shuffled at random. Each player will privately discover theirs, one at a time.
          </p>
          <div className="space-y-2.5">
            <Btn sfx="confirm" onClick={() => dispatch({ type: 'ASSIGN_ROLES', roles: dealRoles(players) })}>
              Assign Secret Roles
            </Btn>
            <Btn variant="ghost" onClick={() => setStarting(false)}>
              Keep editing
            </Btn>
          </div>
        </div>
      </Sheet>
    </>
  );
}

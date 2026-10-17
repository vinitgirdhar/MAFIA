import { useState } from 'react';
import { motion } from 'motion/react';
import { buzz, play } from '../audio';
import { useGame } from '../store';
import { Btn, Confirm, Heading, HoldButton, Icon, Page, Sheet, cn } from './kit';

/** Mayor-only access gate: 4-digit passcode if one was set, otherwise press-and-hold. */
export function MayorGate({ onPass }: { onPass: () => void }) {
  const { state, dispatch } = useGame();
  const [digits, setDigits] = useState('');
  const [shakes, setShakes] = useState(0);
  const [forgot, setForgot] = useState(false);

  if (!state.passcode) {
    return (
      <div className="space-y-3">
        <HoldButton
          label={
            <>
              <Icon name="lock" className="size-5" />
              Hold — I’m the Mayor
            </>
          }
          onComplete={onPass}
        />
        <p className="text-center text-[13px] text-ivory/45">Tip: set a passcode in a new game for real privacy.</p>
      </div>
    );
  }

  const press = (d: string) => {
    play('tap');
    const next = (digits + d).slice(0, 4);
    setDigits(next);
    if (next.length < 4) return;
    if (next === state.passcode) {
      play('bell');
      onPass();
    } else {
      buzz([60, 40, 60]);
      setShakes((n) => n + 1);
      setTimeout(() => setDigits(''), 250);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xs">
      <div
        key={shakes}
        className={cn('mb-6 flex justify-center gap-4', shakes > 0 && 'animate-shake')}
        role="status"
        aria-label={`${digits.length} of 4 digits entered`}
      >
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn('size-3.5 rounded-full ring-2 ring-ivory/60 transition', i < digits.length && 'bg-ivory')} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <Key key={d} onClick={() => press(d)}>
            {d}
          </Key>
        ))}
        <span />
        <Key onClick={() => press('0')}>0</Key>
        <Key label="Delete" onClick={() => setDigits((x) => x.slice(0, -1))}>
          <Icon name="back" className="size-6" />
        </Key>
      </div>
      <button
        type="button"
        onClick={() => setForgot(true)}
        className="mx-auto mt-5 block min-h-11 px-4 text-sm text-ivory/45 underline-offset-4 active:underline"
      >
        Forgot passcode?
      </button>
      <Confirm
        open={forgot}
        danger
        title="Abandon this game?"
        body="A forgotten passcode can’t be recovered. You can abandon this game and start a fresh one with a new passcode."
        confirmLabel="Abandon game"
        onConfirm={() => dispatch({ type: 'NEW_GAME' })}
        onClose={() => setForgot(false)}
      />
    </div>
  );
}

function Key({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="mx-auto grid size-[4.5rem] place-items-center rounded-full bg-white/8 text-2xl font-medium ring-1 ring-white/8 transition active:scale-95 active:bg-white/18"
    >
      {children}
    </button>
  );
}

/** Full-screen "give the phone to the Mayor" wall, shown whenever the phone has been out with the table. */
export function GateScreen({ kicker }: { kicker: string }) {
  const { state, dispatch } = useGame();
  return (
    <Page center>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-full bg-white/8 ring-1 ring-white/12">
          <Icon name="lock" className="size-7" />
        </div>
        <Heading
          kicker={kicker}
          title={<>Hand the phone to {state.mayorName}</>}
          sub="Everything from here is for the Mayor’s eyes only."
          className="mb-10"
        />
        <MayorGate onPass={() => dispatch({ type: 'UNLOCK' })} />
      </motion.div>
    </Page>
  );
}

/** Same gate in a sheet — used for Mayor-only actions on otherwise public screens. */
export function GateSheet({
  open,
  onClose,
  onPass,
  title = 'Mayor only',
}: {
  open: boolean;
  onClose: () => void;
  onPass: () => void;
  title?: string;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="space-y-5 pb-2">
        <p className="text-center text-[15px] text-ivory/60">Hand the phone to the Mayor to continue.</p>
        <MayorGate
          onPass={() => {
            onClose();
            onPass();
          }}
        />
        <Btn variant="ghost" small onClick={onClose}>
          Cancel
        </Btn>
      </div>
    </Sheet>
  );
}

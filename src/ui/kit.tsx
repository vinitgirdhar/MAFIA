import { useEffect, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { buzz, play } from '../audio';

export const cn = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

// ───────────────────────────── icons ─────────────────────────────

const PATHS = {
  shield:
    'M12 3l7.5 3v5.2c0 4.6-3.1 8.1-7.5 9.8-4.4-1.7-7.500-5.200-7.500-9.800V6L12 3z M12 10.200a1.700 1.700 0 1 0 0 3.400 1.700 1.700 0 0 0 0-3.400z',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7v5l3.200 2',
  volumeOn: 'M4 9.500v5h3.500L13 19V5L7.500 9.500H4z M16 9a4.500 4.500 0 0 1 0 6 M18.600 6.400a8.200 8.200 0 0 1 0 11.200',
  volumeOff: 'M4 9.500v5h3.500L13 19V5L7.500 9.500H4z M16.500 9.500l5 5 M21.500 9.500l-5 5',
  pause: 'M8.500 5v14 M15.500 5v14',
  play: 'M7 4.500l12 7.500-12 7.500v-15z',
  check: 'M5 12.500l4.500 4.500L19 7.500',
  x: 'M6 6l12 12 M18 6L6 18',
  plus: 'M12 5v14 M5 12h14',
  pencil: 'M4 20l4-1 11-11-3-3L5 16l-1 4z M14 7l3 3',
  trash: 'M5 7h14 M10 7V4.500h4V7 M7 7l1 13h8l1-13',
  back: 'M15 5l-7 7 7 7',
  book: 'M5 4h9.500A2.500 2.500 0 0 1 17 6.500V20H7.500A2.500 2.500 0 0 1 5 17.500V4z M5 17.500A2.500 2.500 0 0 1 7.500 15H17',
  moon: 'M20 14.500A8 8 0 0 1 9.500 4 8 8 0 1 0 20 14.500z',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2.500v2 M12 19.500v2 M2.500 12h2 M19.500 12h2 M5.300 5.300l1.400 1.400 M17.300 17.300l1.400 1.400 M5.300 18.700l1.400-1.400 M17.300 6.700l1.400-1.400',
  eye: 'M2.500 12S6 5.500 12 5.500 21.500 12 21.500 12 18 18.500 12 18.500 2.500 12 2.500 12z M12 9.500a2.500 2.500 0 1 0 0 5 2.500 2.500 0 0 0 0-5z',
  rewind: 'M11 6.500L4 12l7 5.500v-11z M20 6.500L13 12l7 5.500v-11z',
  sliders: 'M4 7h9 M17 7h3 M4 17h3 M11 17h9 M15 5v4 M9 15v4',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3 M5.500 11h13v9h-13z',
  download: 'M12 4v11 M7 10.500l5 5 5-5 M5 20h14',
  vote: 'M5 9l7-5 7 5v1H5V9z M7 10v7 M12 10v7 M17 10v7 M4 20h16',
  skull:
    'M12 3.500c-4 0-7 2.800-7 6.500 0 2.300 1.100 3.800 2.500 4.800V18h9v-3.200c1.400-1 2.500-2.500 2.500-4.800 0-3.700-3-6.500-7-6.500z M9.500 11a1 1 0 1 0 0 .01 M14.500 11a1 1 0 1 0 0 .01 M10 18v2.500 M14 18v2.500',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 11v5.500 M12 7.700v.01',
  refresh: 'M20 12a8 8 0 1 1-2.500-5.800 M20 4v4.500h-4.500',
} as const;
export type IconName = keyof typeof PATHS;

export function Icon({ name, className = 'size-6' }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

// ───────────────────────────── buttons ─────────────────────────────

export type ButtonTone = 'ivory' | 'mafia' | 'doctor' | 'police';
const SOLID: Record<ButtonTone, string> = {
  ivory: 'bg-ivory text-ink active:bg-ivory/85',
  mafia: 'bg-mafia text-white active:bg-mafia/85',
  doctor: 'bg-doctor text-ink active:bg-doctor/85',
  police: 'bg-police text-white active:bg-police/85',
};

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  tone?: ButtonTone;
  small?: boolean;
  quiet?: boolean; // no click sound
}

export function Btn({ variant = 'primary', tone = 'ivory', small, quiet, className, onClick, children, ...rest }: BtnProps) {
  const styles = {
    primary: SOLID[tone],
    secondary: 'bg-white/8 text-ivory ring-1 ring-white/10 active:bg-white/14',
    ghost: 'text-ivory/70 active:text-ivory active:bg-white/8',
    danger: 'bg-mafia/15 text-mafia-hi ring-1 ring-mafia/40 active:bg-mafia/30',
  }[variant];
  return (
    <button
      type="button"
      {...rest}
      onClick={(e) => {
        if (!quiet) play('tap');
        onClick?.(e);
      }}
      className={cn(
        'inline-flex w-full items-center justify-center gap-2 rounded-2xl font-semibold tracking-tight transition-[transform,background-color,opacity] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-35',
        small ? 'min-h-11 px-4 text-[15px]' : 'min-h-14 px-6 text-[17px]',
        styles,
        className,
      )}
    >
      {children}
    </button>
  );
}

export function IconBtn({
  label,
  onClick,
  children,
  className,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        play('tap');
        onClick();
      }}
      className={cn('grid size-11 place-items-center rounded-full text-ivory/75 transition active:scale-90 active:bg-white/10', className)}
    >
      {children}
    </button>
  );
}

/** Press and hold to confirm. Releasing early cancels. Keyboard: hold Space/Enter. */
export function HoldButton({
  label,
  onComplete,
  holdMs = 650,
  tone = 'ivory',
  disabled,
  className,
}: {
  label: ReactNode;
  onComplete: () => void;
  holdMs?: number;
  tone?: ButtonTone;
  disabled?: boolean;
  className?: string;
}) {
  const [progress, setProgress] = useState(0);
  const raf = useRef(0);
  const done = useRef(false);

  const stop = () => {
    cancelAnimationFrame(raf.current);
    done.current = false;
    setProgress(0);
  };
  const start = () => {
    if (disabled || raf.current === -1) return;
    const t0 = performance.now();
    done.current = false;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / holdMs);
      setProgress(p);
      if (p >= 1) {
        if (!done.current) {
          done.current = true;
          buzz(25);
          onComplete();
        }
        setProgress(0);
        return;
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const fill = { ivory: 'bg-ink/25', mafia: 'bg-black/30', doctor: 'bg-ink/25', police: 'bg-black/30' }[tone];
  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        start();
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
          e.preventDefault();
          start();
        }
      }}
      onKeyUp={stop}
      onBlur={stop}
      onContextMenu={(e) => e.preventDefault()}
      style={{ touchAction: 'none' }}
      className={cn(
        'relative inline-flex min-h-16 w-full select-none items-center justify-center overflow-hidden rounded-2xl text-[17px] font-semibold tracking-tight disabled:opacity-35',
        SOLID[tone],
        className,
      )}
    >
      <span className={cn('absolute inset-y-0 left-0', fill)} style={{ width: `${progress * 100}%` }} aria-hidden />
      <span className="relative flex items-center gap-2">{label}</span>
    </button>
  );
}

// ───────────────────────────── layout ─────────────────────────────

export function Page({
  children,
  footer,
  center,
  className,
}: {
  children: ReactNode;
  footer?: ReactNode;
  center?: boolean;
  className?: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5',
          footer
            ? 'pb-6 [mask-image:linear-gradient(to_bottom,black_calc(100%-20px),transparent)]'
            : 'pb-[max(1.5rem,env(safe-area-inset-bottom))]',
        )}
      >
        <div className={cn('w-full', center && 'my-auto py-4', className)}>{children}</div>
      </div>
      {footer && <div className="space-y-3 px-5 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{footer}</div>}
    </div>
  );
}

export function Heading({
  kicker,
  title,
  sub,
  kickerClass = 'text-ivory/55',
  titleClass,
  className,
  xl,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  kickerClass?: string;
  titleClass?: string;
  className?: string;
  xl?: boolean;
}) {
  return (
    <div className={cn('text-center', className)}>
      {kicker && <p className={cn('mb-2 text-xs font-semibold tracking-[0.28em] uppercase', kickerClass)}>{kicker}</p>}
      <h1
        className={cn(
          'leading-[1.05] font-extrabold text-balance',
          xl ? 'text-[3.4rem] tracking-[0.06em]' : 'text-[2rem] tracking-tight',
          titleClass,
        )}
      >
        {title}
      </h1>
      {sub && <p className="mx-auto mt-3 max-w-[30ch] text-[17px] leading-snug text-ivory/65 text-balance">{sub}</p>}
    </div>
  );
}

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1 text-[13px] font-medium text-ivory/75 ring-1 ring-white/10',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A quoted line the Mayor reads aloud. */
export function Say({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn('mx-auto flex max-w-sm items-start gap-3 rounded-2xl bg-white/5 px-4 py-3 text-left ring-1 ring-white/8', className)}
    >
      <span className="mt-0.5 shrink-0 text-[11px] font-bold tracking-[0.2em] text-ivory/45 uppercase">Say</span>
      <p className="text-[17px] leading-snug text-ivory/90 italic">“{children}”</p>
    </div>
  );
}

// ───────────────────────────── sheet ─────────────────────────────

export function Sheet({
  open,
  onClose,
  title,
  children,
  tall,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  tall?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
            className={cn(
              'relative flex w-full max-w-[460px] flex-col rounded-t-[28px] bg-panel-2 ring-1 ring-white/10',
              tall ? 'h-[92dvh]' : 'max-h-[88dvh]',
            )}
          >
            <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/20" />
            {title && <h2 className="px-6 pt-4 pb-1 text-center text-lg font-bold tracking-tight">{title}</h2>}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Confirm({
  open,
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="mb-5 text-center text-[16px] leading-snug text-ivory/70">{body}</p>
      <div className="space-y-2.5">
        <Btn
          variant={danger ? 'danger' : 'primary'}
          onClick={() => {
            onClose();
            onConfirm();
          }}
        >
          {confirmLabel}
        </Btn>
        <Btn variant="ghost" onClick={onClose}>
          Cancel
        </Btn>
      </div>
    </Sheet>
  );
}

// ───────────────────────────── player card ─────────────────────────────

export type CardState = 'idle' | 'selected' | 'done' | 'dead';
const SELECTED: Record<ButtonTone, string> = {
  ivory: 'bg-ivory/14 ring-2 ring-ivory/80',
  mafia: 'bg-mafia/20 ring-2 ring-mafia-hi',
  doctor: 'bg-doctor/20 ring-2 ring-doctor-hi',
  police: 'bg-police/20 ring-2 ring-police-hi',
};

export function PlayerCard({
  name,
  state = 'idle',
  tone = 'ivory',
  note,
  onClick,
  disabled,
  compact,
}: {
  name: string;
  state?: CardState;
  tone?: ButtonTone;
  note?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const inert = !onClick || disabled || state === 'dead' || state === 'done';
  const body = (
    <>
      <span
        className={cn(
          'grid shrink-0 place-items-center rounded-full bg-white/10 font-bold',
          compact ? 'size-8 text-[13px]' : 'size-11 text-base',
          state === 'dead' && 'text-ivory/40',
        )}
      >
        {name.slice(0, 1).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span
          className={cn(
            'block truncate font-semibold',
            compact ? 'text-[16px]' : 'text-[17px]',
            state === 'dead' && 'text-ivory/45 line-through decoration-ivory/40',
          )}
        >
          {name}
        </span>
        {note && <span className="block truncate text-[13px] text-ivory/55">{note}</span>}
      </span>
      {state === 'selected' && <Icon name="check" className={compact ? 'size-5 shrink-0' : 'size-6 shrink-0'} />}
      {state === 'done' && <Icon name="check" className="size-5 shrink-0 text-doctor-hi" />}
      {state === 'dead' && <Icon name="skull" className="size-5 shrink-0 text-ivory/35" />}
    </>
  );
  const cls = cn(
    'flex w-full items-center rounded-2xl text-ivory transition duration-150',
    compact ? 'gap-2.5 px-3' : 'gap-3 px-3.5',
    compact ? 'min-h-14' : 'min-h-[4.25rem]',
    state === 'selected' ? SELECTED[tone] : 'bg-white/5 ring-1 ring-white/8',
    state === 'done' && 'opacity-55',
    state === 'dead' && 'opacity-60',
    !inert && state !== 'selected' && 'active:scale-[0.98] active:bg-white/10',
  );
  if (inert && !onClick) return <div className={cls}>{body}</div>;
  return (
    <button
      type="button"
      disabled={inert}
      aria-pressed={state === 'selected'}
      onClick={() => {
        play('tap');
        onClick?.();
      }}
      className={cls}
    >
      {body}
    </button>
  );
}

// ───────────────────────────── atmosphere ─────────────────────────────

export type Tone = 'neutral' | 'night' | 'day';

const STARS = Array.from({ length: 34 }, (_, i) => {
  const r = (n: number) => (Math.sin(i * 91.7 + n * 13.1) + 1) / 2;
  return { x: r(1) * 100, y: r(2) * 55, s: 1 + r(3) * 1.6, d: r(4) * 4 };
});

export function Backdrop({ tone, moon }: { tone: Tone; moon?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(90%_50%_at_50%_0%,#161922_0%,#0a0b0e_70%)]" />
      <div className="absolute inset-0 transition-opacity duration-[1400ms]" style={{ opacity: tone === 'night' ? 1 : 0 }}>
        <div className="absolute inset-0 bg-[radial-gradient(80%_46%_at_70%_0%,#1c2a55_0%,transparent_70%),linear-gradient(#060913,#0a0f20_55%,#05070d)]" />
        {STARS.map((s, i) => (
          <span
            key={i}
            className="absolute animate-twinkle rounded-full bg-white"
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }}
          />
        ))}
        <div
          className={cn(
            'absolute top-[7%] right-[12%] size-14 rounded-full bg-[radial-gradient(circle_at_35%_35%,#fffdf4,#d3dbef_55%,#8f9cc0)] shadow-[0_0_60px_14px_rgba(150,175,255,0.22)] transition-opacity duration-1000',
            !moon && 'opacity-0',
          )}
        />
      </div>
      <div className="absolute inset-0 transition-opacity duration-[1400ms]" style={{ opacity: tone === 'day' ? 1 : 0 }}>
        <div className="absolute inset-0 bg-[radial-gradient(80%_46%_at_50%_0%,rgba(240,183,101,0.22)_0%,transparent_70%),linear-gradient(#191410,#100d0b_60%,#0b0a09)]" />
      </div>
    </div>
  );
}

const BUILDINGS: [number, number, number][] = [
  [0, 34, 70],
  [30, 26, 108],
  [54, 38, 84],
  [90, 22, 126],
  [110, 40, 96],
  [148, 30, 138],
  [176, 36, 90],
  [210, 26, 112],
  [234, 42, 78],
  [274, 28, 132],
  [300, 34, 100],
  [332, 26, 120],
  [356, 44, 82],
];

export function Skyline({ className, style }: { className?: string; style?: CSSProperties }) {
  const rnd = (i: number, j: number) => (Math.sin(i * 12.9898 + j * 78.233) * 43758.5453) % 1;
  return (
    <svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMax slice" className={className} style={style} aria-hidden>
      <g fill="#0d1018">
        {BUILDINGS.map(([x, w, h], i) => (
          <rect key={i} x={x + 4} y={160 - h - 14} width={w} height={h + 14} />
        ))}
      </g>
      <g fill="#07080c">
        {BUILDINGS.map(([x, w, h], i) => (
          <rect key={i} x={x} y={160 - h} width={w} height={h} />
        ))}
      </g>
      <g fill="#f0c27a">
        {BUILDINGS.flatMap(([x, w, h], i) =>
          Array.from({ length: Math.floor(h / 14) * Math.floor(w / 10) }, (_, k) => {
            const cols = Math.floor(w / 10);
            const cx = x + 4 + (k % cols) * 10;
            const cy = 160 - h + 8 + Math.floor(k / cols) * 14;
            return Math.abs(rnd(i, k)) > 0.84 ? (
              <rect
                key={`${i}-${k}`}
                x={cx}
                y={cy}
                width="3.5"
                height="5"
                opacity={0.55 + Math.abs(rnd(k, i)) * 0.4}
                className={Math.abs(rnd(i, k)) > 0.95 ? 'animate-twinkle' : undefined}
              />
            ) : null;
          }),
        )}
      </g>
    </svg>
  );
}

export function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => {
        play('tap');
        onChange(!on);
      }}
      className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-white/5 px-4 text-left ring-1 ring-white/8 active:bg-white/10"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-medium">{label}</span>
        {hint && <span className="block text-[13px] text-ivory/50">{hint}</span>}
      </span>
      <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', on ? 'bg-doctor' : 'bg-white/18')}>
        <span className={cn('absolute top-0.5 size-6 rounded-full bg-white shadow transition-all', on ? 'left-[1.375rem]' : 'left-0.5')} />
      </span>
    </button>
  );
}

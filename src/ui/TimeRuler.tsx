import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { buzz, play } from '../audio';

/** Minutes offered on the ruler; 0 means "no time limit". */
export const RULER_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 0] as const;
const STEP = 64; // px between ticks
const N = RULER_VALUES.length;

const indexFor = (min: number) => {
  const exact = RULER_VALUES.indexOf(min as (typeof RULER_VALUES)[number]);
  if (exact >= 0) return exact;
  // an old saved value: snap to the closest whole minute
  let best = 0;
  RULER_VALUES.forEach((v, i) => v !== 0 && Math.abs(v - min) < Math.abs(RULER_VALUES[best] - min) && (best = i));
  return best;
};

/**
 * A scroll-snap "ruler" for picking the discussion length: swipe it on a phone, drag or use the
 * mouse wheel on a desktop, or tap a tick. Arrow keys work too. The value under the needle wins.
 */
export function TimeRuler({ value, onChange }: { value: number; onChange: (minutes: number) => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(() => indexFor(value));
  const lastIdx = useRef(indexFor(value));
  const raf = useRef(0);
  const touching = useRef(false); // true while the user (not a programmatic jump) is moving it
  const touchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const drag = useRef<{ x: number; left: number; moved: number; id: number; grabbing: boolean } | null>(null);
  const wheel = useRef({ acc: 0, target: 0, at: 0 });
  const idx = indexFor(value);
  const shown = RULER_VALUES[idx];

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = idx * STEP;
  }, []);

  // follow value changes made elsewhere (e.g. a reset), but never fight the user's finger
  useEffect(() => {
    const el = scroller.current;
    if (!el || touching.current) return;
    if (Math.round(el.scrollLeft / STEP) !== idx) {
      lastIdx.current = idx;
      el.scrollTo({ left: idx * STEP, behavior: 'smooth' });
    }
  }, [idx]);

  const endDrag = () => {
    const el = scroller.current;
    const d = drag.current;
    if (!el || !d) return;
    if (d.grabbing) {
      el.style.scrollSnapType = '';
      el.scrollTo({ left: Math.round(el.scrollLeft / STEP) * STEP, behavior: 'smooth' });
    }
    setTimeout(() => (drag.current = null), 0); // after the click that follows pointerup
  };

  const jump = useCallback((i: number) => {
    scroller.current?.scrollTo({ left: Math.max(0, Math.min(N - 1, i)) * STEP, behavior: 'smooth' });
  }, []);

  const onScroll = () => {
    touching.current = true;
    clearTimeout(touchTimer.current);
    touchTimer.current = setTimeout(() => (touching.current = false), 200);
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const el = scroller.current;
      if (!el) return;
      const p = el.scrollLeft / STEP;
      setPos(p);
      const i = Math.max(0, Math.min(N - 1, Math.round(p)));
      if (i !== lastIdx.current) {
        lastIdx.current = i;
        play('tock', 0.9 + i * 0.06);
        buzz(6);
        onChange(RULER_VALUES[i]);
      }
    });
  };

  // vertical wheel / trackpad steps the ruler one tick per ~60px, so tiny deltas still add up
  // (a raw scrollLeft nudge would just snap back)
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // sideways swipes scroll natively
      e.preventDefault();
      const w = wheel.current;
      if (e.timeStamp - w.at > 400) {
        w.acc = 0;
        w.target = Math.round(el.scrollLeft / STEP);
      }
      w.at = e.timeStamp;
      w.acc += e.deltaY;
      const steps = Math.trunc(w.acc / 60);
      if (!steps) return;
      w.acc -= steps * 60;
      w.target = Math.max(0, Math.min(N - 1, w.target + steps));
      el.scrollTo({ left: w.target * STEP, behavior: 'smooth' });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      clearTimeout(touchTimer.current);
    },
    [],
  );

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Discussion timer length"
      aria-valuemin={0}
      aria-valuemax={N - 1}
      aria-valuenow={idx}
      aria-valuetext={shown === 0 ? 'No time limit' : `${shown} minute${shown === 1 ? '' : 's'}`}
      onKeyDown={(e) => {
        const to = { ArrowRight: idx + 1, ArrowUp: idx + 1, ArrowLeft: idx - 1, ArrowDown: idx - 1, Home: 0, End: N - 1 }[e.key];
        if (to === undefined) return;
        e.preventDefault();
        jump(to);
      }}
      className="select-none rounded-2xl outline-offset-4"
    >
      <div className="flex h-14 items-end justify-center overflow-hidden" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={shown}
            initial={{ y: 22, opacity: 0, scale: 0.85 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -22, opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 520, damping: 32 }}
            className="flex items-baseline gap-2"
          >
            <span className="text-[2.6rem] leading-none font-black tracking-tight text-day tabular-nums">{shown === 0 ? '∞' : shown}</span>
            <span className="text-[15px] font-medium text-ivory/60">
              {shown === 0 ? 'no time limit' : shown === 1 ? 'minute' : 'minutes'}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative mt-1">
        <div
          ref={scroller}
          onScroll={onScroll}
          onPointerDown={(e) => {
            if (e.pointerType !== 'mouse') return;
            drag.current = { x: e.clientX, left: scroller.current!.scrollLeft, moved: 0, id: e.pointerId, grabbing: false };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            const el = scroller.current;
            if (!d || !el) return;
            const dx = e.clientX - d.x;
            d.moved = Math.max(d.moved, Math.abs(dx));
            if (!d.grabbing) {
              if (d.moved <= 4) return; // still a click: don't capture the pointer, or the tick's onClick never fires
              d.grabbing = true;
              el.style.scrollSnapType = 'none';
              el.setPointerCapture(d.id);
            }
            el.scrollLeft = d.left - dx;
          }}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [mask-image:linear-gradient(to_right,transparent,black_24%,black_76%,transparent)] [-webkit-overflow-scrolling:touch]"
          style={{ paddingInline: `calc(50% - ${STEP / 2}px)`, cursor: 'grab', touchAction: 'pan-x' }}
        >
          {RULER_VALUES.map((v, i) => {
            const t = Math.max(0, 1 - Math.abs(i - pos)); // 1 under the needle, 0 a full tick away
            return (
              <button
                key={v}
                type="button"
                tabIndex={-1}
                aria-label={v === 0 ? 'No time limit' : `${v} minute${v === 1 ? '' : 's'}`}
                onClick={() => !(drag.current && drag.current.moved > 4) && jump(i)}
                className="relative h-[4.5rem] shrink-0 snap-center"
                style={{ width: STEP }}
              >
                <span className="absolute inset-x-0 top-0 block h-8">
                  {[0, 0.25, 0.75].map((f) => (
                    <span
                      key={f}
                      className="absolute bottom-0 w-px bg-ivory/25"
                      style={{ left: `${f * 100}%`, height: f === 0 ? 10 : 14 }}
                    />
                  ))}
                  <span
                    className="absolute bottom-0 left-1/2 w-[2px] -translate-x-1/2 rounded-full bg-day"
                    style={{ height: 20 + t * 12, opacity: 0.35 + t * 0.65 }}
                  />
                </span>
                <span
                  className="absolute inset-x-0 bottom-0 block text-center text-lg font-bold tabular-nums"
                  style={{
                    transform: `scale(${0.82 + t * 0.4})`,
                    opacity: 0.3 + t * 0.7,
                    color: t > 0.55 ? 'var(--color-day)' : undefined,
                  }}
                >
                  {v === 0 ? '∞' : v}
                </span>
              </button>
            );
          })}
        </div>
        {/* needle */}
        <div
          className="pointer-events-none absolute -top-1.5 left-1/2 size-2.5 -translate-x-1/2 rotate-45 rounded-[2px] bg-day shadow-[0_0_12px_2px_rgba(240,183,101,0.55)]"
          aria-hidden
        />
      </div>
      <p className="mt-2 text-center text-[12px] text-ivory/40">Swipe or drag the ruler</p>
    </div>
  );
}

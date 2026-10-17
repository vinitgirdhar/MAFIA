import { type GameState, type LogEntry } from '../game/engine';
import { Icon, Sheet, cn } from './kit';

/** Chronological event log. Night rounds carry private details (who was targeted/saved/checked) only when asked. */
export function HistoryList({ state, showPrivate }: { state: GameState; showPrivate: boolean }) {
  const groups: { key: string; title: string; night: boolean; entries: LogEntry[] }[] = [];
  for (const e of state.log) {
    const night = e.kind === 'night_kill' || e.kind === 'night_safe';
    const key = `${night ? 'n' : 'd'}${e.round}`;
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, title: `${night ? 'Night' : 'Day'} ${e.round}`, night, entries: [] }));
    g.entries.push(e);
  }
  if (!groups.length) return <p className="py-8 text-center text-[15px] text-ivory/45">Nothing has happened yet.</p>;
  return (
    <ol className="space-y-5">
      {groups.map((g) => (
        <li key={g.key}>
          <h3 className="mb-2 flex items-center gap-2 text-[12px] font-semibold tracking-[0.2em] text-ivory/50 uppercase">
            <Icon name={g.night ? 'moon' : 'sun'} className="size-4" />
            {g.title}
          </h3>
          <ul className="space-y-2">
            {g.entries.map((e, i) => (
              <li key={i} className="rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/8">
                <p className={cn('text-[16px] font-medium', (e.kind === 'night_kill' || e.kind === 'vote_out') && 'text-mafia-hi')}>
                  {e.text}
                </p>
                {showPrivate && e.secret && <p className="mt-1 text-[13px] leading-snug text-ivory/55">{e.secret}</p>}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

export function HistorySheet({ open, onClose, state }: { open: boolean; onClose: () => void; state: GameState }) {
  const over = state.phase === 'GAME_OVER';
  return (
    <Sheet open={open} onClose={onClose} title="Game history" tall>
      <p className="mb-4 text-center text-[13px] text-ivory/45">
        {over
          ? 'The game is over — all details are revealed.'
          : 'Public events only. Secret night actions stay hidden until the game ends.'}
      </p>
      <HistoryList state={state} showPrivate={over} />
    </Sheet>
  );
}

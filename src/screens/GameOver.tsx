import { useEffect } from 'react';
import { motion } from 'motion/react';
import { type Role, byId, dealRoles } from '../game/engine';
import { play } from '../audio';
import { useGame } from '../store';
import { Btn, Chip, Icon, Page, cn } from '../ui/kit';
import { HistoryList } from '../ui/History';
import { ROLE_UI, RoleBadge, RoleIcon } from '../ui/roles';

const ORDER: Record<Role, number> = { MAFIA: 0, DOCTOR: 1, POLICE: 2, CITIZEN: 3 };
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({ x: (i * 53) % 100, d: (i * 0.7) % 6, s: 3 + (i % 4) }));

export function GameOver() {
  const { state, dispatch } = useGame();
  const { winner, endedEarly } = state;
  const city = winner === 'CITY';

  useEffect(() => {
    if (winner) play(city ? 'win' : 'lose');
  }, [winner, city]);

  const title = endedEarly ? 'GAME ENDED' : city ? 'THE CITY WINS' : 'THE MAFIA WINS';
  const sub = endedEarly ? 'The Mayor ended this game early.' : city ? 'The Mafia has been caught.' : 'The city has fallen.';
  const accent = endedEarly ? 'text-ivory' : city ? 'text-day' : 'text-mafia-hi';
  const glow = endedEarly ? '#8f9ab5' : city ? '#f0b765' : '#c4283c';

  const sorted = [...state.players].sort((a, b) => ORDER[a.role!] - ORDER[b.role!]);
  const saves = state.nights.filter((n) => n.saved).length;
  const eliminated = state.players.filter((p) => !p.alive).length;
  const checks = state.nights.filter((n) => n.policeTarget);
  const outs = state.log.filter((e) => e.playerId && (e.kind === 'night_kill' || e.kind === 'vote_out'));
  const outLabel = (id: string) => {
    const e = state.log.find((x) => x.playerId === id);
    return e ? `${e.kind === 'night_kill' ? 'Killed · Night' : 'Voted out · Day'} ${e.round}` : 'Out';
  };

  return (
    <>
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0" style={{ background: `radial-gradient(75% 45% at 50% 18%, ${glow}33, transparent 72%)` }} />
        {!endedEarly &&
          PARTICLES.map((p, i) => (
            <span
              key={i}
              className={cn('absolute rounded-full', city ? 'animate-rise bg-day/80' : 'animate-fall bg-mafia-hi/70')}
              style={{ left: `${p.x}%`, top: city ? '100%' : '0', width: p.s, height: p.s, animationDelay: `${p.d}s` }}
            />
          ))}
      </div>
      <Page
        footer={
          <>
            <Btn onClick={() => dispatch({ type: 'ASSIGN_ROLES', roles: dealRoles(state.players) })}>
              <Icon name="refresh" className="size-5" />
              Play Again
            </Btn>
            <div className="grid grid-cols-2 gap-2.5">
              <Btn variant="secondary" small onClick={() => dispatch({ type: 'CLEAR_PLAYERS' })}>
                New Game
              </Btn>
              <Btn variant="secondary" small onClick={() => dispatch({ type: 'GO_HOME' })}>
                Back to Home
              </Btn>
            </div>
          </>
        }
      >
        <div className="relative space-y-8 pt-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
            className="space-y-5 pt-4 text-center"
            role="status"
          >
            <p className="text-xs font-semibold tracking-[0.34em] text-ivory/50 uppercase">Game over</p>
            <motion.div
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 11, delay: 0.2 }}
              className={cn(
                'mx-auto grid size-28 place-items-center rounded-full ring-2',
                endedEarly ? 'bg-white/8 ring-white/20' : city ? 'bg-day/12 ring-day/40' : 'bg-mafia/15 ring-mafia/50',
                accent,
              )}
              style={{ boxShadow: `0 0 80px 6px ${glow}44` }}
            >
              {city || endedEarly ? (
                <Icon name={endedEarly ? 'clock' : 'sun'} className="size-14" />
              ) : (
                <RoleIcon role="MAFIA" className="size-16" />
              )}
            </motion.div>
            <div>
              <h1 className={cn('text-[2.6rem] leading-none font-black tracking-tight', accent)}>{title}</h1>
              <p className="mt-3 text-[18px] text-ivory/70">{sub}</p>
            </div>
          </motion.div>

          <div className="grid grid-cols-3 gap-2.5 text-center">
            {[
              [state.nights.length, 'Nights'],
              [saves, 'Doctor saves'],
              [eliminated, 'Eliminated'],
            ].map(([n, l]) => (
              <div key={l} className="rounded-2xl bg-white/5 py-3.5 ring-1 ring-white/8">
                <p className="text-3xl font-black tabular-nums">{n}</p>
                <p className="mt-0.5 text-[12px] font-medium text-ivory/50">{l}</p>
              </div>
            ))}
          </div>

          <section>
            <h2 className="mb-2.5 text-[12px] font-semibold tracking-[0.2em] text-ivory/50 uppercase">The secret identities</h2>
            <ul className="space-y-2">
              {sorted.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/8">
                  <RoleBadge role={p.role!} />
                  <div className="min-w-0 flex-1">
                    <p className={cn('truncate text-[17px] font-semibold', !p.alive && 'text-ivory/60')}>{p.name}</p>
                    <p className={cn('text-[14px] font-medium', ROLE_UI[p.role!].text)}>{ROLE_UI[p.role!].name}</p>
                  </div>
                  <Chip className={p.alive ? 'text-doctor-hi' : ''}>{p.alive ? 'Survived' : outLabel(p.id)}</Chip>
                </li>
              ))}
            </ul>
          </section>

          {outs.length > 0 && (
            <section>
              <h2 className="mb-2.5 text-[12px] font-semibold tracking-[0.2em] text-ivory/50 uppercase">Elimination order</h2>
              <ol className="space-y-2">
                {outs.map((e, i) => (
                  <li key={e.playerId} className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/8">
                    <span className="w-5 text-sm font-semibold text-ivory/40 tabular-nums">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-[16px] font-semibold">{byId(state, e.playerId)?.name}</span>
                    <span className="text-[13px] text-ivory/55">
                      {e.kind === 'night_kill' ? 'Killed' : 'Voted out'} · {e.kind === 'night_kill' ? 'Night' : 'Day'} {e.round}
                    </span>
                    {byId(state, e.playerId)?.role && <RoleBadge role={byId(state, e.playerId)!.role!} size="size-8" />}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {checks.length > 0 && (
            <section>
              <h2 className="mb-2.5 text-[12px] font-semibold tracking-[0.2em] text-ivory/50 uppercase">Police investigations</h2>
              <ul className="space-y-2">
                {checks.map((n) => (
                  <li
                    key={n.round}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-police/8 px-4 py-3 ring-1 ring-police/20"
                  >
                    <span className="text-[15px]">
                      <span className="text-ivory/50">Night {n.round}</span> · {byId(state, n.policeTarget)?.name}
                    </span>
                    <span
                      className={cn('text-[13px] font-bold tracking-wide uppercase', n.policeIsMafia ? 'text-mafia-hi' : 'text-ivory/60')}
                    >
                      {n.policeIsMafia ? 'Mafia' : 'Innocent'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="mb-2.5 text-[12px] font-semibold tracking-[0.2em] text-ivory/50 uppercase">What happened</h2>
            <HistoryList state={state} showPrivate />
          </section>
        </div>
      </Page>
    </>
  );
}

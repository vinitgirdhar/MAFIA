import type { Role } from '../game/engine';
import { cn, type ButtonTone } from './kit';

export interface RoleStyle {
  name: string;
  title: string;
  blurb: string;
  duty: string;
  tone: ButtonTone;
  text: string; // readable accent text on dark
  bg: string;
  ring: string;
  glow: string; // raw colour for gradients
}

export const ROLE_UI: Record<Role, RoleStyle> = {
  MAFIA: {
    name: 'Mafia',
    title: 'YOU ARE THE MAFIA',
    blurb: 'Eliminate the city without being discovered.',
    duty: 'Each night, silently choose one player to kill.',
    tone: 'mafia',
    text: 'text-mafia-hi',
    bg: 'bg-mafia/15',
    ring: 'ring-mafia/50',
    glow: '#c4283c',
  },
  DOCTOR: {
    name: 'Doctor',
    title: 'YOU ARE THE DOCTOR',
    blurb: 'Save one person every night.',
    duty: 'Each night, silently protect one player — yourself included.',
    tone: 'doctor',
    text: 'text-doctor-hi',
    bg: 'bg-doctor/15',
    ring: 'ring-doctor/50',
    glow: '#2f9e75',
  },
  POLICE: {
    name: 'Police',
    title: 'YOU ARE THE POLICE',
    blurb: 'Investigate one player every night.',
    duty: 'Each night, silently investigate one player and learn if they are the Mafia.',
    tone: 'police',
    text: 'text-police-hi',
    bg: 'bg-police/15',
    ring: 'ring-police/50',
    glow: '#3b82f6',
  },
  CITIZEN: {
    name: 'Citizen',
    title: 'YOU ARE A CITIZEN',
    blurb: 'Find the Mafia before it’s too late.',
    duty: 'No night power. Your voice and your vote are your weapons.',
    tone: 'ivory',
    text: 'text-citizen',
    bg: 'bg-citizen/10',
    ring: 'ring-citizen/40',
    glow: '#e8e1cf',
  },
};

const star = (cx: number, cy: number, ro: number, ri: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? ro : ri;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');

/** Hand-drawn line icons on a 64 grid: fedora, heart-and-cross, badge, bust. */
export function RoleIcon({ role, className = 'size-16' }: { role: Role; className?: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <svg viewBox="0 0 64 64" className={cn(className)} aria-hidden>
      {role === 'MAFIA' && (
        <g {...common}>
          <path d="M6 43c0-5.500 11.500-9.500 26-9.500S58 37.500 58 43s-11.500 9.500-26 9.500S6 48.500 6 43z" />
          <path d="M16.500 38C15 28 17 17 23 13.500c3.500-2 6.500.5 9 2.500 2.500-2 5.500-4.500 9-2.500C47 17 49 28 47.500 38" />
          <path d="M17 33.500c9.500 3.500 20.500 3.500 30 0" strokeWidth="5" opacity="0.5" />
        </g>
      )}
      {role === 'DOCTOR' && (
        <g {...common}>
          <path d="M32 55C14 43 8 34 8 25c0-7.500 5.500-13 13-13 4.500 0 8.500 2.500 11 6.500C34.500 14.500 38.500 12 43 12c7.500 0 13 5.500 13 13 0 9-6 18-24 30z" />
          <path d="M32 24v14M25 31h14" strokeWidth="3.4" />
        </g>
      )}
      {role === 'POLICE' && (
        <g {...common}>
          <path d="M32 6l22 8v16c0 14-9.500 24-22 28C19.500 54 10 44 10 30V14l22-8z" />
          <polygon points={star(32, 31, 12.5, 5.5)} />
        </g>
      )}
      {role === 'CITIZEN' && (
        <g {...common}>
          <circle cx="32" cy="22" r="9.500" />
          <path d="M12 55c0-11.500 8.500-19 20-19s20 7.500 20 19" />
        </g>
      )}
    </svg>
  );
}

/** Round role badge with signature colour. */
export function RoleBadge({ role, size = 'size-12' }: { role: Role; size?: string }) {
  const r = ROLE_UI[role];
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-full ring-1', r.bg, r.ring, r.text, size)}>
      <RoleIcon role={role} className="size-[62%]" />
    </span>
  );
}

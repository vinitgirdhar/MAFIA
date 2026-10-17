# MAFIA — The City Sleeps

> Everyone has a role. Someone is lying.

A complete Mafia party game for **one phone**. One person is the **Mayor**: they host, narrate the night and tap names on the phone. Everyone else (4–20 players) hides a secret role. The app is the game manager — it deals roles privately, runs the night phases, counts secret votes, resolves ties, detects victory and shows the full story at the end.

No accounts, no backend, no second device. Installable as a PWA and fully playable **offline** after the first load.

## Play

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/ (works from any folder or domain)
npm run preview    # serve the production build, service worker included
npm test           # engine rules + 150 fuzzed full games
```

`dist/` is plain static files with relative URLs: drop it on GitHub Pages, Netlify, Vercel or any file host. For the phone to install it and use the offline cache it must be served over HTTPS (or `localhost`).

## The game

| Role | Night power |
| --- | --- |
| **Mafia** (always 1) | Silently kills one player |
| **Doctor** (always 1) | Silently protects one player, themselves included. Same pick as the Mafia = nobody dies |
| **Police** (always 1) | Silently investigates one player and privately learns if they are the Mafia |
| **Citizen** (everyone else) | None — discuss and vote |

Night → Mafia → Doctor → Police → Morning → Discussion → Vote → Elimination → victory check → next night.

- **City wins** the moment the Mafia is voted out. **Mafia wins** when living innocents ≤ living Mafia.
- A vote tie goes to a **runoff** between the tied players, voted on only by everyone else. A tied runoff eliminates nobody. Nothing is ever decided at random.
- Dead players can't vote, be voted for, be killed again or use powers. Their roles stay hidden until the game ends.

## Built for a shared phone

- **Roles**: each player taps their own name, *holds* to reveal, then hides. A role can't be viewed twice, and it's hidden instantly if the app is backgrounded or the phone locks.
- **Votes**: ballots are hidden the moment they're confirmed; only counts are ever shown, never who voted for whom.
- **Mayor gate**: night screens, the Control Center and "count the votes" sit behind an optional 4-digit passcode (or press-and-hold if none is set). The phone is re-locked whenever it has been out with the table.
- **Police result** is visible only while a finger is held down and is never spoken. Voice narration only ever says fixed lines like "Mafia, wake up." — never names or results.
- Browsers can't block screenshots, so the app doesn't pretend to.

## Mayor Control Center (shield icon)

Phase and round, living/eliminated counts, vote and night-action progress, continue / previous step / pause, reveal roles, review private night history, let one voter re-vote (without revealing ballots), reset the vote, restart (same players, new roles), end game, and **rewind**.

Rewind restores a full snapshot taken at the start of each night and each vote, so every later night, vote and elimination is discarded and replayed — a correction can never leave inconsistent state behind. Roles are never re-rolled mid-game.

## Reliability

Every accepted action is written to `localStorage` before the next event: refresh, lock the phone or close the browser and the game resumes exactly where it was (screens that hold a secret — a revealed role, a police result — come back hidden). **Resume Game** appears on the home screen for unfinished games.

## How it's built

React 19 · TypeScript · Tailwind CSS 4 · Motion · Vite. No other runtime dependencies (Inter is vendored; sounds are synthesized with Web Audio).

```
src/game/engine.ts   pure, deterministic state machine (reducer, rules, victory, rewind)
src/game/engine.test.ts
src/store.tsx        persistence + preferences
src/audio.ts         sound effects, optional narration, haptics
src/screens/         Setup · Roles · Night · Day · GameOver
src/ui/              kit, gate, dashboard, history, guides
sw-template.js       offline cache (the build injects the file list)
```

The engine takes randomness and the clock as inputs and returns the *same state object* for any action the rules reject, which is what the UI uses to enable or disable buttons and what the tests assert.

Inter font © The Inter Project Authors, SIL Open Font License (see `src/assets/fonts/LICENSE-Inter.txt`).

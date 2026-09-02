# Drill

Daily cognitive drills for astronaut-selection psychological testing. Static
site, no backend, no accounts. Everything is held in `localStorage`.

```
npm install
npm run dev        # http://localhost:5173
npm test           # scoring and staircase logic
npm run build      # static bundle in dist/
```

Published at <https://teja1995.github.io/Astronaut_Training/>. Every push to
`main` runs the tests and, if they pass, redeploys. `vite.config.ts` sets
`base: './'`, so the bundle works under the repository subpath without further
configuration.

## Shape of the code

```
src/
  lib/
    rng.ts          seeded RNG; every trial reproducible from its seed
    staircase.ts    the shared 2-down / 1-up controller
    session.ts      rotation, exposure stepping, benchmarks
    storage.ts      the single localStorage document
    defaults.ts     staircase bounds and drill constants
    store.tsx       the one context
  drills/<name>/    generator.ts, scoring.ts, and the component
  components/       shared UI and the drill host
```

Each drill exposes the same interface (`drills/contract.ts`): it is handed a
seed and a starting level, and reports level, score and trial count when it
finishes. Adding a drill means writing the folder and adding one line to
`components/DrillHost.tsx` and `lib/types.ts`.

## Difficulty

One controller for every staircased drill. Two consecutive correct trials step
difficulty up, one incorrect steps it down, which settles around 71 per cent
correct — inside the 70–80 per cent band where training happens.

The level reported for a session is the **mean of the last six reversals**, not
the highest level reached. Difficulty persists per drill; a session resumes two
steps below where the last one ended.

Visual memory staircases on cell count with exposure held at 3 s. Exposure only
begins coming down once cell count has plateaued across two weeks, then by one
250 ms step per week, floored at 500 ms.

## Data

One key, `astronaut-training/v1`, holding a JSON document: per-drill staircase
state, and one append-only record per completed run (timestamp, drill, seed,
level, raw score, trial count).

Writes happen after every completed drill, not at session end. Each write is
serialised, checked that it reads back with the same number of records, staged
in a shadow key, and only then committed — an interrupted write cannot truncate
history. On load, whichever of the two keys holds more history wins.

Two exports, under **Record**:

- **Full JSON download.** The browser is the only copy. The home screen nags if
  the last export is more than 14 days old.
- **Benchmarks** — maximum digit span backwards, and mental-rotation items
  correct in three minutes — as two plain numbers to copy into the spreadsheet.

Restore takes a previously downloaded file and replaces the local document,
after confirming the run counts.

## Known open item

The attitude indicator's horizon and pitch geometry are derived from the body
frame and commented in `drills/attitude/AttitudeIndicator.tsx`. The **roll
pointer convention** is the transport-aircraft arrangement: fixed scale and zero
index on the case, sky pointer carried by the card, so the pointer swings toward
the raised wing. Classic vacuum instruments put the graduations on the card and
the pointer appears to move the other way. Check this against a real instrument
before trusting the drill — reading it the wrong way round is worse than not
drilling at all.

## Deferred

The joystick monitoring and instrument-coordination task. Gamepad API, no
keyboard fallback. Not built.

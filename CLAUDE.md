# CLAUDE.md

Project guidance for Claude Code working in this repository.

## What this is

A single-user web app for daily cognitive drills, built for one person preparing
for astronaut-selection psychological testing. The test batteries in question
(ESA's, run historically by DLR in Hamburg) assess working memory, spatial
orientation, perceptual speed, mental arithmetic under time pressure, and
multi-parameter psychomotor tracking. Commercial DLR pilot-test preparation
software covers the same ground but is subscription-priced and best saved for
the weeks before an actual assessment. This app covers the drills that need
nothing but a screen, so they can be accumulated slowly over months.

The user is an avionics engineer. Assume technical literacy, assume he will read
the code, and do not explain web concepts in comments.

**The core design constraint: this must be usable in fifteen minutes a day
without friction.** Every second spent choosing, configuring, or navigating is a
second not spent drilling. Adherence is the thing that fails, not capability.

## Non-goals

Do not build these. They have been considered and rejected.

- User accounts, login, multi-user support.
- A backend, a database, or any server-side component.
- Analytics, telemetry, error reporting services.
- Native mobile apps.
- Leaderboards, streaks, badges, or any gamification. The user is not motivated
  by points and the drills must not be made pleasant at the cost of being hard.
- Anything that generates content via an LLM at runtime. All drill stimuli are
  generated locally and deterministically.

## Stack

- Vite + React + TypeScript.
- Tailwind for styling.
- No state management library. React state and one context are sufficient.
- Persistence via `localStorage` only.
- Deployable as a static bundle to GitHub Pages or Vercel.
- Vitest for the scoring and staircase logic. Those are the only parts worth
  testing; do not write component tests.

Keep the dependency list short. Every added package is a maintenance cost the
user will pay alone.

## The drills

Seven drills in v1. Each is a self-contained module exposing the same interface:
generate a trial, accept a response, score it, report to the staircase
controller.

### 1. Digit span backwards

Digits presented one at a time, 1 second each, then recalled in reverse order.
Staircase on span length. Start at 4.

Storage is not the skill; manipulation is. Do not implement forwards span.

### 2. Running memory span

A stream of digits at a fixed rate (1 per second) of *unpredictable* length,
then a prompt to report the last N. The unpredictability is the entire point —
the participant cannot wait and then encode, they must continuously maintain a
rolling buffer. Stream length must be randomised per trial (range 8–20) and must
never be shown or hinted at in the UI. Staircase on N. Start at 3.

### 3. Visual memory capacity

A square grid with some cells filled, shown briefly, then reproduced on a blank
grid. Two difficulty axes: number of filled cells and exposure duration.
Staircase on cell count first, holding exposure at 3s; once cell count plateaus
for a week, begin reducing exposure in 250ms steps.

Grid starts 4×4 with 6 filled cells.

### 4. Mental arithmetic

Timed, single-answer, no multiple choice. Mix of: two-digit multiplication,
running totals, percentages, unit conversions. Score is correct answers in 3
minutes, not accuracy — speed under pressure is the construct.

Include a speed–time–distance category using aviation units (knots, nautical
miles, feet per minute). This doubles as flight-training practice.

### 5. Heading arithmetic

Given a compass heading, answer one of: reciprocal, turn direction to a target
heading, degrees through that turn. Answers in degrees, three digits, wrapping
correctly at 360. Score is correct answers in 2 minutes.

Wrapping arithmetic is where errors cluster. Weight trials toward headings near
000/360.

### 6. Mental rotation

Two 3D block figures, decide same-object-rotated or mirrored. Render with CSS 3D
transforms or lightweight canvas — do not add a 3D library for this. Figures
generated from a random connected-cube walk, then rotated by a random rotation;
mirrored trials apply a reflection.

Score is correct answers in 3 minutes. This is one of the two benchmark drills.

### 7. Attitude interpretation

An artificial horizon is drawn, the participant states bank direction, bank
magnitude bucket, and pitch direction. Target is reflexive reading, so trials
are individually timed with a visible deadline that tightens as accuracy
improves.

Draw the instrument properly: sky/ground split, roll pointer and bank scale at
the standard graduations, pitch ladder. Getting this visually wrong makes the
drill actively harmful, so check it against a real attitude indicator before
considering it done.

## Adaptive difficulty

All staircased drills use a single shared controller. Target accuracy band is
70–80% — comfortable performance means no training effect, and the user has been
told this explicitly, so do not soften it.

Use a 2-down / 1-up staircase: two consecutive correct trials increase
difficulty one step, one incorrect decreases it one step. Track the reversal
points; the reported level for a session is the mean of the last six reversals,
not the highest level reached.

Difficulty state persists per drill across sessions. A session resumes near
where the last one ended, two steps below, as a warm-up.

## Session structure

The default session is 15 minutes. On open, the app proposes a session and the
user presses one key to start it. No configuration screen in the main path.

Rotation logic: arithmetic and heading arithmetic are cheap and go in every
session. Of the memory drills and the spatial drills, pick the two least
recently practised. Never schedule more than four drills in one session.

Provide a way to run any single drill on demand, but keep it out of the primary
flow.

## Data and export

One `localStorage` key holding a JSON document: per-drill difficulty state,
staircase history, and one record per completed drill run (timestamp, drill,
level reached, raw score, trial count).

Two exports, both essential:

- **Full JSON download**, so the record survives a cleared browser. Prompt for
  this if the last export is more than 14 days old.
- **Benchmark figures**, shown as two plainly labelled numbers to be copied
  by hand into an external spreadsheet: maximum digit span backwards, and
  mental-rotation items correct in three minutes. These are the two the user
  tracks against his physical benchmarks at weeks 13 and 26.

Data loss here is months of unrecoverable work. Write to storage after every
completed drill, not at session end, and never rewrite the document in a way
that could truncate history on a partial failure.

## Design direction

Ground the visual language in technical drawing rather than cockpit imagery —
the amber-on-black instrument look is the obvious move here and it is both a
cliché and bad for the task, since these drills demand a neutral field that does
not compete with the stimulus.

Palette: a cool paper ground (`#F2F3F1`), graphite text (`#232628`), a mid
blue-grey for rules and structure (`#8A959C`), one signal blue for interactive
elements (`#2D5BA8`), and a muted red used *only* for incorrect feedback
(`#A8442D`). No gradients. No shadows.

Type: one grotesque with an engineering lineage, used throughout. Numerals must
be tabular, and the face must distinguish 1/7 and 0/O unambiguously — this is a
functional requirement, not a preference, since misread digits corrupt the data.
IBM Plex Sans satisfies it.

Structure comes from thin rules and generous space, not cards or boxes. During a
drill the screen holds the stimulus and nothing else: no progress bar, no timer
unless the drill's construct requires one, no navigation. Chrome returns between
trials.

Motion only where it shows a state change the user caused. No entrance
animations.

Feedback after each trial is a single unambiguous mark and the correct answer if
wrong. No encouragement, no commentary.

## Conventions

- Drill modules live in `src/drills/<name>/`, each with the drill component,
  its generator, and its scoring function.
- Generators are pure and take a seeded RNG, so any trial can be reproduced from
  its seed. Store the seed with each record.
- Keyboard-first throughout. Every drill must be completable without a mouse,
  with number keys and Enter. Touch support is secondary but must not be broken.
- Respect `prefers-reduced-motion`.
- Keep components under 200 lines. Split by extracting logic, not by splitting
  JSX across files.

## Deferred to v2

A monitoring and instrument-coordination task: hold multiple parameters stable
against drift with a joystick while responding to a secondary discrete task.
This is the closest analogue to what is actually tested and the most valuable
drill in the set, but it needs a physical joystick that will not be available
until January.

Read it via the Gamepad API. Do not build a keyboard fallback — keyboard input
trains the wrong motor pattern and a bad version is worse than none.

Leave the architecture able to accept it. Do not build it yet.

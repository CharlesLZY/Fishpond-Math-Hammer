# React + Vite

## 40K Attack Simulator

The Simulator supports multiple collapsible attacking Unit Profiles against one
shared defender. Each unit can load or save an existing attacker Profile and
retains the existing unit-buff and weapon editors. Loading the same saved Profile
into multiple units creates independent copies; saving still stores one unit,
not the entire attacking group.

Use **Add Unit** to add another attacker. Each unit uses a single amber frame
containing its saved-profile controls and
editors. Collapsing an attacking unit hides the editors while keeping its
profile selector, save action, and remove action available. The 40K weapon and
target editors retain their listed order without up/down controls. Dropdowns
omit the clear-X control without changing selection or reset behavior.

Units resolve in the order they were added, preserving the defender's remaining
models and wounds. Each unit has its own single-hit and single-wound reroll
budgets, shared across that unit's weapons. Deferred Devastating Wounds resolve
before the next unit attacks, and Blast/Cleave use the target model count when
each attacking unit selects its target. Collapsed units still participate.
Results show the combined attack, and copied reports group weapons and buffs
by attacking unit. The Profile Library and independent Profile Comparison retain
their existing single-unit format and behavior.

## Data Source

11e Force Disposition Matrix: https://gdmissions.app/11th/matrix

## 40K Tactical Board

The board has two views. **Battlefield** contains the map and its tools only:
there are no scores, VP summaries, or mission-card scoring overlays on the map.
Switching views preserves bases, drawings, selections, and the map tools.
Map keyboard shortcuts are disabled while viewing **Missions & VP**.

**Missions & VP** uses the same sections and segmented controls as Battlefield.
A single **Attacker / Defender** switch above both mission sections controls
the primary and secondary inputs together. There are no player-name labels,
explanatory paragraphs, or primary mission-name labels:

- Primary scoring is a vertical R1-R5 table with three manual inputs per row
  and no visible stage captions. There is no 15 VP per-round limit; the
  primary total is capped at **45 VP**. Primary card references
  follow the Force Disposition matchup.
  Changing a primary mission clears that side's primary targets after a
  confirmation; changing only the layout preserves the plan.
- All 18 Tactical secondary missions can be included, excluded, or left
  undecided. Scores start blank and including a card does not fill in a score.
  Enter each card's target directly as a whole number from 0 to
  5 VP, or clear it while planning; saved manual values are preserved and
  scores are not restricted to a dropdown
  of printed scoring tiers. Compact cards show the score followed by VP,
  without a Target prefix. Click a card's name to view the locally bundled
  original PNG. There are no task notes or secondary round assignments.
- The secondary summary shows **Selected pool X/45 VP**, with no separate
  Planning cap line. X is the raw selected pool, so excess candidate points
  remain visible while overview scores are capped at 45. This is a potential scoring
  budget, not a prediction: draw order, battlefield conditions, and the 15 VP
  secondary limit per battle round are not simulated. Fixed scoring and
  Battle Ready VP are not included.

Plans save in browser storage and are included in battleplan JSON exports.
Existing v1 exports remain supported: their names and recorded scores are
preserved, but the recorded-score panel is no longer displayed. Recorded
scores are not converted into plans; files without a mission plan start
with an empty plan. Older plans with one primary total per round migrate that
value into the middle scoring field, preserving the total and leaving the other fields
blank. Stage entries, including zeroes and blanks, survive reloads and exports.

Secondary cards and Tactical scoring tiers:
[GDM secondary missions](https://gdmissions.app/11th/secondary-missions).
Scoring limits:
[GDM tournament companion](https://gdmissions.app/11th/rules/event-companion).

### 11e map assets

The 2026-10-18 map refresh uses the latest supplied Warhammer 40,000 Event
Companion PDF. It updates 27 layouts and both their clean-board and annotated
reference images; the other 18 layouts are unchanged. Terrain remains centrally
symmetric, including the existing repair to map 01. Objectives and deployment
boundaries follow the revised PDF and are not symmetrized.
Both image URL variants carry this revision to avoid stale browser caches.

The updated map IDs are 02, 03, 07, 08, 09, 10, 12, 14, 16, 17, 18, 19, 20, 22,
24, 26, 31, 32, 34, 35, 36, 37, 38, 39, 41, 44, and 45.

For subsequent PDF revisions, use the
[map-update AI skill](.github/skills/update-11e-maps/SKILL.md) and the
[prepare/apply/verify pipeline](../tools/CLEAN_MAP_PIPELINE.md) in the parent
Warhammer workspace. It archives the applied PDF, stages only changed layouts,
checks complete and centrally symmetric terrain, updates both image variants
and cache revisions, and preserves unchanged files. Deployment is a separate,
explicitly authorized step.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

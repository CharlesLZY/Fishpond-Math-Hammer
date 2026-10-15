# Project Overview

## What it is
**Math Hammer** — a single-page React app that helps Warhammer 40k and Age of
Sigmar players compute dice probabilities for the attack sequence and a few
related tools. Pure client-side; no backend.

## Tech stack
- **React 19** + **Vite 7** (ES modules, JSX, no TypeScript).
- **react-router-dom v7** for client-side routing (`BrowserRouter`).
- **zustand** for shared Macro Battleplan board state.
- **react-konva** + **konva** for Macro Battleplan canvas rendering.
- **react-select 5** for dropdowns (custom dark theme via `selectStyles.js`).
- **recharts 3** for distribution charts.
- **react-katex** + **katex** for σ (sigma) symbols in stat cards.
- **Vitest 4** for pure-logic and selected UI-helper tests.
- **ESLint 9** flat config (`eslint.config.js`).

No CSS framework and no backend.

## Pages (routes)
| Route | Component | Purpose |
|---|---|---|
| `/` and `/attack-simulator` | `AttackSimulator` | Full 40K unit-vs-unit Monte Carlo simulator with profile and unit-wide buffs. |
| `/attack-simulator/profiles` | `ProfileLibrary` | Manage, edit, import, and export saved 40K Profiles. |
| `/attack-simulator/compare` | `ProfileComparison` | Compare 2–4 attacker variants against one defender, with temporary unit buffs. |
| `/aos-attack-simulator` | `AoSAttackSimulator` | Streamlined AoS 4E multi-weapon damage simulator. |
| `/dice-calculator` | `DiceCalculator` | Hosts the 40K Wound Success and AoS Damage calculators. |
| `/macro-battleplan` | `MacroBattleplan` | Official 11e battleplans with base, drawing, ruler, mission-card, and scoring tools. |
| `/dice-roller` | `DiceRoller` | Roll up to 20 D6 and selectively reroll any face value (e.g. "reroll all 1s"). |
| `/cheat-sheet` | `Cheatsheet` | Static probability tables (1D6 success chances and 2D6 sums) with color-coded risk levels. |
| `/about` | `About` | Author / project info and local-storage reset. |

Routing entry point: [App.jsx](../src/App.jsx).

The 40K secondary navigation is **Simulator / Library / Comparison**.
Comparison may select the same saved attacker in multiple slots. Each slot
shows the saved buffs as a gray, read-only baseline. A separate Additional
Unit Buffs editor starts empty and edits only that slot's yellow additions;
the defender uses the same two-layer UI. Reroll selectors offer only actual
additions and can be cleared; empty selectors automatically keep saved rerolls.
Unit reroll layers keep the broader coverage (ones, ones/twos, full rerolls)
so adding reroll ones does not replace saved reroll failures. Failed and
non-critical rerolls remain alternative strategies: an explicit extra choice
between them takes precedence. Clearing it restores the saved reroll.
Other duplicate bonuses do not stack: sustained hits, critical thresholds,
and defensive reductions use the existing best-effect rules. The preview
and simulation use the same merged configuration without modifying either
saved library. Changing a selection clears its additions.
Result names append compact English labels for the slot's additional buffs
(for example `Intercessors +1Hit` or `Intercessors +1D Sustained 2`) in both
the ranking table and chart, regardless of UI language. The suffix is
captured with the simulation result; saved buffs and stored Profile names
are unchanged. Colors and slot labels remain available to distinguish variants.
The comparison table shows rank, attacker, expected kills, expected damage,
and wipe chance. Its bar chart compares expected kills.

## Calculators

### 40K Wound Success Calculator
Closed-form math. Given a hit stat, wound stat, modifiers (sustained hits,
lethal hits, devastating wounds, anti-X, rerolls, crit threshold), it produces:
- Hit / wound probabilities (with crit branches)
- Expected hits / crits / wounds / mortal wounds
- A binomial distribution chart over wound count

### AoS Damage Calculator
Closed-form AoS 4E math for a single weapon profile. It accepts A/Hit/Wound/
Rend/Damage, one critical-hit effect, and the defender's Save/Ward. It
produces expected hits, wounds reaching the save roll, failed saves, critical
mortal damage, and final damage after Ward.

### 40K Attack Simulator (`AttackSimulator`)
Monte Carlo simulator for the full 10e attack sequence end-to-end. Unlike
the quick calculators, this one supports:
- **Multiple weapon profiles** that fire in user-defined order, each with
  its own attacks/S/AP/D dice expressions and full buff set
  (TORRENT, LETHAL HITS, SUSTAINED 1/2, DEVASTATING WOUNDS, ANTI-X+).
- **Multiple target profiles** (e.g. squad + leader), each with its own
  T/W/Sv/Inv and defensive buffs (FNP, FNP vs MORTAL, −1 to hit, −1 to
  wound, conditional −1 wound when S>T, HALF DAMAGE, DAMAGE −1, DAMAGE = 1).
- **Persistence**: reusable attacker and defender Profile libraries in
  `localStorage`, with separate JSON Import/Export for each complete library.
- **Precision toggle**: 1,000 iterations by default, 10,000 with "High
  precision".
Results:
- Expected Models Killed (with 95% CI and σ)
- Expected Damage Dealt (only shown for the single-target / single-model
  case, since the metric is meaningless once the unit is wiped)
- Chance to Wipe Unit
- Per-profile breakdown table (when there are 2+ target profiles)
- Distribution chart of total models killed

### AoS Attack Simulator (`AoSAttackSimulator`)
Monte Carlo simulator for the AoS 4E attack sequence. It supports multiple
weapon profiles, random A and D dice expressions, Rend, and a defender profile
with Models, Health, Save, and Ward. Each profile's A value is its total attack
count; there is no separate weapon-count multiplier.
The following mutually exclusive critical hit effects are available:
- **Crit (2 Hits)** — a critical hit creates two wound rolls.
- **Crit (Auto-wound)** — a critical hit skips its wound roll.
- **Crit (Mortal)** — a critical hit skips wound and save rolls, then deals
  the weapon's Damage characteristic as mortal damage.

Normal and mortal damage both receive per-point Ward rolls. Damage spills
between models and is capped when the unit is destroyed. Results include
expected generated damage before Ward, theoretical damage after Ward, expected
kills, wipe chance, per-weapon breakdown, kill and allocated-damage
distributions, and a Markdown report that can be copied to the clipboard.

### 40K Tactical Board (`MacroBattleplan`)
The official GW battleplan for the chosen Force Disposition pairing is the
board, with base, drawing, ruler, mission-card, and scoring tools on top.

- 5 Force Dispositions × 15 pairings × 3 terrain layouts (A/B/C) = 45 official maps,
  indexed in `src/macro-battleplan/config/battleplans11e.js`.
- Two image variants per map in `public/battleplans-11e/`, built by
  `tools/build_11e_map_assets.py`: `map_XX.webp` is the clean board (880×1200 =
  20 px/inch, matching `PX_PER_INCH`) and `map_XX_ref.webp` is the original
  annotated page map shown by the reference pop-up on the canvas.
- The book button on the canvas opens both Primary Mission cards for the
  current Force Disposition matchup. Mirror matchups share one card; the 11
  two-sided missions include a flip control. The 25 fronts and 11 backs live
  under `public/battleplans-11e/primary-missions/`.
- Terrain, objectives and deployment zones are part of the printed layout and
  are not user-editable; only bases and drawings are.

## What the app does NOT do
- No backend, no analytics, no auth.
- No cloud sync or multiplayer state; saved boards and battlefield sharing are
  browser-local only.
- No accessibility audit beyond stock semantic HTML.
- The quick calculators and AoS Attack Simulator do not persist their inputs
  (the 40K Attack Simulator and 40K Tactical Board are the persistent tools).

import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { findBattleplan, getDisposition } from '../../config/battleplans11e'
import { createMissionPlan, MISSION_ROUNDS, PRIMARY_SCORE_PHASES, SECONDARY_MISSIONS } from '../../config/missionPlanning11e'
import { MissionWorkspace } from '../MissionWorkspace'
import { MissionCardDialog, MissionCardImage } from '../MissionCardDialog'

const { stateRef } = vi.hoisted(() => ({ stateRef: { current: null } }))

vi.mock('../../store/board11eStore', () => ({
  useBoard11eStore: (selector) => selector(stateRef.current),
}))

const battleplan = findBattleplan('take-and-hold', 'purge-the-foe', 'A')
const renderWorkspace = (side = 'player') => renderToStaticMarkup(
  <MissionWorkspace
    battleplan={battleplan}
    activeSide={side}
    onSideChange={vi.fn()}
  />,
)

describe('Missions & VP workspace', () => {
  beforeEach(() => {
    const emptyRounds = () => Object.fromEntries(MISSION_ROUNDS.map((round) => [round, '']))
    stateRef.current = {
      missionPlan: createMissionPlan(),
      missionPlanStorageError: null,
      setMissionPlan: vi.fn(),
      setScoreboard: vi.fn(),
      scoreboard: {
        playerName: 'You',
        opponentName: 'Opponent',
        scores: { player: emptyRounds(), opponent: emptyRounds() },
      },
    }
  })

  it('shows all 18 cards without maps, notes, or secondary round controls', () => {
    const html = renderWorkspace()
    expect(html.match(/class="mbp-secondary-card is-unassessed"/g)).toHaveLength(18)
    expect(html.match(/aria-label="Include /g)).toHaveLength(18)
    expect(html.match(/type="checkbox"/g)).toHaveLength(18)
    expect(html).not.toContain('aria-label="Exclude ')
    const list = html.split('class="mbp-secondary-list"')[1].split('</ul>')[0]
    expect(list.match(/aria-label="View .*? card"/g)).toHaveLength(18)
    expect(list).not.toContain('<select')
    expect(list.match(/type="number"/g)).toHaveLength(18)
    expect(list.match(/value=""/g)).toHaveLength(18)
    expect(list.match(/min="0" max="5" step="1" inputMode="numeric"/g)).toHaveLength(18)
    const scoreLabels = [...list.matchAll(/<label class="mbp-secondary-target">([\s\S]*?)<\/label>/g)]
    expect(scoreLabels).toHaveLength(18)
    for (const [, label] of scoreLabels) {
      expect(label.replace(/<[^>]*>/g, '')).toBe('VP')
    }
    expect(list).not.toMatch(/aria-label="[^"]*round [1-5]"/)
    expect(html).not.toContain('<textarea')
    expect(html).not.toContain('placeholder="Notes')
    expect(html).not.toContain('<canvas')
    expect(html).not.toContain('Map tools')
  })

  it.each([
    ['player', 'Attacker'],
    ['opponent', 'Defender'],
  ])('shows editable manual scores, zeroes, and empty inputs for %s', (side, name) => {
    const entries = stateRef.current.missionPlan.secondary[side]
    entries.assassination = { status: 'included', target: 2 }
    entries.beacon = { status: 'included', target: 0 }
    entries.cleanse = { status: 'unassessed', target: '' }
    entries.plunder.status = 'excluded'
    const html = renderWorkspace(side)
    const inputs = [...html.matchAll(/<input\b[^>]*>/g)].map(([input]) => input)
    const targetInput = (mission) =>
      inputs.find((input) => input.includes(`aria-label="${name} VP for ${mission}"`))

    expect(targetInput('Assassination')).toContain('value="2"')
    expect(targetInput('Assassination')).not.toContain('disabled')
    expect(targetInput('Beacon')).toContain('value="0"')
    expect(targetInput('Cleanse')).toContain('value=""')
    expect(targetInput('Plunder')).not.toContain('disabled')
    expect(html).toContain('class="mbp-secondary-summary__scores"><strong>2/45 VP</strong>')
  })

  it('places one checkbox before each card name and removes both verdict buttons', () => {
    stateRef.current.missionPlan.secondary.player.beacon.status = 'included'
    const html = renderWorkspace()
    const rows = html.match(/<li class="mbp-secondary-card[^"]*">[\s\S]*?<\/li>/g)
    expect(rows).toHaveLength(18)
    for (const row of rows) {
      expect(row).toMatch(/><label class="mbp-secondary-checkbox"><input type="checkbox"/)
      expect(row.indexOf('type="checkbox"')).toBeLessThan(row.indexOf('mbp-secondary-card__name'))
      expect(row.match(/<button /g)).toHaveLength(1)
    }
    expect(html.match(/class="mbp-secondary-card is-included"/g)).toHaveLength(1)
    expect(html).toMatch(/<input type="checkbox" aria-label="Include Beacon" checked=""/)
    expect(html).not.toContain('mbp-secondary-verdict')
    expect(html).not.toContain('mbp-secondary-include')
    expect(html).not.toContain('mbp-secondary-exclude')
    expect(html).not.toContain(' excluded')
    expect(html).not.toContain(' undecided')
  })

  it('shows legacy excluded cards as unchecked and editable without changing their saved scores', () => {
    stateRef.current.missionPlan.secondary.player.beacon = { status: 'excluded', target: 4 }
    const html = renderWorkspace()
    const row = html.match(/<li class="mbp-secondary-card[^"]*">[\s\S]*?<\/li>/g)
      .find((entry) => entry.includes('aria-label="Include Beacon"'))
    const checkbox = row.match(/<input type="checkbox"[^>]*>/)[0]
    expect(checkbox).not.toContain('checked')
    expect(row).toContain('class="mbp-secondary-card is-unassessed"')
    expect(row).toContain('aria-label="Attacker VP for Beacon" value="4"')
    expect(row).not.toContain('disabled')
    expect(html).toContain('class="mbp-secondary-summary__scores"><strong>0/45 VP</strong>')
    expect(stateRef.current.missionPlan.secondary.player.beacon).toEqual({ status: 'excluded', target: 4 })
  })

  it('uses a decorative shared check icon without replacing the accessible checkbox input', () => {
    const html = renderWorkspace()
    const indicators = [...html.matchAll(
      /<span class="mbp-secondary-checkbox__indicator" aria-hidden="true">([\s\S]*?)<\/span>/g,
    )]
    expect(indicators).toHaveLength(18)
    expect(html.match(/<input type="checkbox" aria-label="Include /g)).toHaveLength(18)
    for (const [, indicator] of indicators) {
      expect(indicator).toContain('lucide-check')
      expect(indicator).toContain('width="12"')
      expect(indicator).toContain('stroke-width="2.5"')
      expect(indicator).not.toContain('<button')
    }
  })

  it.each([
    ['player', 'Attacker'],
    ['opponent', 'Defender'],
  ])('provides five vertical rows of three primary inputs for %s', (side, label) => {
    stateRef.current.missionPlan.primary[side][1] = { command: 20, duringRound: 4, endGame: 2 }
    const html = renderWorkspace(side)
    const primary = html.split(`aria-label="${label} primary scoring"`)[1].split('</table>')[0]
    expect(primary).not.toContain('<thead>')
    expect(primary.replace(/<[^>]*>/g, '')).not.toMatch(/Command|This round|End game/)
    const rows = primary.split('<tbody>')[1].split('</tbody>')[0].match(/<tr>[\s\S]*?<\/tr>/g)
    expect(rows).toHaveLength(5)
    for (const row of rows) expect(row.match(/type="number"/g)).toHaveLength(3)
    expect(primary.match(/max="45"/g)).toHaveLength(15)
    expect(primary).not.toContain('max="15"')
    for (const phase of PRIMARY_SCORE_PHASES) {
      expect(primary).toContain(`${label} ${phase.label} VP round 1`)
      expect(primary).toContain(`${label} ${phase.label} VP round 5`)
    }
    expect(primary).toContain(`aria-label="${label} Command VP round 1" value="20"`)
    expect(html).toContain(`aria-label="${label} primary VP">26/45 VP</output>`)
    expect(primary).not.toContain(battleplan.mine.mission)
    expect(primary).not.toContain(battleplan.theirs.mission)
    expect(primary).toContain('>R1</th>')
    expect(primary).toContain('>R5</th>')
  })

  it.each([
    ['player', 'mine', 'theirs'],
    ['opponent', 'theirs', 'mine'],
  ])('shows the current %s primary mission as a card link without book icons', (side, current, other) => {
    const html = renderWorkspace(side)
    expect(html).toContain('class="mbp-primary-mission-name"')
    expect(html).toContain(`aria-label="View ${battleplan[current].mission} primary mission card"`)
    expect(html).toContain(`>${battleplan[current].mission}</button>`)
    expect(html).not.toContain(battleplan[other].mission)
    expect(html).not.toContain('lucide-book-open')
    expect(html).not.toContain('mbp-primary-cards-button')
  })

  it('keeps the primary title above the mission-name and VP row without a footer', () => {
    stateRef.current.missionPlan.primary.player[1] = { command: 10, duringRound: 4, endGame: '' }
    const html = renderWorkspace()
    const section = html.match(/<section[^>]*aria-label="Primary missions"[^>]*>([\s\S]*?)<\/section>/)[1]
    const header = section.match(/<header[^>]*>([\s\S]*?)<\/header>/)[1]
    const row = header.match(/<div class="mbp-section__header mbp-mission-section__heading mbp-primary-heading">([\s\S]*?)<\/div>/)[1]
    expect(header).toContain('<h2 id="mbp-primary-title">Primary missions</h2>')
    expect(header.indexOf('id="mbp-primary-title"')).toBeLessThan(header.indexOf('mbp-primary-heading'))
    expect(row).toContain('class="mbp-primary-mission-name"')
    expect(row).toContain(`>${battleplan.mine.mission}</button>`)
    expect(row).toContain('class="mbp-primary-total"')
    expect(row).toContain('aria-label="Attacker primary VP">14/45 VP</output>')
    expect(row.indexOf('mbp-primary-mission-name')).toBeLessThan(row.indexOf('mbp-primary-total'))
    expect(section.indexOf('mbp-primary-total')).toBeLessThan(section.indexOf('<table'))
    expect(section).not.toContain('<tfoot')
    expect(section.replace(/<[^>]*>/g, '')).not.toContain('Primary VP')
  })

  it('uses one shared side switch above both mission sections without explanatory copy', () => {
    stateRef.current.scoreboard.playerName = 'Alice'
    stateRef.current.scoreboard.opponentName = 'Bob'
    const html = renderWorkspace('opponent')
    expect(html.match(/class="mbp-section mbp-plan-overview"/g)).toHaveLength(2)
    expect(html.match(/class="mbp-section mbp-mission-section"/g)).toHaveLength(2)
    expect(html.match(/aria-label="Mission scoring side"/g)).toHaveLength(1)
    expect(html.match(/class="mbp-segmented mbp-plan-side-switch"/g)).toHaveLength(1)
    expect(html.indexOf('aria-label="Mission scoring side"'))
      .toBeLessThan(html.indexOf('class="mbp-mission-columns"'))
    expect(html).not.toContain('aria-label="Primary scoring side"')
    expect(html).not.toContain('aria-label="Secondary scoring side"')
    expect(html.match(/aria-label="Defender"[^>]*aria-pressed="true"/g)).toHaveLength(1)
    expect(html.match(/aria-label="Attacker"[^>]*aria-pressed="false"/g)).toHaveLength(1)
    expect(html.match(/aria-controls="mbp-mission-scores"/g)).toHaveLength(2)
    expect(html).not.toMatch(/\bYou\b|\bOpponent\b|Alice|Bob/)
    expect(html).not.toContain('Tactical')
    expect(html).not.toContain('Edit battleplan')
    expect(html).not.toContain('mbp-mission-badge')
    expect(html).not.toMatch(/<p(?:\s|>)/)
  })

  it('shows each Force Disposition color in the overview and side switch', () => {
    const html = renderWorkspace()
    expect(html.match(/class="mbp-mission-side-label"/g)).toHaveLength(4)
    for (const [label, key] of [['Attacker', 'mine'], ['Defender', 'theirs']]) {
      const color = getDisposition(battleplan[key].disposition).color
      expect(html).toContain(`aria-label="${label} plan overview" style="--mbp-side-color:${color}"`)
      expect(html.match(new RegExp(`background-color:${color}`, 'g'))).toHaveLength(2)
    }
  })

  it('caps the combined primary stages at 45 VP without changing the entered values', () => {
    stateRef.current.missionPlan.primary.player[1] = { command: 30, duringRound: 20, endGame: '' }
    const html = renderWorkspace()

    expect(html).toContain('aria-label="Attacker primary VP">45/45 VP</output>')
    expect(html).toContain('Primary: 50 / 45 VP')
    expect(html).toContain('aria-label="Attacker Command VP round 1" value="30"')
    expect(html).toContain('aria-label="Attacker This round VP round 1" value="20"')
  })

  it('shows a bare X/45 VP summary while keeping raw totals and capped overview scores', () => {
    for (const mission of SECONDARY_MISSIONS) {
      stateRef.current.missionPlan.secondary.player[mission.id].status = 'included'
      stateRef.current.missionPlan.secondary.player[mission.id].target = 5
    }
    const html = renderWorkspace()
    const summary = html.match(/<span class="mbp-secondary-summary__scores">([\s\S]*?)<\/span>/)[1]
    expect(summary).toBe('<strong>90/45 VP</strong>')
    expect(html).not.toContain('Selected pool')
    expect(html).not.toContain('Planning cap')
    expect(html).toContain('<strong>45<small> / 45</small></strong>')
    expect(html).toContain('Secondary pool: 90 / 45 VP')
  })

  it('keeps the opponent checklist independent from the player checklist', () => {
    stateRef.current.missionPlan.secondary.player.beacon.status = 'included'
    stateRef.current.missionPlan.secondary.opponent.beacon.status = 'excluded'
    const checkbox = (html) =>
      html.match(/<input type="checkbox" aria-label="Include Beacon"[^>]*>/)[0]
    expect(checkbox(renderWorkspace('player'))).toContain('checked=""')
    expect(checkbox(renderWorkspace('opponent'))).not.toContain('checked')
    expect(renderWorkspace('opponent')).toContain('aria-label="Defender secondary missions"')
  })

  it('omits the actual-score panel without altering legacy scores or mixing them into plans', () => {
    stateRef.current.scoreboard.scores.player[1] = 13
    const html = renderWorkspace()
    expect(html).not.toContain('mbp-actual-scores')
    expect(html).not.toContain('mbp-scoreboard')
    expect(html).not.toContain('Actual VP record')
    expect(html).not.toContain('actual VP round')
    expect(html.match(/type="number"/g)).toHaveLength(33)
    expect(html).toContain('class="mbp-secondary-summary__scores"><strong>0/45 VP</strong>')
    expect(stateRef.current.scoreboard.scores.player[1]).toBe(13)
  })

  it('surfaces a persistence error to the user', () => {
    stateRef.current.missionPlanStorageError = 'Export the board to keep your changes.'
    expect(renderWorkspace()).toContain(
      'role="alert">Export the board to keep your changes.</p>',
    )
  })

  it('renders an accessible native card dialog with a local original image', () => {
    const html = renderToStaticMarkup(
      <MissionCardDialog title="Beacon" onClose={vi.fn()}>
        <MissionCardImage
          src={SECONDARY_MISSIONS.find((mission) => mission.id === 'beacon').image}
          alt="Beacon secondary mission card"
        />
      </MissionCardDialog>,
    )
    expect(html).toContain('<dialog')
    expect(html).toContain('role="dialog" aria-modal="true"')
    expect(html).toContain('aria-label="Close mission cards"')
    expect(html).toContain('/battleplans-11e/secondary-missions/beacon.png')
  })
})

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MacroBattleplan11e from '../MacroBattleplan11e'
import { getDisposition } from '../config/battleplans11e'
import { createMissionPlan, MISSION_ROUNDS } from '../config/missionPlanning11e'

const { stateRef, selects } = vi.hoisted(() => ({
  stateRef: { current: null },
  selects: new Map(),
}))

vi.mock('../store/board11eStore', () => ({
  useBoard11eStore: (selector) => selector(stateRef.current),
}))

vi.mock('../../components/ui', async (importOriginal) => ({
  ...await importOriginal(),
  FormSelect: (props) => {
    selects.set(props['aria-label'], props)
    return <select aria-label={props['aria-label']} />
  },
}))

vi.mock('../board11e/Board11eCanvas', () => ({
  Board11eCanvas: () => <canvas aria-label="Tactical battlefield" />,
}))

vi.mock('../components/MacroToolBar', () => ({
  MacroToolBar: () => <div role="toolbar" aria-label="Map tools" />,
}))

vi.mock('../components/TipsButton', () => ({
  TipsButton: () => null,
}))

describe('Tactical board view separation', () => {
  beforeEach(() => {
    vi.stubGlobal('document', { body: {} })
    selects.clear()
    const rounds = () => Object.fromEntries(MISSION_ROUNDS.map((round) => [round, '']))
    const missionPlan = createMissionPlan()
    missionPlan.primary.player[2].duringRound = 12
    missionPlan.secondary.player.beacon.status = 'included'
    stateRef.current = {
      setup: { mine: 'take-and-hold', theirs: 'disruption', layout: 'A' },
      setSetup: vi.fn(),
      missionPlan,
      missionPlanStorageError: null,
      scoreboard: {
        playerName: 'You',
        opponentName: 'Opponent',
        scores: { player: { ...rounds(), 1: 13 }, opponent: rounds() },
      },
      pieces: [],
      drawings: [],
      selectedIds: [],
      selectedId: null,
      showMoveDistance: false,
    }
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps Battlefield completely free of scoring UI even when plans and actual scores exist', () => {
    const html = renderToStaticMarkup(<MacroBattleplan11e />)
    const battlefield = html.split('class="mbp-body"')[1]
    expect(battlefield).toBeDefined()
    expect(battlefield).toContain('aria-label="Tactical battlefield"')
    expect(battlefield).toContain('aria-label="Map tools"')
    expect(battlefield).not.toMatch(/\bVP\b/)
    expect(battlefield).not.toContain('<table')
    expect(battlefield).not.toContain('mbp-scoreboard')
    expect(battlefield).not.toContain('View primary cards')
    expect(battlefield).not.toContain('mbp-missions')
    expect(battlefield).not.toContain('primary target')
  })

  it('provides the two views with Battlefield selected by default', () => {
    const html = renderToStaticMarkup(<MacroBattleplan11e />)
    expect(html).toContain('aria-label="Tactical board views"')
    expect(html).toContain('aria-pressed="true">Battlefield</button>')
    expect(html).toContain('aria-pressed="false">Missions &amp; VP</button>')
  })

  it('places shared battleplan selectors above the tabs and keeps Layout in Battlefield', () => {
    const html = renderToStaticMarkup(<MacroBattleplan11e />)
    const setupIndex = html.indexOf('aria-label="Battleplan setup"')
    const tabsIndex = html.indexOf('aria-label="Tactical board views"')
    const battlefield = html.split('class="mbp-body"')[1]
    const setup = html.match(/<section[^>]*aria-label="Battleplan setup"[^>]*>([\s\S]*?)<\/section>/)[1]
    expect(setupIndex).toBeGreaterThan(-1)
    expect(setupIndex).toBeLessThan(tabsIndex)
    expect(html.match(/aria-label="Attacker"/g)).toHaveLength(1)
    expect(html.match(/aria-label="Defender"/g)).toHaveLength(1)
    expect(battlefield).not.toContain('aria-label="Attacker"')
    expect(battlefield).not.toContain('aria-label="Defender"')
    expect(battlefield).toContain('aria-label="Battlefield layout"')
    expect(setup).not.toContain('Layout A')
    for (const layout of ['A', 'B', 'C']) {
      expect(battlefield).toContain(`>Layout ${layout}</button>`)
    }
  })

  it('retains both selected disposition colors and the shared option renderer', () => {
    renderToStaticMarkup(<MacroBattleplan11e />)
    expect(selects.size).toBe(2)
    for (const [label, key] of [['Attacker', 'mine'], ['Defender', 'theirs']]) {
      const props = selects.get(label)
      const expected = getDisposition(stateRef.current.setup[key])
      expect(props.value.value).toBe(expected.id)
      expect(props.value.color).toBe(expected.color)
      const option = props.formatOptionLabel(props.value)
      expect(option.props.children[0].props.style.backgroundColor).toBe(expected.color)
    }
  })

  it('does not prompt to clear primary scores when all three stages are blank', () => {
    const confirm = vi.fn()
    vi.stubGlobal('window', { confirm })
    stateRef.current.missionPlan = createMissionPlan()
    renderToStaticMarkup(<MacroBattleplan11e />)
    selects.get('Attacker').onChange({ value: 'purge-the-foe' })

    expect(confirm).not.toHaveBeenCalled()
    expect(stateRef.current.setSetup).toHaveBeenCalledWith({ mine: 'purge-the-foe' })
  })

  it.each([
    ['Attacker', 'mine'],
    ['Defender', 'theirs'],
  ])('updates %s immediately without confirmation when primary scores exist', (label, key) => {
    const confirm = vi.fn(() => false)
    vi.stubGlobal('window', { confirm })
    const plan = createMissionPlan()
    plan.primary.player[5].endGame = 3
    plan.primary.opponent[5].endGame = 5
    stateRef.current.missionPlan = plan
    renderToStaticMarkup(<MacroBattleplan11e />)
    selects.get(label).onChange({ value: 'purge-the-foe' })

    expect(confirm).not.toHaveBeenCalled()
    expect(stateRef.current.setSetup).toHaveBeenCalledExactlyOnceWith({ [key]: 'purge-the-foe' })
  })
})

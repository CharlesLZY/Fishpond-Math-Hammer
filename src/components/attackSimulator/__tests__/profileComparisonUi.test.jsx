import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TACTICAL_LINE_COLORS } from '../../../lib/colors'
import { makeTarget, makeWeapon } from '../../../lib/attackSimProfiles'
import { DEFAULT_DRAW_COLOR } from '../../../macro-battleplan/config/board'
import { LangProvider } from '../../attackSim/lang'
import ProfileComparison, { ComparisonResults } from '../ProfileComparison'
import { AttackerProfilePreview, DefenderProfilePreview } from '../ProfilePreview'

const result = (expectedKills) => ({
  expectedKills,
  expectedKillsCILow: 0,
  expectedKillsCIHigh: 5,
  expectedDamage: 6,
  wipeProbability: 15,
})

const render = (content) =>
  renderToStaticMarkup(<LangProvider>{content}</LangProvider>)

describe('Profile comparison presentation', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', { getItem: () => null })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shares the unchanged Tactical Board line palette', () => {
    expect(TACTICAL_LINE_COLORS.map(({ value }) => value)).toEqual([
      '#6b8caf', '#f85149', '#3fb950', '#e3b341', '#e6e1d3',
    ])
    expect(DEFAULT_DRAW_COLOR).toBe(TACTICAL_LINE_COLORS[0].value)
    const html = render(
      <MemoryRouter>
        <ProfileComparison />
      </MemoryRouter>
    )
    expect(html).toContain('--attacker-color:#6b8caf')
    expect(html).toContain('--attacker-color:#f85149')
    expect(html).not.toContain('#e6e1d3')
  })

  it.each([
    ['en', 'Expected Models Killed', 'Chance to Wipe Unit'],
    ['zh', '预期击杀模型数', '全歼概率'],
  ])('labels every result metric in %s without a second result tree', (lang, kills, wipe) => {
    vi.stubGlobal('localStorage', { getItem: () => lang })
    const html = render(
      <ComparisonResults results={[
        { name: 'Alpha', color: '#6b8caf', result: result(3) },
        { name: 'Bravo', color: '#f85149', result: result(2) },
      ]} />
    )

    expect(html.match(/data-label=/g)).toHaveLength(8)
    expect(html).toContain(`data-label="${kills}"`)
    expect(html).toContain(`data-label="${wipe}"`)
    expect(html.match(/role="table"/g)).toHaveLength(1)
    expect(html.match(/role="rowheader"/g)).toHaveLength(2)
    expect(html).toContain('3.00')
    expect(html).toContain('15.0%')
    expect(html).toContain('-33.3%')
  })

  it('retains each attacker color regardless of result order', () => {
    const html = render(
      <ComparisonResults results={[
        { name: 'Gold', color: '#e3b341', result: result(4) },
        { name: 'Blue', color: '#6b8caf', result: result(2) },
      ]} />
    )

    expect(html.indexOf('--attacker-color:#e3b341')).toBeLessThan(
      html.indexOf('--attacker-color:#6b8caf')
    )
    expect(html).toContain('width:100%;background-color:#e3b341')
    expect(html).toContain('width:50%;background-color:#6b8caf')
  })

  it('renders zero-output comparisons without an invalid percentage', () => {
    const html = render(
      <ComparisonResults results={[
        { name: 'Alpha', color: '#6b8caf', result: result(0) },
        { name: 'Bravo', color: '#f85149', result: result(0) },
      ]} />
    )
    expect(html).not.toMatch(/NaN|Infinity/)
    expect(html.match(/width:0%/g)).toHaveLength(2)
  })

  it('shows a compact read-only attacker preview with an accessible expansion control', () => {
    const html = render(
      <AttackerProfilePreview
        name="Squad"
        profile={{
          weapons: ['First', 'Second', 'Third'].map((name) => makeWeapon({ name })),
          unitBuffs: { plusOneAttack: true },
        }}
      />
    )

    expect(html).toContain('First')
    expect(html).toContain('Second')
    expect(html).not.toContain('Third')
    expect(html).toContain('3 weapon profiles')
    expect(html).toContain('A 5')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('aria-controls=')
    expect(html).not.toMatch(/<(input|select|textarea)\b/)
  })

  it('keeps a complete short defender preview free of unnecessary controls', () => {
    const html = render(
      <DefenderProfilePreview
        name="Defender"
        profile={{
          targets: [makeTarget({ name: 'Guard', invulnSave: 4, fnp: 5 })],
          defenderUnitBuffs: {},
        }}
      />
    )
    expect(html).toContain('Inv 4+')
    expect(html).toContain('FNP 5+')
    expect(html).not.toContain('aria-expanded=')
    expect(html).not.toMatch(/<(input|select|textarea)\b/)
  })
})

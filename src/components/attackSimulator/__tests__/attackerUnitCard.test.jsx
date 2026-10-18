import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultAttackerProfile, makeTarget, makeWeapon } from '../../../lib/attackSimProfiles'
import { makeTargetUnitBuffs, makeUnitBuffs } from '../../../lib/dice'
import { LangProvider } from '../../attackSim/lang'
import ProfileCardShell from '../../attackSim/ProfileCardShell'
import AttackSimulator from '../../AttackSimulator'
import AttackerUnitCard from '../AttackerUnitCard'
import { AttackerProfileWorkspace, DefenderProfileWorkspace } from '../ProfileWorkspaces'

const render = (content) =>
  renderToStaticMarkup(<LangProvider>{content}</LangProvider>)

const renderCard = (overrides = {}) => render(
  <AttackerUnitCard
    unit={{ id: 1, name: '', ...createDefaultAttackerProfile() }}
    index={0}
    total={1}
    savedProfiles={[]}
    onLoad={vi.fn()}
    onSave={vi.fn()}
    onChange={vi.fn()}
    onRemove={vi.fn()}
    {...overrides}
  />
)

describe('Simulator unit cards', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', { getItem: () => null })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts the Simulator with one expanded unit and an add-unit action', () => {
    const html = render(<AttackSimulator />)

    expect(html.match(/class="attack-sim-unit-group attacker-unit-card"/g)).toHaveLength(1)
    expect(html).toContain('aria-expanded="true"')
    expect(html).toContain('+ Add Unit')
    expect(html).not.toContain('+ Add Unit Profile')
    expect(html).toContain('Defender Profiles')
    expect(html).toContain('Load saved defender profile')
    expect(html).not.toContain('attacker-unit-meta')
    expect(html).not.toContain('attacker-units-hint')
  })

  it('connects the disclosure button to the initially visible unit content', () => {
    const html = renderCard()
    const contentId = html.match(/aria-controls="([^"]+)"/)?.[1]

    expect(contentId).toBeDefined()
    expect(html).toContain('aria-label="Collapse Unit 1"')
    expect(html).toContain('aria-expanded="true"')
    expect(html).toContain(`<div id="${contentId}" class="attacker-unit-content">`)
    expect(html).toContain('aria-label="Load saved profile for unit 1"')
    expect(html).toContain('aria-label="Saved profiles for unit 1"')
  })

  it('shows only the saved profile instead of unit numbering or profile counts', () => {
    const html = renderCard({
      unit: {
        id: 2,
        name: 'Squad',
        weapons: [makeWeapon(), makeWeapon()],
        unitBuffs: makeUnitBuffs(),
      },
      index: 1,
      total: 3,
      savedProfiles: ['Squad'],
    })

    const text = html.replace(/<[^>]*>/g, '')
    expect(text).toContain('Squad')
    expect(text).not.toContain('Unit 2')
    expect(text).not.toContain('weapon profiles')
    expect(html).toContain('aria-label="Load saved profile for unit 2"')
    expect(html).toContain('aria-label="Saved profiles for unit 2"')
  })

  it('uses one amber frame with the saved-profile controls outside the collapsible editors', () => {
    const html = renderCard()
    const header = html.match(/<header class="attacker-unit-header">(.+?)<\/header>/)?.[1]

    expect(html.match(/class="attack-sim-unit-group(?: [^"]*)?"/g)).toHaveLength(1)
    expect(html).toContain('class="attack-sim-unit-workspace"')
    expect(header).toContain('class="profile-set-controls"')
    expect(header).toContain('aria-label="Load saved profile for unit 1"')
    expect(header).toContain('aria-label="Save Profile" title="Save Profile"')
    expect(html.indexOf('class="profile-set-controls"'))
      .toBeLessThan(html.indexOf('class="attacker-unit-content"'))
  })

  it('includes the defender profile selector inside its single amber frame', () => {
    const html = render(<AttackSimulator />)

    expect(html).toContain(
      'class="attack-sim-unit-group defender-unit-card"><div class="profile-set-controls"'
    )
    expect(html.match(/class="attack-sim-unit-group(?: [^"]*)?"/g)).toHaveLength(2)
  })

  it.each([
    [1, true],
    [3, false],
  ])('prevents removing the only unit when the total is %s', (total, disabled) => {
    const html = renderCard({ total })
    const button = html.match(/<button[^>]*aria-label="Remove unit 1"[^>]*>/)?.[0]

    expect(button).toBeDefined()
    expect(button.includes('disabled=""')).toBe(disabled)
  })

  it('does not add unit sorting or duplication controls', () => {
    const html = renderCard()
    const header = html.match(/<header class="attacker-unit-header">(.+?)<\/header>/)?.[1]

    expect(header).toBeDefined()
    expect(header).not.toContain('Move up')
    expect(header).not.toContain('Move down')
    expect(header).not.toContain('Duplicate')
  })

  it('removes all 40K weapon and target move buttons without removing copy or delete', () => {
    const html = render(<AttackSimulator />)

    expect(html).not.toContain('title="Move up"')
    expect(html).not.toContain('title="Move down"')
    expect(html.match(/title="Duplicate"/g)).toHaveLength(2)
    expect(html.match(/title="Remove"/g)).toHaveLength(2)
  })

  it('keeps standalone Library workspaces framed', () => {
    const workspaces = [
      render(
        <AttackerProfileWorkspace
          weapons={[makeWeapon()]}
          unitBuffs={makeUnitBuffs()}
          onWeaponsChange={vi.fn()}
          onUnitBuffsChange={vi.fn()}
        />
      ),
      render(
        <DefenderProfileWorkspace
          targets={[makeTarget()]}
          defenderUnitBuffs={makeTargetUnitBuffs()}
          onTargetsChange={vi.fn()}
          onDefenderUnitBuffsChange={vi.fn()}
        />
      ),
    ]

    for (const html of workspaces) {
      expect(html.match(/class="attack-sim-unit-group"/g)).toHaveLength(1)
      expect(html).not.toContain('class="attack-sim-unit-workspace"')
    }
  })

  it('preserves shared-card move actions for callers such as the AoS simulator', () => {
    const html = render(
      <ProfileCardShell
        name="Weapon"
        placeholder="Weapon"
        index={0}
        total={2}
        onNameChange={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
        onDuplicate={vi.fn()}
        onRemove={vi.fn()}
      />
    )

    expect(html).toContain('title="Move up" disabled=""')
    expect(html).toContain('title="Move down"')
  })

  it('retains the existing combined aura and single-roll buff editors', () => {
    const html = renderCard({
      unit: {
        id: 1,
        name: '',
        weapons: [makeWeapon()],
        unitBuffs: makeUnitBuffs({
          hitReroll: 'reroll-one',
          woundReroll: 'reroll-one',
          rerollOneFailedHit: true,
          rerollOneFailedWound: true,
        }),
      },
    })

    expect(html).toContain('Hit Reroll')
    expect(html).toContain('Wound Reroll')
    expect(html).toContain('Reroll Ones')
    expect(html).toContain('aria-pressed="true">REROLL ONE HIT')
    expect(html).toContain('aria-pressed="true">REROLL ONE WOUND')
    expect(html).toContain('Edit buffs')
  })

  it('localizes the unit labels and saved-profile selector in Chinese', () => {
    vi.stubGlobal('localStorage', { getItem: () => 'zh' })
    const html = renderCard()

    const text = html.replace(/<[^>]*>/g, '')
    expect(text).not.toContain('单位 1')
    expect(text).not.toContain('个武器面板')
    expect(html).toContain('aria-label="折叠单位 1"')
    expect(html).toContain('aria-label="为单位 1 加载已保存面板"')
    expect(html).toContain('aria-label="移除单位 1"')
    expect(render(<AttackSimulator />)).toContain('+ 添加单位')
    expect(render(<AttackSimulator />)).not.toContain('+ 添加单位面板')
  })
})

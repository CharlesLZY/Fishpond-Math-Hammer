import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TACTICAL_LINE_COLORS } from '../../../lib/colors'
import { makeTarget, makeWeapon } from '../../../lib/attackSimProfiles'
import { DEFAULT_DRAW_COLOR } from '../../../macro-battleplan/config/board'
import { LangProvider, useT } from '../../attackSim/lang'
import AttackSimulator from '../../AttackSimulator'
import ProfileComparison, { ComparisonResults } from '../ProfileComparison'
import { AttackerProfilePreview, DefenderProfilePreview } from '../ProfilePreview'
import AttackSimulatorLayout from '../AttackSimulatorLayout'
import ProfileLibrary from '../ProfileLibrary'

const result = (expectedKills) => ({
  expectedKills,
  expectedKillsCILow: 0,
  expectedKillsCIHigh: 5,
  expectedDamage: 6,
  wipeProbability: 15,
})

const render = (content) =>
  renderToStaticMarkup(<LangProvider>{content}</LangProvider>)

function ProfileMessages() {
  const { t } = useT()
  return (
    <ul>
      <li>{t('saveProfileAs', t('attackerProfile'))}</li>
      <li>{t('profileSaved', t('defenderProfile'), 'User Profile')}</li>
      <li>{t('profileExistsConfirm', 'User Profile')}</li>
      <li>{t('newProfile')}</li>
      <li>{t('renameProfile')}</li>
      <li>{t('duplicateProfile')}</li>
      <li>{t('discardProfileChangesConfirm')}</li>
      <li>{t('deleteProfileConfirm', 'User Profile')}</li>
      <li>{t('profilesExported', 2)}</li>
      <li>{t('profilesImported', 3, 2, 1)}</li>
    </ul>
  )
}

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
    expect(html).not.toContain('comparison-buff-legend')
  })

  it.each([
    ['en', 'Saved Profiles are required for comparison.', 'Manage Profiles'],
    ['zh', '请先保存用于对比的面板。', '管理面板'],
  ])('keeps only the empty-state heading and library link in %s', (lang, heading, link) => {
    vi.stubGlobal('localStorage', {
      getItem: (key) => key === 'attackSim_lang' ? lang : null,
    })
    const html = render(
      <MemoryRouter>
        <ProfileComparison />
      </MemoryRouter>
    )
    const emptyState = html.match(/<div class="profile-comparison-empty">(.+?)<\/div>/)?.[1]

    expect(emptyState).toContain(`<strong>${heading}</strong>`)
    expect(emptyState).toContain(`>${link}</a>`)
    expect(emptyState).not.toContain('<span>')
  })

  it('uses 面板 in Chinese actions and messages without translating saved names', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key) => key === 'attackSim_lang' ? 'zh' : null,
    })
    const messages = render(<ProfileMessages />)
    for (const text of [
      '保存攻击方面板，请输入名称：',
      '已保存防御方面板“User Profile”。',
      '面板“User Profile”已存在，是否覆盖？',
      '新建面板',
      '重命名',
      '复制',
      '放弃尚未保存的面板修改？',
      '删除已保存的面板“User Profile”？',
      '已导出 2 个面板。',
      '已导入 3 个面板：新增 2 个，覆盖 1 个。',
    ]) {
      expect(messages).toContain(text)
    }
    const simulator = render(<AttackSimulator />)
    expect(simulator).toContain('保存面板…')
    expect(simulator).toContain('更新面板')
    expect(simulator).toContain('aria-label="加载已保存的攻击方面板"')
    expect(simulator).toContain('aria-label="加载已保存的防御方面板"')
  })

  it.each([
    ['en', 'Expected Models Killed', 'Chance to Wipe Unit'],
    ['zh', '预期击杀模型数', '全歼概率'],
  ])('labels every result metric in %s without a second result tree', (lang, kills, wipe) => {
    vi.stubGlobal('localStorage', { getItem: () => lang })
    const html = render(
      <ComparisonResults results={[
        { name: 'Alpha', color: '#6b8caf', slotNumber: 1, result: result(3) },
        { name: 'Bravo', color: '#f85149', slotNumber: 2, result: result(2) },
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
        { name: 'Gold', color: '#e3b341', slotNumber: 4, result: result(4) },
        { name: 'Blue', color: '#6b8caf', slotNumber: 1, result: result(2) },
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
        { name: 'Alpha', color: '#6b8caf', slotNumber: 1, result: result(0) },
        { name: 'Bravo', color: '#f85149', slotNumber: 2, result: result(0) },
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
    expect(html).not.toContain('3 weapon profiles')
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

  it('identifies repeated attackers by slot in both ranked results and bars', () => {
    const html = render(
      <ComparisonResults results={[
        { name: 'Same Profile', color: '#f85149', slotNumber: 2, result: result(4) },
        { name: 'Same Profile', color: '#6b8caf', slotNumber: 1, result: result(2) },
      ]} />
    )

    expect(html.match(/role="rowheader"/g)).toHaveLength(2)
    expect(html).toContain('comparison-result-variant">Attacker 2</span>')
    expect(html).toContain('comparison-result-variant">Attacker 1</span>')
    expect(html).toContain('Attacker 2 · Same Profile')
    expect(html).toContain('Attacker 1 · Same Profile')
  })

  it('only needs one saved attacker and one saved defender to start selecting variants', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key) => ({
        'attackSim:attackerProfiles': JSON.stringify({
          Shared: { weapons: [makeWeapon()], unitBuffs: null },
        }),
        'attackSim:defenderProfiles': JSON.stringify({
          Target: { targets: [makeTarget()], defenderUnitBuffs: null },
        }),
      })[key] ?? null,
    })
    const html = render(
      <MemoryRouter>
        <ProfileComparison />
      </MemoryRouter>
    )

    expect(html).not.toContain('profile-comparison-empty')
    expect(html).not.toContain('<select')
    expect(html.match(/role="combobox"/g)).toHaveLength(3)
    expect(html).toContain('aria-label="Select Defender Profile"')
    expect(html).toContain('aria-label="Select Attacker Profile 1"')
    expect(html).toContain('aria-label="Select Attacker Profile 2"')
    expect(html).not.toContain('<p>')
  })

  it.each([
    ['en', 'Library'],
    ['zh', '面板库'],
  ])('uses the shortened %s Library label and omits child Profile counts', (lang, label) => {
    vi.stubGlobal('localStorage', {
      getItem: (key) => ({
        attackSim_lang: lang,
        'attackSim:attackerProfiles': JSON.stringify({
          Squad: { weapons: [makeWeapon(), makeWeapon(), makeWeapon()], unitBuffs: null },
        }),
      })[key] ?? null,
    })
    const navigation = render(
      <MemoryRouter>
        <AttackSimulatorLayout />
      </MemoryRouter>
    )
    const library = render(<ProfileLibrary />)

    expect(navigation).toContain(`>${label}</a>`)
    expect(library).toContain(`<h2>${label}</h2>`)
    expect(library).toContain('<span>Squad</span>')
    expect(library).not.toContain('<small>')
    expect(library).not.toContain('<p>')
  })
})

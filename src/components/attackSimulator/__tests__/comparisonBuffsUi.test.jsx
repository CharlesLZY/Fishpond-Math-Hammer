import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeTargetUnitBuffs, makeUnitBuffs, mergeTargetUnitBuffs, mergeUnitBuffs } from '../../../lib/dice'
import { makeTarget, makeWeapon } from '../../../lib/attackSimProfiles'
import { LangProvider } from '../../attackSim/lang'
import UnitBuffsPanel from '../UnitBuffsPanel'
import WeaponBuffsEditor from '../WeaponBuffsEditor'
import DefenderUnitBuffsPanel from '../DefenderUnitBuffsPanel'
import TargetBuffsEditor from '../TargetBuffsEditor'
import { AttackerProfilePreview, DefenderProfilePreview } from '../ProfilePreview'
import {
  buildComparisonProfileName,
  buildAttackerUnitBuffSummary,
  buildDefenderUnitBuffSummary,
  buildTargetSummary,
  buildWeaponSummary,
} from '../profileSummaries'

const render = (content) =>
  renderToStaticMarkup(<LangProvider>{content}</LangProvider>)

const buttonAttributes = (html, label) =>
  [...html.matchAll(/<button\b([^>]*)>([^<]*)<\/button>/g)]
    .find(([, , text]) => text === label)?.[1]

const inputMarkup = (html, label) =>
  [...html.matchAll(/<input\b[^>]*>/g)]
    .map(([input]) => input)
    .find((input) => input.includes(`aria-label="${label}"`))

const chipOrigins = (html, label) =>
  [...html.matchAll(/<span\b[^>]*class="[^"]*comparison-buff--(saved|added)"[^>]*>([^<]*)<\/span>/g)]
    .filter(([, , text]) => text === label)
    .map(([, origin]) => origin)

describe('comparison Profile names', () => {
  it.each([
    ['rerollFailedHit', 'HitFailRR 1', 1],
    ['rerollFailedWound', 'WoundFailRR 1', 1],
    ['plusOneAttack', '+1A'],
    ['plusOneDamage', '+1D'],
    ['plusOneAp', '+1AP'],
    ['plusOneHit', '+1Hit'],
    ['plusOneWound', '+1Wound'],
    ['lethalHits', 'LethalHits'],
    ['devastatingWounds', 'DevWounds'],
    ['ignoresCover', 'IgnoresCover'],
  ])('includes the enabled %s addition in the name', (key, suffix, value = true) => {
    expect(buildComparisonProfileName('Squad', makeUnitBuffs({ [key]: value })))
      .toBe(`Squad ${suffix}`)
  })

  it('retains reroll strategies, numeric parameters, and every enabled addition', () => {
    const extra = Object.freeze(makeUnitBuffs({
      hitReroll: 'reroll-fail',
      woundReroll: 'reroll-one-two',
      rerollFailedHit: 2,
      rerollFailedWound: 3,
      plusOneAttack: true,
      plusOneDamage: true,
      plusOneAp: true,
      plusOneHit: true,
      plusOneWound: true,
      lethalHits: true,
      devastatingWounds: true,
      sustainedHits: 'D3',
      critHitEnabled: true,
      critHit: 4,
      ignoresCover: true,
    }))

    expect(buildComparisonProfileName('Squad', extra)).toBe(
      'Squad HitRR: Fails WoundRR: Ones and Twos HitFailRR 2 WoundFailRR 3 +1A +1D +1AP +1Hit +1Wound LethalHits DevWounds Sustained D3 CritHit 4+ IgnoresCover'
    )
  })

  it.each([
    ['reroll-one', '1s'],
    ['reroll-one-two', 'Ones and Twos'],
    ['reroll-fail', 'Fails'],
    ['reroll-non-critical', 'Non-Crit'],
  ])('distinguishes the %s reroll choice', (mode, label) => {
    expect(buildComparisonProfileName('Squad', { hitReroll: mode, woundReroll: mode }))
      .toBe(`Squad HitRR: ${label} WoundRR: ${label}`)
  })

  it('omits disabled buffs and leaves the original name intact with no additions', () => {
    for (const extra of [undefined, null, {}, makeUnitBuffs({ critHit: 2 })]) {
      expect(buildComparisonProfileName('原面板 Profile A', extra)).toBe('原面板 Profile A')
    }
    expect(buildComparisonProfileName('Squad', {
      sustainedHits: 'D6',
      critHit: 2,
      critHitEnabled: false,
    })).toBe('Squad Sustained D6')
  })

  it('captures a label string without renaming or changing saved data', () => {
    const saved = Object.freeze({
      name: 'Squad',
      unitBuffs: Object.freeze(makeUnitBuffs({ lethalHits: true })),
    })
    const extra = makeUnitBuffs({ plusOneHit: true })
    const snapshot = buildComparisonProfileName(saved.name, extra)
    extra.plusOneHit = false

    expect(snapshot).toBe('Squad +1Hit')
    expect(buildComparisonProfileName(saved.name, extra)).toBe('Squad')
    expect(saved.name).toBe('Squad')
    expect(saved.unitBuffs.lethalHits).toBe(true)
    expect(snapshot).not.toContain('LethalHits')
  })
})

describe('Blast and Cleave numeric editors and summaries', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', { getItem: () => null })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each([
    ['en', 'BLAST', 'CLEAVE'],
    ['zh', '爆炸', '劈砍'],
  ])('renders only the selected inline numeric input in %s', (lang, blastLabel, cleaveLabel) => {
    vi.stubGlobal('localStorage', { getItem: () => lang })

    for (const [label, otherLabel, value, flags] of [
      [blastLabel, cleaveLabel, 2, { blast: true }],
      [cleaveLabel, blastLabel, 5, { cleaveEnabled: true }],
    ]) {
      const profile = makeWeapon({ blastValue: 2, cleaveValue: 5, ...flags })
      const html = render(<WeaponBuffsEditor profile={profile} onChange={vi.fn()} />)

      expect(buttonAttributes(html, label)).toContain('aria-pressed="true"')
      expect(buttonAttributes(html, otherLabel)).toContain('aria-pressed="false"')
      expect(inputMarkup(html, `${label} value`)).toContain(`value="${value}"`)
      expect(inputMarkup(html, `${label} value`)).toContain('title="1, 2, 3, 4, 5"')
      expect(inputMarkup(html, `${otherLabel} value`)).toBeUndefined()
    }
  })

  it.each([
    [undefined, 1],
    [2, 2],
    [5, 5],
    [6, 5],
  ])('keeps editor values and summaries consistent for X = %s', (value, expected) => {
    for (const [key, label, flags] of [
      ['blast', 'BLAST', { blast: true }],
      ['cleave', 'CLEAVE', { cleaveEnabled: true }],
    ]) {
      const profile = {
        ...makeWeapon(flags),
        blastValue: value,
        cleaveValue: value,
      }
      const html = render(<WeaponBuffsEditor profile={profile} onChange={vi.fn()} />)

      expect(inputMarkup(html, `${label} value`)).toContain(`value="${expected}"`)
      expect(buildWeaponSummary(profile, null, (key) => key)).toEqual([
        { key, label: `${key} ${expected}`, upgraded: false },
      ])
    }
  })

  it('shows only Blast for a conflicting legacy profile', () => {
    const profile = {
      ...makeWeapon({ blast: true, blastValue: 2 }),
      cleaveEnabled: true,
      cleaveValue: 5,
    }
    const html = render(<WeaponBuffsEditor profile={profile} onChange={vi.fn()} />)

    expect(buttonAttributes(html, 'BLAST')).toContain('aria-pressed="true"')
    expect(buttonAttributes(html, 'CLEAVE')).toContain('aria-pressed="false"')
    expect(inputMarkup(html, 'BLAST value')).toContain('value="2"')
    expect(inputMarkup(html, 'CLEAVE value')).toBeUndefined()
    expect(buildWeaponSummary(profile, null, (key) => key)).toEqual([
      { key: 'blast', label: 'blast 2', upgraded: false },
    ])
  })

  it('hides numeric inputs and summary chips while both buffs are disabled', () => {
    const profile = makeWeapon({ blastValue: 5, cleaveValue: 5 })
    const html = render(<WeaponBuffsEditor profile={profile} onChange={vi.fn()} />)

    expect(inputMarkup(html, 'BLAST value')).toBeUndefined()
    expect(inputMarkup(html, 'CLEAVE value')).toBeUndefined()
    expect(buildWeaponSummary(profile, null, (key) => key)).toEqual([])
  })
})

describe('comparison additional-buff editors and read-only origins', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', { getItem: () => null })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each([
    ['en', 'REROLL FAILED HIT DICE', 'REROLL FAILED WOUND DICE'],
    ['zh', '重投失败命中骰', '重投失败造伤骰'],
  ])('offers shared failed rerolls only in the %s unit editor and unit summaries', (
    lang, hitLabel, woundLabel
  ) => {
    vi.stubGlobal('localStorage', { getItem: () => lang })
    const unitBuffs = makeUnitBuffs({
      hitReroll: 'reroll-one',
      woundReroll: 'reroll-one',
      rerollFailedHit: 2,
      rerollFailedWound: 3,
    })
    const active = render(<UnitBuffsPanel value={unitBuffs} additional onChange={vi.fn()} />)
    const empty = render(<UnitBuffsPanel value={makeUnitBuffs()} onChange={vi.fn()} />)
    const disabled = render(<UnitBuffsPanel value={unitBuffs} disabled onChange={vi.fn()} />)
    const weapon = render(<WeaponBuffsEditor profile={makeWeapon()} onChange={vi.fn()} />)

    for (const [label, count] of [[hitLabel, 2], [woundLabel, 3]]) {
      expect(buttonAttributes(active, label)).toContain('aria-pressed="true"')
      expect(buttonAttributes(active, label)).not.toContain('disabled=""')
      expect(inputMarkup(active, `${label} value`)).toContain(`value="${count}"`)
      expect(inputMarkup(active, `${label} value`)).toContain('title="1, 2, 3"')
      expect(buttonAttributes(empty, label)).toContain('aria-pressed="false"')
      expect(inputMarkup(empty, `${label} value`)).toBeUndefined()
      expect(buttonAttributes(disabled, label)).toContain('disabled=""')
      expect(inputMarkup(disabled, `${label} value`)).toContain('disabled=""')
      expect(weapon).not.toContain(label)
    }
    expect(active).toContain('buff-chip active with-value comparison-buff--added')
    expect(active).not.toContain('unit-buffs-hint')
    expect(buildAttackerUnitBuffSummary(unitBuffs, (key) => key).map(({ key }) => key))
      .toContain('rerollFailedHit')
    expect(buildWeaponSummary(makeWeapon(), null, (key) => key)).toEqual([])

    const saved = {
      weapons: [makeWeapon(), makeWeapon()],
      unitBuffs: makeUnitBuffs({ rerollFailedHit: 2 }),
    }
    const extra = makeUnitBuffs({ rerollFailedWound: 3 })
    const preview = render(
      <AttackerProfilePreview
        name="Squad"
        profile={{ ...saved, unitBuffs: mergeUnitBuffs(saved.unitBuffs, extra) }}
        savedProfile={saved}
        extraUnitBuffs={extra}
      />
    )
    expect(chipOrigins(preview, `${hitLabel} 2`)).toEqual(['saved'])
    expect(chipOrigins(preview, `${woundLabel} 3`)).toEqual(['added'])
  })

  it.each([
    ['en', 'REROLL SAVE 1'],
    ['zh', '保护重投1'],
  ])('omits the removed save buff from every %s defender editor and summary', (lang, removedLabel) => {
    vi.stubGlobal('localStorage', { getItem: () => lang })
    const legacyTarget = makeTarget({ rerollSaveOnes: true })
    const legacyBuffs = makeTargetUnitBuffs({ rerollSaveOnes: true })
    const html = render(
      <>
        <TargetBuffsEditor profile={legacyTarget} onChange={vi.fn()} />
        <DefenderUnitBuffsPanel value={legacyBuffs} onChange={vi.fn()} />
        <DefenderUnitBuffsPanel value={legacyBuffs} additional onChange={vi.fn()} />
      </>
    )

    expect(html).not.toContain(removedLabel)
    expect(html).not.toContain('comparison-buff--added')
    expect(buildTargetSummary(legacyTarget, { rerollSaveOnes: true }, (key) => key)).toEqual([])
    expect(buildDefenderUnitBuffSummary(legacyBuffs, (key) => key)).toEqual([])
  })

  it.each([
    ['en', 'Add reroll…'],
    ['zh', '添加重投…'],
  ])('starts the %s additional reroll selectors empty without an inheritance option', (lang, placeholder) => {
    vi.stubGlobal('localStorage', { getItem: () => lang })
    const html = render(<UnitBuffsPanel value={makeUnitBuffs()} additional onChange={vi.fn()} />)
    expect(html.split(`>${placeholder}<`)).toHaveLength(3)
    expect(html).not.toContain('unit-buff-select__single-value')
    expect(html).not.toContain('unit-buff-select__clear-indicator')
    expect(html).not.toContain('comparison-buff--saved')
  })

  it('allows editing added rerolls and numeric buffs and highlights them as additions', () => {
    const extra = makeUnitBuffs({
      lethalHits: true,
      sustainedHits: '2',
      critHitEnabled: true,
      critHit: 4,
      hitReroll: 'reroll-fail',
    })
    const html = render(<UnitBuffsPanel value={extra} additional onChange={vi.fn()} />)

    for (const label of ['LETHAL HITS', 'SUSTAINED HITS', 'CRITICAL HIT']) {
      expect(buttonAttributes(html, label)).not.toContain('disabled=""')
      expect(buttonAttributes(html, label)).toContain('aria-pressed="true"')
    }
    expect(inputMarkup(html, 'SUSTAINED HITS value')).not.toContain('disabled=""')
    expect(inputMarkup(html, 'SUSTAINED HITS value')).toContain('value="2"')
    expect(inputMarkup(html, 'CRITICAL HIT value')).toContain('value="4+"')
    expect(inputMarkup(html, 'Hit Reroll')).not.toContain('disabled=""')
    expect(inputMarkup(html, 'Wound Reroll')).not.toContain('disabled=""')
    expect(html).toContain('reroll-cell comparison-buff--added')
    expect(html).toContain('buff-chip active comparison-buff--added')
    expect(html).not.toContain('unit-buff-select__clear-indicator')
  })

  it('allows additional defensive choices without displaying the saved layer as editor state', () => {
    const html = render(
      <DefenderUnitBuffsPanel
        value={makeTargetUnitBuffs({ damageOne: true })}
        additional
        onChange={vi.fn()}
      />
    )

    for (const label of ['HALF DAMAGE', 'DAMAGE −1', 'DAMAGE = 1']) {
      expect(buttonAttributes(html, label)).not.toContain('disabled=""')
    }
    expect(buttonAttributes(html, 'HALF DAMAGE')).toContain('aria-pressed="false"')
    expect(buttonAttributes(html, 'DAMAGE = 1')).toContain('aria-pressed="true"')
    expect(html).toContain('comparison-buff--added')
  })

  it('does not lock buffs in the Simulator or Library editors', () => {
    const attacker = render(
      <UnitBuffsPanel
        value={makeUnitBuffs({ lethalHits: true, sustainedHits: '2' })}
        onChange={vi.fn()}
      />
    )
    const defender = render(
      <DefenderUnitBuffsPanel
        value={makeTargetUnitBuffs({ halfDamage: true })}
        onChange={vi.fn()}
      />
    )
    expect(buttonAttributes(attacker, 'LETHAL HITS')).not.toContain('disabled=""')
    expect(inputMarkup(attacker, 'SUSTAINED HITS value')).not.toContain('disabled=""')
    expect(buttonAttributes(defender, 'HALF DAMAGE')).not.toContain('disabled=""')
    expect(attacker + defender).not.toContain('comparison-buff--saved')
    expect(attacker + defender).not.toContain('comparison-buff--added')
    expect(attacker.match(/>No Reroll</g)).toHaveLength(2)
    expect(attacker).not.toContain('unit-buff-select__clear-indicator')
  })

  it('keeps saved weapon and unit buffs distinct from additions in previews', () => {
    const saved = {
      weapons: [makeWeapon({ lethalHits: true })],
      unitBuffs: makeUnitBuffs({ plusOneDamage: true }),
    }
    const extra = makeUnitBuffs({ plusOneAttack: true, lethalHits: true })
    const profile = { ...saved, unitBuffs: mergeUnitBuffs(saved.unitBuffs, extra) }
    const html = render(
      <AttackerProfilePreview name="Squad" profile={profile} savedProfile={saved} extraUnitBuffs={extra} />
    )

    expect(chipOrigins(html, '+1 D')).toEqual(['saved'])
    expect(chipOrigins(html, '+1 A')).toEqual(['added'])
    expect(chipOrigins(html, 'LETHAL HITS')).toEqual(['added', 'saved'])
  })

  it('colors new defender buffs independently of saved defenses', () => {
    const saved = {
      targets: [makeTarget({ fnp: 5 })],
      defenderUnitBuffs: makeTargetUnitBuffs({ halfDamage: true }),
    }
    const extra = makeTargetUnitBuffs({ benefitOfCover: true })
    const profile = { ...saved, defenderUnitBuffs: mergeTargetUnitBuffs(saved.defenderUnitBuffs, extra) }
    const html = render(
      <DefenderProfilePreview name="Defenders" profile={profile} savedProfile={saved} extraUnitBuffs={extra} />
    )

    expect(chipOrigins(html, 'HALF DAMAGE')).toEqual(['saved'])
    expect(chipOrigins(html, 'FNP 5+')).toEqual(['saved'])
    expect(chipOrigins(html, 'BENEFIT OF COVER')).toEqual(['added'])
  })

  it('shows the original gray reroll and extra yellow override simultaneously without editable saved fields', () => {
    const saved = {
      weapons: [makeWeapon()],
      unitBuffs: makeUnitBuffs({ hitReroll: 'reroll-one' }),
    }
    const extra = makeUnitBuffs({ hitReroll: 'reroll-fail' })
    const html = render(
      <AttackerProfilePreview
        name="Squad"
        savedProfile={saved}
        extraUnitBuffs={extra}
        profile={{ ...saved, unitBuffs: mergeUnitBuffs(saved.unitBuffs, extra) }}
      />
    )

    expect(chipOrigins(html, 'Hit Reroll: 1s')).toEqual(['saved'])
    expect(chipOrigins(html, 'Hit Reroll: Fails')).toEqual(['added'])
    expect(html).not.toMatch(/<(input|select|textarea)\b/)
    expect(html).not.toContain('profile-preview-buff-label')
    expect(html).not.toMatch(/Saved \(locked\)|Added for comparison/)
  })
})

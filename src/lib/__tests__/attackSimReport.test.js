import { describe, expect, it } from 'vitest'
import { buildAttackSimReport, buildMultiUnitAttackSimReport } from '../attackSimReport'

const t = (key, value) => {
  if (key === 'reportIterations') return `${value} iterations`
  if (key === 'attackerUnit') return `Unit ${value}`
  return key
}

const weapon = (overrides = {}) => ({
  name: 'Weapon',
  modelsFiring: 1,
  attacks: '4',
  toHit: 3,
  strength: 4,
  ap: 1,
  damage: '2',
  hitReroll: 'no-reroll',
  hitRerollScope: 'all',
  woundReroll: 'no-reroll',
  woundRerollScope: 'all',
  attackReroll: 'no-reroll',
  attackRerollScope: 'all',
  damageReroll: 'no-reroll',
  damageRerollScope: 'all',
  torrent: false,
  lethalHits: false,
  sustainedHits: 'off',
  devastatingWounds: false,
  blast: false,
  cleaveEnabled: false,
  cleaveValue: 1,
  plusOneHit: false,
  plusOneWound: false,
  ignoresCover: false,
  critHitEnabled: false,
  critHit: 6,
  antiEnabled: false,
  antiValue: 4,
  ...overrides,
})

const target = (overrides = {}) => ({
  name: 'Target',
  models: 5,
  toughness: 4,
  wounds: 2,
  save: 3,
  invulnSave: 0,
  fnp: 0,
  fnpMortal: 0,
  minusOneToHit: false,
  minusOneToWound: false,
  minusOneToWoundIfStronger: false,
  halfDamage: false,
  minusOneDamage: false,
  damageOne: false,
  benefitOfCover: false,
  minusOneAp: false,
  ...overrides,
})

const attackerUnitBuffs = (overrides = {}) => ({
  hitReroll: 'no-reroll',
  woundReroll: 'no-reroll',
  rerollOneFailedHit: false,
  rerollOneFailedWound: false,
  plusOneAttack: false,
  plusOneDamage: false,
  plusOneAp: false,
  plusOneHit: false,
  plusOneWound: false,
  sustainedHits: 'off',
  lethalHits: false,
  devastatingWounds: false,
  ignoresCover: false,
  critHitEnabled: false,
  critHit: 5,
  ...overrides,
})

const defenderUnitBuffs = (overrides = {}) => ({
  minusOneToHit: false,
  minusOneToWound: false,
  minusOneToWoundIfStronger: false,
  benefitOfCover: false,
  minusOneAp: false,
  halfDamage: false,
  minusOneDamage: false,
  damageOne: false,
  ...overrides,
})

const build = ({
  weapons = [weapon()],
  targets = [target()],
  unitBuffs = attackerUnitBuffs(),
  defenderBuffs = defenderUnitBuffs(),
  result = null,
} = {}) =>
  buildAttackSimReport(
    weapons,
    targets,
    unitBuffs,
    defenderBuffs,
    result,
    t
  )

describe('buildMultiUnitAttackSimReport', () => {
  it('groups weapons and buffs by unit, including repeated and unsaved profiles', () => {
    const report = buildMultiUnitAttackSimReport(
      [
        {
          name: 'Squad',
          weapons: [weapon({ name: 'Alpha' })],
          unitBuffs: attackerUnitBuffs({ rerollOneFailedHit: true }),
        },
        {
          name: 'Squad',
          weapons: [weapon({ name: 'Beta' })],
          unitBuffs: attackerUnitBuffs({ rerollOneFailedWound: true }),
        },
        { weapons: [weapon({ name: 'Gamma' })] },
      ],
      [target()],
      defenderUnitBuffs(),
      null,
      t
    )
    const [, first, second, third] = report.split(/### Unit \d[^\n]*\n/)

    expect(report).toContain('### Unit 1 - Squad')
    expect(report).toContain('### Unit 2 - Squad')
    expect(report).toContain('### Unit 3\n')
    expect(first).toContain('- Alpha:')
    expect(first).toContain('#### unitBuffsSection')
    expect(first).toContain('- rerollOneFailedHit')
    expect(first).not.toContain('rerollOneFailedWound')
    expect(second).toContain('- Beta:')
    expect(second).toContain('- rerollOneFailedWound')
    expect(second).not.toContain('rerollOneFailedHit')
    expect(third).toContain('- Gamma:')
    expect(third).not.toContain('unitBuffsSection')
    expect(report.match(/^## reportDefender$/gm)).toHaveLength(1)
  })

  it('reports the shared defender and aggregate results only once', () => {
    const unit = {
      weapons: [weapon()],
      unitBuffs: attackerUnitBuffs(),
    }
    const report = buildMultiUnitAttackSimReport(
      [unit, unit, unit],
      [target()],
      defenderUnitBuffs({ minusOneDamage: true }),
      {
        numSimulations: 1000,
        expectedKills: 3,
        expectedKillsStdDev: 1,
        expectedKillsCILow: 1,
        expectedKillsCIHigh: 5,
        wipeProbability: 25,
        wipeProbabilityStdDev: 1,
        wipeProbabilityCILow: 23,
        wipeProbabilityCIHigh: 27,
        perProfile: [],
      },
      t
    )

    expect(report.match(/^## reportDefender$/gm)).toHaveLength(1)
    expect(report.match(/^## reportResults/gm)).toHaveLength(1)
    expect(report.match(/^- damageMinus1$/gm)).toHaveLength(1)
    expect(report).toContain('- reportExpectedKills: 3.00')
    expect(report).toContain('- reportWipeChance: 25.00%')
  })

  it('retains the existing single-unit report format', () => {
    const weapons = [weapon()]
    const targets = [target()]
    const unitBuffs = attackerUnitBuffs({ rerollOneFailedHit: true })
    const defenderBuffs = defenderUnitBuffs()

    expect(buildMultiUnitAttackSimReport(
      [{ weapons, unitBuffs }], targets, defenderBuffs, null, t
    )).toBe(build({ weapons, targets, unitBuffs, defenderBuffs }))
  })
})

describe('buildAttackSimReport', () => {
  it('includes every configurable weapon ability and reroll', () => {
    const report = build({
      weapons: [
        weapon({ name: 'Torrent', torrent: true }),
        weapon({ name: 'Cleave', cleaveEnabled: true, cleaveValue: 3 }),
        weapon({
          name: 'Buffed',
          lethalHits: true,
          sustainedHits: 'D3',
          devastatingWounds: true,
          blast: true,
          blastValue: 2,
          plusOneHit: true,
          plusOneWound: true,
          ignoresCover: true,
          critHitEnabled: true,
          critHit: 5,
          antiEnabled: true,
          antiValue: 4,
          hitReroll: 'reroll-one',
          hitRerollScope: 'single',
          woundReroll: 'reroll-one-two',
          attackReroll: 'reroll-1-2-3',
          damageReroll: 'reroll-1-2-3',
          damageRerollScope: 'single',
        }),
      ],
    })

    const expected = [
      'torrent',
      'lethalHits',
      'sustainedHits D3',
      'devastatingWounds',
      'blast 2',
      'cleave 3',
      'plusOneHit',
      'plusOneWound',
      'ignoresCover',
      'criticalHit 5+',
      'anti 4+',
      'hitReroll: rerollOnes (rerollScopeSingle)',
      'woundReroll: rerollOnesAndTwos',
      'attackReroll: rerollLow123',
      'damageReroll: rerollLow123 (rerollScopeSingle)',
    ]
    expected.forEach((entry) => expect(report).toContain(entry))
  })

  it.each([
    [undefined, 1],
    [2, 2],
    [5, 5],
    [6, 5],
  ])('reports default and bounded Blast/Cleave X = %s', (value, expected) => {
    const report = build({
      weapons: [
        weapon({ blast: true, blastValue: value }),
        weapon({ cleaveEnabled: true, cleaveValue: value }),
      ],
    })

    expect(report).toContain(`[blast ${expected}]`)
    expect(report).toContain(`[cleave ${expected}]`)
  })

  it('reports only Blast for a conflicting legacy profile', () => {
    const report = build({
      weapons: [weapon({
        blast: true,
        blastValue: 2,
        cleaveEnabled: true,
        cleaveValue: 5,
      })],
    })

    expect(report).toContain('[blast 2]')
    expect(report).not.toContain('cleave')
  })

  it('omits disabled Blast and Cleave even when their values are set', () => {
    const report = build({
      weapons: [weapon({ blastValue: 5, cleaveValue: 5 })],
    })

    expect(report).not.toContain('blast')
    expect(report).not.toContain('cleave')
  })

  it('includes every per-target defensive buff', () => {
    const report = build({
      targets: [
        target({
          fnp: 5,
          fnpMortal: 4,
          minusOneToHit: true,
          minusOneToWound: true,
          minusOneToWoundIfStronger: true,
          halfDamage: true,
          minusOneDamage: true,
          damageOne: true,
          benefitOfCover: true,
          minusOneAp: true,
        }),
      ],
    })

    const expected = [
      'fnp 5+',
      'fnpMortal 4+',
      'minusOneHit',
      'minusOneWound',
      'minusOneWoundST',
      'halfDamage',
      'damageMinus1',
      'damageOne',
      'benefitOfCover',
      'minusOneAp',
    ]
    expected.forEach((entry) => expect(report).toContain(entry))
  })

  it('includes every defender unit buff', () => {
    const report = build({
      defenderBuffs: defenderUnitBuffs({
        minusOneToHit: true,
        minusOneToWound: true,
        minusOneToWoundIfStronger: true,
        benefitOfCover: true,
        minusOneAp: true,
        halfDamage: true,
        minusOneDamage: true,
        damageOne: true,
      }),
    })

    const expected = [
      '- minusOneHit',
      '- minusOneWound',
      '- minusOneWoundST',
      '- benefitOfCover',
      '- minusOneAp',
      '- halfDamage',
      '- damageMinus1',
      '- damageOne',
    ]
    expected.forEach((entry) => expect(report).toContain(entry))
  })

  it('ignores obsolete defensive fields in old profiles', () => {
    expect(build({
      targets: [target({ rerollSaveOnes: true })],
      defenderBuffs: defenderUnitBuffs({ rerollSaveOnes: true }),
    })).toBe(build())
  })

  it('includes every attacker unit buff', () => {
    const report = build({
      unitBuffs: attackerUnitBuffs({
        hitReroll: 'reroll-fail',
        woundReroll: 'reroll-non-critical',
        rerollOneFailedHit: true,
        rerollOneFailedWound: true,
        plusOneAttack: true,
        plusOneDamage: true,
        plusOneAp: true,
        plusOneHit: true,
        plusOneWound: true,
        sustainedHits: '2',
        lethalHits: true,
        devastatingWounds: true,
        ignoresCover: true,
        critHitEnabled: true,
        critHit: 5,
      }),
    })

    const expected = [
      '- rerollOneFailedHit',
      '- rerollOneFailedWound',
      '- hitReroll: rerollFails',
      '- woundReroll: rerollNonCritical',
      '- plusOneAttack',
      '- plusOneDamage',
      '- plusOneAp',
      '- plusOneHit',
      '- plusOneWound',
      '- sustainedHits 2',
      '- lethalHits',
      '- devastatingWounds',
      '- ignoresCover',
      '- criticalHit 5+',
    ]
    expected.forEach((entry) => expect(report).toContain(entry))
  })

  it.each(['rerollOneFailedHit', 'rerollOneFailedWound'])(
    'reports a standalone %s only in the unit-buff section',
    (flag) => {
      const report = build({ unitBuffs: attackerUnitBuffs({ [flag]: true }) })
      const [profiles, buffs] = report.split('### unitBuffsSection')

      expect(profiles).not.toContain(flag)
      expect(buffs).toContain(`- ${flag}`)
    }
  )
})

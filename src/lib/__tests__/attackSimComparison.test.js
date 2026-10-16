import { afterEach, describe, expect, it, vi } from 'vitest'
import { compareAttackerProfiles } from '../attackSimComparison'
import { mergeUnitBuffs } from '../dice'

const attacker = (strength) => ({
  weapons: [
    {
      name: `Weapon ${strength}`,
      modelsFiring: 1,
      attacks: '2',
      strength,
      toHit: 3,
      ap: 1,
      damage: '1',
    },
  ],
  unitBuffs: null,
})

const defender = {
  targets: [
    {
      name: 'Target',
      models: 5,
      toughness: 4,
      wounds: 2,
      save: 3,
      invulnSave: 0,
      fnp: 0,
      fnpMortal: 0,
    },
  ],
  defenderUnitBuffs: null,
}

describe('compareAttackerProfiles', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each([
    {
      stage: 'hit',
      flag: 'rerollOneFailedHit',
      policy: 'hitReroll',
      overrides: { toHit: 4, critHitEnabled: true, critHit: 4, lethalHits: true },
    },
    {
      stage: 'wound',
      flag: 'rerollOneFailedWound',
      policy: 'woundReroll',
      overrides: { torrent: true },
    },
  ])('passes independent shared $stage rerolls to every comparison variant', ({ flag, policy, overrides }) => {
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('Unexpected extra dice roll')
    })
    for (const face of [1, 2, 2, 6, 1, 2, 2, 6, 1, 2, 2]) {
      random.mockReturnValueOnce((face - 0.5) / 6)
    }
    const profile = {
      weapons: [
        { ...attacker(4).weapons[0], attacks: '1', ...overrides },
        { ...attacker(4).weapons[0], attacks: '1', ...overrides },
      ],
      unitBuffs: { [flag]: true, [policy]: 'reroll-one' },
    }
    const snapshot = structuredClone(profile)
    const results = compareAttackerProfiles(
      [
        { name: 'Enabled A', profile },
        { name: 'Enabled B', profile },
        {
          name: 'Disabled',
          profile: { ...profile, unitBuffs: { ...profile.unitBuffs, [flag]: false } },
        },
      ],
      { ...defender, targets: [{ ...defender.targets[0], wounds: 1, save: 6 }] },
      1
    )

    expect(results.map(({ result }) => result.expectedDamage)).toEqual([1, 1, 0])
    expect(random).toHaveBeenCalledTimes(11)
    expect(profile).toEqual(snapshot)
  })

  it('compares between two and four saved attacker Profiles', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    const results = compareAttackerProfiles(
      [
        { name: 'Attacker A', profile: attacker(4) },
        { name: 'Attacker B', profile: attacker(8) },
      ],
      defender,
      25
    )

    expect(results.map((entry) => entry.name)).toEqual([
      'Attacker A',
      'Attacker B',
    ])
    expect(results).toHaveLength(2)
    for (const entry of results) {
      expect(entry.result.numSimulations).toBe(25)
      expect(entry.result.expectedKills).toBeTypeOf('number')
      expect(entry.result.wipeProbability).toBeTypeOf('number')
    }
  })

  it('rejects an invalid attacker count or missing defender', () => {
    expect(() =>
      compareAttackerProfiles(
        [{ name: 'Only one', profile: attacker(4) }],
        defender,
        10
      )
    ).toThrow('between 2 and 4')

    expect(() =>
      compareAttackerProfiles(
        [
          { name: 'A', profile: attacker(4) },
          { name: 'B', profile: attacker(5) },
        ],
        null,
        10
      )
    ).toThrow('defender Profile')
  })

  it('compares repeated attackers with independent unit buffs without modifying saved Profiles', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const savedAttacker = attacker(4)
    const savedDefender = {
      ...defender,
      targets: [{ ...defender.targets[0], save: 6 }],
    }
    const originalAttacker = structuredClone(savedAttacker)
    const originalDefender = structuredClone(savedDefender)

    const results = compareAttackerProfiles(
      [
        { name: 'Same Profile', profile: savedAttacker },
        {
          name: 'Same Profile',
          profile: { ...savedAttacker, unitBuffs: { plusOneDamage: true } },
        },
      ],
      savedDefender,
      25
    )

    expect(results.map(({ name }) => name)).toEqual(['Same Profile', 'Same Profile'])
    expect(results.map(({ result }) => result.expectedKills)).toEqual([1, 2])
    expect(results.map(({ result }) => result.expectedDamage)).toEqual([2, 4])
    expect(savedAttacker).toEqual(originalAttacker)
    expect(savedDefender).toEqual(originalDefender)
  })

  it('applies temporary defender unit buffs to every attacker', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const profile = attacker(4)
    const savedDefender = {
      ...defender,
      targets: [{ ...defender.targets[0], save: 6 }],
    }
    const originalDefender = structuredClone(savedDefender)
    const attackers = [
      { name: 'Same Profile', profile },
      {
        name: 'Same Profile',
        profile: { ...profile, unitBuffs: { plusOneDamage: true } },
      },
    ]
    const results = compareAttackerProfiles(
      attackers,
      { ...savedDefender, defenderUnitBuffs: { halfDamage: true } },
      25
    )

    expect(results.map(({ result }) => result.expectedKills)).toEqual([1, 1])
    expect(savedDefender).toEqual(originalDefender)
  })

  it('keeps saved bonuses in simulation while applying only the extra layer', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const saved = { ...attacker(4), unitBuffs: { plusOneDamage: true } }
    const results = compareAttackerProfiles(
      [
        {
          name: 'Same Profile',
          profile: {
            ...saved,
            unitBuffs: mergeUnitBuffs(saved.unitBuffs, { plusOneDamage: false }),
          },
        },
        {
          name: 'Same Profile',
          profile: {
            ...saved,
            unitBuffs: mergeUnitBuffs(saved.unitBuffs, {
              plusOneDamage: false,
              plusOneAttack: true,
            }),
          },
        },
      ],
      { ...defender, targets: [{ ...defender.targets[0], save: 6 }] },
      25
    )
    expect(results.map(({ result }) => result.expectedKills)).toEqual([2, 3])
    expect(saved.unitBuffs).toEqual({ plusOneDamage: true })
  })

  it('does not reduce simulated output when a weaker reroll is added or cleared', () => {
    const random = vi.spyOn(Math, 'random')
    const saved = {
      ...attacker(4),
      unitBuffs: { hitReroll: 'reroll-fail', woundReroll: 'reroll-fail' },
    }
    const run = (extra) => {
      let seed = 12345
      random.mockImplementation(() => {
        seed = (1664525 * seed + 1013904223) >>> 0
        return seed / 4294967296
      })
      const profile = { ...saved, unitBuffs: mergeUnitBuffs(saved.unitBuffs, extra) }
      return compareAttackerProfiles(
        [{ name: 'A', profile }, { name: 'B', profile }],
        defender,
        100
      )
    }

    const baseline = run(null)
    expect(run({ hitReroll: 'reroll-one', woundReroll: 'reroll-one-two' })).toEqual(baseline)
    expect(run({ hitReroll: 'no-reroll', woundReroll: 'no-reroll' })).toEqual(baseline)
    expect(saved.unitBuffs).toEqual({ hitReroll: 'reroll-fail', woundReroll: 'reroll-fail' })
  })
})

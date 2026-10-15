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
})

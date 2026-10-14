import { afterEach, describe, expect, it, vi } from 'vitest'
import { compareAttackerProfiles } from '../attackSimComparison'

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
})

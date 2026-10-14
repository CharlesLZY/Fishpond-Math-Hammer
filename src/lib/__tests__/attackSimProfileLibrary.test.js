import { describe, expect, it } from 'vitest'
import {
  ATTACKER_PROFILE_LIBRARY_KIND,
  DEFENDER_PROFILE_LIBRARY_KIND,
  buildAttackerProfileLibraryExport,
  buildDefenderProfileLibraryExport,
  parseAttackerProfileLibrary,
  parseDefenderProfileLibrary,
} from '../attackSimProfileLibrary'

const weapon = {
  id: 10,
  name: 'Bolter',
  modelsFiring: 1,
  attacks: '2',
  strength: 4,
  toHit: 3,
  ap: 1,
  damage: '1',
}

const target = {
  id: 20,
  name: 'Marine',
  models: 5,
  toughness: 4,
  wounds: 2,
  save: 3,
  invulnSave: 0,
  fnp: 0,
  fnpMortal: 0,
}

const weaponWithoutId = { ...weapon }
delete weaponWithoutId.id
const targetWithoutId = { ...target }
delete targetWithoutId.id

describe('Attack Simulator profile-library transfer', () => {
  it('builds and parses an attacker profile library', () => {
    const payload = buildAttackerProfileLibraryExport({
      Infantry: {
        weapons: [weapon],
        unitBuffs: { plusOneHit: true },
      },
    })

    expect(payload.kind).toBe(ATTACKER_PROFILE_LIBRARY_KIND)
    expect(parseAttackerProfileLibrary(payload)).toEqual({
      Infantry: {
        weapons: [weaponWithoutId],
        unitBuffs: { plusOneHit: true },
      },
    })
    expect(parseAttackerProfileLibrary(payload).Infantry.weapons[0]).not.toHaveProperty('id')
  })

  it('builds and parses a defender profile library', () => {
    const payload = buildDefenderProfileLibraryExport({
      Marines: {
        targets: [target],
        defenderUnitBuffs: { benefitOfCover: true },
      },
    })

    expect(payload.kind).toBe(DEFENDER_PROFILE_LIBRARY_KIND)
    expect(parseDefenderProfileLibrary(payload).Marines).toEqual({
      targets: [targetWithoutId],
      defenderUnitBuffs: { benefitOfCover: true },
    })
    expect(parseDefenderProfileLibrary(payload).Marines.targets[0]).not.toHaveProperty('id')
  })

  it('rejects a file for the other side', () => {
    const payload = buildDefenderProfileLibraryExport({
      Marines: { targets: [target], defenderUnitBuffs: null },
    })

    expect(() => parseAttackerProfileLibrary(payload)).toThrow(
      'wrong profile library type'
    )
  })

  it('rejects invalid nested profiles before they reach storage', () => {
    const payload = buildAttackerProfileLibraryExport({
      Broken: {
        weapons: [{ ...weapon, attacks: 'not dice' }],
        unitBuffs: null,
      },
    })

    expect(() => parseAttackerProfileLibrary(payload)).toThrow(
      'profiles["Broken"].weapons[0]: invalid attacks'
    )
  })
})

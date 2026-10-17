import { describe, expect, it } from 'vitest'
import {
  ATTACKER_PROFILE_LIBRARY_KIND,
  DEFENDER_PROFILE_LIBRARY_KIND,
  buildAttackerProfileLibraryExport,
  buildDefenderProfileLibraryExport,
  parseAttackerProfileLibrary,
  parseDefenderProfileLibrary,
} from '../attackSimProfileLibrary'
import { hydrateAttackerProfile, makeWeapon, serializeAttackerProfile } from '../attackSimProfiles'

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
  it('defaults Blast and Cleave X to 1 for new and legacy weapon profiles', () => {
    expect(makeWeapon()).toMatchObject({ blastValue: 1, cleaveValue: 1 })
    const legacy = Object.freeze({ ...weapon, blast: true })
    const hydrated = hydrateAttackerProfile({ weapons: [legacy] })

    expect(hydrated.weapons[0]).toMatchObject({
      blast: true,
      blastValue: 1,
      cleaveEnabled: false,
      cleaveValue: 1,
    })
    expect(legacy).not.toHaveProperty('blastValue')
    expect(legacy).not.toHaveProperty('cleaveValue')
  })

  it('resets the cancelled Cleave value when normalizing conflicting legacy buffs', () => {
    const legacy = Object.freeze({
      ...weapon,
      blast: true,
      blastValue: 2,
      cleaveEnabled: true,
      cleaveValue: 5,
    })
    const serialized = serializeAttackerProfile(hydrateAttackerProfile({ weapons: [legacy] }))

    expect(serialized.weapons[0]).toMatchObject({
      blast: true,
      blastValue: 2,
      cleaveEnabled: false,
      cleaveValue: 1,
    })
    expect(legacy.cleaveEnabled).toBe(true)
    expect(legacy.cleaveValue).toBe(5)
  })

  it('resets inactive numeric values when loading older profiles', () => {
    const legacy = Object.freeze({
      ...weapon,
      blast: false,
      blastValue: 4,
      cleaveEnabled: false,
      cleaveValue: 5,
    })
    const serialized = serializeAttackerProfile(hydrateAttackerProfile({ weapons: [legacy] }))

    expect(serialized.weapons[0]).toMatchObject({
      blast: false,
      blastValue: 1,
      cleaveEnabled: false,
      cleaveValue: 1,
    })
    expect(legacy.blastValue).toBe(4)
    expect(legacy.cleaveValue).toBe(5)
  })

  it.each([
    [0, 1],
    [1, 1],
    [2, 2],
    [5, 5],
    [6, 5],
  ])('round-trips bounded Blast/Cleave X = %i as %i', (value, expected) => {
    const withValues = { ...weapon, blastValue: value, cleaveValue: value }
    const library = parseAttackerProfileLibrary(buildAttackerProfileLibraryExport({
      Squad: {
        weapons: [
          { ...withValues, blast: true },
          { ...withValues, cleaveEnabled: true },
        ],
        unitBuffs: null,
      },
    }))
    const serialized = serializeAttackerProfile(hydrateAttackerProfile(library.Squad))
    const imported = parseAttackerProfileLibrary(buildAttackerProfileLibraryExport({
      Squad: serialized,
    }))

    expect(imported.Squad.weapons[0]).toMatchObject({
      blast: true,
      blastValue: expected,
      cleaveEnabled: false,
      cleaveValue: 1,
    })
    expect(imported.Squad.weapons[1]).toMatchObject({
      blast: false,
      blastValue: 1,
      cleaveEnabled: true,
      cleaveValue: expected,
    })
    imported.Squad.weapons.forEach((entry) => expect(entry).not.toHaveProperty('id'))
  })

  it('round-trips shared rerolls as unit buffs rather than weapon-profile abilities', () => {
    const unitBuffs = Object.freeze({
      hitReroll: 'reroll-one',
      woundReroll: 'reroll-one',
      rerollOneFailedHit: true,
      rerollOneFailedWound: true,
    })
    const library = parseAttackerProfileLibrary(buildAttackerProfileLibraryExport({
      Squad: { weapons: [weapon], unitBuffs },
    }))
    const hydrated = hydrateAttackerProfile(library.Squad)
    const serialized = serializeAttackerProfile(hydrated)

    expect(hydrated.unitBuffs).toMatchObject(unitBuffs)
    expect(serialized.unitBuffs).toMatchObject(unitBuffs)
    expect(serialized.weapons[0]).not.toHaveProperty('rerollOneFailedHit')
    expect(serialized.weapons[0]).not.toHaveProperty('rerollOneFailedWound')
    expect(hydrateAttackerProfile({ weapons: [weapon] }).unitBuffs).toMatchObject({
      rerollOneFailedHit: false,
      rerollOneFailedWound: false,
    })
  })

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

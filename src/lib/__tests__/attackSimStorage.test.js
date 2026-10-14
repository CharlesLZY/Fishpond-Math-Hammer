import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  listSavedTargetSets,
  listSavedWeaponSets,
  loadNamedTargetSet,
  loadNamedWeaponSet,
  mergeSavedTargetSetLibrary,
  mergeSavedWeaponSetLibrary,
  renameNamedTargetSet,
  renameNamedWeaponSet,
  saveNamedTargetSet,
  saveNamedWeaponSet,
} from '../attackSimStorage'

const weaponPayload = (strength) => ({
  weapons: [{ name: `Weapon ${strength}`, strength }],
  unitBuffs: null,
})

const targetPayload = (toughness) => ({
  targets: [{ name: `Target ${toughness}`, toughness }],
  defenderUnitBuffs: null,
})

const sides = [
  {
    name: 'attacker',
    save: saveNamedWeaponSet,
    list: listSavedWeaponSets,
    load: loadNamedWeaponSet,
    merge: mergeSavedWeaponSetLibrary,
    rename: renameNamedWeaponSet,
    payload: weaponPayload,
    importedValue: (profile) => profile.weapons[0].strength,
  },
  {
    name: 'defender',
    save: saveNamedTargetSet,
    list: listSavedTargetSets,
    load: loadNamedTargetSet,
    merge: mergeSavedTargetSetLibrary,
    rename: renameNamedTargetSet,
    payload: targetPayload,
    importedValue: (profile) => profile.targets[0].toughness,
  },
]

describe.each(sides)('$name Profile library imports', (side) => {
  let values

  beforeEach(() => {
    values = new Map()
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
        removeItem: (key) => values.delete(key),
      },
    })
  })

  afterEach(() => {
    delete globalThis.localStorage
  })

  it('adds one imported Profile without deleting ten existing Profiles', () => {
    for (let index = 1; index <= 10; index += 1) {
      expect(side.save(`Profile ${index}`, side.payload(index))).toBe(true)
    }

    expect(side.merge({ Imported: side.payload(11) })).toBe(true)

    expect(side.list()).toHaveLength(11)
    expect(side.load('Profile 1')).toEqual(side.payload(1))
    expect(side.load('Profile 10')).toEqual(side.payload(10))
    expect(side.load('Imported')).toEqual(side.payload(11))
  })

  it('overwrites only the imported same-name Profile', () => {
    for (let index = 1; index <= 10; index += 1) {
      side.save(`Profile ${index}`, side.payload(index))
    }

    expect(side.merge({ 'Profile 5': side.payload(50) })).toBe(true)

    expect(side.list()).toHaveLength(10)
    expect(side.importedValue(side.load('Profile 5'))).toBe(50)
    expect(side.load('Profile 4')).toEqual(side.payload(4))
    expect(side.load('Profile 6')).toEqual(side.payload(6))
  })

  it('renames one Profile without changing the rest of the library', () => {
    side.save('Original', side.payload(4))
    side.save('Unchanged', side.payload(5))

    expect(side.rename('Original', 'Renamed')).toBe(true)

    expect(side.list()).toEqual(['Renamed', 'Unchanged'])
    expect(side.load('Original')).toBeNull()
    expect(side.load('Renamed')).toEqual(side.payload(4))
    expect(side.load('Unchanged')).toEqual(side.payload(5))
  })
})

import {
  makeTargetUnitBuffs,
  makeUnitBuffs,
  normalizeAttackBonusValue,
  normalizeWeaponProfileRerolls,
} from './dice'

let nextId = 0

export const createProfileId = () => ++nextId

export const makeWeapon = (overrides = {}) => ({
  id: createProfileId(),
  name: '',
  modelsFiring: 1,
  attacks: '4',
  strength: 4,
  toHit: 3,
  ap: 1,
  damage: '1',
  hitReroll: 'no-reroll',
  hitRerollScope: 'all',
  woundReroll: 'no-reroll',
  woundRerollScope: 'all',
  attackReroll: 'no-reroll',
  attackRerollScope: 'all',
  damageReroll: 'no-reroll',
  damageRerollScope: 'all',
  critHitEnabled: false,
  critHit: 5,
  critWound: 6,
  torrent: false,
  lethalHits: false,
  sustainedHits: 'off',
  devastatingWounds: false,
  plusOneWound: false,
  blast: false,
  plusOneHit: false,
  ignoresCover: false,
  antiEnabled: false,
  antiValue: 4,
  ...overrides,
  cleaveEnabled: !!overrides.cleaveEnabled && !overrides.blast,
  blastValue: overrides.blast ? normalizeAttackBonusValue(overrides.blastValue) : 1,
  cleaveValue: overrides.cleaveEnabled && !overrides.blast
    ? normalizeAttackBonusValue(overrides.cleaveValue)
    : 1,
})

export const makeTarget = (overrides = {}) => ({
  id: createProfileId(),
  name: '',
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

export const omitProfileId = (entry = {}) => {
  const next = { ...entry }
  delete next.id
  return next
}

export const hydrateWeapon = (entry = {}) =>
  normalizeWeaponProfileRerolls(makeWeapon(omitProfileId(entry)))

export const hydrateTarget = (entry = {}) =>
  makeTarget(omitProfileId(entry))

export const hydrateAttackerProfile = (profile) => ({
  weapons:
    Array.isArray(profile?.weapons) && profile.weapons.length > 0
      ? profile.weapons.map(hydrateWeapon)
      : [makeWeapon({ name: 'Weapon 1' })],
  unitBuffs: makeUnitBuffs(profile?.unitBuffs || {}),
})

export const hydrateDefenderProfile = (profile) => ({
  targets:
    Array.isArray(profile?.targets) && profile.targets.length > 0
      ? profile.targets.map(hydrateTarget)
      : [makeTarget({ name: 'Profile 1' })],
  defenderUnitBuffs: makeTargetUnitBuffs(profile?.defenderUnitBuffs || {}),
})

export const createDefaultAttackerProfile = () =>
  hydrateAttackerProfile(null)

export const createDefaultDefenderProfile = () =>
  hydrateDefenderProfile(null)

export const serializeAttackerProfile = ({ weapons, unitBuffs }) => ({
  weapons: weapons.map(omitProfileId),
  unitBuffs: makeUnitBuffs(unitBuffs || {}),
})

export const serializeDefenderProfile = ({ targets, defenderUnitBuffs }) => ({
  targets: targets.map(omitProfileId),
  defenderUnitBuffs,
})

export const moveProfileItem = (items, from, to) => {
  if (to < 0 || to >= items.length) return items
  const next = items.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export const nextProfileName = (items, prefix) => {
  const used = new Set(items.map((item) => item.name))
  for (let index = 1; index <= items.length + 1; index += 1) {
    const candidate = `${prefix} ${index}`
    if (!used.has(candidate)) return candidate
  }
  return `${prefix} ${items.length + 1}`
}

export const duplicateProfileItem = (item) => ({
  ...item,
  id: createProfileId(),
  name: item.name ? `${item.name} (copy)` : '',
})

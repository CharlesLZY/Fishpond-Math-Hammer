import { isValidDiceExpression } from './dice'

export const PROFILE_LIBRARY_SCHEMA_VERSION = 1
export const ATTACKER_PROFILE_LIBRARY_KIND =
  'fishpond.attack-simulator.attacker-profile-library'
export const DEFENDER_PROFILE_LIBRARY_KIND =
  'fishpond.attack-simulator.defender-profile-library'

const isRecord = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const stripId = (entry = {}) => {
  const next = { ...entry }
  delete next.id
  return next
}

const isPosInt = (value) => Number.isInteger(value) && value > 0
const isNonNegInt = (value) => Number.isInteger(value) && value >= 0
const isThreshold = (value) =>
  Number.isInteger(value) && value >= 2 && value <= 6

export const validateWeaponShape = (weapon) => {
  if (!isRecord(weapon)) return 'not an object'
  if (!isValidDiceExpression(weapon.attacks))
    return `invalid attacks ${JSON.stringify(weapon.attacks)}`
  if (!isValidDiceExpression(weapon.damage))
    return `invalid damage ${JSON.stringify(weapon.damage)}`
  if (!isPosInt(weapon.strength)) return `invalid strength ${weapon.strength}`
  if (!isThreshold(weapon.toHit)) return `invalid toHit ${weapon.toHit}`
  if (!isNonNegInt(weapon.ap)) return `invalid ap ${weapon.ap}`
  if (weapon.modelsFiring != null && !isPosInt(weapon.modelsFiring))
    return `invalid modelsFiring ${weapon.modelsFiring}`
  return null
}

export const validateTargetShape = (target) => {
  if (!isRecord(target)) return 'not an object'
  if (!isPosInt(target.models)) return `invalid models ${target.models}`
  if (!isPosInt(target.toughness)) return `invalid toughness ${target.toughness}`
  if (!isPosInt(target.wounds)) return `invalid wounds ${target.wounds}`
  if (!isThreshold(target.save)) return `invalid save ${target.save}`
  if (
    target.invulnSave != null &&
    target.invulnSave !== 0 &&
    !isThreshold(target.invulnSave)
  )
    return `invalid invulnSave ${target.invulnSave}`
  if (target.fnp != null && target.fnp !== 0 && !isThreshold(target.fnp))
    return `invalid fnp ${target.fnp}`
  if (
    target.fnpMortal != null &&
    target.fnpMortal !== 0 &&
    !isThreshold(target.fnpMortal)
  )
    return `invalid fnpMortal ${target.fnpMortal}`
  return null
}

const buildProfileLibraryExport = (kind, profiles) => {
  if (!isRecord(profiles)) throw new Error('"profiles" must be an object')
  return {
    schemaVersion: PROFILE_LIBRARY_SCHEMA_VERSION,
    kind,
    exportedAt: new Date().toISOString(),
    profiles,
  }
}

export const buildAttackerProfileLibraryExport = (profiles) =>
  buildProfileLibraryExport(ATTACKER_PROFILE_LIBRARY_KIND, profiles)

export const buildDefenderProfileLibraryExport = (profiles) =>
  buildProfileLibraryExport(DEFENDER_PROFILE_LIBRARY_KIND, profiles)

const normalizeOptionalRecord = (value, path) => {
  if (value == null) return null
  if (!isRecord(value)) throw new Error(`${path} must be an object or null`)
  return { ...value }
}

const parseProfileLibrary = (data, expectedKind, normalizeProfile) => {
  if (!isRecord(data)) throw new Error('top-level value is not an object')
  if (data.schemaVersion !== PROFILE_LIBRARY_SCHEMA_VERSION) {
    throw new Error(
      `unsupported schema version ${JSON.stringify(data.schemaVersion)}`
    )
  }
  if (data.kind !== expectedKind) {
    throw new Error(
      `wrong profile library type ${JSON.stringify(data.kind)}`
    )
  }
  if (!isRecord(data.profiles))
    throw new Error('"profiles" must be an object')

  const entries = Object.entries(data.profiles)
  if (entries.length === 0)
    throw new Error('"profiles" must contain at least one saved profile')

  return Object.fromEntries(
    entries.map(([name, profile]) => {
      if (!name || name !== name.trim())
        throw new Error('profile names must be non-empty and trimmed')
      return [name, normalizeProfile(profile, `profiles[${JSON.stringify(name)}]`)]
    })
  )
}

const normalizeAttackerProfile = (profile, path) => {
  if (!isRecord(profile)) throw new Error(`${path} must be an object`)
  if (!Array.isArray(profile.weapons) || profile.weapons.length === 0)
    throw new Error(`${path}.weapons must be a non-empty array`)
  profile.weapons.forEach((weapon, index) => {
    const error = validateWeaponShape(weapon)
    if (error) throw new Error(`${path}.weapons[${index}]: ${error}`)
  })
  return {
    weapons: profile.weapons.map(stripId),
    unitBuffs: normalizeOptionalRecord(profile.unitBuffs, `${path}.unitBuffs`),
  }
}

const normalizeDefenderProfile = (profile, path) => {
  if (!isRecord(profile)) throw new Error(`${path} must be an object`)
  if (!Array.isArray(profile.targets) || profile.targets.length === 0)
    throw new Error(`${path}.targets must be a non-empty array`)
  profile.targets.forEach((target, index) => {
    const error = validateTargetShape(target)
    if (error) throw new Error(`${path}.targets[${index}]: ${error}`)
  })
  return {
    targets: profile.targets.map(stripId),
    defenderUnitBuffs: normalizeOptionalRecord(
      profile.defenderUnitBuffs,
      `${path}.defenderUnitBuffs`
    ),
  }
}

export const parseAttackerProfileLibrary = (data) =>
  parseProfileLibrary(
    data,
    ATTACKER_PROFILE_LIBRARY_KIND,
    normalizeAttackerProfile
  )

export const parseDefenderProfileLibrary = (data) =>
  parseProfileLibrary(
    data,
    DEFENDER_PROFILE_LIBRARY_KIND,
    normalizeDefenderProfile
  )

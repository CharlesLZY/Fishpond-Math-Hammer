import {
  mergeTargetWithUnit,
  simulateAttack,
} from './dice'
import {
  hydrateAttackerProfile,
  hydrateDefenderProfile,
} from './attackSimProfiles'

export function compareAttackerProfiles(
  attackers,
  defenderProfile,
  iterations
) {
  if (!Array.isArray(attackers) || attackers.length < 2 || attackers.length > 4) {
    throw new Error('Choose between 2 and 4 attacker Profiles.')
  }
  if (!defenderProfile) throw new Error('Choose a defender Profile.')

  const defender = hydrateDefenderProfile(defenderProfile)
  const effectiveTargets = defender.targets.map((target) =>
    mergeTargetWithUnit(target, defender.defenderUnitBuffs)
  )

  return attackers.map(({ name, profile }) => {
    if (!profile) throw new Error(`Could not load attacker Profile "${name}".`)
    const attacker = hydrateAttackerProfile(profile)
    return {
      name,
      result: simulateAttack(attacker.weapons, effectiveTargets, iterations, attacker.unitBuffs),
    }
  })
}

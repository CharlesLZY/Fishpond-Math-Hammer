import { REROLL_VALUES } from './constants'

export const normalizeFailedRerollCount = (
  value,
  legacyEnabled = false,
  label = 'Failed dice reroll count'
) => {
  const count = value ?? (legacyEnabled ? 1 : 0)
  if (!Number.isInteger(count) || count < 0 || count > 3) {
    throw new Error(`${label} must be an integer between 0 and 3.`)
  }
  return count
}

export const evaluateD6 = (natural, threshold, criticalThreshold = 6) => {
  if (natural === 1) return { success: false, isCrit: false }
  const isCrit = natural >= criticalThreshold
  return { success: isCrit || natural === 6 || natural >= threshold, isCrit }
}

export const shouldRerollD6 = (natural, mode, success, isCrit) => {
  if (mode === REROLL_VALUES.REROLL_ONE) return natural === 1
  if (mode === REROLL_VALUES.REROLL_ONE_TWO) return natural <= 2 && !isCrit
  if (mode === REROLL_VALUES.REROLL_FAIL) return !success
  if (mode === REROLL_VALUES.REROLL_NON_CRITICAL) return !isCrit
  return false
}

export const getD6RollOutcomes = (
  threshold,
  mode,
  criticalThreshold = 6,
  failedRerollAvailable = false
) => {
  const outcomes = new Map()
  const add = (natural, usedFailedReroll, probability) => {
    const result = evaluateD6(natural, threshold, criticalThreshold)
    const key = Number(usedFailedReroll) * 3 + (result.isCrit ? 2 : Number(result.success))
    if (!outcomes.has(key)) outcomes.set(key, { ...result, usedFailedReroll, probability: 0 })
    outcomes.get(key).probability += probability
  }

  for (let natural = 1; natural <= 6; natural++) {
    const { success, isCrit } = evaluateD6(natural, threshold, criticalThreshold)
    const policyReroll = shouldRerollD6(natural, mode, success, isCrit)
    const usedFailedReroll = !policyReroll && !success && failedRerollAvailable
    if (policyReroll || usedFailedReroll) {
      for (let replacement = 1; replacement <= 6; replacement++) {
        add(replacement, usedFailedReroll, 1 / 36)
      }
    } else {
      add(natural, false, 1 / 6)
    }
  }

  return [...outcomes.values()]
}

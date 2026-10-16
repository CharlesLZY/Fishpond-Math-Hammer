import { REROLL_VALUES } from './constants'

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
  singleAvailable = false
) => {
  const outcomes = new Map()
  const add = (natural, usedSingle, probability) => {
    const result = evaluateD6(natural, threshold, criticalThreshold)
    const key = Number(usedSingle) * 3 + (result.isCrit ? 2 : Number(result.success))
    if (!outcomes.has(key)) outcomes.set(key, { ...result, usedSingle, probability: 0 })
    outcomes.get(key).probability += probability
  }

  for (let natural = 1; natural <= 6; natural++) {
    const { success, isCrit } = evaluateD6(natural, threshold, criticalThreshold)
    const policyReroll = shouldRerollD6(natural, mode, success, isCrit)
    const usedSingle = !policyReroll && !success && singleAvailable
    if (policyReroll || usedSingle) {
      for (let replacement = 1; replacement <= 6; replacement++) {
        add(replacement, usedSingle, 1 / 36)
      }
    } else {
      add(natural, false, 1 / 6)
    }
  }

  return [...outcomes.values()]
}

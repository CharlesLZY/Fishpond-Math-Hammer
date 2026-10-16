import { buildDistribution } from './binomial'
import { REROLL_VALUES, Z_95 } from './constants'
import { getD6RollOutcomes } from './d6Rerolls'

const REWARDS = ['hits', 'crits', 'devastating']
const REROLL_MODES = new Set(Object.values(REROLL_VALUES))

const makeMoments = (probability = 0) => ({
  probability,
  first: { hits: 0, crits: 0, devastating: 0 },
  second: { hits: 0, crits: 0, devastating: 0 },
})

const thresholdValue = (value, label) => {
  const threshold = Number(value)
  if (!Number.isInteger(threshold) || threshold < 2 || threshold > 6) {
    throw new Error(`${label} must be an integer between 2 and 6.`)
  }
  return threshold
}

const sustainedOutcomes = (value) => {
  if (value === 'off') return [{ hits: 0, probability: 1 }]
  if (value === 'D3' || value === 'D6') {
    const sides = value === 'D3' ? 3 : 6
    return Array.from({ length: sides }, (_, index) => ({
      hits: index + 1,
      probability: 1 / sides,
    }))
  }
  const hits = Number(value)
  if (!Number.isInteger(hits) || hits < 1 || hits > 9) {
    throw new Error('Sustained Hits must be off, 1-9, D3 or D6.')
  }
  return [{ hits, probability: 1 }]
}

const buildWoundPools = (maxRolls, rollOutcomes) =>
  [0, 1].map((initialRemaining) => {
    const pools = [[{
      remaining: initialRemaining,
      wounds: 0,
      probability: 1,
      criticalFirst: 0,
      criticalSecond: 0,
    }]]
    for (let count = 1; count <= maxRolls; count++) {
      const next = new Map()
      for (const previous of pools[count - 1]) {
        for (const roll of rollOutcomes[previous.remaining]) {
          const remaining = previous.remaining && !roll.usedSingle ? 1 : 0
          const wounds = previous.wounds + Number(roll.success)
          const key = `${remaining}:${wounds}`
          if (!next.has(key)) {
            next.set(key, { remaining, wounds, probability: 0, criticalFirst: 0, criticalSecond: 0 })
          }
          const entry = next.get(key)
          const critical = Number(roll.isCrit)
          entry.probability += previous.probability * roll.probability
          entry.criticalFirst +=
            (previous.criticalFirst + previous.probability * critical) * roll.probability
          entry.criticalSecond += (
            previous.criticalSecond +
            2 * previous.criticalFirst * critical +
            previous.probability * critical
          ) * roll.probability
        }
      }
      pools.push([...next.values()])
    }
    return pools
  })

const buildAttackTransitions = (hitOutcomes, extras, woundPools, lethalHits, devastatingWounds) =>
  Array.from({ length: 4 }, (_, state) => {
    const transitions = new Map()
    for (const hit of hitOutcomes[Number(!!(state & 2))]) {
      const remainingHit = (state & 2) && !hit.usedSingle ? 2 : 0
      for (const extra of hit.isCrit ? extras : [{ hits: 0, probability: 1 }]) {
        const hits = hit.success ? 1 + extra.hits : 0
        const lethal = Number(hit.isCrit && lethalHits)
        const weight = hit.probability * extra.probability
        for (const wound of woundPools[state & 1][hits - lethal]) {
          const nextState = remainingHit + wound.remaining
          const wounds = lethal + wound.wounds
          const key = `${nextState}:${wounds}`
          if (!transitions.has(key)) {
            transitions.set(key, { state: nextState, wounds, ...makeMoments() })
          }
          const entry = transitions.get(key)
          const probability = weight * wound.probability
          entry.probability += probability
          entry.first.hits += probability * hits
          entry.second.hits += probability * hits * hits
          entry.first.crits += probability * Number(hit.isCrit)
          entry.second.crits += probability * Number(hit.isCrit)
          if (devastatingWounds) {
            entry.first.devastating += weight * wound.criticalFirst
            entry.second.devastating += weight * wound.criticalSecond
          }
        }
      }
    }
    return [...transitions.values()]
  })

const summarizeReward = (moments, reward, maximum) => {
  const mean = moments.reduce((sum, entry) => sum + entry.first[reward], 0)
  const second = moments.reduce((sum, entry) => sum + entry.second[reward], 0)
  const stdDev = Math.sqrt(Math.max(0, second - mean * mean))
  return {
    mean,
    stdDev,
    low: Math.max(0, mean - Z_95 * stdDev),
    high: Math.min(maximum, mean + Z_95 * stdDev),
  }
}

export const calculateWoundPool = ({
  numAttacks,
  toHit = 3,
  toWound = 4,
  hitReroll = REROLL_VALUES.NO_REROLL,
  woundReroll = REROLL_VALUES.NO_REROLL,
  critHit = 6,
  antiValue = null,
  torrent = false,
  sustainedHits = 'off',
  lethalHits = false,
  devastatingWounds = false,
  rerollOneFailedHit = false,
  rerollOneFailedWound = false,
}) => {
  if (!Number.isInteger(numAttacks) || numAttacks < 1 || numAttacks > 100) {
    throw new Error('Attacks must be an integer between 1 and 100.')
  }
  if (!REROLL_MODES.has(hitReroll) || !REROLL_MODES.has(woundReroll)) {
    throw new Error('Invalid hit or wound reroll mode.')
  }
  const hitThreshold = torrent ? 2 : thresholdValue(toHit, 'Hit threshold')
  const criticalHit = thresholdValue(critHit, 'Critical hit threshold')
  const criticalWound = antiValue == null ? 6 : thresholdValue(antiValue, 'ANTI threshold')
  const woundThreshold = Math.min(thresholdValue(toWound, 'Wound threshold'), criticalWound)
  const extras = torrent ? [{ hits: 0, probability: 1 }] : sustainedOutcomes(sustainedHits)
  const maxPerAttack = 1 + Math.max(...extras.map((extra) => extra.hits))
  const hitOutcomes = [false, true].map((available) =>
    torrent
      ? [{ success: true, isCrit: false, usedSingle: false, probability: 1 }]
      : getD6RollOutcomes(hitThreshold, hitReroll, criticalHit, available)
  )
  const woundOutcomes = [false, true].map((available) =>
    getD6RollOutcomes(woundThreshold, woundReroll, criticalWound, available)
  )
  const woundPools = buildWoundPools(maxPerAttack, woundOutcomes)
  const transitions = buildAttackTransitions(
    hitOutcomes, extras, woundPools, lethalHits, devastatingWounds
  )

  // Four budget states preserve correlations across every attack and generated hit.
  const initialState = Number(!torrent && rerollOneFailedHit) * 2 + Number(rerollOneFailedWound)
  let probabilities = Array.from({ length: 4 }, () => new Float64Array(1))
  let moments = Array.from({ length: 4 }, () => makeMoments())
  probabilities[initialState][0] = 1
  moments[initialState].probability = 1

  for (let attack = 0; attack < numAttacks; attack++) {
    const next = Array.from({ length: 4 }, () => new Float64Array((attack + 1) * maxPerAttack + 1))
    const nextMoments = Array.from({ length: 4 }, () => makeMoments())
    for (let state = 0; state < 4; state++) {
      const previous = moments[state]
      if (previous.probability === 0) continue
      for (const transition of transitions[state]) {
        for (let wounds = 0; wounds < probabilities[state].length; wounds++) {
          next[transition.state][wounds + transition.wounds] +=
            probabilities[state][wounds] * transition.probability
        }
        const entry = nextMoments[transition.state]
        entry.probability += previous.probability * transition.probability
        for (const reward of REWARDS) {
          entry.first[reward] +=
            previous.first[reward] * transition.probability +
            previous.probability * transition.first[reward]
          entry.second[reward] +=
            previous.second[reward] * transition.probability +
            2 * previous.first[reward] * transition.first[reward] +
            previous.probability * transition.second[reward]
        }
      }
    }
    probabilities = next
    moments = nextMoments
  }

  const wounds = new Float64Array(numAttacks * maxPerAttack + 1)
  for (const state of probabilities) {
    for (let count = 0; count < state.length; count++) wounds[count] += state[count]
  }
  const expectedWounds = wounds.reduce((sum, probability, count) => sum + count * probability, 0)
  const variance = wounds.reduce(
    (sum, probability, count) => sum + (count - expectedWounds) ** 2 * probability, 0
  )
  const stdDev = Math.sqrt(variance)
  let maxWounds = wounds.length - 1
  while (maxWounds > 0 && wounds[maxWounds] === 0) maxWounds--
  const hits = summarizeReward(moments, 'hits', numAttacks * maxPerAttack)
  const crits = summarizeReward(moments, 'crits', torrent ? 0 : numAttacks)
  const devastating = summarizeReward(moments, 'devastating', numAttacks * maxPerAttack)

  return {
    expectedHits: hits.mean,
    hitsStdDev: hits.stdDev,
    hitsCILow: hits.low,
    hitsCIHigh: hits.high,
    expectedCrits: crits.mean,
    criticalStdDev: crits.stdDev,
    criticalCILow: crits.low,
    criticalCIHigh: crits.high,
    expectedWounds,
    stdDev,
    woundsCILow: Math.max(0, expectedWounds - Z_95 * stdDev),
    woundsCIHigh: Math.min(maxWounds, expectedWounds + Z_95 * stdDev),
    expectedDevastatingWounds: devastating.mean,
    devastatingWoundsStdDev: devastating.stdDev,
    devastatingCILow: devastating.low,
    devastatingCIHigh: devastating.high,
    woundChance: woundOutcomes[0].reduce(
      (sum, outcome) => sum + (outcome.success ? outcome.probability : 0), 0
    ),
    maxWounds,
    distributionData: buildDistribution({
      max: maxWounds,
      xKey: 'wounds',
      probabilityFn: (count) => wounds[count],
    }),
  }
}

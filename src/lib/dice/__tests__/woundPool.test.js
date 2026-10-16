import { afterEach, describe, expect, it, vi } from 'vitest'
import { REROLL_VALUES } from '../constants'
import { evaluateD6, getD6RollOutcomes } from '../d6Rerolls'
import { calculateWoundPool } from '../woundPool'
import { simulateAttack } from '../attackSimulation'
import { calculateHitProbability, calculateWoundProbability } from '../probability'
import { sustainedMean } from '../options'

const probability = (result, count) => result.distributionData[count].probability / 100
const probabilityMass = (result) =>
  result.distributionData.reduce((sum, row) => sum + row.probability / 100, 0)

const expectSameResults = (actual, expected) => {
  for (const key of Object.keys(expected)) {
    if (key === 'distributionData') continue
    expect(actual[key], key).toBeCloseTo(expected[key], 10)
  }
  expect(actual.distributionData).toHaveLength(expected.distributionData.length)
  for (let count = 0; count < expected.distributionData.length; count++) {
    expect(probability(actual, count)).toBeCloseTo(probability(expected, count), 10)
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('shared D6 reroll outcomes', () => {
  it('never makes a natural 1 a critical success', () => {
    expect(evaluateD6(1, 2, 2)).toEqual({ success: false, isCrit: false })
    expect(evaluateD6(2, 6, 2)).toEqual({ success: true, isCrit: true })
    expect(evaluateD6(6, 7, 7)).toEqual({ success: true, isCrit: false })
  })

  it.each(['no-reroll', 'reroll-one', 'reroll-one-two', 'reroll-fail'])(
    'allows at most one reroll per die when combining %s and a single failure reroll',
    (mode) => {
      const outcomes = getD6RollOutcomes(4, mode, 6, true)
      expect(outcomes.reduce((sum, row) => sum + row.probability, 0)).toBeCloseTo(1, 12)
      expect(outcomes.filter((row) => row.success)
        .reduce((sum, row) => sum + row.probability, 0)).toBeCloseTo(3 / 4, 12)
      expect(outcomes.filter((row) => row.isCrit)
        .reduce((sum, row) => sum + row.probability, 0)).toBeCloseTo(1 / 4, 12)
    }
  )

  it('spends no single opportunity on an original 1 covered by reroll-ones', () => {
    const outcomes = getD6RollOutcomes(4, 'reroll-one', 6, true)
    expect(outcomes.filter((row) => row.usedSingle)
      .reduce((sum, row) => sum + row.probability, 0)).toBeCloseTo(1 / 3, 12)
  })

  it('does not add another reroll after a non-critical reroll fails', () => {
    const outcomes = getD6RollOutcomes(4, 'reroll-non-critical', 6, true)
    expect(outcomes.some((row) => row.usedSingle)).toBe(false)
    expect(outcomes.filter((row) => row.success)
      .reduce((sum, row) => sum + row.probability, 0)).toBeCloseTo(7 / 12, 12)
  })

  it('keeps critical 2s with reroll-ones-and-twos and ANTI 2+', () => {
    const outcomes = getD6RollOutcomes(2, 'reroll-one-two', 2, true)
    expect(outcomes.some((row) => row.usedSingle)).toBe(false)
    expect(outcomes.filter((row) => row.isCrit)
      .reduce((sum, row) => sum + row.probability, 0)).toBeCloseTo(35 / 36, 12)
  })
})

describe('calculateWoundPool', () => {
  it('preserves default expected values while including randomness in both hit and wound rolls', () => {
    const result = calculateWoundPool({ numAttacks: 20 })

    expect(result.expectedHits).toBeCloseTo(40 / 3, 11)
    expect(result.expectedWounds).toBeCloseTo(20 / 3, 11)
    expect(result.hitsStdDev ** 2).toBeCloseTo(40 / 9, 10)
    expect(result.stdDev ** 2).toBeCloseTo(40 / 9, 10)
    expect(result.distributionData).toHaveLength(21)
    expect(probabilityMass(result)).toBeCloseTo(1, 11)
  })

  it.each([
    {},
    { hitReroll: 'reroll-one', woundReroll: 'reroll-one' },
    { sustainedHits: 'D3', lethalHits: true, critHit: 5, hitReroll: 'reroll-non-critical' },
    { sustainedHits: '2', devastatingWounds: true, antiValue: 2, woundReroll: 'reroll-one-two' },
  ])('preserves ordinary closed-form expected values for %j', (overrides) => {
    const options = {
      numAttacks: 20,
      toHit: 3,
      toWound: 4,
      critHit: 6,
      hitReroll: 'no-reroll',
      woundReroll: 'no-reroll',
      sustainedHits: 'off',
      ...overrides,
    }
    const result = calculateWoundPool(options)
    const hit = calculateHitProbability(options.toHit, options.hitReroll, options.critHit)
    const wound = calculateWoundProbability(
      options.toWound, options.woundReroll, options.antiValue != null, options.antiValue
    )
    const expectedHits = 20 * (
      hit.hitChance + hit.criticalChance * sustainedMean(options.sustainedHits)
    )
    const lethal = options.lethalHits ? 20 * hit.criticalChance : 0

    expect(result.expectedHits).toBeCloseTo(expectedHits, 10)
    expect(result.expectedCrits).toBeCloseTo(20 * hit.criticalChance, 10)
    expect(result.expectedWounds).toBeCloseTo(
      lethal + (expectedHits - lethal) * wound.woundChance, 10
    )
    expect(result.expectedDevastatingWounds).toBeCloseTo(
      options.devastatingWounds ? (expectedHits - lethal) * wound.criticalWoundChance : 0, 10
    )
  })

  it('is deterministic and never samples random dice for the calculator', () => {
    vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('The exact calculator must not sample random dice')
    })
    const options = {
      numAttacks: 3,
      sustainedHits: 'D6',
      rerollOneFailedHit: true,
      rerollOneFailedWound: true,
    }
    expect(calculateWoundPool(options)).toEqual(calculateWoundPool(options))
  })

  it('matches the independent attack distribution when neither limited buff is enabled', () => {
    const result = calculateWoundPool({ numAttacks: 2, toHit: 4, toWound: 4 })

    expect(result.expectedHits).toBeCloseTo(1, 12)
    expect(result.expectedWounds).toBeCloseTo(1 / 2, 12)
    expect(result.stdDev ** 2).toBeCloseTo(3 / 8, 12)
    ;[9 / 16, 3 / 8, 1 / 16].forEach((expected, count) => {
      expect(probability(result, count)).toBeCloseTo(expected, 12)
    })
  })

  it.each(['no-reroll', 'reroll-one'])(
    'uses independent hit and wound opportunities with %s on one attack',
    (mode) => {
      const result = calculateWoundPool({
        numAttacks: 1,
        toHit: 4,
        toWound: 4,
        hitReroll: mode,
        woundReroll: mode,
        rerollOneFailedHit: true,
        rerollOneFailedWound: true,
        devastatingWounds: true,
      })

      expect(result.expectedHits).toBeCloseTo(3 / 4, 12)
      expect(result.expectedCrits).toBeCloseTo(1 / 4, 12)
      expect(result.expectedWounds).toBeCloseTo(9 / 16, 12)
      expect(result.expectedDevastatingWounds).toBeCloseTo(3 / 16, 12)
      expect(result.stdDev ** 2).toBeCloseTo((9 / 16) * (7 / 16), 12)
      expect(probability(result, 1)).toBeCloseTo(9 / 16, 12)
    }
  )

  it('shares one wound reroll across the whole Torrent pool and computes its exact variance', () => {
    const result = calculateWoundPool({
      numAttacks: 2,
      torrent: true,
      toWound: 4,
      rerollOneFailedWound: true,
    })

    expect(result.expectedHits).toBeCloseTo(2, 12)
    expect(result.hitsStdDev).toBeCloseTo(0, 7)
    expect(result.expectedWounds).toBeCloseTo(11 / 8, 12)
    expect(result.stdDev ** 2).toBeCloseTo(31 / 64, 12)
    ;[1 / 8, 3 / 8, 1 / 2].forEach((expected, count) => {
      expect(probability(result, count)).toBeCloseTo(expected, 12)
    })
  })

  it('shares one hit reroll and lets a rerolled critical trigger Lethal Hits', () => {
    const result = calculateWoundPool({
      numAttacks: 2,
      toHit: 4,
      critHit: 4,
      lethalHits: true,
      devastatingWounds: true,
      rerollOneFailedHit: true,
    })

    expect(result.expectedHits).toBeCloseTo(11 / 8, 12)
    expect(result.expectedCrits).toBeCloseTo(11 / 8, 12)
    expect(result.expectedWounds).toBeCloseTo(11 / 8, 12)
    expect(result.expectedDevastatingWounds).toBe(0)
    expect(result.criticalStdDev).toBeCloseTo(result.stdDev, 12)
  })

  it('matches the closed-form hit-pool bonus without treating it as a per-die reroll', () => {
    const result = calculateWoundPool({
      numAttacks: 20,
      toHit: 4,
      hitReroll: 'reroll-one',
      rerollOneFailedHit: true,
    })
    const eligible = 1 - (2 / 3) ** 20

    expect(result.expectedHits).toBeCloseTo(20 * (7 / 12) + eligible / 2, 11)
    expect(result.expectedCrits).toBeCloseTo(20 * (7 / 36) + eligible / 6, 11)
    expect(result.expectedWounds).toBeCloseTo(result.expectedHits / 2, 11)
  })

  it('averages the limited wound bonus over the actual random hit count', () => {
    const result = calculateWoundPool({
      numAttacks: 2,
      toHit: 3,
      toWound: 4,
      rerollOneFailedWound: true,
    })

    expect(result.expectedWounds).toBeCloseTo(2 / 3 + (1 - (2 / 3) ** 2) / 2, 12)
  })

  it.each(['reroll-fail', 'reroll-non-critical'])(
    'does not improve or change the distribution when existing %s already covers all failures',
    (mode) => {
      const options = { numAttacks: 3, toHit: 4, hitReroll: mode, woundReroll: mode }
      expectSameResults(
        calculateWoundPool({ ...options, rerollOneFailedHit: true, rerollOneFailedWound: true }),
        calculateWoundPool(options)
      )
    }
  )

  it('ignores hit-only abilities under Torrent without spending any wound opportunity', () => {
    const options = { numAttacks: 3, torrent: true, rerollOneFailedWound: true }
    const result = calculateWoundPool({
      ...options,
      critHit: 2,
      sustainedHits: 'D6',
      lethalHits: true,
      rerollOneFailedHit: true,
    })

    expectSameResults(result, calculateWoundPool(options))
    expect(result.expectedCrits).toBe(0)
  })

  it('separates Lethal Hits from rolled Devastating Wounds while sharing the wound budget with extras', () => {
    const result = calculateWoundPool({
      numAttacks: 1,
      toHit: 2,
      critHit: 2,
      sustainedHits: '1',
      lethalHits: true,
      devastatingWounds: true,
      rerollOneFailedHit: true,
      rerollOneFailedWound: true,
    })
    const critical = 35 / 36
    const devastating = 35 / 144

    expect(result.expectedHits).toBeCloseTo(2 * critical, 12)
    expect(result.expectedCrits).toBeCloseTo(critical, 12)
    expect(result.expectedWounds).toBeCloseTo(245 / 144, 12)
    expect(result.expectedDevastatingWounds).toBeCloseTo(devastating, 12)
    expect(result.hitsStdDev ** 2).toBeCloseTo(4 * critical * (1 - critical), 12)
    expect(result.devastatingWoundsStdDev ** 2).toBeCloseTo(devastating * (1 - devastating), 12)
    expect(probability(result, 0)).toBeCloseTo(1 / 36, 12)
    expect(probability(result, 1)).toBeCloseTo(35 / 144, 12)
    expect(probability(result, 2)).toBeCloseTo(35 / 48, 12)
  })

  it.each([['D3', 3], ['D6', 6]])(
    'keeps random Sustained %s hits and the limited wound opportunity correlated',
    (sustainedHits, sides) => {
      const result = calculateWoundPool({
        numAttacks: 1,
        toHit: 2,
        critHit: 2,
        sustainedHits,
        lethalHits: true,
        devastatingWounds: true,
        woundReroll: 'reroll-one',
        rerollOneFailedHit: true,
        rerollOneFailedWound: true,
      })
      const critical = 35 / 36
      let expectedRolledWounds = 0
      let expectedDevastating = 0
      for (let count = 1; count <= sides; count++) {
        expectedRolledWounds += (count * (7 / 12) + (1 - (2 / 3) ** count) / 2) / sides
        expectedDevastating += (count * (7 / 36) + (1 - (2 / 3) ** count) / 6) / sides
      }
      const meanExtra = (sides + 1) / 2
      const varianceExtra = (sides * sides - 1) / 12

      expect(result.expectedHits).toBeCloseTo(critical * (1 + meanExtra), 11)
      expect(result.hitsStdDev ** 2).toBeCloseTo(
        critical * varianceExtra + critical * (1 - critical) * (1 + meanExtra) ** 2, 11
      )
      expect(result.expectedWounds).toBeCloseTo(critical * (1 + expectedRolledWounds), 11)
      expect(result.expectedDevastatingWounds).toBeCloseTo(critical * expectedDevastating, 11)
    }
  )

  it('counts all rolled ANTI 2+ wounds as devastating without rerolling critical 2s', () => {
    const result = calculateWoundPool({
      numAttacks: 3,
      sustainedHits: 'D3',
      antiValue: 2,
      woundReroll: 'reroll-one-two',
      devastatingWounds: true,
      rerollOneFailedHit: true,
      rerollOneFailedWound: true,
    })

    expect(result.expectedDevastatingWounds).toBeCloseTo(result.expectedWounds, 10)
    expect(result.devastatingWoundsStdDev).toBeCloseTo(result.stdDev, 10)
  })

  it.each(Object.values(REROLL_VALUES))('preserves exact probability mass with %s and both shared budgets', (mode) => {
    const result = calculateWoundPool({
      numAttacks: 4,
      hitReroll: mode,
      woundReroll: mode,
      sustainedHits: 'D6',
      lethalHits: true,
      devastatingWounds: true,
      antiValue: 4,
      rerollOneFailedHit: true,
      rerollOneFailedWound: true,
    })
    const expectedWounds = result.distributionData.reduce(
      (sum, row) => sum + row.wounds * row.probability / 100, 0
    )

    expect(probabilityMass(result)).toBeCloseTo(1, 11)
    expect(expectedWounds).toBeCloseTo(result.expectedWounds, 11)
    expect(result.distributionData.every((row) => row.probability >= 0)).toBe(true)
    expect(result.distributionData.at(-1).cumulative).toBeCloseTo(100, 9)
    expect(Number.isFinite(result.hitsStdDev)).toBe(true)
    expect(Number.isFinite(result.devastatingWoundsStdDev)).toBe(true)
  })

  it('supports the full 100-attack, Sustained 9 input without truncating probability mass', () => {
    const result = calculateWoundPool({
      numAttacks: 100,
      critHit: 2,
      sustainedHits: '9',
      lethalHits: true,
      devastatingWounds: true,
      rerollOneFailedHit: true,
      rerollOneFailedWound: true,
    })

    expect(result.distributionData).toHaveLength(1001)
    expect(probabilityMass(result)).toBeCloseTo(1, 10)
    expect(result.maxWounds).toBe(1000)
    expect(result.hitsCIHigh).toBeLessThanOrEqual(1000)
    expect(result.woundsCIHigh).toBeLessThanOrEqual(1000)
    expect(Number.isFinite(result.stdDev)).toBe(true)
  })

  it.each([
    { numAttacks: 0 },
    { numAttacks: 101 },
    { numAttacks: 1.5 },
    { toHit: 1 },
    { toWound: 7 },
    { critHit: 7 },
    { antiValue: 1 },
    { sustainedHits: 'D8' },
    { hitReroll: 'invalid' },
    { woundReroll: 'invalid' },
  ])('rejects invalid input explicitly: %j', (options) => {
    expect(() => calculateWoundPool({ numAttacks: 2, ...options })).toThrow()
  })
})

describe('calculator and simulator consistency', () => {
  it.each([
    {},
    { hitReroll: 'reroll-one', woundReroll: 'reroll-one' },
    { woundReroll: 'reroll-one-two', antiValue: 2, devastatingWounds: true },
    { sustainedHits: 'D3', lethalHits: true, devastatingWounds: true },
    { sustainedHits: 'D6', hitReroll: 'reroll-one', woundReroll: 'reroll-one' },
    { toHit: 6, critHit: 2, lethalHits: true, sustainedHits: '1' },
  ])('matches Monte Carlo wounds, variance and distribution for %j', (overrides) => {
    const options = {
      numAttacks: 4,
      toHit: 4,
      toWound: 4,
      hitReroll: 'no-reroll',
      woundReroll: 'no-reroll',
      critHit: 6,
      sustainedHits: 'off',
      rerollOneFailedHit: true,
      rerollOneFailedWound: true,
      ...overrides,
    }
    const exact = calculateWoundPool(options)
    let seed = 42
    vi.spyOn(Math, 'random').mockImplementation(() => {
      seed = (1664525 * seed + 1013904223) >>> 0
      return seed / 4294967296
    })
    const simulation = simulateAttack(
      [{
        attacks: '4',
        modelsFiring: 1,
        toHit: options.toHit,
        strength: 4,
        ap: 0,
        damage: '1',
        hitReroll: options.hitReroll,
        woundReroll: options.woundReroll,
        critHitEnabled: true,
        critHit: options.critHit,
        sustainedHits: options.sustainedHits,
        lethalHits: options.lethalHits,
        devastatingWounds: options.devastatingWounds,
        antiEnabled: options.antiValue != null,
        antiValue: options.antiValue,
      }],
      [{ models: 100, wounds: 1, toughness: 4, save: 7 }],
      20000,
      { rerollOneFailedHit: true, rerollOneFailedWound: true }
    )

    expect(Math.abs(simulation.expectedDamage - exact.expectedWounds)).toBeLessThan(0.06)
    expect(Math.abs(simulation.expectedDamageStdDev - exact.stdDev)).toBeLessThan(0.1)
    for (const row of exact.distributionData) {
      expect(Math.abs(simulation.distributionData[row.wounds].probability - row.probability))
        .toBeLessThan(1.5)
    }
  })
})

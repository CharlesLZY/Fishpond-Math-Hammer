import { describe, expect, it } from 'vitest'
import { calculateChargeProbabilities } from '../chargeProbability'

describe('calculateChargeProbabilities', () => {
  it('only includes charge targets from 2 through 12', () => {
    const probabilities = calculateChargeProbabilities()

    expect(probabilities).toHaveLength(11)
    expect(probabilities[0].target).toBe(2)
    expect(probabilities.at(-1).target).toBe(12)
  })

  it('calculates the 12-inch charge probabilities', () => {
    const probabilities = calculateChargeProbabilities()
    const twelveInchCharge = probabilities.find(({ target }) => target === 12)

    expect(twelveInchCharge).toEqual({
      target: 12,
      probability: '2.78',
      probabilityWithReroll: '5.48',
      probability3D6: '37.50',
      probability3D6WithReroll: '60.94',
      probability3D6HighestTwo: '7.41'
    })
  })
})

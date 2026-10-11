const MIN_CHARGE_TARGET = 2
const MAX_CHARGE_TARGET = 12
const D6_SIDES = 6

const toPercentage = (successes, outcomes) => ((successes / outcomes) * 100).toFixed(2)

export const calculateChargeProbabilities = () => {
  const outcomes = []

  for (let target = MIN_CHARGE_TARGET; target <= MAX_CHARGE_TARGET; target++) {
    let twoD6Successes = 0
    let threeD6Successes = 0
    let threeD6HighestTwoSuccesses = 0

    for (let d1 = 1; d1 <= D6_SIDES; d1++) {
      for (let d2 = 1; d2 <= D6_SIDES; d2++) {
        if (d1 + d2 >= target) twoD6Successes++

        for (let d3 = 1; d3 <= D6_SIDES; d3++) {
          const threeD6Total = d1 + d2 + d3
          if (threeD6Total >= target) threeD6Successes++
          if (threeD6Total - Math.min(d1, d2, d3) >= target) {
            threeD6HighestTwoSuccesses++
          }
        }
      }
    }

    const twoD6Probability = twoD6Successes / D6_SIDES ** 2
    const twoD6RerollProbability =
      2 * twoD6Probability - twoD6Probability * twoD6Probability
    const threeD6Probability = threeD6Successes / D6_SIDES ** 3
    const threeD6RerollProbability =
      2 * threeD6Probability - threeD6Probability * threeD6Probability

    outcomes.push({
      target,
      probability: (twoD6Probability * 100).toFixed(2),
      probabilityWithReroll: (twoD6RerollProbability * 100).toFixed(2),
      probability3D6: (threeD6Probability * 100).toFixed(2),
      probability3D6WithReroll: (threeD6RerollProbability * 100).toFixed(2),
      probability3D6HighestTwo: toPercentage(
        threeD6HighestTwoSuccesses,
        D6_SIDES ** 3
      )
    })
  }

  return outcomes
}

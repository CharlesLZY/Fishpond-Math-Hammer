import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import DiceCalculator from '../DiceCalculator'
import WoundSuccessCalculator from '../WoundSuccessCalculator'
import AoSDamageCalculator from '../AoSDamageCalculator'

describe('40K Dice Calculator limited reroll controls', () => {
  it.each([
    { name: 'calculator', content: <WoundSuccessCalculator /> },
    { name: 'dice page', content: <DiceCalculator /> },
  ])('offers two concise, initially disabled buffs on the $name', ({ content }) => {
    const html = renderToStaticMarkup(content)

    for (const label of ['REROLL FAILED HIT DICE', 'REROLL FAILED WOUND DICE']) {
      expect(html).toContain(`aria-pressed="false">${label}</button>`)
      expect(html).not.toContain(`aria-label="${label} value"`)
    }
    expect(html).not.toContain('REROLL ONE')
    expect(html).not.toContain('unit-buffs-hint')
    expect(html).toContain('id="numDice"')
    expect(html).toContain('max="100"')
    expect(html).toContain('Hit Reroll')
    expect(html).toContain('Wound Reroll')
  })

  it('does not add the 40K-only buffs to the AoS calculator', () => {
    const html = renderToStaticMarkup(<AoSDamageCalculator />)
    expect(html).not.toContain('REROLL FAILED HIT DICE')
    expect(html).not.toContain('REROLL FAILED WOUND DICE')
  })
})

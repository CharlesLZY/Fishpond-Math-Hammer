import { useState } from 'react'
import WoundSuccessCalculator from './WoundSuccessCalculator'
import AoSDamageCalculator from './AoSDamageCalculator'
import { Page, Tabs } from './ui'
import '../styles/diceCalculator.css'

const DICE_TABS = [
  { value: 'wound-success', label: '40K Wound Success Calculator' },
  { value: 'aos-damage', label: 'AoS Damage Calculator' }
]

function DiceCalculator() {
  const [activeTab, setActiveTab] = useState('wound-success')

  return (
    <Page title="Dice Calculator">
      <Tabs
        ariaLabel="Dice calculators"
        value={activeTab}
        onChange={setActiveTab}
        tabs={DICE_TABS}
      />

      {activeTab === 'wound-success' && <WoundSuccessCalculator />}
      {activeTab === 'aos-damage' && <AoSDamageCalculator />}
    </Page>
  )
}

export default DiceCalculator

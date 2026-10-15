// Unit-wide buff panel for the attacking unit.
//
// Holds buffs that the firing unit grants to every weapon (stratagems,
// detachment rules, auras). At simulation time these get merged into each
// weapon profile via `mergeWeaponWithUnit` (best-wins, no stacking).

import { FormSelect, BuffChipGroup } from '../ui'
import {
  rerollOptions,
  woundRerollOptions,
  critOptions,
  sustainedOptions,
} from '../../lib/dice/options'
import { useT } from '../attackSim/lang'
import { isUnitBuffsEmpty } from '../../lib/dice'

const rerollLangKeys = {
  'no-reroll': 'noReroll',
  'reroll-one': 'rerollOnes',
  'reroll-one-two': 'rerollOnesAndTwos',
  'reroll-fail': 'rerollFails',
  'reroll-non-critical': 'rerollNonCritical',
}

function UnitBuffsPanel({ value, onChange, disabled = false, additional = false }) {
  const { t } = useT()
  const update = (patch) => onChange({ ...value, ...patch })
  const rerollClassName = (key) => [
    'reroll-cell',
    additional && value[key] && value[key] !== 'no-reroll' && 'comparison-buff--added',
  ].filter(Boolean).join(' ')

  const localizeRerollOptions = (options) => options
    .filter((option) => !additional || option.value !== 'no-reroll')
    .map((option) => ({
      ...option,
      label: t(rerollLangKeys[option.value] ?? option.value),
    }))
  const localizedRerollOptions = localizeRerollOptions(rerollOptions)
  const localizedWoundRerollOptions = localizeRerollOptions(woundRerollOptions)

  const buffs = [
    {
      key: 'plusOneAttack',
      label: t('plusOneAttack'),
      active: value.plusOneAttack,
      onToggle: () => update({ plusOneAttack: !value.plusOneAttack }),
    },
    {
      key: 'plusOneDamage',
      label: t('plusOneDamage'),
      active: value.plusOneDamage,
      onToggle: () => update({ plusOneDamage: !value.plusOneDamage }),
    },
    {
      key: 'plusOneAp',
      label: t('plusOneAp'),
      active: value.plusOneAp,
      onToggle: () => update({ plusOneAp: !value.plusOneAp }),
    },
    {
      key: 'plusOneHit',
      label: t('plusOneHit'),
      active: value.plusOneHit,
      onToggle: () => update({ plusOneHit: !value.plusOneHit }),
    },
    {
      key: 'plusOneWound',
      label: t('plusOneWound'),
      active: value.plusOneWound,
      onToggle: () => update({ plusOneWound: !value.plusOneWound }),
    },
    {
      key: 'lethalHits',
      label: t('lethalHits'),
      active: value.lethalHits,
      onToggle: () => update({ lethalHits: !value.lethalHits }),
    },
    {
      key: 'devastating',
      label: t('devastatingWounds'),
      active: value.devastatingWounds,
      onToggle: () => update({ devastatingWounds: !value.devastatingWounds }),
    },
    {
      key: 'sustainedHits',
      label: t('sustainedHits'),
      active: value.sustainedHits && value.sustainedHits !== 'off',
      onToggle: () =>
        update({
          sustainedHits:
            value.sustainedHits && value.sustainedHits !== 'off' ? 'off' : '1',
        }),
      value: value.sustainedHits === 'off' ? '1' : value.sustainedHits,
      valueOptions: sustainedOptions,
      onValueChange: (v) => update({ sustainedHits: v }),
    },
    {
      key: 'critHit',
      label: t('criticalHit'),
      active: value.critHitEnabled,
      onToggle: () => update({ critHitEnabled: !value.critHitEnabled }),
      value: value.critHit?.toString() || '5',
      valueOptions: critOptions,
      onValueChange: (v) => update({ critHit: parseInt(v, 10) }),
    },
    {
      key: 'ignoresCover',
      label: t('ignoresCover'),
      active: value.ignoresCover,
      onToggle: () => update({ ignoresCover: !value.ignoresCover }),
    },
  ]

  const empty = isUnitBuffsEmpty(value)
  const presentedBuffs = buffs.map((buff) => ({
    ...buff,
    disabled,
    className: additional && buff.active ? 'comparison-buff--added' : undefined,
  }))

  return (
    <div className={`unit-buffs-panel${empty ? ' is-empty' : ''}`}>
      <div className="reroll-row unit-buffs-rerolls">
        <div className={rerollClassName('hitReroll')}>
          <label>{t('hitReroll')}</label>
          <div className="reroll-cell-controls">
            <FormSelect
              isDisabled={disabled}
              classNamePrefix="unit-buff-select"
              aria-label={t('hitReroll')}
              isClearable={additional}
              placeholder={additional ? t('addReroll') : undefined}
              options={localizedRerollOptions}
              value={
                localizedRerollOptions.find(
                  (o) => o.value === (value.hitReroll || 'no-reroll')
                ) || (additional ? null : localizedRerollOptions[0])
              }
              onChange={(opt) => update({ hitReroll: opt?.value ?? 'no-reroll' })}
            />
          </div>
        </div>
        <div className={rerollClassName('woundReroll')}>
          <label>{t('woundReroll')}</label>
          <div className="reroll-cell-controls">
            <FormSelect
              isDisabled={disabled}
              classNamePrefix="unit-buff-select"
              aria-label={t('woundReroll')}
              isClearable={additional}
              placeholder={additional ? t('addReroll') : undefined}
              options={localizedWoundRerollOptions}
              value={
                localizedWoundRerollOptions.find(
                  (o) => o.value === (value.woundReroll || 'no-reroll')
                ) || (additional ? null : localizedWoundRerollOptions[0])
              }
              onChange={(opt) => update({ woundReroll: opt?.value ?? 'no-reroll' })}
            />
          </div>
        </div>
      </div>

      <div className="buff-row">
        <BuffChipGroup buffs={presentedBuffs} />
      </div>
    </div>
  )
}

export default UnitBuffsPanel

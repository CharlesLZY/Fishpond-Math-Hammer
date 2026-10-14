import {
  describeTargetUpgrades,
  describeUpgrades,
  normalizeWeaponProfileRerolls,
} from '../../lib/dice'
import {
  duplicateProfileItem,
  makeTarget,
  makeWeapon,
  moveProfileItem,
  nextProfileName,
} from '../../lib/attackSimProfiles'
import { useT } from '../attackSim/lang'
import DefenderUnitBuffsPanel from './DefenderUnitBuffsPanel'
import TargetProfileCard from './TargetProfileCard'
import UnitBuffsPanel from './UnitBuffsPanel'
import WeaponProfileCard from './WeaponProfileCard'

export function AttackerProfileWorkspace({
  weapons,
  unitBuffs,
  onWeaponsChange,
  onUnitBuffsChange,
  onEdit,
}) {
  const { t } = useT()
  const commitWeapons = (next) => {
    onWeaponsChange(next)
    onEdit?.()
  }
  const commitUnitBuffs = (next) => {
    onUnitBuffsChange(next)
    onEdit?.()
  }
  const upgrades = weapons.map((weapon) =>
    describeUpgrades(weapon, unitBuffs)
  )

  return (
    <section className="attack-sim-unit-group">
      <header className="attack-sim-unit-group-header">
        <h3>{t('unitBuffsSection')}</h3>
      </header>
      <UnitBuffsPanel value={unitBuffs} onChange={commitUnitBuffs} />

      <div className="attack-sim-unit-group-divider" aria-hidden="true" />

      <div className="profile-list">
        {weapons.map((weapon, index) => (
          <WeaponProfileCard
            key={weapon.id}
            profile={weapon}
            index={index}
            total={weapons.length}
            upgrades={upgrades[index]}
            unitBuffs={unitBuffs}
            onChange={(next) =>
              commitWeapons(
                weapons.map((item, itemIndex) =>
                  itemIndex === index
                    ? normalizeWeaponProfileRerolls(next)
                    : item
                )
              )
            }
            onRemove={() => {
              if (weapons.length === 1) return
              commitWeapons(
                weapons.filter((_, itemIndex) => itemIndex !== index)
              )
            }}
            onMoveUp={() =>
              commitWeapons(moveProfileItem(weapons, index, index - 1))
            }
            onMoveDown={() =>
              commitWeapons(moveProfileItem(weapons, index, index + 1))
            }
            onDuplicate={() => {
              const next = weapons.slice()
              next.splice(index + 1, 0, duplicateProfileItem(weapon))
              commitWeapons(next)
            }}
          />
        ))}
        <button
          type="button"
          className="add-profile-tile"
          onClick={() =>
            commitWeapons([
              ...weapons,
              makeWeapon({ name: nextProfileName(weapons, 'Weapon') }),
            ])
          }
        >
          {t('addProfile')}
        </button>
      </div>
    </section>
  )
}

export function DefenderProfileWorkspace({
  targets,
  defenderUnitBuffs,
  onTargetsChange,
  onDefenderUnitBuffsChange,
  onEdit,
}) {
  const { t } = useT()
  const commitTargets = (next) => {
    onTargetsChange(next)
    onEdit?.()
  }
  const commitUnitBuffs = (next) => {
    onDefenderUnitBuffsChange(next)
    onEdit?.()
  }
  const upgrades = targets.map((target) =>
    describeTargetUpgrades(target, defenderUnitBuffs)
  )

  return (
    <section className="attack-sim-unit-group">
      <header className="attack-sim-unit-group-header">
        <h3>{t('unitBuffsSection')}</h3>
      </header>
      <DefenderUnitBuffsPanel
        value={defenderUnitBuffs}
        onChange={commitUnitBuffs}
      />

      <div className="attack-sim-unit-group-divider" aria-hidden="true" />

      <div className="profile-list">
        {targets.map((target, index) => (
          <TargetProfileCard
            key={target.id}
            profile={target}
            index={index}
            total={targets.length}
            upgrades={upgrades[index]}
            onChange={(next) =>
              commitTargets(
                targets.map((item, itemIndex) =>
                  itemIndex === index ? next : item
                )
              )
            }
            onRemove={() => {
              if (targets.length === 1) return
              commitTargets(
                targets.filter((_, itemIndex) => itemIndex !== index)
              )
            }}
            onMoveUp={() =>
              commitTargets(moveProfileItem(targets, index, index - 1))
            }
            onMoveDown={() =>
              commitTargets(moveProfileItem(targets, index, index + 1))
            }
            onDuplicate={() => {
              const next = targets.slice()
              next.splice(index + 1, 0, duplicateProfileItem(target))
              commitTargets(next)
            }}
          />
        ))}
        <button
          type="button"
          className="add-profile-tile"
          onClick={() =>
            commitTargets([
              ...targets,
              makeTarget({ name: nextProfileName(targets, 'Profile') }),
            ])
          }
        >
          {t('addProfile')}
        </button>
      </div>
    </section>
  )
}

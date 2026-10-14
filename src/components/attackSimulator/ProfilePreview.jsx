import { useId, useState } from 'react'
import { mergeTargetWithUnit, mergeWeaponWithUnit } from '../../lib/dice'
import { useT } from '../attackSim/lang'
import {
  buildAttackerUnitBuffSummary,
  buildDefenderUnitBuffSummary,
  buildTargetSummary,
  buildWeaponSummary,
} from './profileSummaries'

function SummaryChips({ chips, limit }) {
  if (chips.length === 0) return null
  const visible = chips.slice(0, limit)
  return (
    <div className="profile-preview-chips">
      {visible.map((chip) => (
        <span
          key={chip.key}
          className={`summary-chip${chip.isReroll ? ' summary-chip--reroll' : ''}`}
        >
          {chip.label}
        </span>
      ))}
      {chips.length > visible.length && (
        <span className="profile-preview-more">
          +{chips.length - visible.length}
        </span>
      )}
    </div>
  )
}

function ProfilePreviewCard({ name, items, unitChips, countLabel }) {
  const { t } = useT()
  const [expanded, setExpanded] = useState(false)
  const contentId = useId()
  const visibleItems = expanded ? items : items.slice(0, 2)
  const hasMore =
    items.length > 2 ||
    unitChips.length > 4 ||
    items.some((item) => item.chips.length > 3)

  return (
    <article className="profile-preview-card">
      <header className="profile-preview-header">
        <strong>{name}</strong>
        <span>{countLabel}</span>
      </header>
      <div id={contentId} className="profile-preview-content">
        <SummaryChips chips={unitChips} limit={expanded ? Infinity : 4} />
        <div className="profile-preview-list">
          {visibleItems.map((item, index) => (
            <div className="profile-preview-item" key={index}>
              <div className="profile-preview-item-heading">
                <span>{item.name || `${t('thProfile')} ${index + 1}`}</span>
                <small>×{item.count}</small>
              </div>
              <div className="profile-preview-stats">
                {item.stats.map((stat, statIndex) => (
                  <span key={statIndex}>{stat}</span>
                ))}
              </div>
              <SummaryChips
                chips={item.chips}
                limit={expanded ? Infinity : 3}
              />
            </div>
          ))}
        </div>
      </div>
      {hasMore && (
        <button
          type="button"
          className="profile-preview-toggle"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded((current) => !current)}
        >
          {t(expanded ? 'collapseProfilePreview' : 'expandProfilePreview')}
        </button>
      )}
    </article>
  )
}

export function AttackerProfilePreview({ name, profile }) {
  const { t } = useT()
  const weapons = profile?.weapons || []
  const unitBuffs = profile?.unitBuffs || {}
  const items = weapons.map((weapon) => {
    const effective = mergeWeaponWithUnit(weapon, unitBuffs)
    return {
      name: weapon.name,
      count: weapon.modelsFiring || 1,
      stats: [
        `A ${effective.attacks}`,
        effective.torrent ? t('torrent') : `${t('bsws')} ${effective.toHit}+`,
        `S ${effective.strength}`,
        `AP ${effective.ap ? `-${effective.ap}` : '0'}`,
        `D ${effective.damage}`,
      ],
      chips: buildWeaponSummary(weapon, null, t),
    }
  })

  return (
    <ProfilePreviewCard
      name={name}
      items={items}
      unitChips={buildAttackerUnitBuffSummary(unitBuffs, t)}
      countLabel={t('weaponProfileCount', weapons.length)}
    />
  )
}

export function DefenderProfilePreview({ name, profile }) {
  const { t } = useT()
  const targets = profile?.targets || []
  const unitBuffs = profile?.defenderUnitBuffs || {}
  const items = targets.map((target) => {
    const effective = mergeTargetWithUnit(target, unitBuffs)
    const stats = [
      `T ${effective.toughness}`,
      `W ${effective.wounds}`,
      `Sv ${effective.save}+`,
    ]
    if (effective.invulnSave > 0) stats.push(`Inv ${effective.invulnSave}+`)
    if (effective.fnp > 0) stats.push(`FNP ${effective.fnp}+`)
    return {
      name: target.name,
      count: target.models || 1,
      stats,
      chips: buildTargetSummary(target, null, t),
    }
  })

  return (
    <ProfilePreviewCard
      name={name}
      items={items}
      unitChips={buildDefenderUnitBuffSummary(unitBuffs, t)}
      countLabel={t('targetProfileCount', targets.length)}
    />
  )
}

// Slim defender profile card:
//   1. stat-line (Models / Toughness / Wounds / Sv / Inv)
//   2. Read-only summary of active defensive buffs
//   3. "Edit buffs…" button that opens TargetBuffsDialog
//
// Mirrors WeaponProfileCard. The `upgrades` map highlights chips that the
// defender unit-buff layer either added or strengthened.

import { useState } from 'react'
import { Settings } from 'lucide-react'
import { FormSelect } from '../ui'
import { saveOptions } from '../../lib/dice/options'
import IntInput from '../attackSim/IntInput'
import ProfileCardShell from '../attackSim/ProfileCardShell'
import { useT } from '../attackSim/lang'
import { buildTargetSummary } from './profileSummaries'
import TargetBuffsDialog from './TargetBuffsDialog'

const invulnOptions = [
  { value: '0', label: '—' },
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
  { value: '4', label: '4+' },
  { value: '5', label: '5+' },
  { value: '6', label: '6+' },
]

function TargetProfileCard({
  profile,
  index,
  total,
  upgrades,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDuplicate,
}) {
  const { t } = useT()
  const [editing, setEditing] = useState(false)
  const update = (patch) => onChange({ ...profile, ...patch })

  const findOpt = (opts, v) =>
    opts.find((o) => o.value === v.toString()) || opts[0]

  const summary = buildTargetSummary(profile, upgrades, t)

  return (
    <>
      <ProfileCardShell
        name={profile.name}
        placeholder={`${t('thProfile')} ${index + 1}`}
        index={index}
        total={total}
        onNameChange={(name) => update({ name })}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onDuplicate={onDuplicate}
        onRemove={onRemove}
      >
        <div className="stat-line">
          <div
            className="stat-cell"
            title="Number of models in the target unit with this profile (used for Blast and to decide when the unit is wiped)."
          >
            <label>{t('models')}</label>
            <IntInput
              min={1}
              max={50}
              fallback={1}
              value={profile.models}
              onChange={(n) => update({ models: n })}
            />
          </div>
          <div className="stat-cell">
            <label>{t('toughness')}</label>
            <IntInput
              min={1}
              fallback={1}
              value={profile.toughness}
              onChange={(n) => update({ toughness: n })}
            />
          </div>
          <div className="stat-cell">
            <label>{t('wounds')}</label>
            <IntInput
              min={1}
              max={50}
              fallback={1}
              value={profile.wounds}
              onChange={(n) => update({ wounds: n })}
            />
          </div>
          <div className="stat-cell">
            <label>{t('sv')}</label>
            <FormSelect
              variant="buff"
              options={saveOptions}
              value={findOpt(saveOptions, profile.save)}
              onChange={(opt) => update({ save: parseInt(opt.value, 10) })}
            />
          </div>
          <div className="stat-cell">
            <label>{t('inv')}</label>
            <FormSelect
              variant="buff"
              options={invulnOptions}
              value={findOpt(invulnOptions, profile.invulnSave || 0)}
              onChange={(opt) => update({ invulnSave: parseInt(opt.value, 10) })}
            />
          </div>
        </div>

        <div className="weapon-summary-row">
          <div className="weapon-summary-chips">
            {summary.length === 0 ? (
              <span className="weapon-summary-empty">{t('noWeaponBuffs')}</span>
            ) : (
              summary.map((chip) => (
                <span
                  key={chip.key}
                  className={
                    'summary-chip' + (chip.upgraded ? ' summary-chip--upgraded' : '')
                  }
                  title={chip.upgraded ? t('unitGrantedTag') : undefined}
                >
                  {chip.label}
                  {chip.upgraded && <span className="summary-chip-mark"> ↑</span>}
                </span>
              ))
            )}
          </div>
          <button
            type="button"
            className="weapon-edit-buffs-btn"
            onClick={() => setEditing(true)}
          >
            <Settings size={14} />
            <span>{t('editBuffs')}</span>
          </button>
        </div>
      </ProfileCardShell>

      {editing && (
        <TargetBuffsDialog
          profile={profile}
          onChange={onChange}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  )
}

export default TargetProfileCard

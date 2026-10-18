import { useId, useState } from 'react'
import { ChevronDown, ChevronRight, X } from 'lucide-react'
import SavedSetControls from '../ui/SavedSetControls'
import { useT } from '../attackSim/lang'
import { AttackerProfileWorkspace } from './ProfileWorkspaces'

export default function AttackerUnitCard({
  unit,
  index,
  total,
  savedProfiles,
  onLoad,
  onSave,
  onChange,
  onRemove,
}) {
  const { t } = useT()
  const [expanded, setExpanded] = useState(true)
  const contentId = useId()
  const unitLabel = unit.name
    ? `${t('attackerUnit', index + 1)} - ${unit.name}`
    : t('attackerUnit', index + 1)
  const Chevron = expanded ? ChevronDown : ChevronRight

  return (
    <section className="attack-sim-unit-group attacker-unit-card" aria-label={unitLabel}>
      <header className="attacker-unit-header">
        <button
          type="button"
          className="attacker-unit-toggle"
          aria-label={t(expanded ? 'collapseAttackerUnit' : 'expandAttackerUnit', unitLabel)}
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded((current) => !current)}
        >
          <Chevron size={18} aria-hidden="true" />
        </button>
        <SavedSetControls
          value={unit.name}
          options={savedProfiles}
          placeholder={t('savedAttackerSets')}
          emptyLabel={t('noSavedProfiles')}
          onChange={onLoad}
          onSave={onSave}
          saveLabel={t('saveProfile')}
          groupAriaLabel={t('savedAttackerUnitGroup', index + 1)}
          selectAriaLabel={t('loadAttackerUnitProfile', index + 1)}
        />
        <div className="profile-card-actions">
          <button
            type="button"
            className="danger"
            title={t('removeAttackerUnit', index + 1)}
            aria-label={t('removeAttackerUnit', index + 1)}
            disabled={total === 1}
            onClick={onRemove}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      </header>
      <div id={contentId} className="attacker-unit-content" hidden={!expanded}>
        <AttackerProfileWorkspace
          embedded
          weapons={unit.weapons}
          unitBuffs={unit.unitBuffs}
          onWeaponsChange={(weapons) => onChange({ weapons })}
          onUnitBuffsChange={(unitBuffs) => onChange({ unitBuffs })}
        />
      </div>
    </section>
  )
}

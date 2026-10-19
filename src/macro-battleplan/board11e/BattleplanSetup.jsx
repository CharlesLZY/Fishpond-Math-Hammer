import { FormSelect } from '../../components/ui'
import { FORCE_DISPOSITIONS } from '../config/battleplans11e'
import { useBoard11eStore } from '../store/board11eStore'

const DISPOSITION_OPTIONS = FORCE_DISPOSITIONS.map((disposition) => ({
  value: disposition.id,
  label: disposition.label,
  color: disposition.color,
}))

const formatDispositionOption = (option) => (
  <span className="mbp11-option">
    <span
      className="mbp11-swatch"
      style={{ backgroundColor: option.color }}
      aria-hidden="true"
    />
    {option.label}
  </span>
)

function DispositionSelect({ label, value, onChange }) {
  return (
    <div className="mbp11-field">
      <span className="mbp11-field__label">{label}</span>
      <FormSelect
        className="mbp11-select"
        options={DISPOSITION_OPTIONS}
        value={DISPOSITION_OPTIONS.find((option) => option.value === value) ?? null}
        onChange={(option) => onChange(option.value)}
        formatOptionLabel={formatDispositionOption}
        menuPortalTarget={document.body}
        aria-label={label}
      />
    </div>
  )
}

export function BattleplanSetup() {
  const setup = useBoard11eStore((s) => s.setup)
  const setSetup = useBoard11eStore((s) => s.setSetup)

  return (
    <section className="mbp-section mbp-battleplan-setup" aria-label="Battleplan setup">
      <div className="mbp-section__header">
        <span>Battleplan</span>
      </div>
      <div className="mbp11-setup">
        <DispositionSelect
          label="Attacker"
          value={setup.mine}
          onChange={(mine) => setSetup({ mine })}
        />
        <DispositionSelect
          label="Defender"
          value={setup.theirs}
          onChange={(theirs) => setSetup({ theirs })}
        />
      </div>
    </section>
  )
}

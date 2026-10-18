import { Save } from 'lucide-react'
import FormSelect from './FormSelect'

function SavedSetControls({
  value,
  options,
  placeholder,
  emptyLabel,
  onChange,
  onSave,
  saveLabel = 'Save Profile',
  groupAriaLabel,
  selectAriaLabel,
}) {
  const selectOptions = options.map((name) => ({ value: name, label: name }))

  return (
    <div className="profile-set-controls" role="group" aria-label={groupAriaLabel}>
      <FormSelect
        className="profile-set-select"
        classNamePrefix="profile-select"
        options={selectOptions}
        value={selectOptions.find((option) => option.value === value) ?? null}
        onChange={(option) => onChange(option?.value ?? '')}
        placeholder={placeholder}
        noOptionsMessage={() => emptyLabel}
        isClearable
        aria-label={selectAriaLabel}
      />
      <button
        type="button"
        className="toolbar-button"
        aria-label={saveLabel}
        title={saveLabel}
        onClick={onSave}
      >
        <Save size={14} />
        <span>{saveLabel}</span>
      </button>
    </div>
  )
}

export default SavedSetControls
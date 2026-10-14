import { useRef } from 'react'
import { Download, Save, Trash2, Upload } from 'lucide-react'

function SavedSetControls({
  value,
  options,
  placeholder,
  onChange,
  onSave,
  saveLabel = 'Save Set…',
  onDelete,
  deleteDisabled,
  deleteTitle,
  groupAriaLabel,
  selectAriaLabel,
  deleteAriaLabel,
  onImportFile,
  importLabel = 'Import',
  importTitle,
  onExport,
  exportLabel = 'Export',
  exportTitle,
  exportDisabled = false,
}) {
  const fileInputRef = useRef(null)

  return (
    <div className="profile-set-controls" role="group" aria-label={groupAriaLabel}>
      <select
        className="toolbar-select profile-set-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={selectAriaLabel}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <button type="button" className="toolbar-button" onClick={onSave}>
        <Save size={14} />
        <span>{saveLabel}</span>
      </button>
      <button
        type="button"
        className="toolbar-button toolbar-button--danger"
        onClick={onDelete}
        disabled={deleteDisabled}
        title={deleteTitle}
        aria-label={deleteAriaLabel}
      >
        <Trash2 size={14} />
      </button>
      <button
        type="button"
        className="toolbar-button"
        onClick={() => fileInputRef.current?.click()}
        title={importTitle}
        aria-label={importTitle}
      >
        <Upload size={14} />
        <span>{importLabel}</span>
      </button>
      <button
        type="button"
        className="toolbar-button"
        onClick={onExport}
        disabled={exportDisabled}
        title={exportTitle}
        aria-label={exportTitle}
      >
        <Download size={14} />
        <span>{exportLabel}</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={onImportFile}
        hidden
      />
    </div>
  )
}

export default SavedSetControls
import { useId, useRef, useState } from 'react'
import { StorageQuotaError } from '../../lib/attackSimStorage'
import { useT } from '../attackSim/lang'
import BuffsDialog from './BuffsDialog'

export default function ProfileNameDialog({
  title,
  initialName = '',
  existingNames,
  replaceName = '',
  submitLabel,
  onSubmit,
  onClose,
}) {
  const { t } = useT()
  const formId = useId()
  const inputId = useId()
  const errorId = useId()
  const warningId = useId()
  const inputRef = useRef(null)
  const [name, setName] = useState(initialName)
  const [error, setError] = useState(null)
  const [overwriteName, setOverwriteName] = useState(null)

  const handleSubmit = (event) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError({ kind: 'name', message: t('nameCannotBeEmpty') })
      inputRef.current?.focus()
      return
    }
    if (
      existingNames.includes(trimmed) &&
      trimmed !== replaceName &&
      overwriteName !== trimmed
    ) {
      setError(null)
      setOverwriteName(trimmed)
      return
    }
    try {
      onSubmit(trimmed)
      onClose()
    } catch (failure) {
      setError({
        kind: 'save',
        message: failure instanceof StorageQuotaError
          ? t('profileStorageFull')
          : failure instanceof Error
            ? failure.message
            : t('profileSaveFailed'),
      })
    }
  }

  return (
    <BuffsDialog
      title={title}
      className="profile-name-dialog"
      initialFocusRef={inputRef}
      closeLabel={t('cancel')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="toolbar-button" onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="submit" form={formId} className="weapon-buffs-dialog-done">
            {overwriteName ? t('overwriteProfile') : submitLabel}
          </button>
        </>
      }
    >
      <form id={formId} className="profile-name-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor={inputId}>{t('profileNameLabel')}</label>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={name}
          required
          autoComplete="off"
          aria-invalid={error?.kind === 'name'}
          aria-describedby={error ? errorId : overwriteName ? warningId : undefined}
          onChange={(event) => {
            setName(event.target.value)
            setError(null)
            setOverwriteName(null)
          }}
        />
        {overwriteName && (
          <div id={warningId} className="profile-name-warning" role="status">
            {t('profileExistsConfirm', overwriteName)}
          </div>
        )}
        {error && (
          <div id={errorId} className="attack-sim-error" role="alert">
            {error.message}
          </div>
        )}
      </form>
    </BuffsDialog>
  )
}

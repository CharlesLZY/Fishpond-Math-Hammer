import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useT } from '../attackSim/lang'

function BuffsDialog({
  title,
  subtitle,
  onClose,
  children,
  footer,
  className,
  closeLabel,
  initialFocusRef,
}) {
  const { t } = useT()
  const dialogRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented) return
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
      if (e.key !== 'Tab') return
      const controls = Array.from(
        dialogRef.current?.querySelectorAll(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'
        ) || []
      ).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0)
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (!first) {
        e.preventDefault()
        dialogRef.current?.focus()
      } else if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    const previousFocus = document.activeElement
    const target = initialFocusRef?.current ?? dialogRef.current
    target?.focus()
    initialFocusRef?.current?.select?.()
    return () => {
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [initialFocusRef])

  return (
    <div
      className="weapon-buffs-dialog-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className={['weapon-buffs-dialog', className].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <header className="weapon-buffs-dialog-header">
          <div>
            <h3>{title}</h3>
            {subtitle ? (
              <span className="weapon-buffs-dialog-subtitle">{subtitle}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="weapon-buffs-dialog-close"
            onClick={onClose}
            aria-label={closeLabel ?? t('closeBuffs')}
          >
            <X size={16} />
          </button>
        </header>
        <div className="weapon-buffs-dialog-body">{children}</div>
        <footer className="weapon-buffs-dialog-footer">
          {footer ?? (
            <button
              type="button"
              className="weapon-buffs-dialog-done"
              onClick={onClose}
            >
              {t('closeBuffs')}
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}

export default BuffsDialog

import { useEffect, useRef, useState } from 'react'
import {
  Copy,
  Download,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react'
import {
  deleteNamedTargetSet,
  deleteNamedWeaponSet,
  getSavedTargetSetLibrary,
  getSavedWeaponSetLibrary,
  listSavedTargetSets,
  listSavedWeaponSets,
  loadNamedTargetSet,
  loadNamedWeaponSet,
  mergeSavedTargetSetLibrary,
  mergeSavedWeaponSetLibrary,
  renameNamedTargetSet,
  renameNamedWeaponSet,
  saveNamedTargetSet,
  saveNamedWeaponSet,
  StorageQuotaError,
} from '../../lib/attackSimStorage'
import {
  buildAttackerProfileLibraryExport,
  buildDefenderProfileLibraryExport,
  parseAttackerProfileLibrary,
  parseDefenderProfileLibrary,
} from '../../lib/attackSimProfileLibrary'
import {
  createDefaultAttackerProfile,
  createDefaultDefenderProfile,
  hydrateAttackerProfile,
  hydrateDefenderProfile,
  serializeAttackerProfile,
  serializeDefenderProfile,
} from '../../lib/attackSimProfiles'
import { Tabs } from '../ui'
import { useT } from '../attackSim/lang'
import {
  AttackerProfileWorkspace,
  DefenderProfileWorkspace,
} from './ProfileWorkspaces'

const downloadJson = (payload, filenamePrefix) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  anchor.href = url
  anchor.download = `${filenamePrefix}-${stamp}.json`
  document.body.appendChild(anchor)
  try {
    anchor.click()
  } finally {
    anchor.remove()
    URL.revokeObjectURL(url)
  }
}

const sideApis = {
  attacker: {
    list: listSavedWeaponSets,
    load: loadNamedWeaponSet,
    save: saveNamedWeaponSet,
    remove: deleteNamedWeaponSet,
    rename: renameNamedWeaponSet,
    getLibrary: getSavedWeaponSetLibrary,
    mergeLibrary: mergeSavedWeaponSetLibrary,
    parseLibrary: parseAttackerProfileLibrary,
    buildExport: buildAttackerProfileLibraryExport,
    hydrate: hydrateAttackerProfile,
    serialize: serializeAttackerProfile,
    create: createDefaultAttackerProfile,
    filename: 'attack-sim-attacker-profiles',
  },
  defender: {
    list: listSavedTargetSets,
    load: loadNamedTargetSet,
    save: saveNamedTargetSet,
    remove: deleteNamedTargetSet,
    rename: renameNamedTargetSet,
    getLibrary: getSavedTargetSetLibrary,
    mergeLibrary: mergeSavedTargetSetLibrary,
    parseLibrary: parseDefenderProfileLibrary,
    buildExport: buildDefenderProfileLibraryExport,
    hydrate: hydrateDefenderProfile,
    serialize: serializeDefenderProfile,
    create: createDefaultDefenderProfile,
    filename: 'attack-sim-defender-profiles',
  },
}

export default function ProfileLibrary() {
  const { t } = useT()
  const [side, setSide] = useState('attacker')
  const [names, setNames] = useState(() => listSavedWeaponSets())
  const [selectedName, setSelectedName] = useState('')
  const [draft, setDraft] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState(null)
  const fileInputRef = useRef(null)
  const api = sideApis[side]

  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timeout)
  }, [toast])

  const confirmDiscard = () =>
    !dirty || window.confirm(t('discardProfileChangesConfirm'))

  const refresh = () => {
    const next = api.list()
    setNames(next)
    return next
  }

  const showStorageError = (error) => {
    const message =
      error instanceof StorageQuotaError
        ? t('profileStorageFull')
        : error instanceof Error
          ? error.message
          : t('storageUnavailable')
    setToast({ kind: 'error', message })
  }

  const handleSideChange = (nextSide) => {
    if (nextSide === side || !confirmDiscard()) return
    setSide(nextSide)
    setNames(sideApis[nextSide].list())
    setSelectedName('')
    setDraft(null)
    setDirty(false)
    setQuery('')
  }

  const handleSelect = (name) => {
    if (name === selectedName || !confirmDiscard()) return
    const stored = api.load(name)
    if (!stored) {
      setToast({ kind: 'error', message: t('profileLoadFailed', t('thProfile'), name) })
      return
    }
    setSelectedName(name)
    setDraft(api.hydrate(stored))
    setDirty(false)
  }

  const handleNew = () => {
    if (!confirmDiscard()) return
    const name = window.prompt(t('newProfileNamePrompt'))
    if (name === null) return
    const trimmed = name.trim()
    if (!trimmed) {
      setToast({ kind: 'error', message: t('nameCannotBeEmpty') })
      return
    }
    if (
      names.includes(trimmed) &&
      !window.confirm(t('profileExistsConfirm', trimmed))
    ) {
      return
    }
    const nextDraft = api.create()
    try {
      if (!api.save(trimmed, api.serialize(nextDraft))) {
        throw new Error(t('storageUnavailable'))
      }
      refresh()
      setSelectedName(trimmed)
      setDraft(nextDraft)
      setDirty(false)
      setToast({ kind: 'success', message: t('profileCreated', trimmed) })
    } catch (error) {
      showStorageError(error)
    }
  }

  const handleSave = () => {
    if (!selectedName || !draft) return
    try {
      if (!api.save(selectedName, api.serialize(draft))) {
        throw new Error(t('storageUnavailable'))
      }
      setDirty(false)
      setToast({ kind: 'success', message: t('profileSaved', t('thProfile'), selectedName) })
    } catch (error) {
      showStorageError(error)
    }
  }

  const handleDiscard = () => {
    if (!selectedName) return
    const stored = api.load(selectedName)
    if (!stored) return
    setDraft(api.hydrate(stored))
    setDirty(false)
  }

  const handleRename = () => {
    if (!selectedName || !confirmDiscard()) return
    const stored = api.load(selectedName)
    if (!stored) return
    const name = window.prompt(t('renameProfilePrompt'), selectedName)
    if (name === null) return
    const trimmed = name.trim()
    if (!trimmed || trimmed === selectedName) return
    if (
      names.includes(trimmed) &&
      !window.confirm(t('profileExistsConfirm', trimmed))
    ) {
      return
    }
    try {
      if (!api.rename(selectedName, trimmed)) {
        throw new Error(t('renameProfileFailed'))
      }
      setSelectedName(trimmed)
      setNames(api.list())
      setDraft(api.hydrate(stored))
      setDirty(false)
      setToast({ kind: 'success', message: t('profileRenamed', trimmed) })
    } catch (error) {
      showStorageError(error)
    }
  }

  const handleDuplicate = () => {
    if (!selectedName || !draft) return
    const name = window.prompt(t('duplicateProfilePrompt'), `${selectedName} copy`)
    if (name === null) return
    const trimmed = name.trim()
    if (!trimmed) return
    if (
      names.includes(trimmed) &&
      !window.confirm(t('profileExistsConfirm', trimmed))
    ) {
      return
    }
    try {
      if (!api.save(trimmed, api.serialize(draft))) {
        throw new Error(t('storageUnavailable'))
      }
      setNames(api.list())
      setSelectedName(trimmed)
      setDraft(api.hydrate(api.load(trimmed)))
      setDirty(false)
      setToast({ kind: 'success', message: t('profileCreated', trimmed) })
    } catch (error) {
      showStorageError(error)
    }
  }

  const handleDelete = () => {
    if (!selectedName) return
    if (!window.confirm(t('deleteProfileConfirm', selectedName))) return
    try {
      if (!api.remove(selectedName)) {
        throw new Error(t('deleteProfileFailed'))
      }
      setNames(api.list())
      setSelectedName('')
      setDraft(null)
      setDirty(false)
      setToast({ kind: 'success', message: t('profileDeleted', selectedName) })
    } catch (error) {
      showStorageError(error)
    }
  }

  const handleExport = () => {
    try {
      const profiles = api.getLibrary()
      if (Object.keys(profiles).length === 0) {
        throw new Error(t('noProfilesToExport'))
      }
      downloadJson(api.buildExport(profiles), api.filename)
      setToast({
        kind: 'success',
        message: t('profilesExported', Object.keys(profiles).length),
      })
    } catch (error) {
      setToast({
        kind: 'error',
        message: t('exportFailed', error.message || t('unknownError')),
      })
    }
  }

  const handleImport = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !confirmDiscard()) return
    try {
      const text = await file.text()
      let parsed
      try {
        parsed = JSON.parse(text)
      } catch {
        throw new Error('not valid JSON')
      }
      const profiles = api.parseLibrary(parsed)
      const existing = new Set(names)
      const importedNames = Object.keys(profiles)
      const updated = importedNames.filter((name) => existing.has(name)).length
      if (!api.mergeLibrary(profiles)) {
        throw new Error(t('storageUnavailable'))
      }
      setNames(api.list())
      setSelectedName('')
      setDraft(null)
      setDirty(false)
      setToast({
        kind: 'success',
        message: t('profilesImported', importedNames.length, importedNames.length - updated, updated),
      })
    } catch (error) {
      showStorageError(error)
    }
  }

  const filteredNames = names.filter((name) =>
    name.toLowerCase().includes(query.trim().toLowerCase())
  )

  return (
    <section className="profile-library-page">
      <header className="attack-sim-section-header profile-page-heading">
        <h2>{t('profileLibrary')}</h2>
        <div className="profile-library-toolbar">
          <button type="button" className="toolbar-button" onClick={handleNew}>
            <Plus size={14} />
            <span>{t('newProfile')}</span>
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={14} />
            <span>{t('import')}</span>
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={handleExport}
            disabled={names.length === 0}
          >
            <Download size={14} />
            <span>{t('export')}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImport}
            hidden
          />
        </div>
      </header>

      <Tabs
        value={side}
        onChange={handleSideChange}
        variant="profile-library-tabs"
        tabs={[
          { value: 'attacker', label: `${t('attackerLibrary')} (${side === 'attacker' ? names.length : listSavedWeaponSets().length})` },
          { value: 'defender', label: `${t('defenderLibrary')} (${side === 'defender' ? names.length : listSavedTargetSets().length})` },
        ]}
      />

      {toast && (
        <div className="attack-sim-toast-row">
          <span className={`toolbar-toast toolbar-toast--${toast.kind}`}>
            {toast.message}
          </span>
        </div>
      )}

      <div className="profile-library-layout">
        <aside className="profile-library-sidebar">
          <input
            type="search"
            className="profile-library-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('searchProfiles')}
            aria-label={t('searchProfiles')}
          />
          <div className="profile-library-list">
            {filteredNames.map((name) => (
              <button
                type="button"
                key={name}
                className={`profile-library-list-item${selectedName === name ? ' active' : ''}`}
                aria-pressed={selectedName === name}
                onClick={() => handleSelect(name)}
              >
                <span>{name}</span>
              </button>
            ))}
            {filteredNames.length === 0 && (
              <div className="profile-library-empty-list">
                {t('noSavedProfiles')}
              </div>
            )}
          </div>
        </aside>

        <div className="profile-library-editor">
          {!draft ? (
            <div className="profile-library-empty-editor">
              <strong>{t('selectProfileToEdit')}</strong>
              <span>
                {names.length === 0
                  ? t('noSavedProfiles')
                  : t('chooseProfileFromList')}
              </span>
            </div>
          ) : (
            <>
              <header className="profile-library-editor-header">
                <div>
                  <h3>{selectedName}</h3>
                  {dirty && (
                    <span className="profile-library-dirty">
                      {t('unsavedChanges')}
                    </span>
                  )}
                </div>
                <div className="profile-library-editor-actions">
                  <button
                    type="button"
                    className="toolbar-button"
                    onClick={handleSave}
                    disabled={!dirty}
                  >
                    <Save size={14} />
                    <span>{t('saveChanges')}</span>
                  </button>
                  <button
                    type="button"
                    className="toolbar-button"
                    onClick={handleDiscard}
                    disabled={!dirty}
                  >
                    <RotateCcw size={14} />
                    <span>{t('discardChanges')}</span>
                  </button>
                  <button type="button" className="toolbar-button" onClick={handleRename}>
                    <Pencil size={14} />
                    <span>{t('renameProfile')}</span>
                  </button>
                  <button type="button" className="toolbar-button" onClick={handleDuplicate}>
                    <Copy size={14} />
                    <span>{t('duplicateProfile')}</span>
                  </button>
                  <button
                    type="button"
                    className="toolbar-button toolbar-button--danger"
                    onClick={handleDelete}
                  >
                    <Trash2 size={14} />
                    <span>{t('deleteProfile')}</span>
                  </button>
                </div>
              </header>

              {side === 'attacker' ? (
                <AttackerProfileWorkspace
                  weapons={draft.weapons}
                  unitBuffs={draft.unitBuffs}
                  onWeaponsChange={(weapons) =>
                    setDraft((current) => ({ ...current, weapons }))
                  }
                  onUnitBuffsChange={(unitBuffs) =>
                    setDraft((current) => ({ ...current, unitBuffs }))
                  }
                  onEdit={() => setDirty(true)}
                />
              ) : (
                <DefenderProfileWorkspace
                  targets={draft.targets}
                  defenderUnitBuffs={draft.defenderUnitBuffs}
                  onTargetsChange={(targets) =>
                    setDraft((current) => ({ ...current, targets }))
                  }
                  onDefenderUnitBuffsChange={(defenderUnitBuffs) =>
                    setDraft((current) => ({
                      ...current,
                      defenderUnitBuffs,
                    }))
                  }
                  onEdit={() => setDirty(true)}
                />
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}

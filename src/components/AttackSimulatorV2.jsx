// Attack Simulator with separate profile and unit-wide buff layers.
// Weapon cards show compact summaries and open dialogs for full buff editing.
// Unit buffs are merged into each profile using best-wins, no-stacking rules.

import { useEffect, useState } from 'react'
import { ClipboardCopy } from 'lucide-react'
import {
  simulateAttack,
  isValidDiceExpression,
  makeUnitBuffs,
  mergeWeaponWithUnit,
  describeUpgrades,
  normalizeWeaponProfileRerolls,
  makeTargetUnitBuffs,
  mergeTargetWithUnit,
  describeTargetUpgrades,
} from '../lib/dice'
import {
  listSavedWeaponSets,
  saveNamedWeaponSet,
  loadNamedWeaponSet,
  deleteNamedWeaponSet,
  getSavedWeaponSetLibrary,
  mergeSavedWeaponSetLibrary,
  listSavedTargetSets,
  saveNamedTargetSet,
  loadNamedTargetSet,
  deleteNamedTargetSet,
  getSavedTargetSetLibrary,
  mergeSavedTargetSetLibrary,
  StorageQuotaError,
} from '../lib/attackSimV2Storage'
import {
  buildAttackerProfileLibraryExport,
  buildDefenderProfileLibraryExport,
  parseAttackerProfileLibrary,
  parseDefenderProfileLibrary,
  validateTargetShape,
  validateWeaponShape,
} from '../lib/attackSimV2ProfileLibrary'
import { buildAttackSimV2Report } from '../lib/attackSimV2Report'
import { Page, StatCard, StatGrid, DistributionChart } from './ui'
import TargetProfileCardV2 from './attackSimV2/TargetProfileCardV2'
import SavedSetControls from './ui/SavedSetControls'
import { LangProvider, useT } from './attackSim/lang'
import WeaponProfileCardV2 from './attackSimV2/WeaponProfileCardV2'
import UnitBuffsPanel from './attackSimV2/UnitBuffsPanel'
import DefenderUnitBuffsPanel from './attackSimV2/DefenderUnitBuffsPanel'
import '../styles/attackSimulator.css'
import '../styles/attackSimulatorV2.css'

// ---- factory helpers -------------------------------------------------------

let _id = 0
const uid = () => ++_id

const makeWeapon = (overrides = {}) => ({
  id: uid(),
  name: '',
  modelsFiring: 1,
  attacks: '4',
  strength: 4,
  toHit: 3,
  ap: 1,
  damage: '1',
  hitReroll: 'no-reroll',
  hitRerollScope: 'all',
  woundReroll: 'no-reroll',
  woundRerollScope: 'all',
  attackReroll: 'no-reroll',
  attackRerollScope: 'all',
  damageReroll: 'no-reroll',
  damageRerollScope: 'all',
  critHitEnabled: false,
  critHit: 5,
  critWound: 6,
  torrent: false,
  lethalHits: false,
  sustainedHits: 'off',
  devastatingWounds: false,
  plusOneWound: false,
  blast: false,
  cleaveEnabled: false,
  cleaveValue: 1,
  plusOneHit: false,
  ignoresCover: false,
  antiEnabled: false,
  antiValue: 4,
  ...overrides,
})

const makeTarget = (overrides = {}) => ({
  id: uid(),
  name: '',
  models: 5,
  toughness: 4,
  wounds: 2,
  save: 3,
  invulnSave: 0,
  fnp: 0,
  fnpMortal: 0,
  rerollSaveOnes: false,
  minusOneToHit: false,
  minusOneToWound: false,
  minusOneToWoundIfStronger: false,
  halfDamage: false,
  minusOneDamage: false,
  damageOne: false,
  benefitOfCover: false,
  minusOneAp: false,
  ...overrides,
})

const moveItem = (arr, from, to) => {
  if (to < 0 || to >= arr.length) return arr
  const next = arr.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

const omitId = (entry = {}) => {
  const next = { ...entry }
  delete next.id
  return next
}
const rehydrateWeapon = (entry = {}) =>
  normalizeWeaponProfileRerolls(makeWeapon(omitId(entry)))
const rehydrateTarget = (entry = {}) => makeTarget(omitId(entry))
const stripId = (entry = {}) => omitId(entry)

const rehydrateUnitBuffs = (entry) => makeUnitBuffs(entry || {})
const rehydrateTargetUnitBuffs = (entry) => makeTargetUnitBuffs(entry || {})

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

function AttackSimulatorV2() {
  const [weapons, setWeapons] = useState(() => [
    makeWeapon({ name: 'Weapon 1' }),
  ])
  const [targets, setTargets] = useState(() => [
    makeTarget({ name: 'Profile 1' }),
  ])
  const [unitBuffs, setUnitBuffs] = useState(() => rehydrateUnitBuffs())
  const [defenderUnitBuffs, setDefenderUnitBuffs] = useState(() =>
    rehydrateTargetUnitBuffs()
  )
  const [highPrecision, setHighPrecision] = useState(false)
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const [savedWeaponSets, setSavedWeaponSets] = useState(() => listSavedWeaponSets())
  const [selectedWeaponSet, setSelectedWeaponSet] = useState('')
  const [savedTargetSets, setSavedTargetSets] = useState(() => listSavedTargetSets())
  const [selectedTargetSet, setSelectedTargetSet] = useState('')

  useEffect(() => {
    if (!toast) return
    const handle = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(handle)
  }, [toast])

  const nextDefaultName = (list, prefix) => {
    const used = new Set(list.map((it) => it.name))
    for (let i = 1; i <= list.length + 1; i++) {
      const candidate = `${prefix} ${i}`
      if (!used.has(candidate)) return candidate
    }
    return `${prefix} ${list.length + 1}`
  }

  const invalidateResult = () => {
    setResult(null)
    setError(null)
  }

  // ---- weapon mutators ----
  const updateWeapon = (i, next) =>
    setWeapons((ws) =>
      ws.map((w, idx) =>
        idx === i ? normalizeWeaponProfileRerolls(next) : w
      )
    )
  const addWeapon = () => {
    const fresh = makeWeapon({ name: nextDefaultName(weapons, 'Weapon') })
    setWeapons((ws) => [...ws, fresh])
    invalidateResult()
  }
  const removeWeapon = (i) => {
    setWeapons((ws) => (ws.length === 1 ? ws : ws.filter((_, idx) => idx !== i)))
    invalidateResult()
  }
  const moveWeapon = (i, dir) => {
    setWeapons((ws) => moveItem(ws, i, i + dir))
    invalidateResult()
  }
  const dupWeapon = (i) => {
    setWeapons((ws) => {
      const copy = { ...ws[i], id: uid(), name: ws[i].name ? `${ws[i].name} (copy)` : '' }
      const next = ws.slice()
      next.splice(i + 1, 0, copy)
      return next
    })
    invalidateResult()
  }

  // ---- target mutators ----
  const updateTarget = (i, next) =>
    setTargets((ts) => ts.map((t, idx) => (idx === i ? next : t)))
  const addTarget = () => {
    setTargets((ts) => [...ts, makeTarget({ name: nextDefaultName(ts, 'Profile') })])
    invalidateResult()
  }
  const removeTarget = (i) => {
    setTargets((ts) => (ts.length === 1 ? ts : ts.filter((_, idx) => idx !== i)))
    invalidateResult()
  }
  const moveTarget = (i, dir) => {
    setTargets((ts) => moveItem(ts, i, i + dir))
    invalidateResult()
  }
  const dupTarget = (i) => {
    setTargets((ts) => {
      const copy = { ...ts[i], id: uid(), name: ts[i].name ? `${ts[i].name} (copy)` : '' }
      const next = ts.slice()
      next.splice(i + 1, 0, copy)
      return next
    })
    invalidateResult()
  }

  // ---- unit-buff updates ----
  const updateUnitBuffs = (next) => {
    setUnitBuffs(next)
    invalidateResult()
  }
  const updateDefenderUnitBuffs = (next) => {
    setDefenderUnitBuffs(next)
    invalidateResult()
  }

  // ---- attacker profile sets (weapons + unit buffs) ----
  const refreshWeaponSets = () => setSavedWeaponSets(listSavedWeaponSets())

  const handleSaveWeaponSet = () => {
    const suggested = selectedWeaponSet || ''
    const name = window.prompt('Save attacker profile as:', suggested)
    if (name === null) return
    const trimmed = name.trim()
    if (!trimmed) {
      setToast({ kind: 'error', message: 'Name cannot be empty.' })
      return
    }
    if (savedWeaponSets.includes(trimmed) && trimmed !== selectedWeaponSet) {
      if (!window.confirm(`Attacker profile "${trimmed}" already exists. Overwrite?`)) return
    }
    let ok
    try {
      ok = saveNamedWeaponSet(trimmed, {
        weapons: weapons.map(stripId),
        unitBuffs,
      })
    } catch (err) {
      if (err instanceof StorageQuotaError) {
        setToast({ kind: 'error', message: 'Browser storage is full. Delete some saved profiles and try again.' })
        return
      }
      throw err
    }
    if (ok) {
      refreshWeaponSets()
      setSelectedWeaponSet(trimmed)
      setToast({ kind: 'success', message: `Saved attacker profile "${trimmed}".` })
    }
  }

  const handleLoadWeaponSet = (name) => {
    setSelectedWeaponSet(name)
    if (!name) return
    const data = loadNamedWeaponSet(name)
    if (!data || !Array.isArray(data.weapons) || data.weapons.length === 0) {
      setToast({ kind: 'error', message: `Could not load attacker profile "${name}".` })
      return
    }
    for (let i = 0; i < data.weapons.length; i++) {
      const err = validateWeaponShape(data.weapons[i])
      if (err) {
        setToast({ kind: 'error', message: `Invalid attacker profile: weapons[${i}] ${err}.` })
        return
      }
    }
    setWeapons(data.weapons.map(rehydrateWeapon))
    setUnitBuffs(rehydrateUnitBuffs(data.unitBuffs))
    setResult(null)
    setError(null)
    setToast({ kind: 'success', message: `Loaded attacker profile "${name}".` })
  }

  const handleDeleteWeaponSet = () => {
    if (!selectedWeaponSet) return
    if (!window.confirm(`Delete saved attacker profile "${selectedWeaponSet}"?`)) return
    deleteNamedWeaponSet(selectedWeaponSet)
    setSelectedWeaponSet('')
    refreshWeaponSets()
    setToast({ kind: 'success', message: `Deleted attacker profile "${selectedWeaponSet}".` })
  }

  // ---- defender profile sets ----
  const refreshTargetSets = () => setSavedTargetSets(listSavedTargetSets())

  const handleSaveTargetSet = () => {
    const suggested = selectedTargetSet || ''
    const name = window.prompt('Save defender profile as:', suggested)
    if (name === null) return
    const trimmed = name.trim()
    if (!trimmed) {
      setToast({ kind: 'error', message: 'Name cannot be empty.' })
      return
    }
    if (savedTargetSets.includes(trimmed) && trimmed !== selectedTargetSet) {
      if (!window.confirm(`Defender profile "${trimmed}" already exists. Overwrite?`)) return
    }
    let ok
    try {
      ok = saveNamedTargetSet(trimmed, {
        targets: targets.map(stripId),
        defenderUnitBuffs,
      })
    } catch (err) {
      if (err instanceof StorageQuotaError) {
        setToast({ kind: 'error', message: 'Browser storage is full. Delete some saved profiles and try again.' })
        return
      }
      throw err
    }
    if (ok) {
      refreshTargetSets()
      setSelectedTargetSet(trimmed)
      setToast({ kind: 'success', message: `Saved defender profile "${trimmed}".` })
    }
  }

  const handleLoadTargetSet = (name) => {
    setSelectedTargetSet(name)
    if (!name) return
    const data = loadNamedTargetSet(name)
    if (!data || !Array.isArray(data.targets) || data.targets.length === 0) {
      setToast({ kind: 'error', message: `Could not load defender profile "${name}".` })
      return
    }
    for (let i = 0; i < data.targets.length; i++) {
      const err = validateTargetShape(data.targets[i])
      if (err) {
        setToast({ kind: 'error', message: `Invalid defender profile: targets[${i}] ${err}.` })
        return
      }
    }
    setTargets(data.targets.map(rehydrateTarget))
    setDefenderUnitBuffs(rehydrateTargetUnitBuffs(data.defenderUnitBuffs))
    setResult(null)
    setError(null)
    setToast({ kind: 'success', message: `Loaded defender profile "${name}".` })
  }

  const handleDeleteTargetSet = () => {
    if (!selectedTargetSet) return
    if (!window.confirm(`Delete saved defender profile "${selectedTargetSet}"?`)) return
    deleteNamedTargetSet(selectedTargetSet)
    setSelectedTargetSet('')
    refreshTargetSets()
    setToast({ kind: 'success', message: `Deleted defender profile "${selectedTargetSet}".` })
  }

  const handleExportWeaponLibrary = () => {
    try {
      const profiles = getSavedWeaponSetLibrary()
      const count = Object.keys(profiles).length
      if (count === 0) throw new Error('no saved attacker profiles')
      downloadJson(
        buildAttackerProfileLibraryExport(profiles),
        'attack-sim-attacker-profiles'
      )
      setToast({
        kind: 'success',
        message: `Exported ${count} attacker ${count === 1 ? 'profile' : 'profiles'}.`,
      })
    } catch (err) {
      setToast({
        kind: 'error',
        message: `Attacker profile export failed: ${err.message || 'unknown error'}.`,
      })
    }
  }

  const handleExportTargetLibrary = () => {
    try {
      const profiles = getSavedTargetSetLibrary()
      const count = Object.keys(profiles).length
      if (count === 0) throw new Error('no saved defender profiles')
      downloadJson(
        buildDefenderProfileLibraryExport(profiles),
        'attack-sim-defender-profiles'
      )
      setToast({
        kind: 'success',
        message: `Exported ${count} defender ${count === 1 ? 'profile' : 'profiles'}.`,
      })
    } catch (err) {
      setToast({
        kind: 'error',
        message: `Defender profile export failed: ${err.message || 'unknown error'}.`,
      })
    }
  }

  const handleImportProfileLibrary = async (
    event,
    parseLibrary,
    mergeLibrary,
    refreshLibrary,
    side
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      let data
      try { data = JSON.parse(text) } catch { throw new Error('not valid JSON') }
      const profiles = parseLibrary(data)
      const importedCount = Object.keys(profiles).length
      const stored = mergeLibrary(profiles)
      if (!stored) throw new Error('browser storage is unavailable')
      refreshLibrary()
      setToast({
        kind: 'success',
        message: `Imported ${importedCount} ${side} ${importedCount === 1 ? 'profile' : 'profiles'}.`,
      })
    } catch (err) {
      const message =
        err instanceof StorageQuotaError
          ? 'Browser storage is full. Delete some saved profiles and try again.'
          : `${side[0].toUpperCase()}${side.slice(1)} profile import failed: ${err.message || 'invalid file'}.`
      setToast({ kind: 'error', message })
    }
  }

  const handleImportWeaponLibrary = (event) =>
    handleImportProfileLibrary(
      event,
      parseAttackerProfileLibrary,
      mergeSavedWeaponSetLibrary,
      refreshWeaponSets,
      'attacker'
    )

  const handleImportTargetLibrary = (event) =>
    handleImportProfileLibrary(
      event,
      parseDefenderProfileLibrary,
      mergeSavedTargetSetLibrary,
      refreshTargetSets,
      'defender'
    )

  // ---- run ----
  const handleRun = (e) => {
    e?.preventDefault?.()
    setError(null)
    for (const w of weapons) {
      if (!isValidDiceExpression(w.attacks)) {
        setError(`Weapon "${w.name || 'unnamed'}" has invalid Attacks "${w.attacks}".`)
        return
      }
      if (!isValidDiceExpression(w.damage)) {
        setError(`Weapon "${w.name || 'unnamed'}" has invalid Damage "${w.damage}".`)
        return
      }
    }
    if (targets.length === 0) {
      setError('Add at least one target profile.')
      return
    }
    setRunning(true)
    const iterations = highPrecision ? 10000 : 1000
    // Merge unit-wide buffs into each weapon profile before simulation.
    // The merge takes the best of weapon-level vs unit-level for every buff,
    // so a weapon's intrinsic SUSTAINED 1 plus a unit-granted SUSTAINED 2
    // resolves as SUSTAINED 2 (not 1+2=3) — see lib/dice/unitBuffMerge.js.
    const effectiveWeapons = weapons.map((w) => mergeWeaponWithUnit(w, unitBuffs))
    const effectiveTargets = targets.map((tg) => mergeTargetWithUnit(tg, defenderUnitBuffs))
    setTimeout(() => {
      try {
        const res = simulateAttack(effectiveWeapons, effectiveTargets, iterations)
        setResult({ ...res, calculationId: Date.now() })
      } catch (err) {
        setError(err.message || 'Simulation failed.')
      } finally {
        setRunning(false)
      }
    }, 0)
  }

  const { t, lang, setLang } = useT()

  const handleCopyReport = async () => {
    if (!result) return
    const text = buildAttackSimV2Report(
      weapons,
      targets,
      unitBuffs,
      defenderUnitBuffs,
      result,
      t
    )
    try {
      await navigator.clipboard.writeText(text)
      setToast({ kind: 'success', message: t('reportCopied') })
    } catch {
      try { window.prompt(t('reportCopied'), text) }
      catch { setToast({ kind: 'error', message: t('reportCopyFailed') }) }
    }
  }

  // Per-weapon / per-target highlight: which intrinsic buffs got upgraded by the unit layer.
  const perWeaponUpgrades = weapons.map((w) => describeUpgrades(w, unitBuffs))
  const perTargetUpgrades = targets.map((tg) => describeTargetUpgrades(tg, defenderUnitBuffs))

  return (
    <Page
      title={
        <span className="attack-sim-title">
          {t('pageTitle')}
          <span
            className="attack-sim-edition-badge"
            title={t('editionTooltip')}
            aria-label={t('editionTooltip')}
          >
            11E
          </span>
        </span>
      }
      actions={
        <div className="toolbar-group lang-toggle-group" role="group" aria-label="Language">
          <button
            type="button"
            className={`lang-toggle-btn ${lang === 'en' ? 'active' : ''}`}
            onClick={() => setLang('en')}
          >
            EN
          </button>
          <button
            type="button"
            className={`lang-toggle-btn ${lang === 'zh' ? 'active' : ''}`}
            onClick={() => setLang('zh')}
          >
            中文
          </button>
        </div>
      }
    >
      {toast && (
        <div className="attack-sim-toast-row">
          <span className={`toolbar-toast toolbar-toast--${toast.kind}`}>{toast.message}</span>
        </div>
      )}

      <form onSubmit={handleRun} className="attack-sim-form">
        <section className="attack-sim-section">
          <header className="attack-sim-section-header">
            <h2>{t('attackerSection')}</h2>
          </header>
          <SavedSetControls
            value={selectedWeaponSet}
            options={savedWeaponSets}
            placeholder={t('savedAttackerSets')}
            onChange={handleLoadWeaponSet}
            onSave={handleSaveWeaponSet}
            saveLabel={t('saveProfile')}
            onDelete={handleDeleteWeaponSet}
            deleteDisabled={!selectedWeaponSet}
            deleteTitle={selectedWeaponSet ? `Delete "${selectedWeaponSet}"` : 'Select a saved attacker profile to delete'}
            groupAriaLabel="Saved attacker profiles"
            selectAriaLabel="Load saved attacker profile"
            deleteAriaLabel="Delete selected attacker profile"
            onImportFile={handleImportWeaponLibrary}
            importLabel={t('import')}
            importTitle="Import and merge an attacker profile library"
            onExport={handleExportWeaponLibrary}
            exportLabel={t('export')}
            exportTitle={
              savedWeaponSets.length
                ? 'Export all saved attacker profiles'
                : 'Save an attacker profile before exporting'
            }
            exportDisabled={savedWeaponSets.length === 0}
          />

          <section className="attack-sim-unit-group">
            <header className="attack-sim-unit-group-header">
              <h3>{t('unitBuffsSection')}</h3>
            </header>
            <UnitBuffsPanel value={unitBuffs} onChange={updateUnitBuffs} />

            <div className="attack-sim-unit-group-divider" aria-hidden="true" />

            <div className="profile-list">
              {weapons.map((w, i) => (
                <WeaponProfileCardV2
                  key={w.id}
                  profile={w}
                  index={i}
                  total={weapons.length}
                  upgrades={perWeaponUpgrades[i]}
                  unitBuffs={unitBuffs}
                  onChange={(next) => updateWeapon(i, next)}
                  onRemove={() => removeWeapon(i)}
                  onMoveUp={() => moveWeapon(i, -1)}
                  onMoveDown={() => moveWeapon(i, +1)}
                  onDuplicate={() => dupWeapon(i)}
                />
              ))}
              <button
                type="button"
                className="add-profile-tile"
                onClick={addWeapon}
              >
                {t('addProfile')}
              </button>
            </div>
          </section>
        </section>

        <section className="attack-sim-section">
          <header className="attack-sim-section-header">
            <h2>{t('defenderSection')}</h2>
          </header>
          <SavedSetControls
            value={selectedTargetSet}
            options={savedTargetSets}
            placeholder={t('savedDefenderSets')}
            onChange={handleLoadTargetSet}
            onSave={handleSaveTargetSet}
            saveLabel={t('saveProfile')}
            onDelete={handleDeleteTargetSet}
            deleteDisabled={!selectedTargetSet}
            deleteTitle={selectedTargetSet ? `Delete "${selectedTargetSet}"` : 'Select a saved defender profile to delete'}
            groupAriaLabel="Saved defender profiles"
            selectAriaLabel="Load saved defender profile"
            deleteAriaLabel="Delete selected defender profile"
            onImportFile={handleImportTargetLibrary}
            importLabel={t('import')}
            importTitle="Import and merge a defender profile library"
            onExport={handleExportTargetLibrary}
            exportLabel={t('export')}
            exportTitle={
              savedTargetSets.length
                ? 'Export all saved defender profiles'
                : 'Save a defender profile before exporting'
            }
            exportDisabled={savedTargetSets.length === 0}
          />

          <section className="attack-sim-unit-group">
            <header className="attack-sim-unit-group-header">
              <h3>{t('unitBuffsSection')}</h3>
            </header>
            <DefenderUnitBuffsPanel
              value={defenderUnitBuffs}
              onChange={updateDefenderUnitBuffs}
            />

            <div className="attack-sim-unit-group-divider" aria-hidden="true" />

            <div className="profile-list">
              {targets.map((tg, i) => (
                <TargetProfileCardV2
                  key={tg.id}
                  profile={tg}
                  index={i}
                  total={targets.length}
                  upgrades={perTargetUpgrades[i]}
                  onChange={(next) => updateTarget(i, next)}
                  onRemove={() => removeTarget(i)}
                  onMoveUp={() => moveTarget(i, -1)}
                  onMoveDown={() => moveTarget(i, +1)}
                  onDuplicate={() => dupTarget(i)}
                />
              ))}
              <button
                type="button"
                className="add-profile-tile"
                onClick={addTarget}
              >
                {t('addProfile')}
              </button>
            </div>
          </section>
        </section>

        {error && <div className="attack-sim-error">{error}</div>}

        <div className="run-row">
          <button type="submit" className="calculate-button" disabled={running}>
            {running ? t('simulating') : t('runSim')}
          </button>
          <label className="precision-toggle">
            <input
              type="checkbox"
              checked={highPrecision}
              onChange={(e) => setHighPrecision(e.target.checked)}
            />
            <span className="precision-toggle-track">
              <span className="precision-toggle-thumb" />
            </span>
            <span className="precision-toggle-label">
              {t('highPrecision')}
              <span className="precision-toggle-hint">
                {t('iterations', highPrecision ? '10,000' : '1,000')}
              </span>
            </span>
          </label>
        </div>
      </form>

      {result && (
        <section className="attack-sim-results">
          <header className="attack-sim-section-header">
            <h2>{t('results')}</h2>
            <button
              type="button"
              className="add-button add-button--with-icon"
              onClick={handleCopyReport}
              title={t('copyReport')}
            >
              <ClipboardCopy size={14} />
              <span>{t('copyReport')}</span>
            </button>
          </header>
          <StatGrid>
            {!(targets.length === 1 && targets[0].models === 1) && (
              <StatCard
                label={t('expectedModelsKilled')}
                value={result.expectedKills.toFixed(2)}
                stdDev={result.expectedKillsStdDev.toFixed(2)}
                ciLow={result.expectedKillsCILow.toFixed(2)}
                ciHigh={result.expectedKillsCIHigh.toFixed(2)}
              />
            )}
            {targets.length === 1 && targets[0].models === 1 && (
              <StatCard
                label={t('expectedDamageDealt')}
                value={result.expectedDamage.toFixed(2)}
                stdDev={result.expectedDamageStdDev.toFixed(2)}
                ciLow={result.expectedDamageCILow.toFixed(2)}
                ciHigh={result.expectedDamageCIHigh.toFixed(2)}
              />
            )}
            <StatCard
              label={t('chanceToWipe')}
              value={result.wipeProbability.toFixed(2)}
              valueSuffix="%"
              stdDev={result.wipeProbabilityStdDev.toFixed(2)}
              ciLow={result.wipeProbabilityCILow.toFixed(2)}
              ciHigh={result.wipeProbabilityCIHigh.toFixed(2)}
              ciSuffix="%"
            />
          </StatGrid>

          {result.perProfile.length > 1 && (
            <div className="per-profile-table chart-container">
              <h2>{t('perProfileBreakdown')}</h2>
              <table>
                <thead>
                  <tr>
                    <th>{t('thProfile')}</th>
                    <th>{t('thModels')}</th>
                    <th>{t('thExpectedKills')}</th>
                    <th>{t('thStdDev')}</th>
                    <th>{t('thWipePercent')}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.perProfile.map((p) => (
                    <tr key={p.name}>
                      <td>{p.name}</td>
                      <td>{p.models}</td>
                      <td>{p.expectedKills.toFixed(2)}</td>
                      <td>±{p.stdDev.toFixed(2)}</td>
                      <td>{p.wipeProbability.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <DistributionChart
            title={t('totalModelsKilledDist')}
            data={result.distributionData}
            xKey="kills"
            chartKey={result.calculationId}
            footer={
              <p className="simulation-note">
                {t('simulationNote', result.numSimulations.toLocaleString())}
              </p>
            }
          />
        </section>
      )}
    </Page>
  )
}

function AttackSimulatorV2WithLang() {
  return (
    <LangProvider>
      <AttackSimulatorV2 />
    </LangProvider>
  )
}

export default AttackSimulatorV2WithLang

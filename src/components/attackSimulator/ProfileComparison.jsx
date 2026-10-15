import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import {
  getSavedTargetSetLibrary,
  getSavedWeaponSetLibrary,
} from '../../lib/attackSimStorage'
import { compareAttackerProfiles } from '../../lib/attackSimComparison'
import { TACTICAL_LINE_COLORS } from '../../lib/colors'
import { makeTargetUnitBuffs, makeUnitBuffs } from '../../lib/dice'
import { useT } from '../attackSim/lang'
import DefenderUnitBuffsPanel from './DefenderUnitBuffsPanel'
import UnitBuffsPanel from './UnitBuffsPanel'
import {
  AttackerProfilePreview,
  DefenderProfilePreview,
} from './ProfilePreview'

const attackerColors = TACTICAL_LINE_COLORS.slice(0, 4).map(({ value }) => value)

export default function ProfileComparison() {
  const { t } = useT()
  const [attackerLibrary] = useState(() => getSavedWeaponSetLibrary())
  const [defenderLibrary] = useState(() => getSavedTargetSetLibrary())
  const attackerNames = Object.keys(attackerLibrary).sort((a, b) =>
    a.localeCompare(b)
  )
  const defenderNames = Object.keys(defenderLibrary).sort((a, b) =>
    a.localeCompare(b)
  )
  const [defenderName, setDefenderName] = useState('')
  const [defenderUnitBuffs, setDefenderUnitBuffs] = useState(() => makeTargetUnitBuffs())
  const [attackerSlots, setAttackerSlots] = useState(() =>
    attackerColors.slice(0, 2).map((color) => ({
      name: '',
      color,
      unitBuffs: makeUnitBuffs(),
    }))
  )
  const [highPrecision, setHighPrecision] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)

  const configuredAttackers = attackerSlots.map((slot, index) => ({
    ...slot,
    slotNumber: index + 1,
    profile: slot.name
      ? { ...attackerLibrary[slot.name], unitBuffs: slot.unitBuffs }
      : null,
  }))
  const selectedAttackers = configuredAttackers.filter(({ name }) => name)
  const configuredDefender = defenderName
    ? { ...defenderLibrary[defenderName], defenderUnitBuffs }
    : null

  const invalidate = () => {
    setResults(null)
    setError(null)
  }

  const updateAttacker = (color, name) => {
    const unitBuffs = makeUnitBuffs(attackerLibrary[name]?.unitBuffs || {})
    setAttackerSlots((current) =>
      current.map((slot) =>
        slot.color === color ? { ...slot, name, unitBuffs } : slot
      )
    )
    invalidate()
  }

  const updateAttackerUnitBuffs = (color, unitBuffs) => {
    if (running) return
    setAttackerSlots((current) =>
      current.map((slot) =>
        slot.color === color ? { ...slot, unitBuffs } : slot
      )
    )
    invalidate()
  }

  const addAttacker = () => {
    if (attackerSlots.length >= attackerColors.length) return
    const color = attackerColors.find(
      (value) => !attackerSlots.some((slot) => slot.color === value)
    )
    setAttackerSlots((current) => [
      ...current,
      { name: '', color, unitBuffs: makeUnitBuffs() },
    ])
    invalidate()
  }

  const removeAttacker = (color) => {
    if (attackerSlots.length <= 2) return
    setAttackerSlots((current) =>
      current.filter((slot) => slot.color !== color)
    )
    invalidate()
  }

  const handleRun = () => {
    if (!defenderName) {
      setError('Choose a defender Profile.')
      return
    }
    if (selectedAttackers.length < 2) {
      setError('Choose at least two attacker Profiles.')
      return
    }

    setRunning(true)
    setError(null)
    setTimeout(() => {
      try {
        const compared = compareAttackerProfiles(
          selectedAttackers,
          configuredDefender,
          highPrecision ? 10000 : 1000
        )
        setResults(
          compared
            .map((entry, index) => ({
              ...entry,
              color: selectedAttackers[index].color,
              slotNumber: selectedAttackers[index].slotNumber,
            }))
            .sort(
              (left, right) =>
                right.result.expectedKills - left.result.expectedKills ||
                right.result.wipeProbability - left.result.wipeProbability
            )
        )
      } catch (comparisonError) {
        setError(comparisonError.message || 'Comparison failed.')
      } finally {
        setRunning(false)
      }
    }, 0)
  }

  const canCompare = defenderName && selectedAttackers.length >= 2

  return (
    <section className="profile-comparison-page">
      <header className="attack-sim-section-header profile-page-heading">
        <h2>{t('comparison')}</h2>
        <Link className="toolbar-button profile-page-link" to="/attack-simulator/profiles">
          {t('manageProfiles')}
        </Link>
      </header>

      {(attackerNames.length === 0 || defenderNames.length === 0) && (
        <div className="profile-comparison-empty">
          <strong>{t('comparisonNeedsProfiles')}</strong>
          <span>{t('comparisonNeedsProfilesHint')}</span>
          <Link to="/attack-simulator/profiles">{t('manageProfiles')}</Link>
        </div>
      )}

      <section className="comparison-selector-section">
        <header>
          <h3>{t('selectDefender')}</h3>
        </header>
        <select
          className="toolbar-select comparison-select"
          value={defenderName}
          aria-label={t('selectDefender')}
          disabled={running}
          onChange={(event) => {
            const name = event.target.value
            setDefenderName(name)
            setDefenderUnitBuffs(
              makeTargetUnitBuffs(defenderLibrary[name]?.defenderUnitBuffs || {})
            )
            invalidate()
          }}
        >
          <option value="">{t('selectDefender')}</option>
          {defenderNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        {configuredDefender && (
          <>
            <details className="comparison-unit-buffs">
              <summary>{t('unitBuffsSection')}</summary>
              <fieldset disabled={running} aria-label={t('unitBuffsSection')}>
                <DefenderUnitBuffsPanel
                  value={defenderUnitBuffs}
                  onChange={(next) => {
                    if (running) return
                    setDefenderUnitBuffs(next)
                    invalidate()
                  }}
                />
              </fieldset>
            </details>
            <DefenderProfilePreview
              key={defenderName}
              name={defenderName}
              profile={configuredDefender}
            />
          </>
        )}
      </section>

      <section className="comparison-selector-section">
        <header className="comparison-attacker-heading">
          <h3>{t('attackersToCompare')}</h3>
          <span>{attackerSlots.length} / {attackerColors.length}</span>
        </header>
        <div className="comparison-attacker-grid">
          {configuredAttackers.map(({ name, color, profile, unitBuffs, slotNumber }) => (
            <div
              className="comparison-attacker-slot"
              key={color}
              style={{ '--attacker-color': color }}
            >
              <h4 className="comparison-slot-label">{t('attackerNumber', slotNumber)}</h4>
              <div className="comparison-slot-toolbar">
                <span
                  className="comparison-color-dot"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <select
                  className="toolbar-select comparison-select"
                  value={name}
                  disabled={running}
                  onChange={(event) =>
                    updateAttacker(color, event.target.value)
                  }
                  aria-label={`${t('selectAttacker')} ${slotNumber}`}
                >
                  <option value="">
                    {t('selectAttacker')} {slotNumber}
                  </option>
                  {attackerNames.map((option) => (
                    <option
                      key={option}
                      value={option}
                    >
                      {option}
                    </option>
                  ))}
                </select>
                {attackerSlots.length > 2 && (
                  <button
                    type="button"
                    className="comparison-remove-button"
                    onClick={() => removeAttacker(color)}
                    disabled={running}
                    aria-label={t('removeAttacker', slotNumber)}
                    title={t('removeAttacker', slotNumber)}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
              {profile ? (
                <>
                  <details className="comparison-unit-buffs">
                    <summary>{t('unitBuffsSection')}</summary>
                    <fieldset disabled={running} aria-label={t('unitBuffsSection')}>
                      <UnitBuffsPanel
                        value={unitBuffs}
                        onChange={(next) => updateAttackerUnitBuffs(color, next)}
                        disabled={running}
                      />
                    </fieldset>
                  </details>
                  <AttackerProfilePreview
                    key={name}
                    name={name}
                    profile={profile}
                  />
                </>
              ) : (
                <div className="comparison-slot-empty">
                  {t('selectAttacker')}
                </div>
              )}
            </div>
          ))}
        </div>
        {attackerSlots.length < attackerColors.length && (
          <button
            type="button"
            className="add-profile-tile comparison-add-attacker"
            onClick={addAttacker}
            disabled={running}
          >
            <Plus size={15} />
            {t('addAttacker')}
          </button>
        )}
      </section>

      {error && <div className="attack-sim-error" role="alert">{error}</div>}

      <div className="run-row comparison-run-row">
        <button
          type="button"
          className="calculate-button"
          onClick={handleRun}
          disabled={!canCompare || running}
        >
          {running ? t('comparing') : t('runComparison')}
        </button>
        <label className="precision-toggle">
          <input
            type="checkbox"
            checked={highPrecision}
            disabled={running}
            onChange={(event) => {
              setHighPrecision(event.target.checked)
              invalidate()
            }}
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

      {results && <ComparisonResults results={results} />}
    </section>
  )
}

export function ComparisonResults({ results }) {
  const { t } = useT()
  const resultsRef = useRef(null)
  const bestKills = results[0].result.expectedKills

  useEffect(() => {
    if (window.matchMedia('(max-width: 768px)').matches) {
      resultsRef.current?.scrollIntoView({
        block: 'start',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      })
    }
  }, [results])

  return (
    <section
      className="comparison-results"
      ref={resultsRef}
      aria-label={t('comparisonResults')}
    >
      <header className="attack-sim-section-header">
        <h2>{t('comparisonResults')}</h2>
      </header>
      <div className="comparison-table-wrap">
        <table className="comparison-table" role="table">
          <thead role="rowgroup">
            <tr role="row">
              <th scope="col" role="columnheader">#</th>
              <th scope="col" role="columnheader">{t('reportAttacker')}</th>
              <th scope="col" role="columnheader">{t('expectedModelsKilled')}</th>
              <th scope="col" role="columnheader">{t('expectedDamageDealt')}</th>
              <th scope="col" role="columnheader">{t('chanceToWipe')}</th>
              <th scope="col" role="columnheader">{t('vsBest')}</th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {results.map(({ name, color, result, slotNumber }, index) => {
              const delta = bestKills > 0
                ? ((result.expectedKills - bestKills) / bestKills) * 100
                : 0
              return (
                <tr key={color} role="row" style={{ '--attacker-color': color }}>
                  <td role="cell" className="comparison-rank">{index + 1}</td>
                  <th scope="row" role="rowheader" className="comparison-result-name">
                    <span
                      className="comparison-color-dot"
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    />
                    {name}
                    <span className="comparison-result-variant">
                      {t('attackerNumber', slotNumber)}
                    </span>
                  </th>
                  <td role="cell" data-label={t('expectedModelsKilled')}>
                    <span className="comparison-metric-value">
                      <strong>{result.expectedKills.toFixed(2)}</strong>
                      <small>
                        95% CI {result.expectedKillsCILow.toFixed(2)}–
                        {result.expectedKillsCIHigh.toFixed(2)}
                      </small>
                    </span>
                  </td>
                  <td role="cell" data-label={t('expectedDamageDealt')}>
                    <span className="comparison-metric-value">{result.expectedDamage.toFixed(2)}</span>
                  </td>
                  <td role="cell" data-label={t('chanceToWipe')}>
                    <span className="comparison-metric-value">{result.wipeProbability.toFixed(1)}%</span>
                  </td>
                  <td role="cell" data-label={t('vsBest')}>
                    <span className="comparison-metric-value">{index === 0 ? '—' : `${delta.toFixed(1)}%`}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="comparison-bars">
        <h3>{t('expectedModelsKilled')}</h3>
        {results.map(({ name, color, result, slotNumber }) => (
          <div className="comparison-bar-row" key={color}>
            <span>{t('attackerNumber', slotNumber)} · {name}</span>
            <div className="comparison-bar-track" aria-hidden="true">
              <div
                className="comparison-bar-fill"
                style={{
                  width: `${bestKills > 0 ? (result.expectedKills / bestKills) * 100 : 0}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <strong>{result.expectedKills.toFixed(2)}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

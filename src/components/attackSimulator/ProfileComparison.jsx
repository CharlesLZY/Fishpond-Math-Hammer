import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import {
  getSavedTargetSetLibrary,
  getSavedWeaponSetLibrary,
} from '../../lib/attackSimStorage'
import { compareAttackerProfiles } from '../../lib/attackSimComparison'
import { TACTICAL_LINE_COLORS } from '../../lib/colors'
import { useT } from '../attackSim/lang'
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
  const [attackerSlots, setAttackerSlots] = useState(() =>
    attackerColors.slice(0, 2).map((color) => ({ name: '', color }))
  )
  const [highPrecision, setHighPrecision] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)

  const invalidate = () => {
    setResults(null)
    setError(null)
  }

  const updateAttacker = (color, name) => {
    setAttackerSlots((current) =>
      current.map((slot) => (slot.color === color ? { ...slot, name } : slot))
    )
    invalidate()
  }

  const addAttacker = () => {
    if (attackerSlots.length >= attackerColors.length) return
    const color = attackerColors.find(
      (value) => !attackerSlots.some((slot) => slot.color === value)
    )
    setAttackerSlots((current) => [...current, { name: '', color }])
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
    const selectedSlots = attackerSlots.filter(({ name }) => name)
    const selectedNames = selectedSlots.map(({ name }) => name)
    if (!defenderName) {
      setError('Choose a defender Profile.')
      return
    }
    if (selectedNames.length < 2) {
      setError('Choose at least two attacker Profiles.')
      return
    }
    if (new Set(selectedNames).size !== selectedNames.length) {
      setError('Choose different attacker Profiles.')
      return
    }

    setRunning(true)
    setError(null)
    setTimeout(() => {
      try {
        const compared = compareAttackerProfiles(
          selectedNames.map((name) => ({
            name,
            profile: attackerLibrary[name],
          })),
          defenderLibrary[defenderName],
          highPrecision ? 10000 : 1000
        )
        setResults(
          compared
            .map((entry, index) => ({
              ...entry,
              color: selectedSlots[index].color,
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

  const selectedNames = attackerSlots.map(({ name }) => name).filter(Boolean)
  const canCompare =
    defenderName &&
    selectedNames.length >= 2 &&
    new Set(selectedNames).size === selectedNames.length

  return (
    <section className="profile-comparison-page">
      <header className="attack-sim-section-header profile-page-heading">
        <div>
          <h2>{t('comparison')}</h2>
          <p>{t('comparisonDescription')}</p>
        </div>
        <Link className="toolbar-button profile-page-link" to="/attack-simulator/profiles">
          {t('manageProfiles')}
        </Link>
      </header>

      {(attackerNames.length < 2 || defenderNames.length === 0) && (
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
            setDefenderName(event.target.value)
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
        {defenderName && (
          <DefenderProfilePreview
            key={defenderName}
            name={defenderName}
            profile={defenderLibrary[defenderName]}
          />
        )}
      </section>

      <section className="comparison-selector-section">
        <header className="comparison-attacker-heading">
          <h3>{t('attackersToCompare')}</h3>
          <span>{attackerSlots.length} / {attackerColors.length}</span>
        </header>
        <div className="comparison-attacker-grid">
          {attackerSlots.map(({ name, color }, index) => (
            <div
              className="comparison-attacker-slot"
              key={color}
              style={{ '--attacker-color': color }}
            >
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
                  aria-label={`${t('selectAttacker')} ${index + 1}`}
                >
                  <option value="">
                    {t('selectAttacker')} {index + 1}
                  </option>
                  {attackerNames.map((option) => (
                    <option
                      key={option}
                      value={option}
                      disabled={
                        option !== name && selectedNames.includes(option)
                      }
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
                    aria-label={t('removeAttacker', index + 1)}
                    title={t('removeAttacker', index + 1)}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
              {name ? (
                <AttackerProfilePreview
                  key={name}
                  name={name}
                  profile={attackerLibrary[name]}
                />
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
            {results.map(({ name, color, result }, index) => {
              const delta = bestKills > 0
                ? ((result.expectedKills - bestKills) / bestKills) * 100
                : 0
              return (
                <tr key={name} role="row" style={{ '--attacker-color': color }}>
                  <td role="cell" className="comparison-rank">{index + 1}</td>
                  <th scope="row" role="rowheader" className="comparison-result-name">
                    <span
                      className="comparison-color-dot"
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    />
                    {name}
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
        {results.map(({ name, color, result }) => (
          <div className="comparison-bar-row" key={name}>
            <span>{name}</span>
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

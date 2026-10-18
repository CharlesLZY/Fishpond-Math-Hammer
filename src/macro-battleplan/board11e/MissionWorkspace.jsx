import { useState } from 'react'
import { BookOpen, Check, X } from 'lucide-react'
import {
  getMissionPlanTotals,
  MISSION_ROUNDS,
  MISSION_SIDES,
  MISSION_VP_CAP,
  PRIMARY_SCORE_PHASES,
  SECONDARY_MISSION_VP_CAP,
  SECONDARY_MISSIONS,
} from '../config/missionPlanning11e'
import { useBoard11eStore } from '../store/board11eStore'
import { MissionCardDialog, MissionCardImage } from './MissionCardDialog'
import { MissionCardsButton } from './MissionCardsButton'

function PlanOverview({ side, totals }) {
  return (
    <section className="mbp-section mbp-plan-overview" aria-label={`${side.label} plan overview`}>
      <div className="mbp-section__header mbp-plan-overview__heading">
        <span>{side.label}</span>
        <strong>{totals.total}<small> VP</small></strong>
      </div>
      <div className="mbp-plan-overview__metrics">
        <div>
          <span>Primary</span>
          <strong>{totals.primary}<small> / {MISSION_VP_CAP}</small></strong>
        </div>
        <div>
          <span>Secondary</span>
          <strong>{totals.secondary}<small> / {MISSION_VP_CAP}</small></strong>
        </div>
      </div>
      {(totals.primaryRaw > MISSION_VP_CAP || totals.secondaryRaw > MISSION_VP_CAP) && (
        <div className="mbp-plan-warning" role="status">
          {totals.primaryRaw > MISSION_VP_CAP && (
            <span>Primary: {totals.primaryRaw} / {MISSION_VP_CAP} VP</span>
          )}
          {totals.secondaryRaw > MISSION_VP_CAP && (
            <span>Secondary pool: {totals.secondaryRaw} / {MISSION_VP_CAP} VP</span>
          )}
        </div>
      )}
    </section>
  )
}

export function MissionWorkspace({ battleplan, activeSide, onSideChange }) {
  const plan = useBoard11eStore((s) => s.missionPlan)
  const setMissionPlan = useBoard11eStore((s) => s.setMissionPlan)
  const storageError = useBoard11eStore((s) => s.missionPlanStorageError)
  const [viewedMission, setViewedMission] = useState(null)

  if (!battleplan) {
    return <p role="alert">Select a valid battleplan on the Battlefield tab to plan your missions.</p>
  }

  const activeSideInfo = MISSION_SIDES.find((side) => side.id === activeSide)
  const activeTotals = getMissionPlanTotals(plan, activeSide)

  const setPrimaryTarget = (round, phase, raw) => {
    setMissionPlan((current) => ({
      ...current,
      primary: {
        ...current.primary,
        [activeSide]: {
          ...current.primary[activeSide],
          [round]: { ...current.primary[activeSide][round], [phase]: raw },
        },
      },
    }))
  }

  const setSecondary = (missionId, patch) => {
    setMissionPlan((current) => ({
      ...current,
      secondary: {
        ...current.secondary,
        [activeSide]: {
          ...current.secondary[activeSide],
          [missionId]: { ...current.secondary[activeSide][missionId], ...patch },
        },
      },
    }))
  }

  return (
    <div className="mbp-missions" role="region" aria-label="Missions & VP">
      {storageError && <p className="mbp-plan-warning" role="alert">{storageError}</p>}

      <div className="mbp-plan-overviews">
        {MISSION_SIDES.map((side) => (
          <PlanOverview
            key={side.id}
            side={side}
            totals={getMissionPlanTotals(plan, side.id)}
          />
        ))}
      </div>

      <div className="mbp-segmented mbp-plan-side-switch" role="group" aria-label="Mission scoring side">
        {MISSION_SIDES.map((side) => (
          <button
            key={side.id}
            type="button"
            className={`mbp-segmented__btn ${activeSide === side.id ? 'is-active' : ''}`}
            aria-controls="mbp-mission-scores"
            aria-pressed={activeSide === side.id}
            onClick={() => onSideChange(side.id)}
          >
            {side.label}
          </button>
        ))}
      </div>

      <div className="mbp-mission-columns" id="mbp-mission-scores">
        <section className="mbp-section mbp-mission-section" aria-labelledby="mbp-primary-title">
          <header className="mbp-section__header mbp-mission-section__heading">
            <h2 id="mbp-primary-title">Primary missions</h2>
            <MissionCardsButton battleplan={battleplan} />
          </header>
          <table className="mbp-primary-table" aria-label={`${activeSideInfo.label} primary scoring`}>
            <tbody>
              {MISSION_ROUNDS.map((round) => (
                <tr key={round}>
                  <th scope="row">R{round}</th>
                  {PRIMARY_SCORE_PHASES.map((phase) => (
                    <td key={phase.id}>
                      <input
                        type="number"
                        min={0}
                        max={MISSION_VP_CAP}
                        step={1}
                        inputMode="numeric"
                        placeholder="-"
                        aria-label={`${activeSideInfo.label} ${phase.label} VP round ${round}`}
                        value={plan.primary[activeSide][round][phase.id]}
                        onChange={(event) => setPrimaryTarget(round, phase.id, event.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={3}>Primary VP</th>
                <td>
                  <output aria-label={`${activeSideInfo.label} primary VP`}>
                    {activeTotals.primary} / {MISSION_VP_CAP}
                  </output>
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        <section className="mbp-section mbp-mission-section" aria-labelledby="mbp-secondary-title">
          <header className="mbp-section__header mbp-mission-section__heading">
            <h2 id="mbp-secondary-title">Secondary missions</h2>
          </header>

          <div className="mbp-secondary-summary" aria-live="polite" aria-atomic="true">
            <span>
              <strong>{activeTotals.included}</strong> / {SECONDARY_MISSIONS.length} included
              <span className="mbp-secondary-summary__muted">
                {' '}- {activeTotals.excluded} excluded - {activeTotals.unassessed} undecided
              </span>
            </span>
            <span className="mbp-secondary-summary__scores">
              Selected pool <strong>{activeTotals.secondaryRaw}/{MISSION_VP_CAP} VP</strong>
            </span>
          </div>

          <ul className="mbp-secondary-list" aria-label={`${activeSideInfo.label} secondary missions`}>
            {SECONDARY_MISSIONS.map((mission) => {
              const entry = plan.secondary[activeSide][mission.id]
              return (
                <li key={mission.id} className={`mbp-secondary-card is-${entry.status}`}>
                  <button
                    type="button"
                    className="mbp-secondary-card__name"
                    onClick={() => setViewedMission(mission)}
                    aria-label={`View ${mission.name} card`}
                  >
                    <span>{mission.name}</span>
                    <BookOpen size={14} aria-hidden="true" />
                  </button>
                  <div className="mbp-secondary-card__controls">
                    <div className="mbp-secondary-verdict" role="group" aria-label={`${mission.name} planning status`}>
                      <button
                        type="button"
                        className="mbp-chip mbp-secondary-include"
                        aria-label={`Include ${mission.name}`}
                        aria-pressed={entry.status === 'included'}
                        title="Include in plan. Click again to clear."
                        onClick={() => setSecondary(mission.id, {
                          status: entry.status === 'included' ? 'unassessed' : 'included',
                        })}
                      >
                        <Check size={16} />
                      </button>
                      <button
                        type="button"
                        className="mbp-chip mbp-secondary-exclude"
                        aria-label={`Exclude ${mission.name}`}
                        aria-pressed={entry.status === 'excluded'}
                        title="Exclude from plan. Click again to clear."
                        onClick={() => setSecondary(mission.id, {
                          status: entry.status === 'excluded' ? 'unassessed' : 'excluded',
                        })}
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <label className="mbp-secondary-target">
                      <input
                        type="number"
                        min={0}
                        max={SECONDARY_MISSION_VP_CAP}
                        step={1}
                        inputMode="numeric"
                        placeholder="-"
                        aria-label={`${activeSideInfo.label} VP for ${mission.name}`}
                        value={entry.target}
                        disabled={entry.status === 'excluded'}
                        onChange={(event) => setSecondary(mission.id, { target: event.target.value })}
                      />
                      <span>VP</span>
                    </label>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      {viewedMission && (
        <MissionCardDialog title={viewedMission.name} onClose={() => setViewedMission(null)}>
          <div className="mbp11-missions-grid is-mirror">
            <article className="mbp11-mission-card">
              <MissionCardImage
                key={viewedMission.id}
                src={viewedMission.image}
                alt={`${viewedMission.name} secondary mission card`}
                sourceUrl={viewedMission.sourceUrl}
              />
              <a
                className="mbp-mission-source"
                href={viewedMission.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                View source on gdmissions.app
              </a>
            </article>
          </div>
        </MissionCardDialog>
      )}
    </div>
  )
}

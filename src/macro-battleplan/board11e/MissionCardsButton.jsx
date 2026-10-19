import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Repeat2 } from 'lucide-react'
import { getDisposition, getMissionCardImages } from '../config/battleplans11e'
import { MissionCardDialog, MissionCardImage } from './MissionCardDialog'

function MissionCard({ player, disposition, mission }) {
  const [showBack, setShowBack] = useState(false)
  const dispositionInfo = getDisposition(disposition)
  const images = getMissionCardImages(disposition, mission)

  if (!dispositionInfo || !images) return null

  const image = showBack && images.back ? images.back : images.front
  const face = showBack ? 'back' : 'front'

  return (
    <article className="mbp11-mission-card">
      <header className="mbp11-mission-card__header">
        <div className="mbp11-mission-card__meta">
          <span className="mbp11-mission-card__player">{player}</span>
          <span className="mbp11-mission-card__disposition">
            <span
              className="mbp11-mission-card__swatch"
              style={{ backgroundColor: dispositionInfo.color }}
              aria-hidden="true"
            />
            {dispositionInfo.label}
          </span>
          <strong>{mission}</strong>
        </div>
        {images.back && (
          <button
            type="button"
            className="mbp11-mission-card__flip"
            onClick={() => setShowBack((value) => !value)}
            title={`Show ${showBack ? 'front' : 'back'} of ${mission}`}
            aria-label={`Show ${showBack ? 'front' : 'back'} of ${mission}`}
          >
            <Repeat2 size={14} />
          </button>
        )}
      </header>
      <MissionCardImage
        key={image}
        src={image}
        alt={`${mission} ${face}`}
      />
    </article>
  )
}

export function MissionCardsButton({ mission, player }) {
  const [open, setOpen] = useState(false)

  if (!mission) return null

  const dialogTitle = `${player} · ${mission.mission}`

  return (
    <>
      <button
        type="button"
        className="mbp-primary-mission-name"
        onClick={() => setOpen(true)}
        aria-label={`View ${mission.mission} primary mission card`}
      >
        {mission.mission}
      </button>

      {open && createPortal(
        <MissionCardDialog title={dialogTitle} onClose={() => setOpen(false)}>
          <div className="mbp11-missions-grid is-mirror">
            <MissionCard
              key={`${mission.disposition}-${mission.mission}`}
              player={player}
              disposition={mission.disposition}
              mission={mission.mission}
            />
          </div>
        </MissionCardDialog>,
        document.body,
      )}
    </>
  )
}
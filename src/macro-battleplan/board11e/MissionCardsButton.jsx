import { useState } from 'react'
import { BookOpen, Repeat2 } from 'lucide-react'
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

export function MissionCardsButton({ battleplan }) {
  const [open, setOpen] = useState(false)

  if (!battleplan) return null

  const mine = battleplan.mine
  const theirs = battleplan.theirs
  const mirror = mine.disposition === theirs.disposition && mine.mission === theirs.mission
  const mineDisposition = getDisposition(mine.disposition)?.label
  const theirDisposition = getDisposition(theirs.disposition)?.label
  const dialogTitle = `${mineDisposition} vs ${theirDisposition} · Primary Missions`

  return (
    <>
      <button
        type="button"
        className="mbp-chip mbp-primary-cards-button"
        onClick={() => setOpen(true)}
        title="View primary cards"
        aria-label="View primary cards"
      >
        <BookOpen size={16} />
      </button>

      {open && (
        <MissionCardDialog title={dialogTitle} onClose={() => setOpen(false)}>
          <div className={`mbp11-missions-grid ${mirror ? 'is-mirror' : ''}`}>
            <MissionCard
              key={`${mine.disposition}-${mine.mission}`}
              player={mirror ? 'Attacker / Defender' : 'Attacker'}
              disposition={mine.disposition}
              mission={mine.mission}
            />
            {!mirror && (
              <MissionCard
                key={`${theirs.disposition}-${theirs.mission}`}
                player="Defender"
                disposition={theirs.disposition}
                mission={theirs.mission}
              />
            )}
          </div>
        </MissionCardDialog>
      )}
    </>
  )
}
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  FORCE_DISPOSITIONS,
  LAYOUTS,
  findBattleplan,
  getMissionCardImages,
  mapImageUrl,
  mapReferenceUrl,
} from '../battleplans11e'

const publicRoot = fileURLToPath(new URL('../../../../public/', import.meta.url))

const publicAssetExists = (url) => existsSync(fileURLToPath(new URL(`.${url}`, `file:///${publicRoot}/`)))

describe('11e Force Disposition matrix', () => {
  it('versions both map variants to avoid stale cached images', () => {
    const board = new URL(mapImageUrl('map_02'), 'https://example.invalid')
    const reference = new URL(mapReferenceUrl('map_02'), 'https://example.invalid')
    expect(board.pathname).toBe('/battleplans-11e/map_02.webp')
    expect(reference.pathname).toBe('/battleplans-11e/map_02_ref.webp')
    expect(board.searchParams.get('v')).toMatch(/^[a-z0-9-]+$/)
    expect(reference.searchParams.get('v')).toBe(board.searchParams.get('v'))
  })

  it('resolves every directed matchup and all of its map and mission card assets', () => {
    const maps = new Set()
    const fronts = new Set()
    const backs = new Set()

    for (const mine of FORCE_DISPOSITIONS) {
      for (const theirs of FORCE_DISPOSITIONS) {
        for (const layout of LAYOUTS) {
          const battleplan = findBattleplan(mine.id, theirs.id, layout)

          expect(battleplan).not.toBeNull()
          expect(battleplan.mine.disposition).toBe(mine.id)
          expect(battleplan.theirs.disposition).toBe(theirs.id)
          expect(battleplan.layout).toBe(layout)
          expect(publicAssetExists(mapImageUrl(battleplan.map))).toBe(true)
          expect(publicAssetExists(mapReferenceUrl(battleplan.map))).toBe(true)
          maps.add(battleplan.map)

          for (const side of [battleplan.mine, battleplan.theirs]) {
            const images = getMissionCardImages(side.disposition, side.mission)
            expect(images).not.toBeNull()
            expect(publicAssetExists(images.front)).toBe(true)
            fronts.add(images.front)

            if (images.back) {
              expect(publicAssetExists(images.back)).toBe(true)
              backs.add(images.back)
            }
          }
        }
      }
    }

    expect(maps.size).toBe(45)
    expect(fronts.size).toBe(25)
    expect(backs.size).toBe(11)
  })
})
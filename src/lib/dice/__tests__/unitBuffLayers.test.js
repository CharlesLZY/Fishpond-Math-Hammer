import { describe, expect, it } from 'vitest'
import {
  makeTargetUnitBuffs,
  makeUnitBuffs,
  mergeTargetUnitBuffs,
  mergeUnitBuffs,
  mergeWeaponWithUnit,
} from '../unitBuffMerge'

describe('saved and additional unit buff layers', () => {
  it.each(['rerollOneFailedHit', 'rerollOneFailedWound'])(
    'keeps %s alongside general rerolls without stacking duplicate copies',
    (flag) => {
      const saved = Object.freeze(makeUnitBuffs({ [flag]: true }))
      const extra = Object.freeze(makeUnitBuffs({
        [flag]: true,
        hitReroll: 'reroll-one',
        woundReroll: 'reroll-one',
      }))
      const merged = mergeUnitBuffs(saved, extra)

      expect(merged).toEqual(extra)
      expect(mergeUnitBuffs(extra, saved)).toEqual(extra)
      expect(mergeUnitBuffs(saved, makeUnitBuffs())).toEqual(saved)
      expect(saved.hitReroll).toBe('no-reroll')
      expect(mergeWeaponWithUnit({
        hitReroll: 'no-reroll',
        woundReroll: 'no-reroll',
      }, merged)).not.toHaveProperty(flag)
    }
  )

  it.each([
    ['reroll-one', 'reroll-fail'],
    ['reroll-one', 'reroll-one-two'],
    ['reroll-one-two', 'reroll-fail'],
    ['reroll-one', 'reroll-non-critical'],
    ['reroll-fail', 'reroll-non-critical'],
    ['reroll-non-critical', 'reroll-fail'],
  ])('uses the extra %s -> %s reroll without changing the saved layer', (savedMode, extraMode) => {
    const saved = Object.freeze(makeUnitBuffs({ hitReroll: savedMode, woundReroll: savedMode }))
    const extra = Object.freeze(makeUnitBuffs({ hitReroll: extraMode, woundReroll: extraMode }))
    const merged = mergeUnitBuffs(saved, extra)

    expect(merged.hitReroll).toBe(extraMode)
    expect(merged.woundReroll).toBe(extraMode)
    expect(saved.hitReroll).toBe(savedMode)
    expect(extra.hitReroll).toBe(extraMode)
    expect(mergeUnitBuffs(saved, makeUnitBuffs())).toEqual(saved)
    expect(mergeWeaponWithUnit({
      hitReroll: 'no-reroll',
      woundReroll: 'no-reroll',
    }, merged)).toMatchObject({
      hitReroll: extraMode,
      woundReroll: extraMode,
      hitRerollScope: 'all',
      woundRerollScope: 'all',
    })
  })

  it.each([
    ['reroll-one', 'no-reroll'],
    ['reroll-one-two', 'reroll-one'],
    ['reroll-fail', 'reroll-one'],
    ['reroll-fail', 'reroll-one-two'],
    ['reroll-non-critical', 'reroll-one'],
    ['reroll-non-critical', 'reroll-one-two'],
    ['reroll-non-critical', 'no-reroll'],
  ])('retains saved %s when an extra %s cannot improve its coverage', (savedMode, extraMode) => {
    const saved = Object.freeze(makeUnitBuffs({ hitReroll: savedMode, woundReroll: savedMode }))
    const extra = Object.freeze(makeUnitBuffs({ hitReroll: extraMode, woundReroll: extraMode }))

    expect(mergeUnitBuffs(saved, extra)).toEqual(saved)
    expect(extra.hitReroll).toBe(extraMode)
    expect(mergeUnitBuffs(saved, makeUnitBuffs())).toEqual(saved)
  })

  it.each(['reroll-one', 'reroll-one-two', 'reroll-fail', 'reroll-non-critical'])(
    'handles duplicate %s choices and automatically restores saved buffs when cleared',
    (mode) => {
      const saved = Object.freeze(makeUnitBuffs({ hitReroll: mode, woundReroll: mode }))
      expect(mergeUnitBuffs(saved, saved)).toEqual(saved)
      expect(mergeUnitBuffs(saved, null)).toEqual(saved)
      expect(mergeUnitBuffs(saved, undefined)).toEqual(saved)
      expect(mergeUnitBuffs(null, saved)).toEqual(saved)
    }
  )

  it('does not stack duplicate bonuses when combining the two layers', () => {
    const saved = Object.freeze(makeUnitBuffs({
      plusOneAttack: true,
      plusOneDamage: true,
      plusOneAp: true,
      lethalHits: true,
    }))
    const extra = Object.freeze(makeUnitBuffs({
      plusOneAttack: true,
      plusOneDamage: true,
      plusOneAp: true,
      ignoresCover: true,
    }))
    const merged = mergeUnitBuffs(saved, extra)
    const weapon = mergeWeaponWithUnit({ attacks: '4', damage: '2', ap: 1 }, merged)

    expect(weapon).toMatchObject({
      attacks: '5',
      damage: '3',
      ap: 2,
      lethalHits: true,
      ignoresCover: true,
    })
    expect(saved.ignoresCover).toBe(false)
  })

  it('allows improved sustained hits and critical thresholds without weakening saved buffs', () => {
    const saved = makeUnitBuffs({ sustainedHits: '2', critHitEnabled: true, critHit: 5 })
    const stronger = mergeUnitBuffs(saved, {
      sustainedHits: 'D6',
      critHitEnabled: true,
      critHit: 4,
    })
    expect(stronger).toMatchObject({ sustainedHits: 'D6', critHitEnabled: true, critHit: 4 })
    expect(mergeUnitBuffs(saved, {
      sustainedHits: '1',
      critHitEnabled: true,
      critHit: 6,
    })).toMatchObject({ sustainedHits: '2', critHit: 5 })
    expect(mergeUnitBuffs(saved, makeUnitBuffs())).toEqual(saved)
  })

  it('takes the best defensive effects without editing or stacking the source layers', () => {
    const saved = Object.freeze(makeTargetUnitBuffs({
      halfDamage: true,
      minusOneToWoundIfStronger: true,
      benefitOfCover: true,
    }))
    const extra = Object.freeze(makeTargetUnitBuffs({
      damageOne: true,
      minusOneToWound: true,
      minusOneToHit: true,
    }))
    const merged = mergeTargetUnitBuffs(saved, extra)
    expect(merged).toMatchObject({
      halfDamage: false,
      damageOne: true,
      minusOneToWound: true,
      minusOneToWoundIfStronger: false,
      minusOneToHit: true,
      benefitOfCover: true,
    })
    expect(saved.halfDamage).toBe(true)
    expect(saved.minusOneToWoundIfStronger).toBe(true)
    expect(mergeTargetUnitBuffs(saved, makeTargetUnitBuffs())).toEqual(saved)
  })

  it('preserves a stronger saved defense when a weaker extra defense is selected', () => {
    const saved = makeTargetUnitBuffs({ halfDamage: true })
    expect(mergeTargetUnitBuffs(saved, { minusOneDamage: true })).toMatchObject({
      halfDamage: true,
      minusOneDamage: false,
    })
  })

  it('supports empty source layers and independent additions for duplicate Profiles', () => {
    const saved = makeUnitBuffs({ hitReroll: 'reroll-one' })
    const first = mergeUnitBuffs(saved, { plusOneDamage: true })
    const second = mergeUnitBuffs(saved, { hitReroll: 'reroll-fail' })
    expect(first).toMatchObject({ hitReroll: 'reroll-one', plusOneDamage: true })
    expect(second).toMatchObject({ hitReroll: 'reroll-fail', plusOneDamage: false })
    expect(mergeUnitBuffs(null, { lethalHits: true }).lethalHits).toBe(true)
    expect(mergeTargetUnitBuffs(undefined, { halfDamage: true }).halfDamage).toBe(true)
  })
})

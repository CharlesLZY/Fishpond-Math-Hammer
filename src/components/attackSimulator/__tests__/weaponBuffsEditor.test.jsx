import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeWeapon } from '../../../lib/attackSimProfiles'
import { LangProvider } from '../../attackSim/lang'
import WeaponBuffsEditor from '../WeaponBuffsEditor'

const { captureBuffs } = vi.hoisted(() => ({ captureBuffs: vi.fn() }))

vi.mock('../../ui', () => ({
  FormSelect: () => null,
  BuffChipGroup: ({ buffs }) => {
    captureBuffs(buffs)
    return null
  },
}))

const toggleBuff = (profile, key) => {
  captureBuffs.mockClear()
  const onChange = vi.fn()
  renderToStaticMarkup(
    <LangProvider>
      <WeaponBuffsEditor profile={profile} onChange={onChange} />
    </LangProvider>
  )
  expect(captureBuffs).toHaveBeenCalledOnce()
  const buff = captureBuffs.mock.calls[0][0].find((entry) => entry.key === key)
  expect(buff).toBeDefined()
  buff.onToggle()
  expect(onChange).toHaveBeenCalledOnce()
  return onChange.mock.calls[0][0]
}

const disabledBuffs = {
  blast: false,
  blastValue: 1,
  cleaveEnabled: false,
  cleaveValue: 1,
}

describe.each([
  { key: 'blast', flag: 'blast', value: 'blastValue', other: 'cleave' },
  { key: 'cleave', flag: 'cleaveEnabled', value: 'cleaveValue', other: 'blast' },
])('$key cancellation', ({ key, flag, value, other }) => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', { getItem: () => null })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resets X to 1 on manual cancellation and keeps it at 1 when re-enabled', () => {
    const original = Object.freeze(makeWeapon({
      [flag]: true, [value]: 5, lethalHits: true, strength: 7,
    }))
    const cancelled = toggleBuff(original, key)

    expect(cancelled).toEqual({ ...original, ...disabledBuffs })
    expect(toggleBuff(cancelled, key)).toEqual({ ...original, [value]: 1 })
    expect(original[value]).toBe(5)
  })

  it('resets X to 1 when the other buff is selected and when switching back', () => {
    const original = Object.freeze(makeWeapon({
      [flag]: true, [value]: 5, lethalHits: true, strength: 7,
    }))
    const otherFlag = other === 'blast' ? 'blast' : 'cleaveEnabled'
    const switched = toggleBuff(original, other)

    expect(switched).toEqual({ ...original, ...disabledBuffs, [otherFlag]: true })
    expect(toggleBuff(switched, key)).toEqual({ ...original, [value]: 1 })
    expect(original[value]).toBe(5)
  })
})

import { normalizeAttackBonusValue } from '../../lib/dice'

const rerollShort = {
  'reroll-one': '1s',
  'reroll-one-two': 'Ones and Twos',
  'reroll-fail': 'Fails',
  'reroll-non-critical': 'Non-Crit',
  'reroll-1-2-3': '≤3',
}

const comparisonBuffLabels = {
  hitReroll: 'HitRR',
  woundReroll: 'WoundRR',
  rerollOneFailedHit: 'HitRR1',
  rerollOneFailedWound: 'WoundRR1',
  plusOneAttack: '+1A',
  plusOneDamage: '+1D',
  plusOneAp: '+1AP',
  plusOneHit: '+1Hit',
  plusOneWound: '+1Wound',
  lethalHits: 'LethalHits',
  devastatingWounds: 'DevWounds',
  sustainedHits: 'Sustained',
  criticalHit: 'CritHit',
  ignoresCover: 'IgnoresCover',
}

const pushReroll = (chips, chipKey, upgradeKey, mode, scope, label, upgrades, t) => {
  if (!mode || mode === 'no-reroll') return
  const short = rerollShort[mode] || mode
  const scopeTag = scope === 'single' ? ` · ${t('rerollScopeSingle')}` : ''
  chips.push({
    key: chipKey,
    label: `${label}: ${short}${scopeTag}`,
    upgraded: !!upgrades?.[upgradeKey],
    isReroll: true,
  })
}

export function buildWeaponSummary(profile, upgrades, t) {
  const chips = []
  const push = (key, label) =>
    chips.push({ key, label, upgraded: !!upgrades?.[key] })

  if (profile.torrent) push('torrent', t('torrent'))
  if (profile.lethalHits) push('lethalHits', t('lethalHits'))
  if (profile.plusOneAttack) push('plusOneAttack', t('plusOneAttack'))
  if (profile.plusOneDamage) push('plusOneDamage', t('plusOneDamage'))
  if (profile.plusOneAp) push('plusOneAp', t('plusOneAp'))
  if (profile.plusOneHit) push('plusOneHit', t('plusOneHit'))
  if (profile.critHitEnabled)
    push('critHit', `${t('criticalHit')} ${profile.critHit}+`)
  if (profile.sustainedHits && profile.sustainedHits !== 'off')
    push('sustainedHits', `${t('sustainedHits')} ${profile.sustainedHits}`)
  if (profile.ignoresCover) push('ignoresCover', t('ignoresCover'))
  if (profile.devastatingWounds)
    push('devastating', t('devastatingWounds'))
  if (profile.blast)
    push('blast', `${t('blast')} ${normalizeAttackBonusValue(profile.blastValue)}`)
  if (!profile.blast && profile.cleaveEnabled)
    push('cleave', `${t('cleave')} ${normalizeAttackBonusValue(profile.cleaveValue)}`)
  if (profile.plusOneWound) push('plusOneWound', t('plusOneWound'))
  if (profile.antiEnabled)
    push('anti', `${t('anti')} ${profile.antiValue}+`)

  if (!profile.torrent) {
    pushReroll(
      chips,
      'hitReroll-chip',
      'hitReroll',
      profile.hitReroll,
      profile.hitRerollScope,
      t('hitReroll'),
      upgrades,
      t
    )
  }
  pushReroll(
    chips,
    'woundReroll-chip',
    'woundReroll',
    profile.woundReroll,
    profile.woundRerollScope,
    t('woundReroll'),
    upgrades,
    t
  )
  pushReroll(
    chips,
    'attackReroll-chip',
    'attackReroll',
    profile.attackReroll,
    profile.attackRerollScope,
    t('attackReroll'),
    upgrades,
    t
  )
  pushReroll(
    chips,
    'damageReroll-chip',
    'damageReroll',
    profile.damageReroll,
    profile.damageRerollScope,
    t('damageReroll'),
    upgrades,
    t
  )

  return chips
}

export function buildTargetSummary(profile, upgrades, t) {
  const chips = []
  const push = (key, label) =>
    chips.push({ key, label, upgraded: !!upgrades?.[key] })

  if (profile.fnp) push('fnp', `${t('fnp')} ${profile.fnp}+`)
  if (profile.fnpMortal)
    push('fnpMortal', `${t('fnpMortal')} ${profile.fnpMortal}+`)
  if (profile.benefitOfCover)
    push('benefitOfCover', t('benefitOfCover'))
  if (profile.minusOneAp) push('minusOneAp', t('minusOneAp'))
  if (profile.minusOneToHit)
    push('minusOneToHit', t('minusOneHit'))
  if (profile.minusOneToWound)
    push('minusOneToWound', t('minusOneWound'))
  if (profile.minusOneToWoundIfStronger)
    push('minusOneToWoundIfStronger', t('minusOneWoundST'))
  if (profile.halfDamage) push('halfDamage', t('halfDamage'))
  if (profile.minusOneDamage)
    push('minusOneDamage', t('damageMinus1'))
  if (profile.damageOne) push('damageOne', t('damageOne'))

  if (upgrades) {
    const existing = new Set(chips.map((chip) => chip.key))
    const addUpgrade = (key, label) => {
      if (upgrades[key] && !existing.has(key)) push(key, label)
    }
    addUpgrade('benefitOfCover', t('benefitOfCover'))
    addUpgrade('minusOneAp', t('minusOneAp'))
    addUpgrade('minusOneToHit', t('minusOneHit'))
    addUpgrade('minusOneToWound', t('minusOneWound'))
    addUpgrade('minusOneToWoundIfStronger', t('minusOneWoundST'))
    addUpgrade('halfDamage', t('halfDamage'))
    addUpgrade('minusOneDamage', t('damageMinus1'))
    addUpgrade('damageOne', t('damageOne'))
  }

  return chips
}

export function buildAttackerUnitBuffSummary(unitBuffs, t) {
  const chips = []
  const add = (key, label) => chips.push({ key, label })
  pushReroll(
    chips,
    'unit-hit-reroll',
    'hitReroll',
    unitBuffs?.hitReroll,
    'all',
    t('hitReroll'),
    null,
    t
  )
  pushReroll(
    chips,
    'unit-wound-reroll',
    'woundReroll',
    unitBuffs?.woundReroll,
    'all',
    t('woundReroll'),
    null,
    t
  )
  if (unitBuffs?.rerollOneFailedHit) add('rerollOneFailedHit', t('rerollOneFailedHit'))
  if (unitBuffs?.rerollOneFailedWound) add('rerollOneFailedWound', t('rerollOneFailedWound'))
  if (unitBuffs?.plusOneAttack) add('plusOneAttack', t('plusOneAttack'))
  if (unitBuffs?.plusOneDamage) add('plusOneDamage', t('plusOneDamage'))
  if (unitBuffs?.plusOneAp) add('plusOneAp', t('plusOneAp'))
  if (unitBuffs?.plusOneHit) add('plusOneHit', t('plusOneHit'))
  if (unitBuffs?.plusOneWound) add('plusOneWound', t('plusOneWound'))
  if (unitBuffs?.lethalHits) add('lethalHits', t('lethalHits'))
  if (unitBuffs?.devastatingWounds)
    add('devastatingWounds', t('devastatingWounds'))
  if (unitBuffs?.sustainedHits && unitBuffs.sustainedHits !== 'off')
    add('sustainedHits', `${t('sustainedHits')} ${unitBuffs.sustainedHits}`)
  if (unitBuffs?.critHitEnabled)
    add('critHit', `${t('criticalHit')} ${unitBuffs.critHit}+`)
  if (unitBuffs?.ignoresCover) add('ignoresCover', t('ignoresCover'))
  return chips
}

export function buildComparisonProfileName(name, extraUnitBuffs) {
  const chips = buildAttackerUnitBuffSummary(extraUnitBuffs, (key) => comparisonBuffLabels[key])
  return [name, ...chips.map((chip) => chip.label)].join(' ')
}

export function buildDefenderUnitBuffSummary(unitBuffs, t) {
  const chips = []
  const add = (key, label) => {
    if (unitBuffs?.[key]) chips.push({ key, label })
  }
  add('benefitOfCover', t('benefitOfCover'))
  add('minusOneAp', t('minusOneAp'))
  add('minusOneToHit', t('minusOneHit'))
  add('minusOneToWound', t('minusOneWound'))
  add('minusOneToWoundIfStronger', t('minusOneWoundST'))
  add('halfDamage', t('halfDamage'))
  add('minusOneDamage', t('damageMinus1'))
  add('damageOne', t('damageOne'))
  return chips
}

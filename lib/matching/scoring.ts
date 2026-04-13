import {
  CONDITION_BLEND_CODES,
  SETTING_BLEND_CODES,
  conditionToPctMeasure,
  settingToCareMeasure,
} from "@/lib/matching/mappings"
import {
  normalizeHigherBetter,
  normalizeHospiceCareIndex,
  normalizeLowerBetter,
  parseNumeric,
  parseYesNo,
} from "@/lib/matching/normalize"
import type { LayerBreakdown, MatchOrganizationInput, MatchQuestionnaire } from "@/lib/matching/types"
import { FIT_SUB, QUALITY_WEIGHTS, userWantsEolBoost } from "@/lib/matching/weights"

function weightedAverage(
  entries: { weight: number; value: number | null }[]
): { value: number | null; usedWeight: number; totalWeight: number } {
  let used = 0
  let sumW = 0
  let sumWV = 0
  for (const { weight, value } of entries) {
    if (value == null || weight <= 0) continue
    sumW += weight
    sumWV += weight * value
    used += 1
  }
  if (sumW <= 0) return { value: null, usedWeight: 0, totalWeight: 0 }
  return { value: sumWV / sumW, usedWeight: sumW, totalWeight: sumW }
}

export function scoreDistanceLayer(
  org: MatchOrganizationInput,
  q: MatchQuestionnaire,
  layerMax: number
): LayerBreakdown {
  const notes: string[] = []
  const d = org.distanceMiles
  if (d == null || !Number.isFinite(d)) {
    notes.push("Distance unavailable for this provider.")
    return { pointsEarned: 0, pointsMax: layerMax, detailNotes: notes }
  }
  const r = Math.max(q.radiusMiles, 1)
  const closeness = Math.max(0, Math.min(1, 1 - d / r))
  const curved = Math.pow(closeness, 1.08)
  const earned = layerMax * curved
  if (d <= r * 0.25) notes.push("Within about a quarter of your search radius — strong geographic fit.")
  else if (d <= r * 0.6) notes.push("Within a moderate distance of your search area.")
  else notes.push("Toward the outer part of your search radius.")
  return { pointsEarned: earned, pointsMax: layerMax, detailNotes: notes }
}

export function scoreConditionFit(
  org: MatchOrganizationInput,
  q: MatchQuestionnaire,
  subMax: number
): LayerBreakdown {
  const notes: string[] = []
  const measures = org.measures
  const key = conditionToPctMeasure(q.condition)

  if (key) {
    const v = normalizeHigherBetter(measures[key], 100)
    if (v == null) {
      notes.push("Condition mix data not reported for this provider — not penalized; weight redistributed.")
      return { pointsEarned: subMax * 0.72, pointsMax: subMax, detailNotes: notes }
    }
    const earned = subMax * v
    if (v >= 0.75) notes.push("This provider cares for a relatively high share of patients with a similar condition category.")
    else if (v >= 0.4) notes.push("Moderate reported experience with patients in this condition category.")
    else notes.push("Lower reported share in this condition category (still one factor among several).")
    return { pointsEarned: earned, pointsMax: subMax, detailNotes: notes }
  }

  // not_sure: blend available Pct fields
  const entries = CONDITION_BLEND_CODES.map((code) => ({
    weight: 1,
    value: normalizeHigherBetter(measures[code], 100),
  }))
  const { value, usedWeight } = weightedAverage(entries)
  if (value == null || usedWeight === 0) {
    notes.push("Limited condition-mix data — neutral contribution.")
    return { pointsEarned: subMax * 0.7, pointsMax: subMax, detailNotes: notes }
  }
  notes.push("You weren’t sure of the primary condition; we used overall condition-mix balance instead.")
  return { pointsEarned: subMax * value, pointsMax: subMax, detailNotes: notes }
}

export function scoreSettingFit(
  org: MatchOrganizationInput,
  q: MatchQuestionnaire,
  subMax: number
): LayerBreakdown {
  const notes: string[] = []
  const measures = org.measures
  const key = settingToCareMeasure(q.careSetting)

  if (key) {
    const v = normalizeHigherBetter(measures[key], 100)
    if (v == null) {
      notes.push("Location-of-care data missing for this site — neutral bump, not a penalty.")
      return { pointsEarned: subMax * 0.72, pointsMax: subMax, detailNotes: notes }
    }
    const earned = subMax * v
    if (v >= 0.7) notes.push("Strong reported share of care in the setting you selected.")
    else notes.push("Some reported activity in your preferred care setting.")
    return { pointsEarned: earned, pointsMax: subMax, detailNotes: notes }
  }

  const entries = SETTING_BLEND_CODES.map((code) => ({
    weight: 1,
    value: normalizeHigherBetter(measures[code], 100),
  }))
  const { value, usedWeight } = weightedAverage(entries)
  if (value == null || usedWeight === 0) {
    notes.push("Limited location-of-care data — neutral contribution.")
    return { pointsEarned: subMax * 0.7, pointsMax: subMax, detailNotes: notes }
  }
  notes.push("Care setting was “not sure”; we balanced across reported locations of care.")
  return { pointsEarned: subMax * value, pointsMax: subMax, detailNotes: notes }
}

function orgIntensityNormalized(org: MatchOrganizationInput): number | null {
  const andOther = parseYesNo(org.measures["Provided_Home_Care_and_other"])
  const only = parseYesNo(org.measures["Provided_Home_Care_only"])
  if (andOther === true) return 1
  if (only === true && andOther === false) return 0.38
  if (andOther === false && only === false) return 0.55
  if (andOther == null && only == null) return null
  return 0.62
}

function intensityImportanceBlend(q: MatchQuestionnaire, orgValue: number | null): number | null {
  if (orgValue == null) return null
  const neutral = 0.78
  let factor = 1
  switch (q.intensityImportance) {
    case "very":
      factor = 1
      break
    case "somewhat":
      factor = 0.72
      break
    case "not":
      factor = 0.35
      break
    case "not_sure":
    default:
      factor = 0.55
      break
  }
  return neutral + (orgValue - neutral) * factor
}

export function scoreIntensityFit(
  org: MatchOrganizationInput,
  q: MatchQuestionnaire,
  subMax: number
): LayerBreakdown {
  const notes: string[] = []
  const raw = orgIntensityNormalized(org)
  const blended = intensityImportanceBlend(q, raw)
  if (blended == null) {
    notes.push("Level-of-care flags not available — neutral contribution.")
    return { pointsEarned: subMax * 0.72, pointsMax: subMax, detailNotes: notes }
  }
  const earned = subMax * Math.max(0, Math.min(1, blended))
  if (raw != null && raw >= 0.9 && q.intensityImportance === "very") {
    notes.push("Reports routine home care plus at least one higher-intensity level — aligned with your preference.")
  } else if (raw != null && raw < 0.5 && q.intensityImportance === "very") {
    notes.push("Mostly routine home care in public data — consider asking the provider about continuous care / inpatient options.")
  } else {
    notes.push("Level-of-care capability weighed based on how important that is to you.")
  }
  return { pointsEarned: earned, pointsMax: subMax, detailNotes: notes }
}

function qualityNormalizedScore(code: string, raw: string | null): number | null {
  switch (code) {
    case "H_012_00_OBSERVED":
      return normalizeHospiceCareIndex(raw)
    case "H_011_01_OBSERVED":
    case "H_008_01_OBSERVED":
    case "H_012_10_OBSERVED":
    case "H_012_01_OBSERVED":
      return normalizeHigherBetter(raw, 100)
    case "H_012_08_OBSERVED":
      return normalizeHigherBetter(raw, 800)
    case "H_012_09_OBSERVED":
      return normalizeHigherBetter(raw, 400)
    case "H_012_02_OBSERVED":
      return normalizeLowerBetter(raw, 55)
    case "H_012_05_OBSERVED":
      return normalizeLowerBetter(raw, 35)
    default:
      return null
  }
}

export function scoreQualityLayer(
  org: MatchOrganizationInput,
  q: MatchQuestionnaire,
  layerMax: number
): LayerBreakdown {
  const notes: string[] = []
  let weights = { ...QUALITY_WEIGHTS }
  if (userWantsEolBoost(q)) {
    const bump = 0.08
    weights = { ...weights, H_012_10_OBSERVED: weights["H_012_10_OBSERVED"] + bump }
    const others = Object.keys(weights).filter((k) => k !== "H_012_10_OBSERVED")
    const sumOthers = others.reduce((s, k) => s + weights[k], 0)
    const target = 1 - weights["H_012_10_OBSERVED"]
    for (const k of others) {
      weights[k] = (weights[k] / sumOthers) * target
    }
  }

  const entries = Object.entries(weights).map(([code, w]) => ({
    weight: w,
    value: qualityNormalizedScore(code, org.measures[code] ?? null),
  }))

  const { value, usedWeight } = weightedAverage(entries)
  if (value == null || usedWeight === 0) {
    notes.push("Few quality indicators available for this provider in our dataset.")
    return { pointsEarned: layerMax * 0.55, pointsMax: layerMax, detailNotes: notes }
  }

  notes.push("Quality reflects a small set of public Medicare hospice measures, not a full clinical picture.")
  return { pointsEarned: layerMax * value, pointsMax: layerMax, detailNotes: notes }
}

const CONFIDENCE_CODES = [
  ...CONDITION_BLEND_CODES,
  ...SETTING_BLEND_CODES,
  "Provided_Home_Care_only",
  "Provided_Home_Care_and_other",
  ...Object.keys(QUALITY_WEIGHTS),
]

export function scoreConfidenceLayer(
  org: MatchOrganizationInput,
  layerMax: number
): LayerBreakdown {
  const notes: string[] = []
  let present = 0
  for (const code of CONFIDENCE_CODES) {
    const v = org.measures[code]
    if (v != null && String(v).trim() !== "" && String(v).trim() !== "—") present += 1
  }

  const ratio = CONFIDENCE_CODES.length > 0 ? present / CONFIDENCE_CODES.length : 0
  let earned = layerMax * (0.35 + 0.65 * ratio)

  const census = org.averageDailyCensus
  const n = census != null ? parseNumeric(String(census)) : null
  if (n != null && n >= 3 && n <= 400) {
    earned += Math.min(1.2, layerMax * 0.06)
    notes.push("Stable census data available (small neutrality check — not a “bigger is better” score).")
  }

  if (ratio < 0.45) {
    notes.push("Several public data fields are missing; treat rankings as directional, not definitive.")
  } else {
    notes.push("Reasonable amount of public data available for comparison.")
  }

  earned = Math.min(layerMax, earned)
  return { pointsEarned: earned, pointsMax: layerMax, detailNotes: notes }
}

export { FIT_SUB }

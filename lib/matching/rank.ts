import { applyPriorityTilts } from "@/lib/matching/weights"
import {
  ORG_DETAIL_MEASURE_CODES,
  scoreToDisplay,
  type OrganizationDetailMeasurements,
} from "@/lib/organizations/org-detail-measures"
import {
  scoreConditionFit,
  scoreConfidenceLayer,
  scoreDistanceLayer,
  scoreIntensityFit,
  scoreQualityLayer,
  scoreSettingFit,
  FIT_SUB,
} from "@/lib/matching/scoring"
import type {
  MatchOrganizationInput,
  MatchQuestionnaire,
  MatchRankResult,
  RankedHospiceMatch,
} from "@/lib/matching/types"

/**
 * Step A (eligibility) should happen before calling this (e.g. coords + radius + CCN if required).
 * Step B–D: layered fit, quality, confidence; missing fields reweighted inside each scorer.
 */
export function rankHospiceMatches(
  questionnaire: MatchQuestionnaire,
  organizations: MatchOrganizationInput[]
): MatchRankResult {
  const caps = applyPriorityTilts(questionnaire)

  const fitTotal = caps.fit
  const condMax = fitTotal * (FIT_SUB.condition / 35)
  const setMax = fitTotal * (FIT_SUB.setting / 35)
  const intMax = fitTotal * (FIT_SUB.intensity / 35)

  const ranked: RankedHospiceMatch[] = organizations.map((org) => {
    const distance = scoreDistanceLayer(org, questionnaire, caps.distance)

    const condition = scoreConditionFit(org, questionnaire, condMax)
    let setting = scoreSettingFit(org, questionnaire, setMax)
    const intensity = scoreIntensityFit(org, questionnaire, intMax)

    if (
      questionnaire.priorities.includes("home_support") &&
      questionnaire.careSetting === "home"
    ) {
      setting = {
        ...setting,
        pointsEarned: Math.min(setting.pointsMax, setting.pointsEarned * 1.08),
      }
    }

    const quality = scoreQualityLayer(org, questionnaire, caps.quality)
    const confidence = scoreConfidenceLayer(org, caps.confidence)

    const totalScoreRaw =
      distance.pointsEarned +
      condition.pointsEarned +
      setting.pointsEarned +
      intensity.pointsEarned +
      quality.pointsEarned +
      confidence.pointsEarned

    const totalScore = Math.round(Math.max(0, Math.min(100, totalScoreRaw)) * 10) / 10

    const explanation = buildExplanationBullets({
      distance,
      condition,
      setting,
      intensity,
      quality,
      confidence,
    })

    const lowConfidence =
      confidence.pointsEarned < caps.confidence * 0.55
        ? "This provider is missing several public data fields — compare carefully and confirm details directly."
        : null

    return {
      organizationId: org.id,
      name: org.name,
      ccn: org.ccn,
      fullLocation: org.fullLocation,
      phone: org.phone,
      distanceMiles: org.distanceMiles,
      totalScore,
      breakdown: {
        distance,
        fit: { condition, setting, intensity },
        quality,
        confidence,
      },
      explanation,
      confidenceNote: lowConfidence,
      detailMeasurements: buildDetailMeasurements(org.measures),
    }
  })

  ranked.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
    const da = a.distanceMiles ?? 9999
    const db = b.distanceMiles ?? 9999
    return da - db
  })

  return { matches: ranked, disclaimer: "" }
}

function buildDetailMeasurements(
  measures: Record<string, string | null>
): OrganizationDetailMeasurements {
  const out: OrganizationDetailMeasurements = {}
  for (const code of ORG_DETAIL_MEASURE_CODES) {
    out[code] = {
      scoreDisplay: scoreToDisplay(measures[code]),
      measureName: null,
      measureDate: null,
    }
  }
  return out
}

function buildExplanationBullets(layers: {
  distance: { pointsEarned: number; detailNotes: string[] }
  condition: { pointsEarned: number; detailNotes: string[] }
  setting: { pointsEarned: number; detailNotes: string[] }
  intensity: { pointsEarned: number; detailNotes: string[] }
  quality: { pointsEarned: number; detailNotes: string[] }
  confidence: { pointsEarned: number; detailNotes: string[] }
}): string[] {
  const scored = [
    { key: "distance", ...layers.distance },
    { key: "condition", ...layers.condition },
    { key: "setting", ...layers.setting },
    { key: "intensity", ...layers.intensity },
    { key: "quality", ...layers.quality },
    { key: "confidence", ...layers.confidence },
  ].sort((a, b) => b.pointsEarned - a.pointsEarned)

  const out: string[] = []
  for (const layer of scored.slice(0, 3)) {
    const first = layer.detailNotes[0]
    if (first) out.push(first)
  }
  if (out.length === 0) {
    out.push("Matched using your location, care preferences, and public hospice data.")
  }
  return out
}

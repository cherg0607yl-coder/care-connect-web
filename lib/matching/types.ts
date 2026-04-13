/**
 * Questionnaire + ranking types for “Find best matches” (V1 rules-based, explainable).
 */

export type RelationshipToPatient =
  | "self"
  | "parent"
  | "grandparent"
  | "spouse_partner"
  | "other_family"
  | "friend"
  | "other"
  | "prefer_not_say"

/** Drives condition familiarity (maps to a `Pct_Pts_w_*` measure). */
export type PrimaryCondition =
  | "cancer"
  | "dementia"
  | "stroke"
  | "heart"
  | "respiratory"
  | "other"
  | "not_sure"

/** Drives care-setting fit (maps to a `Care_Provided_*` measure). */
export type CareSettingPreference =
  | "home"
  | "assisted_living"
  | "nursing_facility"
  | "skilled_nursing"
  | "hospital"
  | "inpatient_hospice"
  | "not_sure"

export type IntensityImportance = "very" | "somewhat" | "not" | "not_sure"

/** Up to 3; tilts layer weights (renormalized to 100 total points). */
export type UserPriority =
  | "closest"
  | "quality"
  | "condition_experience"
  | "home_support"
  | "capabilities"
  | "eol_visits"

/** Payload from the questionnaire UI → API → ranker. */
export type MatchQuestionnaire = {
  locationLabel: string
  userLat: number
  userLng: number
  radiusMiles: number
  relationship: RelationshipToPatient
  condition: PrimaryCondition
  careSetting: CareSettingPreference
  intensityImportance: IntensityImportance
  /** Max 3 distinct priorities */
  priorities: UserPriority[]
}

/** One organization ready for scoring (already filtered + joined measures). */
export type MatchOrganizationInput = {
  id: string
  name: string
  ccn: string | null
  fullLocation: string
  phone: string | null
  latitude: number | null
  longitude: number | null
  distanceMiles: number | null
  /** Latest raw `Score` strings keyed by `Measure Code` */
  measures: Record<string, string | null>
  /** Optional; used only for a small “stability” nudge — not “bigger is better.” */
  averageDailyCensus: number | null
}

export type LayerBreakdown = {
  /** Points earned after missing-data reweighting within the layer */
  pointsEarned: number
  /** Max points this layer could contribute for this org (same as bucket max after global renormalization) */
  pointsMax: number
  /** Human-readable sub-notes for tooltips / UI */
  detailNotes: string[]
}

export type FitSubBreakdown = {
  condition: LayerBreakdown
  setting: LayerBreakdown
  intensity: LayerBreakdown
}

export type MatchScoreBreakdown = {
  distance: LayerBreakdown
  fit: FitSubBreakdown
  quality: LayerBreakdown
  confidence: LayerBreakdown
}

/** One ranked row returned to the UI */
export type RankedHospiceMatch = {
  organizationId: string
  name: string
  ccn: string | null
  fullLocation: string
  phone: string | null
  distanceMiles: number | null
  /** 0–100, rounded for display */
  totalScore: number
  breakdown: MatchScoreBreakdown
  /** Short, non-clinical explanation bullets */
  explanation: string[]
  /** Shown when completeness is low */
  confidenceNote: string | null
}

export type MatchRankResult = {
  matches: RankedHospiceMatch[]
  /** Copy for UI disclaimer */
  disclaimer: string
}

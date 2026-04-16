import type { MatchQuestionnaire, UserPriority } from "@/lib/matching/types"

/** Base layer caps (sum = 100). Tweaked only via `applyPriorityTilts`. */
export const BASE_LAYER_MAX = {
  distance: 30,
  fit: 35,
  quality: 25,
  confidence: 10,
} as const

/** Fit sub-buckets (sum = BASE_LAYER_MAX.fit). */
export const FIT_SUB = {
  condition: 14,
  setting: 12,
  intensity: 9,
} as const

/** Relative weights inside the quality layer (sum = 1). Missing codes renormalize within layer. */
export const QUALITY_WEIGHTS: Record<string, number> = {
  H_012_00_OBSERVED: 0.487,
  H_012_10_OBSERVED: 0.18,
  H_008_01_OBSERVED: 0.103,
  H_012_01_OBSERVED: 0.077,
  H_012_08_OBSERVED: 0.064,
  H_012_09_OBSERVED: 0.051,
  H_012_02_OBSERVED: 0.019,
  H_012_05_OBSERVED: 0.019,
}

/**
 * User priorities multiply layer caps before renormalizing to 100.
 * Values are mild so the model stays stable.
 */
const PRIORITY_LAYER_MULTIPLIERS: Record<
  UserPriority,
  Partial<{ distance: number; fit: number; quality: number }>
> = {
  closest: { distance: 1.35 },
  quality: { quality: 1.35 },
  condition_experience: { fit: 1.2 },
  home_support: { fit: 1.15 },
  capabilities: { fit: 1.15 },
  eol_visits: { quality: 1.2 },
}

/** Boost H_012_10 effective share when user picks eol_visits (handled in scoring). */
export function userWantsEolBoost(q: MatchQuestionnaire): boolean {
  return q.priorities.includes("eol_visits")
}

export function applyPriorityTilts(q: MatchQuestionnaire): {
  distance: number
  fit: number
  quality: number
  confidence: number
} {
  let d = BASE_LAYER_MAX.distance
  let f = BASE_LAYER_MAX.fit
  let qu = BASE_LAYER_MAX.quality
  const c = BASE_LAYER_MAX.confidence

  const seen = new Set<UserPriority>()
  for (const p of q.priorities) {
    if (seen.has(p)) continue
    seen.add(p)
    const mults = PRIORITY_LAYER_MULTIPLIERS[p]
    if (mults.distance) d *= mults.distance
    if (mults.fit) f *= mults.fit
    if (mults.quality) qu *= mults.quality
  }

  const sum = d + f + qu + c
  return {
    distance: (d / sum) * 100,
    fit: (f / sum) * 100,
    quality: (qu / sum) * 100,
    confidence: (c / sum) * 100,
  }
}

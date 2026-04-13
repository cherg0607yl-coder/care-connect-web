import { NextResponse } from "next/server"
import { loadMatchCandidates } from "@/lib/matching/load-candidates"
import { rankHospiceMatches } from "@/lib/matching/rank"
import type {
  CareSettingPreference,
  IntensityImportance,
  MatchQuestionnaire,
  PrimaryCondition,
  RelationshipToPatient,
  UserPriority,
} from "@/lib/matching/types"

const MAX_PRIORITIES = 3
const MAX_RESULTS = 120
const MIN_RADIUS = 1
const MAX_RADIUS = 100

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v)
}

function parseQuestionnaire(body: unknown): MatchQuestionnaire | { error: string } {
  if (!isRecord(body)) return { error: "Invalid JSON body" }

  const userLat = Number(body.userLat)
  const userLng = Number(body.userLng)
  if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) {
    return { error: "userLat and userLng are required numbers" }
  }
  if (userLat < -90 || userLat > 90 || userLng < -180 || userLng > 180) {
    return { error: "Coordinates out of range" }
  }

  let radiusMiles = Number(body.radiusMiles)
  if (!Number.isFinite(radiusMiles)) radiusMiles = 25
  radiusMiles = Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, radiusMiles))

  const locationLabel =
    typeof body.locationLabel === "string" && body.locationLabel.trim()
      ? body.locationLabel.trim()
      : "Selected location"

  const relationship = body.relationship as RelationshipToPatient
  const allowedRel: RelationshipToPatient[] = [
    "self",
    "parent",
    "grandparent",
    "spouse_partner",
    "other_family",
    "friend",
    "other",
    "prefer_not_say",
  ]
  if (!allowedRel.includes(relationship)) {
    return { error: "Invalid relationship" }
  }

  const condition = body.condition as PrimaryCondition
  const allowedCond: PrimaryCondition[] = [
    "cancer",
    "dementia",
    "stroke",
    "heart",
    "respiratory",
    "other",
    "not_sure",
  ]
  if (!allowedCond.includes(condition)) {
    return { error: "Invalid condition" }
  }

  const careSetting = body.careSetting as CareSettingPreference
  const allowedSet: CareSettingPreference[] = [
    "home",
    "assisted_living",
    "nursing_facility",
    "skilled_nursing",
    "hospital",
    "inpatient_hospice",
    "not_sure",
  ]
  if (!allowedSet.includes(careSetting)) {
    return { error: "Invalid careSetting" }
  }

  const intensityImportance = body.intensityImportance as IntensityImportance
  const allowedInt: IntensityImportance[] = ["very", "somewhat", "not", "not_sure"]
  if (!allowedInt.includes(intensityImportance)) {
    return { error: "Invalid intensityImportance" }
  }

  const rawPri = body.priorities
  if (!Array.isArray(rawPri)) return { error: "priorities must be an array" }
  const allowedPri: UserPriority[] = [
    "closest",
    "quality",
    "condition_experience",
    "home_support",
    "capabilities",
    "eol_visits",
  ]
  const priorities: UserPriority[] = []
  const seen = new Set<string>()
  for (const p of rawPri) {
    if (typeof p !== "string" || !allowedPri.includes(p as UserPriority)) continue
    if (seen.has(p)) continue
    seen.add(p)
    priorities.push(p as UserPriority)
    if (priorities.length >= MAX_PRIORITIES) break
  }

  return {
    locationLabel,
    userLat,
    userLng,
    radiusMiles,
    relationship,
    condition,
    careSetting,
    intensityImportance,
    priorities,
  }
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Expected JSON body" }, { status: 400 })
  }

  const parsed = parseQuestionnaire(body)
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  try {
    const candidates = await loadMatchCandidates({
      userLat: parsed.userLat,
      userLng: parsed.userLng,
      radiusMiles: parsed.radiusMiles,
      maxOrganizations: MAX_RESULTS,
    })

    if (candidates.length === 0) {
      return NextResponse.json({
        questionnaire: parsed,
        matches: [],
        disclaimer: rankHospiceMatches(parsed, []).disclaimer,
        warning:
          "No organizations with coordinates were found in that radius. Try a larger radius or a nearby city.",
      })
    }

    const result = rankHospiceMatches(parsed, candidates)
    return NextResponse.json({
      questionnaire: parsed,
      ...result,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Match failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { MATCH_MEASURE_CODES } from "@/lib/matching/measure-codes"
import type { MatchOrganizationInput } from "@/lib/matching/types"
import {
  getMeasurementsForCcns,
  getOrganizationsWithCoords,
} from "@/lib/cms"
import {
  latestByMeasureCode,
  normalizeCcnForMatch,
  type RawMeasurementRow,
} from "@/lib/organizations/org-detail-measures"
import { calculateDistanceMiles, formatLocation } from "@/lib/organizations/search"

function measureMapForCcn(
  ccn: string | null,
  byCcn: Map<string, RawMeasurementRow[]>
): Record<string, string | null> {
  const out: Record<string, string | null> = {}
  const key = normalizeCcnForMatch(ccn ?? "")
  if (!key) return out
  const rows = byCcn.get(key) ?? []
  const latest = latestByMeasureCode(rows)
  for (const code of MATCH_MEASURE_CODES) {
    const row = latest.get(code)
    if (!row || row.Score == null || row.Score === "") {
      out[code] = null
    } else {
      out[code] = String(row.Score).trim() || null
    }
  }
  return out
}

export type LoadMatchCandidatesOptions = {
  userLat: number
  userLng: number
  radiusMiles: number
  /** Hard cap for scoring cost */
  maxOrganizations: number
}

/**
 * Loads organizations with coordinates within radius, attaches latest match measurements.
 */
export async function loadMatchCandidates(
  options: LoadMatchCandidatesOptions
): Promise<MatchOrganizationInput[]> {
  const { userLat, userLng, radiusMiles, maxOrganizations } = options
  const rawRows = getOrganizationsWithCoords()

  type Enriched = {
    id: string
    name: string
    ccn: string | null
    fullLocation: string
    phone: string | null
    lat: number
    lng: number
    distanceMiles: number
  }

  const enriched: Enriched[] = []
  for (const row of rawRows) {
    const lat = row.latitude
    const lng = row.longitude
    if (lat == null || lng == null) continue
    const d = calculateDistanceMiles(userLat, userLng, lat, lng)
    if (d > radiusMiles) continue

    enriched.push({
      id: row.id,
      name: row.name.trim() || "Unknown organization",
      ccn: row.ccn.trim() || null,
      fullLocation: formatLocation({
        street: row.addressLine1,
        city: row.city,
        state: row.state,
        zip: row.zip,
      }),
      phone: row.phone,
      lat,
      lng,
      distanceMiles: d,
    })
  }

  enriched.sort((a, b) => a.distanceMiles - b.distanceMiles)
  const capped = enriched.slice(0, maxOrganizations)

  const ccns = capped.map((o) => o.ccn).filter((c): c is string => Boolean(c?.trim()))
  const byCcn = getMeasurementsForCcns(ccns, MATCH_MEASURE_CODES)

  return capped.map((o) => ({
    id: o.id,
    name: o.name,
    ccn: o.ccn,
    fullLocation: o.fullLocation,
    phone: o.phone,
    latitude: o.lat,
    longitude: o.lng,
    distanceMiles: o.distanceMiles,
    averageDailyCensus: null,
    measures: measureMapForCcn(o.ccn, byCcn),
  }))
}

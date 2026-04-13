import { createServerSupabaseClient } from "@/lib/supabase/server"
import { MATCH_MEASURE_CODES } from "@/lib/matching/measure-codes"
import type { MatchOrganizationInput } from "@/lib/matching/types"
import {
  groupMeasurementsByCcn,
  latestByMeasureCode,
  normalizeCcnForMatch,
  type RawMeasurementRow,
} from "@/lib/organizations/org-detail-measures"
import { calculateDistanceMiles, formatLocation } from "@/lib/organizations/search"
import type { SupabaseClient } from "@supabase/supabase-js"

const PAGE_SIZE = 1000
const MAX_SCAN = 120_000

/** Add Average_Daily_Census here if your `organizations` table includes it (quoted if the name has spaces). */
const ORG_SELECT =
  'ID,"CMS Certification Number (CCN)","Facility Name","Address Line 1","City/Town",State,"ZIP Code","County/Parish","Telephone Number","CMS Region",latitude,longitude'

const MEASUREMENT_SELECT =
  '"CMS Certification Number (CCN)","Measure Code","Measure Name",Score,"Measure Date Range"'

const MEASUREMENTS_CCN_COLUMN = `"CMS Certification Number (CCN)"`
const CCN_BATCH_SIZE = 40

type RawOrgRow = {
  ID?: string | number
  "CMS Certification Number (CCN)"?: string | null
  "Facility Name"?: string | null
  "Address Line 1"?: string | null
  "City/Town"?: string | null
  State?: string | null
  "ZIP Code"?: string | number | null
  "County/Parish"?: string | null
  "Telephone Number"?: string | null
  "CMS Region"?: string | null
  latitude?: number | string | null
  longitude?: number | string | null
}

function parseCoord(value: unknown): number | null {
  if (value == null || value === "") return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string") {
    const n = Number(value.trim())
    return Number.isFinite(n) ? n : null
  }
  return null
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

function buildMeasurementsCcnOrFilter(ccns: string[]): string {
  return ccns
    .map((ccn) => {
      const v = String(ccn).replace(/\\/g, "\\\\").replace(/"/g, '\\"')
      return `${MEASUREMENTS_CCN_COLUMN}.eq."${v}"`
    })
    .join(",")
}

async function fetchAllOrgsWithCoords(supabase: SupabaseClient): Promise<RawOrgRow[]> {
  const out: RawOrgRow[] = []
  let from = 0
  while (from < MAX_SCAN) {
    const { data, error } = await supabase
      .from("organizations")
      .select(ORG_SELECT)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    const batch = (data ?? []) as RawOrgRow[]
    out.push(...batch)
    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return out
}

async function fetchMeasurementsForCcns(
  supabase: SupabaseClient,
  ccns: string[]
): Promise<Map<string, RawMeasurementRow[]>> {
  const unique = [...new Set(ccns.map((c) => normalizeCcnForMatch(c)).filter(Boolean))]
  if (unique.length === 0) return new Map()

  const all: RawMeasurementRow[] = []
  for (const batch of chunkArray(unique, CCN_BATCH_SIZE)) {
    const { data, error } = await supabase
      .from("measurements")
      .select(MEASUREMENT_SELECT)
      .or(buildMeasurementsCcnOrFilter(batch))
      .in("Measure Code", [...MATCH_MEASURE_CODES])

    if (error) throw new Error(error.message)
    all.push(...((data ?? []) as RawMeasurementRow[]))
  }
  return groupMeasurementsByCcn(all)
}

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
 * If `Average_Daily_Census` is not a column in your DB, remove it from ORG_SELECT above.
 */
export async function loadMatchCandidates(
  options: LoadMatchCandidatesOptions
): Promise<MatchOrganizationInput[]> {
  const { userLat, userLng, radiusMiles, maxOrganizations } = options
  const supabase = createServerSupabaseClient()

  const rawRows = await fetchAllOrgsWithCoords(supabase)

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
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i]
    const lat = parseCoord(row.latitude)
    const lng = parseCoord(row.longitude)
    if (lat == null || lng == null) continue
    const d = calculateDistanceMiles(userLat, userLng, lat, lng)
    if (d > radiusMiles) continue

    const street = String(row["Address Line 1"] ?? "").trim() || null
    const fullLocation = formatLocation({
      street,
      city: row["City/Town"] ?? null,
      state: row.State ?? null,
      zip:
        row["ZIP Code"] == null || row["ZIP Code"] === ""
          ? null
          : String(row["ZIP Code"]),
    })

    enriched.push({
      id: String(row.ID ?? `row-${i}`),
      name: row["Facility Name"]?.trim() || "Unknown organization",
      ccn: row["CMS Certification Number (CCN)"]?.trim() || null,
      fullLocation,
      phone: row["Telephone Number"]?.trim() || null,
      lat,
      lng,
      distanceMiles: d,
    })
  }

  enriched.sort((a, b) => a.distanceMiles - b.distanceMiles)
  const capped = enriched.slice(0, maxOrganizations)

  const ccns = capped.map((o) => o.ccn).filter((c): c is string => Boolean(c?.trim()))
  const byCcn = await fetchMeasurementsForCcns(supabase, ccns)

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

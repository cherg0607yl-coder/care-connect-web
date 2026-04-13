import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import {
  buildDetailMeasurementMap,
  groupMeasurementsByCcn,
  normalizeCcnForMatch,
  ORG_DETAIL_MEASURE_CODES,
  type RawMeasurementRow,
} from "@/lib/organizations/org-detail-measures"
import {
  calculateDistanceMiles,
  formatLocation,
  type OrganizationSearchResult,
  type OrganizationSearchRow,
} from "@/lib/organizations/search"
import type { SupabaseClient } from "@supabase/supabase-js"

function toSafeNumber(value: string | null, fallback: number): number {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return parsed
}

function clampRadiusMiles(value: string | null): number {
  const parsed = toSafeNumber(value, 15)
  return Math.min(100, Math.max(1, parsed))
}

function normalizeZip(value: string): string | null {
  const digits = value.replace(/\D/g, "")
  if (digits.length < 5) return null
  return digits.slice(0, 5)
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

type LatLng = { lat: number; lng: number }

function parseUserPoint(searchParams: URLSearchParams): LatLng | null {
  const lat = Number(searchParams.get("userLat"))
  const lng = Number(searchParams.get("userLng"))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

const ORG_COLUMNS =
  'ID,"CMS Certification Number (CCN)","Facility Name","Address Line 1","City/Town",State,"ZIP Code","County/Parish","Telephone Number","CMS Region",latitude,longitude'

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

type RowWithCoords = OrganizationSearchRow & { lat: number | null; lng: number | null }

const PAGE_SIZE = 1000
const MAX_SCAN_ROWS = 200_000

const MEASUREMENT_SELECT =
  '"CMS Certification Number (CCN)","Measure Code","Measure Name",Score,"Measure Date Range"'

const CCN_BATCH_SIZE = 40

/** PostgREST treats `(` in `.in("CMS Certification Number (CCN)", …)` as syntax, so the column name is truncated. Use `.or()` with quoted `.eq` clauses instead. */
const MEASUREMENTS_CCN_COLUMN = `"CMS Certification Number (CCN)"`

function buildMeasurementsCcnOrFilter(ccns: string[]): string {
  return ccns
    .map((ccn) => {
      const v = String(ccn).replace(/\\/g, "\\\\").replace(/"/g, '\\"')
      return `${MEASUREMENTS_CCN_COLUMN}.eq."${v}"`
    })
    .join(",")
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
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
      .in("Measure Code", [...ORG_DETAIL_MEASURE_CODES])

    if (error) throw new Error(error.message)
    all.push(...((data ?? []) as RawMeasurementRow[]))
  }
  return groupMeasurementsByCcn(all)
}

async function fetchOrganizationsPage(
  supabase: SupabaseClient,
  organizationName: string,
  userPoint: LatLng | null,
  from: number,
  to: number
) {
  let q = supabase.from("organizations").select(ORG_COLUMNS)
  if (organizationName) {
    q = q.ilike(
      "Facility Name",
      `%${organizationName.replace(/[%_]/g, "")}%`
    )
  }
  if (userPoint) {
    q = q.not("latitude", "is", null).not("longitude", "is", null)
  }
  q = q.order("Facility Name", { ascending: true })
  return q.range(from, to)
}

/** PostgREST returns an arbitrary slice without ORDER BY; a fixed range can miss every nearby row. */
async function fetchAllRelevantRows(
  supabase: SupabaseClient,
  organizationName: string,
  userPoint: LatLng | null,
  needsFullScan: boolean,
  fetchCap: number
): Promise<RawOrgRow[]> {
  if (!needsFullScan) {
    const { data, error } = await fetchOrganizationsPage(
      supabase,
      organizationName,
      userPoint,
      0,
      fetchCap - 1
    )
    if (error) throw new Error(error.message)
    return (data ?? []) as RawOrgRow[]
  }

  const out: RawOrgRow[] = []
  let from = 0
  while (from < MAX_SCAN_ROWS) {
    const { data, error } = await fetchOrganizationsPage(
      supabase,
      organizationName,
      userPoint,
      from,
      from + PAGE_SIZE - 1
    )
    if (error) throw new Error(error.message)
    const batch = (data ?? []) as RawOrgRow[]
    out.push(...batch)
    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return out
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const locationInput = (searchParams.get("location") ?? "").trim()
  const organizationName = (searchParams.get("organizationName") ?? "").trim()
  const locationNeedle = locationInput.toLowerCase()
  const zipInput = normalizeZip(locationInput)
  const limit = Math.min(50, Math.max(1, toSafeNumber(searchParams.get("limit"), 20)))
  const offset = Math.max(0, toSafeNumber(searchParams.get("offset"), 0))
  const requestedRadiusMiles = clampRadiusMiles(searchParams.get("radiusMiles"))

  const userPoint = parseUserPoint(searchParams)

  try {
    const supabase = createServerSupabaseClient()

    const needsFullScan =
      Boolean(userPoint) ||
      (Boolean(zipInput) && !userPoint) ||
      (Boolean(locationInput) && !zipInput && !userPoint) ||
      organizationName.length > 0

    const fetchCap = userPoint ? 5000 : zipInput ? 1500 : 800

    const rawRows = await fetchAllRelevantRows(
      supabase,
      organizationName,
      userPoint,
      needsFullScan,
      fetchCap
    )

    let rows: RowWithCoords[] = rawRows.map((row, index) => ({
      id: row.ID ?? `row-${index}`,
      name: row["Facility Name"] ?? "Unknown organization",
      street: String(row["Address Line 1"] ?? "").trim() || null,
      city: row["City/Town"] ?? null,
      state: row.State ?? null,
      zip:
        row["ZIP Code"] == null || row["ZIP Code"] === ""
          ? null
          : String(row["ZIP Code"]),
      ccn: row["CMS Certification Number (CCN)"] ?? null,
      county: row["County/Parish"] ?? null,
      phone: row["Telephone Number"] ?? null,
      cmsRegion: row["CMS Region"] ?? null,
      lat: parseCoord(row.latitude),
      lng: parseCoord(row.longitude),
    }))

    if (zipInput && !userPoint) {
      rows = rows.filter((row) => {
        const rowZip = (row.zip ?? "").replace(/\D/g, "")
        return rowZip.startsWith(zipInput)
      })
    }

    if (locationInput && !zipInput && !userPoint) {
      rows = rows.filter((row) => {
        const haystack = [
          row.street ?? "",
          row.city ?? "",
          row.state ?? "",
          row.zip ?? "",
          row.county ?? "",
        ]
          .join(" ")
          .toLowerCase()
        return haystack.includes(locationNeedle)
      })
    }

    const enriched = rows.map((row) => {
      const { lat, lng, ...rest } = row
      const fullLocation = formatLocation(rest)
      let distanceMiles: number | null = null
      if (userPoint && lat != null && lng != null) {
        distanceMiles = calculateDistanceMiles(userPoint.lat, userPoint.lng, lat, lng)
      }
      return {
        ...rest,
        fullLocation,
        distanceMiles,
        latitude: lat,
        longitude: lng,
      }
    })

    if (userPoint) {
      enriched.sort((a, b) => {
        if (a.distanceMiles == null && b.distanceMiles == null) {
          return a.name.localeCompare(b.name)
        }
        if (a.distanceMiles == null) return 1
        if (b.distanceMiles == null) return -1
        return a.distanceMiles - b.distanceMiles
      })
    } else {
      enriched.sort((a, b) => a.name.localeCompare(b.name))
    }

    let displayRows = enriched
    let appliedRadiusMiles: number | null = null
    let wasAutoExpanded = false

    if (userPoint) {
      let currentRadius = requestedRadiusMiles
      appliedRadiusMiles = currentRadius
      displayRows = enriched.filter(
        (row) => row.distanceMiles != null && row.distanceMiles <= currentRadius
      )

      if (displayRows.length < 5 && currentRadius < 30) {
        currentRadius = 30
        appliedRadiusMiles = currentRadius
        wasAutoExpanded = true
        displayRows = enriched.filter(
          (row) => row.distanceMiles != null && row.distanceMiles <= currentRadius
        )
      }
    }

    const paged = displayRows.slice(offset, offset + limit)

    let measurementsByCcn: Map<string, RawMeasurementRow[]> = new Map()
    let measurementsLoadError: string | null = null
    try {
      const ccnList = paged
        .map((row) => row.ccn)
        .filter((ccn): ccn is string => Boolean(ccn?.trim()))
      measurementsByCcn = await fetchMeasurementsForCcns(supabase, ccnList)
    } catch (err) {
      measurementsByCcn = new Map()
      measurementsLoadError =
        err instanceof Error ? err.message : "Measurements query failed"
    }

    const organizations: OrganizationSearchResult["organizations"] = paged.map((org) => ({
      ...org,
      detailMeasurements: buildDetailMeasurementMap(org.ccn, measurementsByCcn),
    }))

    const payload: OrganizationSearchResult = {
      organizations,
      totalCount: displayRows.length,
      limit,
      offset,
      appliedRadiusMiles,
      wasAutoExpanded,
      measurementsLoadError,
    }

    return NextResponse.json(payload)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to run organization search"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

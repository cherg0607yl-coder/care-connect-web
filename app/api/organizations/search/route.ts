import { NextResponse } from "next/server"
import {
  getAllOrganizations,
  getMeasurementsForCcns,
  getOrganizationsWithCoords,
  type CachedOrganization,
} from "@/lib/cms"
import {
  buildDetailMeasurementMap,
  ORG_DETAIL_MEASURE_CODES,
  type RawMeasurementRow,
} from "@/lib/organizations/org-detail-measures"
import {
  calculateDistanceMiles,
  formatLocation,
  type OrganizationSearchResult,
  type OrganizationSearchRow,
} from "@/lib/organizations/search"

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

type LatLng = { lat: number; lng: number }

function parseUserPoint(searchParams: URLSearchParams): LatLng | null {
  const lat = Number(searchParams.get("userLat"))
  const lng = Number(searchParams.get("userLng"))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

type RowWithCoords = OrganizationSearchRow & { lat: number | null; lng: number | null }

function toSearchRow(org: CachedOrganization): RowWithCoords {
  return {
    id: org.id,
    name: org.name,
    street: org.addressLine1,
    city: org.city,
    state: org.state,
    zip: org.zip,
    ccn: org.ccn,
    county: org.county,
    phone: org.phone,
    cmsRegion: org.cmsRegion,
    lat: org.latitude,
    lng: org.longitude,
  }
}

function filterOrganizations(options: {
  organizationName: string
  userPoint: LatLng | null
}): CachedOrganization[] {
  const nameNeedle = options.organizationName.trim().toLowerCase()
  const source = options.userPoint
    ? getOrganizationsWithCoords()
    : getAllOrganizations()

  if (!nameNeedle) return source

  return source.filter((org) => org.name.toLowerCase().includes(nameNeedle))
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
    let rows: RowWithCoords[] = filterOrganizations({
      organizationName,
      userPoint,
    }).map(toSearchRow)

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
      measurementsByCcn = getMeasurementsForCcns(ccnList, ORG_DETAIL_MEASURE_CODES)
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

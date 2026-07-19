import type { OrganizationDetailMeasurements } from "@/lib/organizations/org-detail-measures"

export type OrganizationSearchRow = {
  id: string | number
  name: string
  street: string | null
  city: string | null
  state: string | null
  zip: string | null
  ccn: string | null
  county: string | null
  phone: string | null
  cmsRegion: string | null
}

export type OrganizationSearchResult = {
  organizations: Array<
    OrganizationSearchRow & {
      fullLocation: string
      distanceMiles: number | null
      /** Census / geocoded coordinates when present; used for map markers. */
      latitude: number | null
      longitude: number | null
      detailMeasurements: OrganizationDetailMeasurements
    }
  >
  totalCount: number
  limit: number
  offset: number
  appliedRadiusMiles: number | null
  wasAutoExpanded: boolean
  /** Set when quality measures cannot be loaded from the CMS cache. */
  measurementsLoadError: string | null
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180
}

export function calculateDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const earthRadiusMiles = 3958.8
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusMiles * c
}

export function formatLocation(row: {
  street: string | null
  city: string | null
  state: string | null
  zip: string | null
}): string {
  return [row.street, row.city, row.state, row.zip].filter(Boolean).join(", ")
}

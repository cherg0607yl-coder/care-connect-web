import { loadCmsCache } from "@/lib/cms/cache"
import type { CachedMeasurement, CachedOrganization } from "@/lib/cms/types"
import {
  groupMeasurementsByCcn,
  normalizeCcnForMatch,
  type RawMeasurementRow,
} from "@/lib/organizations/org-detail-measures"
import type { RawCompareOrganizationRow } from "@/lib/compare/types"

export function getAllOrganizations(): CachedOrganization[] {
  return loadCmsCache().organizations
}

export function getOrganizationsWithCoords(): CachedOrganization[] {
  return getAllOrganizations().filter(
    (org) => org.latitude != null && org.longitude != null
  )
}

export function getOrganizationsByIds(ids: string[]): CachedOrganization[] {
  const wanted = new Set(ids)
  return getAllOrganizations().filter((org) => wanted.has(org.id))
}

function cachedMeasurementToRaw(
  ccn: string,
  measureCode: string,
  m: CachedMeasurement
): RawMeasurementRow {
  return {
    "CMS Certification Number (CCN)": ccn,
    "Measure Code": measureCode,
    "Measure Name": m.measureName,
    Score: m.score,
    "Measure Date Range": m.measureDateRange,
  }
}

/**
 * Return measurement rows for the given CCNs, optionally filtered to measure codes.
 */
export function getMeasurementsForCcns(
  ccns: string[],
  measureCodes?: readonly string[]
): Map<string, RawMeasurementRow[]> {
  const { measurementsByCcn } = loadCmsCache()
  const codeSet = measureCodes ? new Set(measureCodes) : null
  const rows: RawMeasurementRow[] = []

  const unique = [
    ...new Set(ccns.map((c) => normalizeCcnForMatch(c)).filter(Boolean)),
  ]

  for (const ccn of unique) {
    const byCode = measurementsByCcn[ccn]
    if (!byCode) continue
    for (const [code, measurement] of Object.entries(byCode)) {
      if (codeSet && !codeSet.has(code)) continue
      rows.push(cachedMeasurementToRaw(ccn, code, measurement))
    }
  }

  return groupMeasurementsByCcn(rows)
}

/** Adapt a cached org into the legacy compare raw-row shape used by mapRow. */
export function toRawCompareOrganizationRow(
  org: CachedOrganization
): RawCompareOrganizationRow {
  return {
    ID: org.id,
    "CMS Certification Number (CCN)": org.ccn,
    "Facility Name": org.name,
    "Address Line 1": org.addressLine1,
    "City/Town": org.city,
    State: org.state,
    "ZIP Code": org.zip,
    "Telephone Number": org.phone,
    "Ownership Type": org.ownershipType,
    "Certification Date": org.certificationDate,
  }
}

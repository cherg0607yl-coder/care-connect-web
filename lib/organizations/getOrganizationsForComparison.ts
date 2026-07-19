import { COMPARE_MEASURE_CODES } from "@/lib/compare/config"
import { mapRawToComparisonOrganization } from "@/lib/compare/mapRow"
import type { ComparisonOrganization } from "@/lib/compare/types"
import {
  getMeasurementsForCcns,
  getOrganizationsByIds,
  toRawCompareOrganizationRow,
} from "@/lib/cms"
import {
  latestByMeasureCode,
  normalizeCcnForMatch,
  type RawMeasurementRow,
} from "@/lib/organizations/org-detail-measures"

function scoresFromRows(rows: RawMeasurementRow[]): Partial<
  Record<(typeof COMPARE_MEASURE_CODES)[number], string | null>
> {
  const latest = latestByMeasureCode(rows)
  const out: Partial<Record<(typeof COMPARE_MEASURE_CODES)[number], string | null>> = {}
  for (const code of COMPARE_MEASURE_CODES) {
    const row = latest.get(code)
    if (!row) continue
    const score = row.Score
    if (score == null || score === "") {
      out[code] = null
    } else {
      out[code] = String(score).trim() || null
    }
  }
  return out
}

/**
 * Fetch organizations by id (CCN) in the order of `orderedIds`.
 * Returns only rows that exist; caller may check length vs requested.
 */
export async function getOrganizationsForComparison(
  orderedIds: string[]
): Promise<ComparisonOrganization[]> {
  if (orderedIds.length === 0) return []

  const rows = getOrganizationsByIds(orderedIds)
  const byId = new Map(rows.map((org) => [org.id, org]))

  const ccns = rows.map((r) => r.ccn).filter((c) => Boolean(c?.trim()))
  const measurementsByCcn = getMeasurementsForCcns(ccns, COMPARE_MEASURE_CODES)

  const out: ComparisonOrganization[] = []
  for (const id of orderedIds) {
    const org = byId.get(id)
    if (!org) continue
    const ccn = normalizeCcnForMatch(org.ccn)
    const facilityRows = ccn ? measurementsByCcn.get(ccn) ?? [] : []
    const measureScores = scoresFromRows(facilityRows)
    out.push(
      mapRawToComparisonOrganization(toRawCompareOrganizationRow(org), measureScores)
    )
  }

  return out
}

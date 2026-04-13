import { createServerSupabaseClient } from "@/lib/supabase/server"
import { COMPARE_MEASURE_CODES } from "@/lib/compare/config"
import { mapRawToComparisonOrganization } from "@/lib/compare/mapRow"
import type { ComparisonOrganization, RawCompareOrganizationRow } from "@/lib/compare/types"
import {
  latestByMeasureCode,
  normalizeCcnForMatch,
  type RawMeasurementRow,
} from "@/lib/organizations/org-detail-measures"

/**
 * Comma-separated columns for `organizations` compare view.
 * If Supabase errors on unknown columns, adjust names here (e.g. quoted CMS-style titles).
 */
export const COMPARE_ORGANIZATION_SELECT = [
  "ID",
  '"CMS Certification Number (CCN)"',
  '"Facility Name"',
  '"Address Line 1"',
  '"City/Town"',
  "State",
  '"ZIP Code"',
  '"Telephone Number"',
  '"Ownership Type"',
  '"Certification Date"',
].join(",")

const MEASUREMENT_SELECT =
  '"CMS Certification Number (CCN)","Measure Code","Measure Name",Score,"Measure Date Range"'

const MEASUREMENTS_CCN_COLUMN = `"CMS Certification Number (CCN)"`
const CCN_BATCH_SIZE = 40

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

async function fetchMeasurementsForCcns(ccns: string[]): Promise<Map<string, RawMeasurementRow[]>> {
  const supabase = createServerSupabaseClient()
  const unique = [...new Set(ccns.map((c) => normalizeCcnForMatch(c)).filter(Boolean))]
  if (unique.length === 0) return new Map()

  const all: RawMeasurementRow[] = []
  for (const batch of chunkArray(unique, CCN_BATCH_SIZE)) {
    const { data, error } = await supabase
      .from("measurements")
      .select(MEASUREMENT_SELECT)
      .or(buildMeasurementsCcnOrFilter(batch))
      .in("Measure Code", [...COMPARE_MEASURE_CODES])

    if (error) throw new Error(error.message)
    all.push(...((data ?? []) as RawMeasurementRow[]))
  }

  const map = new Map<string, RawMeasurementRow[]>()
  for (const row of all) {
    const ccn = normalizeCcnForMatch(String(row["CMS Certification Number (CCN)"] ?? ""))
    if (!ccn) continue
    const list = map.get(ccn)
    if (list) list.push(row)
    else map.set(ccn, [row])
  }
  return map
}

/**
 * Fetch organizations by primary key `ID` in the order of `orderedIds`.
 * Returns only rows that exist; caller may check length vs requested.
 */
export async function getOrganizationsForComparison(
  orderedIds: string[]
): Promise<ComparisonOrganization[]> {
  if (orderedIds.length === 0) return []

  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("organizations")
    .select(COMPARE_ORGANIZATION_SELECT)
    .in("ID", orderedIds)

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as RawCompareOrganizationRow[]
  const byId = new Map<string, RawCompareOrganizationRow>()
  for (const row of rows) {
    const id = row.ID == null ? "" : String(row.ID)
    if (id) byId.set(id, row)
  }

  const ccns = rows
    .map((r) => r["CMS Certification Number (CCN)"])
    .filter((c): c is string => Boolean(c && String(c).trim()))

  const measurementsByCcn = await fetchMeasurementsForCcns(ccns)

  const out: ComparisonOrganization[] = []
  for (const id of orderedIds) {
    const raw = byId.get(id)
    if (!raw) continue
    const ccn = normalizeCcnForMatch(String(raw["CMS Certification Number (CCN)"] ?? ""))
    const facilityRows = ccn ? measurementsByCcn.get(ccn) ?? [] : []
    const measureScores = scoresFromRows(facilityRows)
    out.push(mapRawToComparisonOrganization(raw, measureScores))
  }

  return out
}

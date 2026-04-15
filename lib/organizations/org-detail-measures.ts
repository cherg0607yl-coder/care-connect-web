export type RawMeasurementRow = {
  "CMS Certification Number (CCN)"?: string | null
  "Measure Code"?: string | null
  "Measure Name"?: string | null
  Score?: string | number | null
  "Measure Date Range"?: string | null
  measure_date?: string | null
  "Measure Date"?: string | null
}

export function rawMeasureDate(row: RawMeasurementRow): string | null {
  const v = row["Measure Date Range"] ?? row.measure_date ?? row["Measure Date"]
  if (v == null || v === "") return null
  return String(v)
}

export type DetailMeasureValue = {
  scoreDisplay: string
  measureName: string | null
  measureDate: string | null
}

export type OrganizationDetailMeasurements = Record<string, DetailMeasureValue>

export function normalizeCcnForMatch(raw: string | null | undefined): string {
  if (raw == null || raw === "") return ""
  let s = String(raw).trim()
  if (s === "") return ""
  if (/^\d+\.0+$/.test(s)) {
    s = s.replace(/\.\d+$/, "")
  }
  if (/^\d+$/.test(s) && s.length > 0 && s.length < 6) {
    return s.padStart(6, "0")
  }
  return s
}

/** All measure codes loaded for the detail modal (conditions, location of care, levels). */
export const ORG_DETAIL_MEASURE_CODES = [
  "Pct_Pts_w_Cancer",
  "Pct_Pts_w_Dementia",
  "Pct_Pts_w_Stroke",
  "Pct_Pts_w_Circ_Heart_Disease",
  "Pct_Pts_w_Resp_Disease",
  "Pct_Pts_w_other_conditions",
  "Care_Provided_Home",
  "Care_Provided_Assisted_Living",
  "Care_Provided_Nursing_Facility",
  "Care_Provided_Skilled_Nursing",
  "Care_Provided_Inpatient_Hospital",
  "Care_Provided_Inpatient_Hospice",
  "Care_Provided_other_locations",
  "Provided_Home_Care_only",
  "Provided_Home_Care_and_other",
] as const

function measureDateSortKeyFromRow(row: RawMeasurementRow): number {
  const v = rawMeasureDate(row)
  if (v == null) return 0
  const t = Date.parse(v)
  return Number.isFinite(t) ? t : 0
}

export function scoreToDisplay(score: unknown): string {
  if (score == null || score === "") return "—"
  return String(score).trim() || "—"
}

export function latestByMeasureCode(rows: RawMeasurementRow[]): Map<string, RawMeasurementRow> {
  const map = new Map<string, RawMeasurementRow>()
  for (const row of rows) {
    const code = String(row["Measure Code"] ?? "").trim()
    if (!code) continue
    const prev = map.get(code)
    if (!prev || measureDateSortKeyFromRow(row) > measureDateSortKeyFromRow(prev)) {
      map.set(code, row)
    }
  }
  return map
}

export function groupMeasurementsByCcn(rows: RawMeasurementRow[]): Map<string, RawMeasurementRow[]> {
  const map = new Map<string, RawMeasurementRow[]>()
  for (const row of rows) {
    const ccn = normalizeCcnForMatch(String(row["CMS Certification Number (CCN)"] ?? ""))
    if (!ccn) continue
    const list = map.get(ccn)
    if (list) list.push(row)
    else map.set(ccn, [row])
  }
  return map
}

function emptyValue(): DetailMeasureValue {
  return { scoreDisplay: "—", measureName: null, measureDate: null }
}

export function buildDetailMeasurementMap(
  ccn: string | null,
  rowsByCcn: Map<string, RawMeasurementRow[]>
): OrganizationDetailMeasurements {
  const key = ccn?.trim() ?? ""
  const out: OrganizationDetailMeasurements = {}
  for (const code of ORG_DETAIL_MEASURE_CODES) {
    out[code] = emptyValue()
  }
  const lookupKey = normalizeCcnForMatch(key)
  if (!lookupKey) return out

  const facilityRows = rowsByCcn.get(lookupKey) ?? []
  const latest = latestByMeasureCode(facilityRows)

  for (const code of ORG_DETAIL_MEASURE_CODES) {
    const row = latest.get(code)
    if (!row) continue
    out[code] = {
      scoreDisplay: scoreToDisplay(row.Score),
      measureName: row["Measure Name"] != null ? String(row["Measure Name"]) : null,
      measureDate: rawMeasureDate(row),
    }
  }
  return out
}

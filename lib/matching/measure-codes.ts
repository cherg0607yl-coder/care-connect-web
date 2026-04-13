import { ORG_DETAIL_MEASURE_CODES } from "@/lib/organizations/org-detail-measures"

/**
 * V1 metric set (what we use vs defer):
 *
 * **Included — fit (from ORG_DETAIL_MEASURE_CODES):** All `Pct_Pts_w_*` for condition mix,
 * all `Care_Provided_*` for location-of-care fit, `Provided_Home_Care_only` /
 * `Provided_Home_Care_and_other` for intensity capability. These align with questionnaire
 * answers and are easy to explain.
 *
 * **Included — quality (H_* codes below):** Hospice Care Index overall (`H_012_00_OBSERVED`),
 * visits late in life (`H_011_01_OBSERVED`), composite process (`H_008_01_OBSERVED`, lighter
 * weight), visits near death (`H_012_10_OBSERVED`), staffing proxies (`H_012_08`, `H_012_09`),
 * CHC/GIP days (`H_012_01`), plus two lower-is-better measures with caps (`H_012_02`,
 * `H_012_05`) so outliers don’t dominate.
 *
 * **Deferred for V2:** H_001–H_007 process measures, H_012_03/04/06, finer census modeling,
 * and ML — keeps V1 transparent and maintainable.
 *
 * V1 quality / process measures (exact `Measure Code` values in Supabase `measurements`).
 * Higher-is-better unless listed in LOWER_IS_BETTER_QUALITY_CODES.
 */
export const MATCH_QUALITY_HIGHER_CODES = [
  "H_012_00_OBSERVED", // Hospice Care Index overall (0–10 scale in source)
  "H_011_01_OBSERVED", // Visits in last days of life
  "H_008_01_OBSERVED", // Composite process (lighter weight in scoring)
  "H_012_10_OBSERVED", // Visits near death
  "H_012_08_OBSERVED", // Nurse minutes / routine home care day
  "H_012_09_OBSERVED", // Skilled nursing minutes weekends
  "H_012_01_OBSERVED", // CHC/GIP % days
] as const

/** V1: two lower-is-better metrics with capped inversion (avoid noise from 03,04,06 until V2). */
export const MATCH_QUALITY_LOWER_CODES = [
  "H_012_02_OBSERVED", // Gaps in nursing visits
  "H_012_05_OBSERVED", // Burdensome transitions type 1
] as const

export const MATCH_MEASURE_CODES = [
  ...ORG_DETAIL_MEASURE_CODES,
  ...MATCH_QUALITY_HIGHER_CODES,
  ...MATCH_QUALITY_LOWER_CODES,
] as const

export type MatchMeasureCode = (typeof MATCH_MEASURE_CODES)[number]

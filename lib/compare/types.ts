/**
 * Comparison feature types.
 * Field keys for measurements match CMS Provider Data `measure_code` values.
 */

/** One organization the user selected to compare (search results UI). */
export type CompareSelectionItem = {
  id: string
  name: string
}

/** Single cell value after normalization (always safe to render). */
export type CompareDisplayValue = {
  display: string
  /** True when source data was missing or unparsable. */
  isMissing: boolean
}

/** Normalized org row for the comparison table. */
export type ComparisonOrganization = {
  id: string
  name: string
  fullLocation: string
  phone: string | null
  ccn: string | null
  overview: {
    ownershipType: CompareDisplayValue
    medicareCertificationDate: CompareDisplayValue
  }
  /** Latest measurement scores by `Measure Code` (raw string from CMS-style data). */
  measureScores: Partial<Record<CompareMeasureCode, string | null>>
}

/** Measure codes used on the compare page (subset of detail modal codes). */
export type CompareMeasureCode =
  | "Pct_Pts_w_Cancer"
  | "Pct_Pts_w_Dementia"
  | "Pct_Pts_w_Stroke"
  | "Pct_Pts_w_Circ_Heart_Disease"
  | "Pct_Pts_w_Resp_Disease"
  | "Pct_Pts_w_other_conditions"
  | "Care_Provided_Home"
  | "Care_Provided_Assisted_Living"
  | "Care_Provided_Nursing_Facility"
  | "Care_Provided_Skilled_Nursing"
  | "Care_Provided_Inpatient_Hospital"
  | "Care_Provided_Inpatient_Hospice"
  | "Care_Provided_other_locations"
  | "Provided_Home_Care_only"
  | "Provided_Home_Care_and_other"

/** Legacy CMS-shaped org row used by `mapRawToComparisonOrganization`. */
export type RawCompareOrganizationRow = {
  ID?: string | number | null
  "CMS Certification Number (CCN)"?: string | null
  "Facility Name"?: string | null
  "Address Line 1"?: string | null
  "City/Town"?: string | null
  State?: string | null
  "ZIP Code"?: string | number | null
  "Telephone Number"?: string | null
  "Ownership Type"?: string | null
  "Certification Date"?: string | null
}

export type CompareFieldFormat = "percent" | "yesNo" | "text" | "date"

export type CompareFieldConfig = {
  /** Stable key; for measurements this equals `Measure Code`. */
  key: string
  label: string
  format: CompareFieldFormat
}

export type CompareSectionConfig = {
  id: string
  title: string
  description?: string
  fields: CompareFieldConfig[]
}

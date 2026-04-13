import type { CompareMeasureCode, CompareSectionConfig } from "@/lib/compare/types"

/**
 * Central list of measure codes loaded for comparison (must match `Measure Code` in Supabase).
 * Used by the Supabase query so we do not fetch unused rows.
 */
export const COMPARE_MEASURE_CODES: readonly CompareMeasureCode[] = [
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

/** Sections and labels — edit here to add quality metrics later. */
export const COMPARE_SECTIONS: CompareSectionConfig[] = [
  {
    id: "conditions",
    title: "Conditions treated",
    fields: [
      { key: "Pct_Pts_w_Cancer", label: "Cancer", format: "percent" },
      { key: "Pct_Pts_w_Dementia", label: "Dementia", format: "percent" },
      { key: "Pct_Pts_w_Stroke", label: "Stroke", format: "percent" },
      {
        key: "Pct_Pts_w_Circ_Heart_Disease",
        label: "Circulatory/Heart disease",
        format: "percent",
      },
      {
        key: "Pct_Pts_w_Resp_Disease",
        label: "Respiratory disease",
        format: "percent",
      },
      {
        key: "Pct_Pts_w_other_conditions",
        label: "Other conditions",
        format: "percent",
      },
    ],
  },
  {
    id: "location-of-care",
    title: "Location of care",
    fields: [
      { key: "Care_Provided_Home", label: "Home", format: "percent" },
      {
        key: "Care_Provided_Assisted_Living",
        label: "Assisted living facility",
        format: "percent",
      },
      {
        key: "Care_Provided_Nursing_Facility",
        label: "Nursing facility",
        format: "percent",
      },
      {
        key: "Care_Provided_Skilled_Nursing",
        label: "Skilled nursing facility",
        format: "percent",
      },
      {
        key: "Care_Provided_Inpatient_Hospital",
        label: "Inpatient hospital facility",
        format: "percent",
      },
      {
        key: "Care_Provided_Inpatient_Hospice",
        label: "Inpatient hospice facility",
        format: "percent",
      },
      {
        key: "Care_Provided_other_locations",
        label: "Other locations",
        format: "percent",
      },
    ],
  },
  {
    id: "level-of-care",
    title: "Level of care provided",
    description:
      "All Medicare-certified hospices are required to offer 4 levels of hospice care depending on patient and caregiver needs.",
    fields: [
      {
        key: "Provided_Home_Care_only",
        label: "Provided routine home care only",
        format: "yesNo",
      },
      {
        key: "Provided_Home_Care_and_other",
        label: "Provided routine home care and at least one other level of care",
        format: "yesNo",
      },
    ],
  },
]

export const MAX_COMPARE_SELECTION = 3
export const MIN_COMPARE_URL = 2

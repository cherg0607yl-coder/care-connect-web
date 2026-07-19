import type { CareSettingPreference, PrimaryCondition } from "@/lib/matching/types"

/** Maps questionnaire condition → `Pct_Pts_w_*` CMS measure code. */
export function conditionToPctMeasure(condition: PrimaryCondition): string | null {
  switch (condition) {
    case "cancer":
      return "Pct_Pts_w_Cancer"
    case "dementia":
      return "Pct_Pts_w_Dementia"
    case "stroke":
      return "Pct_Pts_w_Stroke"
    case "heart":
      return "Pct_Pts_w_Circ_Heart_Disease"
    case "respiratory":
      return "Pct_Pts_w_Resp_Disease"
    case "other":
      return "Pct_Pts_w_other_conditions"
    case "not_sure":
      return null
    default:
      return null
  }
}

/** For “not sure” — blend these % measures with equal weight among those present. */
export const CONDITION_BLEND_CODES = [
  "Pct_Pts_w_Cancer",
  "Pct_Pts_w_Dementia",
  "Pct_Pts_w_Stroke",
  "Pct_Pts_w_Circ_Heart_Disease",
  "Pct_Pts_w_Resp_Disease",
  "Pct_Pts_w_other_conditions",
] as const

/** Maps preferred care location → `Care_Provided_*` measure code. */
export function settingToCareMeasure(setting: CareSettingPreference): string | null {
  switch (setting) {
    case "home":
      return "Care_Provided_Home"
    case "assisted_living":
      return "Care_Provided_Assisted_Living"
    case "nursing_facility":
      return "Care_Provided_Nursing_Facility"
    case "skilled_nursing":
      return "Care_Provided_Skilled_Nursing"
    case "hospital":
      return "Care_Provided_Inpatient_Hospital"
    case "inpatient_hospice":
      return "Care_Provided_Inpatient_Hospice"
    case "not_sure":
      return null
    default:
      return null
  }
}

export const SETTING_BLEND_CODES = [
  "Care_Provided_Home",
  "Care_Provided_Assisted_Living",
  "Care_Provided_Nursing_Facility",
  "Care_Provided_Skilled_Nursing",
  "Care_Provided_Inpatient_Hospital",
  "Care_Provided_Inpatient_Hospice",
  "Care_Provided_other_locations",
] as const

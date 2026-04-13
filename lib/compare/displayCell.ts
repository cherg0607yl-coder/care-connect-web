import type { CompareFieldFormat } from "@/lib/compare/types"
import type { ComparisonOrganization } from "@/lib/compare/types"
import {
  formatDate,
  formatPercentage,
  formatText,
  formatYesNo,
  notAvailable,
} from "@/lib/compare/format"

/**
 * Resolve a formatted cell for overview fields (not from measurements table).
 */
export function displayOverviewField(
  org: ComparisonOrganization,
  key: "Ownership_Type" | "Medicare_Certification_Date"
): ReturnType<typeof formatText> {
  if (key === "Ownership_Type") return org.overview.ownershipType
  return org.overview.medicareCertificationDate
}

/** Format a measurement field using the section field format. */
export function displayMeasureField(
  org: ComparisonOrganization,
  measureKey: string,
  format: CompareFieldFormat
) {
  const raw = org.measureScores[measureKey as keyof typeof org.measureScores]

  switch (format) {
    case "percent":
      return formatPercentage(raw ?? null)
    case "yesNo":
      return formatYesNo(raw ?? null)
    case "date":
      return formatDate(raw ?? null)
    case "text":
    default:
      return raw != null && String(raw).trim() !== ""
        ? formatText(String(raw))
        : notAvailable()
  }
}

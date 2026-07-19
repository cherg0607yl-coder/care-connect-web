import { formatLocation } from "@/lib/organizations/search"
import type {
  CompareDisplayValue,
  CompareMeasureCode,
  ComparisonOrganization,
  RawCompareOrganizationRow,
} from "@/lib/compare/types"
import { formatDate, formatOrganizationName, formatText } from "@/lib/compare/format"

function idToString(id: string | number | null | undefined, fallback: string): string {
  if (id == null || id === "") return fallback
  return String(id)
}

/**
 * Map a CMS-shaped organization row + latest measure scores into `ComparisonOrganization`.
 */
export function mapRawToComparisonOrganization(
  raw: RawCompareOrganizationRow,
  measureScores: Partial<Record<CompareMeasureCode, string | null>>
): ComparisonOrganization {
  const id = idToString(raw.ID, "")
  const name = formatOrganizationName(raw["Facility Name"])

  const fullLocation = formatLocation({
    street: raw["Address Line 1"] ? String(raw["Address Line 1"]).trim() || null : null,
    city: raw["City/Town"] ?? null,
    state: raw.State ?? null,
    zip:
      raw["ZIP Code"] == null || raw["ZIP Code"] === ""
        ? null
        : String(raw["ZIP Code"]),
  })

  const ownershipType: CompareDisplayValue = formatText(raw["Ownership Type"])
  const medicareCertificationDate: CompareDisplayValue = formatDate(
    raw["Certification Date"]
  )

  const ccn =
    raw["CMS Certification Number (CCN)"] == null ||
    String(raw["CMS Certification Number (CCN)"]).trim() === ""
      ? null
      : String(raw["CMS Certification Number (CCN)"]).trim()

  const phone =
    raw["Telephone Number"] == null || String(raw["Telephone Number"]).trim() === ""
      ? null
      : String(raw["Telephone Number"]).trim()

  return {
    id,
    name,
    fullLocation,
    phone,
    ccn,
    overview: {
      ownershipType,
      medicareCertificationDate,
    },
    measureScores: { ...measureScores },
  }
}

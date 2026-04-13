import type { CompareDisplayValue } from "@/lib/compare/types"

const NOT_AVAILABLE = "Not available"

export function notAvailable(): CompareDisplayValue {
  return { display: NOT_AVAILABLE, isMissing: true }
}

export function formatAsDisplay(
  display: string,
  isMissing: boolean
): CompareDisplayValue {
  return { display, isMissing }
}

/** Normalize organization display name. */
export function formatOrganizationName(raw: string | null | undefined): string {
  const s = raw?.trim()
  return s && s.length > 0 ? s : "Unknown organization"
}

/**
 * Format percentage-like CMS scores: may be "12.3", "12.3%", or text.
 */
export function formatPercentage(raw: string | null | undefined): CompareDisplayValue {
  if (raw == null) return notAvailable()
  const s = String(raw).trim()
  if (s === "" || s === "—" || s.toLowerCase() === "n/a") return notAvailable()

  if (/%\s*$/.test(s)) {
    return formatAsDisplay(s.replace(/\s+/g, ""), false)
  }

  const n = Number(s.replace(/%/g, "").trim())
  if (Number.isFinite(n)) {
    return formatAsDisplay(`${n}%`, false)
  }

  return formatAsDisplay(s, false)
}

/** Yes/No from common CMS string variants. */
export function formatYesNo(raw: string | null | undefined): CompareDisplayValue {
  if (raw == null) return notAvailable()
  const s = String(raw).trim()
  if (s === "" || s === "—" || s.toLowerCase() === "n/a") return notAvailable()

  const lower = s.toLowerCase()
  if (
    lower === "y" ||
    lower === "yes" ||
    lower === "true" ||
    lower === "1" ||
    lower === "100%"
  ) {
    return formatAsDisplay("Yes", false)
  }
  if (lower === "n" || lower === "no" || lower === "false" || lower === "0" || lower === "0%") {
    return formatAsDisplay("No", false)
  }

  // Unknown token — show as-is rather than hiding data
  return formatAsDisplay(s, false)
}

/** Plain text field (ownership, etc.). */
export function formatText(raw: string | null | undefined): CompareDisplayValue {
  if (raw == null) return notAvailable()
  const s = String(raw).trim()
  if (s === "" || s === "—") return notAvailable()
  return formatAsDisplay(s, false)
}

/** Best-effort date display. */
export function formatDate(raw: string | null | undefined): CompareDisplayValue {
  if (raw == null) return notAvailable()
  const s = String(raw).trim()
  if (s === "" || s === "—") return notAvailable()

  const t = Date.parse(s)
  if (Number.isFinite(t)) {
    try {
      return formatAsDisplay(
        new Intl.DateTimeFormat(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        }).format(new Date(t)),
        false
      )
    } catch {
      return formatAsDisplay(s, false)
    }
  }

  return formatAsDisplay(s, false)
}

/**
 * Parse CMS-style scores and normalize to [0, 1].
 * Missing → null (never treated as zero in callers).
 */

const PERCENT_STRIP = /%/g

export function parseNumeric(raw: string | null | undefined): number | null {
  if (raw == null) return null
  const s = String(raw).trim().replace(PERCENT_STRIP, "")
  if (s === "" || s === "—" || s.toLowerCase() === "n/a") return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** Typical 0–100 style measure → 0–1, capped at `cap` for robustness. */
export function normalizeHigherBetter(
  raw: string | null | undefined,
  cap = 100
): number | null {
  const n = parseNumeric(raw)
  if (n == null) return null
  const c = Math.max(cap, 1)
  return Math.max(0, Math.min(1, n / c))
}

/** Hospice Care Index overall is reported on a 0–10 style scale in many files. */
export function normalizeHospiceCareIndex(raw: string | null | undefined): number | null {
  const n = parseNumeric(raw)
  if (n == null) return null
  return Math.max(0, Math.min(1, n / 10))
}

/**
 * Lower raw is better (e.g. % gaps). Map to 0–1 where low values → high score.
 * `cap` = value at which score hits 0 (plateau).
 */
export function normalizeLowerBetter(
  raw: string | null | undefined,
  cap: number
): number | null {
  const n = parseNumeric(raw)
  if (n == null) return null
  const c = Math.max(cap, 1e-6)
  const inv = 1 - Math.min(1, Math.max(0, n) / c)
  return Math.max(0, Math.min(1, inv))
}

export function parseYesNo(raw: string | null | undefined): boolean | null {
  if (raw == null) return null
  const s = String(raw).trim().toLowerCase()
  if (s === "" || s === "—") return null
  if (s === "y" || s === "yes" || s === "true" || s === "1" || s === "100%") return true
  if (s === "n" || s === "no" || s === "false" || s === "0" || s === "0%") return false
  return null
}

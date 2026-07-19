import { readFileSync } from "node:fs"
import { CMS_CACHE_PATH } from "@/lib/cms/constants"
import type { CmsCacheFile } from "@/lib/cms/types"

let cached: CmsCacheFile | null = null

/**
 * Load the synced CMS cache from disk (memoized for the process lifetime).
 * Run `npm run sync:cms` if the file is missing.
 */
export function loadCmsCache(): CmsCacheFile {
  if (cached) return cached

  try {
    const raw = readFileSync(CMS_CACHE_PATH, "utf8")
    cached = JSON.parse(raw) as CmsCacheFile
    return cached
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    throw new Error(
      `CMS cache missing or unreadable at ${CMS_CACHE_PATH}. Run \`npm run sync:cms\` first. (${reason})`
    )
  }
}

/** Test helper / sync scripts can clear the in-memory memo. */
export function clearCmsCacheMemo(): void {
  cached = null
}

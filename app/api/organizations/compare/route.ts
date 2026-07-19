import { NextResponse } from "next/server"
import { MIN_COMPARE_URL } from "@/lib/compare/config"
import { getOrganizationsForComparison } from "@/lib/organizations/getOrganizationsForComparison"

const MAX_IDS = 3

function parseIds(raw: string | null): string[] {
  if (!raw?.trim()) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(",")) {
    const p = part.trim()
    if (!p || seen.has(p)) continue
    seen.add(p)
    out.push(p)
    if (out.length >= MAX_IDS) break
  }
  return out
}

/**
 * GET /api/organizations/compare?ids=id1,id2,id3
 * Returns normalized comparison payloads (same shape as server page fetch) for optional client use.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ids = parseIds(searchParams.get("ids"))

  if (ids.length < MIN_COMPARE_URL) {
    return NextResponse.json(
      {
        error: `Provide at least ${MIN_COMPARE_URL} organization IDs in the ids query parameter.`,
        organizations: [],
      },
      { status: 400 }
    )
  }

  try {
    const organizations = await getOrganizationsForComparison(ids)
    if (organizations.length < MIN_COMPARE_URL) {
      return NextResponse.json(
        {
          error: "Fewer than two organizations were found for the given IDs.",
          organizations,
        },
        { status: 404 }
      )
    }
    return NextResponse.json({ organizations })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load organizations"
    return NextResponse.json({ error: message, organizations: [] }, { status: 500 })
  }
}

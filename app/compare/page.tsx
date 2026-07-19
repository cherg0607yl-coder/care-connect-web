import Link from "next/link"
import { ComparisonTable } from "@/components/compare/comparison-table"
import { MIN_COMPARE_URL } from "@/lib/compare/config"
import { getOrganizationsForComparison } from "@/lib/organizations/getOrganizationsForComparison"

const MAX_IDS = 3

function parseIdsParam(raw: string | null): string[] {
  if (!raw?.trim()) return []
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  const unique: string[] = []
  const seen = new Set<string>()
  for (const p of parts) {
    if (seen.has(p)) continue
    seen.add(p)
    unique.push(p)
    if (unique.length >= MAX_IDS) break
  }
  return unique
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>
}) {
  const { ids: idsRaw } = await searchParams
  const requestedIds = parseIdsParam(idsRaw ?? null)

  if (requestedIds.length < MIN_COMPARE_URL) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6">
          <Link
            href="/search"
            className="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            ← Back to search
          </Link>
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900">Compare organizations</h1>
        <p className="mt-3 text-sm text-zinc-600">
          Add at least two hospice organizations from your search results to compare. Use the{" "}
          <span className="font-medium">Compare</span> button on each card, then open the comparison
          view.
        </p>
        <p className="mt-2 font-mono text-xs text-zinc-500">
          Expected URL: /compare?ids=id1,id2 or /compare?ids=id1,id2,id3
        </p>
      </main>
    )
  }

  let organizations: Awaited<ReturnType<typeof getOrganizationsForComparison>> = []
  let loadError: string | null = null

  try {
    organizations = await getOrganizationsForComparison(requestedIds)
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load organizations"
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6">
          <Link
            href="/search"
            className="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            ← Back to search
          </Link>
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900">Could not load comparison</h1>
        <p className="mt-3 text-sm text-red-800">{loadError}</p>
        <p className="mt-4 text-sm text-zinc-600">
          Try re-running <code className="rounded bg-zinc-100 px-1 text-xs">npm run sync:cms</code>{" "}
          to refresh the local CMS hospice cache, then reload this page.
        </p>
      </main>
    )
  }

  if (organizations.length < MIN_COMPARE_URL) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6">
          <Link
            href="/search"
            className="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            ← Back to search
          </Link>
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900">Organizations not found</h1>
        <p className="mt-3 text-sm text-zinc-600">
          Fewer than {MIN_COMPARE_URL} matching records were found for the IDs in this link. They may
          be invalid or removed from the directory.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href="/search"
          className="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          ← Back to search
        </Link>
        <Link
          href="/search/results"
          className="inline-flex items-center rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-emerald-800 hover:underline"
        >
          Back to results
        </Link>
      </div>

      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">Compare hospices</h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-600">
          Side-by-side overview of selected providers using public Medicare hospice data. This is for
          information only and does not recommend one provider over another.
        </p>
      </header>

      {/* Column headers summary (names repeated in each section for scanability) */}
      <div
        className={`mb-6 hidden gap-4 lg:grid ${organizations.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}
      >
        {organizations.map((org) => (
          <div
            key={org.id}
            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <h2 className="text-lg font-semibold leading-snug text-zinc-900">{org.name}</h2>
            <p className="mt-1 text-xs text-zinc-500">{org.fullLocation || "Address not listed"}</p>
          </div>
        ))}
      </div>

      <ComparisonTable organizations={organizations} />
    </main>
  )
}

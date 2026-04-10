import { Suspense } from "react"
import SearchResultsClient from "./search-results-client"

export default function SearchResultsPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-3xl px-4 py-10">
          <p className="text-sm text-zinc-600">Loading search results…</p>
        </main>
      }
    >
      <SearchResultsClient />
    </Suspense>
  )
}

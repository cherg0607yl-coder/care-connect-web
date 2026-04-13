"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import type { MatchQuestionnaire, RankedHospiceMatch } from "@/lib/matching/types"

const STORAGE_KEY = "care-connect-match-v1"

type StoredPayload = {
  questionnaire?: MatchQuestionnaire
  matches?: RankedHospiceMatch[]
  disclaimer?: string
  warning?: string
}

export default function MatchResultsClient() {
  const [data, setData] = useState<StoredPayload | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (!raw) {
        setData(null)
        return
      }
      setData(JSON.parse(raw) as StoredPayload)
    } catch {
      setData(null)
    } finally {
      setHydrated(true)
    }
  }, [])

  if (!hydrated) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm text-zinc-600">Loading…</p>
      </main>
    )
  }

  if (data === null || !data.matches) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link href="/match" className="text-sm font-medium text-emerald-800 hover:underline">
          ← Back to questionnaire
        </Link>
        <h1 className="mt-6 text-2xl font-semibold text-zinc-900">No results loaded</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Run the questionnaire again — results are kept only in this browser session.
        </p>
      </main>
    )
  }

  const q = data.questionnaire
  const matches = data.matches
  const top = matches.slice(0, 30)

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap gap-3">
        <Link
          href="/match"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          ← Edit answers
        </Link>
        <Link
          href="/search"
          className="rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-emerald-800 hover:underline"
        >
          Go to search
        </Link>
      </div>

      <h1 className="mt-8 text-2xl font-semibold text-zinc-900">Your matches</h1>
      {q && (
        <p className="mt-2 text-sm text-zinc-600">
          Near {q.locationLabel} · within {q.radiusMiles} mi · ranked for your preferences
        </p>
      )}
      {data.warning && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {data.warning}
        </p>
      )}
      {data.disclaimer && (
        <p className="mt-4 text-xs leading-relaxed text-zinc-500">{data.disclaimer}</p>
      )}

      <ol className="mt-8 space-y-6">
        {top.map((m, i) => (
          <li
            key={m.organizationId}
            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-zinc-500">#{i + 1}</span>
                <h2 className="text-lg font-semibold text-zinc-900">{m.name}</h2>
                {m.ccn && (
                  <p className="font-mono text-xs text-zinc-500">CCN {m.ccn}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-900">{m.totalScore}</p>
                <p className="text-xs text-zinc-500">match score (0–100)</p>
              </div>
            </div>
            <p className="mt-2 text-sm text-zinc-600">{m.fullLocation}</p>
            {m.distanceMiles != null && (
              <p className="text-sm text-zinc-700">
                About <strong>{m.distanceMiles.toFixed(1)}</strong> miles away
              </p>
            )}
            {m.phone && (
              <p className="text-sm">
                <a
                  href={`tel:${m.phone.replace(/\D/g, "")}`}
                  className="text-emerald-800 underline-offset-2 hover:underline"
                >
                  {m.phone}
                </a>
              </p>
            )}
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-700">
              {m.explanation.map((line, j) => (
                <li key={j}>{line}</li>
              ))}
            </ul>
            {m.confidenceNote && (
              <p className="mt-2 text-xs italic text-zinc-500">{m.confidenceNote}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/compare?ids=${encodeURIComponent(m.organizationId)}`}
                className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
              >
                Compare (add more from search)
              </Link>
            </div>
          </li>
        ))}
      </ol>

      {matches.length > 30 && (
        <p className="mt-6 text-sm text-zinc-500">
          Showing top 30 of {matches.length} matches in your radius.
        </p>
      )}
    </main>
  )
}

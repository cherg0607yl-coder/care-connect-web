"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import type { LayerBreakdown, MatchQuestionnaire, RankedHospiceMatch } from "@/lib/matching/types"
import { OrganizationDetailModals } from "@/app/search/results/organization-detail-modals"

const STORAGE_KEY = "care-connect-match-v1"

function fmtPts(n: number): string {
  return (Math.round(n * 10) / 10).toFixed(1)
}

function LayerRow({ label, layer }: { label: string; layer: LayerBreakdown }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-zinc-600">{label}</span>
      <span className="tabular-nums text-zinc-900">
        {fmtPts(layer.pointsEarned)} / {fmtPts(layer.pointsMax)}
      </span>
    </div>
  )
}

function MatchScoreTooltip({ id, match }: { id: string; match: RankedHospiceMatch }) {
  const b = match.breakdown
  return (
    <div
      id={id}
      role="tooltip"
      className="pointer-events-none invisible absolute right-0 top-full z-20 mt-2 w-max min-w-[220px] rounded-lg border border-zinc-200 bg-white p-3 text-left shadow-lg opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
    >
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Score breakdown</p>
      <div className="space-y-1.5 text-xs">
        <LayerRow label="Distance" layer={b.distance} />
        <p className="pt-1 text-[11px] font-medium text-zinc-500">Fit</p>
        <LayerRow label="Condition" layer={b.fit.condition} />
        <LayerRow label="Setting" layer={b.fit.setting} />
        <LayerRow label="Intensity" layer={b.fit.intensity} />
        <LayerRow label="Quality" layer={b.quality} />
        <LayerRow label="Confidence" layer={b.confidence} />
      </div>
    </div>
  )
}

type StoredPayload = {
  questionnaire?: MatchQuestionnaire
  matches?: RankedHospiceMatch[]
  disclaimer?: string
  warning?: string
}

export default function MatchResultsClient() {
  const data = useMemo<StoredPayload | null>(() => {
    if (typeof window === "undefined") return null
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      return JSON.parse(raw) as StoredPayload
    } catch {
      return null
    }
  }, [])
  const [detailOrgId, setDetailOrgId] = useState<string | null>(null)
  const top = useMemo(() => data?.matches?.slice(0, 30) ?? [], [data?.matches])
  const selectedOrganization = useMemo(
    () => top.find((m) => m.organizationId === detailOrgId) ?? null,
    [detailOrgId, top]
  )

  if (data === null || !data.matches) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
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

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
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
              </div>
              <div className="text-right">
                <div
                  className="group relative inline-block rounded text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/35 focus-visible:ring-offset-2"
                  tabIndex={0}
                  title="Hover or press Tab and focus here for score breakdown"
                  aria-describedby={`score-tip-${m.organizationId}`}
                >
                  <p className="cursor-help text-2xl font-bold text-emerald-900 underline decoration-zinc-300 decoration-dotted underline-offset-4">
                    {m.totalScore}
                  </p>
                  <p className="text-xs text-zinc-500">match score (0–100)</p>
                  <MatchScoreTooltip id={`score-tip-${m.organizationId}`} match={m} />
                </div>
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
            {m.confidenceNote && (
              <p className="mt-2 text-xs italic text-zinc-500">{m.confidenceNote}</p>
            )}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setDetailOrgId(m.organizationId)}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800"
              >
                View details
              </button>
            </div>
          </li>
        ))}
      </ol>

      {matches.length > 30 && (
        <p className="mt-6 text-sm text-zinc-500">
          Showing top 30 of {matches.length} matches in your radius.
        </p>
      )}
      {selectedOrganization ? (
        <OrganizationDetailModals
          onClose={() => setDetailOrgId(null)}
          name={selectedOrganization.name}
          ccn={selectedOrganization.ccn}
          fullLocation={selectedOrganization.fullLocation}
          phone={selectedOrganization.phone}
          measurements={selectedOrganization.detailMeasurements}
        />
      ) : null}
    </main>
  )
}

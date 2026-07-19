"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CompareSelectionBar } from "@/components/search/compare-selection-bar"
import { MAX_COMPARE_SELECTION } from "@/lib/compare/config"
import type { CompareSelectionItem } from "@/lib/compare/types"
import type { OrganizationDetailMeasurements } from "@/lib/organizations/org-detail-measures"
import { OrganizationSearchCard } from "./organization-search-card"

const SearchResultsMap = dynamic(
  () => import("./search-results-map").then((mod) => mod.SearchResultsMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex min-h-[280px] items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-sm text-zinc-600"
        style={{ minHeight: "min(50vh, 420px)" }}
      >
        Loading map…
      </div>
    ),
  }
)

type SearchOrganization = {
  id: string | number
  name: string
  ccn: string | null
  fullLocation: string
  phone: string | null
  distanceMiles: number | null
  latitude: number | null
  longitude: number | null
  detailMeasurements: OrganizationDetailMeasurements
}

type SearchResponse = {
  organizations: SearchOrganization[]
  totalCount: number
  limit: number
  offset: number
  appliedRadiusMiles: number | null
  wasAutoExpanded: boolean
  measurementsLoadError: string | null
}

export default function SearchResultsClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = useState<SearchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [geoHint, setGeoHint] = useState<string | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [offset, setOffset] = useState(Number(searchParams.get("offset") ?? 0))
  const [radiusMiles, setRadiusMiles] = useState(
    Math.min(100, Math.max(1, Number(searchParams.get("radiusMiles") ?? 15)))
  )
  const [showMap, setShowMap] = useState(false)
  const [selectedMapId, setSelectedMapId] = useState<string | number | null>(null)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [compareSelection, setCompareSelection] = useState<CompareSelectionItem[]>([])

  const limit = Number(searchParams.get("limit") ?? 20)

  const location = searchParams.get("location") ?? ""
  const organizationName = searchParams.get("organizationName") ?? ""
  const userLat = searchParams.get("userLat") ?? ""
  const userLng = searchParams.get("userLng") ?? ""
  const hasUserCoords = Boolean(userLat && userLng)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduceMotion(mq.matches)
    const fn = () => setReduceMotion(mq.matches)
    mq.addEventListener("change", fn)
    return () => mq.removeEventListener("change", fn)
  }, [])

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (location) params.set("location", location)
    if (organizationName) params.set("organizationName", organizationName)
    if (userLat) params.set("userLat", userLat)
    if (userLng) params.set("userLng", userLng)
    params.set("radiusMiles", String(radiusMiles))
    params.set("limit", String(limit))
    params.set("offset", String(offset))
    return params.toString()
  }, [location, organizationName, userLat, userLng, radiusMiles, limit, offset])

  const mapOrganizations = useMemo(() => {
    if (!data?.organizations) return []
    return data.organizations
      .filter(
        (o) =>
          o.latitude != null &&
          o.longitude != null &&
          Number.isFinite(o.latitude) &&
          Number.isFinite(o.longitude)
      )
      .map((o) => ({
        id: o.id,
        name: o.name,
        latitude: o.latitude as number,
        longitude: o.longitude as number,
      }))
  }, [data?.organizations])

  const userLocation = useMemo(() => {
    if (!hasUserCoords) return null
    const lat = Number(userLat)
    const lng = Number(userLng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { lat, lng }
  }, [hasUserCoords, userLat, userLng])

  const mapAnnouncement = useMemo(() => {
    if (selectedMapId == null || !data?.organizations) return ""
    const org = data.organizations.find((o) => String(o.id) === String(selectedMapId))
    return org ? `Highlighted on map: ${org.name}` : ""
  }, [selectedMapId, data?.organizations])

  useEffect(() => {
    if (selectedMapId == null || !data?.organizations) return
    const el = document.getElementById(`org-result-${selectedMapId}`)
    el?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "nearest",
    })
  }, [selectedMapId, data?.organizations, reduceMotion])

  useEffect(() => {
    setSelectedMapId(null)
  }, [queryString])

  const handleMarkerSelect = useCallback((id: string | number) => {
    setSelectedMapId(id)
  }, [])

  const toggleCompareOrganization = useCallback((org: SearchOrganization) => {
    const id = String(org.id)
    setCompareSelection((prev) => {
      const exists = prev.some((p) => p.id === id)
      if (exists) return prev.filter((p) => p.id !== id)
      if (prev.length >= MAX_COMPARE_SELECTION) return prev
      return [...prev, { id, name: org.name }]
    })
  }, [])

  const removeCompareOrganization = useCallback((id: string) => {
    setCompareSelection((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const goToCompare = useCallback(() => {
    if (compareSelection.length < 2) return
    const qs = compareSelection.map((i) => encodeURIComponent(i.id)).join(",")
    router.push(`/compare?ids=${qs}`)
  }, [compareSelection, router])

  function requestBrowserLocation() {
    setGeoHint(null)
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoHint("Geolocation is not available in this browser.")
      return
    }
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        let locationLabel = "Current location"
        try {
          const response = await fetch(
            `/api/places/geocode?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`
          )
          const json = (await response.json()) as {
            formattedAddress?: string | null
          }
          if (response.ok && json.formattedAddress?.trim()) {
            locationLabel = json.formattedAddress.trim()
          }
        } catch {
          /* keep default label */
        }
        setIsLocating(false)
        const params = new URLSearchParams(searchParams.toString())
        params.set("location", locationLabel)
        params.set("userLat", String(lat))
        params.set("userLng", String(lng))
        params.set("offset", "0")
        router.replace(`/search/results?${params.toString()}`)
        setOffset(0)
      },
      () => {
        setIsLocating(false)
        setGeoHint("Could not read your location. Check browser permissions.")
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 }
    )
  }

  useEffect(() => {
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/organizations/search?${queryString}`)
        const json = (await response.json()) as SearchResponse & { error?: string }
        if (!response.ok) {
          setError(json.error ?? "Search failed")
          setData(null)
          return
        }
        setData(json)
      } catch {
        setError("Search request failed")
        setData(null)
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [queryString])

  const page = data ? Math.floor(data.offset / data.limit) + 1 : 1
  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.limit)) : 1

  const canShowMap = mapOrganizations.length > 0 || userLocation != null

  return (
    <main
      className={`mx-auto w-full px-4 py-10 ${showMap && canShowMap ? "max-w-6xl" : "max-w-3xl"}`}
    >
      <div className="mb-4">
        <Link
          href="/search"
          className="inline-flex items-center rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50"
        >
          ← Back to search
        </Link>
      </div>
      <h1 className="text-2xl font-semibold">Search results</h1>
      <div aria-live="polite" aria-atomic className="sr-only">
        {mapAnnouncement}
      </div>
      <p className="mt-2 text-sm text-zinc-600">
        Location: {location || "Not provided"} | Organization filter:{" "}
        {organizationName || "None"}
        {hasUserCoords ? (
          <span> | Sorted by distance from this search location</span>
        ) : (
          <span> | No coordinates for distance — use the button below or start a new address search.</span>
        )}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isLocating}
          onClick={() => requestBrowserLocation()}
          className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {isLocating ? "Getting location…" : "Use my current location"}
        </button>
        {canShowMap && (
          <button
            type="button"
            onClick={() => setShowMap((v) => !v)}
            className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm"
            aria-expanded={showMap}
            aria-controls="search-results-map-region"
          >
            {showMap ? "Hide map" : "Show map"}
          </button>
        )}
        {geoHint && <p className="text-sm text-red-700">{geoHint}</p>}
      </div>
      {hasUserCoords && (
        <div className="mt-4 rounded border border-zinc-200 p-3">
          <label className="block text-sm font-medium">
            Distance radius: {radiusMiles} miles
          </label>
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            value={radiusMiles}
            onChange={(event) => {
              setRadiusMiles(Number(event.target.value))
              setOffset(0)
            }}
            className="mt-2 w-full"
          />
          <div className="mt-2 flex gap-2 text-sm">
            {[15, 30, 50, 100].map((value) => (
              <button
                key={value}
                type="button"
                className="rounded border border-zinc-300 px-2 py-1"
                onClick={() => {
                  setRadiusMiles(value)
                  setOffset(0)
                }}
              >
                {value} mi
              </button>
            ))}
          </div>
          {data?.wasAutoExpanded && data.appliedRadiusMiles === 30 && radiusMiles < 30 && (
            <p className="mt-2 text-xs text-zinc-600">
              Fewer than 5 results within {radiusMiles} miles, so radius auto-expanded
              to 30 miles.
            </p>
          )}
        </div>
      )}

      <CompareSelectionBar
        items={compareSelection}
        onRemove={removeCompareOrganization}
        onCompareClick={goToCompare}
      />

      {loading && <p className="mt-6 text-sm text-zinc-600">Loading...</p>}
      {error && <p className="mt-6 text-sm text-red-700">{error}</p>}
      {data?.measurementsLoadError && (
        <div
          className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          role="status"
        >
          <p className="font-medium">Quality data could not be loaded</p>
          <p className="mt-1 font-mono text-xs opacity-90">{data.measurementsLoadError}</p>
          <p className="mt-2 text-xs text-amber-900/90">
            Quality measures come from the local CMS cache. Run{" "}
            <code className="rounded bg-amber-100/80 px-1">npm run sync:cms</code> if the cache is
            missing or stale.
          </p>
        </div>
      )}

      {data && !loading && !error && (
        <>
          <p className="mt-6 text-sm text-zinc-600">
            {data.totalCount} total organizations found
          </p>
          {data.totalCount === 0 && hasUserCoords && (
            <p className="mt-2 text-sm text-zinc-600">
              Try a larger radius — the default is 15 miles (auto-expands to 30 if there are
              very few matches).
            </p>
          )}

          <div
            className={
              showMap && canShowMap
                ? "mt-4 flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8"
                : "mt-4"
            }
          >
            <div
              className={showMap && canShowMap ? "order-1 min-w-0" : "min-w-0"}
              id="results-list"
            >
              <ul className="space-y-5">
                {data.organizations.map((organization) => (
                  <li key={String(organization.id)}>
                    <OrganizationSearchCard
                      organizationId={organization.id}
                      name={organization.name}
                      ccn={organization.ccn}
                      fullLocation={organization.fullLocation}
                      phone={organization.phone}
                      distanceMiles={organization.distanceMiles}
                      detailMeasurements={organization.detailMeasurements}
                      mapIntegrationEnabled={showMap && canShowMap}
                      isMapSelected={String(selectedMapId) === String(organization.id)}
                      onSelectForMap={() => setSelectedMapId(organization.id)}
                      compareSelected={compareSelection.some(
                        (c) => c.id === String(organization.id)
                      )}
                      compareCanAdd={
                        compareSelection.length < MAX_COMPARE_SELECTION ||
                        compareSelection.some((c) => c.id === String(organization.id))
                      }
                      onCompareToggle={() => toggleCompareOrganization(organization)}
                    />
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setOffset((current) => Math.max(0, current - limit))}
                  disabled={offset <= 0}
                  className="rounded border border-zinc-300 px-3 py-1.5 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-zinc-600">
                  Page {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setOffset((current) => current + limit)}
                  disabled={offset + limit >= (data.totalCount ?? 0)}
                  className="rounded border border-zinc-300 px-3 py-1.5 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>

            {showMap && canShowMap && (
              <div className="order-2 min-w-0 space-y-2 lg:sticky lg:top-4">
                <a
                  href="#results-list"
                  className="sr-only focus:not-sr-only focus:relative focus:z-10 focus:inline-block focus:rounded focus:bg-zinc-900 focus:px-3 focus:py-2 focus:text-white"
                >
                  Skip map, go to results list
                </a>
                <p className="text-xs text-zinc-500 lg:sr-only">
                  The list above includes full details. The map is a visual aid; use{" "}
                  <span className="font-medium">Show on map</span> on each card to highlight a
                  provider.
                </p>
                <div
                  id="search-results-map-region"
                  role="region"
                  aria-label="Map of hospice search results. Use the results list for addresses, phone numbers, and full details."
                  className="overflow-hidden rounded-xl border border-zinc-200 shadow-sm"
                >
                  <SearchResultsMap
                    organizations={mapOrganizations}
                    userLocation={userLocation}
                    selectedId={selectedMapId}
                    onMarkerSelect={handleMarkerSelect}
                    reduceMotion={reduceMotion}
                  />
                </div>
                {mapOrganizations.length === 0 && userLocation && (
                  <p className="text-xs text-zinc-500">
                    No coordinates for providers on this page; only your search location is shown.
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  )
}

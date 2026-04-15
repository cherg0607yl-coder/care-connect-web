"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { SearchBar } from "@/components/care-connect/search-bar"
import { SearchHeroImage } from "@/components/care-connect/search-hero-image"

type Suggestion = {
  placeId: string
  description: string
}

export function HomeSearchPanel() {
  const router = useRouter()
  const [locationInput, setLocationInput] = useState("")
  const [organizationName, setOrganizationName] = useState("")
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [selectedFromDropdown, setSelectedFromDropdown] = useState(false)
  const [suggestionError, setSuggestionError] = useState<string | null>(null)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [geoHint, setGeoHint] = useState<string | null>(null)
  const [isResolvingAddress, setIsResolvingAddress] = useState(false)
  const [isLocating, setIsLocating] = useState(false)

  const canSubmitSearch = useMemo(
    () => locationInput.trim().length > 0,
    [locationInput]
  )

  const submitButtonReady =
    canSubmitSearch && !isResolvingAddress && !isLocating

  useEffect(() => {
    router.prefetch("/match")
  }, [router])

  useEffect(() => {
    const query = locationInput.trim()
    if (query.length < 2) {
      setSuggestions([])
      setSuggestionError(null)
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsLoadingSuggestions(true)
      try {
        const response = await fetch(
          `/api/places/autocomplete?input=${encodeURIComponent(query)}`
        )
        const json = (await response.json()) as {
          suggestions?: Suggestion[]
          error?: string
        }
        if (!response.ok) {
          setSuggestions([])
          setSuggestionError(json.error ?? "Autocomplete request failed")
          return
        }
        setSuggestionError(null)
        setSuggestions(json.suggestions ?? [])
      } catch {
        setSuggestions([])
        setSuggestionError("Failed to fetch autocomplete suggestions")
      } finally {
        setIsLoadingSuggestions(false)
      }
    }, 250)

    return () => clearTimeout(timeoutId)
  }, [locationInput])

  async function onPickSuggestion(suggestion: Suggestion) {
    setLocationInput(suggestion.description)
    setSelectedFromDropdown(true)
    setSuggestions([])
    setGeoHint(null)
    setIsResolvingAddress(true)
    try {
      const response = await fetch(
        `/api/places/details?placeId=${encodeURIComponent(suggestion.placeId)}`
      )
      const json = (await response.json()) as {
        lat?: number
        lng?: number
        formattedAddress?: string | null
        error?: string
      }
      if (
        !response.ok ||
        typeof json.lat !== "number" ||
        typeof json.lng !== "number"
      ) {
        setGeoHint(
          json.error ??
            "Could not resolve that place. Try again or press Search to geocode your text."
        )
        setUserCoords(null)
        return
      }
      setUserCoords({ lat: json.lat, lng: json.lng })
      if (json.formattedAddress) {
        setLocationInput(json.formattedAddress)
      }
    } catch {
      setGeoHint("Could not resolve the selected place.")
      setUserCoords(null)
    } finally {
      setIsResolvingAddress(false)
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmitSearch || isResolvingAddress) return

    let locationResolved = locationInput.trim()
    let lat = userCoords?.lat
    let lng = userCoords?.lng

    if (locationResolved && (lat == null || lng == null)) {
      setIsResolvingAddress(true)
      setGeoHint(null)
      try {
        const response = await fetch(
          `/api/places/geocode?address=${encodeURIComponent(locationResolved)}`
        )
        const json = (await response.json()) as {
          lat?: number
          lng?: number
          formattedAddress?: string | null
          error?: string
        }
        if (
          response.ok &&
          typeof json.lat === "number" &&
          typeof json.lng === "number"
        ) {
          lat = json.lat
          lng = json.lng
          setUserCoords({ lat, lng })
          if (json.formattedAddress) {
            locationResolved = json.formattedAddress
            setLocationInput(json.formattedAddress)
          }
        }
      } finally {
        setIsResolvingAddress(false)
      }
    }

    const params = new URLSearchParams()
    if (locationResolved) params.set("location", locationResolved)
    if (organizationName.trim()) params.set("organizationName", organizationName.trim())
    if (lat != null && lng != null) {
      params.set("userLat", String(lat))
      params.set("userLng", String(lng))
    }
    params.set("radiusMiles", "15")
    params.set("limit", "20")
    params.set("offset", "0")
    router.push(`/search/results?${params.toString()}`)
  }

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
        setUserCoords({ lat, lng })
        setSelectedFromDropdown(false)
        setLocationInput(locationLabel)
        const params = new URLSearchParams()
        params.set("location", locationLabel)
        if (organizationName.trim()) {
          params.set("organizationName", organizationName.trim())
        }
        params.set("userLat", String(lat))
        params.set("userLng", String(lng))
        params.set("radiusMiles", "15")
        params.set("limit", "20")
        params.set("offset", "0")
        router.push(`/search/results?${params.toString()}`)
      },
      () => {
        setIsLocating(false)
        setGeoHint("Could not read your location. Check browser permissions.")
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 }
    )
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 lg:py-14">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12 lg:py-4 xl:gap-16">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6 lg:mx-0">
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-cc-text sm:text-4xl lg:text-[2.25rem] lg:leading-snug">
              Find compassionate care, tailored to your needs
            </h1>
            <p className="text-base leading-relaxed text-cc-text/75 sm:text-lg">
              Compare hospice providers, explore services, and make informed decisions
              for your loved ones.
            </p>
          </div>

          <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <SearchBar
                id="location"
                label="Street address, city, state, or ZIP code (*required)"
                value={locationInput}
                onChange={(v) => {
                  setLocationInput(v)
                  setSelectedFromDropdown(false)
                  setUserCoords(null)
                }}
                placeholder="Start typing an address…"
                autoComplete="off"
              >
                {locationInput.trim().length >= 2 && !selectedFromDropdown && (
                  <div className="mt-2 overflow-hidden rounded-xl border border-cc-text/10 bg-white shadow-sm">
                    {isLoadingSuggestions ? (
                      <p className="px-4 py-3 text-sm text-cc-text/50">Loading suggestions…</p>
                    ) : suggestionError ? (
                      <p className="px-4 py-3 text-sm text-red-700/90">{suggestionError}</p>
                    ) : suggestions.length > 0 ? (
                      <ul className="divide-y divide-cc-text/5">
                        {suggestions.map((suggestion) => (
                          <li key={suggestion.placeId}>
                            <button
                              type="button"
                              disabled={isResolvingAddress}
                              className="w-full px-4 py-3 text-left text-sm text-cc-text transition hover:bg-cc-bg disabled:opacity-50"
                              onClick={() => void onPickSuggestion(suggestion)}
                            >
                              {suggestion.description}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="px-4 py-3 text-sm text-cc-text/50">No suggestions found.</p>
                    )}
                  </div>
                )}
                {selectedFromDropdown && userCoords && (
                  <p className="mt-2 text-xs text-cc-text/60">
                    Address pinned for distance search. Edit the field to clear and search
                    again.
                  </p>
                )}
              </SearchBar>

              <SearchBar
                id="organizationName"
                label="Organization name (optional)"
                value={organizationName}
                onChange={setOrganizationName}
                placeholder="Filter by provider name…"
                autoComplete="off"
              />
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={isLocating}
                onClick={() => requestBrowserLocation()}
                className="w-fit cursor-pointer border-0 bg-transparent p-0 text-left text-sm text-cc-accent underline decoration-cc-accent/50 underline-offset-4 transition hover:text-cc-text hover:decoration-cc-text/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLocating ? "Getting your location…" : "Search near me"}
              </button>
              {geoHint && <p className="text-sm text-red-700/90">{geoHint}</p>}
            </div>

            <button
              type="submit"
              disabled={!submitButtonReady}
              className={`w-full rounded-xl px-6 py-3 text-sm font-semibold shadow-sm transition sm:w-auto ${
                submitButtonReady
                  ? "bg-cc-accent text-white hover:opacity-90"
                  : "cursor-not-allowed bg-cc-text/10 text-cc-text/45"
              }`}
            >
              {isResolvingAddress ? "Resolving address…" : "Search organizations"}
            </button>

            <Link
              href="/match"
              className="inline-flex w-fit rounded-lg border border-cc-text/20 px-4 py-2 text-sm font-medium text-cc-text transition hover:bg-cc-bg"
            >
              Take the questionnaire to find the best provider for you
            </Link>
          </form>
        </div>

        <div className="flex justify-center lg:justify-end">
          <SearchHeroImage />
        </div>
      </div>
    </main>
  )
}

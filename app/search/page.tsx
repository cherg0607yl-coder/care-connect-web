"use client"

import Link from "next/link"
import { FormEvent, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

type Suggestion = {
  placeId: string
  description: string
}

export default function SearchPage() {
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

  const canSearch = useMemo(
    () =>
      Boolean(
        locationInput.trim() ||
          organizationName.trim() ||
          userCoords !== null
      ),
    [locationInput, organizationName, userCoords]
  )

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
    if (!canSearch || isResolvingAddress) return

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
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Search Hospice Organizations</h1>
      <p className="mb-4 text-sm text-zinc-600">
        Type an address and pick a suggestion, or use the button below to search near
        your current position (no typing).
      </p>
      <p className="mb-6">
        <Link
          href="/match"
          className="inline-flex rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100"
        >
          Find matching hospice organizations — short questionnaire
        </Link>
      </p>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        <div>
          <label htmlFor="location" className="mb-1 block text-sm font-medium">
            Address or ZIP
          </label>
          <input
            id="location"
            value={locationInput}
            onChange={(e) => {
              setLocationInput(e.target.value)
              setSelectedFromDropdown(false)
              setUserCoords(null)
            }}
            placeholder="Start typing an address…"
            autoComplete="off"
            className="w-full rounded border border-zinc-300 px-3 py-2"
          />
          {locationInput.trim().length >= 2 && !selectedFromDropdown && (
            <div className="mt-1 rounded border border-zinc-200">
              {isLoadingSuggestions ? (
                <p className="px-3 py-2 text-sm text-zinc-500">Loading suggestions...</p>
              ) : suggestionError ? (
                <p className="px-3 py-2 text-sm text-red-600">{suggestionError}</p>
              ) : suggestions.length > 0 ? (
                <ul>
                  {suggestions.map((suggestion) => (
                    <li key={suggestion.placeId}>
                      <button
                        type="button"
                        disabled={isResolvingAddress}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 disabled:opacity-50"
                        onClick={() => void onPickSuggestion(suggestion)}
                      >
                        {suggestion.description}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-2 text-sm text-zinc-500">No suggestions found.</p>
              )}
            </div>
          )}
          {selectedFromDropdown && userCoords && (
            <p className="mt-1 text-xs text-zinc-600">
              Address pinned for distance search. Edit the field to clear and search again.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="organizationName" className="mb-1 block text-sm font-medium">
            Organization name (optional)
          </label>
          <input
            id="organizationName"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            placeholder="Optional organization name..."
            className="w-full rounded border border-zinc-300 px-3 py-2"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isLocating}
            onClick={() => requestBrowserLocation()}
            className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm disabled:opacity-50"
          >
            {isLocating ? "Getting your location…" : "Search near me (current location)"}
          </button>
          {geoHint && <p className="text-sm text-red-600">{geoHint}</p>}
        </div>

        <button
          type="submit"
          disabled={!canSearch || isResolvingAddress || isLocating}
          className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {isResolvingAddress ? "Resolving address…" : "Search organizations"}
        </button>
      </form>
    </main>
  )
}

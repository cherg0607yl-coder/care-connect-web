"use client"

import Link from "next/link"
import { FormEvent, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import type {
  CareSettingPreference,
  IntensityImportance,
  PrimaryCondition,
  RelationshipToPatient,
  UserPriority,
} from "@/lib/matching/types"

type Suggestion = { placeId: string; description: string }

const PRIORITY_OPTIONS: { id: UserPriority; label: string }[] = [
  { id: "closest", label: "Closest location" },
  { id: "quality", label: "Stronger public quality indicators" },
  { id: "condition_experience", label: "More experience with this condition" },
  { id: "home_support", label: "Stronger support in home setting" },
  { id: "capabilities", label: "Broader care capabilities" },
  { id: "eol_visits", label: "Stronger end-of-life visit pattern" },
]

const STORAGE_KEY = "care-connect-match-v1"

export default function MatchQuestionnaireClient() {
  const router = useRouter()
  const [locationInput, setLocationInput] = useState("")
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [selectedFromDropdown, setSelectedFromDropdown] = useState(false)
  const [suggestionError, setSuggestionError] = useState<string | null>(null)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [geoHint, setGeoHint] = useState<string | null>(null)
  const [isResolvingAddress, setIsResolvingAddress] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [radiusMiles, setRadiusMiles] = useState(25)
  const [relationship, setRelationship] = useState<RelationshipToPatient>("parent")
  const [condition, setCondition] = useState<PrimaryCondition>("not_sure")
  const [careSetting, setCareSetting] = useState<CareSettingPreference>("not_sure")
  const [intensityImportance, setIntensityImportance] =
    useState<IntensityImportance>("somewhat")
  const [priorities, setPriorities] = useState<UserPriority[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canSubmit = useMemo(
    () => Boolean(locationInput.trim()) && !isResolvingAddress,
    [locationInput, isResolvingAddress]
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
          setSuggestionError(json.error ?? "Autocomplete failed")
          return
        }
        setSuggestionError(null)
        setSuggestions(json.suggestions ?? [])
      } catch {
        setSuggestions([])
        setSuggestionError("Failed to fetch suggestions")
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
        setGeoHint(json.error ?? "Could not resolve that place.")
        setUserCoords(null)
        return
      }
      setUserCoords({ lat: json.lat, lng: json.lng })
      if (json.formattedAddress) setLocationInput(json.formattedAddress)
    } catch {
      setGeoHint("Could not resolve the selected place.")
      setUserCoords(null)
    } finally {
      setIsResolvingAddress(false)
    }
  }

  function togglePriority(id: UserPriority) {
    setPriorities((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id)
      if (prev.length >= 3) return prev
      return [...prev, id]
    })
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitError(null)
    if (!canSubmit || isSubmitting) return

    let lat = userCoords?.lat
    let lng = userCoords?.lng
    let label = locationInput.trim()

    if (lat == null || lng == null) {
      setIsResolvingAddress(true)
      try {
        const response = await fetch(
          `/api/places/geocode?address=${encodeURIComponent(label)}`
        )
        const json = (await response.json()) as {
          lat?: number
          lng?: number
          formattedAddress?: string | null
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
            label = json.formattedAddress
            setLocationInput(json.formattedAddress)
          }
        }
      } finally {
        setIsResolvingAddress(false)
      }
    }

    if (lat == null || lng == null) {
      setSubmitError("Pin an address from the list or one we can geocode.")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationLabel: label,
          userLat: lat,
          userLng: lng,
          radiusMiles,
          relationship,
          condition,
          careSetting,
          intensityImportance,
          priorities,
        }),
      })
      const data = (await response.json()) as {
        error?: string
        matches?: unknown
        disclaimer?: string
        questionnaire?: unknown
        warning?: string
      }
      if (!response.ok) {
        setSubmitError(data.error ?? "Request failed")
        return
      }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      router.push("/match/results")
    } catch {
      setSubmitError("Network error — try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function requestBrowserLocation() {
    setGeoHint(null)
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoHint("Geolocation is not available.")
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
          const json = (await response.json()) as { formattedAddress?: string | null }
          if (response.ok && json.formattedAddress?.trim()) {
            locationLabel = json.formattedAddress.trim()
          }
        } catch {
          /* ok */
        }
        setIsLocating(false)
        setUserCoords({ lat, lng })
        setSelectedFromDropdown(false)
        setLocationInput(locationLabel)
      },
      () => {
        setIsLocating(false)
        setGeoHint("Could not read your location.")
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 }
    )
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="mb-4">
        <Link
          href="/search"
          className="text-sm font-medium text-emerald-800 hover:underline"
        >
          ← Back to search
        </Link>
      </div>
      <h1 className="text-2xl font-semibold text-zinc-900">Find your best matches</h1>
      <p className="mt-2 text-sm text-zinc-600">
        <Link href="/match/scoring" className="font-medium text-emerald-800 hover:underline">
          How this matching score is calculated
        </Link>
      </p>

      <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-6">
        <fieldset className="space-y-2 rounded-lg border border-zinc-200 p-4">
          <legend className="px-1 text-sm font-semibold text-zinc-900">
            1. Where is care needed?
          </legend>
          <label className="block text-sm font-medium text-zinc-700">Address or ZIP</label>
          <input
            value={locationInput}
            onChange={(e) => {
              setLocationInput(e.target.value)
              setSelectedFromDropdown(false)
              setUserCoords(null)
            }}
            placeholder="Start typing — pick a suggestion to pin coordinates"
            autoComplete="off"
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
          {locationInput.trim().length >= 2 && !selectedFromDropdown && (
            <div className="rounded border border-zinc-200">
              {isLoadingSuggestions ? (
                <p className="px-3 py-2 text-sm text-zinc-500">Loading…</p>
              ) : suggestionError ? (
                <p className="px-3 py-2 text-sm text-red-600">{suggestionError}</p>
              ) : suggestions.length > 0 ? (
                <ul>
                  {suggestions.map((s) => (
                    <li key={s.placeId}>
                      <button
                        type="button"
                        disabled={isResolvingAddress}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 disabled:opacity-50"
                        onClick={() => void onPickSuggestion(s)}
                      >
                        {s.description}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-2 text-sm text-zinc-500">No suggestions.</p>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={isLocating}
              onClick={() => requestBrowserLocation()}
              className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm disabled:opacity-50"
            >
              {isLocating ? "Locating…" : "Use my current location"}
            </button>
          </div>
          {geoHint && <p className="text-sm text-red-600">{geoHint}</p>}
          {selectedFromDropdown && userCoords && (
            <p className="text-xs text-emerald-800">Location pinned for distance matching.</p>
          )}

          <label className="mt-3 block text-sm font-medium text-zinc-700">
            Search radius: {radiusMiles} miles
          </label>
          <input
            type="range"
            min={5}
            max={100}
            step={1}
            value={radiusMiles}
            onChange={(ev) => setRadiusMiles(Number(ev.target.value))}
            className="w-full"
          />
        </fieldset>

        <fieldset className="space-y-2 rounded-lg border border-zinc-200 p-4">
          <legend className="px-1 text-sm font-semibold text-zinc-900">
            2. Who are you searching for?
          </legend>
          <select
            value={relationship}
            onChange={(e) => setRelationship(e.target.value as RelationshipToPatient)}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="self">Myself</option>
            <option value="parent">Parent</option>
            <option value="grandparent">Grandparent</option>
            <option value="spouse_partner">Spouse or partner</option>
            <option value="other_family">Other family</option>
            <option value="friend">Friend</option>
            <option value="other">Someone else</option>
            <option value="prefer_not_say">Prefer not to say</option>
          </select>
        </fieldset>

        <fieldset className="space-y-2 rounded-lg border border-zinc-200 p-4">
          <legend className="px-1 text-sm font-semibold text-zinc-900">
            3. Primary condition
          </legend>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as PrimaryCondition)}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="cancer">Cancer</option>
            <option value="dementia">Dementia / Alzheimer’s</option>
            <option value="stroke">Stroke / neurological</option>
            <option value="heart">Heart / circulatory</option>
            <option value="respiratory">Respiratory</option>
            <option value="other">Other</option>
            <option value="not_sure">Not sure yet</option>
          </select>
        </fieldset>

        <fieldset className="space-y-2 rounded-lg border border-zinc-200 p-4">
          <legend className="px-1 text-sm font-semibold text-zinc-900">
            4. Where will care most likely happen?
          </legend>
          <select
            value={careSetting}
            onChange={(e) => setCareSetting(e.target.value as CareSettingPreference)}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="home">Home</option>
            <option value="assisted_living">Assisted living</option>
            <option value="nursing_facility">Nursing facility</option>
            <option value="skilled_nursing">Skilled nursing</option>
            <option value="hospital">Hospital</option>
            <option value="inpatient_hospice">Inpatient hospice</option>
            <option value="not_sure">Not sure</option>
          </select>
        </fieldset>

        <fieldset className="space-y-2 rounded-lg border border-zinc-200 p-4">
          <legend className="px-1 text-sm font-semibold text-zinc-900">
            5. If symptoms worsen, how important is access to higher-intensity hospice care?
          </legend>
          <select
            value={intensityImportance}
            onChange={(e) =>
              setIntensityImportance(e.target.value as IntensityImportance)
            }
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="very">Very important</option>
            <option value="somewhat">Somewhat important</option>
            <option value="not">Not very important right now</option>
            <option value="not_sure">Not sure</option>
          </select>
        </fieldset>

        <fieldset className="space-y-3 rounded-lg border border-zinc-200 p-4">
          <legend className="px-1 text-sm font-semibold text-zinc-900">
            6. What matters most? (choose up to 3)
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {PRIORITY_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                className="flex cursor-pointer items-start gap-2 rounded border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={priorities.includes(opt.id)}
                  disabled={!priorities.includes(opt.id) && priorities.length >= 3}
                  onChange={() => togglePriority(opt.id)}
                  className="mt-0.5"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-zinc-500">{priorities.length} of 3 selected</p>
        </fieldset>

        {submitError && (
          <p className="text-sm text-red-700" role="alert">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit || isSubmitting || isLocating}
          className="rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
        >
          {isSubmitting ? "Finding matches…" : "See my matches"}
        </button>
        {!locationInput.trim() && (
          <p className="text-xs text-zinc-500">
            Enter where care is needed — pick a suggestion or we’ll geocode what you type when
            you submit.
          </p>
        )}
      </form>
    </main>
  )
}

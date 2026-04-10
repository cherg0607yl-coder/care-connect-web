"use client"

import { useCallback, useEffect, useRef, type CSSProperties } from "react"
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api"

export type SearchResultsMapOrg = {
  id: string | number
  name: string
  latitude: number
  longitude: number
}

const mapContainerStyle: CSSProperties = {
  width: "100%",
  height: "min(50vh, 420px)",
  minHeight: "280px",
}

const defaultCenter = { lat: 39.8283, lng: -98.5795 }

type Props = {
  organizations: SearchResultsMapOrg[]
  userLocation: { lat: number; lng: number } | null
  selectedId: string | number | null
  onMarkerSelect: (id: string | number) => void
  reduceMotion: boolean
}

export function SearchResultsMap({
  organizations,
  userLocation,
  selectedId,
  onMarkerSelect,
  reduceMotion,
}: Props) {
  const mapRef = useRef<google.maps.Map | null>(null)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""

  const { isLoaded, loadError } = useJsApiLoader({
    id: "care-connect-google-maps",
    googleMapsApiKey: apiKey,
  })

  const fitMap = useCallback(
    (map: google.maps.Map) => {
      const bounds = new google.maps.LatLngBounds()
      let count = 0
      for (const o of organizations) {
        bounds.extend({ lat: o.latitude, lng: o.longitude })
        count += 1
      }
      if (userLocation) {
        bounds.extend(userLocation)
      }
      if (count === 0 && userLocation) {
        map.setCenter(userLocation)
        map.setZoom(11)
        return
      }
      if (count === 0) {
        map.setCenter(defaultCenter)
        map.setZoom(4)
        return
      }
      map.fitBounds(bounds, 48)
    },
    [organizations, userLocation]
  )

  const handleMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map
      fitMap(map)
    },
    [fitMap]
  )

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return
    fitMap(mapRef.current)
  }, [isLoaded, fitMap])

  useEffect(() => {
    const map = mapRef.current
    if (!map || selectedId == null) return
    const org = organizations.find((o) => String(o.id) === String(selectedId))
    if (!org) return
    map.panTo({ lat: org.latitude, lng: org.longitude })
    const z = map.getZoom() ?? 10
    if (!reduceMotion && z < 12) {
      map.setZoom(12)
    }
  }, [selectedId, organizations, reduceMotion])

  if (!apiKey) {
    return (
      <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-4 text-sm text-zinc-600">
        Add a <strong>browser</strong> Maps key to <code className="rounded bg-zinc-200/80 px-1">.env.local</code>{" "}
        as <code className="rounded bg-zinc-200/80 px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> (or{" "}
        <code className="rounded bg-zinc-200/80 px-1">GOOGLE_MAPS_BROWSER_KEY</code>), enable{" "}
        <strong>Maps JavaScript API</strong> for that key, then restart <code className="rounded bg-zinc-200/80 px-1">npm run dev</code>.
        The server-only <code className="rounded bg-zinc-200/80 px-1">GOOGLE_MAPS_SERVER_API_KEY</code> is not
        available in the browser.
      </p>
    )
  }

  if (loadError) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-4 text-sm text-red-800">
        Could not load Google Maps: {loadError.message}
      </p>
    )
  }

  if (!isLoaded) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-sm text-zinc-600"
        style={mapContainerStyle}
      >
        Loading map…
      </div>
    )
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={defaultCenter}
      zoom={4}
      options={{
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        gestureHandling: "cooperative",
      }}
      onLoad={handleMapLoad}
      onUnmount={() => {
        mapRef.current = null
      }}
    >
      {userLocation && (
        <Marker
          position={userLocation}
          title="Your search location"
          zIndex={1000}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#0ea5e9",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          }}
        />
      )}
      {organizations.map((org) => (
        <Marker
          key={String(org.id)}
          position={{ lat: org.latitude, lng: org.longitude }}
          title={org.name}
          onClick={() => onMarkerSelect(org.id)}
          zIndex={String(selectedId) === String(org.id) ? 500 : 1}
        />
      ))}
    </GoogleMap>
  )
}

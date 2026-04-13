import { NextResponse } from "next/server"

type GoogleGeocodeResponse = {
  results?: Array<{
    formatted_address?: string
    geometry?: { location?: { lat: number; lng: number } }
  }>
  status?: string
  error_message?: string
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const address = (url.searchParams.get("address") ?? "").trim()
  const latParam = url.searchParams.get("lat")
  const lngParam = url.searchParams.get("lng")
  const lat = latParam != null ? Number(latParam) : NaN
  const lng = lngParam != null ? Number(lngParam) : NaN
  const isReverse =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180

  if (!isReverse && address.length < 3) {
    return NextResponse.json(
      { error: "Provide a valid address (3+ chars) or lat and lng for reverse geocoding" },
      { status: 400 }
    )
  }

  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing GOOGLE_MAPS_SERVER_API_KEY" },
      { status: 500 }
    )
  }

  const googleUrl = new URL("https://maps.googleapis.com/maps/api/geocode/json")
  if (isReverse) {
    googleUrl.searchParams.set("latlng", `${lat},${lng}`)
  } else {
    googleUrl.searchParams.set("address", address)
    googleUrl.searchParams.set("components", "country:US")
  }
  googleUrl.searchParams.set("key", apiKey)

  try {
    const response = await fetch(googleUrl.toString(), {
      headers: { Accept: "application/json" },
    })
    const data = (await response.json()) as GoogleGeocodeResponse

    if (!response.ok || data.status !== "OK" || !data.results?.[0]) {
      return NextResponse.json(
        {
          error:
            data.error_message ??
            data.status ??
            (isReverse
              ? "Could not resolve address for these coordinates"
              : "Could not find coordinates for this address"),
        },
        { status: 502 }
      )
    }

    const lat = data.results[0].geometry?.location?.lat
    const lng = data.results[0].geometry?.location?.lng
    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json(
        { error: "No coordinates in geocode response" },
        { status: 502 }
      )
    }

    return NextResponse.json({
      lat,
      lng,
      formattedAddress: data.results[0].formatted_address ?? null,
    })
  } catch {
    return NextResponse.json(
      { error: "Geocoding request failed" },
      { status: 500 }
    )
  }
}

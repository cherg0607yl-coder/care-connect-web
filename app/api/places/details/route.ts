import { NextResponse } from "next/server"

type GooglePlaceDetailsResponse = {
  result?: {
    formatted_address?: string
    geometry?: { location?: { lat: number; lng: number } }
  }
  status?: string
  error_message?: string
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const placeId = (url.searchParams.get("placeId") ?? "").trim()

  if (!placeId) {
    return NextResponse.json({ error: "Missing placeId" }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing GOOGLE_MAPS_SERVER_API_KEY" },
      { status: 500 }
    )
  }

  const googleUrl = new URL(
    "https://maps.googleapis.com/maps/api/place/details/json"
  )
  googleUrl.searchParams.set("place_id", placeId)
  googleUrl.searchParams.set(
    "fields",
    "geometry/location,formatted_address"
  )
  googleUrl.searchParams.set("key", apiKey)

  try {
    const response = await fetch(googleUrl.toString(), {
      headers: { Accept: "application/json" },
    })
    const data = (await response.json()) as GooglePlaceDetailsResponse

    if (!response.ok || data.status !== "OK" || !data.result) {
      return NextResponse.json(
        {
          error:
            data.error_message ??
            data.status ??
            "Place details request failed",
        },
        { status: 502 }
      )
    }

    const lat = data.result.geometry?.location?.lat
    const lng = data.result.geometry?.location?.lng
    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json(
        { error: "No coordinates returned for this place" },
        { status: 502 }
      )
    }

    return NextResponse.json({
      lat,
      lng,
      formattedAddress: data.result.formatted_address ?? null,
    })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch place details" },
      { status: 500 }
    )
  }
}

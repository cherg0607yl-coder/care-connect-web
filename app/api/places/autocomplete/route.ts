import { NextResponse } from "next/server"

type GoogleAutocompleteResponse = {
  predictions?: Array<{
    description: string
    place_id: string
  }>
  status?: string
  error_message?: string
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const input = (url.searchParams.get("input") ?? "").trim()

  if (input.length < 2) {
    return NextResponse.json({ suggestions: [] })
  }

  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Missing GOOGLE_MAPS_SERVER_API_KEY",
        suggestions: [],
      },
      { status: 500 }
    )
  }

  const googleUrl = new URL(
    "https://maps.googleapis.com/maps/api/place/autocomplete/json"
  )
  googleUrl.searchParams.set("input", input)
  googleUrl.searchParams.set("components", "country:us")
  googleUrl.searchParams.set("types", "geocode")
  googleUrl.searchParams.set("key", apiKey)

  try {
    const response = await fetch(googleUrl.toString(), {
      headers: { Accept: "application/json" },
    })
    const data = (await response.json()) as GoogleAutocompleteResponse

    if (
      !response.ok ||
      (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS")
    ) {
      return NextResponse.json(
        {
          error: data.error_message ?? data.status ?? "Autocomplete failed",
          suggestions: [],
        },
        { status: 502 }
      )
    }

    const suggestions = (data.predictions ?? []).map((prediction) => ({
      placeId: prediction.place_id,
      description: prediction.description,
    }))

    return NextResponse.json({ suggestions })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch location suggestions", suggestions: [] },
      { status: 500 }
    )
  }
}

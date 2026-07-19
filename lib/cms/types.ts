/** Normalized hospice facility stored in the local CMS cache. */
export type CachedOrganization = {
  id: string
  ccn: string
  name: string
  addressLine1: string | null
  city: string | null
  state: string | null
  zip: string | null
  county: string | null
  phone: string | null
  cmsRegion: string | null
  ownershipType: string | null
  certificationDate: string | null
  latitude: number | null
  longitude: number | null
}

export type CachedMeasurement = {
  score: string | null
  measureName: string | null
  measureDateRange: string | null
}

/** Latest score per measure code, keyed by normalized CCN. */
export type CachedMeasurementsByCcn = Record<string, Record<string, CachedMeasurement>>

export type CmsCacheFile = {
  syncedAt: string
  source: {
    generalInfoDataset: string
    providerDataDataset: string
  }
  organizations: CachedOrganization[]
  measurementsByCcn: CachedMeasurementsByCcn
}

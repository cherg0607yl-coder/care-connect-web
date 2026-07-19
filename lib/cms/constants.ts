import path from "node:path"

/** Hospice - General Information (facility identity / address). */
export const CMS_GENERAL_INFO_DATASET = "yc9t-dgbk"

/** Hospice - Provider Data (quality + care measures). */
export const CMS_PROVIDER_DATA_DATASET = "252m-zfp9"

export const CMS_DATASTORE_BASE =
  "https://data.cms.gov/provider-data/api/1/datastore/query"

export const CMS_CACHE_DIR = path.join(process.cwd(), "data", "cms")
export const CMS_CACHE_PATH = path.join(CMS_CACHE_DIR, "cache.json")

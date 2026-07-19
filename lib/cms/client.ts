import { CMS_DATASTORE_BASE } from "@/lib/cms/constants"

export type CmsQueryCondition = {
  property: string
  operator: "=" | "in" | "!=" | ">" | ">=" | "<" | "<=" | "like"
  value: string | string[]
}

export type CmsDatastoreResponse<T> = {
  results: T[]
  count: number
}

const DEFAULT_PAGE_SIZE = 1000

/**
 * Query a CMS Provider Data Catalog datastore resource.
 * @see https://data.cms.gov/provider-data/api/1/datastore/query/{datasetId}/0
 */
export async function queryCmsDatastore<T extends Record<string, unknown>>(
  datasetId: string,
  options: {
    limit?: number
    offset?: number
    properties?: string[]
    conditions?: CmsQueryCondition[]
  } = {}
): Promise<CmsDatastoreResponse<T>> {
  const url = `${CMS_DATASTORE_BASE}/${datasetId}/0`
  const body = {
    limit: options.limit ?? DEFAULT_PAGE_SIZE,
    offset: options.offset ?? 0,
    properties: options.properties,
    conditions: options.conditions,
    count: true,
    results: true,
    schema: false,
    keys: true,
    format: "json",
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(
      `CMS datastore query failed (${datasetId}): ${response.status} ${text.slice(0, 200)}`
    )
  }

  return (await response.json()) as CmsDatastoreResponse<T>
}

/** Paginate through an entire CMS dataset (or filtered subset). */
export async function fetchAllCmsRows<T extends Record<string, unknown>>(
  datasetId: string,
  options: {
    pageSize?: number
    properties?: string[]
    conditions?: CmsQueryCondition[]
    onPage?: (fetched: number, total: number) => void
  } = {}
): Promise<T[]> {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE
  const out: T[] = []
  let offset = 0
  let total = Infinity

  while (offset < total) {
    const page = await queryCmsDatastore<T>(datasetId, {
      limit: pageSize,
      offset,
      properties: options.properties,
      conditions: options.conditions,
    })
    total = page.count
    out.push(...page.results)
    options.onPage?.(out.length, total)
    if (page.results.length === 0 || page.results.length < pageSize) break
    offset += pageSize
  }

  return out
}

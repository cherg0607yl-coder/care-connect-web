/**
 * Sync CMS hospice datasets into data/cms/cache.json and geocode by ZIP centroid.
 *
 * Usage: npm run sync:cms
 *
 * Downloads official CSVs from the CMS Provider Data Catalog:
 * - yc9t-dgbk Hospice General Information
 * - 252m-zfp9 Hospice Provider Data (filtered to app measure codes)
 */
import { createWriteStream, mkdirSync, writeFileSync } from "node:fs"
import { unlink } from "node:fs/promises"
import { createRequire } from "node:module"
import os from "node:os"
import path from "node:path"
import { pipeline } from "node:stream/promises"
import { createInterface } from "node:readline"
import { createReadStream } from "node:fs"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const zipcodes = require("zipcodes")

const GENERAL_INFO = "yc9t-dgbk"
const PROVIDER_DATA = "252m-zfp9"
const METASTORE_BASE =
  "https://data.cms.gov/provider-data/api/1/metastore/schemas/dataset/items"

const DETAIL_MEASURE_CODES = [
  "Pct_Pts_w_Cancer",
  "Pct_Pts_w_Dementia",
  "Pct_Pts_w_Stroke",
  "Pct_Pts_w_Circ_Heart_Disease",
  "Pct_Pts_w_Resp_Disease",
  "Pct_Pts_w_other_conditions",
  "Care_Provided_Home",
  "Care_Provided_Assisted_Living",
  "Care_Provided_Nursing_Facility",
  "Care_Provided_Skilled_Nursing",
  "Care_Provided_Inpatient_Hospital",
  "Care_Provided_Inpatient_Hospice",
  "Care_Provided_other_locations",
  "Provided_Home_Care_only",
  "Provided_Home_Care_and_other",
]

const QUALITY_HIGHER = [
  "H_012_00_OBSERVED",
  "H_011_01_OBSERVED",
  "H_008_01_OBSERVED",
  "H_012_10_OBSERVED",
  "H_012_08_OBSERVED",
  "H_012_09_OBSERVED",
  "H_012_01_OBSERVED",
]

const QUALITY_LOWER = ["H_012_02_OBSERVED", "H_012_05_OBSERVED"]

const ALL_MEASURE_CODES = new Set([
  ...DETAIL_MEASURE_CODES,
  ...QUALITY_HIGHER,
  ...QUALITY_LOWER,
])

function normalizeCcn(raw) {
  if (raw == null || raw === "") return ""
  let s = String(raw).trim()
  if (s === "") return ""
  if (/^\d+\.0+$/.test(s)) s = s.replace(/\.\d+$/, "")
  if (/^\d+$/.test(s) && s.length > 0 && s.length < 6) return s.padStart(6, "0")
  return s
}

function normalizeZip(raw) {
  if (raw == null || raw === "") return null
  const digits = String(raw).replace(/\D/g, "")
  if (digits.length < 5) return null
  return digits.slice(0, 5)
}

function text(raw) {
  if (raw == null) return null
  const s = String(raw).trim()
  return s === "" ? null : s
}

function lookupZipCoords(zip) {
  const hit = zipcodes.lookup(zip)
  if (!hit) return null
  if (!Number.isFinite(hit.latitude) || !Number.isFinite(hit.longitude)) return null
  return { latitude: hit.latitude, longitude: hit.longitude }
}

/** Minimal RFC4180 CSV line parser (handles quoted commas/quotes). */
function parseCsvLine(line) {
  const out = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ",") {
      out.push(cur)
      cur = ""
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}

async function fetchWithRetry(url, tries = 4) {
  let lastErr
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json,*/*" },
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`)
      }
      return response
    } catch (err) {
      lastErr = err
      const delay = attempt * 1500
      console.warn(
        `  retry ${attempt}/${tries} after error: ${err instanceof Error ? err.message : err}`
      )
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastErr
}

async function resolveCsvDownloadUrl(datasetId) {
  const response = await fetchWithRetry(`${METASTORE_BASE}/${datasetId}`)
  const meta = await response.json()
  const distributions = meta.distribution ?? []
  const csv = distributions.find(
    (d) =>
      d.mediaType === "text/csv" ||
      String(d.downloadURL ?? "").toLowerCase().endsWith(".csv")
  )
  const url = csv?.downloadURL
  if (!url) {
    throw new Error(`No CSV downloadURL found for dataset ${datasetId}`)
  }
  return url
}

async function downloadToTemp(url, label) {
  console.log(`Downloading ${label}…`)
  console.log(`  ${url}`)
  const response = await fetchWithRetry(url)
  const tmpPath = path.join(os.tmpdir(), `cms-${label}-${Date.now()}.csv`)
  await pipeline(response.body, createWriteStream(tmpPath))
  console.log(`  saved ${tmpPath}`)
  return tmpPath
}

async function readCsvRows(filePath, onRow) {
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  })

  let headers = null
  let rowCount = 0
  for await (const line of rl) {
    if (!line.trim()) continue
    const cols = parseCsvLine(line)
    if (!headers) {
      headers = cols.map((h) => h.replace(/^\uFEFF/, "").trim())
      continue
    }
    const row = {}
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]] = cols[i] ?? ""
    }
    rowCount += 1
    onRow(row, rowCount)
  }
  return rowCount
}

async function main() {
  const generalUrl = await resolveCsvDownloadUrl(GENERAL_INFO)
  const providerUrl = await resolveCsvDownloadUrl(PROVIDER_DATA)

  const generalPath = await downloadToTemp(generalUrl, "general-info")
  const providerPath = await downloadToTemp(providerUrl, "provider-data")

  console.log("Parsing General Information…")
  let withCoords = 0
  const organizations = []
  await readCsvRows(generalPath, (row) => {
    const ccn = normalizeCcn(row["CMS Certification Number (CCN)"])
    if (!ccn) return
    const zip = normalizeZip(row["ZIP Code"])
    const coords = zip ? lookupZipCoords(zip) : null
    if (coords) withCoords += 1

    organizations.push({
      id: ccn,
      ccn,
      name: text(row["Facility Name"]) ?? "Unknown organization",
      addressLine1: text(row["Address Line 1"]),
      city: text(row["City/Town"]),
      state: text(row.State),
      zip,
      county: text(row["County/Parish"]),
      phone: text(row["Telephone Number"]),
      cmsRegion: text(row["CMS Region"]),
      ownershipType: text(row["Ownership Type"]),
      certificationDate: text(row["Certification Date"]),
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
    })
  })
  console.log(`  organizations: ${organizations.length.toLocaleString()}`)

  console.log("Parsing Provider Data measures…")
  const measurementsByCcn = {}
  let kept = 0
  await readCsvRows(providerPath, (row, rowCount) => {
    if (rowCount % 100000 === 0) {
      console.log(`  scanned ${rowCount.toLocaleString()} rows…`)
    }
    const code = text(row["Measure Code"])
    if (!code || !ALL_MEASURE_CODES.has(code)) return
    const ccn = normalizeCcn(row["CMS Certification Number (CCN)"])
    if (!ccn) return
    if (!measurementsByCcn[ccn]) measurementsByCcn[ccn] = {}
    measurementsByCcn[ccn][code] = {
      score: text(row.Score),
      measureName: text(row["Measure Name"]),
      measureDateRange: text(row["Measure Date Range"]),
    }
    kept += 1
  })
  console.log(`  kept measure rows: ${kept.toLocaleString()}`)

  const cache = {
    syncedAt: new Date().toISOString(),
    source: {
      generalInfoDataset: GENERAL_INFO,
      providerDataDataset: PROVIDER_DATA,
      generalInfoCsv: generalUrl,
      providerDataCsv: providerUrl,
    },
    organizations,
    measurementsByCcn,
  }

  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
  const outDir = path.join(root, "data", "cms")
  const outPath = path.join(outDir, "cache.json")
  mkdirSync(outDir, { recursive: true })
  writeFileSync(outPath, JSON.stringify(cache))

  await unlink(generalPath).catch(() => {})
  await unlink(providerPath).catch(() => {})

  console.log("\nDone.")
  console.log(`  Organizations: ${organizations.length.toLocaleString()}`)
  console.log(`  With ZIP coords: ${withCoords.toLocaleString()}`)
  console.log(
    `  CCNs with measures: ${Object.keys(measurementsByCcn).length.toLocaleString()}`
  )
  console.log(`  Wrote ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

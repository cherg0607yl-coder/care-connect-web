"use client"

import { useEffect, useId, useState, type ReactNode } from "react"
import {
  ORG_DETAIL_MEASURE_CODES,
  type OrganizationDetailMeasurements,
} from "@/lib/organizations/org-detail-measures"

const CARE_COMPARE = "https://www.medicare.gov/care-compare"
const HOSPICE_COVERAGE = "https://www.medicare.gov/coverage/hospice-care"
/** CMS / Medicare resource for choosing hospice (public guidance). */
const CHOOSING_HOSPICE_RESOURCES = "https://www.medicare.gov/care-compare/about/helpful-resources"

type Props = {
  onClose: () => void
  name: string
  ccn: string | null
  fullLocation: string
  phone: string | null
  measurements: OrganizationDetailMeasurements
}

const CONDITIONS_ROWS: { code: string; label: string }[] = [
  { code: "Pct_Pts_w_Cancer", label: "Cancer" },
  { code: "Pct_Pts_w_Dementia", label: "Dementia" },
  { code: "Pct_Pts_w_Stroke", label: "Stroke" },
  { code: "Pct_Pts_w_Circ_Heart_Disease", label: "Circulatory/heart disease" },
  { code: "Pct_Pts_w_Resp_Disease", label: "Respiratory disease" },
  { code: "Pct_Pts_w_other_conditions", label: "Other conditions" },
]

const LOCATION_ROWS: { code: string; label: string }[] = [
  { code: "Care_Provided_Home", label: "Home" },
  { code: "Care_Provided_Assisted_Living", label: "Assisted living facility" },
  { code: "Care_Provided_Nursing_Facility", label: "Nursing facility" },
  { code: "Care_Provided_Skilled_Nursing", label: "Skilled nursing facility" },
  { code: "Care_Provided_Inpatient_Hospital", label: "Inpatient hospital facility" },
  { code: "Care_Provided_Inpatient_Hospice", label: "Inpatient hospice facility" },
  { code: "Care_Provided_other_locations", label: "Other locations" },
]

function score(m: OrganizationDetailMeasurements, code: string): string {
  return m[code]?.scoreDisplay ?? "—"
}

function hasAnyMeasurementData(measurements: OrganizationDetailMeasurements): boolean {
  return ORG_DETAIL_MEASURE_CODES.some(
    (code) => measurements[code]?.scoreDisplay && measurements[code]!.scoreDisplay !== "—"
  )
}

function ModalBackdrop({
  children,
  onBackdrop,
  zClass = "z-50",
}: {
  children: ReactNode
  onBackdrop: () => void
  zClass?: string
}) {
  return (
    <div
      className={`fixed inset-0 ${zClass} flex items-center justify-center bg-black/45 p-4`}
      role="presentation"
      onClick={onBackdrop}
    >
      {children}
    </div>
  )
}

function ModalPanel({
  titleId,
  children,
  onClose,
  title,
  footerExtra,
}: {
  titleId: string
  children: React.ReactNode
  onClose: () => void
  title: string
  footerExtra?: ReactNode
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="max-h-[min(90vh,720px)] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3">
        <h2 id={titleId} className="text-lg font-semibold text-zinc-900">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100"
        >
          Close
        </button>
      </div>
      <div className="max-h-[min(75vh,600px)] overflow-y-auto px-4 py-4 text-sm text-zinc-700">
        {children}
      </div>
      {footerExtra ? (
        <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-2">{footerExtra}</div>
      ) : null}
    </div>
  )
}

function MeasureTable({
  rows,
  measurements,
  valueHeader,
}: {
  rows: { code: string; label: string }[]
  measurements: OrganizationDetailMeasurements
  valueHeader: string
}) {
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200">
      <table className="w-full min-w-[320px] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50">
            <th className="px-3 py-2 font-medium text-zinc-800">Medical condition</th>
            <th className="px-3 py-2 font-medium text-zinc-800">{valueHeader}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.code} className="border-b border-zinc-100 last:border-0">
              <td className="px-3 py-2 text-zinc-700">{row.label}</td>
              <td className="px-3 py-2 font-medium tabular-nums text-zinc-900">
                {score(measurements, row.code)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LocationTable({
  measurements,
}: {
  measurements: OrganizationDetailMeasurements
}) {
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200">
      <table className="w-full min-w-[320px] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50">
            <th className="px-3 py-2 font-medium text-zinc-800">Site</th>
            <th className="px-3 py-2 font-medium text-zinc-800">Percent of care</th>
          </tr>
        </thead>
        <tbody>
          {LOCATION_ROWS.map((row) => (
            <tr key={row.code} className="border-b border-zinc-100 last:border-0">
              <td className="px-3 py-2 text-zinc-700">{row.label}</td>
              <td className="px-3 py-2 font-medium tabular-nums text-zinc-900">
                {score(measurements, row.code)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function OrganizationDetailModals({
  onClose,
  name,
  ccn,
  fullLocation,
  phone,
  measurements,
}: Props) {
  const mainTitleId = useId()
  const [sub, setSub] = useState<"location" | "level" | null>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return
      if (sub) setSub(null)
      else onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [sub, onClose])

  function printSection() {
    window.print()
  }

  return (
    <>
      <ModalBackdrop
        zClass="z-50"
        onBackdrop={() => {
          if (sub) setSub(null)
          else onClose()
        }}
      >
        <ModalPanel titleId={mainTitleId} title={name} onClose={onClose}>
          {ccn && (
            <p className="mb-3 font-mono text-xs text-zinc-500">CMS Certification Number {ccn}</p>
          )}
          <p className="text-zinc-600">{fullLocation || "Address not listed"}</p>
          {phone && (
            <p className="mt-1">
              <a href={`tel:${phone.replace(/\D/g, "")}`} className="text-zinc-900 underline">
                {phone}
              </a>
            </p>
          )}

          <section className="mt-6">
            <h3 className="text-base font-semibold text-zinc-900">1. Conditions treated</h3>
            <p className="mt-2 leading-relaxed text-zinc-600">
              Hospices care for patients with terminal illnesses like cancer, dementia, stroke,
              heart disease, and respiratory disease. This table shows the conditions a hospice
              most commonly treats based on their patients&apos; primary diagnoses in the
              reporting period reflected in CMS data. When choosing a hospice, consider
              discussing this information and the quality of patient care information with your
              doctor. For help having this discussion, see{" "}
              <a
                href={CHOOSING_HOSPICE_RESOURCES}
                className="text-zinc-900 underline"
                target="_blank"
                rel="noreferrer"
              >
                suggested questions when choosing a hospice
              </a>{" "}
              on Medicare Care Compare.
            </p>
            <p className="mt-2">
              <a
                href={CARE_COMPARE}
                className="text-sm font-medium text-zinc-900 underline"
                target="_blank"
                rel="noreferrer"
              >
                Read more on Care Compare
              </a>
            </p>
            <MeasureTable
              rows={CONDITIONS_ROWS}
              measurements={measurements}
              valueHeader="Percent of patients with this condition"
            />
          </section>

          <section className="mt-8">
            <h3 className="text-base font-semibold text-zinc-900">2. General information</h3>
            <p className="mt-2 leading-relaxed text-zinc-600">
              Choose a category to see more information about the care this hospice agency
              provides:
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setSub("location")}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50"
              >
                Location of care
              </button>
              <button
                type="button"
                onClick={() => setSub("level")}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50"
              >
                Level of care provided
              </button>
            </div>
          </section>

          <p className="mt-8 text-xs leading-relaxed text-zinc-500">
            Data source: CMS hospice claims and quality files linked by CCN. Values may appear
            as &quot;Not Available&quot; when CMS does not publish a measure for this provider.
          </p>

          {ccn && !hasAnyMeasurementData(measurements) && (
            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
              <p className="font-medium text-zinc-800">
                No measurement values loaded for this CCN (all cells show —).
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>
                  In Supabase, open the <code className="rounded bg-zinc-200/60 px-1">measurements</code>{" "}
                  table and filter by this CCN to confirm rows exist.
                </li>
                <li>
                  CCN text must match between <code className="rounded bg-zinc-200/60 px-1">organizations</code>{" "}
                  and <code className="rounded bg-zinc-200/60 px-1">measurements</code> (we normalize
                  spacing and zero-pad numeric CCNs to 6 digits).
                </li>
                <li>
                  <code className="rounded bg-zinc-200/60 px-1">Measure Code</code> must match exactly
                  (e.g. <code className="rounded bg-zinc-200/60 px-1">Pct_Pts_w_Cancer</code>,{" "}
                  <code className="rounded bg-zinc-200/60 px-1">Care_Provided_Home</code>).
                </li>
              </ul>
            </div>
          )}
        </ModalPanel>
      </ModalBackdrop>

      {sub === "location" && (
        <ModalBackdrop zClass="z-[60]" onBackdrop={() => setSub(null)}>
          <ModalPanel
            titleId={`${mainTitleId}-loc`}
            title="Location of care"
            onClose={() => setSub(null)}
            footerExtra={
              <button
                type="button"
                onClick={printSection}
                className="text-sm font-medium text-zinc-800 underline"
              >
                Print
              </button>
            }
          >
            <p className="leading-relaxed text-zinc-600">
              Hospices provide care at many sites. They often provide care where you live, like
              in your apartment, an assisted living facility, residential facility, or nursing
              home. They can also provide care at other sites like hospitals or inpatient hospice
              facilities. This table shows where the hospice agency provided care to its
              patients in the reporting period in our dataset. While data may show that a hospice
              has not provided care to any patients at one of the listed sites, this does not
              mean a hospice is unable to provide care at that site. When choosing a hospice,
              consider discussing this information and the quality of patient care information
              with your doctor. For help having this discussion, see{" "}
              <a
                href={CHOOSING_HOSPICE_RESOURCES}
                className="text-zinc-900 underline"
                target="_blank"
                rel="noreferrer"
              >
                suggested questions when choosing a hospice
              </a>{" "}
              on Medicare Care Compare.
            </p>
            <p className="mt-2">
              <a
                href={CARE_COMPARE}
                className="text-sm font-medium text-zinc-900 underline"
                target="_blank"
                rel="noreferrer"
              >
                Read more on Care Compare
              </a>
            </p>
            <LocationTable measurements={measurements} />
          </ModalPanel>
        </ModalBackdrop>
      )}

      {sub === "level" && (
        <ModalBackdrop zClass="z-[60]" onBackdrop={() => setSub(null)}>
          <ModalPanel
            titleId={`${mainTitleId}-lvl`}
            title="Level of care provided"
            onClose={() => setSub(null)}
            footerExtra={
              <button
                type="button"
                onClick={printSection}
                className="text-sm font-medium text-zinc-800 underline"
              >
                Print
              </button>
            }
          >
            <p className="leading-relaxed text-zinc-600">
              All Medicare-certified hospices are required to offer four levels of hospice care
              depending on patient and caregiver needs.
            </p>
            <p className="mt-2">
              <a
                href={HOSPICE_COVERAGE}
                className="text-sm font-medium text-zinc-900 underline"
                target="_blank"
                rel="noreferrer"
              >
                Learn more about hospice levels of care
              </a>
            </p>
            <h4 className="mt-4 font-semibold text-zinc-900">
              Levels of care provided (reporting period in dataset)
            </h4>
            <p className="mt-1 text-zinc-600">
              The following values show whether this hospice provided only routine home care to
              its patients or both routine home care and at least one other level of care, as
              reflected in the underlying CMS-style measures.
            </p>
            <div className="mt-4 space-y-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <div>
                <p className="font-medium text-zinc-900">Provided routine home care only</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900">
                  {score(measurements, "Provided_Home_Care_only")}
                </p>
                <p className="mt-1 text-xs text-zinc-500">National average (reference): 12.6%</p>
              </div>
              <div>
                <p className="font-medium text-zinc-900">
                  Provided routine home care and at least one other level of care
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900">
                  {score(measurements, "Provided_Home_Care_and_other")}
                </p>
                <p className="mt-1 text-xs text-zinc-500">National average (reference): 87.4%</p>
              </div>
            </div>
          </ModalPanel>
        </ModalBackdrop>
      )}
    </>
  )
}

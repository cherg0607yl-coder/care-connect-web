"use client"

import { useEffect, useId, type ReactNode } from "react"
import {
  ORG_DETAIL_MEASURE_CODES,
  type OrganizationDetailMeasurements,
} from "@/lib/organizations/org-detail-measures"

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

const CARE_TYPE_ROWS: { code: string; label: string }[] = [
  { code: "Provided_Home_Care_only", label: "Home care only" },
  {
    code: "Provided_Home_Care_and_other",
    label: "Home care plus other levels (e.g. nursing or inpatient)",
  },
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
  firstColumnHeader,
  valueHeader,
}: {
  rows: { code: string; label: string }[]
  measurements: OrganizationDetailMeasurements
  firstColumnHeader: string
  valueHeader: string
}) {
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200">
      <table className="w-full min-w-[320px] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50">
            <th className="px-3 py-2 font-medium text-zinc-800">{firstColumnHeader}</th>
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

export function OrganizationDetailModals({
  onClose,
  name,
  ccn,
  fullLocation,
  phone,
  measurements,
}: Props) {
  const mainTitleId = useId()

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
      onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <>
      <ModalBackdrop zClass="z-50" onBackdrop={onClose}>
        <ModalPanel titleId={mainTitleId} title={name} onClose={onClose}>
          <p className="text-zinc-600">{fullLocation || "Address not listed"}</p>
          {phone && (
            <p className="mt-1">
              <a href={`tel:${phone.replace(/\D/g, "")}`} className="text-zinc-900 underline">
                {phone}
              </a>
            </p>
          )}

          <section className="mt-6">
            <h3 className="text-base font-semibold text-zinc-900">Conditions they often care for</h3>
            <MeasureTable
              rows={CONDITIONS_ROWS}
              measurements={measurements}
              firstColumnHeader="Condition"
              valueHeader="Share of patients"
            />
          </section>

          <section className="mt-8">
            <h3 className="text-base font-semibold text-zinc-900">Where care happens</h3>
            <MeasureTable
              rows={LOCATION_ROWS}
              measurements={measurements}
              firstColumnHeader="Place"
              valueHeader="Percent of care"
            />
          </section>

          <section className="mt-8">
            <h3 className="text-base font-semibold text-zinc-900">Types of care offered</h3>
            <MeasureTable
              rows={CARE_TYPE_ROWS}
              measurements={measurements}
              firstColumnHeader="Type"
              valueHeader="On record"
            />
          </section>

          {ccn && !hasAnyMeasurementData(measurements) && (
            <p className="mt-6 text-sm text-zinc-600">
              We don&apos;t have breakdown numbers for this provider yet. &quot;—&quot; means the
              data wasn&apos;t available here.
            </p>
          )}
        </ModalPanel>
      </ModalBackdrop>
    </>
  )
}

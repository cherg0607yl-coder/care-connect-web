"use client"

import { useState, type MouseEvent } from "react"
import type { OrganizationDetailMeasurements } from "@/lib/organizations/org-detail-measures"
import { OrganizationDetailModals } from "./organization-detail-modals"

type Props = {
  organizationId: string | number
  name: string
  ccn: string | null
  fullLocation: string
  phone: string | null
  distanceMiles: number | null
  detailMeasurements: OrganizationDetailMeasurements
  mapIntegrationEnabled?: boolean
  isMapSelected?: boolean
  onSelectForMap?: () => void
  /** Compare flow: whether this org is in the compare tray */
  compareSelected?: boolean
  /** False when 3 orgs already selected and this org is not one of them */
  compareCanAdd?: boolean
  onCompareToggle?: () => void
}

export function OrganizationSearchCard({
  organizationId,
  name,
  ccn,
  fullLocation,
  phone,
  distanceMiles,
  detailMeasurements,
  mapIntegrationEnabled = false,
  isMapSelected = false,
  onSelectForMap,
  compareSelected = false,
  compareCanAdd = true,
  onCompareToggle,
}: Props) {
  const [detailOpen, setDetailOpen] = useState(false)

  function handleCardPointerDown(event: MouseEvent<HTMLDivElement>) {
    if (!onSelectForMap) return
    const t = event.target as HTMLElement
    if (t.closest("a, button, [data-compare-control]")) return
    onSelectForMap()
  }

  return (
    <>
      <article
        id={`org-result-${organizationId}`}
        className={`flex gap-4 rounded-xl border bg-white p-4 shadow-sm ${
          isMapSelected ? "border-sky-400 ring-2 ring-sky-300" : "border-zinc-200"
        }`}
        onClick={handleCardPointerDown}
      >
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">{name}</h2>
          </div>
          <p className="text-sm text-zinc-600">{fullLocation || "Address not listed"}</p>
          {phone && (
            <p className="text-sm text-zinc-800">
              <a
                href={`tel:${phone.replace(/\D/g, "")}`}
                className="text-zinc-900 underline-offset-2 hover:underline"
              >
                {phone}
              </a>
            </p>
          )}
          {distanceMiles != null && (
            <p className="text-sm text-zinc-700">
              <span className="text-zinc-500">Distance </span>
              {distanceMiles.toFixed(1)} miles
            </p>
          )}
        </div>

        <div className="flex w-36 shrink-0 flex-col items-end gap-2 border-l border-zinc-100 pl-4 sm:w-44">
          {mapIntegrationEnabled && onSelectForMap && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSelectForMap()
              }}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Show on map
            </button>
          )}
          {onCompareToggle && (
            <button
              type="button"
              data-compare-control
              disabled={!compareSelected && !compareCanAdd}
              onClick={(e) => {
                e.stopPropagation()
                onCompareToggle()
              }}
              title={
                !compareSelected && !compareCanAdd
                  ? "You can compare up to 3 organizations. Remove one to add another."
                  : undefined
              }
              className={`w-full rounded-lg border px-3 py-2 text-center text-sm font-medium ${
                compareSelected
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                  : compareCanAdd
                    ? "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
                    : "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
              }`}
            >
              {compareSelected ? "Selected" : "Compare"}
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setDetailOpen(true)
            }}
            className="w-full rounded-lg bg-zinc-900 px-3 py-2.5 text-center text-sm font-medium text-white hover:bg-zinc-800"
          >
            Full details
          </button>
          <p className="text-right text-[11px] leading-snug text-zinc-500">
            Conditions & care settings
          </p>
        </div>
      </article>

      {detailOpen ? (
        <OrganizationDetailModals
          onClose={() => setDetailOpen(false)}
          name={name}
          ccn={ccn}
          fullLocation={fullLocation}
          phone={phone}
          measurements={detailMeasurements}
        />
      ) : null}
    </>
  )
}

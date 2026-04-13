import { COMPARE_SECTIONS } from "@/lib/compare/config"
import type { ComparisonOrganization } from "@/lib/compare/types"
import { displayMeasureField, displayOverviewField } from "@/lib/compare/displayCell"

type Props = {
  organizations: ComparisonOrganization[]
}

export function ComparisonTable({ organizations }: Props) {
  const cols = organizations.length

  return (
    <div className="space-y-10">
      {/* Section 1: Overview (org table fields, not measurements) */}
      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3">
          <h2 className="text-base font-semibold text-zinc-900">Overview</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-white">
                <th scope="col" className="w-[200px] px-4 py-3">
                  <span className="sr-only">Details</span>
                </th>
                {organizations.map((org) => (
                  <th
                    key={org.id}
                    scope="col"
                    className="min-w-[180px] px-4 py-3 text-left font-semibold text-zinc-900"
                  >
                    <div className="line-clamp-3">{org.name}</div>
                    {org.ccn && (
                      <div className="mt-1 font-mono text-xs font-normal text-zinc-500">
                        CCN {org.ccn}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-zinc-100">
                <th scope="row" className="px-4 py-3 text-left font-medium text-zinc-700">
                  Phone
                </th>
                {organizations.map((org) => (
                  <td key={org.id} className="px-4 py-3 text-zinc-800">
                    {org.phone ? (
                      <a
                        href={`tel:${org.phone.replace(/\D/g, "")}`}
                        className="text-emerald-800 underline-offset-2 hover:underline"
                      >
                        {org.phone}
                      </a>
                    ) : (
                      "Not available"
                    )}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-zinc-100">
                <th scope="row" className="px-4 py-3 text-left font-medium text-zinc-700">
                  Ownership type
                </th>
                {organizations.map((org) => {
                  const v = displayOverviewField(org, "Ownership_Type")
                  return (
                    <td
                      key={org.id}
                      className={`px-4 py-3 ${v.isMissing ? "text-zinc-500 italic" : "text-zinc-800"}`}
                    >
                      {v.display}
                    </td>
                  )
                })}
              </tr>
              <tr>
                <th scope="row" className="px-4 py-3 text-left font-medium text-zinc-700">
                  Medicare certification date
                </th>
                {organizations.map((org) => {
                  const v = displayOverviewField(org, "Medicare_Certification_Date")
                  return (
                    <td
                      key={org.id}
                      className={`px-4 py-3 ${v.isMissing ? "text-zinc-500 italic" : "text-zinc-800"}`}
                    >
                      {v.display}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Config-driven measurement sections */}
      {COMPARE_SECTIONS.map((section) => (
        <section
          key={section.id}
          className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
        >
          <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3">
            <h2 className="text-base font-semibold text-zinc-900">{section.title}</h2>
            {section.description ? (
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{section.description}</p>
            ) : null}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th
                    scope="col"
                    className="w-[220px] px-4 py-3 text-left font-medium text-zinc-600"
                  >
                    Measure
                  </th>
                  {organizations.map((org) => (
                    <th
                      key={org.id}
                      scope="col"
                      className="min-w-[140px] px-4 py-3 text-left font-semibold text-zinc-900"
                    >
                      <span className="line-clamp-2">{org.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.fields.map((field) => (
                  <tr key={field.key} className="border-b border-zinc-100 last:border-0">
                    <th scope="row" className="px-4 py-3 text-left font-medium text-zinc-700">
                      {field.label}
                    </th>
                    {organizations.map((org) => {
                      const v = displayMeasureField(org, field.key, field.format)
                      return (
                        <td
                          key={org.id}
                          className={`px-4 py-3 ${v.isMissing ? "text-zinc-500 italic" : "text-zinc-800"}`}
                        >
                          {v.display}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <p className="text-xs text-zinc-500">
        Data source: public Medicare hospice listings and quality files. Values reflect the latest
        loaded reporting period where available. {cols} organizations shown.
      </p>
    </div>
  )
}

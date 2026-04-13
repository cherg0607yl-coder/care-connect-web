"use client"

import type { CompareSelectionItem } from "@/lib/compare/types"
import { MAX_COMPARE_SELECTION } from "@/lib/compare/config"

type Props = {
  items: CompareSelectionItem[]
  onRemove: (id: string) => void
  onCompareClick: () => void
}

export function CompareSelectionBar({ items, onRemove, onCompareClick }: Props) {
  const count = items.length
  const canCompare = count >= 2

  return (
    <div
      className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 shadow-sm"
      aria-label="Organizations selected for comparison"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-900">Compare hospices</p>
          <p className="mt-0.5 text-xs text-zinc-600">
            Select up to {MAX_COMPARE_SELECTION} organizations. {count} of {MAX_COMPARE_SELECTION}{" "}
            selected.
          </p>
          {count === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">
              Use <span className="font-medium text-zinc-700">Compare</span> on a result card to add
              it here.
            </p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {items.map((item) => (
                <li key={item.id}>
                  <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-zinc-200 bg-white py-1 pl-3 pr-1 text-sm text-zinc-800 shadow-sm">
                    <span className="max-w-[200px] truncate sm:max-w-[260px]" title={item.name}>
                      {item.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                      aria-label={`Remove ${item.name} from comparison`}
                    >
                      Remove
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="shrink-0 sm:pt-0.5">
          <button
            type="button"
            disabled={!canCompare}
            onClick={onCompareClick}
            className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold sm:w-auto ${
              canCompare
                ? "bg-emerald-700 text-white hover:bg-emerald-800"
                : "cursor-not-allowed bg-zinc-200 text-zinc-500"
            }`}
          >
            {count < 2
              ? "Compare organizations"
              : count === 2
                ? "Compare 2 organizations"
                : "Compare 3 organizations"}
          </button>
        </div>
      </div>
    </div>
  )
}

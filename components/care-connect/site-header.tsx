import type { SVGProps } from "react"

export function SiteHeader() {
  return (
    <header className="border-b border-cc-text/10 bg-cc-bg px-6 py-6">
      <div className="mx-auto flex max-w-md justify-center sm:max-w-lg">
        <div className="flex items-center gap-2.5">
          <HeartIcon className="h-7 w-7 shrink-0 text-cc-text sm:h-8 sm:w-8" aria-hidden />
          <span className="font-serif text-3xl font-semibold tracking-tight text-cc-text sm:text-4xl">
            CareConnect
          </span>
        </div>
      </div>
    </header>
  )
}

/** Outline heart: stroke only (#2C2C2C via currentColor), no fill */
function HeartIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
      {...props}
    >
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        stroke="currentColor"
        strokeWidth={1.35}
        strokeLinejoin="round"
      />
    </svg>
  )
}

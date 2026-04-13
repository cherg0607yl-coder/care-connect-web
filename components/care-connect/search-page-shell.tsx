import type { ReactNode } from "react"

type Props = {
  children: ReactNode
}

/** Full-page background and horizontal padding for CareConnect marketing/search pages. */
export function SearchPageShell({ children }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-cc-bg text-cc-text">{children}</div>
  )
}

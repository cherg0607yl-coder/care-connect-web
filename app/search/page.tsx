import { HomeSearchPanel } from "@/components/care-connect/home-search-panel"
import { SearchPageShell } from "@/components/care-connect/search-page-shell"
import { SiteHeader } from "@/components/care-connect/site-header"

export default function SearchPage() {
  return (
    <SearchPageShell>
      <SiteHeader />
      <HomeSearchPanel />
    </SearchPageShell>
  )
}

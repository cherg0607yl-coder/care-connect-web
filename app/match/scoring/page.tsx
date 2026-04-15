import Link from "next/link"

export default function MatchScoringPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link href="/match" className="text-sm font-medium text-emerald-800 hover:underline">
        ← Back to questionnaire
      </Link>

      <h1 className="mt-6 text-3xl font-semibold text-zinc-900">How we calculate match scores</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">
        We give each provider a score from 0 to 100. Higher means the provider is a better match
        for the answers you gave. It is a ranking tool, not medical advice.
      </p>

      <section className="mt-8 rounded-lg border border-zinc-200 p-5">
        <h2 className="text-lg font-semibold text-zinc-900">The 4 parts of the score</h2>
        <ul className="mt-3 space-y-2 text-sm text-zinc-700">
          <li>
            <strong>Distance (about 30%)</strong>: closer providers score higher.
          </li>
          <li>
            <strong>Fit to your needs (about 35%)</strong>: condition experience, care setting, and
            care level support.
          </li>
          <li>
            <strong>Public quality measures (about 25%)</strong>: selected Medicare hospice quality
            indicators.
          </li>
          <li>
            <strong>Data confidence (about 10%)</strong>: checks how complete the public data is for
            that provider.
          </li>
        </ul>
      </section>

      <section className="mt-6 rounded-lg border border-zinc-200 p-5">
        <h2 className="text-lg font-semibold text-zinc-900">How your answers change ranking</h2>
        <ul className="mt-3 space-y-2 text-sm text-zinc-700">
          <li>If you choose priorities like "Closest location", distance gets more weight.</li>
          <li>If you choose quality-focused priorities, quality measures get more weight.</li>
          <li>
            If you are unsure on some questions, we use a balanced fallback so providers are not
            over-penalized.
          </li>
        </ul>
      </section>

      <section className="mt-6 rounded-lg border border-zinc-200 p-5">
        <h2 className="text-lg font-semibold text-zinc-900">What to do with this score</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-700">
          Use it to create a shortlist. Then call the top providers and ask about availability,
          services, insurance, and caregiver support. The best choice depends on your family&apos;s
          needs right now.
        </p>
      </section>
    </main>
  )
}

import Link from "next/link"

export default function MatchScoringPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link href="/match" className="text-sm font-medium text-emerald-800 hover:underline">
        ← Back to questionnaire
      </Link>

      <h1 className="mt-6 text-3xl font-semibold text-zinc-900">How we calculate match scores</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">
        We give each provider a score from 0 to 100. A higher score means the provider is likely a
        better fit for the answers you gave. This is a comparison tool to help with shortlisting,
        not medical advice.
      </p>

      <section className="mt-8 rounded-lg border border-zinc-200 p-5">
        <h2 className="text-lg font-semibold text-zinc-900">The 4 parts of the score</h2>
        <ul className="mt-3 space-y-2 text-sm text-zinc-700">
          <li>
            <strong>Distance (about 30%)</strong>: closer providers usually score higher within your
            search radius.
          </li>
          <li>
            <strong>Fit to your needs (about 35%)</strong>: combines condition experience, preferred
            care setting, and visit intensity support.
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
        <h2 className="text-lg font-semibold text-zinc-900">How the score is calculated (step by step)</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700">
          <li>
            We start with base weights for Distance, Fit, Quality, and Confidence.
          </li>
          <li>
            Your selected priorities (for example, Closest or Quality) can tilt these weights.
          </li>
          <li>
            We then normalize the weights so they always add up to 100 total points.
          </li>
          <li>
            Each layer is scored separately, then added together for the final match score.
          </li>
        </ol>
      </section>

      <section className="mt-6 rounded-lg border border-zinc-200 p-5">
        <h2 className="text-lg font-semibold text-zinc-900">How your answers change ranking</h2>
        <ul className="mt-3 space-y-2 text-sm text-zinc-700">
          <li>If you choose priorities like &quot;Closest location&quot;, distance gets more weight.</li>
          <li>If you choose quality-focused priorities, quality measures get more weight.</li>
          <li>
            If visit intensity is very important to you, that part of fit has a stronger effect.
          </li>
          <li>
            If you are unsure on some questions, we use a balanced fallback so providers are not
            over-penalized.
          </li>
        </ul>
      </section>

      <section className="mt-6 rounded-lg border border-zinc-200 p-5">
        <h2 className="text-lg font-semibold text-zinc-900">How we measure visit intensity</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-700">
          Visit intensity is estimated using Medicare&apos;s Hospice Visits in the Last Days of Life
          measure. In general, a higher reported percentage means stronger late-stage visit coverage.
          If this metric is unavailable for a provider, we apply a neutral fallback instead of
          assigning zero.
        </p>
      </section>

      <section className="mt-6 rounded-lg border border-zinc-200 p-5">
        <h2 className="text-lg font-semibold text-zinc-900">How to read the score breakdown</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-700">
          Hover over a provider&apos;s score to see points earned in each layer. This helps you compare
          providers for the reasons that matter most to you (for example, one provider may rank
          higher on quality while another ranks higher on distance).
        </p>
      </section>

      <section className="mt-6 rounded-lg border border-zinc-200 p-5">
        <h2 className="text-lg font-semibold text-zinc-900">Important limits to keep in mind</h2>
        <ul className="mt-3 space-y-2 text-sm text-zinc-700">
          <li>
            The score uses public data and your questionnaire answers. It cannot capture every
            clinical or personal factor.
          </li>
          <li>
            Data confidence can be lower for providers with missing public fields. When that happens,
            we show a note so you can interpret rankings carefully.
          </li>
          <li>
            A lower score does not mean poor care. It means a lower match to the specific
            preferences entered.
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

import Image from "next/image"

const HERO_SRC =
  "https://ennoblecare.com/wp-content/uploads/2024/01/iStock-1269847328.jpg"
const HERO_ALT =
  "Caregiver’s hands gently holding an older adult’s hands — compassionate support"

export function SearchHeroImage() {
  return (
    <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl shadow-md ring-1 ring-cc-text/10 lg:max-w-none xl:max-w-3xl">
      <div className="relative aspect-[3/2] w-full min-h-[220px] max-h-[min(640px,82vh)] sm:min-h-[280px] lg:min-h-[320px] lg:max-h-[min(720px,85vh)]">
        <Image
          src={HERO_SRC}
          alt={HERO_ALT}
          fill
          className="object-cover object-center"
          sizes="(max-width: 1024px) 100vw, 45vw"
          priority
        />
      </div>
    </div>
  )
}

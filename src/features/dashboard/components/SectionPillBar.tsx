import { useEffect, useState } from 'react'

export interface SectionPill {
  id: string
  label: string
}

interface SectionPillBarProps {
  sections: SectionPill[]
}

/**
 * Sticky horizontally-scrollable pill bar that scrolls to a section anchor on
 * tap and highlights the currently-visible section via IntersectionObserver.
 * Mobile-only — hidden on `md+` via the `.section-pill-bar` media query.
 *
 * Anchor sections must have matching `id` attributes and `scroll-margin-top`
 * to land below the bar after scrolling.
 */
export function SectionPillBar({ sections }: SectionPillBarProps) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? '')

  useEffect(() => {
    const elements = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => !!el)
    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) =>
            a.target.getBoundingClientRect().top < b.target.getBoundingClientRect().top ? -1 : 1
          )
        if (visible[0]?.target.id) setActive(visible[0].target.id)
      },
      // Trigger when the section's top crosses ~30% from the viewport top
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [sections])

  function jumpTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav className="section-pill-bar md:hidden" aria-label="Sections">
      <div className="section-pill-track">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => jumpTo(s.id)}
            className={`section-pill${active === s.id ? 'on' : ''}`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </nav>
  )
}

import { useEffect, useRef, useState } from 'react'

import { usePeriodMode } from '@/hooks/usePeriodMode'
import type { PeriodMode } from '@/lib/period'

import { BackupImportSection } from './components/BackupImportSection'
import { CategoriesSection } from './components/CategoriesSection'
import { DangerZoneSection } from './components/DangerZoneSection'
import { IgnoreRulesSection } from './components/IgnoreRulesSection'
import { ImportHistorySection } from './components/ImportHistorySection'
import { MappingsSection } from './components/MappingsSection'
import { OnboardingResetSection } from './components/OnboardingResetSection'
import { PersonsSection } from './components/PersonsSection'
import { ProfileSection } from './components/ProfileSection'
import { TagsSection } from './components/TagsSection'

const SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'categories', label: 'Categories' },
  { id: 'tags', label: 'Tags' },
  { id: 'people', label: 'People' },
  { id: 'rules', label: 'Auto-rules' },
  { id: 'imports', label: 'Import history' },
  { id: 'backup', label: 'Backup' },
  { id: 'danger', label: 'Danger zone' },
]

const PERIOD_OPTIONS: { id: PeriodMode; label: string }[] = [
  { id: 'fy', label: 'Financial year (Apr–Mar)' },
  { id: 'calendar', label: 'Calendar year' },
]

/**
 * Settings — two-column: a sticky left section list (`.setsplit` +
 * `.setnav`) and every section stacked on the right, scroll-spied so the
 * nav marks whichever section is in view. Every section component below
 * keeps its existing behaviour from before this restyle; this page only
 * changes how they're grouped and how they look.
 */
export function SettingsPage() {
  const { mode: periodMode, setMode: setPeriodMode } = usePeriodMode()
  const [activeId, setActiveId] = useState('profile')
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const sections = Array.from(root.querySelectorAll<HTMLElement>('section[id]'))
    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveId(visible[0].target.id)
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 }
    )
    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [])

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveId(id)
  }

  return (
    <div ref={rootRef} className="setsplit">
      <nav className="setnav" aria-label="Settings sections">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            aria-current={activeId === s.id ? 'true' : undefined}
            onClick={(e) => handleNavClick(e, s.id)}
          >
            {s.label}
          </a>
        ))}
      </nav>

      <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <section id="profile" className="sec" style={{ scrollMarginTop: 76 }}>
          <div className="sec-head">
            <h2 className="sec-title">Profile</h2>
            <span className="sub">Only you can see any of this</span>
          </div>
          <ProfileSection />

          <div className="card" style={{ marginTop: 4 }}>
            <div className="card-head">
              <div>
                <p className="card-title">Year mode</p>
                <p className="card-sub">
                  Changes what &ldquo;this year&rdquo; means everywhere, including Budget and
                  Insights.
                </p>
              </div>
            </div>
            <span className="seg">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  aria-pressed={periodMode === opt.id}
                  className={periodMode === opt.id ? 'on' : ''}
                  onClick={() => setPeriodMode(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </span>
          </div>

          <OnboardingResetSection />
        </section>

        <CategoriesSection />

        <section id="tags" className="sec" style={{ scrollMarginTop: 76 }}>
          <div className="sec-head">
            <h2 className="sec-title">Tags</h2>
            <span className="sub">Label and filter transactions across categories</span>
          </div>
          <TagsSection />
        </section>

        <section id="people" className="sec" style={{ scrollMarginTop: 76 }}>
          <div className="sec-head">
            <h2 className="sec-title">People</h2>
            <span className="sub">Track expenses across household members</span>
          </div>
          <PersonsSection />
        </section>

        <section id="rules" className="sec" style={{ scrollMarginTop: 76 }}>
          <div className="sec-head">
            <h2 className="sec-title">Auto-rules</h2>
            <span className="sub">Learned from how you categorise · applied at import</span>
          </div>
          <MappingsSection />
          <IgnoreRulesSection />
        </section>

        <ImportHistorySection />

        <section id="backup" className="sec" style={{ scrollMarginTop: 76 }}>
          <div className="sec-head">
            <h2 className="sec-title">Backup</h2>
            <span className="sub">Your data is yours · plain JSON, no lock-in</span>
          </div>
          <BackupImportSection />
        </section>

        <section id="danger" className="sec" style={{ scrollMarginTop: 76 }}>
          <div className="sec-head">
            <h2 className="sec-title" style={{ color: 'var(--neg)' }}>
              Danger zone
            </h2>
            <span className="sub">Both of these are permanent</span>
          </div>
          <DangerZoneSection />
        </section>
      </div>
    </div>
  )
}

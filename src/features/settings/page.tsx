import { useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { usePeriodMode } from '@/hooks/usePeriodMode'

import { BackupImportSection } from './components/BackupImportSection'
import { CategoriesSection } from './components/CategoriesSection'
import { DangerZoneSection } from './components/DangerZoneSection'
import { IgnoreRulesSection } from './components/IgnoreRulesSection'
import { MappingsSection } from './components/MappingsSection'
import { OnboardingResetSection } from './components/OnboardingResetSection'
import { PersonsSection } from './components/PersonsSection'
import { TagsSection } from './components/TagsSection'

const navItems = [
  { id: 'persons', label: 'Persons' },
  { id: 'categories', label: 'Categories' },
  { id: 'tags', label: 'Tags' },
  { id: 'ignore-rules', label: 'Ignore rules' },
  { id: 'mappings', label: 'Auto-mappings' },
  { id: 'period', label: 'Financial year' },
  { id: 'privacy', label: 'Privacy & Data' },
  { id: 'danger', label: 'Danger zone' },
]

export function SettingsPage() {
  const [activeNav, setActiveNav] = useState('persons')
  const { mode: periodMode, setMode: setPeriodMode } = usePeriodMode()

  return (
    <div className="space-y-5">
      <header>
        <p className="card-eyebrow">Settings</p>
        <h1
          className="text-[22px] font-semibold"
          style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}
        >
          Workspace settings
        </h1>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--ink-3)' }}>
          Configure your workspace, household members, and automation rules.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <nav className="lg:col-span-3" aria-label="Settings navigation">
          <p className="card-eyebrow mb-2">Sections</p>
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = activeNav === item.id
              const isDanger = item.id === 'danger'
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveNav(item.id)}
                    className="flex w-full items-center"
                    style={{
                      padding: '7px 10px',
                      borderRadius: 'var(--radius)',
                      fontSize: 13,
                      fontWeight: 500,
                      background: isActive ? 'var(--surface-2)' : 'transparent',
                      color: isDanger
                        ? isActive
                          ? 'var(--neg)'
                          : 'var(--neg)'
                        : isActive
                          ? 'var(--ink)'
                          : 'var(--ink-3)',
                      transition: 'background .1s ease, color .1s ease',
                    }}
                  >
                    {item.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="space-y-5 lg:col-span-9">
          {activeNav === 'persons' && <PersonsSection />}
          {activeNav === 'categories' && <CategoriesSection />}
          {activeNav === 'tags' && <TagsSection />}
          {activeNav === 'ignore-rules' && <IgnoreRulesSection />}
          {activeNav === 'mappings' && <MappingsSection />}

          {activeNav === 'period' && (
            <section className="card">
              <div className="card-head">
                <div>
                  <p className="card-title">Period mode</p>
                  <p className="card-sub">
                    How year and month selectors are framed across the dashboard, budgets, and
                    transactions list.
                  </p>
                </div>
              </div>
              <div
                style={{
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius)',
                  overflow: 'hidden',
                }}
              >
                {[
                  {
                    id: 'fy' as const,
                    title: 'Indian financial year (Apr–Mar)',
                    description:
                      'A year is labelled "FY 25-26" and runs from April to the following March. Default for new users.',
                  },
                  {
                    id: 'calendar' as const,
                    title: 'Calendar year (Jan–Dec)',
                    description:
                      'A year is labelled by its number (e.g. 2025) and runs January to December.',
                  },
                ].map((opt, i) => {
                  const selected = periodMode === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPeriodMode(opt.id)}
                      className="flex w-full items-start gap-3 text-left"
                      style={{
                        padding: '12px 14px',
                        borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                        background: selected ? 'var(--surface-2)' : 'transparent',
                        transition: 'background .12s ease',
                      }}
                    >
                      <Icon
                        name={selected ? 'radio_button_checked' : 'radio_button_unchecked'}
                        size={18}
                        className="shrink-0"
                        style={{ color: selected ? 'var(--accent)' : 'var(--ink-4)' }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>
                          {opt.title}
                        </p>
                        <p className="text-[12px]" style={{ color: 'var(--ink-3)', marginTop: 2 }}>
                          {opt.description}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
              <div
                className="mt-3 text-[12px]"
                style={{
                  border: '1px solid var(--line)',
                  background: 'var(--surface-2)',
                  borderRadius: 'var(--radius)',
                  padding: 12,
                  color: 'var(--ink-2)',
                }}
              >
                <p style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
                  Effect on your existing data
                </p>
                <p>
                  Transactions are unaffected — your stored dates don&rsquo;t change. But a budget
                  you previously created for &ldquo;year 2025&rdquo; is now treated as the budget
                  for{' '}
                  <strong>
                    {periodMode === 'fy' ? 'FY 25-26 (Apr 2025–Mar 2026)' : 'calendar 2025'}
                  </strong>
                  . The numbers stay the same; the period boundaries shift by 3 months when you
                  switch modes. Spend totals and budget vs actual will reflect the new framing
                  immediately.
                </p>
              </div>
            </section>
          )}

          {activeNav === 'privacy' && (
            <>
              <BackupImportSection />
              <OnboardingResetSection />
            </>
          )}
          {activeNav === 'danger' && <DangerZoneSection />}
        </div>
      </div>
    </div>
  )
}

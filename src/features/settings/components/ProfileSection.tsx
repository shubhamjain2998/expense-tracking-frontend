// src/features/settings/components/ProfileSection.tsx
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/contexts/AuthContext'
import { AVATAR_COLORS, AVATAR_EMOJI, useAvatarPrefs } from '@/hooks/useAvatarPrefs'
import { useMe } from '@/hooks/useMe'
import { useToastContext } from '@/hooks/useToastContext'
import type { ApiError } from '@/lib/api/client'
import { changePassword, getMyStats } from '@/lib/api/profile'
import { qk } from '@/lib/queryKeys'
import { getInitials } from '@/lib/strings'

type AvatarTab = 'color' | 'emoji'

export function ProfileSection() {
  const { email } = useAuth()
  const { data: me } = useMe()
  const { prefs, setPrefs } = useAvatarPrefs()
  const toast = useToastContext()

  const initials = getInitials(email)

  // Display name
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem('pf_display_name') || email.split('@')[0] || ''
  )
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(displayName)

  // Avatar tab
  const [avatarTab, setAvatarTab] = useState<AvatarTab>('color')

  // Password form
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')

  // Account stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: qk.auth.stats,
    queryFn: getMyStats,
    staleTime: 5 * 60 * 1000,
  })

  const passwordMutation = useMutation({
    mutationFn: () => changePassword(pwForm.current, pwForm.next),
    onSuccess: () => {
      setPwForm({ current: '', next: '', confirm: '' })
      setPwError('')
      toast.success('Password updated')
    },
    onError: (err: ApiError) => {
      if (err.status === 401) {
        setPwError('Current password is incorrect')
      } else {
        setPwError('Failed to update password. Please try again.')
      }
    },
  })

  function saveName() {
    const trimmed = nameInput.trim()
    if (trimmed) {
      localStorage.setItem('pf_display_name', trimmed)
      setDisplayName(trimmed)
    }
    setEditingName(false)
  }

  const memberSince = me?.created_at
    ? new Date(me.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : '—'

  const pwValid =
    pwForm.current.length > 0 && pwForm.next.length >= 8 && pwForm.next === pwForm.confirm

  return (
    <div className="space-y-5">
      {/* ── Avatar card ── */}
      <section className="card">
        <div className="card-head">
          <div>
            <p className="card-title">Avatar</p>
            <p className="card-sub">Shown next to your name everywhere in Kosh</p>
          </div>
        </div>

        {/* Live preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <Avatar initials={initials} prefs={prefs} size={64} />
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{displayName}</p>
            <p style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 2 }}>{email}</p>
          </div>
        </div>

        {/* Tab bar */}
        <div
          style={{
            display: 'inline-flex',
            background: 'var(--surface-2)',
            borderRadius: 8,
            padding: 3,
            gap: 2,
            marginBottom: 14,
          }}
        >
          {(['color', 'emoji'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setAvatarTab(tab)}
              style={{
                padding: '5px 16px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: avatarTab === tab ? 'var(--surface)' : 'transparent',
                color: avatarTab === tab ? 'var(--ink)' : 'var(--ink-4)',
                boxShadow: avatarTab === tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'background .12s, color .12s',
              }}
            >
              {tab === 'color' ? 'Color' : 'Emoji'}
            </button>
          ))}
        </div>

        {avatarTab === 'color' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {AVATAR_COLORS.map((c) => {
              const selected = prefs.color === c.value
              return (
                <button
                  key={c.value}
                  aria-label={c.label}
                  title={c.label}
                  onClick={() => setPrefs({ ...prefs, color: c.value, mode: 'color' })}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: c.value,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: selected
                      ? '0 0 0 2px var(--surface), 0 0 0 4px var(--accent)'
                      : 'none',
                    transition: 'box-shadow .12s',
                  }}
                />
              )
            })}
          </div>
        )}

        {avatarTab === 'emoji' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 36px)', gap: 6 }}>
            {AVATAR_EMOJI.map((e) => {
              const selected = prefs.mode === 'emoji' && prefs.emoji === e
              return (
                <button
                  key={e}
                  aria-label={e}
                  onClick={() =>
                    setPrefs(
                      selected
                        ? { ...prefs, mode: 'color', emoji: '' }
                        : { ...prefs, mode: 'emoji', emoji: e }
                    )
                  }
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: selected ? '2px solid var(--accent)' : '1px solid var(--line)',
                    background: selected ? 'var(--surface-2)' : 'var(--surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    cursor: 'pointer',
                    transition: 'border-color .12s, background .12s',
                  }}
                >
                  {e}
                </button>
              )
            })}
          </div>
        )}

        <p style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 10 }}>
          Changes save instantly and are stored on this device.
        </p>
      </section>

      {/* ── Account card ── */}
      <section className="card">
        <div className="card-head">
          <div>
            <p className="card-title">Account</p>
            <p className="card-sub">Your identity in Kosh</p>
          </div>
        </div>

        {/* Display name */}
        <div style={{ marginBottom: 10 }}>
          <p className="eyebrow" style={{ marginBottom: 6 }}>
            Display name
          </p>
          {editingName ? (
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveName()
                  if (e.key === 'Escape') setEditingName(false)
                }}
                className="input"
                style={{ fontSize: 13, height: 32, flex: 1 }}
              />
              <button
                onClick={saveName}
                className="btn ghost icon sm"
                style={{ color: 'var(--accent)' }}
                aria-label="Save name"
              >
                <Icon name="check" size={14} />
              </button>
              <button
                onClick={() => setEditingName(false)}
                className="btn ghost icon sm"
                aria-label="Cancel"
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setNameInput(displayName)
                setEditingName(true)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                background: 'var(--surface-2)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius)',
                padding: '7px 10px',
                cursor: 'pointer',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--ink)' }}>{displayName}</span>
              <Icon name="edit" size={13} style={{ color: 'var(--ink-4)' }} />
            </button>
          )}
        </div>

        {/* Email */}
        <div>
          <p className="eyebrow" style={{ marginBottom: 6 }}>
            Email
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--surface-2)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius)',
              padding: '7px 10px',
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{email}</span>
            <span
              style={{
                fontSize: 10,
                color: 'var(--ink-4)',
                background: 'var(--surface-3)',
                padding: '2px 6px',
                borderRadius: 4,
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            >
              read-only
            </span>
          </div>
        </div>
      </section>

      {/* ── Stats card ── */}
      <section className="card">
        <div className="card-head">
          <div>
            <p className="card-title">Account stats</p>
            <p className="card-sub">A snapshot of your Kosh account</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {[
            { label: 'Member since', value: memberSince },
            {
              label: 'Transactions',
              value: statsLoading ? '—' : (stats?.transaction_count ?? 0).toLocaleString('en-IN'),
            },
            {
              label: 'Total tracked',
              value: statsLoading ? '—' : `₹${((stats?.total_spend ?? 0) / 100000).toFixed(1)}L`,
            },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                background: 'var(--surface-2)',
                borderRadius: 8,
                padding: '14px 12px',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: 'var(--ink)',
                  letterSpacing: '-0.03em',
                }}
              >
                {value}
              </p>
              <p style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 3, fontWeight: 500 }}>
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Change password card ── */}
      <section className="card">
        <div className="card-head">
          <div>
            <p className="card-title">Change password</p>
            <p className="card-sub">Leave blank to keep your current password</p>
          </div>
        </div>

        {me?.has_password === false ? (
          <div
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius)',
              padding: '12px 14px',
              fontSize: 13,
              color: 'var(--ink-3)',
            }}
          >
            Your account uses Google Sign-In — password change is not available.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(['current', 'next', 'confirm'] as const).map((field) => (
              <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label htmlFor={`pw-${field}`} className="eyebrow">
                  {field === 'current'
                    ? 'Current password'
                    : field === 'next'
                      ? 'New password'
                      : 'Confirm new password'}
                </label>
                <input
                  id={`pw-${field}`}
                  type="password"
                  value={pwForm[field]}
                  onChange={(e) => {
                    setPwForm((f) => ({ ...f, [field]: e.target.value }))
                    if (field === 'current') setPwError('')
                  }}
                  className="input"
                  style={{ fontSize: 13, height: 34 }}
                  placeholder={
                    field === 'current' ? '••••••••' : field === 'next' ? 'Min 8 characters' : ''
                  }
                />
                {field === 'current' && pwError && (
                  <p style={{ fontSize: 12, color: 'var(--neg)', marginTop: 2 }}>{pwError}</p>
                )}
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                onClick={() => passwordMutation.mutate()}
                disabled={!pwValid || passwordMutation.isPending}
                className="btn primary sm"
              >
                {passwordMutation.isPending ? 'Updating…' : 'Update password'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

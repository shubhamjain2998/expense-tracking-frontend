# Profile Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Profile section to Settings with an avatar customiser (colour + emoji), display name, account stats, and password change; slim down the TopNav popover to just nav links.

**Architecture:** Backend gets three changes to `/auth/me` (extend response), a new `GET /auth/me/stats`, and a new `PATCH /auth/me/password`. Frontend adds a `useAvatarPrefs` localStorage hook, a shared `Avatar` component, and a `ProfileSection` page-section component wired into the existing Settings page. The TopNav popover is stripped to two links.

**Tech Stack:** FastAPI + SQLAlchemy (backend), React + TypeScript + TanStack Query + localStorage (frontend), pytest + TestClient (backend tests), vitest + msw (frontend tests)

---

## File Map

**Backend — modified:**
- `backend/app/routers/auth.py` — extend `MeResponse`, add `/me/stats`, add `/me/password`
- `backend/tests/test_profile_endpoints.py` — new test file

**Frontend — new:**
- `src/components/ui/Avatar.tsx`
- `src/hooks/useAvatarPrefs.ts`
- `src/features/settings/components/ProfileSection.tsx`
- `src/lib/api/profile.ts`

**Frontend — modified:**
- `src/lib/api/auth.ts` — extend `MeResponse` type
- `src/lib/queryKeys.ts` — add `qk.auth.stats`
- `src/test/handlers.ts` — add `/auth/me/stats` + `/auth/me/password` mocks, update `/auth/me`
- `src/features/settings/page.tsx` — add Profile nav item
- `src/components/layout/TopNav.tsx` — use `Avatar`, remove display-name edit block

---

## Task 1: Backend — Extend `/auth/me`

**Files:**
- Modify: `backend/app/routers/auth.py`
- Create: `backend/tests/test_profile_endpoints.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_profile_endpoints.py`:

```python
"""Tests for profile-related auth endpoints.

Covers:
  GET  /auth/me         → now returns created_at + has_password
  GET  /auth/me/stats   → transaction_count + total_spend
  PATCH /auth/me/password → change password
"""

import os
import uuid
from datetime import date, datetime
from decimal import Decimal

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("SUPABASE_JWT_SECRET", "pytest-placeholder-secret")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth import get_current_user
from app.database import Base, get_db
from app.main import app
from app.models import Category, ProcessedTransaction, RawTransaction, User

USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000002")


@pytest.fixture
def client_and_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = TestingSession()

    def override_get_db():
        try:
            yield session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: USER_ID

    user = User(id=USER_ID, email="test@example.com", password_hash="$2b$12$fakehash")
    session.add(user)
    session.commit()

    with TestClient(app) as c:
        yield c, session
    app.dependency_overrides.clear()
    session.close()
    engine.dispose()


# ── /auth/me ─────────────────────────────────────────────────────────────────


def test_me_returns_created_at_and_has_password(client_and_db):
    client, _ = client_and_db
    r = client.get("/auth/me", headers={"Authorization": "Bearer fake"})
    assert r.status_code == 200
    body = r.json()
    assert "created_at" in body
    assert body["has_password"] is True


def test_me_has_password_false_for_google_user(client_and_db):
    client, session = client_and_db
    google_id = uuid.UUID("00000000-0000-0000-0000-000000000003")
    session.add(User(id=google_id, email="g@example.com", password_hash=None, google_sub="gsub123"))
    session.commit()

    # Override current user to google user
    app.dependency_overrides[get_current_user] = lambda: google_id
    r = client.get("/auth/me", headers={"Authorization": "Bearer fake"})
    app.dependency_overrides[get_current_user] = lambda: USER_ID
    assert r.status_code == 200
    assert r.json()["has_password"] is False
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/shubhamjain/workspace/Expense\ Tracking/code/backend
python -m pytest tests/test_profile_endpoints.py::test_me_returns_created_at_and_has_password tests/test_profile_endpoints.py::test_me_has_password_false_for_google_user -v
```

Expected: FAIL — `KeyError: 'created_at'`

- [ ] **Step 3: Extend `MeResponse` and the `/auth/me` handler**

In `backend/app/routers/auth.py`, update `MeResponse` and the `me` endpoint:

```python
# Replace the existing MeResponse class:
class MeResponse(BaseModel):
    id: uuid.UUID
    email: str
    period_mode: Optional[PeriodMode] = None
    created_at: datetime
    has_password: bool


# Replace the existing me() endpoint:
@router.get("/me", response_model=MeResponse)
def me(
    user_id: uuid.UUID = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists",
        )
    return MeResponse(
        id=user.id,
        email=user.email,
        period_mode=user.period_mode,
        created_at=user.created_at,
        has_password=user.password_hash is not None,
    )
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/shubhamjain/workspace/Expense\ Tracking/code/backend
python -m pytest tests/test_profile_endpoints.py::test_me_returns_created_at_and_has_password tests/test_profile_endpoints.py::test_me_has_password_false_for_google_user -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/shubhamjain/workspace/Expense\ Tracking/code/backend
git add app/routers/auth.py tests/test_profile_endpoints.py
git commit -m "feat(auth): add created_at and has_password to /auth/me response"
```

---

## Task 2: Backend — `GET /auth/me/stats`

**Files:**
- Modify: `backend/app/routers/auth.py`
- Modify: `backend/tests/test_profile_endpoints.py`

- [ ] **Step 1: Add failing tests**

Append to `backend/tests/test_profile_endpoints.py`:

```python
# ── /auth/me/stats ───────────────────────────────────────────────────────────


def _seed_processed_txn(
    session,
    *,
    amount: Decimal,
    txn_date: date = date(2025, 6, 1),
) -> None:
    raw_id = uuid.uuid4()
    raw = RawTransaction(
        id=raw_id,
        user_id=USER_ID,
        txn_date=datetime.combine(txn_date, datetime.min.time()),
        description="test txn",
        amount=float(amount),
        status="processed",
    )
    cat_id = uuid.uuid4()
    cat = Category(id=cat_id, user_id=USER_ID, name=f"Cat-{cat_id.hex[:4]}", is_income=amount > 0)
    session.add_all([raw, cat])
    session.flush()

    processed = ProcessedTransaction(
        id=uuid.uuid4(),
        user_id=USER_ID,
        raw_txn_id=raw_id,
        category_id=cat_id,
        txn_date=txn_date,
        description="test txn",
        amount=float(amount),
        effective_amount=float(amount),
        month=txn_date.month,
        year=txn_date.year,
        txn_type="expense" if amount < 0 else "income",
    )
    session.add(processed)
    session.commit()


def test_stats_empty(client_and_db):
    client, _ = client_and_db
    r = client.get("/auth/me/stats", headers={"Authorization": "Bearer fake"})
    assert r.status_code == 200
    body = r.json()
    assert body["transaction_count"] == 0
    assert body["total_spend"] == 0.0


def test_stats_counts_and_sums_expenses(client_and_db):
    client, session = client_and_db
    _seed_processed_txn(session, amount=Decimal("-500.00"))
    _seed_processed_txn(session, amount=Decimal("-250.00"))
    _seed_processed_txn(session, amount=Decimal("1000.00"))  # income — not counted in spend
    r = client.get("/auth/me/stats", headers={"Authorization": "Bearer fake"})
    assert r.status_code == 200
    body = r.json()
    assert body["transaction_count"] == 3
    assert abs(body["total_spend"] - 750.0) < 0.01
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd /Users/shubhamjain/workspace/Expense\ Tracking/code/backend
python -m pytest tests/test_profile_endpoints.py::test_stats_empty tests/test_profile_endpoints.py::test_stats_counts_and_sums_expenses -v
```

Expected: FAIL — 404 Not Found

- [ ] **Step 3: Implement the endpoint**

Add to `backend/app/routers/auth.py` (import `func` from sqlalchemy at the top, and import `ProcessedTransaction` from `app.models`):

First add the missing imports at the top of the file (after existing imports):
```python
from sqlalchemy import func
from app.models import ProcessedTransaction, User
```

Then add the new response model and endpoint after the `update_preferences` function:

```python
class StatsResponse(BaseModel):
    transaction_count: int
    total_spend: float


@router.get("/me/stats", response_model=StatsResponse)
def me_stats(
    user_id: uuid.UUID = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = db.execute(
        select(func.count(ProcessedTransaction.id)).where(
            ProcessedTransaction.user_id == user_id
        )
    ).scalar_one()

    spend = db.execute(
        select(func.sum(func.abs(ProcessedTransaction.amount))).where(
            ProcessedTransaction.user_id == user_id,
            ProcessedTransaction.amount < 0,
        )
    ).scalar_one_or_none()

    return StatsResponse(
        transaction_count=int(count),
        total_spend=float(spend or 0),
    )
```

- [ ] **Step 4: Run to confirm pass**

```bash
cd /Users/shubhamjain/workspace/Expense\ Tracking/code/backend
python -m pytest tests/test_profile_endpoints.py::test_stats_empty tests/test_profile_endpoints.py::test_stats_counts_and_sums_expenses -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/shubhamjain/workspace/Expense\ Tracking/code/backend
git add app/routers/auth.py tests/test_profile_endpoints.py
git commit -m "feat(auth): add GET /auth/me/stats endpoint"
```

---

## Task 3: Backend — `PATCH /auth/me/password`

**Files:**
- Modify: `backend/app/routers/auth.py`
- Modify: `backend/tests/test_profile_endpoints.py`

- [ ] **Step 1: Add failing tests**

Append to `backend/tests/test_profile_endpoints.py`:

```python
# ── PATCH /auth/me/password ──────────────────────────────────────────────────


def test_change_password_success(client_and_db):
    """Register a real user so we have a valid bcrypt hash, then change it."""
    client, session = client_and_db
    import bcrypt

    new_hash = bcrypt.hashpw(b"OldPass123!", bcrypt.gensalt()).decode()
    session.execute(
        __import__("sqlalchemy").update(User).where(User.id == USER_ID).values(password_hash=new_hash)
    )
    session.commit()

    r = client.patch(
        "/auth/me/password",
        json={"current_password": "OldPass123!", "new_password": "NewPass456!"},
        headers={"Authorization": "Bearer fake"},
    )
    assert r.status_code == 204


def test_change_password_wrong_current(client_and_db):
    client, session = client_and_db
    import bcrypt

    new_hash = bcrypt.hashpw(b"RealPass!", bcrypt.gensalt()).decode()
    session.execute(
        __import__("sqlalchemy").update(User).where(User.id == USER_ID).values(password_hash=new_hash)
    )
    session.commit()

    r = client.patch(
        "/auth/me/password",
        json={"current_password": "WrongPass!", "new_password": "NewPass456!"},
        headers={"Authorization": "Bearer fake"},
    )
    assert r.status_code == 401


def test_change_password_google_only_account(client_and_db):
    client, session = client_and_db
    google_id = uuid.UUID("00000000-0000-0000-0000-000000000004")
    session.add(User(id=google_id, email="g2@example.com", password_hash=None, google_sub="gsub456"))
    session.commit()

    app.dependency_overrides[get_current_user] = lambda: google_id
    r = client.patch(
        "/auth/me/password",
        json={"current_password": "anything", "new_password": "NewPass456!"},
        headers={"Authorization": "Bearer fake"},
    )
    app.dependency_overrides[get_current_user] = lambda: USER_ID
    assert r.status_code == 409
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd /Users/shubhamjain/workspace/Expense\ Tracking/code/backend
python -m pytest tests/test_profile_endpoints.py::test_change_password_success tests/test_profile_endpoints.py::test_change_password_wrong_current tests/test_profile_endpoints.py::test_change_password_google_only_account -v
```

Expected: FAIL — 404 or 405

- [ ] **Step 3: Implement the endpoint**

Add to `backend/app/routers/auth.py` after `StatsResponse`:

```python
class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


@router.patch("/me/password", status_code=204)
def change_password(
    body: ChangePasswordRequest,
    user_id: uuid.UUID = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if user.password_hash is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Account uses Google Sign-In — password change is not available",
        )
    if not _verify_password(body.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )
    user.password_hash = _hash_password(body.new_password)
    db.commit()
    return None
```

- [ ] **Step 4: Run to confirm pass**

```bash
cd /Users/shubhamjain/workspace/Expense\ Tracking/code/backend
python -m pytest tests/test_profile_endpoints.py -v
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/shubhamjain/workspace/Expense\ Tracking/code/backend
git add app/routers/auth.py tests/test_profile_endpoints.py
git commit -m "feat(auth): add PATCH /auth/me/password endpoint"
```

---

## Task 4: Frontend — Update types + add API functions

**Files:**
- Modify: `src/lib/api/auth.ts`
- Create: `src/lib/api/profile.ts`
- Modify: `src/test/handlers.ts`

- [ ] **Step 1: Update `MeResponse` type in `src/lib/api/auth.ts`**

Replace the existing `MeResponse` interface:

```typescript
export interface MeResponse {
  id: string
  email: string
  /** Null means the user has not yet picked between calendar and FY mode. */
  period_mode: PeriodMode | null
  created_at: string   // ISO datetime string
  has_password: boolean
}
```

- [ ] **Step 2: Create `src/lib/api/profile.ts`**

```typescript
import { client } from './client'

export interface StatsResponse {
  transaction_count: number
  total_spend: number
}

export async function getMyStats(): Promise<StatsResponse> {
  const { data } = await client.get<StatsResponse>('/auth/me/stats')
  return data
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await client.patch('/auth/me/password', {
    current_password: currentPassword,
    new_password: newPassword,
  })
}
```

- [ ] **Step 3: Update msw handlers in `src/test/handlers.ts`**

Update the existing `/auth/me` handler to include new fields, and add two new handlers:

```typescript
// Replace the existing /auth/me handler:
http.get(`${BASE}/auth/me`, () =>
  HttpResponse.json({
    id: 'user-1',
    email: 'test@example.com',
    period_mode: 'calendar',
    created_at: '2024-06-01T00:00:00Z',
    has_password: true,
  })
),

// Add these two new handlers (insert after the /auth/me handler):
http.get(`${BASE}/auth/me/stats`, () =>
  HttpResponse.json({ transaction_count: 42, total_spend: 18400.0 })
),
http.patch(`${BASE}/auth/me/password`, () => new HttpResponse(null, { status: 204 })),
```

- [ ] **Step 4: Add `qk.auth.stats` to `src/lib/queryKeys.ts`**

In the `qk.auth` object, add:

```typescript
auth: {
  all: ['auth'] as const,
  me: ['auth', 'me'] as const,
  stats: ['auth', 'stats'] as const,
},
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/shubhamjain/workspace/Expense Tracking/code/frontend"
git add src/lib/api/auth.ts src/lib/api/profile.ts src/lib/queryKeys.ts src/test/handlers.ts
git commit -m "feat(api): extend MeResponse and add profile API functions"
```

---

## Task 5: Frontend — `useAvatarPrefs` hook

**Files:**
- Create: `src/hooks/useAvatarPrefs.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/hooks/useAvatarPrefs.ts
import { useCallback, useState } from 'react'

export interface AvatarPrefs {
  mode: 'color' | 'emoji'
  color: string
  emoji: string
}

export const AVATAR_COLORS = [
  { label: 'Kosh amber',  value: 'linear-gradient(135deg,#b8860b,#daa520)' },
  { label: 'Ruby',        value: 'linear-gradient(135deg,#c0392b,#e74c3c)' },
  { label: 'Violet',      value: 'linear-gradient(135deg,#8e44ad,#a569bd)' },
  { label: 'Sapphire',    value: 'linear-gradient(135deg,#2471a3,#5dade2)' },
  { label: 'Emerald',     value: 'linear-gradient(135deg,#1e8449,#52be80)' },
  { label: 'Terracotta',  value: 'linear-gradient(135deg,#ba4a00,#e59866)' },
  { label: 'Midnight',    value: 'linear-gradient(135deg,#1a252f,#2c3e50)' },
  { label: 'Lavender',    value: 'linear-gradient(135deg,#6c3483,#d7bde2)' },
  { label: 'Teal',        value: 'linear-gradient(135deg,#117a65,#76d7c4)' },
  { label: 'Caramel',     value: 'linear-gradient(135deg,#784212,#f0b27a)' },
  { label: 'Slate',       value: 'linear-gradient(135deg,#1c2833,#7f8c8d)' },
  { label: 'Coral',       value: 'linear-gradient(135deg,#922b21,#f1948a)' },
] as const

export const AVATAR_EMOJI = ['😎','🧠','🦊','🌿','⚡','🎯','🚀','🌊','🔥','💎','🎵','🌸','🦋','🏔️','🎨','⭐'] as const

const STORAGE_KEY = 'pf_avatar'

const DEFAULT_PREFS: AvatarPrefs = {
  mode: 'color',
  color: AVATAR_COLORS[0].value,
  emoji: '',
}

function readPrefs(): AvatarPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFS
    const parsed = JSON.parse(raw) as Partial<AvatarPrefs>
    return {
      mode: parsed.mode === 'emoji' ? 'emoji' : 'color',
      color: parsed.color || DEFAULT_PREFS.color,
      emoji: parsed.emoji || '',
    }
  } catch {
    return DEFAULT_PREFS
  }
}

export function useAvatarPrefs() {
  const [prefs, setPrefsState] = useState<AvatarPrefs>(readPrefs)

  const setPrefs = useCallback((next: AvatarPrefs) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setPrefsState(next)
  }, [])

  return { prefs, setPrefs }
}
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/shubhamjain/workspace/Expense Tracking/code/frontend"
git add src/hooks/useAvatarPrefs.ts
git commit -m "feat(hooks): add useAvatarPrefs localStorage hook"
```

---

## Task 6: Frontend — `Avatar` component

**Files:**
- Create: `src/components/ui/Avatar.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/ui/Avatar.tsx
import type { AvatarPrefs } from '@/hooks/useAvatarPrefs'

interface AvatarProps {
  initials: string
  prefs: AvatarPrefs
  size?: number
  className?: string
}

export function Avatar({ initials, prefs, size = 32, className }: AvatarProps) {
  const showEmoji = prefs.mode === 'emoji' && prefs.emoji

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: prefs.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: showEmoji ? size * 0.5 : size * 0.38,
        fontWeight: 800,
        color: '#fff',
        userSelect: 'none',
      }}
      aria-label={showEmoji ? prefs.emoji : initials}
    >
      {showEmoji ? prefs.emoji : initials}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/shubhamjain/workspace/Expense Tracking/code/frontend"
git add src/components/ui/Avatar.tsx
git commit -m "feat(ui): add Avatar component"
```

---

## Task 7: Frontend — `ProfileSection` component

**Files:**
- Create: `src/features/settings/components/ProfileSection.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/features/settings/components/ProfileSection.tsx
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/contexts/AuthContext'
import { AVATAR_COLORS, AVATAR_EMOJI, useAvatarPrefs } from '@/hooks/useAvatarPrefs'
import { useMe } from '@/hooks/useMe'
import { useToast } from '@/hooks/useToast'
import { changePassword, getMyStats } from '@/lib/api/profile'
import { qk } from '@/lib/queryKeys'
import { getInitials } from '@/lib/strings'

type AvatarTab = 'color' | 'emoji'

export function ProfileSection() {
  const { email } = useAuth()
  const { data: me } = useMe()
  const { prefs, setPrefs } = useAvatarPrefs()
  const { showToast } = useToast()

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
      showToast('Password updated', 'success')
    },
    onError: (err: Error) => {
      if (err.message?.includes('401') || err.message?.toLowerCase().includes('incorrect')) {
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
    pwForm.current.length > 0 &&
    pwForm.next.length >= 8 &&
    pwForm.next === pwForm.confirm

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
          <p className="eyebrow mb-1.5">Display name</p>
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
              onClick={() => { setNameInput(displayName); setEditingName(true) }}
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
          <p className="eyebrow mb-1.5">Email</p>
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
              value: statsLoading
                ? '—'
                : `₹${((stats?.total_spend ?? 0) / 100000).toFixed(1)}L`,
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
                className="num"
                style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em' }}
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
                <label
                  htmlFor={`pw-${field}`}
                  className="eyebrow"
                >
                  {field === 'current' ? 'Current password' : field === 'next' ? 'New password' : 'Confirm new password'}
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
                  placeholder={field === 'current' ? '••••••••' : field === 'next' ? 'Min 8 characters' : ''}
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
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/shubhamjain/workspace/Expense Tracking/code/frontend"
git add src/features/settings/components/ProfileSection.tsx
git commit -m "feat(settings): add ProfileSection component with avatar, account, stats, and password cards"
```

---

## Task 8: Frontend — Add Profile to Settings page

**Files:**
- Modify: `src/features/settings/page.tsx`

- [ ] **Step 1: Add Profile nav item and import**

In `src/features/settings/page.tsx`, add to the import block at the top:

```typescript
import { ProfileSection } from './components/ProfileSection'
```

Replace the `navItems` array:

```typescript
const navItems = [
  { id: 'profile', label: 'Profile' },
  { id: 'persons', label: 'Persons' },
  { id: 'tags', label: 'Tags' },
  { id: 'period', label: 'Financial year' },
  { id: 'privacy', label: 'Privacy & onboarding' },
  { id: 'danger', label: 'Danger zone' },
]
```

Change the initial state to default to `'profile'`:

```typescript
const [activeNav, setActiveNav] = useState('profile')
```

Add the Profile section render (insert before the existing `{activeNav === 'persons' ...}` line):

```tsx
{activeNav === 'profile' && <ProfileSection />}
```

- [ ] **Step 2: Verify the settings page renders with no TS errors**

```bash
cd "/Users/shubhamjain/workspace/Expense Tracking/code/frontend"
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd "/Users/shubhamjain/workspace/Expense Tracking/code/frontend"
git add src/features/settings/page.tsx
git commit -m "feat(settings): add Profile as first settings section"
```

---

## Task 9: Frontend — Slim down the TopNav popover

**Files:**
- Modify: `src/components/layout/TopNav.tsx`

- [ ] **Step 1: Replace TopNav.tsx**

The new `TopNav.tsx` removes the display-name edit block and uses the shared `Avatar` component:

```tsx
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'

import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/contexts/AuthContext'
import { useAvatarPrefs } from '@/hooks/useAvatarPrefs'
import { useSidebarStats } from '@/hooks/useSidebarStats'
import { useThemeContext } from '@/hooks/useThemeContext'
import { formatCompact } from '@/lib/format'
import { pendingTransactionsUrl } from '@/lib/pendingNav'
import { monthShortLabel } from '@/lib/period'
import { getInitials } from '@/lib/strings'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', end: true },
  { to: '/transactions', label: 'Transactions', end: false },
  { to: '/upload', label: 'Upload', end: false },
  { to: '/budget', label: 'Budget', end: false },
]

export function TopNav() {
  const { email, logout } = useAuth()
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useThemeContext()
  const { spent, totalBudget, pendingCount, pendingItems } = useSidebarStats()
  const { prefs } = useAvatarPrefs()
  const initials = getInitials(email)
  const displayName = localStorage.getItem('pf_display_name') || email.split('@')[0] || ''

  const [profileOpen, setProfileOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!profileOpen) return
    function onPointerDown(e: PointerEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [profileOpen])

  function handleSignOut() {
    logout()
    navigate('/login', { replace: true })
  }

  const txnsTo = pendingCount > 0 ? pendingTransactionsUrl(pendingItems) : '/transactions'
  const monthLabel = monthShortLabel(new Date().getMonth() + 1, 'calendar')
  const statLabel =
    totalBudget > 0
      ? `${formatCompact(spent)} / ${formatCompact(totalBudget)} · ${monthLabel}`
      : `${formatCompact(spent)} · ${monthLabel}`

  return (
    <header className="topnav" style={{ position: 'sticky', top: 0, zIndex: 50 }}>
      {/* Brand */}
      <div className="topnav-brand">
        <Link
          to="/dashboard"
          style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
        >
          <span
            aria-hidden
            style={{
              width: 22,
              height: 22,
              background: 'var(--kosh-amber)',
              color: 'var(--kosh-brown-deep)',
              borderRadius: 5,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: '-0.5px',
              flexShrink: 0,
            }}
          >
            K
          </span>
          <span className="topnav-brand-name">Kosh</span>
        </Link>
        <div className="topnav-brand-sep" aria-hidden />
      </div>

      {/* Desktop nav links */}
      <nav className="topnav-links" aria-label="Primary">
        {NAV.map(({ to, label, end }) => {
          const resolvedTo = label === 'Transactions' ? txnsTo : to
          return (
            <NavLink
              key={to}
              to={resolvedTo}
              end={end}
              className={({ isActive }) => (isActive ? 'topnav-link active' : 'topnav-link')}
            >
              {label}
              {label === 'Transactions' && pendingCount > 0 && (
                <span className="topnav-badge num">{pendingCount > 9 ? '9+' : pendingCount}</span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Right controls */}
      <div className="topnav-right">
        {/* Month stat chip */}
        <div className="topnav-stat hidden md:flex">
          <span className="topnav-stat-text">{statLabel}</span>
        </div>

        {/* Theme toggle */}
        <button
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX || rect.left + rect.width / 2
            const y = e.clientY || rect.top + rect.height / 2
            toggleTheme({ x, y })
          }}
          className="btn ghost icon"
          aria-label={isDark ? 'Light mode' : 'Dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <Icon name={isDark ? 'light_mode' : 'dark_mode'} size={15} />
        </button>

        {/* Avatar / profile */}
        <div style={{ position: 'relative' }}>
          <button
            ref={triggerRef}
            onClick={() => setProfileOpen((v) => !v)}
            className="topnav-avatar"
            aria-label="Profile and settings"
            aria-expanded={profileOpen}
            style={{ padding: 0, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Avatar initials={initials} prefs={prefs} size={32} />
          </button>

          {profileOpen && (
            <div ref={popoverRef} className="topnav-profile-popover">
              {/* Header */}
              <div className="topnav-profile-header">
                <Avatar initials={initials} prefs={prefs} size={40} />
                <div style={{ minWidth: 0 }}>
                  <p className="topnav-profile-name">{displayName}</p>
                  <p className="topnav-profile-email">{email}</p>
                </div>
              </div>

              {/* Settings link */}
              <div className="topnav-profile-section" style={{ paddingTop: 4, paddingBottom: 4 }}>
                <NavLink
                  to="/settings"
                  onClick={() => setProfileOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 8px',
                    borderRadius: 'var(--radius)',
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--ink-2)',
                    textDecoration: 'none',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <Icon name="settings" size={14} />
                  Settings
                </NavLink>
              </div>

              {/* Sign out */}
              <div style={{ padding: '4px 6px 6px' }}>
                <button
                  onClick={handleSignOut}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 8px',
                    cursor: 'pointer',
                    fontSize: 12.5,
                    color: 'var(--ink-2)',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <Icon name="logout" size={14} />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Type-check and run tests**

```bash
cd "/Users/shubhamjain/workspace/Expense Tracking/code/frontend"
npx tsc --noEmit && npx vitest run
```

Expected: no TS errors, all tests pass

- [ ] **Step 3: Commit**

```bash
cd "/Users/shubhamjain/workspace/Expense Tracking/code/frontend"
git add src/components/layout/TopNav.tsx
git commit -m "feat(topnav): use Avatar component, remove inline display-name editing from popover"
```

---

## Self-Review Checklist

- [x] **Spec: Avatar color + emoji customiser** → Task 5 (`useAvatarPrefs`), Task 6 (`Avatar`), Task 7 card 1
- [x] **Spec: 12 gradient presets** → listed in `AVATAR_COLORS` in Task 5
- [x] **Spec: 16 emoji in fixed order** → listed in `AVATAR_EMOJI` in Task 5
- [x] **Spec: Display name editable, email read-only** → Task 7 card 2
- [x] **Spec: Account stats (member since, count, spend)** → Task 7 card 3 + Task 2
- [x] **Spec: Change password hidden for Google accounts** → Task 7 card 4 uses `me?.has_password`
- [x] **Spec: `has_password` from backend** → Task 1 extends `MeResponse`
- [x] **Spec: Profile first in Settings sidebar** → Task 8 puts it first + default active
- [x] **Spec: TopNav popover slimmed** → Task 9, display-name edit block removed
- [x] **Spec: Avatar used in TopNav** → Task 9 uses `<Avatar>` in both trigger and popover header
- [x] **Type consistency** → `AvatarPrefs` defined in `useAvatarPrefs.ts` and imported by `Avatar.tsx` and `ProfileSection.tsx`; `qk.auth.stats` added in Task 4 and used in Task 7

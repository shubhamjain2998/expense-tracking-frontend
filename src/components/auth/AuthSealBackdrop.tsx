import { KoshSeal } from '../ui/KoshSeal'

/**
 * Large, faint, slowly-rotating कोश seal behind the auth card — a premium brand
 * moment on the login / register pages. Desktop-only and decorative; styling
 * (position, faintness, rotation, reduced-motion) lives in `.auth-seal`
 * (components.css). Sits behind the card via z-index:0 (the auth-page forces
 * z-index:1 on its direct children).
 */
export function AuthSealBackdrop() {
  return (
    <div className="auth-seal" aria-hidden="true" style={{ zIndex: 0 }}>
      <KoshSeal size={560} />
    </div>
  )
}

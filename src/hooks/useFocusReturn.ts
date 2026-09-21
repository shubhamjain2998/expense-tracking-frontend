import { useEffect, useRef } from 'react'

/**
 * Captures whatever element had focus right before a dialog/overlay opened,
 * and restores focus to it once it closes.
 *
 * Bug this guards against (Phase 8c second-pass keyboard sweep): every
 * `role="dialog"` overlay in the app (AddTransactionDialog,
 * KeyboardShortcutsModal, ImportDialog, PasswordPromptDialog, WelcomeModal)
 * opened without moving focus back to whatever triggered it once closed —
 * confirmed live by opening the keyboard-shortcuts overlay with the trigger
 * button focused, dismissing it with Escape, and finding focus had fallen
 * all the way back to `<body>`. A keyboard or screen-reader user loses
 * their place and has to re-navigate from the top of the page after every
 * dialog.
 *
 * The capture has to happen during render, not inside a `useEffect` —
 * several of these dialogs `autoFocus` their own first field, and React
 * applies `autoFocus` synchronously as part of the commit that mounts the
 * dialog, which runs before *any* effect (including `useLayoutEffect`). A
 * `useEffect`-based capture would read `document.activeElement` after that
 * autoFocus already ran, capturing the dialog's own field instead of the
 * trigger. The render-phase read below uses the one ref access React's own
 * lint rules sanction outside an effect — the "lazy init, guarded by
 * `ref.current == null`" pattern — so it's still only ever set once per
 * open, never on every re-render.
 *
 * Two call shapes, matching the two ways dialogs are built in this app:
 *   - Conditionally rendered (`{open && <Dialog />}`): call with no
 *     argument. Focus is restored on unmount.
 *   - Always mounted, visibility toggled by an `isOpen` prop
 *     (`if (!isOpen) return null` after the hooks): pass `isOpen` through.
 *     Focus is captured on the false→true transition, restored on the
 *     true→false transition.
 */
export function useFocusReturn(active = true): void {
  const previouslyFocused = useRef<HTMLElement | null>(null)

  if (active) {
    if (previouslyFocused.current == null) {
      previouslyFocused.current = document.activeElement as HTMLElement | null
    }
  }

  useEffect(() => {
    if (!active) return
    return () => {
      // The trigger may itself have been removed (e.g. the row it belonged
      // to got deleted while the dialog was open) — guard before refocusing.
      const el = previouslyFocused.current
      if (el && document.contains(el)) el.focus()
      previouslyFocused.current = null
    }
  }, [active])
}

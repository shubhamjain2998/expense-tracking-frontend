import { Fragment } from 'react'

import type { TextPart } from '../lib/contracts'

/** Render engine-produced TextPart[] — `em` fragments get the accent emphasis.
 *  Using parts (not string concatenation) keeps drivers bold without splicing
 *  className fragments (see the prettier-className trap in project memory). */
export function renderParts(parts: TextPart[]) {
  return parts.map((p, i) =>
    p.em ? (
      <span key={i} className="font-semibold text-[var(--accent)]">
        {p.t}
      </span>
    ) : (
      <Fragment key={i}>{p.t}</Fragment>
    )
  )
}

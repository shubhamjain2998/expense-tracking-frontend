import type { ReactNode } from 'react'

import type { StationFrame, Vec3 } from './cameraPath'
import type { SceneColors } from './sceneColors'

/** A DOM label pinned to a 3D point, faded in only near its station. */
export interface WorldLabel {
  key: string
  text: string
  anchor: Vec3
  station: number
  /** 'center' sits on the anchor, 'end' ends at it, 'start' begins at it. */
  align: 'center' | 'end' | 'start'
  tone?: 'current' | 'strong'
}

/** The one tooltip the stage shows at a time. */
export interface WorldTip {
  anchor: Vec3
  station: number
  title: string
  lines: string[]
}

/** One legend entry. `swatch` is Tailwind classes; add `is-line` for a rule. */
export interface LegendItem {
  swatch: string
  label: string
}

export interface WorldStation {
  /** Short name, shown in the section rail and as the panel's aria-label. */
  name: string
  /** The page block that explains this station — real DOM, fully usable. */
  panel: ReactNode
  /** What the camera frames when this panel is in view. */
  frame: StationFrame
  legend: LegendItem[]
  /** One line on how to use the station, shown at the top of the stage. */
  hint: string
}

/** Handed to a page's scene so its stations rise and colour consistently. */
export interface SceneContext {
  colors: SceneColors
  /** Stations reached so far; a station rises the first time it's reached. */
  reached: ReadonlySet<number>
  /** Reduced motion: no rise-in, no flight. */
  instant: boolean
}

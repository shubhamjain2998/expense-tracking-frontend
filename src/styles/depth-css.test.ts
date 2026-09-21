/**
 * Dimension-layer CSS regression tests.
 *
 * Same approach as phase9-css.test.ts: jsdom has no layout or cascade, so
 * these assert against the stylesheet source. They lock the handful of
 * decisions in depth.css that are load-bearing and easy to undo by accident
 * — each one was a real defect caught live on the running app first.
 */
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const depthCss = readFileSync(join(here, 'depth.css'), 'utf-8')
const indexCss = readFileSync(join(here, 'index.css'), 'utf-8')

/** Strips comments so a rule search can't accidentally match one. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

const depth = stripComments(depthCss)

function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = depth.match(new RegExp(`(?:^|\\})\\s*${escaped}\\s*{([^}]*)}`, 'm'))
  expect(match).not.toBeNull()
  return match![1]
}

describe('the layer is actually loaded', () => {
  it('index.css imports depth.css after components.css', () => {
    const order = ['./components.css', './depth.css'].map((f) => indexCss.indexOf(f))
    expect(order[0]).toBeGreaterThan(-1)
    expect(order[1]).toBeGreaterThan(order[0])
  })
})

describe('the aurora plate is viewport-sized', () => {
  // Regression: an oversized plate (inset: -25vmax) resolved every
  // percentage gradient position against the plate rather than the
  // viewport, which pushed all four light sources off-screen and left the
  // field invisible on a 1440x900 window.
  it('body::before uses inset: 0, not a negative overscan', () => {
    const body = ruleBody('body::before')
    expect(body).toMatch(/inset:\s*0\s*;/)
    expect(body).not.toMatch(/inset:\s*-/)
  })

  it('body::before stays behind page content and takes no pointer events', () => {
    const body = ruleBody('body::before')
    expect(body).toMatch(/z-index:\s*-2\s*;/)
    expect(body).toMatch(/pointer-events:\s*none\s*;/)
  })
})

describe('surfaces that must not take colour from the field', () => {
  // Regression: a translucent password field on /login picked up the warm
  // blob behind it and read as a faint error state.
  it('inputs stay opaque', () => {
    const body = ruleBody('.input,\n.input-field,\n.textarea')
    expect(body).toMatch(/background-color:\s*var\(--surface\)\s*;/)
    expect(body).not.toContain('--glass')
  })
})

describe('depth does not become a backdrop-filter on cards', () => {
  // A filtered element is the containing block for its fixed descendants,
  // and cards host dialogs, popovers and sticky headers.
  it('.card carries no backdrop-filter', () => {
    expect(ruleBody('.card')).not.toContain('backdrop-filter')
  })
})

describe('reduced motion', () => {
  it('stops the drift and the pointer-tracked effects', () => {
    const block = depth.match(/@media \(prefers-reduced-motion: reduce\) {([\s\S]*)}\s*$/)
    expect(block).not.toBeNull()
    const body = block![1]
    expect(body).toContain('body::before')
    expect(body).toContain('.tilt-body')
    expect(body).toContain('.sheen::after')
    expect(body).toMatch(/animation:\s*none/)
  })
})

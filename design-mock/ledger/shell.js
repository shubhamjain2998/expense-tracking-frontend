/* Kosh "Ledger" mock shell — injects nav chrome so each mock file stays short.
   Mock-only scaffolding; the React app keeps its own Layout component. */

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
  target:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  sparkles:
    '<path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/><path d="m5.6 5.6 2.8 2.8"/><path d="m15.6 15.6 2.8 2.8"/><path d="m18.4 5.6-2.8 2.8"/><path d="m8.4 15.6-2.8 2.8"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  chevL: '<path d="m15 18-6-6 6-6"/>',
  chevR: '<path d="m9 18 6-6-6-6"/>',
  chevD: '<path d="m6 9 6 6 6-6"/>',
  arrowR: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  alert: '<path d="M12 9v4"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="9"/>',
  trendUp: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  trendDown: '<path d="m3 7 6 6 4-4 8 8"/><path d="M15 17h6v-6"/>',
  repeat:
    '<path d="m17 2 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  users:
    '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M17 5.2a3.2 3.2 0 0 1 0 5.6"/><path d="M18.5 14.2A6.5 6.5 0 0 1 21.5 20"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8Z"/>',
  upload:
    '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  file: '<path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7Z"/><path d="M14 3v4h4"/>',
  clipboard:
    '<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M8 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2"/>',
  pencil: '<path d="M4 20h4L20 8l-4-4L4 16Z"/><path d="m14 6 4 4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/><path d="m6.3 17.7-1.4 1.4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9Z"/><path d="M7.5 7.5h.01"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/>',
}

function icon(name, size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`
}
window.icon = icon

const NAV = [
  { id: 'home', href: 'dashboard.html', label: 'Home', ic: 'home' },
  { id: 'transactions', href: 'transactions.html', label: 'Transactions', ic: 'list', badge: 12 },
  { id: 'budget', href: 'budget.html', label: 'Budget', ic: 'target' },
  { id: 'settings', href: 'settings.html', label: 'Settings', ic: 'settings' },
]

function mount() {
  const page = document.body.dataset.page
  const title = document.body.dataset.title || ''

  const nav = NAV.map(
    (n) =>
      `<a class="navlink" href="${n.href}" ${n.id === page ? 'aria-current="page"' : ''}>${icon(n.ic)}<span>${n.label}</span>${n.badge ? `<span class="badge">${n.badge}</span>` : ''}</a>`
  ).join('')

  const side = document.querySelector('[data-slot="sidenav"]')
  if (side)
    side.innerHTML = `
    <div class="brand"><span class="brand-mark">क</span><span class="brand-name">Kosh</span></div>
    <nav class="navlist" aria-label="Primary">${nav}</nav>
    <div class="navlist" style="margin-top:var(--space-5)">
      <span class="eyebrow" style="padding:0 var(--space-2) var(--space-2)">Explore</span>
      <a class="navlink" href="insights.html" ${page === 'insights' ? 'aria-current="page"' : ''}>${icon('sparkles')}<span>Insights</span></a>
    </div>
    <div class="nav-foot">
      <span class="avatar">SJ</span>
      <span style="min-width:0">
        <span class="small strong" style="display:block;color:var(--ink)">Shubham</span>
        <span class="small" style="display:block;font-size:11px">FY 2026-27</span>
      </span>
    </div>`

  const top = document.querySelector('[data-slot="topbar"]')
  if (top)
    top.innerHTML = `
    <span class="page-title">${title}</span>
    <span class="spacer"></span>
    <span class="mockbar">mock</span>
    <button class="btn icon" id="theme" aria-label="Toggle theme">${icon('sun')}</button>
    <a class="btn primary" href="transactions.html">${icon('plus')}<span>Add</span></a>`

  const tabs = document.querySelector('[data-slot="tabbar"]')
  if (tabs)
    tabs.innerHTML = NAV.map(
      (n) =>
        `<a href="${n.href}" ${n.id === page ? 'aria-current="page"' : ''}>${icon(n.ic, 20)}<span>${n.label}</span></a>`
    ).join('')

  const btn = document.getElementById('theme')
  if (btn)
    btn.addEventListener('click', () => {
      const dark = document.documentElement.dataset.theme === 'dark'
      document.documentElement.dataset.theme = dark ? 'light' : 'dark'
      btn.innerHTML = icon(dark ? 'sun' : 'moon')
      try {
        localStorage.setItem('mock-theme', document.documentElement.dataset.theme)
      } catch (e) {
        /* private mode */
      }
    })
  try {
    const saved = localStorage.getItem('mock-theme')
    if (saved) {
      document.documentElement.dataset.theme = saved
      if (btn) btn.innerHTML = icon(saved === 'dark' ? 'moon' : 'sun')
    }
  } catch (e) {
    /* private mode */
  }

  // inline icon placeholders: <i data-ic="alert" data-size="18"></i>
  document.querySelectorAll('[data-ic]').forEach((el) => {
    el.outerHTML = icon(el.dataset.ic, Number(el.dataset.size) || 16)
  })

  // simple menu toggles: [data-menu] button controls the next .menu sibling
  document.querySelectorAll('[data-menu]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation()
      const m = document.getElementById(el.dataset.menu)
      const open = m.hasAttribute('hidden')
      document.querySelectorAll('.menu').forEach((x) => x.setAttribute('hidden', ''))
      if (open) m.removeAttribute('hidden')
      el.setAttribute('aria-expanded', String(open))
    })
  })
  document.addEventListener('click', () => {
    document.querySelectorAll('.menu').forEach((x) => x.setAttribute('hidden', ''))
    document
      .querySelectorAll('[data-menu]')
      .forEach((x) => x.setAttribute('aria-expanded', 'false'))
  })
}

document.addEventListener('DOMContentLoaded', mount)

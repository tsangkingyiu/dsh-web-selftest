import type { Page, Locator } from 'playwright-core'

/**
 * Virtual cursor visualizer: a page-owned DOM overlay that makes the agent's
 * automated actions visible in screenshots and the CDP screencast. Headless
 * Chromium renders no real cursor, so actions otherwise appear as unmotivated
 * state changes; this layer animates an arrow to the target, ripples on click,
 * and outlines the focused input while typing.
 *
 * REAL mouse tracking: the page's own pointer events (hover, moves dispatched
 * by page.mouse.*, user scripts) feed a passive listener that parks the cursor
 * at the last known pointer position. Agent-driven locator actions bypass real
 * events, so the pre-action move() animation remains authoritative there.
 *
 * The installer is idempotent and self-healing: init scripts run per document,
 * but `setContent`-style document rewrites keep window globals while wiping DOM
 * nodes — so every call first verifies the ELEMENTS exist and reinstalls when
 * they do not.
 */

/** Runtime handle installed into each session at creation. */
export interface ActionVisualizer {
  /** Move the virtual cursor to a target element or point, easing over ~150ms. */
  move(target: VisualizerTarget, page: Page): Promise<void>
  /** Ripple at the click point (element center or coordinates). */
  click(target: VisualizerTarget, page: Page): Promise<void>
  /** Outline + label the input target for the duration of a fill. */
  typing(selector: string, page: Page): Promise<void>
}

export interface VisualizerTarget {
  ref?: string | undefined
  selector?: string | undefined
  x?: number | undefined
  y?: number | undefined
}

/** Runtime shape of the in-page visualizer (host side has no DOM types). */
interface VisualizerRuntime {
  move(x: number, y: number): Promise<void>
  ripple(x: number, y: number): void
  highlight(rect: { x: number; y: number; width: number; height: number } | null): void
  clearHighlight(): void
}

type VizWindow = { __dshViz?: VisualizerRuntime }

const INSTALL_SOURCE = `
(() => {
  const w = window
  const install = () => {
    if (w.__dshVizInstalling) return
    if (w.__dshViz && document.getElementById('dsh-viz-cursor')) return

    // Init scripts run before any DOM exists on real navigations; RETRY per
    // frame until the document element materializes instead of giving up. This
    // matters beyond cosmetics: real-pointer tracking must be live on pages the
    // agent never touches, so a later tool call cannot be relied on to heal.
    const root = document.documentElement
    if (!root) {
      requestAnimationFrame(install)
      return
    }
    w.__dshVizInstalling = true

  const css = document.createElement('style')
  css.id = 'dsh-viz-css'
  css.textContent = [
    '#dsh-viz-cursor{position:fixed;z-index:2147483647;pointer-events:none;',
    'left:0;top:0;transition:transform 150ms cubic-bezier(0.25,0.1,0.25,1);will-change:transform;}',
    '#dsh-viz-ripple{position:fixed;z-index:2147483646;pointer-events:none;border-radius:50%;}',
    '#dsh-viz-hl{position:fixed;z-index:2147483645;pointer-events:none;border-radius:4px;',
    'outline:2px solid rgba(90,170,255,0.95);background:rgba(90,170,255,0.12);',
    'box-shadow:0 0 0 4px rgba(90,170,255,0.15);transition:all 120ms ease-out;}',
    '@keyframes dsh-viz-pulse{to{opacity:0;transform:translate(-50%,-50%) scale(2.2);}}',
  ].join('')
  root.appendChild(css)

  // Cursor: inline SVG arrow with white outline so it reads on any background.
  let cursor = document.getElementById('dsh-viz-cursor')
  if (!cursor) {
    cursor = document.createElement('div')
    cursor.id = 'dsh-viz-cursor'
    root.appendChild(cursor)
    cursor.style.transform = 'translate(-100px, -100px)'
  }
  cursor.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24">' +
    '<path d="M5 3l14 8-6.5 1.5L9 19z" fill="rgba(20,20,20,0.85)" stroke="#fff" stroke-width="1.5"/></svg>'
  cursor.style.cssText += ';position:fixed;left:0;top:0;pointer-events:none;z-index:2147483647;' +
    'transition:transform 150ms cubic-bezier(0.25,0.1,0.25,1);will-change:transform;'

  const ripple = () => {
    const el = document.createElement('div')
    el.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;border-radius:50%;' +
      'width:28px;height:28px;border:3px solid rgba(90,170,255,0.9);' +
      'transform:translate(-50%,-50%) scale(0);animation:dsh-viz-pulse 450ms ease-out forwards;'
    return el
  }

  let hl = document.getElementById('dsh-viz-hl')
  if (!hl) {
    hl = document.createElement('div')
    hl.id = 'dsh-viz-hl'
    root.appendChild(hl)
  }
  hl.style.cssText = 'position:fixed;display:none;z-index:2147483645;pointer-events:none;border-radius:4px;' +
    'outline:2px solid rgba(90,170,255,0.95);background:rgba(90,170,255,0.12);' +
    'box-shadow:0 0 0 4px rgba(90,170,255,0.15);transition:all 120ms ease-out;'

  // Real-pointer tracking: any mousemove on the page parks the cursor at that
  // position UNLESS an animated move is in flight (the agent's choreographed
  // travel must not be yanked aside mid-animation). Hover trails therefore show
  // up in the stream exactly where the real input went.
  let animating = false

  w.__dshViz = {
    async move(x, y) {
      animating = true
      try {
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
        cursor.style.transform = 'translate(' + x + 'px, ' + y + 'px)'
        await new Promise(r => setTimeout(r, 180))
      } finally {
        animating = false
      }
    },
    ripple(x, y) {
      const el = ripple()
      el.style.left = x + 'px'
      el.style.top = y + 'px'
      root.appendChild(el)
      setTimeout(() => el.remove(), 500)
    },
    highlight(rect) {
      if (!rect) return
      hl.style.display = 'block'
      hl.style.left = rect.x + 'px'
      hl.style.top = rect.y + 'px'
      hl.style.width = rect.width + 'px'
      hl.style.height = rect.height + 'px'
    },
    clearHighlight() {
      hl.style.display = 'none'
    },
    track(x, y) {
      if (animating) return
      cursor.style.transform = 'translate(' + x + 'px, ' + y + 'px)'
    },
  }
  w.__dshVizInstalling = false
  }
  install()
})()
`

/**
 * Passive real-pointer listener source. Registered ONLY via page.evaluate from
 * the host (main world): addInitScript runs in Playwright's isolated world where
 * its window listeners never see main-world pointer events.
 */
const TRACKER_SOURCE = `
(() => {
  const w = window
  // Guard per-DOCUMENT so repeated evaluates stay idempotent; the document is
  // fresh after navigations/setContent, so each new document re-attaches once.
  if (document.__dshPointerTracking) return
  document.__dshPointerTracking = true
  if (w.__dshPointerTracker) w.removeEventListener('mousemove', w.__dshPointerTracker)
  w.__dshPointerTracker = (e) => {
    try { w.__dshViz && w.__dshViz.track(e.clientX, e.clientY) } catch {}
  }
  w.addEventListener('mousemove', w.__dshPointerTracker, { capture: true, passive: true })
})()
`

async function ensureInstalled(page: Page): Promise<boolean> {
  try {
    // Install-or-heal on every use: cheap idempotent check covering both the
    // pre-DOM navigation phase and post-setContent node wipes.
    await page.evaluate(INSTALL_SOURCE)
    await page.evaluate(TRACKER_SOURCE)
    return await page.evaluate((): boolean => {
      const w = globalThis as unknown as VizWindow & { __dshPointerTracker?: unknown }
      return typeof w.__dshViz === 'object' && w.__dshViz !== null && typeof w.__dshPointerTracker === 'function'
    })
  } catch {
    return false
  }
}

/** Resolve the viewport-space center of the action target, or null when unlocatable. */
async function targetPoint(
  page: Page,
  target: VisualizerTarget,
): Promise<{ x: number; y: number } | null> {
  if (target.x !== undefined && target.y !== undefined) {
    return { x: clampToWidth(page, target.x), y: clampToHeight(page, target.y) }
  }
  let locator: Locator | undefined
  if (target.ref !== undefined && target.ref.length > 0) locator = page.locator(`aria-ref=${target.ref}`)
  else if (target.selector !== undefined && target.selector.length > 0) locator = page.locator(target.selector).first()
  if (locator === undefined) return null
  try {
    const box = await locator.boundingBox({ timeout: 1500 })
    if (!box) return null
    const width = page.viewportSize()?.width ?? box.x + box.width
    const height = page.viewportSize()?.height ?? box.y + box.height
    return {
      x: Math.max(0, Math.min(box.x + box.width / 2, width)),
      y: Math.max(0, Math.min(box.y + box.height / 2, height)),
    }
  } catch {
    return null
  }
}

function clampToWidth(page: Page, x: number): number {
  return Math.max(0, Math.min(x, page.viewportSize()?.width ?? x))
}
function clampToHeight(page: Page, y: number): number {
  return Math.max(0, Math.min(y, page.viewportSize()?.height ?? y))
}

/** Register the per-document installer on every future page of the context. */
export function attachActionVisualizer(context: import('playwright-core').BrowserContext): void {
  // Overlay install rides the init script (self-retrying past document-start).
  // NOTE: the pointer tracker must NOT ride along — init scripts execute in an
  // isolated world whose listeners never see main-world events. The tracker is
  // attached by ensureInstalled() via main-world page.evaluate instead.
  void context.addInitScript(`${INSTALL_SOURCE};`)
}

export function makeVisualizer(): ActionVisualizer {
  return {
    async move(target, page): Promise<void> {
      if (!(await ensureInstalled(page))) return
      const point = await targetPoint(page, target)
      if (!point) return
      await page.evaluate(async ({ x, y }: { x: number; y: number }) => {
        const viz = (globalThis as unknown as VizWindow).__dshViz
        await viz?.move(x, y)
      }, point).catch(() => {})
    },

    async click(target, page): Promise<void> {
      if (!(await ensureInstalled(page))) return
      const point = await targetPoint(page, target)
      if (!point) return
      await page.evaluate(({ x, y }: { x: number; y: number }) => {
        ;(globalThis as unknown as VizWindow).__dshViz?.ripple(x, y)
      }, point).catch(() => {})
    },

    async typing(selector, page): Promise<void> {
      if (!(await ensureInstalled(page))) return
      let rect: { x: number; y: number; width: number; height: number } | null = null
      try {
        const box = await page.locator(selector).first().boundingBox({ timeout: 1500 })
        if (box) rect = { x: box.x, y: box.y, width: box.width, height: box.height }
      } catch {
        return
      }
      await page.evaluate((r: { x: number; y: number; width: number; height: number } | null) => {
        ;(globalThis as unknown as VizWindow).__dshViz?.highlight(r)
      }, rect).catch(() => {})
    },
  }
}

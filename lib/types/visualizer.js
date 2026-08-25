const INSTALL_SOURCE = `
(() => {
  const w = window
  if (w.__dshVizInstalling) return
  if (w.__dshViz && document.getElementById('dsh-viz-cursor')) return

  // Init scripts run before any DOM exists on real navigations; defer until the
  // document element materializes instead of throwing. setContent-style rewrites
  // keep window globals but wipe nodes — the element check above catches that.
  const root = document.documentElement
  if (!root) return
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

  w.__dshViz = {
    async move(x, y) {
      // Two RAFs: paint the current frame first, then commit the transform so
      // the CSS transition animates the travel.
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      cursor.style.transform = 'translate(' + x + 'px, ' + y + 'px)'
      await new Promise(r => setTimeout(r, 180))
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
  }
  w.__dshVizInstalling = false
})()
`;
async function ensureInstalled(page) {
    try {
        // Install-or-heal on every use: cheap idempotent check covering both the
        // pre-DOM navigation phase and post-setContent node wipes.
        await page.evaluate(INSTALL_SOURCE);
        return await page.evaluate(() => {
            const w = globalThis;
            return typeof w.__dshViz === 'object' && w.__dshViz !== null;
        });
    }
    catch {
        return false;
    }
}
/** Resolve the viewport-space center of the action target, or null when unlocatable. */
async function targetPoint(page, target) {
    if (target.x !== undefined && target.y !== undefined) {
        return { x: clampToWidth(page, target.x), y: clampToHeight(page, target.y) };
    }
    let locator;
    if (target.ref !== undefined && target.ref.length > 0)
        locator = page.locator(`aria-ref=${target.ref}`);
    else if (target.selector !== undefined && target.selector.length > 0)
        locator = page.locator(target.selector).first();
    if (locator === undefined)
        return null;
    try {
        const box = await locator.boundingBox({ timeout: 1500 });
        if (!box)
            return null;
        const width = page.viewportSize()?.width ?? box.x + box.width;
        const height = page.viewportSize()?.height ?? box.y + box.height;
        return {
            x: Math.max(0, Math.min(box.x + box.width / 2, width)),
            y: Math.max(0, Math.min(box.y + box.height / 2, height)),
        };
    }
    catch {
        return null;
    }
}
function clampToWidth(page, x) {
    return Math.max(0, Math.min(x, page.viewportSize()?.width ?? x));
}
function clampToHeight(page, y) {
    return Math.max(0, Math.min(y, page.viewportSize()?.height ?? y));
}
/** Register the per-document installer on every future page of the context. */
export function attachActionVisualizer(context) {
    void context.addInitScript(INSTALL_SOURCE);
}
export function makeVisualizer() {
    return {
        async move(target, page) {
            if (!(await ensureInstalled(page)))
                return;
            const point = await targetPoint(page, target);
            if (!point)
                return;
            await page.evaluate(async ({ x, y }) => {
                const viz = globalThis.__dshViz;
                await viz?.move(x, y);
            }, point).catch(() => { });
        },
        async click(target, page) {
            if (!(await ensureInstalled(page)))
                return;
            const point = await targetPoint(page, target);
            if (!point)
                return;
            await page.evaluate(({ x, y }) => {
                ;
                globalThis.__dshViz?.ripple(x, y);
            }, point).catch(() => { });
        },
        async typing(selector, page) {
            if (!(await ensureInstalled(page)))
                return;
            let rect = null;
            try {
                const box = await page.locator(selector).first().boundingBox({ timeout: 1500 });
                if (box)
                    rect = { x: box.x, y: box.y, width: box.width, height: box.height };
            }
            catch {
                return;
            }
            await page.evaluate((r) => {
                ;
                globalThis.__dshViz?.highlight(r);
            }, rect).catch(() => { });
        },
    };
}
//# sourceMappingURL=visualizer.js.map
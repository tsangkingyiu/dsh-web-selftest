import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core'
import { attachActionVisualizer } from './visualizer.js'

/** Device presets for selftest sessions. `desktop` is the default. */
export const DEVICE_PRESETS = {
  desktop: { viewport: { width: 1280, height: 720 }, userAgent: undefined, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  mobile: {
    // Pixel-class dimensions; a generic Android UA keeps this dependency-free.
    viewport: { width: 412, height: 915 },
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
} as const

export type DevicePreset = keyof typeof DEVICE_PRESETS

export function isDevicePreset(value: unknown): value is DevicePreset {
  return value === 'desktop' || value === 'mobile'
}

export type WebSession = {
  sessionId: string
  context: BrowserContext
  page: Page
  device: DevicePreset
  /** Epoch ms when the session was created — used by the TTL sweep. */
  createdAt: number
  consoleMessages: Array<{ type: string; text: string; timestamp: number }>
  pageErrors: Array<{ message: string; stack?: string; timestamp: number }>
  maxConsoleMessages: number
}

export class WebHostController {
  private browser: Browser | null = null
  private sessions = new Map<string, WebSession>()
  private idleTimer: NodeJS.Timeout | null = null
  private readonly idleTimeoutMs = 5 * 60 * 1000 // 5 minutes
  /** Sessions live at most this long from creation, stream or not. */
  private readonly maxSessionTtlMs = 30 * 60 * 1000 // 30 minutes
  /** Session ids with an open MJPEG stream — exempt from the idle sweep. */
  private readonly streaming = new Set<string>()

  /** Mark a session as actively streaming (idle sweep skips it). */
  beginStreaming(sessionId: string): void {
    this.streaming.add(sessionId)
    this.resetIdleTimer()
  }

  /** Clear the streaming mark when its MJPEG connection ends. */
  endStreaming(sessionId: string): void {
    this.streaming.delete(sessionId)
    this.resetIdleTimer()
  }

  async ensureBrowser(): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) return this.browser
    this.browser = await chromium.launch({ headless: true })
    return this.browser
  }

  async createSession(sessionId: string, device: DevicePreset = 'desktop'): Promise<WebSession> {
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId)!
    }
    const browser = await this.ensureBrowser()
    const preset = DEVICE_PRESETS[device]
    const context = await browser.newContext({
      viewport: { ...preset.viewport },
      ...(preset.userAgent !== undefined ? { userAgent: preset.userAgent } : {}),
      deviceScaleFactor: preset.deviceScaleFactor,
      isMobile: preset.isMobile,
      hasTouch: preset.hasTouch,
    })
    attachActionVisualizer(context)
    const page = await context.newPage()
    const session: WebSession = {
      sessionId,
      context,
      page,
      device,
      createdAt: Date.now(),
      consoleMessages: [],
      pageErrors: [],
      maxConsoleMessages: 200,
    }
    page.on('console', msg => {
      session.consoleMessages.push({ type: msg.type(), text: msg.text(), timestamp: Date.now() })
      if (session.consoleMessages.length > session.maxConsoleMessages) session.consoleMessages.shift()
    })
    page.on('pageerror', error => {
      session.pageErrors.push({
        message: error.message,
        ...(error.stack !== undefined ? { stack: error.stack } : {}),
        timestamp: Date.now(),
      })
      if (session.pageErrors.length > session.maxConsoleMessages) session.pageErrors.shift()
    })
    this.sessions.set(sessionId, session)
    this.resetIdleTimer()
    return session
  }

  getSession(sessionId: string): WebSession | undefined {
    // Read-only lookup: does NOT re-arm the idle timer. Only createSession,
    // beginStreaming and endStreaming reset the clock — this fixes the bug
    // where a retrying MJPEG client (calling getSession on each reconnect)
    // kept the browser alive forever.
    return this.sessions.get(sessionId)
  }

  async closeSession(sessionId: string): Promise<void> {
    this.streaming.delete(sessionId)
    const session = this.sessions.get(sessionId)
    if (session) {
      await session.context.close()
      this.sessions.delete(sessionId)
    }
  }

  private resetIdleTimer() {
    if (this.idleTimer !== null) clearTimeout(this.idleTimer)
    this.idleTimer = setTimeout(() => { void this.sweepIdle() }, this.idleTimeoutMs)
  }

  /**
   * Idle sweep: dispose only when NOTHING is watching. Sessions with an open
   * MJPEG stream are exempt — a passive viewer never calls getSession, so a
   * plain idle sweep would kill the live view out from under them after 5 min.
   *
   * Safety rails:
   *  - Sessions older than maxSessionTtlMs are force-closed even if streaming
   *    (absolute TTL: a wedged screencast can no longer pin the browser).
   *  - dispose() errors are caught so a failed close can never leave the
   *    timer dead with the browser still running.
   */
  private async sweepIdle(): Promise<void> {
    const now = Date.now()
    const expired: string[] = []
    for (const [id, session] of this.sessions) {
      if (now - session.createdAt >= this.maxSessionTtlMs) expired.push(id)
    }
    for (const id of expired) {
      await this.closeSession(id).catch(() => {})
    }
    if (this.streaming.size > 0 || this.sessions.size > 0) {
      // Still something alive (streams exempt from idle dispose, or a close
      // is mid-flight): re-arm and check again after another window.
      this.resetIdleTimer()
      return
    }
    await this.dispose()
  }

  async dispose(): Promise<void> {
    if (this.idleTimer !== null) clearTimeout(this.idleTimer)
    this.streaming.clear()
    for (const session of this.sessions.values()) {
      await session.context.close().catch(() => {})
    }
    this.sessions.clear()
    if (this.browser !== null) {
      await this.browser.close().catch(() => {})
      this.browser = null
    }
  }
}

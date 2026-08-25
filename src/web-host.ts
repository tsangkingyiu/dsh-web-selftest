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
  consoleMessages: Array<{ type: string; text: string; timestamp: number }>
  pageErrors: Array<{ message: string; stack?: string; timestamp: number }>
  maxConsoleMessages: number
}

export class WebHostController {
  private browser: Browser | null = null
  private sessions = new Map<string, WebSession>()
  private idleTimer: NodeJS.Timeout | null = null
  private readonly idleTimeoutMs = 5 * 60 * 1000 // 5 minutes

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
    this.resetIdleTimer()
    return this.sessions.get(sessionId)
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (session) {
      await session.context.close()
      this.sessions.delete(sessionId)
    }
  }

  private resetIdleTimer() {
    if (this.idleTimer !== null) clearTimeout(this.idleTimer)
    this.idleTimer = setTimeout(() => { void this.dispose() }, this.idleTimeoutMs)
  }

  async dispose(): Promise<void> {
    if (this.idleTimer !== null) clearTimeout(this.idleTimer)
    for (const session of this.sessions.values()) {
      await session.context.close()
    }
    this.sessions.clear()
    if (this.browser !== null) {
      await this.browser.close()
      this.browser = null
    }
  }
}

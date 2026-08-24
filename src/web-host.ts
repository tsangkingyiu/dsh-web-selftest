import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core'

export type WebSession = {
  sessionId: string
  context: BrowserContext
  page: Page
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

  async createSession(sessionId: string): Promise<WebSession> {
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId)!
    }
    const browser = await this.ensureBrowser()
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
    const page = await context.newPage()
    const session = { sessionId, context, page }
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
    if (this.idleTimer) clearTimeout(this.idleTimer)
    this.idleTimer = setTimeout(() => this.dispose(), this.idleTimeoutMs)
  }

  async dispose(): Promise<void> {
    if (this.idleTimer) clearTimeout(this.idleTimer)
    for (const session of this.sessions.values()) {
      await session.context.close()
    }
    this.sessions.clear()
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}

import { chromium } from 'playwright-core';
import { attachActionVisualizer } from './visualizer.js';
export class WebHostController {
    browser = null;
    sessions = new Map();
    idleTimer = null;
    idleTimeoutMs = 5 * 60 * 1000; // 5 minutes
    async ensureBrowser() {
        if (this.browser && this.browser.isConnected())
            return this.browser;
        this.browser = await chromium.launch({ headless: true });
        return this.browser;
    }
    async createSession(sessionId) {
        if (this.sessions.has(sessionId)) {
            return this.sessions.get(sessionId);
        }
        const browser = await this.ensureBrowser();
        const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
        attachActionVisualizer(context);
        const page = await context.newPage();
        const session = {
            sessionId,
            context,
            page,
            consoleMessages: [],
            pageErrors: [],
            maxConsoleMessages: 200,
        };
        page.on('console', msg => {
            session.consoleMessages.push({ type: msg.type(), text: msg.text(), timestamp: Date.now() });
            if (session.consoleMessages.length > session.maxConsoleMessages)
                session.consoleMessages.shift();
        });
        page.on('pageerror', error => {
            session.pageErrors.push({
                message: error.message,
                ...(error.stack !== undefined ? { stack: error.stack } : {}),
                timestamp: Date.now(),
            });
            if (session.pageErrors.length > session.maxConsoleMessages)
                session.pageErrors.shift();
        });
        this.sessions.set(sessionId, session);
        this.resetIdleTimer();
        return session;
    }
    getSession(sessionId) {
        this.resetIdleTimer();
        return this.sessions.get(sessionId);
    }
    async closeSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            await session.context.close();
            this.sessions.delete(sessionId);
        }
    }
    resetIdleTimer() {
        if (this.idleTimer)
            clearTimeout(this.idleTimer);
        this.idleTimer = setTimeout(() => this.dispose(), this.idleTimeoutMs);
    }
    async dispose() {
        if (this.idleTimer)
            clearTimeout(this.idleTimer);
        for (const session of this.sessions.values()) {
            await session.context.close();
        }
        this.sessions.clear();
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}
//# sourceMappingURL=web-host.js.map
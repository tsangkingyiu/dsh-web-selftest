import { chromium } from 'playwright-core';
import { attachActionVisualizer } from './visualizer.js';
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
};
export function isDevicePreset(value) {
    return value === 'desktop' || value === 'mobile';
}
export class WebHostController {
    browser = null;
    sessions = new Map();
    idleTimer = null;
    idleTimeoutMs = 5 * 60 * 1000; // 5 minutes
    /** Session ids with an open MJPEG stream — exempt from the idle sweep. */
    streaming = new Set();
    /** Mark a session as actively streaming (idle sweep skips it). */
    beginStreaming(sessionId) {
        this.streaming.add(sessionId);
        this.resetIdleTimer();
    }
    /** Clear the streaming mark when its MJPEG connection ends. */
    endStreaming(sessionId) {
        this.streaming.delete(sessionId);
        this.resetIdleTimer();
    }
    async ensureBrowser() {
        if (this.browser && this.browser.isConnected())
            return this.browser;
        this.browser = await chromium.launch({ headless: true });
        return this.browser;
    }
    async createSession(sessionId, device = 'desktop') {
        if (this.sessions.has(sessionId)) {
            return this.sessions.get(sessionId);
        }
        const browser = await this.ensureBrowser();
        const preset = DEVICE_PRESETS[device];
        const context = await browser.newContext({
            viewport: { ...preset.viewport },
            ...(preset.userAgent !== undefined ? { userAgent: preset.userAgent } : {}),
            deviceScaleFactor: preset.deviceScaleFactor,
            isMobile: preset.isMobile,
            hasTouch: preset.hasTouch,
        });
        attachActionVisualizer(context);
        const page = await context.newPage();
        const session = {
            sessionId,
            context,
            page,
            device,
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
        this.streaming.delete(sessionId);
        const session = this.sessions.get(sessionId);
        if (session) {
            await session.context.close();
            this.sessions.delete(sessionId);
        }
    }
    resetIdleTimer() {
        if (this.idleTimer !== null)
            clearTimeout(this.idleTimer);
        this.idleTimer = setTimeout(() => { void this.sweepIdle(); }, this.idleTimeoutMs);
    }
    /**
     * Idle sweep: dispose only when NOTHING is watching. Sessions with an open
     * MJPEG stream are exempt — a passive viewer never calls getSession, so a
     * plain idle sweep would kill the live view out from under them after 5 min.
     */
    async sweepIdle() {
        if (this.streaming.size > 0) {
            // Still streaming: re-arm and check again after another window.
            this.resetIdleTimer();
            return;
        }
        await this.dispose();
    }
    async dispose() {
        if (this.idleTimer !== null)
            clearTimeout(this.idleTimer);
        this.streaming.clear();
        for (const session of this.sessions.values()) {
            await session.context.close();
        }
        this.sessions.clear();
        if (this.browser !== null) {
            await this.browser.close();
            this.browser = null;
        }
    }
}
//# sourceMappingURL=web-host.js.map
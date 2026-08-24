import { type Browser, type BrowserContext, type Page } from 'playwright-core';
export type WebSession = {
    sessionId: string;
    context: BrowserContext;
    page: Page;
};
export declare class WebHostController {
    private browser;
    private sessions;
    private idleTimer;
    private readonly idleTimeoutMs;
    ensureBrowser(): Promise<Browser>;
    createSession(sessionId: string): Promise<WebSession>;
    getSession(sessionId: string): WebSession | undefined;
    closeSession(sessionId: string): Promise<void>;
    private resetIdleTimer;
    dispose(): Promise<void>;
}
//# sourceMappingURL=web-host.d.ts.map
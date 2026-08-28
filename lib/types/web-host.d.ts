import { type Browser, type BrowserContext, type Page } from 'playwright-core';
/** Device presets for selftest sessions. `desktop` is the default. */
export declare const DEVICE_PRESETS: {
    readonly desktop: {
        readonly viewport: {
            readonly width: 1280;
            readonly height: 720;
        };
        readonly userAgent: undefined;
        readonly deviceScaleFactor: 1;
        readonly isMobile: false;
        readonly hasTouch: false;
    };
    readonly mobile: {
        readonly viewport: {
            readonly width: 412;
            readonly height: 915;
        };
        readonly userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
        readonly deviceScaleFactor: 2;
        readonly isMobile: true;
        readonly hasTouch: true;
    };
};
export type DevicePreset = keyof typeof DEVICE_PRESETS;
export declare function isDevicePreset(value: unknown): value is DevicePreset;
export type WebSession = {
    sessionId: string;
    context: BrowserContext;
    page: Page;
    device: DevicePreset;
    /** Epoch ms when the session was created — used by the TTL sweep. */
    createdAt: number;
    consoleMessages: Array<{
        type: string;
        text: string;
        timestamp: number;
    }>;
    pageErrors: Array<{
        message: string;
        stack?: string;
        timestamp: number;
    }>;
    maxConsoleMessages: number;
};
export declare class WebHostController {
    private browser;
    private sessions;
    private idleTimer;
    private readonly idleTimeoutMs;
    /** Sessions live at most this long from creation, stream or not. */
    private readonly maxSessionTtlMs;
    /** Session ids with an open MJPEG stream — exempt from the idle sweep. */
    private readonly streaming;
    /** Mark a session as actively streaming (idle sweep skips it). */
    beginStreaming(sessionId: string): void;
    /** Clear the streaming mark when its MJPEG connection ends. */
    endStreaming(sessionId: string): void;
    ensureBrowser(): Promise<Browser>;
    createSession(sessionId: string, device?: DevicePreset): Promise<WebSession>;
    getSession(sessionId: string): WebSession | undefined;
    closeSession(sessionId: string): Promise<void>;
    private resetIdleTimer;
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
    private sweepIdle;
    dispose(): Promise<void>;
}
//# sourceMappingURL=web-host.d.ts.map
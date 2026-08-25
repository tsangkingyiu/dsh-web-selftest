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
    ensureBrowser(): Promise<Browser>;
    createSession(sessionId: string, device?: DevicePreset): Promise<WebSession>;
    getSession(sessionId: string): WebSession | undefined;
    closeSession(sessionId: string): Promise<void>;
    private resetIdleTimer;
    dispose(): Promise<void>;
}
//# sourceMappingURL=web-host.d.ts.map
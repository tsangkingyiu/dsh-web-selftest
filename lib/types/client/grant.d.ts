export interface ScreenshotGrant {
    url: string;
    expiresAt: number;
}
/** One console entry as returned by the plugin's console route. */
export interface ConsoleEntry {
    kind: 'console' | 'pageerror';
    type?: string;
    text: string;
    timestamp: number;
}
/**
 * Mint a signed screenshot URL for one captured file. The host route verifies
 * the HMAC and confines the path to the plugin cache directory before serving.
 */
export declare function grantScreenshotUrl(path: string): Promise<ScreenshotGrant>;
/** Mint a signed MJPEG stream URL for a running browser session. */
export declare function grantStreamUrl(sessionId: string): Promise<ScreenshotGrant>;
/** Fetch the session's console log + page errors from the plugin's console route. */
export declare function fetchConsoleEntries(sessionId: string): Promise<{
    entries: ConsoleEntry[];
}>;
//# sourceMappingURL=grant.d.ts.map
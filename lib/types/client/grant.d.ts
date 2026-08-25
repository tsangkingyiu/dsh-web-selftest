export interface ScreenshotGrant {
    url: string;
    expiresAt: number;
}
/**
 * Mint a signed screenshot URL for one captured file. The host route verifies
 * the HMAC and confines the path to the plugin cache directory before serving.
 */
export declare function grantScreenshotUrl(path: string): Promise<ScreenshotGrant>;
/** Mint a signed MJPEG stream URL for a running browser session. */
export declare function grantStreamUrl(sessionId: string): Promise<ScreenshotGrant>;
//# sourceMappingURL=grant.d.ts.map
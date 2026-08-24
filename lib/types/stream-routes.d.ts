import type { WebHostController } from './web-host.js';
export declare function dshHome(): string;
export declare function stateRoot(): string;
export declare function screenshotDir(sessionId: string): string;
export declare function prepareStreamAccessKey(): Promise<Buffer>;
export declare class StreamAccessController {
    #private;
    private readonly resolveKey;
    constructor(resolveKey?: () => Promise<Buffer>);
    signStreamToken(sessionId: string): Promise<{
        token: string;
        expiresAt: number;
    }>;
    signScreenshotToken(path: string): Promise<{
        token: string;
        expiresAt: number;
    }>;
    verifyStreamToken(token: string): Promise<{
        sessionId: string;
    } | undefined>;
    verifyScreenshotToken(token: string): Promise<{
        path: string;
    } | undefined>;
}
export declare function isLoopbackRemoteAddress(address: string | undefined): boolean;
export declare function installStreamRoutes(ctx: any, host: WebHostController): void;
//# sourceMappingURL=stream-routes.d.ts.map
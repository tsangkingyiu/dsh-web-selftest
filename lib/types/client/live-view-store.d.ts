import type { ReactNode } from 'react';
type Listener = () => void;
export declare function subscribeLiveView(listener: Listener): () => void;
export declare function currentLiveSession(): string | undefined;
/** Open (or switch) the overlay. Manual ▶ clicks bypass the dismissal guard. */
export declare function openLiveView(sessionId: string): void;
/**
 * Auto-launch request from a fresh web_launch card. Skipped when the user
 * already closed this session's view once.
 */
export declare function requestAutoLaunch(sessionId: string): void;
/** User-initiated close: remembers the choice so autos cannot reopen it. */
export declare function closeLiveView(): void;
/** Paint whatever the current state says into the page-owned host element. */
export declare function paintLiveView(node: (sessionId: string) => ReactNode): void;
export {};
//# sourceMappingURL=live-view-store.d.ts.map
/**
 * Single page-owned live view overlay. Mounted outside the app's React tree via
 * the overlay host; survives card unmounts. Auto-launched by fresh web_launch
 * cards after a liveness check, manually openable with ▶ Live, closed with
 * ✕ / Esc (which also suppresses further auto-launches for that session).
 */
export declare function LiveViewHost(): null;
export interface WebPanelProps {
    sessionId: string;
    onClose: () => void;
}
/**
 * MJPEG panel fed by the plugin's signed stream route (CDP screencast proxied as
 * multipart/x-mixed-replace). Token refreshes before expiry so the panel can stay
 * open indefinitely; shows a distinct message when the session has ended.
 */
export declare function WebPanel({ sessionId, onClose }: WebPanelProps): import("react").JSX.Element;
//# sourceMappingURL=panel.d.ts.map
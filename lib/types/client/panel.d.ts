export interface WebPanelProps {
    sessionId: string;
    onClose: () => void;
}
/**
 * Live view overlay: an MJPEG <img> fed by the plugin's signed stream route
 * (CDP screencast proxied as multipart/x-mixed-replace). Token refreshes on
 * expiry so a panel can stay open across the ~10-minute token TTL.
 */
export declare function WebPanel({ sessionId, onClose }: WebPanelProps): import("react").JSX.Element;
//# sourceMappingURL=panel.d.ts.map
import { jsx as _jsx } from "react/jsx-runtime";
import { useSyncExternalStore, useEffect } from 'react';
import { subscribeLiveView, currentLiveSession, paintLiveView, closeLiveView } from './live-view-store.js';
import { WebPanel } from './panel.js';
/**
 * Page-owned live view root. Mounted once outside the app's React tree; the
 * store decides which session (if any) has an open panel.
 */
export function LiveViewHost() {
    const current = useSyncExternalStore(subscribeLiveView, currentLiveSession, currentLiveSession);
    useEffect(() => {
        paintLiveView(sessionId => _jsx(WebPanel, { sessionId: sessionId, onClose: () => closeLiveView() }));
    }, [current]);
    return null;
}
//# sourceMappingURL=live-view-host.js.map
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useSyncExternalStore, useEffect, useRef, useState } from 'react';
import { subscribeLiveView, currentLiveSession, paintLiveView, closeLiveView } from './live-view-store.js';
import { grantStreamUrl } from './grant.js';
/**
 * Single page-owned live view overlay. Mounted outside the app's React tree via
 * the overlay host; survives card unmounts. Auto-launched by fresh web_launch
 * cards after a liveness check, manually openable with ▶ Live, closed with
 * ✕ / Esc (which also suppresses further auto-launches for that session).
 */
export function LiveViewHost() {
    const subscribe = useSyncExternalStore(subscribeLiveView, currentLiveSession, currentLiveSession);
    useEffect(() => {
        paintLiveView(sessionId => _jsx(WebPanel, { sessionId: sessionId, onClose: () => closeLiveView() }));
    }, [subscribe]);
    return null;
}
/**
 * MJPEG panel fed by the plugin's signed stream route (CDP screencast proxied as
 * multipart/x-mixed-replace). Token refreshes before expiry so the panel can stay
 * open indefinitely; shows a distinct message when the session has ended.
 */
export function WebPanel({ sessionId, onClose }) {
    const [status, setStatus] = useState('connecting');
    const [grant, setGrant] = useState();
    const generationRef = useRef(0);
    useEffect(() => {
        const onKey = (event) => { if (event.key === 'Escape')
            onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    useEffect(() => {
        const generation = ++generationRef.current;
        let timer;
        let cancelled = false;
        async function connect() {
            if (cancelled || generationRef.current !== generation)
                return;
            try {
                const next = await grantStreamUrl(sessionId);
                if (cancelled || generationRef.current !== generation)
                    return;
                setGrant(next);
                setStatus('live');
                // Re-mint well before expiry so an open panel never drops.
                const ttl = Math.max(30_000, next.expiresAt - Date.now());
                timer = setTimeout(() => { void connect(); }, Math.max(30_000, ttl - 90_000));
            }
            catch (error) {
                if (cancelled || generationRef.current !== generation)
                    return;
                // 404 from /grant means the session is gone — distinguish from fence errors.
                setStatus(error instanceof Error && error.message.includes('404') ? 'ended' : 'error');
            }
        }
        void connect();
        return () => { cancelled = true; if (timer !== undefined)
            clearTimeout(timer); };
    }, [sessionId]);
    return (_jsxs("div", { style: {
            position: 'fixed', top: 0, right: 0, width: 'min(560px, 60vw)', height: '100vh',
            background: '#141414', borderLeft: '1px solid #333', zIndex: 2147483000,
            display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 24px rgba(0,0,0,0.5)',
        }, children: [_jsxs("div", { style: { padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#ddd' }, children: [_jsxs("span", { style: { fontSize: '13px' }, children: ["\u25CF Live \u00B7 ", sessionId] }), _jsx("button", { onClick: onClose, style: { background: 'none', border: 'none', color: '#999', fontSize: '16px', cursor: 'pointer' }, "aria-label": "Close live view", children: "\u2715" })] }), _jsxs("div", { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#000' }, children: [status === 'connecting' && _jsx("div", { style: { color: '#aaa' }, children: "Connecting\u2026" }), status === 'ended' && _jsx("div", { style: { color: '#fa6', fontSize: '13px' }, children: "Session ended" }), status === 'error' && _jsx("div", { style: { color: '#f66', fontSize: '13px' }, children: "Stream unavailable" }), status === 'live' && grant !== undefined && (_jsx("img", { src: grant.url, alt: "Live browser stream", style: { maxWidth: '100%', maxHeight: '100%' } }))] })] }));
}
//# sourceMappingURL=panel.js.map
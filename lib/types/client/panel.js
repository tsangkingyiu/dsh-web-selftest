import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { grantStreamUrl } from './grant.js';
/**
 * Live view overlay: an MJPEG <img> fed by the plugin's signed stream route
 * (CDP screencast proxied as multipart/x-mixed-replace). Token refreshes on
 * expiry so a panel can stay open across the ~10-minute token TTL.
 */
export function WebPanel({ sessionId, onClose }) {
    const imgRef = useRef(null);
    const [status, setStatus] = useState('connecting');
    const [grant, setGrant] = useState();
    useEffect(() => {
        let cancelled = false;
        let timer;
        async function connect() {
            try {
                const next = await grantStreamUrl(sessionId);
                if (cancelled)
                    return;
                setGrant(next);
                setStatus('live');
                // Re-mint shortly before expiry so a long-open panel never dies.
                const margin = Math.max(30_000, Math.min(120_000, (next.expiresAt - Date.now()) / 2));
                timer = setTimeout(() => { void connect(); }, margin);
            }
            catch {
                if (!cancelled)
                    setStatus('error');
            }
        }
        void connect();
        return () => { cancelled = true; if (timer !== undefined)
            clearTimeout(timer); };
    }, [sessionId]);
    useEffect(() => {
        const onKey = (event) => { if (event.key === 'Escape')
            onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return (_jsxs("div", { style: {
            position: 'fixed', top: 0, right: 0, width: 'min(560px, 60vw)', height: '100vh',
            background: '#141414', borderLeft: '1px solid #333', zIndex: 1000,
            display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 24px rgba(0,0,0,0.5)',
        }, children: [_jsxs("div", { style: { padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#ddd' }, children: [_jsxs("span", { style: { fontSize: '13px' }, children: ["Live \u00B7 ", sessionId] }), _jsx("button", { onClick: onClose, style: { background: 'none', border: 'none', color: '#999', fontSize: '16px', cursor: 'pointer' }, "aria-label": "Close live view", children: "\u2715" })] }), _jsxs("div", { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#000' }, children: [status === 'connecting' && _jsx("div", { style: { color: '#aaa' }, children: "Connecting\u2026" }), status === 'error' && _jsx("div", { style: { color: '#f66', fontSize: '13px' }, children: "Stream unavailable (session closed?)" }), status === 'live' && grant !== undefined && (_jsx("img", { ref: imgRef, src: grant.url, alt: "Live browser stream", style: { maxWidth: '100%', maxHeight: '100%' } }))] })] }));
}
//# sourceMappingURL=panel.js.map
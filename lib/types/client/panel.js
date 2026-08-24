import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
export function WebPanel({ sessionId, onClose }) {
    const imgRef = useRef(null);
    const [status, setStatus] = useState('connecting');
    useEffect(() => {
        let cancelled = false;
        async function connect() {
            try {
                const res = await fetch('/_dsh/dsh-web-selftest/grant', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ sessionId }),
                });
                if (!res.ok)
                    throw new Error('grant failed');
                const { streamUrl } = await res.json();
                if (cancelled)
                    return;
                if (imgRef.current) {
                    imgRef.current.src = streamUrl;
                    setStatus('live');
                }
            }
            catch {
                if (!cancelled)
                    setStatus('error');
            }
        }
        connect();
        return () => { cancelled = true; };
    }, [sessionId]);
    return (_jsxs("div", { style: {
            position: 'fixed', top: 0, right: 0, width: '480px', height: '100vh',
            background: '#1e1e1e', borderLeft: '1px solid #333', zIndex: 1000,
            display: 'flex', flexDirection: 'column',
        }, children: [_jsxs("div", { style: { padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }, children: [_jsxs("span", { children: ["Web Session: ", sessionId] }), _jsx("button", { onClick: onClose, style: { background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }, children: "\u00D7" })] }), _jsxs("div", { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, children: [status === 'connecting' && _jsx("div", { style: { color: '#aaa' }, children: "Connecting\u2026" }), status === 'error' && _jsx("div", { style: { color: '#f66' }, children: "Stream error" }), _jsx("img", { ref: imgRef, alt: "Live browser stream", style: { maxWidth: '100%', maxHeight: '100%', display: status === 'live' ? 'block' : 'none' } })] })] }));
}
//# sourceMappingURL=panel.js.map
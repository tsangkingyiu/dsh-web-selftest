import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { grantStreamUrl, fetchConsoleEntries } from './grant.js';
import { ConsoleView } from './console-view.js';
const PANEL_MIN_WIDTH = 320;
const PANEL_MAX_WIDTH = 1200;
/**
 * Live view overlay: MJPEG stream of the session's page plus a console log
 * viewer, switched by tabs. The left edge is a drag handle for resizing; the
 * chosen width persists across open/close within the page lifetime.
 */
let persistedWidth = 520;
export function WebPanel({ sessionId, onClose }) {
    const [width, setWidth] = useState(persistedWidth);
    const [tab, setTab] = useState('stream');
    const dragStateRef = useRef(undefined);
    // Resize via pointer events on the left-edge handle. Listeners live on window
    // so dragging past the element never loses the gesture.
    const onPointerDown = useCallback((event) => {
        event.preventDefault();
        dragStateRef.current = { startX: event.clientX, startWidth: width };
        event.currentTarget.setPointerCapture(event.pointerId);
    }, [width]);
    const onPointerMove = useCallback((event) => {
        const state = dragStateRef.current;
        if (state === undefined)
            return;
        const next = Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, state.startWidth + (state.startX - event.clientX)));
        setWidth(next);
    }, []);
    const onPointerUp = useCallback(() => {
        if (dragStateRef.current === undefined)
            return;
        dragStateRef.current = undefined;
        setWidth(current => { persistedWidth = current; return current; });
    }, []);
    useEffect(() => {
        const onKey = (event) => { if (event.key === 'Escape')
            onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return (_jsxs("div", { style: {
            position: 'fixed', top: 0, right: 0, width: `${width}px`, height: '100vh',
            background: '#141414', borderLeft: '1px solid #333', zIndex: 2147483000,
            display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 24px rgba(0,0,0,0.5)',
        }, children: [_jsx("div", { onPointerDown: onPointerDown, onPointerMove: onPointerMove, onPointerUp: onPointerUp, style: {
                    position: 'absolute', left: '-4px', top: 0, width: '8px', height: '100%',
                    cursor: 'col-resize', touchAction: 'none',
                }, "aria-label": "Resize live view", "data-testid": "liveview-resize-handle" }), _jsxs("div", { style: { padding: '6px 12px', display: 'flex', gap: '10px', alignItems: 'center', color: '#ddd', borderBottom: '1px solid #333' }, children: [_jsxs("span", { style: { fontSize: '13px' }, children: ["\u25CF Live \u00B7 ", sessionId] }), _jsx(TabButton, { active: tab === 'stream', onClick: () => setTab('stream'), children: "Stream" }), _jsx(TabButton, { active: tab === 'console', onClick: () => setTab('console'), children: "Console" }), _jsx("button", { onClick: onClose, style: { background: 'none', border: 'none', color: '#999', fontSize: '16px', cursor: 'pointer', marginLeft: 'auto' }, "aria-label": "Close live view", children: "\u2715" })] }), _jsxs("div", { style: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }, children: [tab === 'stream' && _jsx(StreamPane, { sessionId: sessionId }), tab === 'console' && _jsx(ConsolePane, { sessionId: sessionId })] })] }));
}
function TabButton({ active, onClick, children }) {
    return (_jsx("button", { onClick: onClick, style: {
            fontSize: '11px', padding: '3px 12px', cursor: 'pointer',
            background: active ? '#2a2a2a' : 'transparent',
            color: active ? '#fff' : '#999',
            border: '1px solid #444', borderRadius: '4px',
        }, children: children }));
}
function StreamPane({ sessionId }) {
    const [status, setStatus] = useState('connecting');
    const [grant, setGrant] = useState();
    const generationRef = useRef(0);
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
                const ttl = Math.max(30_000, next.expiresAt - Date.now());
                timer = setTimeout(() => { void connect(); }, Math.max(30_000, ttl - 90_000));
            }
            catch (error) {
                if (cancelled || generationRef.current !== generation)
                    return;
                setStatus(error instanceof Error && error.message.includes('404') ? 'ended' : 'error');
            }
        }
        void connect();
        return () => { cancelled = true; if (timer !== undefined)
            clearTimeout(timer); };
    }, [sessionId]);
    return (_jsxs("div", { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#000' }, children: [status === 'connecting' && _jsx("div", { style: { color: '#aaa' }, children: "Connecting\u2026" }), status === 'ended' && _jsx("div", { style: { color: '#fa6', fontSize: '13px' }, children: "Session ended" }), status === 'error' && _jsx("div", { style: { color: '#f66', fontSize: '13px' }, children: "Stream unavailable" }), status === 'live' && grant !== undefined && (_jsx("img", { src: grant.url, alt: "Live browser stream", style: { maxWidth: '100%', maxHeight: '100%' } }))] }));
}
function ConsolePane({ sessionId }) {
    const [entries, setEntries] = useState();
    const [error, setError] = useState();
    useEffect(() => {
        let cancelled = false;
        let timer;
        async function poll() {
            try {
                const next = await fetchConsoleEntries(sessionId);
                if (!cancelled)
                    setEntries(next.entries);
            }
            catch (err) {
                if (!cancelled)
                    setError(err instanceof Error ? err.message : String(err));
            }
        }
        void poll();
        timer = setInterval(poll, 2000);
        return () => { cancelled = true; if (timer !== undefined)
            clearInterval(timer); };
    }, [sessionId]);
    return _jsx(ConsoleView, { entries: entries, error: error });
}
//# sourceMappingURL=panel.js.map
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { webResultSummaryOf } from './result.js';
import { openLiveView, requestAutoLaunch } from './live-view-store.js';
/**
 * Launch card: confirms the session id and offers the live view. A FRESH card
 * mount (new web_launch result reaching the UI) auto-launches the overlay after
 * a liveness probe; replayed/historical cards stay quiet.
 */
async function isSessionRunning(sessionId) {
    try {
        const res = await fetch('/_dsh/dsh-web-selftest/status', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ sessionId }),
        });
        if (!res.ok)
            return false;
        const body = await res.json();
        return typeof body === 'object' && body !== null && body.running === true;
    }
    catch {
        return false;
    }
}
export function WebLaunchCard(props) {
    const summary = webResultSummaryOf(props.block);
    const sessionId = summary?.sessionId;
    const probedRef = useRef(false);
    const [autoState, setAutoState] = useState('idle');
    // Auto-launch once per fresh result block: only when the session is actually
    // running right now (replayed old cards find nothing running and stay closed).
    useEffect(() => {
        if (sessionId === undefined || probedRef.current)
            return;
        probedRef.current = true;
        let cancelled = false;
        setAutoState('waiting');
        void isSessionRunning(sessionId).then(running => {
            if (cancelled)
                return;
            if (running)
                requestAutoLaunch(sessionId);
            else
                setAutoState('ended');
        });
        return () => { cancelled = true; };
    }, [sessionId]);
    return (_jsxs("div", { style: { padding: '8px', border: '1px solid #444', borderRadius: '6px' }, children: [_jsx("div", { style: { fontSize: '12px', opacity: 0.7 }, children: "\uD83C\uDF10 Web Session Launched" }), sessionId !== undefined && (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }, children: [_jsx("span", { style: { fontSize: '12px', color: '#888', fontFamily: 'monospace' }, children: sessionId }), _jsx("button", { onClick: () => openLiveView(sessionId), style: {
                            fontSize: '11px', padding: '2px 10px', cursor: 'pointer',
                            background: 'transparent', color: '#4a9eff',
                            border: '1px solid #4a9eff', borderRadius: '4px',
                        }, children: "\u25B6 Live" }), autoState === 'ended' && (_jsx("span", { style: { fontSize: '11px', color: '#777' }, children: "(session not active \u2014 live view off)" }))] }))] }));
}
//# sourceMappingURL=card-launch.js.map
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { webResultSummaryOf } from './result.js';
import { WebPanel } from './panel.js';
/**
 * Launch card: confirms the session id and offers the live view — an overlay
 * panel streaming the session's page through the plugin's MJPEG route.
 */
export function WebLaunchCard(props) {
    const summary = webResultSummaryOf(props.block);
    const [live, setLive] = useState(false);
    return (_jsxs("div", { style: { padding: '8px', border: '1px solid #444', borderRadius: '6px' }, children: [_jsx("div", { style: { fontSize: '12px', opacity: 0.7 }, children: "\uD83C\uDF10 Web Session Launched" }), summary?.sessionId !== undefined && (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }, children: [_jsx("span", { style: { fontSize: '12px', color: '#888', fontFamily: 'monospace' }, children: summary.sessionId }), _jsx("button", { onClick: () => setLive(true), style: {
                            fontSize: '11px', padding: '2px 10px', cursor: 'pointer',
                            background: 'transparent', color: '#4a9eff',
                            border: '1px solid #4a9eff', borderRadius: '4px',
                        }, children: "\u25B6 Live" })] })), live && summary?.sessionId !== undefined && (_jsx(WebPanel, { sessionId: summary.sessionId, onClose: () => setLive(false) }))] }));
}
//# sourceMappingURL=card-launch.js.map
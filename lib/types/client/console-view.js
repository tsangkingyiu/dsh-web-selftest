import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
/**
 * Console log renderer: monospaced, color-coded by severity, auto-scrolls to
 * the newest entry unless the user scrolled up to read history.
 */
const TYPE_COLORS = {
    error: '#f66',
    warning: '#fa6',
    info: '#6cf',
    pageerror: '#f66',
    assert: '#f6f',
};
const TYPE_BADGES = {
    log: 'log',
    error: 'err',
    warning: 'warn',
    info: 'info',
    debug: 'dbg',
    pageerror: 'EXC',
};
function badgeOf(entry) {
    const key = entry.kind === 'pageerror' ? 'pageerror' : entry.type ?? 'log';
    return TYPE_BADGES[key] ?? key;
}
function colorOf(entry) {
    const key = entry.kind === 'pageerror' ? 'pageerror' : entry.type ?? 'log';
    return TYPE_COLORS[key] ?? '#ccc';
}
export function ConsoleView({ entries, error }) {
    const scrollRef = useRef(null);
    const pinnedRef = useRef(true);
    // Track whether the user is at the bottom; only autoscroll when pinned.
    useEffect(() => {
        const el = scrollRef.current;
        if (el === null)
            return;
        const onScroll = () => { pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40; };
        el.addEventListener('scroll', onScroll);
        return () => el.removeEventListener('scroll', onScroll);
    }, []);
    useEffect(() => {
        const el = scrollRef.current;
        if (el !== null && pinnedRef.current)
            el.scrollTop = el.scrollHeight;
    }, [entries]);
    if (error !== undefined) {
        const ended = error.includes('404');
        return (_jsx("div", { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx("div", { style: { color: ended ? '#fa6' : '#f66', fontSize: '13px' }, children: ended ? 'Session ended' : `Console unavailable (${error})` }) }));
    }
    if (entries === undefined) {
        return (_jsx("div", { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx("div", { style: { color: '#aaa', fontSize: '13px' }, children: "Loading\u2026" }) }));
    }
    return (_jsxs("div", { ref: scrollRef, style: {
            flex: 1, overflowY: 'auto', padding: '8px 10px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '11px', lineHeight: 1.5,
        }, "data-testid": "liveview-console", children: [entries.length === 0 && _jsx("div", { style: { color: '#666' }, children: "No console output yet." }), entries.map((entry, index) => (_jsxs("div", { style: { display: 'flex', gap: '8px', alignItems: 'baseline' }, children: [_jsx("span", { style: { color: '#555', flexShrink: 0 }, children: new Date(entry.timestamp).toLocaleTimeString() }), _jsx("span", { style: {
                            color: colorOf(entry), flexShrink: 0, width: '34px', textAlign: 'right',
                            fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px',
                        }, children: badgeOf(entry) }), _jsx("span", { style: { color: colorOf(entry), wordBreak: 'break-word', whiteSpace: 'pre-wrap' }, children: entry.text })] }, `${entry.timestamp}-${index}`)))] }));
}
//# sourceMappingURL=console-view.js.map
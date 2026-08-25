import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { webResultSummaryOf } from './result.js';
import { grantScreenshotUrl } from './grant.js';
/**
 * Screenshot card: shows the actual captured PNG through the plugin's signed
 * screenshot route. The path never appears unsigned; the token is minted when
 * the card mounts and refreshed if the image fails (expired token on replay).
 */
export function WebScreenshotCard(props) {
    const summary = webResultSummaryOf(props.block);
    const [grant, setGrant] = useState();
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        if (summary?.path === undefined)
            return;
        let cancelled = false;
        setFailed(false);
        grantScreenshotUrl(summary.path)
            .then(url => { if (!cancelled)
            setGrant(url); })
            .catch(() => { if (!cancelled)
            setFailed(true); });
        return () => { cancelled = true; };
    }, [summary?.path]);
    return (_jsxs("div", { style: { padding: '8px', border: '1px solid #444', borderRadius: '6px' }, children: [_jsx("div", { style: { fontSize: '12px', opacity: 0.7 }, children: "\uD83D\uDCF8 Web Screenshot" }), summary?.path !== undefined && (_jsx("div", { style: { fontSize: '11px', opacity: 0.5, fontFamily: 'monospace', marginTop: '2px', wordBreak: 'break-all' }, children: summary.path })), grant !== undefined && !failed && (_jsx("img", { src: grant.url, alt: "Browser screenshot", style: { maxWidth: '100%', maxHeight: '320px', marginTop: '6px', borderRadius: '4px', display: 'block' } })), failed && _jsx("div", { style: { fontSize: '12px', color: '#f66', marginTop: '4px' }, children: "screenshot unavailable" })] }));
}
//# sourceMappingURL=card-screenshot.js.map
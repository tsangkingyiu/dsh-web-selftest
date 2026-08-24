import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { webResultSummaryOf, webResultTextOf } from './result.js';
export function WebScreenshotCard(props) {
    const summary = webResultSummaryOf(props.block);
    const text = webResultTextOf(props.block);
    return (_jsxs("div", { style: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontFamily: 'monospace' }, children: [_jsx("div", { children: "\uD83D\uDCF8 Web Screenshot" }), summary?.path && _jsx("div", { style: { fontSize: '12px', color: '#666' }, children: summary.path }), summary?.bytes !== undefined && _jsxs("div", { style: { fontSize: '12px', color: '#666' }, children: [summary.bytes, " bytes"] }), text && _jsx("pre", { style: { fontSize: '11px', marginTop: '4px', overflow: 'auto' }, children: text })] }));
}
//# sourceMappingURL=card-screenshot.js.map
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { webResultSummaryOf } from './result.js';
export function WebLaunchCard(props) {
    const summary = webResultSummaryOf(props.block);
    return (_jsxs("div", { style: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontFamily: 'monospace' }, children: [_jsx("div", { children: "\uD83C\uDF10 Web Session Launched" }), summary?.sessionId && _jsxs("div", { style: { fontSize: '12px', color: '#666' }, children: ["session: ", summary.sessionId] })] }));
}
//# sourceMappingURL=card-launch.js.map
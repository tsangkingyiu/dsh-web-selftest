function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function finiteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
function optionalString(value) {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
}
export function webResultSummaryOf(block) {
    if (!('kind' in block) || block.kind !== 'tool-result' || block.isError)
        return undefined;
    for (const item of block.content) {
        if (item.type !== 'text')
            continue;
        let value;
        try {
            value = JSON.parse(item.text);
        }
        catch {
            continue;
        }
        if (!isRecord(value))
            continue;
        const summary = {};
        const bytes = finiteNumber(value.bytes);
        const width = finiteNumber(value.width);
        const height = finiteNumber(value.height);
        const action = optionalString(value.action);
        const path = optionalString(value.path);
        const sessionId = optionalString(value.sessionId);
        if (bytes === undefined && width === undefined && height === undefined && action === undefined && path === undefined && sessionId === undefined)
            continue;
        if (bytes !== undefined)
            summary.bytes = bytes;
        if (width !== undefined)
            summary.width = width;
        if (height !== undefined)
            summary.height = height;
        if (action !== undefined)
            summary.action = action;
        if (path !== undefined)
            summary.path = path;
        if (sessionId !== undefined)
            summary.sessionId = sessionId;
        return summary;
    }
    return undefined;
}
export function webResultTextOf(block) {
    if (!('kind' in block))
        return null;
    const parts = [];
    for (const item of block.content) {
        parts.push(item.type === 'text' ? item.text : JSON.stringify(item, null, 2));
    }
    if (parts.length === 0 && block.error !== undefined) {
        parts.push(`${block.error.name}: ${block.error.code}`);
    }
    return parts.join('\n') || null;
}
//# sourceMappingURL=result.js.map
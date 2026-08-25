import { createRoot } from 'react-dom/client';
/**
 * Page-owned mount point for the live view overlay. The overlay cannot live
 * inside a tool card's React tree: cards unmount/remount as the conversation
 * scrolls and re-renders, which would kill the panel mid-session. A single
 * detached host element keeps exactly one overlay instance alive regardless of
 * card lifecycle.
 */
let hostEl;
let root;
export function renderOverlay(node) {
    if (hostEl === undefined) {
        hostEl = document.createElement('div');
        hostEl.id = 'dsh-web-selftest-overlay-host';
        document.body.appendChild(hostEl);
    }
    root ??= createRoot(hostEl);
    root.render(node);
}
/** Remove the overlay from the page entirely (used when closed with no session). */
export function clearOverlay() {
    if (root !== undefined && hostEl !== undefined) {
        root.render(null);
    }
}
//# sourceMappingURL=overlay-host.js.map
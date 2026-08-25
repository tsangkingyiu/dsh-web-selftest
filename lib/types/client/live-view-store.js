// Module-level live-view state: which session (if any) should show the overlay,
// and whether auto-launch is still permitted for each session. Cards talk to this
// store through plain functions; the single overlay instance re-renders on change.
import { renderOverlay, clearOverlay } from './overlay-host.js';
let current;
const listeners = new Set();
/** Sessions the user manually closed — never auto-launch these again. */
const dismissed = new Set();
export function subscribeLiveView(listener) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}
function emit() {
    for (const listener of listeners)
        listener();
}
export function currentLiveSession() {
    return current;
}
/** Open (or switch) the overlay. Manual ▶ clicks bypass the dismissal guard. */
export function openLiveView(sessionId) {
    dismissed.add(sessionId); // an explicit open counts as user intent too
    if (current === sessionId)
        return;
    current = sessionId;
    emit();
}
/**
 * Auto-launch request from a fresh web_launch card. Skipped when the user
 * already closed this session's view once.
 */
export function requestAutoLaunch(sessionId) {
    if (dismissed.has(sessionId))
        return;
    if (current === sessionId)
        return;
    current = sessionId;
    emit();
}
/** User-initiated close: remembers the choice so autos cannot reopen it. */
export function closeLiveView() {
    if (current === undefined)
        return;
    dismissed.add(current);
    current = undefined;
    emit();
    clearOverlay();
}
/** Paint whatever the current state says into the page-owned host element. */
export function paintLiveView(node) {
    if (current === undefined) {
        clearOverlay();
        return;
    }
    renderOverlay(node(current));
}
//# sourceMappingURL=live-view-store.js.map
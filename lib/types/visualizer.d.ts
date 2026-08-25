import type { Page } from 'playwright-core';
/**
 * Virtual cursor visualizer: a page-owned DOM overlay that makes the agent's
 * automated actions visible in screenshots and the CDP screencast. Headless
 * Chromium renders no real cursor, so actions otherwise appear as unmotivated
 * state changes; this layer animates an arrow to the target, ripples on click,
 * and outlines the focused input while typing.
 *
 * The installer is idempotent and self-healing: init scripts run per document,
 * but `setContent`-style document rewrites keep window globals while wiping DOM
 * nodes — so every call first verifies the ELEMENTS exist and reinstalls when
 * they do not.
 */
/** Runtime handle installed into each session at creation. */
export interface ActionVisualizer {
    /** Move the virtual cursor to a target element or point, easing over ~150ms. */
    move(target: VisualizerTarget, page: Page): Promise<void>;
    /** Ripple at the click point (element center or coordinates). */
    click(target: VisualizerTarget, page: Page): Promise<void>;
    /** Outline + label the input target for the duration of a fill. */
    typing(selector: string, page: Page): Promise<void>;
}
export interface VisualizerTarget {
    ref?: string | undefined;
    selector?: string | undefined;
    x?: number | undefined;
    y?: number | undefined;
}
/** Register the per-document installer on every future page of the context. */
export declare function attachActionVisualizer(context: import('playwright-core').BrowserContext): void;
export declare function makeVisualizer(): ActionVisualizer;
//# sourceMappingURL=visualizer.d.ts.map
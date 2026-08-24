import { jsx as _jsx } from "react/jsx-runtime";
import { useSyncExternalStore } from 'react';
import { WebScreenshotCard } from './card-screenshot.js';
import { WebLaunchCard } from './card-launch.js';
export const inject = ['slots', 'theme', 'locale'];
function subscribeThemeOf(ctx) {
    return notify => ctx.on('theme/change', notify);
}
function getColorSchemeOf(ctx) {
    return () => ctx.theme.getTheme().active.colorScheme;
}
function subscribeLocaleOf(ctx) {
    return notify => ctx.on('locale/change', notify);
}
function getLocaleOf(ctx) {
    return () => ctx.locale.getLocale().active;
}
function hostSyncedCard(ctx, Card) {
    const subscribeTheme = subscribeThemeOf(ctx);
    const getColorScheme = getColorSchemeOf(ctx);
    const subscribeLocale = subscribeLocaleOf(ctx);
    const getLocale = getLocaleOf(ctx);
    const HostSyncedCard = (props) => {
        const colorScheme = useSyncExternalStore(subscribeTheme, getColorScheme, getColorScheme);
        const locale = useSyncExternalStore(subscribeLocale, getLocale, getLocale);
        return _jsx(Card, { ...props, colorScheme: colorScheme, locale: locale });
    };
    return HostSyncedCard;
}
function registerCard(ctx, toolName, Card) {
    ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({ name: 'tool.call.toolview', key: toolName }, hostSyncedCard(ctx, Card)));
}
export function apply(ctx) {
    const themedCtx = ctx;
    registerCard(themedCtx, 'web_launch', WebLaunchCard);
    registerCard(themedCtx, 'web_screenshot', WebScreenshotCard);
    registerCard(themedCtx, 'web_interact', WebScreenshotCard);
}
//# sourceMappingURL=index.js.map
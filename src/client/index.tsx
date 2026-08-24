import { useSyncExternalStore } from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { WebScreenshotCard } from './card-screenshot.js'
import { WebLaunchCard } from './card-launch.js'

export const inject = ['slots', 'theme', 'locale']

type ThemedContext = ClientContext & {
  theme: { getTheme(): { active: { colorScheme: 'light' | 'dark' } } }
  locale: { getLocale(): { active: string } }
}

function subscribeThemeOf(ctx: ThemedContext): (notify: () => void) => (() => boolean) {
  return notify => ctx.on('theme/change' as any, notify) as unknown as () => boolean
}

function getColorSchemeOf(ctx: ThemedContext): () => 'light' | 'dark' {
  return () => ctx.theme.getTheme().active.colorScheme
}

function subscribeLocaleOf(ctx: ThemedContext): (notify: () => void) => (() => boolean) {
  return notify => ctx.on('locale/change' as any, notify) as unknown as () => boolean
}

function getLocaleOf(ctx: ThemedContext): () => string {
  return () => ctx.locale.getLocale().active
}

function hostSyncedCard(
  ctx: ThemedContext,
  Card: (props: ToolCallViewProps) => React.JSX.Element,
): (props: ToolCallViewProps) => React.JSX.Element {
  const subscribeTheme = subscribeThemeOf(ctx)
  const getColorScheme = getColorSchemeOf(ctx)
  const subscribeLocale = subscribeLocaleOf(ctx)
  const getLocale = getLocaleOf(ctx)

  const HostSyncedCard = (props: ToolCallViewProps): React.JSX.Element => {
    const colorScheme = useSyncExternalStore(subscribeTheme, getColorScheme, getColorScheme)
    const locale = useSyncExternalStore(subscribeLocale, getLocale, getLocale)
    return <Card {...props} colorScheme={colorScheme} locale={locale} />
  }
  return HostSyncedCard
}

function registerCard(
  ctx: ThemedContext,
  toolName: string,
  Card: (props: ToolCallViewProps) => React.JSX.Element,
): void {
  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register(
    { name: 'tool.call.toolview', key: toolName },
    hostSyncedCard(ctx, Card),
  ))
}

export function apply(ctx: ClientContext): void {
  const themedCtx = ctx as ThemedContext
  registerCard(themedCtx, 'web_launch', WebLaunchCard)
  registerCard(themedCtx, 'web_screenshot', WebScreenshotCard)
  registerCard(themedCtx, 'web_interact', WebScreenshotCard)
}

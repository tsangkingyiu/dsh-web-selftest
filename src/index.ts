import type { Context } from '@deepseek-ai/cordis'
import type ToolRegistry from '@deepseek-ai/dsh-tools'
import { WebHostController } from './web-host.js'
import { createWebTools, WEB_TOOL_NAMES } from './tools.js'
import { registerWebSkill } from './skill.js'

export const name = 'dsh-web-selftest'
export const inject = ['tools']

type HostContext = Context & {
  tools: ToolRegistry
}

export function apply(ctx: Context): () => Promise<void> {
  const hostCtx = ctx as HostContext
  const host = new WebHostController()
  const tools = createWebTools(host)

  const disposers: Array<() => void | Promise<void>> = []
  disposers.push(registerWebSkill(ctx))

  for (const tool of Object.values(tools)) {
    disposers.push(ctx.effect(() => hostCtx.tools.register(tool), `dsh-web-selftest:${tool.name}`))
  }

  ctx.logger.info(`dsh-web-selftest mounted (${WEB_TOOL_NAMES.join(' + ')})`)

  return async () => {
    for (const dispose of disposers.reverse()) await dispose()
    await host.dispose()
  }
}

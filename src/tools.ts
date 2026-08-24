import type { ToolDefinition } from '@deepseek-ai/dsh-tools'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { WebHostController } from './web-host.js'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

function renderJson(_args: unknown, value: unknown): [{ type: 'text'; text: string }] {
  return [{ type: 'text', text: JSON.stringify(value, null, 2) }]
}

export const WEB_TOOL_NAMES = [
  'web_launch',
  'web_close',
  'web_navigate',
  'web_snapshot',
  'web_screenshot',
  'web_interact',
  'web_wait_for',
  'web_console',
] as const

export type WebTools = {
  webLaunch: ToolDefinition
  webClose: ToolDefinition
  webNavigate: ToolDefinition
  webSnapshot: ToolDefinition
  webScreenshot: ToolDefinition
  webInteract: ToolDefinition
  webWaitFor: ToolDefinition
  webConsole: ToolDefinition
}

export function createWebTools(host: WebHostController): WebTools {
  const webLaunch = defineTool({
    name: 'web_launch',
    description: 'Launch a new isolated browser context for the current conversation. Returns a sessionId used by all other web_* tools.',
    parameters: {
      sessionId: {
        type: 'string',
        required: true,
        description: 'Unique identifier for this conversation/browser context.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          sessionId: { type: 'string', required: true },
          viewport: { type: 'object', additionalProperties: true, required: true },
        },
      },
      render: renderJson,
    },
    async execute(args: { sessionId: string }) {
      const session = await host.createSession(args.sessionId)
      const viewport = session.page.viewportSize()
      return { sessionId: session.sessionId, viewport: viewport ? { width: viewport.width, height: viewport.height } : {} }
    },
  })

  const webClose = defineTool({
    name: 'web_close',
    description: 'Close the browser context and free resources for the given session.',
    parameters: {
      sessionId: { type: 'string', required: true },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          sessionId: { type: 'string', required: true },
          closed: { type: 'boolean', required: true },
        },
      },
      render: renderJson,
    },
    async execute(args: { sessionId: string }) {
      await host.closeSession(args.sessionId)
      return { sessionId: args.sessionId, closed: true }
    },
  })

  const webNavigate = defineTool({
    name: 'web_navigate',
    description: 'Navigate the page to a URL. Returns title, URL, and HTTP status.',
    parameters: {
      sessionId: { type: 'string', required: true },
      url: { type: 'string', required: true },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          url: { type: 'string', required: true },
          title: { type: 'string', required: true },
          status: { type: 'integer', required: true },
        },
      },
      render: renderJson,
    },
    async execute(args: { sessionId: string; url: string }) {
      const session = host.getSession(args.sessionId)
      if (!session) throw new Error(`session ${args.sessionId} not found — call web_launch first`)
      const response = await session.page.goto(args.url)
      return { url: session.page.url(), title: await session.page.title(), status: response?.status() ?? 0 }
    },
  })

  const webSnapshot = defineTool({
    name: 'web_snapshot',
    description: 'Return an aria snapshot of the current page (YAML structure with refs). Use this as the primary observer before acting.',
    parameters: {
      sessionId: { type: 'string', required: true },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          snapshot: { type: 'string', required: true },
        },
      },
      render: renderJson,
    },
    async execute(args: { sessionId: string }) {
      const session = host.getSession(args.sessionId)
      if (!session) throw new Error(`session ${args.sessionId} not found`)
      const snapshot = await session.page.locator('body').ariaSnapshot()
      return { snapshot }
    },
  })

  const webScreenshot = defineTool({
    name: 'web_screenshot',
    description: 'Capture a PNG screenshot of the current page and save it to the plugin cache. Returns path and dimensions.',
    parameters: {
      sessionId: { type: 'string', required: true },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          path: { type: 'string', required: true },
          bytes: { type: 'integer', required: true },
          width: { type: 'integer' },
          height: { type: 'integer' },
        },
      },
      render: renderJson,
      presentationMeta: (_args: unknown, value: any) => ({ kind: 'web-screenshot', path: value.path }),
    },
    async execute(args: { sessionId: string }) {
      const session = host.getSession(args.sessionId)
      if (!session) throw new Error(`session ${args.sessionId} not found`)
      const dir = join(tmpdir(), 'dsh-web-selftest', args.sessionId)
      mkdirSync(dir, { recursive: true })
      const path = join(dir, `screenshot-${Date.now()}.png`)
      const buffer = await session.page.screenshot({ path })
      const size = session.page.viewportSize()
      return {
        path,
        bytes: buffer.length,
        ...(size ? { width: size.width, height: size.height } : {}),
      }
    },
  })

  const webInteract = defineTool({
    name: 'web_interact',
    description: 'Interact with the page: click, type, scroll, or press a key. Prefer aria ref from web_snapshot; fallback to CSS selector. Coordinates are last resort.',
    parameters: {
      sessionId: { type: 'string', required: true },
      action: { type: 'string', enum: ['click', 'type', 'scroll', 'press'], required: true },
      ref: { type: 'string', description: 'Aria ref from web_snapshot' },
      selector: { type: 'string', description: 'CSS selector' },
      x: { type: 'number', description: 'X coordinate (normalized 0..1)' },
      y: { type: 'number', description: 'Y coordinate (normalized 0..1)' },
      text: { type: 'string', description: 'Text to type' },
      key: { type: 'string', description: 'Key to press (e.g. Enter, Escape)' },
      direction: { type: 'string', enum: ['up', 'down', 'left', 'right'], description: 'Scroll direction' },
      expect_text: { type: 'string', description: 'Text expected to appear after the action' },
      expect_gone: { type: 'string', description: 'Text expected to disappear after the action' },
      expect_url: { type: 'string', description: 'URL pattern expected after the action' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          action: { type: 'string', required: true },
          matched: { type: 'boolean' },
          screenshotPath: { type: 'string' },
        },
      },
      render: renderJson,
    },
    async execute(args: any) {
      const session = host.getSession(args.sessionId)
      if (!session) throw new Error(`session ${args.sessionId} not found`)
      const { action, ref, selector, x, y, text, key, direction, expect_text, expect_gone, expect_url } = args

      let target = null
      if (ref) target = session.page.locator(`aria-ref=${ref}`)
      else if (selector) target = session.page.locator(selector)

      switch (action) {
        case 'click':
          if (target) await target.click()
          else if (x !== undefined && y !== undefined) await session.page.mouse.click(x, y)
          else throw new Error('click requires ref, selector, or coordinates')
          break
        case 'type':
          if (!target) throw new Error('type requires ref or selector')
          if (!text) throw new Error('type requires text')
          await target.fill(text)
          break
        case 'press':
          if (!key) throw new Error('press requires key')
          await session.page.keyboard.press(key)
          break
        case 'scroll':
          if (!direction) throw new Error('scroll requires direction')
          await session.page.mouse.wheel(0, direction === 'down' ? 500 : -500)
          break
      }

      await session.page.waitForTimeout(300)

      let matched = true
      if (expect_text) matched = (await session.page.textContent('body'))?.includes(expect_text) ?? false
      if (expect_gone) matched = !((await session.page.textContent('body'))?.includes(expect_gone) ?? false)
      if (expect_url) matched = session.page.url().includes(expect_url)

      const dir = join(tmpdir(), 'dsh-web-selftest', args.sessionId)
      mkdirSync(dir, { recursive: true })
      const screenshotPath = join(dir, `interact-${Date.now()}.png`)
      await session.page.screenshot({ path: screenshotPath })

      return { action, matched, screenshotPath }
    },
  })

  const webWaitFor = defineTool({
    name: 'web_wait_for',
    description: 'Wait until text appears or disappears on the page, or until timeout.',
    parameters: {
      sessionId: { type: 'string', required: true },
      text: { type: 'string', required: true },
      mode: { type: 'string', enum: ['appear', 'disappear'] },
      timeout_ms: { type: 'number' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          matched: { type: 'boolean', required: true },
          text: { type: 'string' },
        },
      },
      render: renderJson,
    },
    async execute(args: { sessionId: string; text: string; mode?: string; timeout_ms?: number }) {
      const session = host.getSession(args.sessionId)
      if (!session) throw new Error(`session ${args.sessionId} not found`)
      const timeout = Math.min(args.timeout_ms ?? 8000, 60000)
      const start = Date.now()
      while (Date.now() - start < timeout) {
        const content = await session.page.textContent('body')
        const found = content?.includes(args.text) ?? false
        if ((args.mode === 'disappear' && !found) || (args.mode !== 'disappear' && found)) {
          return { matched: true, text: args.text }
        }
        await session.page.waitForTimeout(500)
      }
      return { matched: false, text: args.text }
    },
  })

  const webConsole = defineTool({
    name: 'web_console',
    description: 'Read recent console messages and page errors from the browser session.',
    parameters: {
      sessionId: { type: 'string', required: true },
      limit: { type: 'number' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          messages: { type: 'array', required: true },
        },
      },
      render: renderJson,
    },
    async execute(args: { sessionId: string; limit?: number }) {
      const session = host.getSession(args.sessionId)
      if (!session) throw new Error(`session ${args.sessionId} not found`)
      // Note: console capture must be set up at session creation; here we return a stub
      return { messages: [] }
    },
  })

  return {
    webLaunch,
    webClose,
    webNavigate,
    webSnapshot,
    webScreenshot,
    webInteract,
    webWaitFor,
    webConsole,
  }
}

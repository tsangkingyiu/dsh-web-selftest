import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import { WebHostController } from '../dist/web-host.js'
import { createWebTools, WEB_TOOL_NAMES } from '../dist/tools.js'

describe('dsh-web-selftest tools', () => {
  let host
  let tools
  const sessionId = 'test-session'

  before(async () => {
    host = new WebHostController()
    tools = createWebTools(host)
  })

  after(async () => {
    await host.dispose()
  })

  it('exports all expected tools', () => {
    assert.deepStrictEqual(Object.keys(tools).length, WEB_TOOL_NAMES.length)
    for (const name of WEB_TOOL_NAMES) {
      assert.ok(Object.values(tools).some(t => t.name === name), `missing tool ${name}`)
    }
  })

  it('web_launch creates a session', async () => {
    const result = await tools.webLaunch.execute({ sessionId }, { signal: AbortSignal.timeout(30_000) })
    assert.strictEqual(result.sessionId, sessionId)
    assert.ok(result.viewport.width > 0)
  })

  it('web_navigate returns title and status', async () => {
    const result = await tools.webNavigate.execute(
      { sessionId, url: 'data:text/html,<title>Hello</title><p>world</p>' },
      { signal: AbortSignal.timeout(30_000) },
    )
    assert.strictEqual(result.title, 'Hello')
    assert.strictEqual(result.status, 0) // data: URLs have no HTTP response status
  })

  it('web_snapshot returns aria snapshot', async () => {
    const result = await tools.webSnapshot.execute({ sessionId }, { signal: AbortSignal.timeout(30_000) })
    assert.ok(typeof result.snapshot === 'string')
    assert.ok(result.snapshot.includes('world'))
  })

  it('web_screenshot returns path and bytes', async () => {
    const result = await tools.webScreenshot.execute({ sessionId }, { signal: AbortSignal.timeout(30_000) })
    assert.ok(result.path.endsWith('.png'))
    assert.ok(result.bytes > 0)
  })

  it('web_interact with expect_text verifies content', async () => {
    const result = await tools.webInteract.execute(
      { sessionId, action: 'press', key: 'Enter', expect_text: 'world' },
      { signal: AbortSignal.timeout(30_000) },
    )
    assert.strictEqual(result.matched, true)
  })

  it('web_wait_for finds text', async () => {
    const result = await tools.webWaitFor.execute(
      { sessionId, text: 'world', mode: 'appear', timeout_ms: 2000 },
      { signal: AbortSignal.timeout(30_000) },
    )
    assert.strictEqual(result.matched, true)
  })

  it('web_close closes the session', async () => {
    const result = await tools.webClose.execute({ sessionId }, { signal: AbortSignal.timeout(30_000) })
    assert.strictEqual(result.closed, true)
  })
})

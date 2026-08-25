import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Duplex } from 'node:stream'
import type { WebHostController, WebSession } from './web-host.js'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { readFile, writeFile, mkdir, lstat } from 'node:fs/promises'
import { join, isAbsolute, resolve } from 'node:path'
import { tmpdir, homedir } from 'node:os'

const KEY_BYTES = 32
const TOKEN_TTL_MS = 10 * 60 * 1000 // 10 minutes

export function dshHome(): string {
  const env = process.env.DSH_HOME
  return env === undefined || env.length === 0 ? join(homedir(), '.dsh') : resolve(env)
}

export function stateRoot(): string {
  return join(dshHome(), 'cache', 'dsh-web-selftest')
}

export function screenshotDir(sessionId: string): string {
  return join(tmpdir(), 'dsh-web-selftest', sessionId)
}

async function readKeyFile(path: string): Promise<Buffer> {
  const info = await lstat(path)
  if (info.isSymbolicLink() || !info.isFile()) throw new Error('dsh-web-selftest stream access key is not a regular file')
  const key = await readFile(path)
  if (key.length !== KEY_BYTES) throw new Error('dsh-web-selftest stream access key has an invalid length')
  return key
}

export async function prepareStreamAccessKey(): Promise<Buffer> {
  await mkdir(stateRoot(), { recursive: true, mode: 0o700 })
  const path = join(stateRoot(), 'stream-access.key')
  try {
    return await readKeyFile(path)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  const candidate = randomBytes(KEY_BYTES)
  try {
    await writeFile(path, candidate, { flag: 'wx', mode: 0o600 })
    return candidate
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    return readKeyFile(path)
  }
}

export class StreamAccessController {
  #keyPromise: Promise<Buffer> | undefined

  constructor(private readonly resolveKey: () => Promise<Buffer> = prepareStreamAccessKey) {}

  async #key(): Promise<Buffer> {
    this.#keyPromise ??= this.resolveKey()
    return this.#keyPromise
  }

  async #sign(payload: Record<string, unknown>): Promise<{ token: string; expiresAt: number }> {
    const key = await this.#key()
    const exp = Date.now() + TOKEN_TTL_MS
    const body = JSON.stringify({ ...payload, exp })
    const mac = createHmac('sha256', key).update(body).digest()
    const token = `${Buffer.from(body).toString('base64url')}.${mac.toString('base64url')}`
    return { token, expiresAt: exp }
  }

  async #verify(token: string): Promise<Record<string, unknown> | undefined> {
    const [bodyB64, macB64] = token.split('.')
    if (!bodyB64 || !macB64) return undefined
    const key = await this.#key()
    const body = Buffer.from(bodyB64, 'base64url').toString()
    const expected = createHmac('sha256', key).update(body).digest()
    const actual = Buffer.from(macB64, 'base64url')
    if (!timingSafeEqual(expected, actual)) return undefined
    const payload = JSON.parse(body)
    if (payload.exp < Date.now()) return undefined
    return payload
  }

  async signStreamToken(sessionId: string): Promise<{ token: string; expiresAt: number }> {
    return this.#sign({ v: 1, kind: 'web-stream', sessionId })
  }

  async signScreenshotToken(path: string): Promise<{ token: string; expiresAt: number }> {
    if (!isAbsolute(path)) throw new TypeError('dsh-web-selftest: signScreenshotToken requires an absolute path')
    return this.#sign({ v: 1, kind: 'web-screenshot', path })
  }

  async verifyStreamToken(token: string): Promise<{ sessionId: string } | undefined> {
    const payload = await this.#verify(token)
    if (payload?.kind !== 'web-stream' || typeof payload.sessionId !== 'string') return undefined
    return { sessionId: payload.sessionId }
  }

  async verifyScreenshotToken(token: string): Promise<{ path: string } | undefined> {
    const payload = await this.#verify(token)
    if (payload?.kind !== 'web-screenshot' || typeof payload.path !== 'string') return undefined
    return { path: payload.path }
  }
}

export function isLoopbackRemoteAddress(address: string | undefined): boolean {
  if (address === undefined) return false
  const normalized = address.toLowerCase().split('%', 1)[0]!
  if (normalized === '::1' || isIpv4LoopbackAddress(normalized)) return true
  if (!normalized.startsWith('::ffff:')) return false
  const mapped = normalized.slice('::ffff:'.length)
  if (isIpv4LoopbackAddress(mapped)) return true
  const hexadecimal = /^([a-f0-9]{1,4}):([a-f0-9]{1,4})$/.exec(mapped)
  return hexadecimal !== null && (Number.parseInt(hexadecimal[1]!, 16) >>> 8) === 127
}

function isIpv4LoopbackAddress(ip: string): boolean {
  const parts = ip.split('.')
  if (parts.length !== 4) return false
  return parts[0] === '127'
}

function requestAuthority(req: IncomingMessage): URL | undefined {
  const host = req.headers.host
  if (typeof host !== 'string') return undefined
  try {
    const parsed = new URL(`http://${host}`)
    return parsed
  } catch {
    return undefined
  }
}

/**
 * Host authorities whose browsers may reach the visual routes. Loopback covers
 * direct local access; the deployment's Caddy vhost terminates TLS for the same
 * host machine and proxies to the loopback-bound web server, so its origin is
 * the operator's own. Any other Host (DNS-rebinding, foreign vhost) fails.
 */
const TRUSTED_AUTHORITIES = new Set(['127.0.0.1', 'localhost', '[::1]', '::1', 'harness.kirby727.com'])

function isTrustedRequest(req: IncomingMessage, requireOrigin: boolean): boolean {
  // Defense in depth: the web server binds loopback, so every legitimate peer
  // arrives from the local machine (directly or through the Caddy proxy).
  if (!isLoopbackRemoteAddress(req.socket?.remoteAddress)) return false
  const authority = requestAuthority(req)
  if (authority === undefined || !TRUSTED_AUTHORITIES.has(authority.hostname)) return false
  if (req.headers['sec-fetch-site'] === 'cross-site') return false
  if (requireOrigin) {
    const origin = req.headers.origin
    if (typeof origin !== 'string') return false
    return origin === authority.origin
  }
  return true
}

export function installStreamRoutes(ctx: any, host: WebHostController): void {
  const access = new StreamAccessController()

  ctx.inject(['webServer'], (webCtx: any) => {
    const disposers: Array<() => void> = []

    // Screenshot route: serves a cached PNG by signed token
    disposers.push(webCtx.webServer.register({
      kind: 'prefix',
      path: '/_dsh/dsh-web-selftest/screenshot',
      handler: async (req: IncomingMessage, res: ServerResponse) => {
        if (!isTrustedRequest(req, false)) {
          res.writeHead(403).end('forbidden')
          return
        }
        const token = req.url?.split('/').pop()
        if (!token) {
          res.writeHead(400).end('missing token')
          return
        }
        const payload = await access.verifyScreenshotToken(token)
        if (!payload) {
          res.writeHead(403).end('invalid token')
          return
        }
        // Containment: only serve files inside the plugin cache directory
        const realPath = resolve(payload.path)
        const allowedRoot = resolve(tmpdir(), 'dsh-web-selftest')
        if (!realPath.startsWith(allowedRoot)) {
          res.writeHead(403).end('path outside cache')
          return
        }
        try {
          const data = await readFile(realPath)
          res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'no-store' })
          res.end(data)
        } catch {
          res.writeHead(404).end('not found')
        }
      },
    }))

    // Screenshot-grant route: mints a signed URL for one captured file
    disposers.push(webCtx.webServer.register({
      kind: 'exact',
      path: '/_dsh/dsh-web-selftest/grant-screenshot',
      handler: async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST' || !isTrustedRequest(req, true)) {
          res.writeHead(403).end('forbidden')
          return
        }
        let body = ''
        for await (const chunk of req) body += chunk
        let parsed: { path?: unknown }
        try {
          parsed = JSON.parse(body)
        } catch {
          res.writeHead(400).end('invalid json')
          return
        }
        if (typeof parsed.path !== 'string' || !parsed.path.startsWith('/')) {
          res.writeHead(400).end('missing path')
          return
        }
        // Containment decided at grant time too: never mint tokens for paths
        // outside the plugin cache directory.
        const realPath = resolve(parsed.path)
        const allowedRoot = resolve(tmpdir(), 'dsh-web-selftest')
        if (!realPath.startsWith(allowedRoot)) {
          res.writeHead(403).end('path outside cache')
          return
        }
        const { token, expiresAt } = await access.signScreenshotToken(realPath)
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ token, expiresAt }))
      },
    }))

    // Grant route: mints a stream token for an existing session
    disposers.push(webCtx.webServer.register({
      kind: 'exact',
      path: '/_dsh/dsh-web-selftest/grant',
      handler: async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST' || !isTrustedRequest(req, true)) {
          res.writeHead(403).end('forbidden')
          return
        }
        let body = ''
        for await (const chunk of req) body += chunk
        const { sessionId } = JSON.parse(body)
        const session = host.getSession(sessionId)
        if (!session) {
          res.writeHead(404).end('session not found')
          return
        }
        const { token, expiresAt } = await access.signStreamToken(sessionId)
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ token, expiresAt, streamUrl: `/_dsh/dsh-web-selftest/stream/${token}` }))
      },
    }))

    // Stream route: MJPEG proxy of the CDP screencast
    disposers.push(webCtx.webServer.register({
      kind: 'prefix',
      path: '/_dsh/dsh-web-selftest/stream',
      handler: async (req: IncomingMessage, res: ServerResponse) => {
        if (!isTrustedRequest(req, false)) {
          res.writeHead(403).end('forbidden')
          return
        }
        const token = req.url?.split('/').pop()
        if (!token) {
          res.writeHead(400).end('missing token')
          return
        }
        const payload = await access.verifyStreamToken(token)
        if (!payload) {
          res.writeHead(403).end('invalid token')
          return
        }
        const session = host.getSession(payload.sessionId)
        if (!session) {
          res.writeHead(404).end('session not found')
          return
        }

        res.writeHead(200, {
          'content-type': 'multipart/x-mixed-replace; boundary=frame',
          'cache-control': 'no-store',
          'connection': 'close',
        })

        const client = await session.context.newCDPSession(session.page)
        await client.send('Page.enable')
        await client.send('Page.startScreencast', { format: 'jpeg', quality: 60, everyNthFrame: 1 })

        const onFrame = async (event: any) => {
          try {
            res.write(`--frame\r\ncontent-type: image/jpeg\r\n\r\n`)
            res.write(Buffer.from(event.data, 'base64'))
            res.write('\r\n')
            await client.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {})
          } catch {
            // client disconnected
          }
        }
        client.on('Page.screencastFrame', onFrame)

        req.on('close', async () => {
          client.off('Page.screencastFrame', onFrame)
          await client.send('Page.stopScreencast').catch(() => {})
          await client.detach().catch(() => {})
        })
      },
    }))

    // Status route: read-only session status
    disposers.push(webCtx.webServer.register({
      kind: 'exact',
      path: '/_dsh/dsh-web-selftest/status',
      handler: async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST' || !isTrustedRequest(req, true)) {
          res.writeHead(403).end('forbidden')
          return
        }
        let body = ''
        for await (const chunk of req) body += chunk
        const { sessionId } = JSON.parse(body)
        const session = host.getSession(sessionId)
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ running: !!session, sessionId }))
      },
    }))

    return () => {
      for (const dispose of disposers) dispose()
    }
  })
}

// Signed-URL helpers: every visual asset (screenshot PNG, MJPEG stream) is served
// by the plugin's host routes behind HMAC tokens. The browser mints a short-lived
// token per display through /grant-style POSTs, so no path ever appears unsigned.

export interface ScreenshotGrant {
  url: string
  expiresAt: number
}

/** One console entry as returned by the plugin's console route. */
export interface ConsoleEntry {
  kind: 'console' | 'pageerror'
  type?: string
  text: string
  timestamp: number
}

interface GrantBody {
  token?: unknown
  expiresAt?: unknown
  streamUrl?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Mint a signed screenshot URL for one captured file. The host route verifies
 * the HMAC and confines the path to the plugin cache directory before serving.
 */
export async function grantScreenshotUrl(path: string): Promise<ScreenshotGrant> {
  const res = await fetch('/_dsh/dsh-web-selftest/grant-screenshot', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path }),
  })
  if (!res.ok) throw new Error(`grant failed (${res.status})`)
  const body: unknown = await res.json()
  if (!isRecord(body) || typeof body.token !== 'string' || typeof body.expiresAt !== 'number') {
    throw new Error('malformed grant answer')
  }
  return { url: `/_dsh/dsh-web-selftest/screenshot/${body.token}`, expiresAt: body.expiresAt }
}

/** Mint a signed MJPEG stream URL for a running browser session. */
export async function grantStreamUrl(sessionId: string): Promise<ScreenshotGrant> {
  const res = await fetch('/_dsh/dsh-web-selftest/grant', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  })
  if (!res.ok) throw new Error(`grant failed (${res.status})`)
  const body: unknown = await res.json()
  if (!isRecord(body) || typeof body.streamUrl !== 'string' || typeof body.expiresAt !== 'number') {
    throw new Error('malformed grant answer')
  }
  return { url: body.streamUrl, expiresAt: body.expiresAt }
}

/** Fetch the session's console log + page errors from the plugin's console route. */
export async function fetchConsoleEntries(sessionId: string): Promise<{ entries: ConsoleEntry[] }> {
  const res = await fetch('/_dsh/dsh-web-selftest/console', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  })
  if (res.status === 404) throw new Error('session not found (404)')
  if (!res.ok) throw new Error(`console fetch failed (${res.status})`)
  const body: unknown = await res.json()
  if (!isRecord(body) || !Array.isArray(body.entries)) throw new Error('malformed console answer')
  return { entries: body.entries as ConsoleEntry[] }
}

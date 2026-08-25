import { useEffect, useRef } from 'react'
import type { ConsoleEntry } from './grant.js'

/**
 * Console log renderer: monospaced, color-coded by severity, auto-scrolls to
 * the newest entry unless the user scrolled up to read history.
 */

const TYPE_COLORS: Record<string, string> = {
  error: '#f66',
  warning: '#fa6',
  info: '#6cf',
  pageerror: '#f66',
  assert: '#f6f',
}

const TYPE_BADGES: Record<string, string> = {
  log: 'log',
  error: 'err',
  warning: 'warn',
  info: 'info',
  debug: 'dbg',
  pageerror: 'EXC',
}

function badgeOf(entry: ConsoleEntry): string {
  const key = entry.kind === 'pageerror' ? 'pageerror' : entry.type ?? 'log'
  return TYPE_BADGES[key] ?? key
}

function colorOf(entry: ConsoleEntry): string {
  const key = entry.kind === 'pageerror' ? 'pageerror' : entry.type ?? 'log'
  return TYPE_COLORS[key] ?? '#ccc'
}

export function ConsoleView({ entries, error }: { entries: ConsoleEntry[] | undefined; error?: string | undefined }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef(true)

  // Track whether the user is at the bottom; only autoscroll when pinned.
  useEffect(() => {
    const el = scrollRef.current
    if (el === null) return
    const onScroll = () => { pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40 }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (el !== null && pinnedRef.current) el.scrollTop = el.scrollHeight
  }, [entries])

  if (error !== undefined) {
    const ended = error.includes('404')
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: ended ? '#fa6' : '#f66', fontSize: '13px' }}>
          {ended ? 'Session ended' : `Console unavailable (${error})`}
        </div>
      </div>
    )
  }

  if (entries === undefined) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#aaa', fontSize: '13px' }}>Loading…</div>
      </div>
    )
  }

  return (
    <div ref={scrollRef} style={{
      flex: 1, overflowY: 'auto', padding: '8px 10px',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '11px', lineHeight: 1.5,
    }} data-testid="liveview-console">
      {entries.length === 0 && <div style={{ color: '#666' }}>No console output yet.</div>}
      {entries.map((entry, index) => (
        <div key={`${entry.timestamp}-${index}`} style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
          <span style={{ color: '#555', flexShrink: 0 }}>{new Date(entry.timestamp).toLocaleTimeString()}</span>
          <span style={{
            color: colorOf(entry), flexShrink: 0, width: '34px', textAlign: 'right',
            fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>{badgeOf(entry)}</span>
          <span style={{ color: colorOf(entry), wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{entry.text}</span>
        </div>
      ))}
    </div>
  )
}

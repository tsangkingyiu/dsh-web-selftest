import { useCallback, useEffect, useRef, useState } from 'react'
import { grantStreamUrl, fetchConsoleEntries, type ConsoleEntry } from './grant.js'
import { ConsoleView } from './console-view.js'

export interface WebPanelProps {
  sessionId: string
  onClose: () => void
}

type PanelTab = 'stream' | 'console'

const PANEL_MIN_WIDTH = 320
const PANEL_MAX_WIDTH = 1200

/**
 * Live view overlay: MJPEG stream of the session's page plus a console log
 * viewer, switched by tabs. The left edge is a drag handle for resizing; the
 * chosen width persists across open/close within the page lifetime.
 */

let persistedWidth = 520

export function WebPanel({ sessionId, onClose }: WebPanelProps) {
  const [width, setWidth] = useState(persistedWidth)
  const [tab, setTab] = useState<PanelTab>('stream')
  const dragStateRef = useRef<{ startX: number; startWidth: number } | undefined>(undefined)

  // Resize via pointer events on the left-edge handle. Listeners live on window
  // so dragging past the element never loses the gesture.
  const onPointerDown = useCallback((event: React.PointerEvent) => {
    event.preventDefault()
    dragStateRef.current = { startX: event.clientX, startWidth: width }
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [width])

  const onPointerMove = useCallback((event: React.PointerEvent) => {
    const state = dragStateRef.current
    if (state === undefined) return
    const next = Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, state.startWidth + (state.startX - event.clientX)))
    setWidth(next)
  }, [])

  const onPointerUp = useCallback(() => {
    if (dragStateRef.current === undefined) return
    dragStateRef.current = undefined
    setWidth(current => { persistedWidth = current; return current })
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, width: `${width}px`, height: '100vh',
      background: '#141414', borderLeft: '1px solid #333', zIndex: 2147483000,
      display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 24px rgba(0,0,0,0.5)',
    }}>
      {/* Resize handle: invisible strip on the left edge */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          position: 'absolute', left: '-4px', top: 0, width: '8px', height: '100%',
          cursor: 'col-resize', touchAction: 'none',
        }}
        aria-label="Resize live view"
        data-testid="liveview-resize-handle"
      />
      <div style={{ padding: '6px 12px', display: 'flex', gap: '10px', alignItems: 'center', color: '#ddd', borderBottom: '1px solid #333' }}>
        <span style={{ fontSize: '13px' }}>● Live · {sessionId}</span>
        <TabButton active={tab === 'stream'} onClick={() => setTab('stream')}>Stream</TabButton>
        <TabButton active={tab === 'console'} onClick={() => setTab('console')}>Console</TabButton>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#999', fontSize: '16px', cursor: 'pointer', marginLeft: 'auto' }} aria-label="Close live view">✕</button>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {tab === 'stream' && <StreamPane sessionId={sessionId} />}
        {tab === 'console' && <ConsolePane sessionId={sessionId} />}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: '11px', padding: '3px 12px', cursor: 'pointer',
        background: active ? '#2a2a2a' : 'transparent',
        color: active ? '#fff' : '#999',
        border: '1px solid #444', borderRadius: '4px',
      }}
    >
      {children}
    </button>
  )
}

function StreamPane({ sessionId }: { sessionId: string }) {
  const [status, setStatus] = useState<'connecting' | 'live' | 'ended' | 'error'>('connecting')
  const [grant, setGrant] = useState<{ url: string; expiresAt: number } | undefined>()
  const generationRef = useRef(0)

  useEffect(() => {
    const generation = ++generationRef.current
    let timer: ReturnType<typeof setTimeout> | undefined
    let cancelled = false

    async function connect() {
      if (cancelled || generationRef.current !== generation) return
      try {
        const next = await grantStreamUrl(sessionId)
        if (cancelled || generationRef.current !== generation) return
        setGrant(next)
        setStatus('live')
        const ttl = Math.max(30_000, next.expiresAt - Date.now())
        timer = setTimeout(() => { void connect() }, Math.max(30_000, ttl - 90_000))
      } catch (error) {
        if (cancelled || generationRef.current !== generation) return
        setStatus(error instanceof Error && error.message.includes('404') ? 'ended' : 'error')
      }
    }
    void connect()
    return () => { cancelled = true; if (timer !== undefined) clearTimeout(timer) }
  }, [sessionId])

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#000' }}>
      {status === 'connecting' && <div style={{ color: '#aaa' }}>Connecting…</div>}
      {status === 'ended' && <div style={{ color: '#fa6', fontSize: '13px' }}>Session ended</div>}
      {status === 'error' && <div style={{ color: '#f66', fontSize: '13px' }}>Stream unavailable</div>}
      {status === 'live' && grant !== undefined && (
        <img src={grant.url} alt="Live browser stream" style={{ maxWidth: '100%', maxHeight: '100%' }} />
      )}
    </div>
  )
}

function ConsolePane({ sessionId }: { sessionId: string }) {
  const [entries, setEntries] = useState<ConsoleEntry[] | undefined>()
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | undefined

    async function poll() {
      try {
        const next = await fetchConsoleEntries(sessionId)
        if (!cancelled) setEntries(next.entries)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      }
    }
    void poll()
    timer = setInterval(poll, 2000)
    return () => { cancelled = true; if (timer !== undefined) clearInterval(timer) }
  }, [sessionId])

  return <ConsoleView entries={entries} error={error} />
}

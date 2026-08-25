import { useEffect, useRef, useState } from 'react'
import { grantStreamUrl } from './grant.js'

export interface WebPanelProps {
  sessionId: string
  onClose: () => void
}

/**
 * Live view overlay: an MJPEG <img> fed by the plugin's signed stream route
 * (CDP screencast proxied as multipart/x-mixed-replace). Token refreshes on
 * expiry so a panel can stay open across the ~10-minute token TTL.
 */
export function WebPanel({ sessionId, onClose }: WebPanelProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [status, setStatus] = useState<'connecting' | 'live' | 'error'>('connecting')
  const [grant, setGrant] = useState<{ url: string; expiresAt: number } | undefined>()

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    async function connect() {
      try {
        const next = await grantStreamUrl(sessionId)
        if (cancelled) return
        setGrant(next)
        setStatus('live')
        // Re-mint shortly before expiry so a long-open panel never dies.
        const margin = Math.max(30_000, Math.min(120_000, (next.expiresAt - Date.now()) / 2))
        timer = setTimeout(() => { void connect() }, margin)
      } catch {
        if (!cancelled) setStatus('error')
      }
    }
    void connect()
    return () => { cancelled = true; if (timer !== undefined) clearTimeout(timer) }
  }, [sessionId])

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, width: 'min(560px, 60vw)', height: '100vh',
      background: '#141414', borderLeft: '1px solid #333', zIndex: 1000,
      display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 24px rgba(0,0,0,0.5)',
    }}>
      <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#ddd' }}>
        <span style={{ fontSize: '13px' }}>Live · {sessionId}</span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#999', fontSize: '16px', cursor: 'pointer' }}
          aria-label="Close live view"
        >
          ✕
        </button>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#000' }}>
        {status === 'connecting' && <div style={{ color: '#aaa' }}>Connecting…</div>}
        {status === 'error' && <div style={{ color: '#f66', fontSize: '13px' }}>Stream unavailable (session closed?)</div>}
        {status === 'live' && grant !== undefined && (
          <img ref={imgRef} src={grant.url} alt="Live browser stream" style={{ maxWidth: '100%', maxHeight: '100%' }} />
        )}
      </div>
    </div>
  )
}

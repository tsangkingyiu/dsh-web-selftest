import { useEffect, useRef, useState } from 'react'

export interface WebPanelProps {
  sessionId: string
  onClose: () => void
}

export function WebPanel({ sessionId, onClose }: WebPanelProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [status, setStatus] = useState<'connecting' | 'live' | 'error'>('connecting')

  useEffect(() => {
    let cancelled = false
    async function connect() {
      try {
        const res = await fetch('/_dsh/dsh-web-selftest/grant', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })
        if (!res.ok) throw new Error('grant failed')
        const { streamUrl } = await res.json()
        if (cancelled) return
        if (imgRef.current) {
          imgRef.current.src = streamUrl
          setStatus('live')
        }
      } catch {
        if (!cancelled) setStatus('error')
      }
    }
    connect()
    return () => { cancelled = true }
  }, [sessionId])

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, width: '480px', height: '100vh',
      background: '#1e1e1e', borderLeft: '1px solid #333', zIndex: 1000,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
        <span>Web Session: {sessionId}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>×</button>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {status === 'connecting' && <div style={{ color: '#aaa' }}>Connecting…</div>}
        {status === 'error' && <div style={{ color: '#f66' }}>Stream error</div>}
        <img
          ref={imgRef}
          alt="Live browser stream"
          style={{ maxWidth: '100%', maxHeight: '100%', display: status === 'live' ? 'block' : 'none' }}
        />
      </div>
    </div>
  )
}

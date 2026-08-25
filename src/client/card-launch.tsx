import { useEffect, useRef, useState } from 'react'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { webResultSummaryOf } from './result.js'
import { openLiveView, requestAutoLaunch } from './live-view-store.js'

/**
 * Launch card: confirms the session id and offers the live view. A FRESH card
 * mount (new web_launch result reaching the UI) auto-launches the overlay after
 * a liveness probe; replayed/historical cards stay quiet.
 */

async function isSessionRunning(sessionId: string): Promise<boolean> {
  try {
    const res = await fetch('/_dsh/dsh-web-selftest/status', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
    if (!res.ok) return false
    const body: unknown = await res.json()
    return typeof body === 'object' && body !== null && (body as { running?: unknown }).running === true
  } catch {
    return false
  }
}

export function WebLaunchCard(props: ToolCallViewProps) {
  const summary = webResultSummaryOf(props.block)
  const sessionId = summary?.sessionId
  const probedRef = useRef(false)
  const [autoState, setAutoState] = useState<'idle' | 'waiting' | 'ended'>('idle')

  // Auto-launch once per fresh result block: only when the session is actually
  // running right now (replayed old cards find nothing running and stay closed).
  useEffect(() => {
    if (sessionId === undefined || probedRef.current) return
    probedRef.current = true
    let cancelled = false
    setAutoState('waiting')
    void isSessionRunning(sessionId).then(running => {
      if (cancelled) return
      if (running) requestAutoLaunch(sessionId)
      else setAutoState('ended')
    })
    return () => { cancelled = true }
  }, [sessionId])

  return (
    <div style={{ padding: '8px', border: '1px solid #444', borderRadius: '6px' }}>
      <div style={{ fontSize: '12px', opacity: 0.7 }}>🌐 Web Session Launched</div>
      {sessionId !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
          <span style={{ fontSize: '12px', color: '#888', fontFamily: 'monospace' }}>{sessionId}</span>
          <button
            onClick={() => openLiveView(sessionId)}
            style={{
              fontSize: '11px', padding: '2px 10px', cursor: 'pointer',
              background: 'transparent', color: '#4a9eff',
              border: '1px solid #4a9eff', borderRadius: '4px',
            }}
          >
            ▶ Live
          </button>
          {autoState === 'ended' && (
            <span style={{ fontSize: '11px', color: '#777' }}>(session not active — live view off)</span>
          )}
        </div>
      )}
    </div>
  )
}

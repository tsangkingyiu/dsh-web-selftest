import { useState } from 'react'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { webResultSummaryOf } from './result.js'
import { WebPanel } from './panel.js'

/**
 * Launch card: confirms the session id and offers the live view — an overlay
 * panel streaming the session's page through the plugin's MJPEG route.
 */
export function WebLaunchCard(props: ToolCallViewProps) {
  const summary = webResultSummaryOf(props.block)
  const [live, setLive] = useState(false)
  return (
    <div style={{ padding: '8px', border: '1px solid #444', borderRadius: '6px' }}>
      <div style={{ fontSize: '12px', opacity: 0.7 }}>🌐 Web Session Launched</div>
      {summary?.sessionId !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
          <span style={{ fontSize: '12px', color: '#888', fontFamily: 'monospace' }}>{summary.sessionId}</span>
          <button
            onClick={() => setLive(true)}
            style={{
              fontSize: '11px', padding: '2px 10px', cursor: 'pointer',
              background: 'transparent', color: '#4a9eff',
              border: '1px solid #4a9eff', borderRadius: '4px',
            }}
          >
            ▶ Live
          </button>
        </div>
      )}
      {live && summary?.sessionId !== undefined && (
        <WebPanel sessionId={summary.sessionId} onClose={() => setLive(false)} />
      )}
    </div>
  )
}

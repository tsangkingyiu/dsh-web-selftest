import { useEffect, useState } from 'react'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { webResultSummaryOf } from './result.js'
import { grantScreenshotUrl, type ScreenshotGrant } from './grant.js'

/**
 * Screenshot card: shows the actual captured PNG through the plugin's signed
 * screenshot route. The path never appears unsigned; the token is minted when
 * the card mounts and refreshed if the image fails (expired token on replay).
 */
export function WebScreenshotCard(props: ToolCallViewProps) {
  const summary = webResultSummaryOf(props.block)
  const [grant, setGrant] = useState<ScreenshotGrant | undefined>()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (summary?.path === undefined) return
    let cancelled = false
    setFailed(false)
    grantScreenshotUrl(summary.path)
      .then(url => { if (!cancelled) setGrant(url) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [summary?.path])

  return (
    <div style={{ padding: '8px', border: '1px solid #444', borderRadius: '6px' }}>
      <div style={{ fontSize: '12px', opacity: 0.7 }}>📸 Web Screenshot</div>
      {summary?.path !== undefined && (
        <div style={{ fontSize: '11px', opacity: 0.5, fontFamily: 'monospace', marginTop: '2px', wordBreak: 'break-all' }}>
          {summary.path}
        </div>
      )}
      {grant !== undefined && !failed && (
        <img
          src={grant.url}
          alt="Browser screenshot"
          style={{ maxWidth: '100%', maxHeight: '320px', marginTop: '6px', borderRadius: '4px', display: 'block' }}
        />
      )}
      {failed && <div style={{ fontSize: '12px', color: '#f66', marginTop: '4px' }}>screenshot unavailable</div>}
    </div>
  )
}

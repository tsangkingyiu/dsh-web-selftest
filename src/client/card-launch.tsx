import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { webResultSummaryOf } from './result.js'

export function WebLaunchCard(props: ToolCallViewProps) {
  const summary = webResultSummaryOf(props.block)
  return (
    <div style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontFamily: 'monospace' }}>
      <div>🌐 Web Session Launched</div>
      {summary?.sessionId && <div style={{ fontSize: '12px', color: '#666' }}>session: {summary.sessionId}</div>}
    </div>
  )
}

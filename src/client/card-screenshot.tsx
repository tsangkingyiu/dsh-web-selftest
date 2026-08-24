import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { webResultSummaryOf, webResultTextOf } from './result.js'

export function WebScreenshotCard(props: ToolCallViewProps) {
  const summary = webResultSummaryOf(props.block)
  const text = webResultTextOf(props.block)
  return (
    <div style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontFamily: 'monospace' }}>
      <div>📸 Web Screenshot</div>
      {summary?.path && <div style={{ fontSize: '12px', color: '#666' }}>{summary.path}</div>}
      {summary?.bytes !== undefined && <div style={{ fontSize: '12px', color: '#666' }}>{summary.bytes} bytes</div>}
      {text && <pre style={{ fontSize: '11px', marginTop: '4px', overflow: 'auto' }}>{text}</pre>}
    </div>
  )
}

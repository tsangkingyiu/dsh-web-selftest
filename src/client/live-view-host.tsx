import { useSyncExternalStore, useEffect } from 'react'
import { subscribeLiveView, currentLiveSession, paintLiveView, closeLiveView } from './live-view-store.js'
import { WebPanel } from './panel.js'

/**
 * Page-owned live view root. Mounted once outside the app's React tree; the
 * store decides which session (if any) has an open panel.
 */
export function LiveViewHost(): null {
  const current = useSyncExternalStore(subscribeLiveView, currentLiveSession, currentLiveSession)

  useEffect(() => {
    paintLiveView(sessionId => <WebPanel sessionId={sessionId} onClose={() => closeLiveView()} />)
  }, [current])

  return null
}

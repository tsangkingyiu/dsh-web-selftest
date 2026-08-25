// Module-level live-view state: which session (if any) should show the overlay,
// and whether auto-launch is still permitted for each session. Cards talk to this
// store through plain functions; the single overlay instance re-renders on change.

import type { ReactNode } from 'react'
import { renderOverlay, clearOverlay } from './overlay-host.js'

type Listener = () => void

let current: string | undefined
const listeners = new Set<Listener>()
/** Sessions the user manually closed — never auto-launch these again. */
const dismissed = new Set<string>()

export function subscribeLiveView(listener: Listener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function emit(): void {
  for (const listener of listeners) listener()
}

export function currentLiveSession(): string | undefined {
  return current
}

/** Open (or switch) the overlay. Manual ▶ clicks bypass the dismissal guard. */
export function openLiveView(sessionId: string): void {
  dismissed.add(sessionId) // an explicit open counts as user intent too
  if (current === sessionId) return
  current = sessionId
  emit()
}

/**
 * Auto-launch request from a fresh web_launch card. Skipped when the user
 * already closed this session's view once.
 */
export function requestAutoLaunch(sessionId: string): void {
  if (dismissed.has(sessionId)) return
  if (current === sessionId) return
  current = sessionId
  emit()
}

/** User-initiated close: remembers the choice so autos cannot reopen it. */
export function closeLiveView(): void {
  if (current === undefined) return
  dismissed.add(current)
  current = undefined
  emit()
  clearOverlay()
}

/** Paint whatever the current state says into the page-owned host element. */
export function paintLiveView(node: (sessionId: string) => ReactNode): void {
  if (current === undefined) {
    clearOverlay()
    return
  }
  renderOverlay(node(current))
}

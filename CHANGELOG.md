# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2026-08-26

### Fixed
- **Stream went permanently black after visiting the Console tab** (`2d1feb3`):
  unmounting an `<img>` whose src is a multipart MJPEG does NOT abort the fetch
  in Chromium — every Stream→Console switch leaked a live CDP screencast
  connection server-side, and reconnects starved into black frames. Both panes
  now stay mounted and toggle via `display`, so the stream never tears down
  (and tab switching is instant). An `onError` state surfaces broken streams
  ("Stream interrupted — retrying…") instead of a silent black frame.
- **Panel resize covered the chatbox** (`2d1feb3`): the panel was a pure
  `position:fixed` overlay. It now sets `--dsh-liveview-width` on `<body>` while
  open, and an injected rule gives `#root` a matching `margin-right` with a short
  transition — the chat reflows beside the panel instead of hiding under it.
- **Resize handle dead zone** (`2d1feb3`): the always-mounted panes wrapper
  painted over the right half of the drag strip and ate its pointerdowns; the
  handle now has an explicit `z-index`.

### Verified (release gate)
- Against a real local MJPEG server: connection count stays 1 across tab
  round-trips (was 2+ and climbing), img stays mounted and decoding.
- Drag widens the panel 520→624 px while the app column shifts in lockstep.

## [0.1.1] - 2026-08-26

### Added
- **Virtual cursor visualizer** (`c88ec17`): agent actions become visible in the
  stream — the cursor arrow travels to the target (~150 ms ease), clicks ripple,
  and the focused input is outlined while typing. Headless Chromium renders no OS
  cursor, so without this layer actions appear as unmotivated state changes.
- **Real-pointer tracking** (`740c784`): the same arrow also follows REAL pointer
  input (page.mouse.*, hover, page-dispatched mousemove) via a capture-phase
  window listener, so hover trails appear exactly where real input landed.
  An `animating` flag keeps choreographed agent moves authoritative over stray
  events fired mid-flight. The tracker attaches through main-world
  `page.evaluate` only — Playwright `addInitScript` runs in an isolated world
  whose listeners never receive main-world events — and re-arms automatically on
  the next `web_*` call after each navigation. The overlay installer now retries
  per-rAF past document-start so it appears without waiting for a tool call.
- **Live view auto-launch** (`da42746`): a fresh web_launch card mounts with the
  live view open; dismissal is remembered per session and a `/status` probe keeps
  stale sessions from auto-opening.
- **Resizable live view panel** (`d0814db`): drag the panel's left edge to resize
  between 320–1200 px; width persists across open/close.
- **Console tab** (`d0814db`): the panel header gains Stream / Console tabs. The
  console pane polls every 2 s against a new fenced `GET /_dsh/dsh-web-selftest/console`
  route serving the session's ring-buffered console messages + page errors merged
  chronologically, color-coded by severity (err/warn/info/EXC) with timestamps and
  badges, autoscroll while pinned to bottom; dead sessions render "Session ended".
- **`web_launch` device parameter** (`d0814db`): `device: desktop | mobile`
  (default `desktop`). Mobile launches a Pixel-class context: 412×915 viewport,
  Android UA, touch events, DPR 2.

### Fixed
- **Skill registration failed to load** (`684c525`): `registerWebSkill` omitted
  the required `source` field, so DSH rejected the skill at load time with
  `ToolCallError: invalid arguments: missing required property ... source must be
  a string`. Registration now carries the full skill content as `source`, covered
  by a regression test running the REAL dsh-skill validator.
- Client bundle contained `process.env.NODE_ENV` references that crash in the
  browser; tsdown `define` handles it since `fe410ad` (pre-0.1.1 hardening).

### Verified (release gate)
- Mobile preset: Mobile UA / 412×915 viewport / touch enabled; desktop default unchanged.
- Console route: unknown session → 404, foreign Host → 403.
- In-app panel harness against the LIVE service: mount, drag-resize (+154 px),
  tab switch PASS; real log entries render with err/warn badges.
- Pointer tracking E2E: DOM-dispatched + CDP-driven moves tracked, animation wins
  over mid-flight strays, tracking resumes post-animation, re-arms after navigation.
- Host+client tsc clean; test suite green.

## [0.1.0]

### Added
- Core `web_*` tools on headless Chromium via Playwright (`f5477c9`):
  `web_launch`, `web_close`, `web_navigate`, `web_snapshot` (aria tree + refs),
  `web_screenshot`, `web_interact` (click/type/scroll/press with one-shot
  verification via `expect_text` / `expect_gone` / `expect_url`),
  `web_wait_for`, `web_console`.
- Stream routes with HMAC-signed grants, loopback fence, and CDP screencast
  MJPEG proxy (`55b328e`): screenshot, stream, grant, status endpoints;
  trusted-vhost allowlist including `harness.kirby727.com`.
- Web client integration (`b8643ec`, `afb2835`): screenshots render in cards,
  Live view overlay with MJPEG stream, launch/close cards.
- Built-in skill `web-ui-automation` teaching the observe → act → assert loop.
- `web_console` captures console messages AND page errors from session creation
  (`85e9776`) into a bounded ring buffer.
- Package renamed to `@tsangkingyiu/dsh-web-selftest` for GitHub Packages;
  `.npmrc` removed — publishing stays manual/user-managed (`247908b`).
- `exports['./package.json']` so dsh's client-modules scanner resolves the root
  (`0b560ba`); client bundle hardened against bare `process` references
  (`fe410ad`).

### Known limitations (at release)
- No npm/GitHub-Packages publish yet — installed via in-place accept flow.
- Virtual cursor was overlay-only; no real pointer capture until 0.1.1.

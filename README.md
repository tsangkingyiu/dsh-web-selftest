# dsh-web-selftest

DeepSeek Harness plugin for headless browser UI auto-testing and live interactive screencast streaming.

Drive a real Chromium page inside a DSH conversation: navigate, read the accessibility tree, click, type, scroll, and verify results — with an optional live MJPEG view in the web UI.

## Tools

| Tool | What it does |
| --- | --- |
| `web_launch` | Launch an isolated browser context for the current conversation. Returns `sessionId` used by all other tools. |
| `web_close` | Close the session and free the browser context. |
| `web_navigate` | Navigate to a URL; returns title, final URL, and HTTP status. |
| `web_snapshot` | Aria snapshot of the page (YAML with `ref=` handles) — the primary observer. |
| `web_screenshot` | Capture a PNG into the plugin cache; returns `{path, bytes, width, height}`. |
| `web_interact` | `click` / `type` / `scroll` / `press` by aria `ref` (preferred), CSS selector, or normalized coordinates. Supports one-round-trip verification via `expect_text` / `expect_gone` / `expect_url`. |
| `web_wait_for` | Poll until text appears or disappears (default 8 s, max 60 s). |
| `web_console` | Recent console messages and page errors (ring buffer, 200 entries per session). |

## Live view

The web client registers `tool.call.toolview` cards for `web_launch` / `web_screenshot` / `web_interact`, and the host exposes signed routes under `/_dsh/dsh-web-selftest/*`:

- `POST /grant` — mint a 10-minute HMAC capability token for a session
- `GET /stream/<token>` — MJPEG proxy of the CDP screencast
- `GET /screenshot/<token>` — serve a cached PNG (path-containment enforced)
- `POST /status` — read-only session status

All routes are fenced to loopback peers with `Host`, Fetch-Metadata, and `Origin` checks.

## Install

### From a local checkout

```sh
cd /path/to/dsh-web-selftest
npm install
npm run build
dsh plugin --profile web add "$(pwd)"
dsh web
```

### From a packed tarball

```sh
npm pack                       # produces tsangkingyiu-dsh-web-selftest-<version>.tgz
dsh plugin --profile web add ./tsangkingyiu-dsh-web-selftest-<version>.tgz
dsh web
```

### From GitHub (git dependency)

```sh
dsh plugin --profile web add github:tsangkingyiu/dsh-web-selftest
dsh web
```

## Requirements

- DSH ≥ 0.1.1-rc.2 with the web bundle for the live panel; headless profiles still load all tools
- Node ^22.19.0 || >=24.0.0
- Playwright Chromium: `npx playwright-core install chromium` (auto-resolved from `~/.cache/ms-playwright`)

## Quick start

1. "Launch a browser session with id `demo`" → `web_launch`
2. "Go to https://example.com" → `web_navigate`
3. "What's on the page?" → `web_snapshot`
4. "Click the More information link" → `web_interact action=click ref=<from snapshot>`
5. "Show me a screenshot" → `web_screenshot`

## Development

```sh
npm run check    # typecheck + tests (14 tests, real headless Chromium)
```

## Known limitations (v0.1)

- The live panel is display-only; click-to-tap inside the panel arrives in v0.2.
- No headful mode toggle; Chromium always launches headless.
- No record/replay DSL; automation is agent-driven only.

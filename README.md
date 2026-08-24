# dsh-web-selftest

DeepSeek Harness plugin for headless browser UI auto-testing and live interactive screencast streaming.

## Tools

- `web_launch` — launch a new isolated browser context
- `web_close` — close a session
- `web_navigate` — navigate to a URL
- `web_snapshot` — aria snapshot (primary observer)
- `web_screenshot` — PNG capture
- `web_interact` — click / type / scroll / press with `expect_*` verification
- `web_wait_for` — poll for text appear/disappear
- `web_console` — console messages (stub)

## Live view

The Web client bundle registers `tool.call.toolview` cards for `web_launch`, `web_screenshot`, and `web_interact`, and exposes a right-side live panel that proxies the CDP screencast through signed `/_dsh/dsh-web-selftest/*` routes.

## Install

```sh
dsh plugin --profile web add dsh-web-selftest@latest
dsh web
```

## Requirements

- DSH ≥ 0.1.1-rc.2 with the web bundle
- Node ^22.19.0 || >=24.0.0
- Playwright Chromium (auto-resolved from `~/.cache/ms-playwright`)

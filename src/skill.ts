export const WEB_SKILL_NAME = 'web-ui-automation'
export const WEB_SKILL_DESCRIPTION =
  'Drive a headless Chromium browser: read the page, click, type, scroll, and confirm that an action landed. Read this before the first web_* call of a UI task.'
export const WEB_SKILL_WHEN_TO_USE =
  'Any task that operates a web page through the web_* tools — opening pages, clicking controls, filling fields, scrolling, or verifying what is on screen.'

export const WEB_SKILL_CONTENT = `# Driving the web with dsh-web-selftest

The loop is **observe once → act with an assertion → observe again only if the assertion could not settle it**.

## Reading the page

| Tool | Use it for |
| --- | --- |
| \`web_snapshot\` | "what elements are on the page, and what are their refs" — the default observer |
| \`web_screenshot\` | showing the USER a picture |

- Start with \`web_snapshot\`. Reach for \`web_screenshot\` only when you need to show the user what the page looks like.
- The snapshot returns an aria tree with refs (e.g. \`ref=e1\`). Use these refs with \`web_interact\`.

## Acting

- Prefer \`web_interact\` with \`ref\` (from \`web_snapshot\`). Raw coordinates are the last resort — they break on the next layout change.
- Typing is \`web_interact action=type\` with \`ref\` and \`text\`.
- Scrolling is \`web_interact action=scroll\` with \`direction\`.

## Confirming an action landed

- Pass \`expect_text\`, \`expect_gone\`, or \`expect_url\` to \`web_interact\`: the action and its verification become one round trip, and the result carries \`matched\`.
- If \`matched\` is false, say so — never treat an unverified action as done, and never re-act blindly to "see if it worked".
- Waiting for something slow is \`web_wait_for\` — one call that polls internally, instead of a snapshot loop.

## Boundaries

- Everything the task needs is **on the page**. If an element seems to be missing, re-read \`web_snapshot\` — never go looking for it in the user's source tree.
- An empty or failed snapshot is **not** proof an element is absent. Read the tool's error: it distinguishes "the page is not loaded" from "no element matches".
`

export function registerWebSkill(ctx: any): () => void {
  const fiber = ctx.inject(['skills'], (skillCtx: any) => {
    skillCtx.skills.register({
      name: WEB_SKILL_NAME,
      description: WEB_SKILL_DESCRIPTION,
      whenToUse: WEB_SKILL_WHEN_TO_USE,
      content: WEB_SKILL_CONTENT,
    })
  })
  return () => fiber.dispose()
}

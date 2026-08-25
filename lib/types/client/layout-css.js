/** Layout reservation rule injected once at plugin apply-time (see panel.tsx). */
export const LAYOUT_CSS = `
body[style*="--dsh-liveview-width"] #root {
  margin-right: var(--dsh-liveview-width, 0px);
  transition: margin-right 120ms ease-out;
}
`;
//# sourceMappingURL=layout-css.js.map
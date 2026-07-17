
## 2025-02-18 - Improve icon button accessibility in enterprise table
**Learning:** The enterprise table uses a reusable `TableActionButton` that acts as a wrapper for icons (like `DownloadPdfButton`), which previously lacked proper ARIA labels, hover/focus rings, and tooltips, making it difficult for keyboard and screen-reader users to operate the action buttons.
**Action:** When wrapping an icon in a reusable button component, always expose and apply an `aria-label` (which can also double as a `title` for hover tooltips) and add `aria-hidden="true"` to the inner SVG icon so screen readers announce the semantic label instead of trying to read the SVG properties. Ensure a visual focus state is included (`focus-visible:ring-2`).

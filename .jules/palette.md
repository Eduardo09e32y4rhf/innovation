## 2025-02-18 - Missing ARIA Labels on Icon-only Table Actions
**Learning:** In reusable enterprise table components (TableActionButton / DownloadPdfButton), icon-only buttons often lack accessible names, meaning screen readers announce them as "button" with no context. Keyboard focus indicators were also missing.
**Action:** When creating wrapper components for icon buttons, pass down and apply aria-label or title props. Ensure aria-hidden="true" is on the inner SVG decorative icon, and add standard focus-visible ring utility classes for keyboard accessibility.

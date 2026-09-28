## 2024-05-24 - Forms accessibility pattern
**Learning:** Found a recurring pattern in the authentication forms where `<label>` elements were not associated with `<input>` elements using `htmlFor` and `id`. This is a critical a11y issue for screen readers. Also found missing `aria-label` on icon-only toggle buttons and missing `aria-hidden="true"` on inner SVGs.
**Action:** When creating or reviewing form layouts in the future, actively verify the connection between labels and inputs, and the accessibility of icon buttons.

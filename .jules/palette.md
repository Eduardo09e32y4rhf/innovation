## 2024-06-25 - Auth Forms Missing Accessibility
**Learning:** Auth forms in this app lack proper `htmlFor` bindings and accessible focus/visibility on icon-only interactive elements like show/hide password buttons.
**Action:** When working on auth pages, ensure input fields use explicit `htmlFor` associated with `id`s, add `aria-hidden="true"` on SVGs that are inside toggle buttons to prevent screen reader noise, and give these buttons explicit `aria-label`s and `focus-visible` styling.

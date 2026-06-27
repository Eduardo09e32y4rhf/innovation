## 2024-06-27 - Enterprise Table Actions
**Learning:** Reusable UI primitives in the enterprise design system (e.g., `TableActionButton`) must expose and propagate `aria-label` and `title` props to allow consumer components to inject localized context for screen readers. They should also apply `focus-visible:ring-2` styling for keyboard accessibility.
**Action:** Always ensure enterprise reusable components bubble up ARIA and title attributes and include focus states natively, as consumer elements (like `DownloadPdfButton`) depend on them.

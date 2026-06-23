## 2024-05-15 - Accessible Table Action Buttons
**Learning:** Reusable UI primitives like `TableActionButton` in the enterprise design system need to expose and propagate `aria-label` and `title` props so consumer components (like icon-only buttons such as `DownloadPdfButton`) can inject localized context for screen readers. They should also apply `focus-visible:ring-2` styling for keyboard accessibility.
**Action:** Always ensure base button components accept and apply accessibility attributes, and ensure icon-only derived components provide sensible defaults for these attributes.

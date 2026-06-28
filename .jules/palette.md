## 2024-05-24 - Expose Accessibility Props in UI Primitives
**Learning:** Reusable primitives like TableActionButton were swallowing accessibility props, preventing consumer components from providing localized context for icon-only buttons.
**Action:** Always ensure UI primitives in the enterprise design system explicitly expose and propagate `aria-label` and `title` props, and include `focus-visible:ring-2` for keyboard accessibility.

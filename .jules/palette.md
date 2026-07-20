## 2026-07-20 - Accessible Finance Table Actions
**Learning:** Found that table action rows containing multiple icon-only buttons (like refresh, sync, or external links) often lack both `aria-label`s for screen readers and `focus-visible` styles for keyboard navigation in this repository.
**Action:** When working on data tables or list views, always verify that action buttons have clear screen-reader context and explicit keyboard focus states using the `focus-visible:ring-2 focus-visible:ring-[color] focus-visible:outline-none` pattern.

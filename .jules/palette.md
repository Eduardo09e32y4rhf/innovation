## 2024-05-30 - Reusable UI primitives need a11y propagation
**Learning:** Reusable UI primitives in the enterprise design system (e.g., `TableActionButton`) must expose and propagate `aria-label` and `title` props to allow consumer components to inject localized context for screen readers. They should also apply `focus-visible:ring-2` styling for keyboard accessibility.
**Action:** Always ensure base interactive elements accept accessibility attributes and pass them down to the underlying HTML element, and add keyboard focus indicators.

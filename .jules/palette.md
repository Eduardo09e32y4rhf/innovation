## 2024-07-01 - TableActionButton Accessibility Fix
**Learning:** Reusable UI primitives like TableActionButton must expose and propagate aria-label and title props to allow consumer components to inject localized context for screen readers. They should also apply focus-visible:ring-2 styling for keyboard accessibility.
**Action:** Always check if wrapper components pass through accessibility attributes to the underlying interactive elements.

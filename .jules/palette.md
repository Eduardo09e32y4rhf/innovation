## 2024-06-24 - Enterprise Design System primitives lacked ARIA props propagation
**Learning:** Reusable UI primitives in the enterprise design system (e.g., TableActionButton) must expose and propagate aria-label and title props to allow consumer components to inject localized context for screen readers. They should also apply focus-visible:ring-2 styling for keyboard accessibility.
**Action:** Always ensure custom button primitives accept and apply standard accessibility attributes instead of swallowing them.

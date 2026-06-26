## 2024-06-26 - Enterprise Design System Accessibility
**Learning:** Reusable UI primitives in the enterprise design system (e.g., TableActionButton) must expose and propagate aria-label and title props to allow consumer components to inject localized context for screen readers. They should also apply focus-visible:ring-2 styling for keyboard accessibility.
**Action:** Always ensure foundational UI components accept and pass down aria attributes and titles, and apply explicit focus-visible styles to improve keyboard navigation.

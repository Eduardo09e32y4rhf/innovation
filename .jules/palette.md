## 2024-05-15 - Interactive Icon Buttons Accessibility
**Learning:** In the notification bell widget, decorative icons inside icon-only buttons need `aria-hidden="true"` to prevent screen readers from announcing them instead of the button's `aria-label`. Also, focus visible classes are critical for these standalone interactive elements.
**Action:** Ensure all custom toggle widgets and icon-only buttons implement explicit `aria-label`, `aria-hidden="true"` on the inner icon, and consistent `focus-visible` styling.

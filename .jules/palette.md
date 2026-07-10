## 2024-07-10 - Password Visibility Toggle Accessibility
**Learning:** Found an accessibility issue pattern specific to this app's authentication components where icon-only buttons (like the password visibility toggle) lack `aria-label` and `focus-visible` styles, and their inner decorative SVGs lack `aria-hidden="true"`.
**Action:** When creating or modifying custom interactive elements, consistently apply `aria-label`, add `aria-hidden="true"` to inner decorative SVGs, and use `focus-visible:ring-2 focus-visible:ring-[color] focus-visible:outline-none` for visual consistency.

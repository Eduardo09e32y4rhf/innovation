## 2024-07-29 - Password visibility toggles need aria-hidden for icons
**Learning:** Found an accessibility issue pattern in the app's components where icon-only buttons (like password visibility toggles) lacked `aria-label` and focus visibility, and decorative icons weren't hidden from screen readers.
**Action:** Always add `aria-label` to icon-only buttons, use `aria-hidden="true"` on their inner decorative SVGs, and ensure proper `focus-visible` styling is applied for keyboard accessibility without clipping.

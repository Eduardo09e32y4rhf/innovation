## 2024-05-24 - Login Page Accessibility
**Learning:** Found implicit inputs and icon buttons without labels or correct focus states. Need to explicitly add `aria-label` to form inputs lacking explicit `<label>`, hide decorative icons from screen readers using `aria-hidden="true"`, and ensure interactive elements have clear visual focus states (`focus-visible:ring-2`).
**Action:** Always add `aria-hidden="true"` to SVG decorations on inputs/buttons. Add explicit `aria-label`s to unlabelled inputs. Enhance hover styles with focus-visible alternatives for keyboard accessibility.

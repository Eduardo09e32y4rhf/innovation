## 2024-07-30 - Accessible Interactive Elements in Inputs
**Learning:** When absolutely positioning interactive elements like toggle buttons inside input fields (e.g., password visibility toggles), they often lack focus styles and have `tabIndex={-1}` by default, making them completely inaccessible to keyboard users. When fixing this, you must explicitly define `focus-visible:ring-inset` alongside standard focus rings so the ring doesn't clip awkwardly outside the input's bounding box.
**Action:** Always verify `tabIndex` and focus styles (`focus-visible`) on floating buttons within inputs, ensuring they have appropriate ARIA labels and `aria-hidden` on internal icons. Use `focus-visible:ring-inset` for a polished visual result.

## 2024-08-06 - Password Visibility Toggles
**Learning:** Adding visibility toggles to password fields improves UX significantly, especially for password reset flows. It is important to ensure the toggle buttons are accessible (using `aria-label` and `aria-hidden` on the icons) and properly positioned within the input container.
**Action:** When adding password fields in authentication flows, always include a visibility toggle and ensure it follows accessibility best practices.

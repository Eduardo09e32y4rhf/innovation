## 2024-07-30 - Accessible Interactive Elements in Inputs
**Learning:** When absolutely positioning interactive elements like toggle buttons inside input fields (e.g., password visibility toggles), they often lack focus styles and have `tabIndex={-1}` by default, making them completely inaccessible to keyboard users. When fixing this, you must explicitly define `focus-visible:ring-inset` alongside standard focus rings so the ring doesn't clip awkwardly outside the input's bounding box.
**Action:** Always verify `tabIndex` and focus styles (`focus-visible`) on floating buttons within inputs, ensuring they have appropriate ARIA labels and `aria-hidden` on internal icons. Use `focus-visible:ring-inset` for a polished visual result.

## 2024-09-12 - Added ARIA labels to Icon-only Password Toggles
**Learning:** Icon-only buttons used for password visibility toggling often lack text alternatives, failing accessibility guidelines for screen readers. Using `aria-label` provides necessary context while adding `aria-hidden="true"` to inner SVG/Lucide icons prevents redundant announcements.
**Action:** Always add explicit `aria-label` to icon-only buttons (like Eye/EyeOff for passwords) and `aria-hidden="true"` to the enclosed icons. Include `focus-visible` utility classes to support keyboard navigation.

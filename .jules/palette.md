## 2024-07-30 - Accessible Interactive Elements in Inputs
**Learning:** When absolutely positioning interactive elements like toggle buttons inside input fields (e.g., password visibility toggles), they often lack focus styles and have `tabIndex={-1}` by default, making them completely inaccessible to keyboard users. When fixing this, you must explicitly define `focus-visible:ring-inset` alongside standard focus rings so the ring doesn't clip awkwardly outside the input's bounding box.
**Action:** Always verify `tabIndex` and focus styles (`focus-visible`) on floating buttons within inputs, ensuring they have appropriate ARIA labels and `aria-hidden` on internal icons. Use `focus-visible:ring-inset` for a polished visual result.

## 2025-06-25 - Absolute positioned buttons require ring-inset for focus-visible
**Learning:** When using absolute positioned elements inside relative containers (like password toggle buttons within input fields), applying standard focus rings (`focus-visible:ring-2`) causes the focus outline to be clipped by the container's bounding box or overflow settings.
**Action:** Always include Tailwind's `focus-visible:ring-inset` alongside the standard focus rings when adding accessibility focus styles to absolutely positioned interactive elements to ensure the focus outline is visible and contained properly.

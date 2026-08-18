## 2024-07-30 - Accessible Interactive Elements in Inputs
**Learning:** When absolutely positioning interactive elements like toggle buttons inside input fields (e.g., password visibility toggles), they often lack focus styles and have `tabIndex={-1}` by default, making them completely inaccessible to keyboard users. When fixing this, you must explicitly define `focus-visible:ring-inset` alongside standard focus rings so the ring doesn't clip awkwardly outside the input's bounding box.
**Action:** Always verify `tabIndex` and focus styles (`focus-visible`) on floating buttons within inputs, ensuring they have appropriate ARIA labels and `aria-hidden` on internal icons. Use `focus-visible:ring-inset` for a polished visual result.

## 2024-08-18 - Loading Spinner Accessibility
**Learning:** Decorative SVG elements inside reusable components like buttons (e.g., loading spinners) should have `aria-hidden="true"` applied. This prevents screen readers from redundantly or confusingly announcing the SVG, improving the accessibility of interactive elements.
**Action:** When creating or modifying components with decorative SVGs, especially those representing loading states, always verify and add `aria-hidden="true"` to the SVG element.

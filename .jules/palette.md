## 2024-07-30 - Accessible Interactive Elements in Inputs
**Learning:** When absolutely positioning interactive elements like toggle buttons inside input fields (e.g., password visibility toggles), they often lack focus styles and have `tabIndex={-1}` by default, making them completely inaccessible to keyboard users. When fixing this, you must explicitly define `focus-visible:ring-inset` alongside standard focus rings so the ring doesn't clip awkwardly outside the input's bounding box.
**Action:** Always verify `tabIndex` and focus styles (`focus-visible`) on floating buttons within inputs, ensuring they have appropriate ARIA labels and `aria-hidden` on internal icons. Use `focus-visible:ring-inset` for a polished visual result.

## 2024-11-20 - Ensure icon-only buttons propagate props and accept aria-labels
**Learning:** Wrapper components for icon-only buttons (like `TableActionButton` in `apps/web/app/components/enterprise/table.tsx`) often restrict props, preventing the parent from setting `aria-label`. Additionally, nested decorative icons need `aria-hidden="true"` to prevent screen reader clutter.
**Action:** Always extend standard HTML button attributes (`React.ButtonHTMLAttributes<HTMLButtonElement>`) when creating wrapper components for buttons, and spread remaining props to the underlying `<button>` element to ensure accessibility attributes can be passed down.

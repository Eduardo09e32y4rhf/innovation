
## 2024-05-24 - Accessible password toggles
**Learning:** Password visibility toggles often suffer from being removed from tab order (`tabIndex={-1}`) or lacking `aria-label`s on icon-only buttons. When adding focus rings to absolutely positioned elements inside inputs, using `focus-visible:ring-inset` and matching the parent's border radius (e.g., `rounded-r-[14px]`) prevents the focus ring from clipping outside the container.
**Action:** Always ensure interactive elements like password toggles are in the tab order, have clear `aria-label`s (especially dynamic ones like "Mostrar/Ocultar"), and use `aria-hidden="true"` on the SVG icons. Use inset rings for absolutely positioned form controls.

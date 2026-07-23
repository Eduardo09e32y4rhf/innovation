## 2023-10-27 - Accessible absolutely-positioned icon buttons
**Learning:** Icon-only buttons positioned absolutely inside form inputs (like password toggles) need both semantic ARIA properties (`aria-label` and `aria-hidden="true"` on the SVG) and visually bounded focus indicators (`focus-visible:ring-inset` with a matching `rounded-r-[size]`) so the focus outline doesn't clip outside the container.
**Action:** When adding keyboard navigation to absolute-positioned interactive elements, always apply `ring-inset` and align the border radius with the parent edge it touches.

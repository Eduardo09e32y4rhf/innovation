## 2024-03-05 - Missing ARIA Labels on Mobile Toggles
**Learning:** Found an icon-only button without an `aria-label` attribute in the main layout `Navbar` (`frontend/components/layout/navbar.tsx`). It also lacked an `aria-expanded` state, making the dropdown behavior obscure for screen readers.
**Action:** When creating toggle buttons or icon-only buttons, always ensure to provide an `aria-label`. For elements controlling visibility of other elements, consider `aria-expanded` to communicate the state.
## 2025-03-05 - Missing ARIA Labels on Icon-only Custom UI Buttons
**Learning:** Found multiple instances where critical interactive elements (like advancing a candidate in ATS Kanban, or column options) were implemented either as naked `svg` elements (`<MoreVertical>`) or `<button>` elements with just an icon (`<ChevronRight>`). While visually clear to sighted users, these lacked `aria-label` attributes and focus-visible rings, rendering them completely inaccessible to screen readers and difficult to navigate via keyboard.
**Action:** Always wrap interactive icons in a semantic `<button>` tag, provide descriptive `aria-label` and `title` attributes, and ensure `focus-visible` styles are explicitly added using Tailwind.
## 2024-05-02 - Added ARIA Labels to AIKeyManager
**Learning:** The AIKeyManager component had buttons (Reset, Delete) that relied solely on icons and adjacent visual context, making them inaccessible to screen readers and lacking clear keyboard focus indicators.
**Action:** Always add descriptive `aria-label` and `title` attributes to icon-only buttons, and ensure they have visible focus states (`focus-visible:ring-2`) for keyboard users.

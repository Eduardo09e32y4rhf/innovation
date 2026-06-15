## 2024-03-05 - Missing ARIA Labels on Mobile Toggles
**Learning:** Found an icon-only button without an `aria-label` attribute in the main layout `Navbar` (`frontend/components/layout/navbar.tsx`). It also lacked an `aria-expanded` state, making the dropdown behavior obscure for screen readers.
**Action:** When creating toggle buttons or icon-only buttons, always ensure to provide an `aria-label`. For elements controlling visibility of other elements, consider `aria-expanded` to communicate the state.
## 2025-03-05 - Missing ARIA Labels on Icon-only Custom UI Buttons
**Learning:** Found multiple instances where critical interactive elements (like advancing a candidate in ATS Kanban, or column options) were implemented either as naked `svg` elements (`<MoreVertical>`) or `<button>` elements with just an icon (`<ChevronRight>`). While visually clear to sighted users, these lacked `aria-label` attributes and focus-visible rings, rendering them completely inaccessible to screen readers and difficult to navigate via keyboard.
**Action:** Always wrap interactive icons in a semantic `<button>` tag, provide descriptive `aria-label` and `title` attributes, and ensure `focus-visible` styles are explicitly added using Tailwind.

## 2026-06-15 - Improve LanguageSwitcher accessibility
**Learning:** For custom dropdown implementations (like LanguageSwitcher), simply rendering a list of buttons is insufficient for screen readers. They require a combination of `aria-expanded`, `aria-haspopup`, `role="listbox"`, and `role="option"` with dynamic `aria-label`s to correctly communicate the interactive structure and current state.
**Action:** Always ensure custom dropdowns and select menus have the appropriate `listbox` and `option` ARIA roles and use dynamic `aria-label`s that expose the current value.

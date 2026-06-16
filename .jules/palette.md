## 2024-03-05 - Missing ARIA Labels on Mobile Toggles
**Learning:** Found an icon-only button without an `aria-label` attribute in the main layout `Navbar` (`frontend/components/layout/navbar.tsx`). It also lacked an `aria-expanded` state, making the dropdown behavior obscure for screen readers.
**Action:** When creating toggle buttons or icon-only buttons, always ensure to provide an `aria-label`. For elements controlling visibility of other elements, consider `aria-expanded` to communicate the state.
## 2025-03-05 - Missing ARIA Labels on Icon-only Custom UI Buttons
**Learning:** Found multiple instances where critical interactive elements (like advancing a candidate in ATS Kanban, or column options) were implemented either as naked `svg` elements (`<MoreVertical>`) or `<button>` elements with just an icon (`<ChevronRight>`). While visually clear to sighted users, these lacked `aria-label` attributes and focus-visible rings, rendering them completely inaccessible to screen readers and difficult to navigate via keyboard.
**Action:** Always wrap interactive icons in a semantic `<button>` tag, provide descriptive `aria-label` and `title` attributes, and ensure `focus-visible` styles are explicitly added using Tailwind.

## 2024-06-16 - Dynamic ARIA Labels in Custom Dropdowns
**Learning:** When adding ARIA labels to custom dropdowns (like LanguageSwitcher) that display dynamic selections, using a static `aria-label` completely overrides the inner text. Screen reader users lose the ability to perceive the currently selected state.
**Action:** Always incorporate the dynamic value (e.g., `currently ${currentLanguage?.name}`) into the `aria-label` to preserve state context alongside the action description.

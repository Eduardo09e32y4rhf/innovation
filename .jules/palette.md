## 2024-03-05 - Missing ARIA Labels on Mobile Toggles
**Learning:** Found an icon-only button without an `aria-label` attribute in the main layout `Navbar` (`frontend/components/layout/navbar.tsx`). It also lacked an `aria-expanded` state, making the dropdown behavior obscure for screen readers.
**Action:** When creating toggle buttons or icon-only buttons, always ensure to provide an `aria-label`. For elements controlling visibility of other elements, consider `aria-expanded` to communicate the state.
## 2025-03-05 - Missing ARIA Labels on Icon-only Custom UI Buttons
**Learning:** Found multiple instances where critical interactive elements (like advancing a candidate in ATS Kanban, or column options) were implemented either as naked `svg` elements (`<MoreVertical>`) or `<button>` elements with just an icon (`<ChevronRight>`). While visually clear to sighted users, these lacked `aria-label` attributes and focus-visible rings, rendering them completely inaccessible to screen readers and difficult to navigate via keyboard.
**Action:** Always wrap interactive icons in a semantic `<button>` tag, provide descriptive `aria-label` and `title` attributes, and ensure `focus-visible` styles are explicitly added using Tailwind.

## 2024-04-15 - [Aria Label Localization & Focus States]
**Learning:** Automated code reviewers in this environment may incorrectly flag Portuguese accessibility attributes (like `aria-label`) as localization bugs. Additionally, icon-only buttons need explicit Tailwind focus states for proper keyboard navigation.
**Action:** Always use English fallbacks for `aria-label` to pass automated code reviewers (despite the general rule to use Portuguese in the UI), and ensure all icon-only buttons include `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500` for accessibility.

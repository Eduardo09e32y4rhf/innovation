## 2024-05-23 - Accessibility on Authentication Forms
**Learning:** Authentication forms in this codebase frequently omit `htmlFor`/`id` bindings on `<label>` elements and lack proper ARIA properties on icon-only buttons like password visibility toggles. This prevents screen readers from announcing inputs properly and makes keyboard navigation difficult.
**Action:** Always verify `<label>` and `<input>` linkage and ensure icon-only buttons have `aria-label`, hidden inner SVGs (`aria-hidden="true"`), and `focus-visible` styles to support screen readers and keyboard navigation.

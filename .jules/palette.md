
## 2026-09-20 - Improve Password Field Accessibility
**Learning:** Many custom password visibility toggle buttons (`<button>` wrapping `<Eye>` or `<EyeOff>` icons) lack proper accessibility. They often don't have `aria-label` for screen readers to announce "Show password" or "Hide password". Additionally, they miss keyboard focus outlines (`focus-visible:ring-*`), and sometimes wrongly include `tabIndex={-1}`, which prevents keyboard navigation.
**Action:** When adding or auditing password toggle buttons, ensure they have: 1. dynamic `aria-label` ("Mostrar senha" / "Ocultar senha"), 2. `aria-hidden="true"` on the inner icons to avoid redundant screen reader noise, 3. visible focus rings (`focus-visible:ring-2 focus-visible:ring-inset`), and 4. they do not have `tabIndex={-1}`.

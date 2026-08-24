## 2026-08-24 - Accessibility for icon-only buttons
**Learning:** Found multiple instances where the application relies on `X` or `XCircle` components embedded inside a `<button>` without providing any text description or `aria-label`, leaving screen readers with ambiguous labels. Additionally, the decorative SVG icons themselves were missing `aria-hidden="true"`.
**Action:** Consistently append `aria-label="[Localized Action]"` (e.g., "Fechar modal", "Excluir") to such buttons and apply `aria-hidden="true"` to the internal SVG to optimize the screen reader experience moving forward.

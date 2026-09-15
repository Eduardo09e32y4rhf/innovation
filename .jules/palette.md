## 2025-09-15 - Added aria-labels to show/hide password buttons
**Learning:** Found multiple instances of icon-only show/hide password buttons in authentication forms and settings without aria-labels. Screen reader users would have no context for what these buttons do.
**Action:** Always add dynamic aria-labels to show/hide password toggle buttons. The aria-label should clearly indicate the action (e.g. "Mostrar senha" or "Ocultar senha").

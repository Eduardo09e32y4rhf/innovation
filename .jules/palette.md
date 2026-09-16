## 2024-05-15 - Accessible Authentication Forms
**Learning:** Found several authentication forms (login, register, reset-password) that were missing explicit labels (`htmlFor`) and proper `aria-label` attributes on icon-only toggle buttons (like "show password"), reducing screen reader compatibility and usability.
**Action:** Always verify that input fields have explicitly linked `<label htmlFor="...">` and that icon-only buttons include descriptive `aria-label` and `aria-hidden="true"` on inner SVGs.

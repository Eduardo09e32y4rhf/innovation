## 2025-06-25 - Add aria-label to password visibility toggles
**Learning:** Found several password visibility toggles (`showPassword`) across authentication and settings pages that lacked `aria-label` attributes and had `tabIndex={-1}`, making them inaccessible to screen readers and keyboard navigation.
**Action:** Always ensure interactive elements like icon-only buttons include descriptive `aria-label`s and do not improperly remove them from the tab order. Use Portuguese labels like "Mostrar senha" and "Ocultar senha" for this specific app.

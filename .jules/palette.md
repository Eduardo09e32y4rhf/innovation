## 2024-05-18 - Password Toggle Accessibility
**Learning:** Password visibility toggle buttons (Eye/EyeOff icons) in auth forms often lack ARIA labels and focus states, making them inaccessible to screen readers and keyboard users.
**Action:** Always ensure icon-only buttons include descriptive aria-label attributes, apply aria-hidden="true" to the internal SVGs/icons to prevent redundant announcements, and include explicit focus-visible styles (e.g., focus-visible:ring-2 focus-visible:ring-inset).

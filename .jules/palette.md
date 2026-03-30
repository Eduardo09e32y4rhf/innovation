## 2024-03-30 - Added ARIA labels to icon-only buttons
**Learning:** Found that multiple icon-only utility buttons across frontend components (such as AnnouncementBanner and AIKeyManager) lacked screen-reader accessible names (ARIA labels), reducing accessibility for users relying on assistive technologies.
**Action:** When creating new components with icon-only actions (like close, delete, etc.), ensure `aria-label` attributes with descriptive actions are included by default.

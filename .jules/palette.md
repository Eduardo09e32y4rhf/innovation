## 2026-10-05 - Add focus visible styles to password toggle button
**Learning:** Icon-only password visibility toggles lack explicit keyboard focus styles, making it hard for keyboard users to know when they are focused.
**Action:** Always add explicit `focus-visible:ring-2` styles (with brand colors or appropriate ring colors) and `rounded-r-lg` to inner right-aligned buttons to ensure keyboard navigation visibility.

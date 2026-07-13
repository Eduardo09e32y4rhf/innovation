## 2024-07-13 - Add ARIA Labels and keyboard focus to Notification Bell
**Learning:** Icon-only buttons like the notification bell need explicit `aria-label` attributes for screen readers, and inner decorative SVG icons (like `<Bell />` or `<X />`) should have `aria-hidden="true"` so they aren't redundantly announced. Additionally, proper focus states (`focus-visible:ring-2`) should be applied for keyboard navigation.
**Action:** Always add `aria-label` to icon-only buttons, `aria-hidden="true"` to their inner SVG icons, and `focus-visible` styles for better keyboard accessibility.

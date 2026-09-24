## 2026-09-24 - Accessibility fixes on Auth flows
**Learning:** Some custom input fields in auth flows use visual icons/text wrappers instead of semantic `<label>` tags. Also, dynamic password visibility toggle buttons often lack `aria-label`s.
**Action:** Always add explicit `aria-label`s directly to elements lacking them and wire up `htmlFor` attributes to `<label>` elements connected to their input's `id` attributes.

## 2026-06-20 - Accessible TableActionButton in Enterprise Components
**Learning:** The enterprise component `TableActionButton` is an icon-only button used as a reusable UI primitive, but it did not propagate accessibility props or include focus-visible states, hiding its intent from screen readers and making keyboard navigation unclear.
**Action:** Always expose and pass down `aria-label` and `title` in UI primitives, and add `focus-visible:ring-2` styling so consumers can safely use icon-only buttons while supporting keyboard and screen reader accessibility.

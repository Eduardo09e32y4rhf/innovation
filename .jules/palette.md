## 2024-07-30 - Accessible Interactive Elements in Inputs
**Learning:** When absolutely positioning interactive elements like toggle buttons inside input fields (e.g., password visibility toggles), they often lack focus styles and have `tabIndex={-1}` by default, making them completely inaccessible to keyboard users. When fixing this, you must explicitly define `focus-visible:ring-inset` alongside standard focus rings so the ring doesn't clip awkwardly outside the input's bounding box.
**Action:** Always verify `tabIndex` and focus styles (`focus-visible`) on floating buttons within inputs, ensuring they have appropriate ARIA labels and `aria-hidden` on internal icons. Use `focus-visible:ring-inset` for a polished visual result.

## 2024-09-03 - Added accessibility to Eye toggle icons in inputs
**Learning:** When using Eye / EyeOff icons in inputs for passwords, they often lack ARIA attributes, proper focus-visible styles, and aria-hidden on the icon itself. Using rounded-md for absolute right buttons inside inputs improves the visual appearance when focused, but using rounded-r-md or specific border radius might be necessary to fit the input's rounding precisely.
**Action:** Always add aria-label to the button, aria-hidden to the internal Eye/EyeOff icon, and focus-visible classes for keyboard navigation.

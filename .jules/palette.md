## 2025-02-13 - [Focus Visible Outlines on Inputs]
**Learning:** Adding Tailwind's standard \`focus-visible:ring-2\` to absolutely positioned interactive elements (like a show/hide password toggle button inside an input) can cause the focus outline to clip outside the input's bounding box.
**Action:** Always include Tailwind's \`focus-visible:ring-inset\` alongside the standard focus rings on absolutely positioned internal input elements to ensure proper keyboard navigation accessibility without visual clipping.

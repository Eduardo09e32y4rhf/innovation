## 2024-05-24 - Array Map/Filter Consolidation
**Learning:** In the NestJS backend (e.g., \`dashboard.repository.ts\`), iterating over large collections using sequential `.filter()` or `.map()` methods causes redundant O(N) passes and memory allocations.
**Action:** Consolidate these multiple passes into a single `for...of` loop to calculate multiple metrics simultaneously.

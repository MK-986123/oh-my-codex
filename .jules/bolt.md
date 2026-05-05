## 2026-05-05 - O(N*M) and O(N^2) Array Operations
Learning: Intermediate array allocations and nested lookups can significantly impact performance even with relatively small N. Using `some()` instead of `map().includes()` avoids O(N) allocation and allows short-circuiting. `Set` lookups convert O(N^2) filters to O(N).
Action: Prefer `some()` for existence checks and `Set` for membership lookups in hot paths.

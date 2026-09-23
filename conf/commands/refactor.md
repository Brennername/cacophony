---
name: refactor
description: Refactor targeted symbol to adhere strictly to SOLID principles and strict typing
role: user
temperature: 0.2
arguments: targetSymbol, file
---
Please review and refactor `$ARG1` in `$ARG2`.
Requirements:
1. Adhere strictly to SOLID principles (Single Responsibility, Open/Closed, Liskov, Interface Segregation, Dependency Inversion).
2. Do not introduce any emojis in code or comments.
3. Maintain full type-safety and ensure no regressions.

Selection Context:
$SELECTION

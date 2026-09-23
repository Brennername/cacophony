---
name: test
description: Generate unit tests for selected file adhering to testing framework conventions
role: user
temperature: 0.1
arguments: file
---
Generate comprehensive unit tests for `$ARG1`.
Requirements:
1. Use the workspace testing framework (e.g. `node:test`, `vitest`, or `jest`).
2. Test both happy path and edge conditions with proper assertions.
3. Zero emojis in comments or test output descriptions.

Source Code:
$SELECTION

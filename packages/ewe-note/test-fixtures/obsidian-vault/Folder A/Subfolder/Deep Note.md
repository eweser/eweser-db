---
title: Deep Note in Subfolder
aliases:
  - Deep Note
tags:
  - test
  - folder-a
  - subfolder
---

# Deep Note in Subfolder

<!-- Tests: deep folder hierarchy (lives at Folder A/Subfolder/Deep Note.md) -->

This note lives at `Folder A/Subfolder/Deep Note.md`, testing that three levels of nesting work correctly.

## Relative Links

Link to parent folder note: [[Folder A/Nested Note]]

Link to root-level note: [[Basic Formatting]]

## Path Metadata

When imported, this note should have:

- `sourcePath`: `Folder A/Subfolder/Deep Note.md`
- `folderPath`: `Folder A/Subfolder/`
- `sourceVault`: (vault name provided at import time)

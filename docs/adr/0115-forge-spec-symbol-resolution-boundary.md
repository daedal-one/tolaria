---
type: ADR
id: "0115"
title: "Forge-spec symbol resolution stays behind the Rust IPC boundary"
status: active
date: 2026-08-05
---

## Context

Forge-spec references can now target language-server symbols rather than brittle
line ranges. Tolaria needs to list symbols, preview the selected source, and copy
the canonical `spec:src:...#symbol=...` reference. Starting language servers in
the renderer would duplicate JSON-RPC lifecycle logic and allow vault content to
select arbitrary local commands.

## Decision

**Tolaria delegates source-symbol discovery and resolution to the shared
`spec-cli` Rust library through typed Tauri commands.**

The backend exposes list and resolve operations, keeps repository-boundary path
validation in `SymbolService`, and does not enable custom `_lsp.toml` commands at
the desktop IPC boundary. The renderer owns only picker state, preview, copy, and
consent-aware product analytics. The forge-spec stdio language server and CLI use
the same service and reference parser.

## Options considered

- **Shared Rust service behind typed IPC** (chosen): one parser, security boundary,
  and provider implementation across CLI, editor LSP, and Tolaria.
- **Language-server client in React**: faster to prototype, but duplicates process
  management and weakens command/path controls.
- **Line references only in Tolaria**: avoids an integration, but preserves the
  refactoring fragility that symbol references are intended to remove.

## Consequences

- Symbol references have identical encoding and resolution semantics everywhere.
- Tolaria can safely show a picker and preview without executing project-selected
  language-server commands.
- Built-in provider executables must be installed locally; provider absence is a
  normal, actionable error in the picker and a warning in non-strict lint mode.
- Future pooling or cancellation belongs in `SymbolService` and does not require a
  frontend API change.

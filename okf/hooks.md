---
type: Component
title: Hook Helper
description: Shell script run by Claude Code hooks that emits per-session status.
resource: file://~/.claude/agent-status.sh
tags: [hooks, shell, claude-code]
timestamp: 2026-07-01T00:00:00Z
---
# Overview

`agent-status.sh` is invoked by Claude Code lifecycle hooks. It reads the hook
event JSON on stdin, derives a state, and writes the [status file](/status-file.md),
then POSTs `127.0.0.1:37800` to nudge the [plugin](/plugin.md).

# Event mapping

| Hook event | Helper argument | Resulting state |
|------------|-----------------|-----------------|
| `SessionStart` | `idle` | `idle` |
| `UserPromptSubmit` | `busy` | `busy` (captures session name from the prompt) |
| `PreToolUse` | `busy` | `busy` (refreshes activity timestamp) |
| `Notification` | `notify` | `perm` or `wait`, decided by the message text |
| `PermissionRequest` | `perm` | `perm` |
| `Stop` | `done` | `done` |
| `SessionEnd` | `end` | record deleted - except Jean, which respawns the CLI per turn, so its record is kept as `done` (dismiss with a long-press) |

# Responsibilities

* Split `notify` into `perm` (message mentions permission) vs `wait` (idle).
* Preserve the session `title` (first prompt) across later events.
* Maintain `started` for turn-duration elapsed while `busy`.
* Capture a liveness pid (grandparent of the hook shell ~ the claude process).
* Tag `host: "jean"` when `JEAN_SESSION_ID` is in the environment (Jean exports it
  into the session), so the plugin opens the right app on tap; omitted otherwise.
* Keep Jean records on `SessionEnd` (rewrite to `done`): Jean starts a fresh CLI
  process per turn, so `SessionEnd` fires after every answer, not when the user is
  done - deleting there would make a finished session flash green and vanish.

# Configuration

The wiring lives in `~/.claude/settings.json`; a ready-to-merge block ships as
`hooks/settings.snippet.json`. See the [setup playbook](/setup.md).

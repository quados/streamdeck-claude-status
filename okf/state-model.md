---
type: Reference
title: Session State Model
description: The states a session key can show, their colours, blink behaviour, and expiry rules.
tags: [state, colours, ui]
timestamp: 2026-07-01T00:00:00Z
---
# States

| State | Meaning | Accent colour | Blinks |
|-------|---------|---------------|--------|
| `busy` | working / thinking | `#e0b000` amber | no |
| `perm` | needs permission | `#ff3b30` red | yes |
| `wait` | waiting for input (idle) | `#3b82f6` blue | yes |
| `done` | turn finished | `#20a020` green | no |
| `idle` | session started, no activity yet | `#8a8a8a` grey | no |

States in the attention set (`perm`, `wait`) blink by alternating the accent opacity every 700 ms to draw the eye.

# Transitions

* `SessionStart` → `idle`
* `UserPromptSubmit` and `PreToolUse` → `busy`
* `Notification` → `perm` if the message mentions permission, else `wait`
* `PermissionRequest` → `perm`
* `Stop` → `done`
* `SessionEnd` → record deleted

See [Hook helper](/hooks.md) for how events map to helper arguments.

# Expiry

A record is shown only if its process is alive (or its file is recent) AND:

* `busy` records are hidden after `STUCK` (default 20 min) with no tool activity — a crash/hang guard. `PreToolUse` refreshes the timestamp during a turn, so genuinely active sessions stay visible; hidden records self-heal when the next event arrives.
* Non-busy records are hidden after `IDLE` (default 24 h) without an update.

# Elapsed time

Each key shows an elapsed token. For `busy` it is the turn duration (since the `started` timestamp); for other states it is the time since the last state change. See [Status file schema](/status-file.md) for the `ts` and `started` fields.

---
type: Schema
title: Session Status File
description: The per-session JSON document written by the hook helper and read by the plugin.
resource: file://~/.claude/agent-status.d/{session_id}.json
tags: [schema, json, ipc]
timestamp: 2026-07-01T00:00:00Z
---
# Overview

The [hook helper](/hooks.md) writes one file per Claude Code session at
`~/.claude/agent-status.d/<session_id>.json`. The [plugin](/plugin.md) reads all
of them each refresh. Writes are last-writer-wins; the plugin tolerates partial
reads by skipping unparseable files.

# Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sid` | string | yes | Claude Code `session_id`; also the file stem |
| `state` | string | yes | one of `busy`, `perm`, `wait`, `done`, `idle` (see [State model](/state-model.md)) |
| `cwd` | string | yes | session working directory; the project opened on key tap |
| `title` | string | no | session name — the first user prompt, truncated to 70 chars |
| `pid` | number | yes | process id used for liveness (`kill -0`) |
| `ts` | number | yes | Unix seconds of the last update |
| `started` | number | no | Unix seconds of the current turn start; present only while `busy` |

# Examples

```json
{
  "sid": "18c5b75d-b8bd-400d-ac02-8cffa2906ad9",
  "state": "busy",
  "cwd": "/Users/me/Repos/email-trackerino",
  "title": "add retry logic to the webhook consumer",
  "pid": 78145,
  "ts": 1782900063,
  "started": 1782899938
}
```

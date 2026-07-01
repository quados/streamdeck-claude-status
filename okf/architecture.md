---
type: Architecture
title: System Architecture
description: End-to-end flow from Claude Code lifecycle hooks to Stream Deck key rendering.
tags: [architecture, dataflow, stream-deck, claude-code]
timestamp: 2026-07-01T00:00:00Z
---
# Overview

Three cooperating parts turn Claude Code lifecycle events into coloured Stream Deck keys:

1. [Hook helper](/hooks.md) - a shell script invoked by Claude Code hooks.
2. A status directory - one JSON file per session at `~/.claude/agent-status.d/`.
3. [Stream Deck plugin](/plugin.md) - a Node plugin that renders keys from that directory.

# Data flow

* Claude Code fires lifecycle hooks (see [Hook helper](/hooks.md) for the event->state mapping).
* Each hook runs `agent-status.sh`, which writes/updates `~/.claude/agent-status.d/<session_id>.json` (see [Status file schema](/status-file.md)) and sends `POST 127.0.0.1:37800` to the plugin for an instant repaint.
* The plugin reads every file in the directory, filters to live/recent sessions (see [State model](/state-model.md)), sorts them by project path, and paints one key per placed action.

# Design notes

* The status directory is the single source of truth; the HTTP POST is only a low-latency nudge. The plugin also polls every 5 s as a backstop and to advance elapsed timers.
* Liveness uses the process id captured by the helper (`kill -0`), with a staleness fallback. Because some frontends (e.g. Zed's ACP) keep a shared parent process alive, additional time-based expiry is applied - see [State model](/state-model.md).
* Rendering is pure SVG data URIs generated in the plugin; no image assets are needed at runtime.

# Citations

[1] [OKF specification](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
[2] [Claude Code hooks](https://docs.claude.com/en/docs/claude-code/hooks)

---
type: Component
title: Stream Deck Plugin
description: Node plugin that renders one Stream Deck key per live Claude Code session.
resource: file://com.eduard.claudestatus.sdPlugin/bin/plugin.js
tags: [stream-deck, plugin, node, rendering]
timestamp: 2026-07-01T00:00:00Z
---
# Overview

A Node plugin (built on `@elgato/streamdeck`) that watches the status directory
and paints one key per session. It fills the keys the user placed, left->right /
top->bottom, ordered by project path so a project keeps a stable slot.

# Behaviour

* **Refresh triggers**: an HTTP `POST` on `127.0.0.1:37800` (instant, sent by the
  [helper](/hooks.md)) plus a 5 s backstop poll that also advances elapsed timers.
* **Blink**: attention states (`perm`, `wait`) repaint every 700 ms alternating
  accent opacity. See [State model](/state-model.md).
* **Tap**: opens the session's `cwd` in Zed via the Zed CLI.
* **Hold** (~600 ms): deletes the [status file](/status-file.md), dismissing the key.
* **Duplicate guard**: if the push port is already bound, the instance exits so
  no zombie plugin lingers.

# Rendering

Each key is an SVG data URI: a dark rounded card with the repo name (bold), the
session name (wrapped), and a bottom row of `bar + dot + elapsed` in the state
colour, over a subtle state-tinted gradient.

# Configuration

Tunable constants at the top of `bin/plugin.js`: `COLOR`, `ATTENTION`, `IDLE`,
`STUCK`, `BLINK`, `LONG`, `PORT`, `CLI`. See the [setup playbook](/setup.md).

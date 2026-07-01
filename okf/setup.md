---
type: Playbook
title: Setup & Wiring
description: Steps to install the helper, link the plugin, and wire Claude Code hooks.
tags: [setup, install, playbook]
timestamp: 2026-07-01T00:00:00Z
---
# Prerequisites

* macOS with the Elgato Stream Deck app
* Claude Code
* `jq` and Node.js (`brew install jq node`)
* Zed (optional; only for tap-to-open)

# Install

```bash
git clone https://github.com/quados/streamdeck-claude-status.git
cd streamdeck-claude-status
./install.sh
```

This copies the [helper](/hooks.md) to `~/.claude/agent-status.sh`, installs the
[plugin](/plugin.md) dependencies, and links the plugin into Stream Deck.

# Wire the hooks

Merge `hooks/settings.snippet.json` into the `"hooks"` object of
`~/.claude/settings.json`. If an event already exists, append the
`agent-status.sh` command to that event's existing `hooks` array rather than
replacing it. Mapping is documented in [Hook helper](/hooks.md).

# Activate

```bash
osascript -e 'quit app "Elgato Stream Deck"'; sleep 3; open -a "Elgato Stream Deck"
```

Then drag **Custom -> Claude Code -> Agent Session** onto keys.

# Verify

```bash
# after sending a prompt in a Claude Code session:
ls ~/.claude/agent-status.d/     # a <session_id>.json file should appear
```

If no file appears, the hooks are not firing - recheck `settings.json` and that
`jq` is installed.

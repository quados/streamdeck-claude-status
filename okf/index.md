---
okf_version: "0.1"
---
# Claude Code Stream Deck — Knowledge Bundle

An [Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) description of the `streamdeck-claude-status` project: a bridge that surfaces live Claude Code session status on an Elgato Stream Deck.

# Concepts

* [Architecture](/architecture.md) - end-to-end flow from Claude Code hooks to Stream Deck keys
* [State model](/state-model.md) - session states, colours, blink behaviour, and expiry
* [Status file schema](/status-file.md) - the per-session JSON written by the helper
* [Hook helper](/hooks.md) - the shell bridge that emits status from Claude Code
* [Stream Deck plugin](/plugin.md) - the Node plugin that renders one key per session
* [Setup playbook](/setup.md) - install and wiring steps

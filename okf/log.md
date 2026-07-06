# Update Log

## 2026-07-06
* **Feature**: [Jean](https://jean.build) support. The [hook](/hooks.md) tags a session's `host` from `JEAN_SESSION_ID`, and the [plugin](/plugin.md) routes a tap per session - Jean sessions foreground the Jean app, everything else opens `cwd` in Zed. New [status-file](/status-file.md) `host` field.

## 2026-07-01
* **Initialization**: [Knowledge bundle created](/index.md) documenting the architecture, state model, and components.
* **Creation**: [State model](/state-model.md) split the single "wait" state into `perm` (permission) and `wait` (idle), added attention blink, elapsed time, and stuck-busy expiry.

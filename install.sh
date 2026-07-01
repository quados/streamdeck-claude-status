#!/usr/bin/env bash
# Installer for the Claude Code Stream Deck status plugin (macOS).
# Copies the status helper, installs plugin deps, and links the plugin into Stream Deck.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_SRC="$(echo "$REPO"/*.sdPlugin)"
PLUGIN_NAME="$(basename "$PLUGIN_SRC")"
CLAUDE_DIR="$HOME/.claude"
SD_PLUGINS="$HOME/Library/Application Support/com.elgato.StreamDeck/Plugins"

command -v jq   >/dev/null || { echo "Missing dependency: jq  (brew install jq)"; exit 1; }
command -v node >/dev/null || { echo "Missing dependency: node (brew install node)"; exit 1; }
command -v npm  >/dev/null || { echo "Missing dependency: npm"; exit 1; }
[ -d "$SD_PLUGINS" ] || { echo "Stream Deck not found. Install Elgato Stream Deck first."; exit 1; }

echo "▸ Installing status helper → $CLAUDE_DIR/agent-status.sh"
mkdir -p "$CLAUDE_DIR"
cp "$REPO/hooks/agent-status.sh" "$CLAUDE_DIR/agent-status.sh"
chmod +x "$CLAUDE_DIR/agent-status.sh"

echo "▸ Installing plugin dependencies (npm)"
( cd "$PLUGIN_SRC" && npm install --silent --no-audit --no-fund )

echo "▸ Linking plugin → Stream Deck"
LINK="$SD_PLUGINS/$PLUGIN_NAME"
rm -rf "$LINK"
ln -s "$PLUGIN_SRC" "$LINK"

cat <<EOF

✅ Helper + plugin installed.

Next steps:
  1. Add the hooks from  hooks/settings.snippet.json  to  ~/.claude/settings.json
     (merge into the "hooks" object; append to existing events instead of replacing them).
  2. Restart Stream Deck:
       osascript -e 'quit app "Elgato Stream Deck"'; sleep 3; open -a "Elgato Stream Deck"
  3. In Stream Deck, drag  Custom → Claude Code → Agent Session  onto as many keys as you want.

Then just use Claude Code (Zed or terminal) — a key lights up per active session.
EOF

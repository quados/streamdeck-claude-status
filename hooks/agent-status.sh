#!/usr/bin/env bash
# Claude Code -> Stream Deck status bridge.
# usage: agent-status.sh <busy|notify|perm|done|idle|end>   (reads hook event JSON on stdin)
# Writes one file per session to ~/.claude/agent-status.d/<session_id>.json and pokes the plugin.
dir="$HOME/.claude/agent-status.d"; mkdir -p "$dir"
PORT=37800
nudge(){ curl -s -m 1 -X POST "http://127.0.0.1:$PORT/" >/dev/null 2>&1 || true; }

json=$(cat)
sid=$(jq -r '.session_id // empty' <<<"$json"); [ -z "$sid" ] && exit 0
file="$dir/$sid.json"

state="$1"
[ "$state" = "end" ] && { rm -f "$file"; nudge; exit 0; }

# Notification fires both for permission prompts and 60s-idle -> split by message.
if [ "$state" = "notify" ]; then
  msg=$(jq -r '.message // empty' <<<"$json")
  case "$msg" in
    *permission*|*Permission*|*approve*|*Approve*|*allow*|*Allow*) state="perm" ;;
    *) state="wait" ;;
  esac
fi

cwd=$(jq -r '.cwd // empty' <<<"$json")

# preserve session name + turn-start time across events
prev_state=""; prev_started=""; title=""
if [ -f "$file" ]; then
  prev_state=$(jq -r '.state   // empty' "$file" 2>/dev/null)
  prev_started=$(jq -r '.started // empty' "$file" 2>/dev/null)
  title=$(jq -r '.title // empty' "$file" 2>/dev/null)
fi

# session name = first user prompt (stable identity for the key)
if [ -z "$title" ]; then
  p=$(jq -r '.prompt // empty' <<<"$json" | tr '\n\t' '  ')
  case "$p" in
    "" ) ;;              # no prompt on this event
    "<"* ) ;;            # injected block (<task-notification>, <system-reminder>, ...) - not a real name
    * ) title=$(printf '%s' "$p" | cut -c1-70) ;;
  esac
fi

now=$(date +%s)

# started = turn start (drives "busy 3m" elapsed); kept across a turn, cleared when not busy
started=""
if [ "$state" = "busy" ]; then
  if [ "$prev_state" = "busy" ] && [ -n "$prev_started" ]; then started="$prev_started"; else started="$now"; fi
fi

# grandparent of this script ~ the long-lived claude process (used for liveness)
cpid=$(ps -o ppid= -p "$PPID" 2>/dev/null | tr -d ' '); : "${cpid:=$PPID}"

jq -nc --arg s "$state" --arg cwd "$cwd" --arg title "$title" \
       --argjson pid "${cpid:-0}" --arg sid "$sid" --argjson ts "$now" --arg started "$started" \
  '{state:$s,cwd:$cwd,title:$title,pid:$pid,ts:$ts,sid:$sid}
   + (if $started=="" then {} else {started:($started|tonumber)} end)' > "$file"
nudge

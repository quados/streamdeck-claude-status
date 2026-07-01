#!/usr/bin/env bash
# Live view of Claude Code session status - useful for confirming which hooks
# fire in your setup (e.g. does a permission prompt in Zed produce state=perm?).
# Run this, then use Claude Code and watch the states change.
dir="$HOME/.claude/agent-status.d"
echo "watching $dir  (Ctrl-C to stop)"
prev=""
while true; do
  cur=""
  for f in "$dir"/*.json; do
    [ -e "$f" ] || continue
    cur+="$(jq -rc '{sid:.sid[0:8],state,age_s:(now - .ts | floor),cwd,title}' "$f" 2>/dev/null)"$'\n'
  done
  cur=$(printf '%s' "$cur" | sort)
  if [ "$cur" != "$prev" ]; then
    date +"%T"
    [ -z "$cur" ] && echo "  (no sessions)"
    [ -n "$cur" ] && printf '%s\n' "$cur" | sed 's/^/  /'
    prev="$cur"
  fi
  sleep 1
done

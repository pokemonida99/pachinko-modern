#!/bin/zsh
# usage: pj.sh <name> -> prints JS (no stderr)
python3 ~/.claude/skills/runninghub-h3/scripts/rh_prompt_js.py /Users/hermes/Public/0720/pachinko-modern/production/prompts/$1.txt 2>/dev/null | sed 's/\[ta.value.length, "" ? document.body.innerText.includes("") : null, /[ta.value.length, /'

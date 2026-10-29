---
name: compact-summary
description: Use when the user says "COMPACT" (any case, alone or as the main word of their message) or asks for a handoff summary to paste into a new chat. Summarizes the entire conversation into 5-7 copy-paste-ready bullets with all critical context, decisions and code. Not the built-in /compact command, which compresses context without producing a summary.
---

# COMPACT: handoff summary

When triggered, reply with **only** the summary block below: no preamble or closing remarks, and no tool calls unless a fact (a branch name, file path or commit hash) must be checked first.

## Rules

- **5-7 bullets total.** Merge related points rather than exceed 7.
- Cover the **whole** conversation, not just the latest turns.
- Every bullet must stand alone for a reader who saw none of the chat: name files, branches, URLs, versions, commands and people's choices explicitly. Never write "the above", "as discussed" or "that file".
- Prioritize, in order: the goal → decisions made (and rejected options with why) → current state/what's done → open blockers → next steps.
- Keep code snippets that someone would need to continue the work (config, commands, key functions). Trim them to the essential lines in fenced blocks under the bullet they belong to. Leave out snippets that are already committed and only need a path reference.
- Note anything that is in progress but uncommitted or unpushed.
- Leave out secrets, tokens and the user's personal data.

## Output format

Wrap everything in a single fenced `markdown` block so the user can copy it in one tap on mobile:

````
```markdown
# Context handoff: <project or topic>, <YYYY-MM-DD>

- **Goal:** ...
- **Decisions:** ...
- **Done so far:** ...
- **Key code/config:** ...
  ```lang
  ...
  ```
- **Blockers / gotchas:** ...
- **Next steps:** ...

Continue from here. Ask me before redoing anything listed as done.
```
````

The bullet labels above are a default; rename or merge them to fit the conversation, staying within 5-7 bullets.

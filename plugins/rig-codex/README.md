# Rig for Codex

This beta plugin records explicit Codex skill mentions such as
`$skill-creator` in Rig's local activity log.

## Install

```sh
codex plugin marketplace add builder-mafia/rig
codex plugin add rig-codex@rig
```

Start a new Codex session, run `/hooks`, review the Rig `UserPromptSubmit`
hook, and trust it. Codex stores trust against the exact hook definition, so a
changed hook must be reviewed again.

## What is recorded

The hook appends one JSON line per unique explicit `$skill` mention to:

```text
~/.rig/usage.jsonl
```

Each record contains the skill name, `codex` source, timestamp, explicit
tracking mode, session id, and working directory. It does not store the prompt
or skill contents.

This first beta does not infer implicit skill activation. Codex currently does
not expose a dedicated skill-use hook or the selected skill file path, so skills
with the same name share name-level activity in Rig.

Set `RIG_USAGE_DISABLED=1` to disable logging or `RIG_USAGE_LOG_PATH` to use a
different local log file.

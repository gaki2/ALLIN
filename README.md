# Rig

<p align="center">
  <img src="apps/rig/src-tauri/icons/icon.png" alt="Rig" width="112" />
</p>

<p align="center">
  <strong>Know which agent skills actually get used.</strong><br />
  A local-first macOS workspace for discovering, tracking, updating, sharing,
  and restoring Agent Skills across Claude Code, Codex, and OpenCode.
</p>

<p align="center">
  <a href="https://github.com/builder-mafia/rig/releases/latest">Download for macOS</a>
  ·
  <a href="https://github.com/builder-mafia/rig/actions/workflows/ci.yml">CI</a>
  ·
  <a href="https://github.com/builder-mafia/rig/blob/main/LICENSE">GPL-3.0</a>
</p>

## Why Rig

Skills quickly spread across agent folders and repositories. Duplicate names
become hard to distinguish, unused skills waste context, and remote skills can
drift without anyone noticing.

Rig turns those scattered `SKILL.md` files into one focused control plane. It
keeps the files where they already live and gives you the context needed to
decide what to keep, update, share, disable, or remove.

## What you can do

- **See every skill in context** — browse global and project skills, inspect the
  full instructions and file path, search their contents, and spot duplicate
  names without opening multiple folders.
- **Track real usage** — record which skill was called, when it was called, and
  which connected agent called it. Recent activity stays compact until you
  need the details.
- **Work across providers** — view Claude Code, Codex, and OpenCode skills
  together, or hide provider folders that would otherwise duplicate the list.
- **Update safely** — detect updates for globally installed GitHub skills and
  update them through the Skills CLI. Rig restores the previous files if an
  update fails validation.
- **Compare and restore versions** — Rig snapshots skills it updates or
  restores, shows readable diffs, and lets you return to a known-good version.
- **Share without zip files** — copy an `npx skills` install command when a
  remote source is known, or copy an AI-ready installation prompt containing
  the current skill content.
- **Manage in batches** — use Command/Ctrl-click or Shift-click to select
  multiple skills, then share, disable, or remove them together.
- **Switch projects directly** — add repository scopes beside **All skills**
  and show only the skills belonging to the selected project.

## Local by default

Rig reads skill files and usage events on your Mac. Usage integrations append
small JSONL events to:

```text
~/.rig/usage.jsonl
```

The tracking plugins do not store prompt text or skill contents. Disabling a
skill also keeps its files on disk so it can be restored later.

## Get started

### 1. Install Rig

1. Download the latest signed and notarized Apple Silicon build from
   [GitHub Releases](https://github.com/builder-mafia/rig/releases/latest).
2. Open the `.dmg` and drag **Rig** into Applications.
3. Launch Rig. Global skill folders are discovered automatically.
4. Use **Add project** in the header when you want a repository-specific view.

Rig checks GitHub Releases for signed application updates.

### 2. Connect the agents you use

Open **Settings → Agents**, copy the setup prompt for an agent, and paste it
into a new conversation with that agent. The prompt asks the agent to make the
minimum required configuration change and preserve the rest of your setup.

Manual setup is also available below.

#### Claude Code

```text
/plugin marketplace add builder-mafia/rig
/plugin install rig-claude-code@rig
```

Start a new Claude Code session after installation. Rig records native skill
calls made through the Claude Code plugin.

#### Codex

```sh
codex plugin marketplace add builder-mafia/rig
codex plugin add rig-codex@rig
```

Start a new Codex session, run `/hooks`, review the Rig `UserPromptSubmit`
hook, and trust it. Codex tracking is currently **Explicit tracking · Beta**:
it records explicit mentions such as `$skill-creator`, but does not infer
implicit skill activation. When multiple installed skills share a name, Codex
does not yet expose the selected file path, so activity is attributed by name.

#### OpenCode

Add `rig-opencode` to the existing plugin array in
`~/.config/opencode/opencode.json` without replacing your other settings:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["rig-opencode"]
}
```

OpenCode installs the npm plugin at startup and Rig records native `skill` tool
calls.

## Skill locations

Rig discovers these global locations automatically:

| Provider | Global skill directory |
| --- | --- |
| Codex / Agent Skills | `~/.agents/skills` |
| Claude Code | `~/.claude/skills` |
| OpenCode | `~/.config/opencode/skills` |
| Hermes | `~/.hermes/skills` |
| Cursor | `~/.cursor/skills` |

Imported repositories are scanned for the corresponding provider-local skill
folders, such as `.agents/skills`, `.claude/skills`, and `.opencode/skills`.
Removing a repository from Rig removes only the saved scope; it does not delete
the repository or its skill files.

## Development

### Requirements

- macOS
- Node.js 20+
- pnpm 9.6
- Rust stable
- Xcode Command Line Tools

### Run locally

```sh
pnpm install

# Tauri desktop app at localhost:3000
pnpm dev:app

# Website and docs at localhost:3001
pnpm dev:doc
```

### Verify changes

```sh
pnpm --filter @allin/ui build
pnpm --filter @allin/utils build
pnpm --filter desktop-app check-ts
pnpm --filter desktop-app test
pnpm --filter desktop-app lint
pnpm --filter docs build
cargo test --manifest-path apps/rig/src-tauri/Cargo.toml
```

Pull requests and pushes to `main` run the same web and Rust checks in GitHub
Actions. Vercel deploys the website after changes reach `main`.

## Releases

Tagged releases are built for Apple Silicon, signed with a Developer ID
certificate, notarized by Apple, and published with Tauri updater artifacts.
Versions use the Korea Standard Time release date in `YY.MDD.R` format; for
example, `v26.804.1` is the first release made on August 4, 2026.
See [the release guide](.github/RELEASE.md) for the required secrets and version
workflow.

## License

Rig is licensed under [GPL-3.0](LICENSE).

# Simple Workspace

A personal Herdr mod rebuilt from `git-changes`, `quota`, `space-groups` and
`space-groups-agents`. It combines Git tools, grouped spaces, an agent overview
and quota indicators in one package. Each section can occupy its own layout
block.

## Features

### Changes

- Stage and unstage files, write commits, amend and add signoffs.
- Browse commit history and stashes, and open diffs in reusable main-area tabs.
- Switch branches, fetch, pull, push and publish branches.
- Access discard, revert and stash actions through menus; dangerous menu
  actions require a second click to confirm.
- Keep the commit area above the file list and history.

### Spaces

- Organize spaces into named, collapsible groups.
- Drag spaces between groups and reorder groups within the same machine.
- Rename groups and move spaces through menus and dialogs.
- Keep local and remote machine groups separate: a group holds spaces from
  its own machine only.
- Add 4 logical pixels before expanded group members.

### Agents

- Switch between Priority, Grouped by space and Grouped by folder views.
- In Priority view, organize agents into Needs you, Done, Working and Idle.
- Pin agents for quick access and show elapsed time since status changes.
- Reflect urgent sub-agent states in their parent agent's priority.
- Keep a viewed Done agent in that section until you leave it.

### Quota

- Show Claude and Codex only, using `quota-axi --json`.
- Display 5-hour session limits in the bottom bar. Session windows without a
  reported duration are also included.
- Click quota indicators to see available limits, reset times and Refresh.
- Show percentages as **used quota**, including conversion from remaining
  percentages when the report provides them for independent limits.
- Refresh automatically every two minutes and when changing machines.
- Fill detail progress tracks between fixed-width labels and percentages.

Presentation is fixed; legacy `quota.options` do not control this UI. The CLI
may query additional providers internally, but the mod filters its report to
Claude and Codex.

## Requirements

| Dependency | Used for |
| --- | --- |
| Herdr with the mod APIs used by this package | Rendering, layout blocks, overlays, shared state and command execution. |
| Git available on the repository's machine | Changes actions and repository status in Spaces. |
| Herdr's `hc` command support | Existing workspace and machine actions. |
| `quota-axi` available on the selected machine | Quota reports for local or remote spaces. Provider access must be configured for that CLI. |
| PowerShell 7 (`pwsh`) on the local Windows machine | Reading the Herdr process start time for the session clock. |

The repository does not declare a minimum supported Herdr version. It contains
mod source and assets, with no dependency installation or build script.
The session clock currently uses a Windows process lookup; it has no native
macOS or Linux implementation.

## Setup and layout

1. Save a copy of your current Herdr layout and any existing
   `simple-workspace` package before replacing them.
2. Copy this entire directory, including its assets and license files, into
   your Herdr mods directory as `simple-workspace`. The previous README uses
   `~/.config/herdr-app/mods/simple-workspace`; use your configured mods
   directory if it differs.
3. In your Herdr layout, set each intended block's `content` to one of the
   examples below. Retain the surrounding block IDs, sizes and placement from
   your own layout.
4. Reload the mod or restart Herdr to load the updated package and layout.

The manifest uses `"place": "none"`, so copying the package alone does not add
its sections to the layout. These examples are **content values**, not complete
layout files:

**Changes** — repository panel:

```json
{ "mod": "simple-workspace", "props": { "section": "changes" } }
```

**Spaces** — spaces sidebar:

```json
{ "mod": "simple-workspace", "props": { "section": "spaces" } }
```

**Agents** — agent overview:

```json
{ "mod": "simple-workspace", "props": { "section": "agents" } }
```

**Quota** — bottom status bar, including the session clock:

```json
{ "mod": "simple-workspace", "props": { "section": "quota" } }
```

If `section` is omitted, the mod opens Changes. An unknown section raises an
error. Internal menu, dialog and diff props are forwarded to the selected
component; ordinary layout blocks do not need to set those props.

## App session clock

The clock beside quota displays `hh:mm:ss` since the local Herdr window
process started. It updates every second, includes background, minimized and
sleep time, and allows hours beyond 24.

Reloading the mod, switching spaces or selecting a remote machine does not
reset the process start time. Restarting the Herdr process resets it. Clicking
the clock does not open quota details.

The clock reads the start time through a fixed local `pwsh` command. It needs
exactly one visible `herdr-app` process. If that process cannot be identified,
or PowerShell fails, the clock shows `--:--:--`, explains the error in a tooltip
and retries every 30 seconds. Multiple visible Herdr processes are ambiguous.
It does not persist a timestamp across app restarts or add network access.

## State and updates

The mod retains shared-state names such as `space-groups`, `agents.sort` and
the sidebar preferences. Quota data and errors are cached separately for each
machine. Section preferences use localStorage keys such as `changes.signoff`,
`spaces.machines.folded`, `agents.changed` and `agents.pins`.

This repository does not include an installer, a migration script for old
mods' localStorage or a layout backup. Shared keys can reuse existing Herdr
state, but importing preferences from separately installed mods is not
automated here.

To roll back, restore your own saved layout and previous mod package. A layout
that references the original mods also requires those mods to remain installed.
Close and reopen diff tabs if they still reference the replaced package.

## Commands and access

The mod runs Git and Herdr workspace/machine actions, reads repository files
for previews, and invokes `quota-axi`. Git actions can modify repository state;
remote actions and the quota CLI may access the network.

Quota execution follows the selected space's machine. It first invokes
`quota-axi` directly, tries `cmd.exe` when command startup fails (for Windows
`.cmd` shims), and falls back to a login shell if needed. The session clock
always queries the local machine, independently of quota.

## Manual validation

Runtime validation of this rebuilt package has not been established here.
To check an installed copy yourself, run:

```sh
herdr-app check ~/.config/herdr-app/mods/simple-workspace
```

Adjust the path to your actual installation. The check does not cover all
deferred rows or asynchronous UI states. In Herdr, also exercise:

- Each section, its menus and dialogs, plus Changes diff tabs.
- Group dragging, renaming and local/remote machine separation.
- Agent sorting, pinning and status transitions.
- Quota refresh, details, reset times, command failure and machine switching.
- Clock second/minute/hour rollover, mod reload, minimize/restore and Herdr
  restart. Confirm the clock stays independent of the quota popup and errors.

## Source layout

| Path | Responsibility |
| --- | --- |
| `mod.json` | Package title and placement metadata. |
| `main.js` | Routes the `section` prop to the relevant component. |
| `changes/` | Git panel, history, diffs and menus. |
| `spaces/` | Group state, sidebar, menus and dialogs. |
| `agents/` | Agent views, sorting and pins. |
| `quota/` | Quota command execution, display and session clock. |
| `chrome/` | Shared workspace icons. |
| `gpui-kit.d.ts` and `jsconfig.json` | Local editor type support and JavaScript configuration. |

## Licenses and attribution

Original attribution comments are retained. The bundled Git Changes code
includes MIT, Apache-2.0 and ISC material; workspace chrome assets were copied
from Herdr's shipped `workspace-chrome` under Apache-2.0.

- [LICENSE](LICENSE): MIT license retained from Git Changes.
- [NOTICE](NOTICE): upstream attribution, including original upstream paths.
- [LICENSES](LICENSES): bundled dependency license texts.
- [Lucide icon license](changes/icons/LICENSE-lucide.txt): icon attribution.

Keep the relevant license notices and attribution when redistributing the mod.

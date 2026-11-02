# Herdr Mods

Personal Herdr mods rebuilt and customized for a compact workspace.

## Simple Workspace

[Simple Workspace](mods/simple-workspace/README.md) combines four sections into
one Herdr mod package:

| Section | Purpose |
| --- | --- |
| Changes | Git staging, commits, history, stashes, remote actions and reusable diff tabs. |
| Spaces | Local and remote spaces organized into groups, with drag-and-drop ordering. |
| Agents | Agent overview by priority, space or folder, with pinned agents. |
| Quota | Claude and Codex quota usage, reset details and a local Herdr session clock. |

The package runs inside Herdr using its mod APIs. Copy
[`mods/simple-workspace`](mods/simple-workspace) to your Herdr mods directory
under the name `simple-workspace`, then configure layout blocks to select the
sections you want. See the [setup guide](mods/simple-workspace/README.md#setup-and-layout)
for requirements, configuration examples and current limitations.

## Attribution

Simple Workspace bundles adaptations of `git-changes`, `quota`, `space-groups`
and `space-groups-agents`. Original attribution and license files are retained
in the package. See its [license notes](mods/simple-workspace/README.md#licenses-and-attribution)
before redistributing it.

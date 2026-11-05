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

## Simple To-do and Simple Tabs

[Simple To-do](mods/simple-todo/README.md) is a small, locally saved task list.
Create a task with the input and **Create** button (or Enter), check it to strike
through its text, and use **Clear all** to remove the entire list.

[Simple Tabs](mods/simple-tabs/README.md) adds a **To-do** button immediately
before **Files** in a clone of Herdr's tab bar. It opens the task list as a
dropdown popup. The list is shared across workspaces on this installation.
See the To-do setup guide to install both packages and connect the tab bar.

## Attribution

Simple Workspace bundles adaptations of `git-changes`, `quota`, `space-groups`
and `space-groups-agents`. Original attribution and license files are retained
in the package. See its [license notes](mods/simple-workspace/README.md#licenses-and-attribution)
before redistributing it.

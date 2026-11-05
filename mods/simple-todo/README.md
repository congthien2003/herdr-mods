# Simple To-do

A compact task-list popup for Herdr, independent of Simple Workspace.

- Type a task and click **Create**, or press Enter. Whitespace-only input is ignored.
- Check a task to mark it done and strike through its text; uncheck to undo.
- **Clear all** removes every task, including unfinished tasks, immediately.
- The list scrolls inside a 360 × 420 popup. Click outside or press Esc to close.
- Tasks save locally after changes and are shared across workspaces on this
  Herdr installation. They are not synchronized to other machines.
- Colors follow the current Herdr theme.
- The To-do button shows an unfinished-task count badge while the popup is
  closed. The badge is hidden when the popup is open or all tasks are done.

## Setup

1. Copy `mods/simple-todo` and `mods/simple-tabs` from this repository into your
   Herdr home's `mods/` directory, keeping those folder names. On this Windows
   installation the home is `C:\Users\pc\.config\herdr-app`.
2. Back up the personal layout you want to use. If starting from a shipped
   layout, clone it first; Herdr replaces shipped files when it starts.
3. In that personal layout's block with `id: "tabs"`, use:

   ```json
   {
     "id": "tabs",
     "type": "block",
     "content": { "mod": "simple-tabs" },
     "size": { "px": 42 },
     "window_drag": true
   }
   ```

4. Select the personal layout. Its **To-do** button appears directly before
   **Files**. The popup's right edge aligns with the button; Herdr handles
   available screen space. The button remains available if Files is disabled.

The installed `simple-workspace` layout is configured this way. Neither the
shipped `tabs` mod nor the shipped `main` layout needs to be edited.

## Storage

The mod uses Herdr's persisted `shared` / `setShared` state, under key
`simple-todo.items.v1`. Each task contains an ID, text and done flag. Every
popup reads the same list; updates also trigger a render. Herdr persists
shared state independently of the popup's lifetime. There is no network,
backend or polling. `localStorage` is unsuitable here because Herdr gives
each popup copy a separate store.

For recovery from the earlier localStorage version, the installed data folder
may contain `data/simple-todo/recovered-items-v1.json`: a JSON array of tasks
collected from the old `store*.json` files, deduplicated by ID. On first open,
the mod imports this file only if the shared key is absent. A saved empty list
is preserved, so **Clear all** never triggers a second import. The old store
files are kept intact; personal recovery files are not included in this repo.
If saved data cannot be read, the popup shows an error and leaves it intact;
**Clear all** explicitly replaces it with an empty list.

## Manual validation

These commands are provided for the user to run; they have not been run as
part of this implementation:

```powershell
herdr-app check "$env:USERPROFILE/.config/herdr-app/mods/simple-todo"
herdr-app check "$env:USERPROFILE/.config/herdr-app/mods/simple-tabs"
```

In the app, check opening and dismissing the popup, creating tasks (including
blank input), checking and unchecking, scrolling long lists, reopening after
changing workspace or restarting, and clearing the list. Also check Files,
Changes and existing tab controls still work. A mod check only validates the
initial render; it does not establish that these interactions work.

For the count badge, check that it is hidden while the popup is open, returns
after Esc or clicking outside, and reflects creating, checking, unchecking and
clearing tasks. With no unfinished tasks, it should remain hidden. Restarting
the app should show the count again when the popup is closed.

# Simple Tabs

A personal clone of Herdr's shipped `tabs` mod, created with `mod.clone` from
version `0.1.13`. It retains the original tab bar, Files/Changes controls and
window buttons, and adds **To-do** immediately before **Files**.

The new button opens `simple-todo` as a dropdown popup using its mouse-down
bounds, so the popup sits below the button rather than at the pointer.
When the popup is closed, a small badge shows the number of unfinished tasks.
The badge is hidden while the popup is open or when no tasks remain.
The included Windows button icons belong to this clone's asset paths.

Install alongside [Simple To-do](../simple-todo/README.md) and point the `tabs`
block in a personal layout to `simple-tabs`. This is a snapshot of the shipped
tab bar; future Herdr tab-bar updates are not automatically merged into it.

See the To-do README for setup, storage behavior and manual validation.

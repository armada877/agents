# plan-view

`plan-view <file.md>` shows a Markdown plan.
It publishes the plan to the herdr-core doc store, so that herdr-office can
show it.
It opens a window only when `PLAN_VIEW_WINDOW=1` is set, or when it cannot
publish.

`plan-view --close <file.md>` marks the plan as closed in the doc store.
It also closes the window of the plan.

## Settings

- `PLAN_VIEW_WINDOW`: set to `1` to always open a window.
- `HERDR_CORE_SOCKET`: path of the herdr-core socket.
- `HC_SESSION`: session name. The default socket is
  `$XDG_RUNTIME_DIR/herdr-core/$HC_SESSION.sock`. The default session is
  `default`.

## Skip list

Some plans must not go to the doc store. List them in
`${XDG_CONFIG_HOME:-$HOME/.config}/plan-view/skip`.

- Write one absolute path in each line. A line can start with `~/`.
- Empty lines and lines that start with `#` are ignored.
- A plan is skipped when its real path is the listed path or is inside it.
- A missing file means no skips.
- If the file cannot be read, or a line is not absolute, plan-view does not
  publish.

For a skipped plan, plan-view prints one line to stderr and opens the window.
`--close` does not use the skip list.

## Docs

- `plan-<id>`: the plan. Fields: `title`, `source`, `markdown`, `updated`,
  `open`. The id is the first 12 characters of the SHA-256 of the real path.
- `plans`: a list of plan ids, newest first.
  A closed plan is removed 7 days after its last update.

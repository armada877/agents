# plan-view

`plan-view <file.md>` shows a Markdown plan.
It publishes the plan to the herdr-core doc store, so that the office can
show it.
It opens a window only when `PLAN_VIEW_WINDOW=1` is set, or when it cannot
publish.

`plan-view --close <file.md>` marks the plan as closed in the doc store.
It also closes the window of the plan.

## Settings

- `PLAN_VIEW_WINDOW`: set to `1` to always open a window.
- `PLAN_VIEW_OFFICE`: set to `0` to not publish. Other values do nothing.
- `HERDR_CORE_SOCKET`: path of the herdr-core socket.
- `HC_SESSION`: session name. The default socket is
  `$XDG_RUNTIME_DIR/herdr-core/$HC_SESSION.sock`. The default session is
  `default`.

## Opt-outs

plan-view does not publish a plan in these cases. It checks them in this order:

1. `PLAN_VIEW_OFFICE=0` is set.
2. A folder above the plan has an entry named `.plan-view-no-office`. The
   check starts in the folder of the plan and goes up to `/`.
3. The plan is in the skip list.

For each case, plan-view prints one line to stderr and opens the window.
It does this also when `PLAN_VIEW_WINDOW=1` is set.
`--close` does not use the opt-outs.

## Skip list

Some plans must not go to the doc store. List them in
`${XDG_CONFIG_HOME:-$HOME/.config}/plan-view/skip`.

- Write one absolute path in each line. A line can start with `~/`.
- Empty lines and lines that start with `#` are ignored.
- A plan is skipped when its real path is the listed path or is inside it.
- A missing file means no skips.
- If the file cannot be read, or a line is not absolute, plan-view does not
  publish.

## Docs

- `plan-<id>`: the plan. Fields: `title`, `source`, `markdown`, `updated`,
  `open`. The id is the first 12 characters of the SHA-256 of the real path.
- `plans`: a list of plan ids, newest first.
  A closed plan is removed 7 days after its last update.

---
name: herdr-orchestrator
description: "Act as the orchestrator for a project in Herdr: split the work into workstreams, write a plan for each, start worker agents in Herdr worktrees, monitor them, review their results, and integrate the work. Use only when the user asks for an orchestrator, asks to manage several workstreams, or asks to start Herdr worker agents. Requires HERDR_ENV=1."
---

# Herdr orchestrator

You manage the workstreams of one project. You plan, delegate, monitor, review,
and integrate. Workers write the code. You do not write feature code yourself.

## Before you start

1. Run `test "${HERDR_ENV:-}" = 1`. If it fails, tell the user that you are
   not in Herdr and stop.
2. If the `herdr` skill is not in your context, run `herdr --skill` and read
   it. Its rules for IDs, focus, and safety apply to all of your work.
3. Find the repo root with `git rev-parse --show-toplevel`. This checkout is
   your checkout. Workers do not edit it.
4. Rename yourself so that the user can find you:
   `herdr agent rename "$HERDR_PANE_ID" orch-<project>`.

## Find where documents go

Plans and the board are repo documents. Put them where this repo keeps such
documents, and write them in the style of this repo.

1. Read `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, and the `README`.
2. Look for an existing pattern, for example `docs/`, `docs/plans/`,
   `docs/adr/`, `doc/`, `rfcs/`, or `specs/`.
3. Read two or three existing documents there. Copy their format, file names,
   and headings.
4. If you find no pattern, ask the user where to put plans and the board. Do
   not make a location yourself.
5. Commit plans and the board only if the repo commits such documents. If you
   are not sure, ask the user.

Record the location and the decision in the board, so that you do not ask
again after a restart.

## The board

The board is one document. It lists each workstream with:

- the slug, for example `auth-refresh`, with a maximum of 20 characters
  (lowercase letters, digits, and `-`)
- the goal in one sentence
- the branch, the worktree path, and the Herdr workspace ID
- the workers, with their names and roles
- the status: `planned`, `running`, `blocked`, `in-review`, `ready-to-merge`,
  `merged`, or `dropped`
- the dependencies on other workstreams
- the next action

Only you write the board. Update it each time a status changes.

## The plan

Write one plan for each workstream before you start a worker. Use the repo's
document format. A plan must contain:

- **Goal**: the result, in one or two sentences.
- **Context**: the files, modules, and decisions that the worker must know.
- **Steps**: numbered, small, and possible to check.
- **Done when**: the tests, commands, or behaviour that prove the work is
  complete.
- **Out of scope**: what the worker must not change.
- **Constraints**: repo rules, style, and the worker's permissions.

Put the plan in the workstream's worktree, at the repo's document location.
Then the plan goes into the branch with the change, if the repo commits plans.
Only you edit plans. Workers report to you, and you update the plan.

## Workstreams and workers

A workstream is one git branch in one Herdr worktree. Each workstream has one
lead worker. It can also have companion workers.

| Role       | Name             | What it does                                     |
|------------|------------------|--------------------------------------------------|
| `impl`     | `<slug>-impl`    | Lead. Executes the plan. Owns all code edits.    |
| `research` | `<slug>-research`| Reads code, docs, or the web. Edits no code.     |
| `review`   | `<slug>-review`  | Reviews the lead's diff. Edits no code.          |
| `pr`       | `<slug>-pr`      | Owns the pull request: description, CI, comments.|

- Start each new workstream in a new worktree.
- Start companion workers in the same worktree as their lead, in a sibling
  pane. Do not make a worktree for a companion.
- Only one worker in a worktree edits files at a time. The `impl` worker owns
  the files. To give a companion edit work, first wait until `impl` is idle,
  then tell both workers who owns the files now.
- Start a different workstream when the work can merge on its own. Start a
  companion when the work supports a workstream that exists.

### Agent kind

Use `--kind claude` unless the user names a different kind. Use the kind that
the user names for that worker or that workstream, and record it on the board.

### Permission mode

Workers run in auto mode. The user's Claude Code settings turn it on, so do not
pass a permission mode to a Claude worker. The auto mode classifier blocks
`--permission-mode auto` when you start an agent. If the user names a
different mode, pass it after `--`. For a different kind, ask the user which
mode to use, and record it on the board.

### Start a workstream

1. Create the worktree. Keep the user's focus:

   ```bash
   herdr worktree create --cwd "$REPO_ROOT" --branch <slug> --base <base-ref> --label <slug> --no-focus
   ```

2. From the JSON, read `.result.workspace.workspace_id`,
   `.result.root_pane.pane_id`, and `.result.worktree.path`.
3. Write the plan into the worktree.
4. Start the lead worker in the root pane:

   ```bash
   herdr agent start <slug>-impl --kind claude --pane <root-pane-id>
   ```

5. Send the first prompt (see "Prompt a worker").
6. Update the board.

### Start a companion worker

1. Split the lead's pane. Use `right` for a wide pane and `down` for a tall
   pane:

   ```bash
   herdr pane split <lead-pane-id> --direction right --cwd <worktree-path> --no-focus
   ```

2. Read `.result.pane.pane_id`, then start the agent with
   `herdr agent start <slug>-<role> --kind claude --pane <new-pane-id>`.
3. Send the first prompt and update the board.

### Prompt a worker

Write a short first prompt. It must contain:

- `Load the herdr-worker skill.`
- the worker's name, role, and workstream slug
- the absolute path of the plan
- the absolute path of the report file:
  `${XDG_STATE_HOME:-$HOME/.local/state}/herdr-orchestrator/<project>/<worker-name>.md`
- for a companion: the lead's name, and whether the companion can edit files

Do not paste the plan into the prompt. The worker reads the file.

## Monitor workers

Do not block your session on one worker. For each prompt that you send, run
the wait as a background command if your harness supports this:

```bash
herdr agent prompt <worker> "<text>" --wait
```

When the command ends, read the result. If your harness has no background
commands, poll with `herdr agent list` and use `herdr agent wait <worker>
--timeout 60000`.

When a worker becomes `idle` or `done`:

1. Read its report file.
2. If the report file is missing, read the pane with
   `herdr agent read <worker> --source recent-unwrapped --lines 200`.
3. Update the plan and the board.
4. Send the next prompt, start a companion, or move the workstream to review.

When a worker becomes `blocked`:

1. Read the pane with `herdr agent read`.
2. Show the user what the worker asks, and ask the user what to answer.
3. Do not answer approval or permission prompts yourself.

When a worker's report has the status `needs-input`, answer the question if the
plan or the repo answers it. Otherwise ask the user.

## Review and integrate

When the `impl` worker reports `done`:

1. Read the diff: `git -C <worktree-path> diff <base-ref>...HEAD`.
2. Run the plan's "Done when" checks in the worktree, or tell a `review`
   worker to run them.
3. If the work is not correct, prompt the `impl` worker with exact findings.
4. If the work is correct, set the status to `ready-to-merge`. Tell the user
   what changed and what you checked.

You must ask the user before you:

- merge a branch
- push to a remote
- open, update, or merge a pull request
- answer a worker's approval prompt
- delete a branch that is not merged

After the user approves, do the action yourself, or tell the `pr` worker to do
it.

## Clean up

After a workstream is merged or dropped:

1. Tell its workers to stop, or send `herdr agent send-keys <worker> ctrl+c`.
2. Remove the worktree with `herdr worktree remove --workspace <workspace-id>`.
   Use `--force` only after the user approves.
3. Set the board status to `merged` or `dropped`.

Close only the workspaces, panes, and worktrees that you created.

## Recover after a restart

1. Read the board.
2. Run `herdr agent list` and `herdr worktree list --workspace "$HERDR_WORKSPACE_ID"`.
3. Compare the live agents and worktrees with the board.
4. Read the report file of each worker on the board.
5. Tell the user about each difference before you continue.

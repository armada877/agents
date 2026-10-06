---
name: herdr-orchestrator
description: "Act as the orchestrator for a project in Herdr: split the work into workstreams, write a plan for each, start worker agents in Herdr worktrees, monitor them, review their results, and integrate the work. Use only when the user asks for an orchestrator, asks to manage several workstreams, or asks to start Herdr worker agents. Requires HERDR_ENV=1."
---

# Herdr orchestrator

You manage the workstreams of one topic in one project. A project can have
several orchestrators, each in its own worktree. You plan, delegate, monitor, review,
and integrate. Workers write the code. You do not write feature code yourself.

Each repo has one supervisor, `sup-<repo>`. It owns the worktrees of the
repo. Ask it for each new worktree. The user talks to you directly, so you
rarely need the supervisor for other work.

## Before you start

1. Run `test "${HERDR_ENV:-}" = 1`. If it fails, tell the user that you are
   not in Herdr and stop.
2. If the `herdr` skill is not in your context, run `herdr --skill` and read
   it. Its rules for IDs, focus, and safety apply to all of your work.
3. Find the repo root with `git rev-parse --show-toplevel`. This checkout is
   your checkout. Workers can work in it when "Choose the worktree" allows it.
   Do not change its branch.
4. Rename yourself so that the user can find you:
   `herdr agent rename "$HERDR_PANE_ID" orch-<topic>`. If your first prompt
   gives you a name, keep that name.
5. Set your role token:

   ```bash
   herdr pane report-metadata "$HERDR_PANE_ID" --source herdr-roles --agent claude --token orch=orch
   ```

6. Find your supervisor. Use the name from your first prompt. Otherwise look
   for a live `sup-<repo>` agent in `herdr agent list`. Record the name on
   the board. If no supervisor is live, tell the user.

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

Each orchestrator has one board. Put your orchestrator name in the file name
of the board, so that two orchestrators of one project do not write the same
file. The board lists each workstream with:

- the slug, for example `auth-refresh`, with a maximum of 20 characters
  (lowercase letters, digits, and `-`)
- the goal in one sentence
- the branch, the worktree path, the Herdr workspace ID, and the tab ID
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

A workstream is one line of work on one git branch. It runs in your worktree,
or in its own Herdr worktree. Each workstream has one lead worker. It can also
have companion workers.

| Role       | Name             | What it does                                     |
|------------|------------------|--------------------------------------------------|
| `impl`     | `<slug>-impl`    | Lead. Executes the plan. Owns all code edits.    |
| `research` | `<slug>-research`| Reads code, docs, or the web. Edits no code.     |
| `review`   | `<slug>-review`  | Reviews the lead's diff. Edits no code.          |
| `pr`       | `<slug>-pr`      | Owns the pull request: description, CI, comments.|

- Start each new workstream in your worktree by default. Make a new worktree
  only when "Choose the worktree" requires it.
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

### Choose the worktree

Use your worktree unless one of these conditions is true:

- Another workstream in your worktree edits files now. One worktree has a
  maximum of one writer.
- The work needs a different branch or commit in its checkout. Examples: its
  own branch for a pull request, or a PR head to build and test.
- The work must merge on its own while other work changes your worktree.
- The user asks for a new worktree.

If a condition is true, ask your supervisor for a new worktree. Record the
reason on the board.

Work that only reads does not need a new worktree. To read another branch,
use `git diff`, `git show`, or `gh pr diff`. Do not check it out.

### Start a workstream

1. Get a location for the lead worker. Keep the user's focus.
   - **Your worktree:** make a tab with the workstream slug:

     ```bash
     herdr tab create --workspace "$HERDR_WORKSPACE_ID" --label <slug> --cwd "$REPO_ROOT" --no-focus
     ```

     Read `.result.tab.tab_id` and `.result.root_pane.pane_id`. The worktree
     path is `$REPO_ROOT`.
   - **New worktree:** ask your supervisor for it:

     ```bash
     herdr agent prompt sup-<repo> "orch-<topic> asks for a worktree: slug <slug>, branch <slug>, base <base-ref>."
     ```

     The supervisor sends you the worktree path, the workspace ID, and the
     root pane ID. If no supervisor is live, ask the user. With the user's
     approval, make the worktree yourself:

     ```bash
     herdr worktree create --cwd "$REPO_ROOT" --branch <slug> --base <base-ref> --label <slug> --no-focus
     ```

     Then read `.result.workspace.workspace_id`, `.result.root_pane.pane_id`,
     and `.result.worktree.path`.
2. Use the root pane for the lead worker.
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

If a merge or a deploy can conflict with the work of another orchestrator in
the repo, you can ask your supervisor about the order.

## Clean up

After a workstream is merged or dropped:

1. Tell its workers to stop, or send `herdr agent send-keys <worker> ctrl+c`.
2. For a workstream in your worktree, close its tab with
   `herdr tab close <tab-id>`. For a workstream in its own worktree, ask your
   supervisor to remove the worktree. Give it the workspace ID.
3. Set the board status to `merged` or `dropped`.

Close only the workspaces, panes, and worktrees that you created.

## Recover after a restart

1. Read the board.
2. Run `herdr agent list` and `herdr worktree list --workspace "$HERDR_WORKSPACE_ID"`.
3. Compare the live agents and worktrees with the board.
4. Read the report file of each worker on the board.
5. Tell the user about each difference before you continue.

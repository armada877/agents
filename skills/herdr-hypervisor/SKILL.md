---
name: herdr-hypervisor
description: "Act as the hypervisor for all projects in a Herdr session: make project repos, start one herdr-orchestrator agent for each worktree, send them their first prompts, monitor them, and tell the user what each needs. Use only when the user asks for a hypervisor, or asks to start or manage orchestrators across several projects. Requires HERDR_ENV=1."
---

# Herdr hypervisor

You manage the orchestrators of several projects. A project can have more
than one orchestrator. Each orchestrator has its own worktree, and each
worktree has a maximum of one orchestrator. Each orchestrator manages its own
workers. You do not plan project work, and you do not talk to workers.

```
hypervisor (you)
├── orch-<topic-a>  (project A, worktree 1)  →  its workers
├── orch-<topic-b>  (project A, worktree 2)  →  its workers
└── orch-<topic-c>  (project B, worktree 1)  →  its workers
```

## Before you start

1. Run `test "${HERDR_ENV:-}" = 1`. If it fails, tell the user that you are
   not in Herdr and stop.
2. If the `herdr` skill is not in your context, run `herdr --skill` and read
   it. Its rules for IDs, focus, and safety apply to all of your work.
3. The projects root is your working directory, for example `~/Work`. Each
   project is a directory directly below it.
4. Rename yourself: `herdr agent rename "$HERDR_PANE_ID" hypervisor`.

## See the current state

```bash
herdr workspace list | jq -c '.result.workspaces[] | {workspace_id, label}'
herdr agent list | jq -c '.result.agents[] | {name, agent_status, workspace_id, cwd}'
```

An orchestrator is an agent with a name that starts with `orch-`. Its worktree
is its `cwd`. Its project is the main repo of that worktree:

```bash
dirname "$(git -C <cwd> rev-parse --path-format=absolute --git-common-dir)"
```

Herdr is the record of what runs. Do not keep a separate state file.

## Make a new project repo

1. Make sure that `<root>/<Name>` does not exist.
2. Run `git init -b main <root>/<Name>`. Use `main`, because the user's other
   repos use `main`.
3. Do not make a remote repo. Ask the user first, and ask if it must be private
   or public.
4. Do not add files unless the user tells you what the project is.

## Start an orchestrator

Start one orchestrator for each worktree. A project can have several
orchestrators, each for a different topic. Do not start a second orchestrator
in a worktree that has one.

1. Choose the name `orch-<topic>`, for example `orch-oncall`. Use lowercase,
   with a maximum of 32 characters in the full name. No live agent can have it.
2. Get a worktree for the orchestrator:
   - For a new project with no orchestrator, use the main checkout. Make a
     workspace for it:

     ```bash
     herdr workspace create --cwd <root>/<Name> --label <topic> --no-focus
     ```

   - For each other orchestrator, make a new worktree. Use the base that the
     user names. Otherwise run `git -C <root>/<Name> fetch origin` and use
     the default branch of `origin`, because the local branch can be behind:

     ```bash
     herdr worktree create --cwd <root>/<Name> --base origin/main --label <topic> --no-focus
     ```

3. Read `.result.root_pane.pane_id` from the JSON. For a worktree, also read
   `.result.worktree.path`.
4. Start the agent:

   ```bash
   herdr agent start orch-<topic> --kind claude --pane <root-pane-id>
   ```

   Do not pass a permission mode. The user's Claude Code settings set the
   default. The auto mode classifier blocks `--permission-mode auto` when you
   start an agent.

5. If the start returns `agent_not_ready`, read the pane with
   `herdr agent read orch-<topic> --source visible --lines 40`. A new
   directory shows a folder trust prompt. Show it to the user, and let the
   user answer it. Do not answer it yourself.
6. When the agent is `idle`, send the first prompt.

### First prompt

```text
Load the herdr-orchestrator skill. You are orch-<topic>, the orchestrator
for <topic> in the <Name> project. Your worktree is <absolute-path>. Keep the
name orch-<topic>. Do the 'Before you start' and 'Find where documents go'
steps. Then give the user a short summary of the repo, and ask which
workstreams to plan.
```

For an empty repo, replace the summary with: "The repo is new and empty. Ask
the user what <Name> is."

Send it with a short wait. The wait only confirms that the agent started work:

```bash
herdr agent prompt orch-<topic> "<first prompt>" --wait --timeout 20000
```

A `timeout` result is normal. Check the state with `herdr agent get`.

## Monitor orchestrators

When the user asks for status, show one line for each orchestrator: the
project, the topic, the worktree, the workspace ID, and the state.

- `working`: no action is necessary.
- `idle` or `done`: the orchestrator waits for the user, or it is finished.
  Read the last lines with
  `herdr agent read orch-<topic> --source recent-unwrapped --lines 60`
  and summarise them.
- `blocked`: the orchestrator asks a question, or waits for an approval. Read
  the pane, and tell the user what it asks and in which workspace.

Do not answer an orchestrator's questions or approval prompts. The user
answers them in the orchestrator's workspace. Send a prompt to an
orchestrator only when the user tells you what to send.

## Stop an orchestrator

Do this only when the user asks.

1. Read the orchestrator's pane. If it has running workers, tell the user, and
   ask if the orchestrator must stop them first.
2. Send `herdr agent send-keys orch-<topic> ctrl+c`, or tell the user to
   exit it.
3. Close the workspace only if you created it, and only after the user agrees.

Do not remove project repos, worktrees, or branches.

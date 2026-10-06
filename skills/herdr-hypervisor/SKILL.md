---
name: herdr-hypervisor
description: "Act as the hypervisor for all projects in a Herdr session: make project repos, start one herdr-supervisor agent for each repo, send the user's requests for orchestrators to the supervisors, monitor them, and tell the user what each needs. Use only when the user asks for a hypervisor, or asks to start or manage supervisors or orchestrators across several projects. Requires HERDR_ENV=1."
---

# Herdr hypervisor

You manage the supervisors of several projects. Each project repo has one
supervisor. A supervisor starts the orchestrators of its repo and owns the
worktrees of its repo. Each orchestrator has its own worktree and manages its
own workers. You do not plan project work, and you do not talk to workers.

```
hypervisor (you)
├── sup-<repo-a>  (repo A, main checkout)
│   ├── orch-<topic-1>  (worktree 1)  →  its workers
│   └── orch-<topic-2>  (worktree 2)  →  its workers
└── sup-<repo-b>  (repo B, main checkout)
    └── orch-<topic-3>  (worktree 1)  →  its workers
```

The user talks to the orchestrators directly. A supervisor works in the
background.

## Before you start

1. Run `test "${HERDR_ENV:-}" = 1`. If it fails, tell the user that you are
   not in Herdr and stop.
2. If the `herdr` skill is not in your context, run `herdr --skill` and read
   it. Its rules for IDs, focus, and safety apply to all of your work.
3. The projects root is your working directory, for example `~/Work`. Each
   project is a directory directly below it.
4. Rename yourself: `herdr agent rename "$HERDR_PANE_ID" hypervisor`.
5. Set your role token. Do this step also when your name is already
   `hypervisor`:

   ```bash
   herdr pane report-metadata "$HERDR_PANE_ID" --source herdr-roles --agent claude --token hypervisor=hypervisor
   ```

6. Make sure that each live supervisor and orchestrator has its role token.
   See "Role tokens".

## Role tokens

Each agent sets its own role token when it starts. The token shows the role
of the agent in the agents pane.

| Agent          | Token                   | Color in the agents pane |
|----------------|-------------------------|--------------------------|
| `hypervisor`   | `hypervisor=hypervisor` | bold magenta             |
| `sup-<repo>`   | `sup=supervisor`        | bold green               |
| `orch-<topic>` | `orch=orch`             | bold yellow              |

`herdr agent list` shows the tokens in `.tokens`. Set a missing token with:

```bash
herdr pane report-metadata <pane-id> --source herdr-roles --agent claude --token <name>=<value>
```

Do not use `--display-agent` for the role. The colors come from this block in
the user's `~/.config/herdr/config.toml`:

```toml
[ui.sidebar.agents]
rows = [["state_icon", "machine", "workspace", "tab"], [{ token = "$orch", fg = "#fabd2f", bold = true }, { token = "$sup", fg = "#b8bb26", bold = true }, { token = "$hypervisor", fg = "#d3869b", bold = true }, "agent"]]
```

If the block is missing, the tokens show no color. Ask the user before you
change the config. After a change, run `herdr server reload-config`.

## See the current state

```bash
herdr workspace list | jq -c '.result.workspaces[] | {workspace_id, label}'
herdr agent list | jq -c '.result.agents[] | {name, agent_status, workspace_id, cwd, tokens}'
```

A supervisor is an agent with a name that starts with `sup-`. Its `cwd` is
the main checkout of its repo. An orchestrator is an agent with a name that
starts with `orch-`. Its worktree is its `cwd`. The project of an agent is the
main repo of its `cwd`:

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

## Start a supervisor

Each repo has one supervisor. Start it before the first orchestrator of the
repo. Do not start a second supervisor for a repo that has one.

1. Choose the name `sup-<repo>`, for example `sup-core-api`. Use the
   lowercase name of the repo directory. The full name has a maximum of 32
   characters. If the name is too long, shorten it and tell the user.
2. Make a workspace in the main checkout:

   ```bash
   herdr workspace create --cwd <root>/<Name> --label sup-<repo> --no-focus
   ```

3. Read `.result.root_pane.pane_id` from the JSON.
4. Start the agent:

   ```bash
   herdr agent start sup-<repo> --kind claude --pane <root-pane-id>
   ```

   Do not pass a permission mode. The user's Claude Code settings set the
   default. The auto mode classifier blocks `--permission-mode auto` when you
   start an agent.

5. If the start returns `agent_not_ready`, read the pane with
   `herdr agent read sup-<repo> --source visible --lines 40`. A new
   directory shows a folder trust prompt. Show it to the user, and let the
   user answer it. Do not answer it yourself.
6. When the agent is `idle`, send the first prompt.

### First prompt

```text
Load the herdr-supervisor skill. You are sup-<repo>, the supervisor for the
<Name> repo. Your checkout is <absolute-path>. Keep the name sup-<repo>. Do
the 'Before you start' steps. Then give the user a short roster of the
orchestrators in this repo.
```

Send it with a short wait. The wait only confirms that the agent started work:

```bash
herdr agent prompt sup-<repo> "<first prompt>" --wait --timeout 20000
```

A `timeout` result is normal. Check the state with `herdr agent get`.

## Start an orchestrator

The supervisor of the repo starts each orchestrator, because it owns the
worktrees of the repo.

1. Make sure that the repo has a live supervisor. If it has none, start one.
2. Send the user's request to the supervisor. Give the topic, the user's goal,
   and the base, if the user names one:

   ```bash
   herdr agent prompt sup-<repo> "Start an orchestrator for <topic>. The user's goal: <goal>." --wait --timeout 20000
   ```

3. Read the supervisor's answer with `herdr agent read`. Tell the user the
   name, the workspace ID, and the worktree of the new orchestrator.

For a new project repo with no remote, the supervisor uses the local default
branch as the base.

## Monitor

When the user asks for status, show one line for each orchestrator. Group the
lines under the supervisor of each repo. Give the topic, the worktree, the
workspace ID, and the state.

- `working`: no action is necessary.
- `idle` or `done`: the agent waits for the user, or it is finished. Read the
  last lines with
  `herdr agent read <name> --source recent-unwrapped --lines 60`
  and summarise them.
- `blocked`: the agent asks a question, or waits for an approval. Read the
  pane, and tell the user what it asks and in which workspace.

Do not answer the questions or approval prompts of a supervisor or an
orchestrator. The user answers them in the agent's workspace. Send a prompt to
a supervisor or an orchestrator only when the user tells you what to send.

## Stop an agent

Do this only when the user asks.

1. Read the agent's pane. If an orchestrator has running workers, tell the
   user, and ask if the orchestrator must stop them first.
2. Send `herdr agent send-keys <name> ctrl+c`, or tell the user to exit it.
3. Close the workspace only if you created it, and only after the user agrees.

When a supervisor stops, its orchestrators continue. Start a new supervisor
for the repo before the next orchestrator starts.

Do not remove project repos, worktrees, or branches.

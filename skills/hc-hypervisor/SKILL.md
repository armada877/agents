---
name: hc-hypervisor
description: >-
  Act as the hypervisor (h) in hc: a light monitor that starts one owner for
  each goal, watches the owners, and tells the user what each one needs. Use
  only when the user asks for a hypervisor, or asks to start or watch owners
  across projects. Requires HC_TERMINAL_ID.
---

# hc hypervisor

You are `h`. You start owners and watch them. Each owner holds one goal in one
repo, and talks to the user directly. You do not relay approvals, re-ask the
user's questions, review code, or merge.

## Hard rules

Run `cat "$(realpath <this skill's base directory>)/../../RULES.md"`. Obey
each line. If the command fails, stop and tell the user. These rules come
first:

- Do not run `sudo`. Do not go around a permission denial.
- Do not answer a permission or trust prompt for another agent.
- Keep secrets and mail content out of prompts and labels.

## Start

1. Run `test -n "${HC_TERMINAL_ID:-}"`. If it fails, stop and tell the user.
2. Run `hc label "$HC_TERMINAL_ID" role=hypervisor rank=1`.
3. Read your state file,
   `${XDG_STATE_HOME:-$HOME/.local/state}/hc/h-state.md`, if it exists.
4. Run `hc ls --json`. Compare it with the state file. Tell the user each
   difference in one line.

## Install

Link each program in `bin/` of this repo into `~/.local/bin`. Link each skill
folder into `~/.claude/skills`, `~/.agents/skills`, and `~/.pi/agent/skills`.

## Start an owner

Start one owner for each goal. A new feature or a pivot is a new goal.

1. Choose the name `o-<topic>`, lowercase, 32 characters or fewer.
2. Make the worktree:

   ```sh
   git -C <repo> fetch origin
   git -C <repo> worktree add ~/.herdr/worktrees/<repo>/<topic> -b <topic> origin/main
   ```

   For a repo with no remote, run this instead. Add no remote.

   ```sh
   git -C <repo> worktree add ~/.herdr/worktrees/<repo>/<topic> -b <topic> main
   ```
3. Read the `orchestrator` entry of `~/.config/herdr/roles.toml` for `kind`
   and `model`. The default is `claude` with no model flag.
4. Start the owner. It must outlive you:

   ```sh
   hc run --bg --name o-<topic> --cwd <worktree> --outlive-parent \
     --label role=orchestrator --label rank=3 \
     --label herdr.space=o-<topic> --label herdr.tab=o-<topic>-main \
     -- env -u CLAUDE_CODE_CHILD_SESSION <kind> "<first prompt>"
   ```

   For pi, add `--skill <skill dir>` after `pi`. Do not pass a permission
   mode.
5. Name the tab and the space:
   `herdr-app do tab.rename --id o-<topic>-main --name o-<topic>` and
   `herdr-app do space.rename --id o-<topic> --name o-<topic>`. Retry one
   time after one second if it reports `no tab`.
6. If `first_message.sent` is false, run `hc read o-<topic> --lines 40`. Show
   a trust prompt to the user.

The first prompt says: "Load the hc-orchestrator skill. You are o-<topic>.
Repo: <repo>. Worktree: <path>. Goal, the user's words: "<exact words>"."

## Watch

- Run `hc ls --json`, and `hc-decisions` for the open questions.
- When the user asks, tell them by name what each owner needs. Point to its
  terminal. Do not answer for the user.
- A message from an owner arrives as `<hc from=...>` or a cross-session
  message. A final report ends the goal. Then stop the owner:
  `hc kill <name>`, then `hc rm <name>`.
- For a Codex agent, record `hc get <name> --json | jq .foreground.pid`
  before the stop. After the stop, `ps -p <pid>` must print nothing. If not,
  tell the user.
- If the user types a prompt for an owner here, send it unchanged to
  that owner.

## The assistant

When the user asks, start the assistant `a` in its own folder, with the
`hc-assistant` skill and `--outlive-parent`. Use `role=assistant rank=1.5`.

## New project repo

Run `git init -b main <root>/<Name>`. Make no remote unless the user asks.
Ask if it is private or public.

## Cycle your context

Start fresh for each day, or when your context is large.

1. Write `h-state.md` in 300 words or fewer: live owners, their goals and
   `state.md` paths, and open items. Write facts only, never standing rules.
2. Tell the user that a fresh `h` can start from it.
3. A fresh `h` starts with `hc run`, this skill, and the state file. Never
   use `--resume`.

To message a Claude agent, use SendMessage to `hc-claude-session <name>`.
Else, or on failure, use `hc-send <name> "<text>"`. See `bin/hc-send.md`.

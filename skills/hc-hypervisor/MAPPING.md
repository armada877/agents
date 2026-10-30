# herdr → hc command map

The hc skills are copies of the herdr skills in `~/.claude/skills/herdr-*`.
They run on herdr-core (`hc` 0.1.14) and the Herdr desktop app (`herdr-app`),
not on the `herdr` terminal multiplexer. Verified on this Mac on 2026-10-30.

## Environment

| herdr | hc |
| --- | --- |
| `test "${HERDR_ENV:-}" = 1` | `test -n "${HC_TERMINAL_ID:-}"` |
| `$HERDR_PANE_ID` | `$HC_TERMINAL_ID` (an address such as `t7`) |
| `$HERDR_WORKSPACE_ID` | `$(hc get "$HC_TERMINAL_ID" --json \| jq -r '.labels["herdr.space"]')` |
| `herdr --skill` | `hc --skill` (terminals and agents) and `herdr-app --skill` (spaces, tabs, panes) |

## Agents and terminals

| herdr | hc |
| --- | --- |
| agent name | `--name` on `hc run`. 1-32 of `a-z 0-9 - _`, unique among live terminals. hc has **no rename**: set the name at start. |
| `herdr agent list` | `hc ls --json` → `.terminals[] \| {address, name, agent, cwd, state, labels}` |
| `herdr agent get <n>` | `hc get <n> --json` → `.status.state` is `idle`, `working`, `done`, `blocked`, `error`, or null (no report yet). `.state` is `live` or `finished`. `.foreground.pid` is the program's pid. |
| `herdr agent read <n> --source recent-unwrapped --lines N` | `hc read <n> --lines N` (plain text) |
| `herdr agent prompt <n> "<text>"` | `hc send <n> "<text>"`; add `--wait` to wait for that turn |
| `herdr agent wait <n>` | `hc wait <n>` (default 180 s check-in; `--timeout S`) |
| `herdr agent send-keys <n> ctrl+c` | `hc interrupt <n>` (stop the turn) or `hc keys <n> ctrl+c` |
| stop an agent (`/exit`) | `hc kill <n>`. `hc send` delivers a tagged message, so `/exit` sent with it does not run. The Claude session stays on disk for `claude --resume`. |
| `herdr agent start <n> --kind claude --pane <p> -- <args>` | `hc run --bg --name <n> --cwd <dir> --label ... -- claude <args> "<first prompt>"`. The last argument is the first message. Use `--outlive-parent` when the agent must survive its starter (supervisors, orchestrators). Workers stay children of their orchestrator (the default), so they end with it. |
| `herdr agent rename` | Not available. Use `--name` at start. |
| Cursor agent | `hc run ... -- cursor-agent <args>` (status reports from Cursor are not verified) |
| `herdr-send <n> "<text>"` | `hc-send <n> "<text>" [--timeout ms]`: waits until the agent is idle or done and its input box is empty, then sends |
| `herdr-claude-session <n>` | `hc-claude-session <n>` prints the SendMessage address; `--id` prints the session ID for `claude --resume` |
| Child reports | A child that runs `hc send $PARENT "<report>"` arrives as `<hc from="t7 name">…</hc>`. hc also notifies a parent when a child blocks, errors, or exits. `hc wait --children any` waits for the next news. |

## Spaces, tabs, and roles

| herdr | hc / herdr-app |
| --- | --- |
| workspace | app **space**. A terminal with label `herdr.space=<id>` shows in that space. An id the app does not know becomes a new space. |
| tab | app **tab**: label `herdr.tab=<id>`. A new id becomes a new tab in the space. Name each tab after its agent: `herdr-app do tab.rename --id <tab-id> --name <agent-name>` after `hc run`. The app does not do it. |
| `herdr workspace create --cwd D --label L` | No separate step. Start the agent with `--cwd D --label herdr.space=<L> --label herdr.tab=<L>-main`. Optional name: `herdr-app do space.rename --id <L> --name <L>`. |
| `herdr tab create` (worker tab) | Workers are pane-less: start them with no `herdr.space` or `herdr.tab` label. The app shows them under their parent's tab. |
| orchestrator space | An orchestrator is a tab in its supervisor's space: `--label herdr.space=<supervisor's space> --label herdr.tab=<orch-name>`. The app reads these labels only when it first sees a terminal; changing them later does not move a live tab. |
| `herdr tab close` | `hc kill <n>` ends the program; the app closes its pane. `hc rm <n>` removes a finished terminal. |
| `herdr worktree create` | `git -C <repo> worktree add <path> -b <branch> origin/<base>`; path under `~/.herdr/worktrees/<repo>/` |
| `herdr workspace list` | `herdr-app ls` |
| `herdr pane split` | `herdr-app do pane.split --direction right --argv '[...]'` |
| `herdr pane report-metadata --token role=... --token rank=N` | labels at start: `--label role=<hypervisor\|supervisor\|orchestrator\|worker> --label rank=<1-4>`; later: `hc label <n> role=... rank=...` |
| `herdr server reload-config` | Not needed. The app reloads files in `~/.config/herdr-app` by itself. |
| agents pane view | The app's layouts and the `agents` mod. Find role and rank with `hc ls --label role=supervisor`. |

## Trust prompt

`hc run` returns `first_message.sent`. If it is false, read the terminal. A
folder trust prompt needs the user. Do not answer it yourself.

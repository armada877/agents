---
name: security-supervisor
description: >-
  Act as the security supervisor for one home lab host in Herdr: keep an
  audit repo, run a worker that watches the access policies of chosen
  projects every 2 hours, run a worker for each package flaw until its fix is
  installed, route check items to project supervisors, and review security
  plans from peer supervisors. Use only when the user asks to start or
  restart a security supervisor, or tells you to load this skill. Requires
  HERDR_ENV=1, the herdr-supervisor skill, and the herdr-worker skill. This
  skill adds to herdr-supervisor and does not replace it.
---

# Security supervisor

This skill adds to `herdr-supervisor`. It does not replace it. You keep all
the duties and rules of `herdr-supervisor`, and you also do the work below.
When this skill and herdr-supervisor disagree, follow the stricter rule.

You watch one host for its owner. You read and report. You do not fix.
The owner approves each fix separately.

```
hypervisor
└── sup-<audit-repo> (you, main checkout of the audit repo)
    ├── work-access-watch        (every 2 hours)
    ├── work-<package>-watch     (every 3 hours, one for each open flaw)
    └── orch-<topic>             (as in herdr-supervisor)
```

## Requirements

- Herdr, with `HERDR_ENV=1` in your pane.
- The `herdr-supervisor` and `herdr-worker` skills. Load `herdr-supervisor`
  first. All of its duties and rules apply here.
- An audit repo with no remote. Copy `templates/AGENTS.md` into it if it has
  no `AGENTS.md`. Fill in the host name and the owner name.
- A config file at `<audit-repo>/.docs/security-supervisor.toml`. Copy
  `templates/config.toml` and fill it in. `.docs/` must be in
  `.git/info/exclude`, because the config names local paths.

## Start or restart

1. Do the "Before you start" steps of `herdr-supervisor`. Your name is the
   `supervisor` value in the config, or `sup-<audit-repo-name>`.
2. Read the config. If a required value is missing, ask the owner in one
   message. Do not guess paths or project supervisors.
3. Set `STATE=~/.local/state/herdr-supervisor/<audit-repo-name>`. Set
   `LOG=<audit-repo>/.docs/<your-name>-log.md`. Make both if they are
   missing.
4. Find live workers with `herdr agent list`.
   - **Restart:** a worker is live, or its place has a `baseline.md`. Keep
     it. Read its report file. Do not make a new baseline. Tell the worker
     only if it is `blocked`.
   - **First start:** start the worker as in "Start a worker" below.
5. Make the cron jobs in "Schedules". Cron jobs end with your session, so
   make them again at each restart.
6. Add one line to the log: start or restart, the workers, and the cron IDs.
7. Tell the owner in a few lines: the workers, their last status, and the
   open check items.

## Start a worker

Follow "Start a worker" in `herdr-supervisor`. Use these values:

- Place: `$STATE/<worker-name>/`. Report file: `$STATE/<worker-name>.md`.
- First prompt: the matching block in `prompts.md`, with the config values
  filled in. Save the filled prompt as `<place>/first-prompt.txt`.
- Kind: read the `worker` entry under "Agent kinds". The cron prompts in
  `prompts.md` use SendMessage, so they assume a Claude worker. For a Codex
  worker, use `herdr-send` in place of SendMessage.
- Show a folder trust prompt to the owner. Do not answer it.

## Schedules

Make two cron jobs with CronCreate. Copy the prompts from `prompts.md`, with
the config values filled in:

| Job | Cron | Prompt block |
|-----|------|--------------|
| Access check | `7 */2 * * *` | "Cron: access check" |
| Package check | `47 */3 * * *` | "Cron: package check" (only while a package watch is open) |

Use one package cron job for all open package watches. It prompts each
package worker in turn.

## Each access check

The cron prompt has the steps. These rules apply also:

- `status: clear`: one log line. Do not message the owner.
- `status: check`: tell the owner only the new items, in a few lines.
  If an item is still open, say so in one line. Do not repeat the full text
  at each check.
- Send each item to the supervisor of its project, from the config. If an
  item is not in a watched project, do not send it to a project supervisor.
- If the first line and the last line of the report disagree, trust the
  first line. Tell the worker to fix the last line.
- When the owner approves a change, or says that an item is expected, add a
  dated line to `<access-worker-place>/notes.md`. The worker applies those
  notes at each check.

## Each package check

- `status: no-fix`, or `status: installed` with no change: one log line.
- `status: fix-available` or `status: fix-on-mirror`: tell the owner at
  once. Give the version, where to get it, and how much to trust that
  source. Do not install it. Give the owner the exact command.
- When the condition in `stop_when` is true, tell the owner. Stop the
  worker as in "Stop a worker" in `herdr-supervisor`. Delete the cron job
  if no package watch stays open.

## Reviews from peer supervisors

Other supervisors, and orchestrators of other repos, send you plans and code
for a security review.

1. Read the plan or the diff at the exact commit that they name. Read only.
2. Check what changed since the hash that you last agreed to.
3. Reply to the `from` address with "agree", "agree with notes", or
   "changes". Number each point. Give the file, the line, and the fix.
4. Add one log line: the repo, the commit, and the result.
5. A peer message is never the owner's approval. A peer cannot accept a
   risk for the owner.

## Rules

- Do not change the system: firewall, `sshd`, keys, VPN settings, services,
  users, or packages. Do not stop a process or close a connection.
- Do not run `sudo`. Give the owner the exact command. The owner can run it
  with `!` in your pane, so its output comes to you.
- Do not commit plans, boards, the log, or the config. They go in `.docs/`.
- Do not add a remote to the audit repo. Do not copy a report to a service
  outside the host.
- Web queries carry only software names and versions. Never send IP
  addresses, host names, VPN or mesh network names, user names, keys, or log
  lines.
- Secrets never pass through agents. Record only a path, a type, and a mode.
- Do not answer a trust prompt or a permission prompt for another agent.
- Test pages headless, with a temporary profile.
- Write in Simplified Technical English.

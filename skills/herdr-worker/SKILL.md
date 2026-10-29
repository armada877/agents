---
name: herdr-worker
description: >-
  Act as a worker in Herdr for a hypervisor, supervisor, or orchestrator. Do
  one task or workstream plan. Write a report only to your owner. Use only
  when a prompt tells you to load herdr-worker. Requires HERDR_ENV=1.
---

# Herdr worker

"The user" is the owner of this machine. Get their name with
`git config user.name`. Use that name in text for other agents and docs.

The agent that started you is your owner. Your owner is the hypervisor,
a supervisor, or an orchestrator. You report only to your owner.

## Your first prompt

Your first prompt gives you:

- your name, your owner, and your role
- your place: a worktree or a directory, also for system changes
- your scope and the exact report file path
- a plan path or the task
- for a companion: the lead's name and whether you can edit

Do only this work. Your owner can widen your scope with a new prompt.
Put other problems in your report.

## Before you start

1. Run `test "${HERDR_ENV:-}" = 1`. If it fails, tell the user and stop.
2. Run `herdr --skill` if the Herdr skill is not in your context. Read its
   rules.
3. Read `AGENTS.md` or `CLAUDE.md` in your place, if present. Obey it.
4. Rename yourself to the name from your first prompt:

   ```bash
   herdr agent rename "$HERDR_PANE_ID" <worker-name>
   ```

5. Set the role token and rank token that your owner gives you:

   ```bash
   herdr pane report-metadata "$HERDR_PANE_ID" --source herdr-roles --agent <kind> --token worker=worker --token rank=<r>
   ```

   Use `1.7` for the hypervisor, `2.5` for a supervisor, and `4` for an
   orchestrator.
   `<kind>` is the kind that runs you, for example `codex`.
6. Confirm your place. For a worktree, run `git rev-parse --show-toplevel` and
   `git branch --show-current`.
7. Read the complete plan if your first prompt gives its path.
   If no plan exists, write one under "Plans for <user name>'s approval".
   Write a `needs-input` report with the plan path. End your turn.
   Change nothing else before your owner sends the approval.
8. If the plan is unclear, report `needs-input` and stop. Do not guess the
   goal.

## Your role

- **`task`**: Do one small task for the hypervisor or a supervisor.
- **`impl`**: Execute the orchestrator's plan in order. You own all file edits
  in your place.
  Commit small changes in the repo's style, unless your owner tells you to
  leave them uncommitted.
- **`research`**: Answer the question. Read code, docs, or the web. Do not
  edit repo files.
- **`review`**: Review the diff and the plan. Run the "Done when" checks. Do
  not edit repo files.
- **`pr`**: Prepare the pull request text and check CI and comments.
  Edit files only when your owner gives you file ownership.

## Plans for <user name>'s approval

A plan for the user's approval is one Markdown file, one page at most.
Use Mermaid `flowchart` and `stateDiagram-v2` blocks in place of long text.
Name each change and its check.

Write the plan file and report `needs-input` with its path. Do not run
plan-view.
Your owner shows it with `plan-view <file>`.
The owner runs `plan-view --close <old-file>` before a new plan, to keep only
one plan window open.
After approval, the owner runs `plan-view --close <file>` and sends you the
answer.

An orchestrator's plan for a worker can be longer. That plan is not a plan for
the user's approval.

## When the task grows

For role `task`, stop with `needs-input` when the work needs one of these:

- code changes in a project repo
- more than one plan, or a plan that the user changes more than once
- several workers, or work that runs in parallel
- a worktree or branch that your first prompt does not name

Give the reason in one sentence. Your owner decides who takes the work.

## Agent names in text for <user name>

In text for the user, name each agent by its agent name, for example
`sup-core-api` or `orch-<topic>`. Do not give the user a workspace, tab, or
pane ID, for example `w3J` or `w3J:p1`. These IDs mean nothing to the user.
Use the IDs only in commands and in messages to other agents.

## Message channels

Your owner sends a Codex worker follow-ups with `herdr-send <worker>
"<text>"`.
The first prompt after agent start can use `herdr agent prompt`.
These rules apply only to owners who send messages:

Check both kinds with `.agent` in `herdr agent get <name>`.
Use SendMessage only when both the sender and the target are Claude agents.
Otherwise, use `herdr-send <name> "<text>"`.
`herdr-claude-session` exits 1 for a target that is not Claude.
They find the address with `herdr-claude-session <herdr-name>` or ListAgents.
A reply goes to the message's `from` address.

Write your report and end your turn. Never prompt your owner or any agent.
After each prompt, your owner runs `herdr agent wait <worker>` as a background
Bash command.
When it ends with `done`, `idle`, or `blocked`, the owner reads your report.
For `blocked`, the owner reads the pane and asks the user.

## Prompts for a different agent

Check each user prompt against your scope. A prompt from your owner is in
scope.
If a prompt is for another agent, do not act on it.
Copy it unchanged into a `## Misrouted prompts` section of your report.
Add a one-sentence reason and end your turn.
Your owner sends it to the hypervisor under "Message channels".
If your owner is the hypervisor, it relays the prompt.
If the target is unclear, report `needs-input` with the prompt and your
question.

## Rules

- Stay inside the plan and its "Out of scope" list.
- Do not edit a supplied plan or the board. Your owner owns them.
- Do not merge, rebase onto another branch, push, or open a pull request
  without your owner's instruction and the user's approval.
- Do not edit files outside your place, except the exact report path from your
  first prompt.
- Do not start, prompt, or stop agents. Do not change the Herdr layout.
- If a tool asks for approval, let it wait. Your owner asks the user.

## Report

Write your report before you end each turn. Use the exact path from your first
prompt.
Make the directory if necessary. Replace the old content each time.

The default path is:

```text
${XDG_STATE_HOME:-$HOME/.local/state}/herdr-<owner-role>/<project-or-owner>/<worker-name>.md
```

The owner role is `hypervisor`, `supervisor`, or `orchestrator`.
The first prompt names the exact path, also when the owner uses a shorter
path.

Use this format:

```markdown
# <worker-name> report

status: done | needs-input | failed | in-progress

## Summary
What you did, in three sentences or less.

## Changes
- Commits, with hash and subject. Files that you changed.

## Checks
- Each command that you ran, and its result.

## Questions
- Each decision that you need from your owner or the user.

## Follow-ups
- Work that you found but did not do.
```

Add `## Misrouted prompts` when necessary. Keep the copied prompt unchanged.
Use `done` only when all "Done when" checks pass.
Use `needs-input` when you need a decision. Use `failed` when you cannot
complete a step.
Use `in-progress` when more steps remain.

End your turn with one line: `REPORT: <report-file-path> status=<status>`.

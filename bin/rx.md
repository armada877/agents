# rx

`rx` runs agents in Rex terminals and watches them. It replaces the parts
of `hc` that the agent skills use. It calls the `rex` CLI. It needs Rex
0.1.0-preview.25 or later. `[test: rex whoami, preview.25]`

## Concepts

- A terminal is one Rex block. `$REX_BLOCK` is your address.
- A name, for example `w-fix`, is unique among live terminals.
- `rx run --new-session` makes a Rex session with the same name. Use it for
  owners. Workers open as tabs in the session of the caller.
- The terminal that runs `rx run` is the parent. A child ends when its
  parent ends, unless you give `--outlive-parent`.
- Rex keeps one text label for each block. `rx` keeps the other labels,
  the parent, and the notes in a registry:
  `${XDG_STATE_HOME:-$HOME/.local/state}/hc/rx/agents/<block>.json`, mode 600.
- Status comes from the OSC 7501 reports of the program, as in hc.
  `[code: rex docs build/program-status]` Plain programs report no status.

## Commands

```sh
rx run --name w-fix --cwd <dir> --label role=worker -- claude "<task>"
rx run --name o-topic --new-session --outlive-parent --cwd <dir> -- claude "<task>"
rx ls [--all] [--label role=hypervisor]
rx get <t>
rx read <t> [--lines N]
rx send <t> "<text>"
rx keys <t> down enter
rx wait <t> [--output X] [--timeout S]
rx wait --children any|all [--timeout S]
rx label <t> decision="<one line>" decision-kind=approval
rx kill <t>; rx rm <t>
rx decisions
rx claude-session <t> [--id]
```

`<t>` is a name, a full block ID, or `me`. Output is JSON, except `read`,
`decisions`, and `claude-session`. Errors are JSON on stderr. Exit codes:
3 not found, 7 needs target, 9 blocked, 10 name taken, 11 finished,
12 still live, 124 timeout.

`rx run` gives the program `RX_NAME`, `RX_PARENT`, and `RX_ROLE` (the
`role` label). Rex does not pass the environment of the caller to the new
terminal. `[test: rex run probe, 2026-11-27]` One command string with a
space runs through `sh -c`.

## Send

`rx send` waits until the status is `idle` or `done`, and the input box is
empty, for two checks in a row. Then it pastes the text and presses Enter.
A user draft holds the message. A plain program gets the text at once.
`rx send` refuses a `blocked` agent unless you give `--force`. The default
timeout is 600 seconds.

`rx send` blocks the caller until the target is `idle` or `done`.
The caller stays `working` during this wait.
An `rx wait` on the caller can time out with exit code 124.
`[test: owner to h, 2026-11-28]`

It wraps the text in a tag: `<rx from="o-topic">text</rx>`. A message to
your own child also has `reach="rx send <you> when done or stuck"`. A
sender with no rx name uses its block ID. `--raw` sends the text without a
tag.

## Wait

- `rx wait <t>` returns when the status is `idle`, `done`, `blocked`, or
  `error`, or when the program exits. With `--output X`, it returns when
  `X` appears again after the wait starts.
- `rx wait --children all` returns when no child is working.
  `--children any` returns at the next change: a child stops working, is
  `blocked` or `error`, or exits.
- A new terminal counts as working until it reports `working`, `done`,
  `blocked`, or `error`, for 90 seconds at most. This covers the startup
  `idle` of an agent before its first turn.
- `rx wait` polls each second. A turn shorter than one poll can stay
  hidden until the 90-second limit ends. `[test: bin/test-rx]`
- The default timeout is 180 seconds. A timeout is a check-in. Wait again.
- Unlike `hc wait`, a message to you does not end the wait.

## Watcher

`rx run` starts `rx watch` in the background if it does not run. One
watcher runs for each state folder. It polls every two seconds. It logs to
`.../hc/rx/watch.log`. It stops after 30 minutes with no live terminal.

- When a child becomes `blocked` or `error`, or exits, the watcher queues a
  note for the parent: `<rx from="rx" about="w-fix">...</rx>`. It sends the
  notes when the parent is ready, as `rx send` does. `--no-notify` stops
  the notes for that child.
- When a parent ends, the watcher closes each child that has no
  `--outlive-parent`.
- When the last block of a session from `--new-session` closes, `rx`
  closes the session.
- Rex closes a block when its program exits. Then the exit code is lost.
  The note says only "exited".

## Messages between agents

- To send to a Claude agent, use the Claude tool SendMessage.
- To send to Codex or pi, use `rx send`.
- A script cannot use SendMessage. It uses `rx send`.
- If SendMessage fails, use `rx send`.

SendMessage uses the Claude session name, for example `dark-motion-7d`.
Run `rx claude-session <t>` to get it. The tool reads the session file of
the process that reported the status. It fails if the terminal does not
run Claude.

A reply comes back as `<cross-session-message from="...">`. Send the reply
to the `from` name.

SendMessage puts the message in the inbox of the session. The session
reads it at its next tool round or when it is idle. A session in a
different permission mode can hold a message for its user. A
`[Cross-session delivery notice]` then arrives. Use `rx send` or tell the
user. A message to a session that ended fails. Check `rx ls` before a
resend.

The SendMessage tests in this file before the port (2026-11-11) used hc.
They do not depend on the terminal. `[unverified]` with Rex.

## Limits

- Any process of your user can type into a Rex terminal. The tag is a
  convention, not a proof of the sender.
- `rx` has no `exec`, `file`, `put`, or `--on`. For another machine, use
  `rex -S <host>` and `rex cp`.
- `rx` does not resume programs after a reboot. The rules forbid
  `--resume` for goals.

## Checks

Run `bin/test-rx`. The tests use a fake Rex and a temporary state folder.

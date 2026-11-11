# Messages between agents

## Rule

- To send to a Claude agent, use the Claude tool SendMessage.
- To send to Codex, to pi, or from a script, use `hc-send`.
- If SendMessage fails, use `hc-send`.

## Address

SendMessage uses the Claude session name, for example `dark-motion-7d`.
`ListAgents` shows these names. It does not show hc names.

Run `hc-claude-session <hc name>` to get the session name. The tool reads the
session file of the terminal's foreground process. It fails if the terminal
does not run Claude.

A reply comes back as `<cross-session-message from="...">`. Send the reply to
the `from` name.

## Why SendMessage first

`hc-send` waits until the agent is idle and its input box is empty. It fails
with a timeout when a dialog stays open or the user typed a draft. It fails
with "terminal not found" when the terminal is gone.

SendMessage puts the message in the inbox of the session. The session reads
it at its next tool round or when it is idle.

## Test, 2026-11-11

A Claude test agent opened an AskUserQuestion dialog. Its status was
`blocked`.

1. SendMessage returned success. The dialog stayed open and did not change.
2. After the dialog closed, the agent read the message and acted on it.
3. The agent was idle with the text `draft` in its input box. SendMessage
   returned success. The agent read the message. The draft stayed in the box.

## Limits

- A session in a different permission mode can hold a message for its user.
  A `[Cross-session delivery notice]` then arrives. Use `hc-send` or tell the
  user.
- A message to a session that ended fails. Check `hc ls` before a resend.

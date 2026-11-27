# hc-owner-guard

This Claude `PreToolUse` hook keeps owners from editing files in a git
worktree with `Edit`, `Write`, or `NotebookEdit`. Bash is outside its scope.
The hook does not replace the owner skill rules.

## Input and result

The program reads one JSON object from standard input. It reads
`hook_event_name`, `tool_name`, `tool_input`, and `cwd`.
`Edit` and `Write` use `file_path`. `NotebookEdit` uses `notebook_path`.
Relative paths use `cwd`, or the process directory when `cwd` is absent.

The program reads the terminal from `HC_TERMINAL_ID`. It uses `hc_label.py`
to read the role label with `/usr/bin/hc get <terminal> --json`.
Only the exact role `orchestrator` activates the guard.

The guard checks the path and its resolved symlink target. It checks parent
folders for `.git` files or folders. It verifies each candidate with
`/usr/bin/git rev-parse --is-inside-work-tree`. It removes `GIT_*` variables
from that command. New files and linked worktrees have the same protection.

The guard permits `state.md` under
`${XDG_STATE_HOME:-$HOME/.local/state}/hc`, including its subfolders.
Both paths must meet this exception when a symlink is present. Each path
can match the lexical or resolved state root.
It permits other paths outside worktrees and tools outside the matcher.

A denied call returns JSON with `hookSpecificOutput`, `hookEventName` set to
`PreToolUse`, and `permissionDecision` set to `deny`. The reason tells the
owner to send the change to a build worker. The exit code is zero.
Allowed calls produce no output and exit zero.

Missing labels, failed lookups, invalid input, and path errors produce no
output. This hook permits calls when it cannot check them. Each subprocess
has a two-second timeout. The program reads the complete JSON input. Large
content fields do not skip the role and path checks. Memory use grows with
the input size. A missing label module produces no output and exits zero.

## Settings

Install the program beside `hc_label.py`. Add this entry to Claude settings.
Replace the command with the installed program's absolute path.
Merge the entry with existing hooks. This repo does not change settings.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write|NotebookEdit",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/bin/hc-owner-guard"
          }
        ]
      }
    ]
  }
}
```

## Checks

Run `bin/test-hc-owner-guard`. The tests use temporary git worktrees and fake
hc output. Run `bin/test-blocked-hooks` after changes to `hc_label.py`.

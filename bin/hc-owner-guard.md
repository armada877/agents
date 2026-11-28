# hc-owner-guard

This Claude `PreToolUse` hook keeps owners from editing files in a git
worktree with `Edit`, `Write`, or `NotebookEdit`. Bash is outside its scope.
The hook does not replace the owner skill rules.

## Input and result

The program reads one JSON object from standard input. It reads
`hook_event_name`, `tool_name`, `tool_input`, and `cwd`.
`Edit` and `Write` use `file_path`. `NotebookEdit` uses `notebook_path`.
The guard expands a target only when it equals `~` or starts with `~/`.
It keeps `~user` as a literal path part.
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

## Private allow list

The guard reads `${XDG_CONFIG_HOME:-$HOME/.config}/hc/owner-guard-allow`.
A relative `XDG_CONFIG_HOME` uses `$HOME/.config` instead.
Keep private paths in this local file. Do not add them to this repo.
Use one absolute glob pattern per line. A leading `~/` expands to `HOME`.
The guard removes leading and trailing whitespace. It skips blank lines,
comment lines that start with `#`, and relative patterns.

The guard uses `fnmatch` rules for each path part. `*` does not cross `/`.
Both the lexical path and the resolved target must match an entry.
Each path can match a different entry.
A report path through a symlink needs entries for both paths.
A missing or unreadable file adds no paths.

The guard always denies owner edits to the allow file itself.
This check includes symlink targets and runs before all path exceptions.
It compares paths and does not identify hard links to the same file.
A matching pattern cannot permit edits to this file, even outside worktrees.

A denied call returns JSON with `hookSpecificOutput`, `hookEventName` set to
`PreToolUse`, and `permissionDecision` set to `deny`. The reason tells the
owner to send the change to a build worker. The exit code is zero.
Allowed calls produce no output and exit zero.

Missing labels, failed lookups, invalid input, and path errors produce no
output. This hook permits calls when it cannot check them. Each subprocess
has a two-second timeout. The program reads the complete JSON input. Large
content fields do not skip the role and path checks. Memory use grows with
the input size. A missing label module produces no output and exits zero.

## Pattern limits

`*` also matches names that start with a dot. Use exact entries for individual files.
Glob characters in `HOME` retain their pattern meaning after `~/` expansion.
Such entries can fail to match the intended path or match other paths.
Use an absolute pattern with escaped glob characters when needed.
Use `[?]`, `[*]`, and `[[]` to match literal `?`, `*`, and `[` characters.

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

# rx-hc-codex-notify

This program lets one Codex notify setting call both migration hooks.
Set Codex `notify` to an array that contains the absolute path to `rx-hc-codex-notify`.

- Find `rx-codex-notify` beside the resolved wrapper file, including through a symbolic link.
- Find `hc-codex-notify` on PATH.
- If PATH has no executable hook, try `$HOME/.local/bin/hc-codex-notify`.
- Run that fallback only if it is an executable file. Otherwise, skip it.
- Pass every argument unchanged to each program. Do not parse the payload.
- Keep the environment and current directory for both programs.
- Let both programs use the inherited stdout and stderr. Their output order can vary.
- Start both programs. Then wait for both to finish.
- Ignore launch errors and child exit codes. Return exit code 0.

The wrapper adds no sleep or timeout. A slow child can delay its exit.

# rx-hc-codex-notify

This program lets one Codex notify setting call both migration hooks.
Use `notify = ["rx-hc-codex-notify"]` when this program is on PATH.
An absolute path also works.

- Find `rx-codex-notify` beside the resolved wrapper file, including through a symbolic link.
- Find `hc-codex-notify` on PATH. Skip it if it is missing.
- Pass every argument unchanged to each program. Do not parse the payload.
- Keep the environment and current directory for both programs.
- Let both programs use the inherited stdout and stderr. Their output order can vary.
- Start both programs before waiting for them. Wait for both to finish.
- Ignore launch errors and child exit codes. Return exit code 0.

The wrapper adds no sleep or timeout. A slow child can delay its exit.
This change does not install programs or change Codex settings.

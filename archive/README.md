# Archive

These files are deprecated. No skill or agent must load them.

| Archived file | Replacement |
| --- | --- |
| `skills/herdr-assistant` | `skills/hc-assistant` |
| `skills/herdr-hypervisor` | `skills/hc-hypervisor` |
| `skills/herdr-orchestrator` | `skills/hc-orchestrator` |
| `skills/herdr-supervisor` | `skills/hc-supervisor` |
| `skills/herdr-worker` | `skills/hc-worker` |
| `bin/herdr-send` | `bin/hc-send` |
| `bin/herdr-claude-session` | `bin/hc-claude-session` |
| `bin/test-herdr-send` | None. It tests `herdr-send`. |
| `bin/hc-move-herdr-agent` | None. It was a one-time move from herdr to hc. |
| `MAPPING.md` | None. It is the record of the herdr to hc command map. |

## Why

The commands need the `herdr` binary. hc replaced that program.

## Links

Do not link `archive/skills/*` into a skills directory. A link makes the skill load as live.

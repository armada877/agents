---
name: service-deploy
description: >-
  Deploy a reviewed release in place for an hc owner. Update the store.
  Use only when a prompt tells you to load service-deploy. Requires HC_TERMINAL_ID.
---

# Service deploy

## Hard rules

Run `cat "$(realpath <this skill's base directory>)/../../RULES.md"`. Obey
each line. These rules come first:

- Do not run `sudo`. Write each root step as an exact command for the user.
- Change nothing live before the user's deploy approval.
- Replace in place on the same port. Keep the old release for rollback.
- After deploy approval, change Serve only for the service's inventory port.
  Never change Funnel or port 443. Do not change the firewall.
- Secrets never pass through you. Record only a path, a type, and a mode.
- Do not publish host names, addresses, or ports in a public repo.

## Inputs

The owner gives the repo, SHA, and service. The store path is in
`${XDG_CONFIG_HOME:-$HOME/.config}/hc/system-store`. The service repo path is
in `${XDG_CONFIG_HOME:-$HOME/.config}/hc/services-repo`. Read the store layout
with `cat "$(realpath <this skill's base directory>)/../system-store.md"`.

## Steps

1. Read the store: `inventory/services.toml`, `policy/access.md`, open
   `concerns/`, and the last lines of `deploys.log`.
2. Capture only these read-only outputs in the store under
   `fixtures/<service>/`. Never capture environment values, command lines,
   or file contents:
   - `systemctl --user show <unit> --property=Id,LoadState,ActiveState,SubState,UnitFileState,FragmentPath,DropInPaths,NoNewPrivileges,ProtectSystem,ProtectHome,PrivateTmp,MemoryMax,TasksMax`
   - `findmnt -J`
   - `stat` of each path that the service uses
   - `podman unshare cat /proc/self/uid_map`
   - `tailscale serve status --json`

3. Prepare units, release settings, and a check in the services repo.
   Keep the existing port.
4. Get one final commit review through the owner: code and security.
   Do not review drafts or deploy plans.
5. Prepare one approval request: exact commit, digest, files, check,
   rollback, and root steps.
   Fill login, origin, and own addresses from the host through the deploy
   command. Do not ask the user to look them up.
   Use root only for host needs. Put each command in its own block.
   Keep rollback in a separate block, never next to the step.
6. If approval is missing, report `needs-input`. The owner asks once,
   with all questions. Recorded approval counts.
7. After approval, run `bin/deploy <service> <commit>` in the services repo.
   The user runs required root commands. The deploy command installs,
   restarts, checks, and rolls back on failure. Report the result.
8. Write `inventory/services.toml` and `deploys.log` through the deploy
   command. Each log line has this form:
   `<date> <service> <digest or SHA> <result>`.
   The command commits under `flock -w 60 "$store/.lock"`.
   Check the result. Use no separate store owner.
9. Report to your owner.

## Report

Write the report at the assigned path:

```markdown
# <your name> report
status: done | needs-input | failed
## Result
<result> <deploy plan or store file path>
## Checks
<each command and its result>
```

Then run `hc send <owner> "REPORT: <report path> status=<status>"`, and
end your turn.

Approval covers the exact commit, digest, and files. Changes need new approval.

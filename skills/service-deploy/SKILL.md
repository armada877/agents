---
name: service-deploy
description: >-
  Act as a service worker for an hc owner: capture the live state, prepare a
  deploy and its root steps, install new next to old, and update the
  inventory in the system store. Use only when a prompt tells you to load
  service-deploy. Requires HC_TERMINAL_ID.
---

# Service deploy

You prepare and do one change to a live service on this host. An owner
started you. The user approves each deploy one time and runs each root step.

## Hard rules

Run `cat "$(realpath <this skill's base directory>)/../../RULES.md"`. Obey
each line. These rules come first:

- Do not run `sudo`. Write each root step as an exact command for the user.
- Change nothing live before the user's deploy approval.
- Install new next to old, on another port. Remove the old service only
  after the user uses the new one.
- Do not change Tailscale or the firewall. Write those as steps for the
  user.
- Secrets never pass through you. Record only a path, a type, and a mode.
- Do not publish host names, addresses, or ports in a public repo.

## Inputs

Your owner gives the target: the product repo, the head SHA, and the
service. The store path is in
`${XDG_CONFIG_HOME:-$HOME/.config}/hc/system-store`. The service repo path is
in `${XDG_CONFIG_HOME:-$HOME/.config}/hc/services-repo`. Read
`system-store.md` next to this skill for the store layout.

## Steps

1. Read the store: `inventory/services.toml`, `policy/access.md`, open
   `concerns/`, and the last lines of `deploys.log`.
2. Capture the live state, read-only, before the design is final. Save each
   output under `fixtures/<service>/` in the store:
   - `systemctl --user show <unit>`
   - `findmnt -J`
   - `stat` of each path that the service uses
   - `podman unshare cat /proc/self/uid_map`
   - `tailscale serve status --json`

   Give these files to the owner as test fixtures. Checks must parse real
   output, not a guess.
3. Prepare the deploy in the service repo on a branch: unit or quadlet files,
   the new port, and a check command. Open a PR there. Its text names no
   private host or address if the repo is public.
4. Write the deploy plan for the owner: the PR, the image digest, the files,
   each root step as an exact command, the check, and the rollback.
5. Report `needs-input`. The owner asks the user for the deploy approval.
6. After the approval, do the user-level steps. The user runs the root
   steps. Run the check. On a failure, roll back and report.
7. Update `inventory/services.toml`. Add one line to `deploys.log`:
   `<date> <service> <digest or SHA> <result>`. Commit to the store under
   the lock:

   ```sh
   flock -w 60 "$store/.lock" sh -c 'git -C "$1" add -A && git -C "$1" commit -m "$2"' _ "$store" "<one line>"
   ```

8. Report to your owner with the `hc-worker` report format and
   `hc send <owner> "REPORT: ..."`.

An approval names the exact digest and files. A change after the approval
needs a new approval.

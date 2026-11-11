# System store

The system store is one local git repo with no remote. It holds the state of
this host and its security items. Each agent finds its path in one config
file: `${XDG_CONFIG_HOME:-$HOME/.config}/hc/system-store`. Do not write the
path in a public repo.

## Layout

```text
inventory/services.toml        one table per service: unit, port, Serve route, owner, repo
policy/access.md               allowed listeners, Serve routes, keys, and accounts
policy/security-checklist.md   the fixed checklist for security-review
concerns/<id>.md               one open or closed security item; state: open | accepted | fixed
reviews/<date>-<repo>-<sha7>.md  one security review result
watch/latest.md                the last access watch result
watch/<date>.md                older watch results
fixtures/<service>/            captured live outputs for tests
deploys.log                    one line per deploy: date, service, digest, result
```

## Writers and readers

- Only `security-review` workers, `service-deploy` workers, and the access
  watch write to the store.
- Owners read the store before a plan that touches the host. Owners do not
  write to it.
- The deploy worker writes the inventory and deploy log through the deploy
  command. Do not start a separate store owner.
- Each writer reads the store first. It commits its result before it ends.
- One writer commits at a time. Use `flock -w 60 "$store/.lock"` around
  `git add` and `git commit`.
- Security findings stay in the store. They never go to a PR, an issue, or a
  comment.

## Access watch contract

The access watch is a plain script on a user timer. It is not an agent. It
is not built yet. The repo of the host services owns it.

- It runs every 2 hours. It is read-only on the host.
- It reads the live state: listening sockets, Serve routes, user units,
  and key files by hash.
- It compares the live state with `policy/access.md`.
- It writes `watch/latest.md`. The first line is `status: clear` or
  `status: check`. Each next line is one item that differs.
- It commits under the lock.
- On `status: check`, it sends one line with the file path to the
  hypervisor with `hc-send`. The user decides the next step.

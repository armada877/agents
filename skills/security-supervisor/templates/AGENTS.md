# <host>-security

This repo holds the security audits of `<host>`, <owner>'s home lab host.
The repo is local only. Do not add a remote, and do not copy a report to a
service outside this machine. Reports contain IP addresses, key
fingerprints, and log lines.

## Audits only read

An audit finds and reports. It does not fix.

- Do not change the system. Examples: firewall rules, `sshd` config, keys,
  VPN settings, services, users, and packages.
- Do not stop a process, close a connection, or remove a device.
- For each finding, recommend an action. <owner> approves each fix
  separately.
- Do not run `sudo`. If a check needs root, give <owner> the exact command.
  <owner> can run it with `!` in your pane, so its output comes to you.

## Remote access audit

Find each way that a device or a person can reach this host, and each
connection that happened. Check at least:

1. SSH: the `sshd` state, ports, and config; each `authorized_keys` file;
   accepted and failed logins in the journal, `last`, and `lastb`.
2. VPN and mesh tools: peers, devices, published services, and sharing; when
   each peer connected.
3. Listening sockets: `ss -tulpn`, with the owner of each socket, and the
   ports that containers publish.
4. Remote desktop, screen sharing, game streaming, and device-link tools.
5. Agent remote access: remote control features, cloud sessions, and tokens
   that give outside access.
6. Firewall: the rules, and what a LAN device or the internet can reach.
7. Persistence: user accounts, sudoers, systemd units, timers, cron jobs,
   and recent changes to `~/.ssh` and shell startup files.

Mark each connection and each open path as `expected` or `check`. Explain
each `check` item in one or two sentences.

## Reports

- Write each audit report to `reports/<YYYY-MM-DD>-remote-access.md`.
- Start with a summary: the number of `check` items, and the most important
  one.
- Compare with the last report, if there is one. List what changed.
- Commit each report in its own commit.

## Agent documents

Plans, boards, the supervisor log, and the supervisor config go in
`.docs/`. Git ignores this folder through `.git/info/exclude`. Do not commit
them.

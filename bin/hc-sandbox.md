# hc-sandbox

`hc-sandbox` builds, runs, and tests the product in a worktree. It uses
rootless Podman. An agent uses it to run the real product many times, with no
dialog for the user.

## Use it

1. Add `hc-sandbox.toml` and a `Containerfile` to the worktree root.
2. Run the steps from the worktree, or give the folder with `-C <dir>`:

   ```sh
   hc-sandbox build
   hc-sandbox up
   hc-sandbox test
   hc-sandbox exec -- <command> [args...]
   hc-sandbox logs [--tail N]
   hc-sandbox down
   hc-sandbox ls
   ```

3. Read the screenshots in `.hc-sandbox/out/` in the worktree.
4. Change the code, then run `build`, `up`, and `test` again.

`up --publish` also publishes the app port on `127.0.0.1` with a random host
port. The command prints the URL. Use it when the user wants to look at the
app.

## Config file

```toml
name = "sandbox-hello"
containerfile = "Containerfile"
port = 8000
ready_path = "/"
ready_timeout = 60
test_command = ["python", "-m", "unittest"]

[[pages]]
path = "/"
expect = "count is "
```

- `name` is the project name. It names the images and the cache volume.
- `containerfile` is a relative path in the worktree. The default is
  `Containerfile`.
- `port` is the port that the app listens on in the pod. Listen on `0.0.0.0`
  in the pod, so that `--publish` works.
- `test_command` runs in the app container during `test`.
- Each page in `pages` gets a screenshot. The page text must contain
  `expect`. The browser runs page scripts and WebGL before it reads the text.

The wrapper refuses unknown keys. The config cannot add Podman options.

See `examples/sandbox-hello` for a full example.

## Limits

| Item | Build step | Run step |
|------|------------|----------|
| Network | Public internet through a filter | Internal network, no route out |
| Host, LAN, tailnet, link-local | Refused by the filter | No route |
| Mounts | `/ctx` (worktree, read-only); `/cache`; the layer store | `/work` (worktree, read-only); `/cache`; `/out` for the browser only |
| Capabilities | Each step: CHOWN, DAC_OVERRIDE, FOWNER, FSETID, SETUID, SETGID, in the user namespace | None |
| `no-new-privileges` | Yes | Yes |
| Host environment | None | None |
| Podman socket | Not mounted | Not mounted |
| Memory, processes, CPUs | 4 GB, 1024, 4 | 2 GB, 512, 2 |
| Published port | None | `127.0.0.1` only, with `--publish` |

### The build

The host `podman build` runs only the files in `hc-sandbox.d/`. These are
the egress, builder, and browser images.

A project build runs in the builder container. The builder runs `buildah`
with `--isolation chroot` on the worktree, which it sees read-only at `/ctx`.
Each `RUN` step gets only the capabilities in the table. The builder writes an
image archive to a temporary folder. The host loads it with `podman load`.
The layers stay in the `hcsb-store-<name>` volume for the next build.

The builder joins the network of a small egress container on a `pasta`
network with `--no-map-gw`. So base image pulls, `ADD <url>`, and
`RUN --network=host` all use that network. The egress container loads
`hc-sandbox.d/egress.nft`. The rules refuse private, loopback, link-local,
carrier-grade NAT (the tailnet range), and multicast addresses, and each
address of the host. IPv6 traffic must go to `2000::/3`. The builder has no
`NET_ADMIN`, so it cannot change the rules.

DNS goes to the `pasta` forwarder at `169.254.1.1`, and from there to the host
resolver.

### The run step

The pod uses an internal Podman network with no DNS. The app and the browser
share the pod. The browser container has headless Chromium. It writes
screenshots to `.hc-sandbox/out/`. Git ignores this folder.

The wrapper refuses a worktree that is the home folder or a parent of it. It
also refuses a path with characters that break a Podman mount.

## Residual risks

- The build step can send data to any public address. A build can leak the
  worktree contents.
- DNS in the build step uses the host resolver. A build can resolve tailnet
  names. It cannot connect to them.
- The app can write to the cache volume. The cache volume and the layer
  store are shared by all worktrees of a project.
- The builder has `SYS_ADMIN` in its user namespace, for `buildah`. The
  `RUN` steps do not.
- The builder has no registry credentials. A private base image does not
  work.
- Chromium runs with `--no-sandbox`. The container is its sandbox.
- The worktree is visible to the app, read-only. Do not keep secrets in the
  worktree.
- A real data set needs a decision from the user. The sandbox has no way to
  mount data from outside the worktree.

## Tests

Run the unit tests:

```sh
bin/test-hc-sandbox
```

Run the end-to-end and escape tests. They need Podman and the internet:

```sh
HC_SANDBOX_E2E=1 bin/test-hc-sandbox
```

The escape tests start a listener on the host. They check that the build and
the app cannot reach it on any host address, or reach the tailnet. They also
check that the app cannot reach the internet, read the home folder, find a
Podman socket, read the host environment, or write to the worktree. They check
that a published port binds to `127.0.0.1` only.

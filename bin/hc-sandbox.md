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
- `port` is the port that the app listens on in the pod. Listen on the pod
  address. The pod host name gives this address, for example
  `socket.gethostbyname(socket.gethostname())` in Python. The browser and
  `--publish` use this address.
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
| Host folders | None. The worktree arrives as a copy. | None |
| Volumes | `/cache`; the layer store | `/cache` |
| Capabilities | Each step: CHOWN, DAC_OVERRIDE, FOWNER, FSETID, SETUID, SETGID, in the user namespace | None |
| `no-new-privileges` | Yes | Yes |
| Host environment | None | None |
| Podman socket | Not mounted | Not mounted |
| Memory, processes, CPUs | 4 GB, 1024, 4 | 2 GB, 512, 2 |
| Published port | None | `127.0.0.1` only, with `--publish` |

### The build

The host `podman build` runs only the files in `hc-sandbox.d/`. These are
the egress, builder, and browser images. These builds also get `SETFCAP`,
because the builder packages set file capabilities. Project builds do not
get it.

A project build runs in the builder container. The wrapper sends a copy of
the worktree to the builder as a tar stream. It reads the worktree through one
open folder handle, and it opens each file and folder without following links.
It sends a link as a link. It leaves out `.hc-sandbox`. The builder runs
`buildah` with `--isolation chroot` on the copy. Each `RUN` step gets only the
capabilities in the table. The builder sends the image archive back on its
output, and the host loads it with `podman load`.
The layers stay in the `hcsb-store-<id>` volume for the next build. The id is
the project name and a hash of the worktree path.

The builder joins the network of a small egress container on a `pasta`
network with `--no-map-gw`. So base image pulls, `ADD <url>`, and
`RUN --network=host` all use that network. The egress container has no
capabilities. It only keeps the network open. A second container joins that
network with only `NET_ADMIN`, loads `hc-sandbox.d/egress.nft`, and stops
before the build starts. The rules refuse private, loopback, link-local,
carrier-grade NAT (the tailnet range), and multicast addresses, and each
address of the host. IPv6 traffic must go to `2000::/3`. The builder has no
`NET_ADMIN`, so it cannot change the rules.

DNS goes to the `pasta` forwarder at `169.254.1.1`, and from there to the host
resolver.

### The run step

The pod uses an internal Podman network with no DNS. The app and the browser
share the pod. Neither container has a host folder. The app runs the code
from its image. Rebuild to change it.

The browser container has headless Chromium. The wrapper copies each
screenshot from the browser into `.hc-sandbox/out/` in the worktree. Git
ignores this folder.

### Podman storage

The wrapper does not use the Podman storage of the user. It gives each
`podman` command its own folders:

| Item | Folder |
|------|--------|
| Images and containers | `~/.local/share/hc-sandbox/graph` |
| Volumes | `~/.local/share/hc-sandbox/volumes` |
| Networks | `~/.local/share/hc-sandbox/networks` |
| Run state, runtime folder | `/run/user/<uid>/hc-sandbox` |

So a plain `podman ps -a`, `podman images`, `podman network ls`, or
`podman volume ls` shows nothing from the sandbox. Live services do not see
the sandbox. To see the sandbox, use `hc-sandbox ls`.

### The worktree

The worktree must be a folder at least two levels under
`~/.herdr/worktrees`. The wrapper finds the home folder in the user database,
not in `HOME`. It opens the worktree one time, and checks the real path of
that open folder. Later steps use only this open folder. It reads the config
file and the Containerfile without following links. It creates `.hc-sandbox`,
`out`, and `.gitignore` without following links. It replaces a screenshot
file and does not write through an old link.

## Residual risks

- The build step can send data to any public address. A build can leak the
  worktree contents.
- DNS in the build step uses the host resolver. A build can resolve tailnet
  names. It cannot connect to them.
- The app can write to the cache volume. Each worktree has its own cache
  volume and layer store.
- The builder has `SYS_ADMIN` and `SYS_CHROOT` in the user namespace of the
  sandbox store. `buildah` needs `SYS_ADMIN` for its mounts. Without it,
  `buildah` tries to make its own user namespace and cannot write the ID map.
  `buildah --isolation chroot` needs `SYS_CHROOT` for each `RUN` step. The
  `RUN` steps get neither capability. The builder does not get `MKNOD`.
- The builder has no registry credentials. A private base image does not
  work.
- Chromium runs with `--no-sandbox`. The container is its sandbox.
- The build gets a copy of the whole worktree, apart from `.hc-sandbox`.
  Do not keep secrets in the worktree.
- A real data set needs a decision from the user. The sandbox has no way to
  mount data from outside the worktree.

## Tests

Run the unit tests:

```sh
bin/test-hc-sandbox
```

Run the end-to-end and escape tests. They need Podman and the internet.
They make temporary worktrees in `~/.herdr/worktrees/hc-sandbox-test`:

```sh
HC_SANDBOX_E2E=1 bin/test-hc-sandbox
```

The escape tests start a listener on `127.0.0.1` only. Nothing binds
`0.0.0.0` or a LAN or tailnet address. For each other host address, the tests
use up to three listeners that already run on the host. They only open and
close a connection to them. The tests check that the build, also with
`RUN --network=host`, and the app cannot reach these listeners or the
tailnet. They also
check that the app cannot reach the internet, read the home folder, find a
Podman socket, read the host environment, or write to the worktree. They check
that a published port binds to `127.0.0.1` only. While the sandbox runs, they
check that the plain `podman` commands of the user show nothing from it.

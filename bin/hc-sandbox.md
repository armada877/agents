# hc-sandbox

`hc-sandbox` builds, runs, and tests the product in a worktree. It uses
a container engine: rootless Podman or Docker. An agent uses it to run the
real product many times, with no dialog for the user.

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

## Engine

Podman is the default. The user picks the engine for the machine in
`${XDG_CONFIG_HOME:-~/.config}/hc/sandbox.toml`:

```toml
engine = "docker"
```

The `HC_SANDBOX_ENGINE` variable, `podman` or `docker`, overrides the file.
The wrapper refuses other values and unknown keys. The commands, the config
file, and the limits are the same for each engine. The sections below give
the differences.

For Docker, the wrapper uses the `docker` command. It finds the daemon
address in `DOCKER_HOST`, or else in the current Docker context. Then it runs
each command with that address and an empty Docker config folder in the
runtime folder. So the Docker config of the user does not apply. The Docker
command adds proxy settings from that config to each new container, and an
empty config stops this. A context with TLS files does not work. If the
daemon is not rootless, each command gives a warning. See the residual risks.

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

The wrapper refuses unknown keys. The config cannot add engine options.

See `examples/sandbox-hello` for a full example.

## Limits

| Item | Build step | Run step |
|------|------------|----------|
| Network | Public internet through a filter | Internal network, no route out |
| Host, LAN, tailnet, link-local | Refused by the filter | No route |
| Host folders | None. The worktree arrives as a copy. | None |
| Volumes | `/cache`; the layer store | `/cache` |
| Capabilities | Each step: CHOWN, DAC_OVERRIDE, FOWNER, FSETID, SETUID, SETGID, in the user namespace of the engine | None |
| `no-new-privileges` | Yes | Yes |
| Host environment | None | None |
| Engine socket | Not mounted | Not mounted |
| Memory, processes, CPUs | 4 GB, 1024, 4 | 2 GB, 512, 2 |
| Published port | None | `127.0.0.1` only, with `--publish` |

### The build

The engine builds only the files in `hc-sandbox.d/` on the host. These are
the egress, builder, and browser images. With Podman, these builds also get
`SETFCAP`, because the builder packages set file capabilities. Project builds
do not get it. Docker builds these images with its default settings.

A project build runs in the builder container. The wrapper sends a copy of
the worktree to the builder as a tar stream. It reads the worktree through one
open folder handle, and it opens each file and folder without following links.
It sends a link as a link. It leaves out `.hc-sandbox`. The builder runs
`buildah` with `--isolation chroot` on the copy. Each `RUN` step gets only the
capabilities in the table. The builder sends a `docker-archive` image back
on its output, and the engine loads it with `load`.
The layers stay in the `hcsb-store-<id>` volume for the next build. The id is
the project name and a hash of the worktree path.

The builder joins the network of a small egress container. With Podman,
this container is on a `pasta` network with `--no-map-gw`. With Docker, it is
on the default `bridge` network. So base image pulls, `ADD <url>`, and
`RUN --network=host` all use that network. The egress container has no
capabilities. It only keeps the network open. A second container joins that
network with only `NET_ADMIN`, loads `hc-sandbox.d/egress.nft`, and stops
before the build starts. The rules refuse private, loopback, link-local,
carrier-grade NAT (the tailnet range), and multicast addresses, and each
address of the host. IPv6 traffic must go to `2000::/3`. The builder has no
`NET_ADMIN`, so it cannot change the rules.

With Podman, DNS goes to the `pasta` forwarder at `169.254.1.1`, and from
there to the host resolver. With Docker, DNS goes to the public resolver
`9.9.9.9`. The filter accepts it as a public address.

### The run step

With Podman, the pod uses an internal network with no DNS. The app and the
browser share the pod. Neither container has a host folder. The app runs
the code from its image. Rebuild to change it.

Docker has no pods. A Docker internal network also lets a container connect
to host services on its gateway address. So the wrapper makes its own pod:

1. A holder container joins an internal network, with the pod name as its
   host name and the published port. It has no capabilities and only waits.
2. A second container joins the network namespace of the holder with only
   `NET_ADMIN`. It loads `hc-sandbox.d/run.nft` and stops.
3. The app and the browser join the network namespace of the holder.

The rules accept replies and connections to the addresses of the namespace.
They refuse each other new outgoing connection, also to the gateway. They
refuse the Docker DNS server at `127.0.0.11`. The app and the browser have no
`NET_ADMIN`, so they cannot change the rules.

The browser container has headless Chromium. The wrapper copies each
screenshot from the browser into `.hc-sandbox/out/` in the worktree. Git
ignores this folder.

### Logs

Podman sends container output to the user journal by default. A build writes
many lines, and the image archive on its output is binary data. So the
wrapper keeps the journal out of each container.

Each `podman` command gets `CONTAINERS_CONF_OVERRIDE`. It points to a
`containers.conf` file in the runtime folder that sets `log_driver = "none"`.
This default also covers the pod infra container, which takes no log flag.

| Container | Log driver | Why |
|-----------|------------|-----|
| Builder | `none` | The wrapper reads its output directly. |
| Egress, egress setup | `none` | They have no useful output. |
| Pod infra, browser | `none` | They only wait. |
| App | `k8s-file`, 10 MB at most | `hc-sandbox logs` reads it. |

Docker has no such override file. So each Docker helper container gets
`--log-driver none`, and the app gets `json-file` with one file of 10 MB at
most.

### Podman storage

With Podman, the wrapper does not use the Podman storage of the user. It
gives each `podman` command its own folders:

| Item | Folder |
|------|--------|
| Images and containers | `~/.local/share/hc-sandbox/graph` |
| Volumes | `~/.local/share/hc-sandbox/volumes` |
| Networks | `~/.local/share/hc-sandbox/networks` |
| Run state, runtime folder | `/run/user/<uid>/hc-sandbox` |

So a plain `podman ps -a`, `podman images`, `podman network ls`, or
`podman volume ls` shows nothing from the sandbox. Live services do not see
the sandbox. To see the sandbox, use `hc-sandbox ls`.

Docker has one store for each daemon. So `docker ps -a` and the other
`docker` lists show the sandbox objects. Each object has the `hc-sandbox`
label and an `hcsb-` name.

### The worktree

The worktree must be a folder at least two levels under
`~/.herdr/worktrees`. The wrapper finds the home folder in the user database,
not in `HOME`. It opens the worktree one time, and checks the real path of
that open folder. Later steps use only this open folder. It reads the config
file and the Containerfile without following links. It creates `.hc-sandbox`,
`out`, and `.gitignore` without following links. It replaces a screenshot
file and does not write through an old link.

## Residual risks

- A Docker daemon that is not rootless runs each container as root on the
  host. The limits in the table still apply, but a container escape gives
  root on the host. The builder has `SYS_ADMIN` as this root. Use rootless
  Docker or Podman where you can.
- With Docker, any user of the daemon can see, stop, or change the sandbox
  containers.

- The build step can send data to any public address. A build can leak the
  worktree contents.
- With Podman, DNS in the build step uses the host resolver. A build can
  resolve tailnet names. It cannot connect to them. With Docker, DNS goes to
  `9.9.9.9`, so that resolver sees each name that a build looks up.
- The app can write to the cache volume. Each worktree has its own cache
  volume and layer store.
- The builder has `SYS_ADMIN` and `SYS_CHROOT` in the user namespace of the
  engine. With Podman, this is the user namespace of the sandbox store. `buildah` needs `SYS_ADMIN` for its mounts. Without it,
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

Run the end-to-end and escape tests. They need the engine and the internet.
They make temporary worktrees in `~/.herdr/worktrees/hc-sandbox-test`:

```sh
HC_SANDBOX_E2E=1 bin/test-hc-sandbox
HC_SANDBOX_E2E=1 HC_SANDBOX_ENGINE=docker bin/test-hc-sandbox
```

The escape tests start a listener on `127.0.0.1` only. Nothing binds
`0.0.0.0` or a LAN or tailnet address. The tests do not connect to live
services. The tests check that the build, also with `RUN --network=host`, and
the app cannot reach the listener through `127.0.0.1`, `169.254.1.2`, or
`10.0.2.2`, or reach the tailnet. For the other host addresses, a test loads
the egress filter in a container with no network and checks that the filter
holds each host address and IPv6 prefix. They also
check that the app cannot reach the internet, read the home folder, find an
engine socket, read the host environment, or write to the worktree. They check
that a published port binds to `127.0.0.1` only. With Podman, while the
sandbox runs, they check that the plain `podman` commands of the user show
nothing from it.

The Docker path had a partial test only. The `docker` command ran against a
rootless Podman API socket in the sandbox store. The build step passed. The
run step failed in this setup, because the Podman DNS helper did not start
in the sandbox runtime folder. A real Docker daemon has no such helper. Unit
tests cover the Docker run step. An escape test loads `run.nft` in a
container on the default network of the engine. It checks that the container
reaches the internet before the rules load, and only its own address after.

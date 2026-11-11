# hc-show

`hc-show <file>` shows a file to the user, so that the user does not search
for it. An owner runs it at intake, before it asks "Approve or deny?".

## What it does

1. It opens the file in a new kitty window:
   - A Markdown file opens in `glow -t`.
   - An image (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`) opens in
     `kitten icat`.
   - Other files open in `less`.
2. For a Markdown file, it runs the push command. The push command sends
   the doc to the user's phone.

A failed window or a failed push prints one line to stderr. It does not stop
the other step. `hc-show` exits 0 after it starts. It exits 1 for a missing
file.

## Push command

Write the push command in `${XDG_CONFIG_HOME:-$HOME/.config}/hc/push-command`.

- The first line that is not empty and does not start with `#` is the
  command. It is the name or the path of one program, with no arguments.
  A path can contain spaces.
- `hc-show` runs the program with the file path as its only argument.
- A missing file means no push.

Keep the push command, its server, and its topic out of this repo. A good
push command publishes the doc as a private page, and sends an ntfy push with
the page link in the `Click` header.

## Settings

- `HC_SHOW_WINDOW=0`: do not open a window.
- `HC_SHOW_PUSH=0`: do not send a push.

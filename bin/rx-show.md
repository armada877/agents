# rx-show

`rx-show <file>` shows a file to the user, so that the user does not search
for it. An owner runs it at intake, before it asks "Approve or deny?".

## What it does

1. It opens the file in Rex. Focus does not move. The viewer stays open after its command exits.
   - A Markdown file opens in a new tab with `glow -t`.
   - An image (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`) opens in a right split beside `$REX_BLOCK`.
     The split takes 60 percent of the space. Its label is `<file name> preview`.
     An earlier block with that label in the caller's session closes first. The caller stays open.
     Without `REX_BLOCK`, the image opens in a new tab with `rex run`.
   - Other files open in a new tab with `less`.
2. For a Markdown file, it runs the push command. The push command sends
   the doc to the user's phone.

`rx-show-kitty` sends images with the Kitty graphics protocol.
It sends PNG bytes with `f=100,a=T,c=<columns>` in chunks of 4096 base64 bytes.
The last chunk can be shorter. The helper reads its own terminal width in cells inside the split.
PNG files pass through directly. ImageMagick converts other formats to PNG.
For animated files, the helper shows the first frame.
Install `python3`, `magick`, and `jq` on the machine that runs Rex.
The terminal must support Kitty graphics.

A successful open prints the block ID to stderr.

A failed viewer or a failed push prints one line to stderr. It does not stop
the other step. `rx-show` exits 0 after it starts. It exits 1 for a missing
file.

## Image previews

Use `rx-show <image>` for agent image previews in place of `chafa`.
Take screenshots at 2x device scale. Crop screenshots to the content before you run `rx-show`.

## Push command

Write the push command in `${XDG_CONFIG_HOME:-$HOME/.config}/hc/push-command`.

- The first line that is not empty and does not start with `#` is the
  command. It is the name or the path of one program, with no arguments.
  A path can contain spaces.
- `rx-show` runs the program with the file path as its only argument.
- A missing file means no push.

Keep the push command, its server, and its topic out of this repo. A good
push command publishes the doc as a private page, and sends an ntfy push with
the page link in the `Click` header.

## Settings

- `RX_SHOW_WINDOW=0`: do not open a viewer.
- `RX_SHOW_PUSH=0`: do not send a push.

## Checks

Run `bin/test-rx-show`. The tests put a fake `rex` on `PATH`.

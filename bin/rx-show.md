# rx-show

`rx-show <file>` shows a file to the user, so that the user does not search
for it. An owner runs it at intake, before it asks "Approve or deny?".

## What it does

1. It opens the file in Rex. Focus does not move. The viewer stays open after its command exits.
   - A Markdown file opens in a new tab with `glow -t`.
   - An image (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`) opens in a right split beside `$REX_BLOCK`.
     The split takes 60 percent of the space. Its label is `<file name> preview`.
     The caller's recorded preview closes first, even when the file name changes. Other callers keep their previews.
     Without `REX_BLOCK`, or when the split fails, the image opens in a new tab with `rex run`.
   - Other files open in a new tab with `less`.
2. For a Markdown file, it runs the push command. The push command sends
   the doc to the user's phone.

`rx-show` converts the image to a temporary PNG before it closes or opens any block.
It reads source bytes through stdin, selects the first frame, and applies EXIF orientation.
The file extension selects the input format: PNG, JPEG, GIF, or WebP.
It uses `magick`, or `convert` when `magick` is absent.
A bad image or missing converter prints one error line and leaves the current preview open.

`rx-show-kitty` sends the PNG with the Kitty graphics protocol.
It sends `f=100,a=T,C=1` in chunks of 4096 base64 bytes.
It adds only `c=<columns>` when width limits the image, or only `r=<rows>` when height limits it.
The last chunk can be shorter.
The helper reads its terminal cell and pixel dimensions with `TIOCGWINSZ`. It ignores `COLUMNS` and `LINES`.
It sends no size key when the image fits at its natural size.
When pixel dimensions are absent, it uses an 8-pixel cell width estimate for width limits only.
It never uses an estimated height limit.
`C=1` keeps the cursor in place. The helper sends no trailing newline.
The helper draws once at startup and stays alive inside the terminal.
On `SIGWINCH`, it deletes the image, clears the pane, and draws with the new size.
When output goes to a pipe, the helper draws once and exits.
The helper removes the temporary PNG after it reads the bytes.

Install `python3`, ImageMagick, and `flock` where `rx-show` runs.
The Rex terminal must access the helper and temporary PNG. It must support Kitty graphics.

Each caller has a file under `${XDG_RUNTIME_DIR:-/tmp}/rx-show/` that records its preview block ID.
The file name uses a hash of `REX_BLOCK`. A lock serializes previews from the same caller.
Labels remain `<file name> preview`; labels do not control which block closes.
A close that reports `not found` removes the old record and continues.
Other close failures print one error line and leave the recorded ID unchanged.

A successful open prints the block ID to stderr.
This confirms block creation. It does not confirm that the terminal rendered the image.
A failed conversion, open, or push prints an error to stderr.
A failed Markdown tab does not stop its push.
`rx-show` exits 0 after it starts. It exits 1 for a missing file.

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

Run `bin/test-rx-show`. The tests put fake `rex` and `magick` commands on `PATH`. They need no ImageMagick installation.

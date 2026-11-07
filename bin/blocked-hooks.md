# Keep questions visible

These programs require Python 3. They do not change settings.

## Claude Stop

Add `hc-claude-stop` as a command in the Claude `Stop` hook list.
Use its absolute executable path. Keep all existing hooks.

The program reads JSON from standard input. It uses `last_assistant_message` for final text.
It reads the transcript only to count `AskUserQuestion` calls in the current turn.
A user entry with text starts a turn. Tool results, `isMeta`, and `isCompactSummary` entries do not start turns.
Only assistant `tool_use` blocks count as calls. `SendMessage` inputs do not count.
One current-turn dialog permits Stop, even if the final text contains another question.

The filter detects English questions that start with selected question words.
It accepts `can`, `could`, `would`, `will`, `do`, `did`, `are`, or `have`, followed by `you`.
It also accepts `should`, `shall`, `may`, or `can`, followed by `I`.
It accepts `which`, `what`, `how`, `where`, and `when` when the question contains `you` or `your`.
These explicit questions match anywhere, including lists and report sections.
Other questions with these five words match only at the end of the filtered message.
They do not match inside Markdown lists or reported sections.
List markers are `-`, `*`, `+`, and numbers followed by `.` or `)`.
Reported sections start with a line that ends with one of these forms:

- `Research questions:` or `Reported questions:`
- `Questions from ...:` or `Questions for ...:`
- `... asked:` or `... asks:`

These forms ignore case and accept Markdown heading markers or surrounding asterisks.
A blank line or another Markdown heading ends the reported section.
Trailing asterisks and underscores do not prevent a final question from matching.
It also accepts `Is that okay?`, `Does that work for you?`, and `Do I have your approval?`.
It accepts questions that start with `Is it okay if I`.
These forms use the same quote, code, and reported-question filters.
A question must end with `?`. Sentence separators are periods, question marks, exclamation marks, and newlines.
The filter checks each question on a line.
The filter removes fenced code, inline code, paired quotes, and Markdown quote lines.
It ignores reported questions with an introductory phrase.
It skips `What changed?`, `What was tested?`, and `How does it work?` when text follows them.
This rule also applies to Markdown headings. Later direct questions still match.
The following text is only an answer signal. This rule does not verify its meaning.

This filter cannot understand intent. Rhetorical questions can match.
Questions with other forms or languages can fail to match. Complex Markdown can cause incorrect matches.
Paired quotes can hide a real question. Transcript formats without a user boundary disable enforcement.
The program does not fall back to transcript text when final text is absent.

A match without a current-turn dialog returns `decision: block` with an instruction to use `AskUserQuestion`.
The program permits Stop when `stop_hook_active` is true. Thus, it requests at most one continuation per hook chain.
A new user turn can supply `stop_hook_active: false` and start another check.
An earlier dialog does not cover that new turn.
The flag controls the continuation check. The transcript controls the dialog count.
It cannot guarantee a dialog after that continuation.
Invalid input, missing files, or invalid transcripts permit Stop without output.
Input limits are 1 MiB for payload text and 16 MiB for transcript text, measured in characters.
The program reads one extra character to detect an exceeded limit.

The [official hook reference](https://code.claude.com/docs/en/hooks#stop) defines the payload, output, and continuation flag.

## Codex notify

Set Codex `notify` to an array that contains the absolute path to `hc-codex-notify`.
Install this only where no other notify program needs preservation, or use a wrapper for both programs.
Notify arguments do not affect this program.

The program reads `HC_TERMINAL_ID`. It runs `hc get` with `--json` and a two-second timeout.
A nonempty string in `labels.decision` causes one write to `/dev/tty`.
The bytes are `ESC ] 7501 ; state=blocked ESC \`, without spaces or a newline.
No other label affects the result. The program does not clear labels or report `done`.

Missing environment, absent labels, whitespace labels, invalid JSON, failed commands, and missing terminals produce no output.
A missing `hc` program or unavailable tty also produces no output.
The program always exits successfully for these cases.
An installed notify program is required for this status change.
The surrounding terminal must support OSC 7501.

## Checks

Run `bin/test-blocked-hooks` for the focused tests.
The test loader disables bytecode writes. It creates no `__pycache__` files.
Run live tests in isolated workers before installation.

## Isolated live results

The owner reported both live tests passed. These results apply to the tested versions.

- Claude Code 2.1.319 changed `Should I use the blue option?` into `AskUserQuestion`.
  hc then reported `blocked` with kind `question`.
  `[test: isolated Stop worker, Claude Code 2.1.319, owner report]`
- Codex 0.167.0 used a notify override. Without a decision label, its final status was `done`.
  With a decision label, its status stayed `blocked`.
  `[test: isolated notify worker, Codex 0.167.0, owner report]`
- Configuration hashes stayed unchanged.
  `[test: isolated workers, Claude Code 2.1.319 and Codex 0.167.0, owner report]`

The owner repeated the Claude live test after the four permission forms were added.
The final hook blocked a plain question and reached `AskUserQuestion`.
hc reported `blocked` with kind `question`. The owner removed the test worker.
`[test: repeated isolated Stop worker, Claude Code 2.1.319, owner report]`

The tested hook SHA-256 was:

```text
f30e06c079196c15caf4a551e85f30c079681563247bfe3288e8058ffac8ade4
```

The Codex script stayed unchanged after its successful live test.
`[test: isolated notify worker, Codex 0.167.0, owner report]`

Focused tests cover the four permission forms and the existing false-positive protections.

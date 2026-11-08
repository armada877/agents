# Keep questions visible

Both hooks use `/usr/bin/python3`. They do not search `PATH` for Python.
These programs do not change settings.

## Claude Stop

Add `hc-claude-stop` as a command in the Claude `Stop` hook list.
Use its absolute executable path. Keep all existing hooks.

The program reads JSON from standard input. It uses `last_assistant_message` for final text.
It reads the transcript only to count `AskUserQuestion` calls in the current turn.
A user entry with text starts a turn. Tool results, `isMeta`, and `isCompactSummary` entries do not start turns.
Only assistant `tool_use` blocks count as calls. `SendMessage` inputs do not count.
One current-turn dialog permits Stop, even if the final text contains another question.

Both programs import the shared question filter from `hc_question.py`, beside the scripts.
They resolve script symlinks before importing it. Keep this module beside the script targets.
A missing or broken module disables question detection without error output.
The Codex hook still checks decision labels when the module cannot load.
The filter keeps only the last 8192 UTF-8 bytes before it removes quotes or checks questions.
It first selects the last 8192 characters, then encodes only those characters.
It discards an incomplete UTF-8 character at the start of the byte window.
It replaces unpaired Unicode surrogates during encoding.
It computes suffix indices once for summary answers and trailing content.
Sentence matches start only at the window start or after a sentence separator.
The sentence scan takes linear time within the window. It computes list context once for each line.
Questions outside this window cannot match.
Truncation can remove an opening quote, code fence, list marker, or reported section heading.
This loss of context can cause incorrect matches or hide a question.
The byte limit bounds filter work. It does not bound JSON parsing or label output.

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
Codex supplies one JSON argument. The question check requires an object with `type: agent-turn-complete`.
The `last-assistant-message` field must contain a string.
Codex 0.167.0 supplied this contract during an isolated capture test.
`[test: isolated notify payload capture, Codex 0.167.0, owner report]`
Other fields do not affect the check.
Missing arguments, extra arguments, malformed JSON, wrong events, and invalid field types disable the question check.

The program reads `HC_TERMINAL_ID`. It runs `/usr/bin/hc get` with `--json` and a two-second timeout.
A nonempty string in `labels.decision` or a direct question causes one write to `/dev/tty`.
The shared filter checks the final message. It does not read a transcript.
A failed label read does not disable the question check.
Invalid notify input does not disable the existing label check.
The bytes are `ESC ] 7501 ; state=blocked ESC \`, without spaces or a newline.
No other label affects the result. The program does not clear labels or report `done`.

Missing `HC_TERMINAL_ID` or an unavailable tty produces no output.
Without a matching question, absent labels, whitespace labels, invalid label JSON, and failed commands produce no output.
A missing `/usr/bin/hc` program disables only the label check.
The hooks do not support alternate executable locations through `PATH`.
The program always exits successfully for these cases.
An installed notify program is required for this status change.
The surrounding terminal must support OSC 7501.
This fallback writes no labels and does not open a question dialog.
`hc-decisions` still lists only labeled decisions. It cannot list a question detected only by this fallback.

## Checks

Run `bin/test-blocked-hooks` for the focused tests.
Tests require each filter call on one MiB of question marks or repeated `a?` text to finish within one second.
A 128 KiB line without sentence separators must also finish within one second.
Tests cover the byte window, Unicode boundaries, and fake executables in `PATH`.
Tests check silent success for missing modules, syntax errors, and errors during module execution.
They also check decision labels when question detection cannot load.
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

The earlier Codex live test covered only labels. It did not test the current question fallback.
`[test: isolated notify worker, Codex 0.167.0, owner report]`

Focused tests cover the four permission forms and the existing false-positive protections.

The owner reported new isolated tests after the report filter changed.
These tests used Claude Code 2.1.319 with an empty `--setting-sources` value and separate `--settings`.

- The hook permitted a numbered research report with `stop_hook_active: false`.
  `[test: isolated research report, Claude Code 2.1.319, owner report]`
- A separate isolated worker blocked `Should I use the blue option?` and opened `AskUserQuestion`.
  hc reported `blocked` with kind `question`.
  `[test: isolated direct question, Claude Code 2.1.319, owner report]`

The tested hook SHA-256 was:

```text
61bc2d4b3cdc755d5a103e6aefa1b7736c61a39870bb14a4ad5181b2a2456f9e
```

A live follow-up test did not run because a setup prompt appeared.
Unit tests cover the new user turn. This case has no live test result.
`[test: test_continuation_and_new_user_turn, f429755]`
The payload from the second reported incident remains unknown.

The owner tested the question fallback with Codex 0.167.0 and a command-line notify override to the checkout script.
The question worker ended with `Should I use the blue option?` and emitted an hc `blocked` notice without a decision label.
A later `Yes` input resumed it before the status read, so this test does not establish a stable blocked duration.
The control worker ended with `The check is complete.` and hc reported `done` without a decision label.
`[test: isolated question fallback and control workers, Codex 0.167.0, owner report]`

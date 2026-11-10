---
name: interactive-design-artifact
description: >-
  Build a design document as one interactive HTML artifact: tabs that follow
  the architecture template headings, a clickable architecture diagram, a
  clickable ER diagram with SQL, an API route explorer, a business-logic
  simulator, and a rollout slider. Keep it in sync with the repo design doc and
  the PR code. Use when the user asks for an interactive design page, an
  interactive artifact for a design, or to update such a page.
---

# Interactive design artifact

This skill makes a design page that a reader clicks through. It is the same
content as the design doc in the repo, shown as pictures and small tools.
An example is in `references/example-design.html`. It shows syn-cli at public commit
`c1926aaaa74c0da9143cddf140ed6ba019decf1b`. The example maps CLI commands,
SQLite tables, fetch guards, and the documented metadata migration. Read it before you write a new page. Copy its CSS, its helpers, and its section layout.

## Before you start

1. Load the `artifact-design` skill. Its contract applies: the `<title>`, the
   color tokens, dark mode, the allowed CDNs, and the phone layout.
2. Find the source of truth. Use this order:
   1. The code on the PR branch.
   2. The OpenAPI spec.
   3. The design doc in the repo (for example `doc/plans/YYYY-MM-DD-<topic>.md`).
3. If the design doc does not exist, write it first. The page comes from the
   doc. The doc never comes from the page.

## Rules

- Write all text in Simplified Technical English. Keep sentences short.
- Use the architecture template headings in the table below. Each heading
  must appear on the page, with its exact name. A heading can be a tab, a panel title, or a sub-heading.
- Put pictures first. Use a diagram, a table, or a tool in place of a
  paragraph. Keep each paragraph to 3 sentences or fewer.
- Do not invent facts. Each route, status code, column, and field name must
  match the code. Mark a planned part as planned (for example "PR 3").
- Do not put secrets or customer PII on the page. Use fake ids such as
  `f3a1…`.
- Do not call a network service from the page. All data is in the page.

## Page layout

One HTML file. A compact header, a sticky tab bar with prev and next
buttons, and one tab for each group of headings.
The table describes the syn-cli example. Keep the headings when adapting another system.

| Tab | Template headings | Interactive part |
| --- | --- | --- |
| Introduction | Rationale, Background, Terminology, Non-Goals | Overview SVG, CLI or Storage terminology chips, and tags for concepts that do not apply |
| Architecture | Proposed Design, System Architecture | Flow chips highlight feed, article, and image paths. Steps and pinned source links explain each flow. |
| Data model | Data Model | Select feeds or articles for columns and exact SQL. A toggle highlights the single foreign key. |
| CLI | Interface/API Definitions | Command groups replace HTTP surfaces. Entries show command, input, output format, and behavior. |
| Logic | Business Logic | Fetch outcomes and a guard trace; stored article actions, state, and log; source-backed rules |
| Rollout & risks | Migration Strategy, Impact, Risks, Alternatives | Slider for version 1, version 2, and full refresh; impact table; expandable risks and implemented choices |

Link related code under System Architecture and Business Logic. Use repo-relative paths in `<code>`.
For an HTTP service, adapt the CLI explorer to routes, credentials, requests, responses, and errors.
Use rollout stages or rejected alternatives only when the source supports them.

## Example colors

The example defines `--accent`, `--dev`, `--loc`, `--user`, `--bad`, and
`--line`. Read their meanings in the example. Give each token one meaning for
each subject, and keep it the same in each tab.

## How to build it

1. Keep repeated content in JavaScript data near the end of the page.
   Render it with small functions. The example keeps introductory text and form labels in HTML.
   Its current data uses these fields:
   - `SOURCE`: the pinned public source URL prefix. `source(path)` makes a link with a relative path label.
   - `TABS`: section ID and label pairs.
   - `VOC`: term and definition pairs, keyed by CLI or Storage.
   - `N`: node objects with `x`, `y`, `l` for label, and `c` for color token.
   - `E`: pairs of node keys that define edges.
   - `FLOWS`: `e` holds edge indices, `s` holds steps, and `c` holds the source path.
   - `T`: tables keyed by name, with `cols` pairs, `note`, and exact `sql`.
     `drawER()` sets positions and draws the single foreign key. There is no `R` object.
     `erSel` selects the table. `fkOn` controls highlighting.
   - `API`: command groups with entries containing command, input, output format, and behavior.
     `apiSurf` and `apiIdx` select the group and command.
   - `sim()`: an `if` chain that follows Fetch guard order, including the early HTTP 304 return.
   - `S`: article state with `exists` and `read`. `ACT` provides action guards. `LOG` stores action text.
   - `MIG`: part names and three stage descriptions. The slider value selects a stage.
   - `RISKS`: category, title, detail, and source path for each expandable risk.
   - `alternatives`: title, explanation, and source path for each documented choice.
2. Use the shared helpers: `$`, `esc`, `chips(el, items, current, onPick)`,
   and `showTab`. Escape text and interpolated attribute values with `esc` before inserting HTML.
   The helper escapes ampersand, less-than, greater-than, double quote, and single quote.
   Apply it to chip keys, action keys, labels, and source links.
   Use raw values with `textContent`, `setAttribute`, and dataset comparisons. The browser decodes HTML entities during parsing.
3. Draw diagrams as inline SVG from the data. Use the shared color tokens.
   Define component colors and control-state colors for the subject.
   Keep these meanings consistent across tabs.
4. Make it accessible: `role="tablist"`, `aria-selected`, `aria-pressed` on
   chips, `aria-live` on result panels, and keyboard support for tabs and
   tables.
5. Write the file to the scratchpad directory. Check the script before you
   publish:

   ```bash
   node -e "const h=require('fs').readFileSync('page.html','utf8');new Function([...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].pop()[1]);console.log('js ok')"
   ```

6. Publish it with the Artifact tool. Give an `icon` on the first publish.

## When the design changes

1. Change the design doc in the repo first.
2. Change the code (or have a worker change it).
3. Update the page from the code, not from memory. Grep the page for each
   removed name (for example a dropped table or route) and remove each hit.
   Update every tab: the summary, the picture, the flows, the ER data, the
   API data, the simulator, the rules, the migration rows, and the
   alternatives. Record rejected designs only when the source documents their rejection.
4. For a large change, ask a read-only agent to compare the page with the PR
   code. Give it the data object names and the source-of-truth order.
5. Run the script check. Publish to the same file path, so the URL stays the
   same. Add a short `label` that names the change.

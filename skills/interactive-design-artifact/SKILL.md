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
An example is in `references/example-design.html`. It shows a made-up
"partner passes" design. Read it before you write a new page. Copy its CSS, its helpers, and its section layout.

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
buttons, and one tab for each group of headings:

| Tab | Template headings | Interactive part |
| --- | --- | --- |
| Introduction | Rationale, Background, Terminology, Non-Goals | A "model in one picture" SVG; terminology with chips for each surface (API, app, database); non-goals as dashed tags |
| Architecture | Proposed Design (summary), System Architecture | An SVG of the components. Chips select one request flow. The flow's edges light up, and a numbered step list shows beside it |
| Data model | Data Model | A clickable ER SVG. Click a table to see its columns, a note, and "Show SQL". A toggle shows the composite foreign keys |
| API | Interface/API Definitions | Chips for each surface (for example owner, issue, reads, app APIs). A route list on the left; credential, scope, errors, request, and response on the right |
| Logic | Business Logic | A simulator form with selects for each input. It shows the status code and a pass/fail trace. A state machine with buttons and a log. A "Rules" list |
| Rollout & risks | Migration Strategy, Impact, Risks, Alternatives | A range slider over the PRs that marks each part live. An impact table. Risk rows that expand. An alternatives list with the reason for each rejection |

Link to the related code under System Architecture and Business Logic. Use repo-relative paths in `<code>`.

## How to build it

1. Keep all content in JavaScript data near the end of the page, and render
   it with small functions. This makes an update a data edit. The example uses
   these objects:
   - `VOC`: terminology, keyed by surface.
   - `N`, `E`, `FLOWS`: architecture nodes, edges, and request flows (steps and a code pointer).
   - `T`, `R`: ER tables (position, color, columns, note, SQL) and relations (0 plain, 1 composite, 2 owns).
   - `API`: routes keyed by surface: method, path, credential, scope, request, response, errors.
   - `sim()`: the simulator. One `if` chain in the same order as the service code.
   - `ACT`: state machine actions, with a guard for each.
   - `MIG`, `RISKS`, alternatives: rollout rows, risk rows, rejected options.
2. Use the shared helpers: `$`, `esc`, `chips(el, items, current, onPick)`,
   and `showTab`. Escape every string with `esc` before you put it in HTML.
3. Draw diagrams as inline SVG from the data. Use the color tokens, for
   example `var(--dev)` for developer parts and `var(--loc)` for location parts.
   Give one color to one kind of thing on every tab.
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
   alternatives. Record each rejected design as an alternative.
4. For a large change, ask a read-only agent to compare the page with the PR
   code. Give it the data object names and the source-of-truth order.
5. Run the script check. Publish to the same file path, so the URL stays the
   same. Add a short `label` that names the change.

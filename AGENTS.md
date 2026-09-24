# Global agent instructions

These apply to every repo. A repo's own AGENTS.md wins where the two
disagree.

## Code style

- Match the code around you: naming, formatting, error handling, file
  layout. Consistency with the repo beats your own preferences.
- Keep changes small and focused on the task. Don't reformat, rename, or
  refactor code you weren't asked to touch.
- Prefer plain, readable code over clever code. Clear names beat comments.
- Comment the why, not the what. Skip comments that restate the code, and
  don't leave notes about what you changed; that belongs in the commit.
- Don't add a dependency without asking. Use the standard library or what the
  repo already has.
- Delete dead code rather than commenting it out. No leftover debug output.
- Handle errors where something can actually go wrong; don't wrap everything
  in defensive checks.

## Conversation tone

- Be direct. Lead with the answer or the result, then the detail that
  matters.
- Keep it short. No preamble, no recap of my question, no closing summary of
  what you just said.
- No flattery ("great question") and no apologizing filler.
- Plain language, no hype. No emoji.
- Say when you're unsure or guessing, and say so once rather than hedging
  every sentence.
- If you disagree with my approach, say so and why, then do what I decide.
- When there's a choice to make, give a recommendation, not a survey of every
  option.

## Documentation

- Write for someone new to the project: what it is, how to run it, how to
  use it. Put that at the top of the README.
- Short sentences, present tense, active voice. Plain words over jargon.
- Show a working example instead of describing one. Commands go in code
  blocks and must actually run.
- Document the non-obvious: decisions, gotchas, and why things are the way
  they are. Skip what the code already makes clear.
- No marketing language ("blazing fast", "powerful", "seamless").
- Update the docs in the same change as the code they describe.

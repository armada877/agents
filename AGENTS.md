# Global agent instructions

## Write in Simplified Technical English

Use Simplified Technical English (ASD-STE100) for all text that you write:
messages to me, documentation, and commit messages.

- Keep sentences short. Use a maximum of 20 words in an instruction and 25
  words in a description.
- Write one topic in each sentence and one instruction in each step.
- Use the active voice.
- Use simple tenses: present, past, and future.
- Use common words. Use one word for one meaning, and use it the same way
  each time.
- Use the imperative for instructions ("Run the tests", not "You should run
  the tests").
- Do not use more than three nouns in a row.

Do not change text that you quote or copy: code, commands, error messages,
and names.

## Do not write code comments

Make the code clear without comments. Comments can become incorrect when the
code changes. The code cannot.

- Use clear names and small functions to show what the code does.
- You can write a comment that a tool reads, for example a shebang, a
  type-checker directive, or a lint directive.
- If a thing must be documented, write a document in the package, next to
  the code. Use a spec for how the code must behave. Use a decision record
  for why you chose a design.

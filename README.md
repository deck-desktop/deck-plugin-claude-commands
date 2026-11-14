# Claude commands

When Claude suggests a command in the chat (a short shell block, or inline code that starts with a
known tool such as `npm`, `git` or `flutter`), a button under the reply runs it, so you do not copy it
into a terminal yourself.

The first command opens a terminal tab of its own beside the chat, in the folder Claude runs in. Later
ones run in that same terminal while it is idle, or in a new one when it is busy or closed. Your own
terminals are never typed into: one that looks idle may have just started something. Commands that
delete files, discard work, deploy or build a release ask before they run.

Up to four commands per reply get a button. A command with a placeholder in it (`<path>`, `...`) is a
template, not something to run, and gets none.

## Developing

```sh
npm run dev   # rebuild as you edit; each save shows in your test Deck
npm test      # which commands a reply offers
```

Needs a Deck with chat plugins (after 1.17.4) and the `chat` and `terminals` permissions.

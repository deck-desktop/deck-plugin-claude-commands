# Run buttons

When Claude suggests a command in the chat (a short shell block, or inline code that starts with a
known tool such as `npm`, `git` or `flutter`), a button under the reply runs it, so you do not copy it
into a terminal yourself.

The command runs in an idle terminal of the same project: one whose shell is open and running
nothing. When there is none, a new terminal tab opens beside the chat. Commands that delete files,
discard work, deploy or build a release ask before they run.

Up to four commands per reply get a button. A command with a placeholder in it (`<path>`, `...`) is a
template, not something to run, and gets none.

## Developing

```sh
npm run dev   # rebuild as you edit; each save shows in your test Deck
npm test      # which commands a reply offers
```

Needs a Deck with chat plugins (after 1.17.4) and the `chat` and `terminals` permissions.

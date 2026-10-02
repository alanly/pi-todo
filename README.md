# pi-todo

A [Pi](https://github.com/earendil-works/pi-coding-agent) extension that gives
the agent a **todo list**, gives you a `/todos` viewer, and shows a **contextual
footer status line** while work remains.

Adapted from Pi's official `examples/extensions/todo.ts`, with the status line
added on top.

## What it does

- **`todo` tool** — the agent manages a list with `list`, `add` (text),
  `toggle` (id), and `clear`.
- **`/todos` command** — an interactive viewer for the todos on the current
  branch. Escape or Ctrl+C closes it.
- **Footer status line** — appears only while the list is non-empty *and*
  unfinished:

  ```
  ~/src/github.com/alanly/pi-project
  glm-5.3-flash · high · 12.4k/200k
  ☑ 3/7
  ```

  `3` is the completed count (green), `7` the total (dim). The whole line
  disappears when every item is done or the list is emptied.

## State and branching

State is stored in the `details` of each `todo` tool result, never in an
external file. On `session_start` and `session_tree` the list is rebuilt from
the entries on the active branch, so forking a session restores the todo state
that belongs to that point in history.

## Install

Load it directly:

```bash
pi --extension ~/src/github.com/alanly/pi-todo/index.ts
```

Or symlink it into the auto-discovered extensions directory:

```bash
ln -s ~/src/github.com/alanly/pi-todo ~/.pi/agent/extensions/pi-todo
```

## Development

```bash
npm install
npm test
npm run typecheck
```

## Notes

- The tool runs with `executionMode: "sequential"` because all calls share one
  in-memory list.
- The status line is TUI-only; other modes are a no-op.

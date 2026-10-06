# Notes API

A tiny notes service with no dependencies (Node 22's `node:http` and `node:test`).

```bash
npm test        # run the tests
npm start       # http://localhost:3000/notes
```

## Your task

1. Add `POST /notes` that creates a note from `{ "title": string, "body": string }`.
   Reject a missing or empty title with `400` and a JSON error. Return `201` with the note.
2. Add `GET /notes/:id`, returning `404` for an unknown id.
3. Add tests for both, including the failure cases, and keep every test passing.

Use Claude Code (`claude` in the terminal) however you like. Review what it writes:
how you direct it and what you accept is part of the round.

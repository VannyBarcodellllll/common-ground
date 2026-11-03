# Common Ground

A full-stack workspace for small teams. Shared task boards, live conversations, and project files stay together in one place.

## Start

Requires Node.js 24 or later. There are no third-party runtime dependencies.

```sh
node server.mjs
```

Open http://localhost:4181. Create your own account and workspace, or select **Explore a demo workspace**. Demo mode creates a separate account with editable sample tasks. Its random credentials are not displayed; sign out and create a personal account when you want a reusable login.

## What works

- Registration and sign-in with scrypt password hashes, expiring server sessions, and HttpOnly cookies.
- Multiple private workspaces with owner-controlled, revocable invitations that expire after seven days.
- Four-column task boards with mouse/touch dragging and a keyboard-accessible status editor.
- Task descriptions, priorities, custom labels, due dates, and member assignments.
- Board and list views, search, priority filters, and an assigned-to-me view.
- Live team chat, online presence, and workspace activity through server-sent events.
- Workspace and task file attachments, with downloads restricted to members. Files are limited to 5 MB each and 100 per workspace.
- Light and dark themes, responsive navigation, and a mobile chat drawer.
- Optimistic version checks prevent silently overwriting another teammate’s task changes.

## Data and deployment

SQLite stores accounts, sessions, memberships, tasks, chat, activity, and file bytes in `data/workspace.sqlite`. Data survives server restarts. Runtime data is gitignored. Stop the server before copying the entire data directory for a simple backup; do not publish it with source code.

Optional environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4181` | HTTP port |
| `HOST` | `127.0.0.1` | Bind address |
| `DATA_DIR` | Project `data/` | Persistent storage directory |
| `COOKIE_SECURE` | Off | Set to `1` behind HTTPS |

Localhost invitation links work on the same computer. For other devices, run this Node server on a reachable host with persistent disk storage, serve it through HTTPS, and use that host’s address. Ensure the reverse proxy supports unbuffered, long-running SSE connections. The application runs as a single server process; live fan-out is in memory.

GitHub Pages cannot run this backend. A public deployment needs Node hosting and a persistent volume. This first version does not include email verification, password recovery, member removal, or malware scanning for uploads. Downloaded attachments are served as attachments, never executed in the app’s origin. Do not use demo accounts for important work.

### Docker

```sh
docker build -t common-ground .
docker run -p 4181:4181 -v common-ground-data:/app/data common-ground
```

For an HTTPS deployment, set `COOKIE_SECURE=1` and route traffic from your HTTPS reverse proxy to the container. Keep `/app/data` on a persistent volume and use one replica. The included Dockerfile is deployment configuration; the application’s automated checks run directly with Node.

## Tests

```sh
node --test test/api.test.mjs
```

The integration suite uses an isolated temporary database and multiple HTTP clients. It checks account/session handling, private workspace access, owner-only invites, invite rotation, task validation, concurrent edits, cross-origin protection, two-user live events, protected file downloads, database persistence, and logout.

## Layout

`server.mjs` provides the HTTP API, SQLite schema, authorization checks, file delivery, and SSE connections. `public/` contains the browser interface. `test/` contains backend integration tests.

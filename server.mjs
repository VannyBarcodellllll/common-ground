import http from "node:http";
import { DatabaseSync } from "node:sqlite";
import {
  randomBytes,
  randomUUID,
  createHash,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = dirname(fileURLToPath(import.meta.url));
const hash = (s) => createHash("sha256").update(s).digest("hex");
const derive = promisify(scrypt);
const statuses = ["backlog", "active", "review", "done"];
const priorities = ["low", "medium", "high"];
class Failure extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (status, message) => {
  throw new Failure(status, message);
};
function text(v, label, max = 200, required = true) {
  if (typeof v !== "string" || v.length > max || (required && !v.trim()))
    fail(400, `${label} is required and must be ${max} characters or fewer.`);
  return v.trim();
}
async function body(req, limit = 65536) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit)
      fail(413, "File or request is too large. Maximum file size is 5 MB.");
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}
async function jsonBody(req) {
  try {
    const value = JSON.parse((await body(req)).toString());
    if (!value || typeof value !== "object" || Array.isArray(value))
      fail(400, "Please send a JSON object.");
    return value;
  } catch (e) {
    if (e instanceof Failure) throw e;
    fail(400, "Please send valid JSON.");
  }
}
export function createApp({
  dataDir = process.env.DATA_DIR || join(root, "data"),
  secure = process.env.COOKIE_SECURE === "1",
} = {}) {
  mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(join(dataDir, "workspace.sqlite"));
  db.exec(`PRAGMA journal_mode=WAL;PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,salt TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS workspaces(id TEXT PRIMARY KEY,name TEXT NOT NULL,description TEXT NOT NULL,owner_id TEXT NOT NULL REFERENCES users(id),created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS members(workspace_id TEXT REFERENCES workspaces(id),user_id TEXT REFERENCES users(id),PRIMARY KEY(workspace_id,user_id));
 CREATE TABLE IF NOT EXISTS invitations(token TEXT PRIMARY KEY,workspace_id TEXT REFERENCES workspaces(id),expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY,workspace_id TEXT REFERENCES workspaces(id),title TEXT NOT NULL,description TEXT NOT NULL,status TEXT NOT NULL,priority TEXT NOT NULL,tag TEXT NOT NULL,assignee TEXT REFERENCES users(id),due TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,created INTEGER NOT NULL,updated INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY,workspace_id TEXT REFERENCES workspaces(id),user_id TEXT REFERENCES users(id),body TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS activity(id TEXT PRIMARY KEY,workspace_id TEXT REFERENCES workspaces(id),user_id TEXT REFERENCES users(id),body TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS files(id TEXT PRIMARY KEY,workspace_id TEXT REFERENCES workspaces(id),task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,user_id TEXT REFERENCES users(id),name TEXT NOT NULL,size INTEGER NOT NULL,data BLOB NOT NULL,created INTEGER NOT NULL);
 `);
  const all = (sql, ...args) => db.prepare(sql).all(...args),
    one = (sql, ...args) => db.prepare(sql).get(...args),
    run = (sql, ...args) => db.prepare(sql).run(...args);
  const clients = new Map(),
    attempts = new Map();
  const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });
  function session(req) {
    const token = req.headers.cookie
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("cg_session="))
      ?.slice(11);
    if (!token) return null;
    return one(
      "SELECT users.*,sessions.expires,sessions.token FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token=? AND sessions.expires>?",
      hash(token),
      Date.now(),
    );
  }
  function member(ws, user) {
    const row = one(
      "SELECT w.* FROM workspaces w JOIN members m ON w.id=m.workspace_id WHERE w.id=? AND m.user_id=?",
      ws,
      user.id,
    );
    if (!row) fail(404, "Workspace not found or you do not have access.");
    return row;
  }
  function event(ws, type = "changed") {
    for (const c of clients.values())
      if (c.ws === ws) c.res.write(`data: ${JSON.stringify({ type })}\n\n`);
  }
  function activity(ws, user, message) {
    run(
      "INSERT INTO activity VALUES(?,?,?,?,?)",
      randomUUID(),
      ws,
      user.id,
      message,
      Date.now(),
    );
    event(ws);
  }
  function cookie(res, token, clear = false) {
    res.setHeader(
      "Set-Cookie",
      `cg_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : 604800}${secure ? "; Secure" : ""}`,
    );
  }
  function login(res, user) {
    const token = randomBytes(32).toString("hex");
    run(
      "INSERT INTO sessions VALUES(?,?,?)",
      hash(token),
      user.id,
      Date.now() + 604800000,
    );
    cookie(res, token);
    return publicUser(user);
  }
  function summary(user) {
    return all(
      "SELECT w.*, (SELECT COUNT(*) FROM members WHERE workspace_id=w.id) AS member_count FROM workspaces w JOIN members m ON m.workspace_id=w.id WHERE m.user_id=? ORDER BY w.created",
      user.id,
    );
  }
  function snapshot(ws) {
    return {
      workspace: one("SELECT * FROM workspaces WHERE id=?", ws),
      members: all(
        "SELECT u.id,u.name,u.email FROM users u JOIN members m ON u.id=m.user_id WHERE m.workspace_id=?",
        ws,
      ).map((u) => ({
        ...u,
        online: [...clients.values()].some(
          (c) => c.ws === ws && c.user === u.id,
        ),
      })),
      tasks: all(
        "SELECT t.*,(SELECT COUNT(*) FROM files f WHERE f.task_id=t.id) AS file_count FROM tasks t WHERE workspace_id=? ORDER BY created DESC",
        ws,
      ),
      messages: all(
        "SELECT * FROM (SELECT m.*,u.name FROM messages m JOIN users u ON u.id=m.user_id WHERE workspace_id=? ORDER BY created DESC LIMIT 150) ORDER BY created",
        ws,
      ),
      activity: all(
        "SELECT a.*,u.name FROM activity a JOIN users u ON u.id=a.user_id WHERE workspace_id=? ORDER BY created DESC LIMIT 100",
        ws,
      ),
      files: all(
        "SELECT f.id,f.task_id,f.name,f.size,f.created,u.name AS author FROM files f JOIN users u ON u.id=f.user_id WHERE workspace_id=? ORDER BY created DESC",
        ws,
      ),
    };
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    );
    const send = (value, status = 200) => {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(value));
    };
    try {
      const url = new URL(req.url, "http://local"),
        p = url.pathname,
        method = req.method;
      if (!["GET", "HEAD"].includes(method)) {
        if (req.headers["sec-fetch-site"] === "cross-site")
          fail(403, "Cross-site requests are not allowed.");
        if (req.headers.origin) {
          let host;
          try {
            host = new URL(req.headers.origin).host;
          } catch {
            fail(403, "Invalid request origin.");
          }
          if (host !== req.headers.host)
            fail(403, "Cross-site requests are not allowed.");
        }
        if (!req.headers["x-workspace-request"])
          fail(403, "Missing request verification header.");
      }
      if (p === "/api/auth/register" || p === "/api/auth/login") {
        if (method !== "POST") fail(405, "Use POST.");
        const ip = req.socket.remoteAddress;
        const a = attempts.get(ip) || { n: 0, until: Date.now() + 600000 };
        if (a.until < Date.now()) {
          a.n = 0;
          a.until = Date.now() + 600000;
        }
        if (++a.n > 25)
          fail(429, "Too many attempts. Please wait ten minutes.");
        attempts.set(ip, a);
        const input = await jsonBody(req),
          email = text(input.email, "Email", 254).toLowerCase(),
          password = input.password;
        if (
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
          typeof password !== "string" ||
          password.length < 8 ||
          password.length > 128
        )
          fail(
            400,
            "Use a valid email and a password between 8 and 128 characters.",
          );
        if (p.endsWith("register")) {
          const name = text(input.name, "Name", 60);
          if (one("SELECT id FROM users WHERE email=?", email))
            fail(409, "This email already has an account. Sign in instead.");
          const salt = randomBytes(16).toString("hex"),
            passwordHash = (await derive(password, salt, 64)).toString("hex"),
            user = { id: randomUUID(), name, email };
          try {
            run(
              "INSERT INTO users VALUES(?,?,?,?,?)",
              user.id,
              name,
              email,
              passwordHash,
              salt,
            );
          } catch {
            fail(409, "This email already has an account.");
          }
          return send({ user: login(res, user), workspaces: [] }, 201);
        }
        const user = one("SELECT * FROM users WHERE email=?", email),
          candidate = await derive(
            password,
            user?.salt || "unknown-account-salt",
            64,
          );
        if (
          !user ||
          !timingSafeEqual(candidate, Buffer.from(user.password, "hex"))
        )
          fail(401, "Email or password is incorrect.");
        return send({ user: login(res, user), workspaces: summary(user) });
      }
      const user = session(req);
      if (p === "/api/me") {
        return send(
          user
            ? { user: publicUser(user), workspaces: summary(user) }
            : { user: null, workspaces: [] },
        );
      }
      if (p.startsWith("/api/") && !user)
        fail(401, "Please sign in to continue.");
      if (p === "/api/auth/logout" && method === "POST") {
        run("DELETE FROM sessions WHERE token=?", user.token);
        cookie(res, "", true);
        for (const [id, c] of clients)
          if (c.token === user.token) {
            clients.delete(id);
            c.res.end();
            event(c.ws, "presence");
          }
        return send({ ok: true });
      }
      if (p === "/api/workspaces" && method === "POST") {
        const input = await jsonBody(req),
          name = text(input.name, "Workspace name", 70),
          description = text(
            input.description || "",
            "Description",
            250,
            false,
          ),
          id = randomUUID(),
          now = Date.now();
        if (summary(user).length >= 20)
          fail(400, "You can join up to 20 workspaces.");
        db.exec("BEGIN");
        try {
          run(
            "INSERT INTO workspaces VALUES(?,?,?,?,?)",
            id,
            name,
            description,
            user.id,
            now,
          );
          run("INSERT INTO members VALUES(?,?)", id, user.id);
          if (input.sample === true) {
            for (const [i, title, status, tag, priority] of [
              [0, "Sketch the first idea", "backlog", "Design", "medium"],
              [
                1,
                "Build something worth sharing",
                "active",
                "Development",
                "high",
              ],
              [2, "Get a fresh pair of eyes", "review", "Research", "medium"],
              [3, "Bring the team together", "done", "Planning", "low"],
            ])
              run(
                "INSERT INTO tasks VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
                randomUUID(),
                id,
                title,
                "Sample task — make it your own or delete it.",
                status,
                priority,
                tag,
                user.id,
                "",
                1,
                now + i,
                now + i,
              );
          }
          run(
            "INSERT INTO activity VALUES(?,?,?,?,?)",
            randomUUID(),
            id,
            user.id,
            "created the workspace",
            now,
          );
          db.exec("COMMIT");
        } catch (e) {
          db.exec("ROLLBACK");
          throw e;
        }
        return send(
          { workspace: one("SELECT * FROM workspaces WHERE id=?", id) },
          201,
        );
      }
      if (p === "/api/join" && method === "POST") {
        const input = await jsonBody(req),
          token = text(input.token, "Invite code", 128),
          invite = one(
            "SELECT * FROM invitations WHERE token=? AND expires>?",
            hash(token),
            Date.now(),
          );
        if (!invite)
          fail(
            404,
            "This invite is invalid or expired. Ask the owner for a new one.",
          );
        if (
          summary(user).length >= 20 &&
          !one(
            "SELECT 1 FROM members WHERE workspace_id=? AND user_id=?",
            invite.workspace_id,
            user.id,
          )
        )
          fail(400, "You can join up to 20 workspaces.");
        const added = run(
          "INSERT OR IGNORE INTO members VALUES(?,?)",
          invite.workspace_id,
          user.id,
        ).changes;
        if (added) activity(invite.workspace_id, user, "joined the workspace");
        return send({
          workspace: one(
            "SELECT * FROM workspaces WHERE id=?",
            invite.workspace_id,
          ),
        });
      }
      const match = p.match(/^\/api\/workspaces\/([\w-]+)(?:\/(.*))?$/);
      if (match) {
        const [, ws, rest = ""] = match;
        const workspace = member(ws, user);
        if (!rest && method === "GET") return send(snapshot(ws));
        if (!rest && method === "PATCH") {
          if (workspace.owner_id !== user.id)
            fail(403, "Only the workspace owner can change these details.");
          const v = await jsonBody(req);
          run(
            "UPDATE workspaces SET name=?,description=? WHERE id=?",
            text(v.name, "Name", 70),
            text(v.description || "", "Description", 250, false),
            ws,
          );
          activity(ws, user, "updated the workspace details");
          return send({ ok: true });
        }
        if (rest === "invite" && method === "POST") {
          if (workspace.owner_id !== user.id)
            fail(403, "Only the owner can create invitations.");
          const token = randomBytes(24).toString("hex"),
            expires = Date.now() + 604800000;
          run("DELETE FROM invitations WHERE workspace_id=?", ws);
          run(
            "INSERT INTO invitations VALUES(?,?,?)",
            hash(token),
            ws,
            expires,
          );
          return send({ token, expires });
        }
        if (rest === "events" && method === "GET") {
          if (
            [...clients.values()].filter((c) => c.user === user.id).length >= 10
          )
            fail(429, "Too many live connections. Close another tab.");
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          });
          res.write(": connected\n\n");
          const id = randomUUID();
          clients.set(id, { ws, user: user.id, res, token: user.token });
          event(ws, "presence");
          req.on("close", () => {
            clients.delete(id);
            if (!closed) event(ws, "presence");
          });
          return;
        }
        if (rest === "tasks" && method === "POST") {
          const v = await jsonBody(req),
            now = Date.now(),
            id = randomUUID();
          const t = validateTask(v, ws);
          run(
            "INSERT INTO tasks VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
            id,
            ws,
            t.title,
            t.description,
            t.status,
            t.priority,
            t.tag,
            t.assignee,
            t.due,
            1,
            now,
            now,
          );
          activity(ws, user, `created “${t.title}”`);
          return send({ task: one("SELECT * FROM tasks WHERE id=?", id) }, 201);
        }
        const taskMatch = rest.match(/^tasks\/([\w-]+)$/);
        if (taskMatch) {
          const task = one(
            "SELECT * FROM tasks WHERE id=? AND workspace_id=?",
            taskMatch[1],
            ws,
          );
          if (!task) fail(404, "Task not found.");
          if (method === "PATCH") {
            const v = await jsonBody(req);
            const current = one(
              "SELECT * FROM tasks WHERE id=? AND workspace_id=?",
              task.id,
              ws,
            );
            if (!current) fail(404, "Task not found.");
            if (v.version !== current.version)
              fail(
                409,
                "Someone just updated this task. Reopen it to load their changes.",
              );
            const t = validateTask({ ...current, ...v }, ws);
            run(
              "UPDATE tasks SET title=?,description=?,status=?,priority=?,tag=?,assignee=?,due=?,version=version+1,updated=? WHERE id=?",
              t.title,
              t.description,
              t.status,
              t.priority,
              t.tag,
              t.assignee,
              t.due,
              Date.now(),
              task.id,
            );
            activity(
              ws,
              user,
              t.status !== current.status
                ? `moved “${t.title}” to ${t.status === "active" ? "in progress" : t.status === "review" ? "in review" : t.status}`
                : `updated “${t.title}”`,
            );
            return send({
              task: one("SELECT * FROM tasks WHERE id=?", task.id),
            });
          }
          if (method === "DELETE") {
            run("DELETE FROM tasks WHERE id=?", task.id);
            activity(ws, user, `deleted “${task.title}”`);
            return send({ ok: true });
          }
        }
        if (rest === "messages" && method === "POST") {
          const v = await jsonBody(req),
            message = text(v.body, "Message", 2000);
          run(
            "INSERT INTO messages VALUES(?,?,?,?,?)",
            randomUUID(),
            ws,
            user.id,
            message,
            Date.now(),
          );
          event(ws, "message");
          return send({ ok: true }, 201);
        }
        if (rest === "files" && method === "POST") {
          const name = text(
              url.searchParams.get("name"),
              "File name",
              180,
            ).replace(/[\x00-\x1f/\\]/g, "_"),
            task = url.searchParams.get("task") || null;
          if (
            task &&
            !one("SELECT id FROM tasks WHERE id=? AND workspace_id=?", task, ws)
          )
            fail(404, "Task not found.");
          if (
            one("SELECT COUNT(*) AS n FROM files WHERE workspace_id=?", ws).n >=
            100
          )
            fail(400, "This workspace has reached its 100-file limit.");
          const data = await body(req, 5 * 1024 * 1024);
          if (!data.length) fail(400, "Choose a file that is not empty.");
          const id = randomUUID();
          run(
            "INSERT INTO files VALUES(?,?,?,?,?,?,?,?)",
            id,
            ws,
            task,
            user.id,
            name,
            data.length,
            data,
            Date.now(),
          );
          activity(ws, user, `shared “${name}”`);
          return send({ id }, 201);
        }
        const fileMatch = rest.match(/^files\/([\w-]+)$/);
        if (fileMatch && method === "GET") {
          const file = one(
            "SELECT * FROM files WHERE id=? AND workspace_id=?",
            fileMatch[1],
            ws,
          );
          if (!file) fail(404, "File not found.");
          res.writeHead(200, {
            "Content-Type": "application/octet-stream",
            "Content-Disposition": `attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(file.name).replace(/'/g, "%27")}`,
            "Content-Length": file.size,
            "Cache-Control": "private, no-store",
          });
          return res.end(Buffer.from(file.data));
        }
        fail(404, "Endpoint not found.");
      }
      if (p.startsWith("/api/")) fail(404, "Endpoint not found.");
      if (!["GET", "HEAD"].includes(method)) fail(405, "Method not allowed.");
      const assets = {
        "/": "index.html",
        "/app.js": "app.js",
        "/style.css": "style.css",
        "/favicon.svg": "favicon.svg",
      };
      if (!assets[p]) fail(404, "Page not found.");
      const data = readFileSync(join(root, "public", assets[p]));
      res.writeHead(200, {
        "Content-Type": p.endsWith(".js")
          ? "application/javascript"
          : p.endsWith(".css")
            ? "text/css"
            : p.endsWith(".svg")
              ? "image/svg+xml"
              : "text/html",
        "Cache-Control": "no-cache",
      });
      res.end(method === "HEAD" ? undefined : data);
    } catch (e) {
      if (res.headersSent) {
        res.end();
        return;
      }
      if (!(e instanceof Failure)) console.error(e);
      send(
        {
          error:
            e instanceof Failure
              ? e.message
              : "Something went wrong. Please try again.",
        },
        e.status || 500,
      );
    }
  });
  function validateTask(v, ws) {
    const title = text(v.title, "Task title", 140),
      description = text(v.description || "", "Description", 5000, false),
      status = v.status || "backlog",
      priority = v.priority || "medium",
      tag = text(v.tag || "General", "Label", 30),
      assignee = v.assignee || null,
      due = v.due || "";
    if (!statuses.includes(status) || !priorities.includes(priority))
      fail(400, "Choose a valid status and priority.");
    if (
      assignee &&
      !one(
        "SELECT 1 FROM members WHERE workspace_id=? AND user_id=?",
        ws,
        assignee,
      )
    )
      fail(400, "Assignee must belong to this workspace.");
    if (
      due &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(due) ||
        !Number.isFinite(Date.parse(due + "T00:00:00Z")) ||
        new Date(due + "T00:00:00Z").toISOString().slice(0, 10) !== due)
    )
      fail(400, "Choose a valid due date.");
    return { title, description, status, priority, tag, assignee, due };
  }
  let closed = false;
  const heartbeat = setInterval(() => {
    run("DELETE FROM sessions WHERE expires<?", Date.now());
    for (const [id, c] of clients) {
      if (
        !one(
          "SELECT 1 FROM sessions WHERE token=? AND expires>?",
          c.token,
          Date.now(),
        )
      ) {
        clients.delete(id);
        c.res.end();
        event(c.ws, "presence");
      } else c.res.write(": heartbeat\n\n");
    }
    for (const [ip, a] of attempts)
      if (a.until < Date.now()) attempts.delete(ip);
  }, 20000);
  heartbeat.unref();
  return {
    server,
    db,
    close() {
      closed = true;
      clearInterval(heartbeat);
      for (const c of clients.values()) c.res.end();
      clients.clear();
      server.close();
      db.close();
    },
  };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const app = createApp(),
    port = Number(process.env.PORT) || 4181;
  app.server.listen(port, process.env.HOST || "127.0.0.1", () =>
    console.log(`Common Ground is running at http://localhost:${port}`),
  );
  process.on("SIGINT", () => {
    app.close();
    process.exit(0);
  });
}

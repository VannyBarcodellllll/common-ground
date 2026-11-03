import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server.mjs";

test("collaboration, private data, conflicts, files, live events, and persistent sessions", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "common-ground-test-"));
  let app = createApp({ dataDir: dir });
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  let base = "http://127.0.0.1:" + app.server.address().port;
  t.after(() => {
    app.close();
    assert.ok(dir.startsWith(join(tmpdir(), "common-ground-test-")));
    rmSync(dir, { recursive: true, force: true });
  });
  function client() {
    let cookie = "";
    return {
      get cookie() {
        return cookie;
      },
      async request(path, body, method = body ? "POST" : "GET", extra = {}) {
        const res = await fetch(base + path, {
          method,
          headers: {
            ...(cookie ? { Cookie: cookie } : {}),
            "X-Workspace-Request": "1",
            "Content-Type": "application/json",
            ...extra,
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        if (res.headers.get("set-cookie"))
          cookie = res.headers.get("set-cookie").split(";")[0];
        return {
          status: res.status,
          data: await res.json(),
          headers: res.headers,
        };
      },
    };
  }
  const owner = client(),
    teammate = client(),
    outsider = client();
  await t.test(
    "accounts use hashed passwords and private sessions",
    async () => {
      for (const [c, name] of [
        [owner, "Owner"],
        [teammate, "Teammate"],
        [outsider, "Outsider"],
      ]) {
        const r = await c.request("/api/auth/register", {
          name,
          email: name.toLowerCase() + "@example.test",
          password: "a good password",
        });
        assert.equal(r.status, 201);
        assert.ok(!("password" in r.data.user));
        assert.match(r.headers.get("set-cookie"), /HttpOnly; SameSite=Strict/);
      }
      assert.equal(
        (await client().request("/api/workspaces/none")).status,
        401,
      );
      assert.equal(
        (
          await owner.request("/api/auth/login", {
            email: "owner@example.test",
            password: "wrong password",
          })
        ).status,
        401,
      );
      assert.notEqual(
        app.db.prepare("SELECT password FROM users LIMIT 1").get().password,
        "a good password",
      );
    },
  );
  let ws, task, invite, teammateId;
  await t.test("malformed bodies fail cleanly", async () => {
    const response = await fetch(base + "/api/auth/register", {
      method: "POST",
      headers: {
        "X-Workspace-Request": "1",
        "Content-Type": "application/json",
      },
      body: "null",
    });
    assert.equal(response.status, 400);
  });
  await t.test(
    "workspace data is private and invites are owner-controlled",
    async () => {
      ws = (
        await owner.request("/api/workspaces", {
          name: "A shared project",
          description: "Test workspace",
          sample: false,
        })
      ).data.workspace.id;
      assert.equal(
        (await outsider.request("/api/workspaces/" + ws)).status,
        404,
      );
      invite = (await owner.request(`/api/workspaces/${ws}/invite`, {})).data
        .token;
      assert.equal(
        (await teammate.request("/api/join", { token: invite })).status,
        200,
      );
      teammateId = (await teammate.request("/api/me")).data.user.id;
      assert.equal(
        (await teammate.request(`/api/workspaces/${ws}/invite`, {})).status,
        403,
      );
      assert.equal(
        (
          await teammate.request(
            `/api/workspaces/${ws}`,
            { name: "Unwanted rename" },
            "PATCH",
          )
        ).status,
        403,
      );
      assert.equal(
        (await teammate.request("/api/workspaces/" + ws)).data.members.length,
        2,
      );
      const newer = await owner.request(`/api/workspaces/${ws}/invite`, {});
      assert.notEqual(newer.data.token, invite);
      assert.equal(
        (await outsider.request("/api/join", { token: invite })).status,
        404,
      );
    },
  );
  await t.test(
    "task CRUD validates assignees and prevents stale overwrites",
    async () => {
      task = (
        await owner.request(`/api/workspaces/${ws}/tasks`, {
          title: "Build our feature",
          status: "active",
          priority: "high",
          assignee: teammateId,
        })
      ).data.task;
      assert.equal(task.version, 1);
      assert.equal(
        (
          await owner.request(`/api/workspaces/${ws}/tasks`, {
            title: "Invalid calendar date",
            due: "2026-02-31",
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await outsider.request(
            `/api/workspaces/${ws}/tasks/${task.id}`,
            { title: "Overwrite", version: 1 },
            "PATCH",
          )
        ).status,
        404,
      );
      const r = await teammate.request(
        `/api/workspaces/${ws}/tasks/${task.id}`,
        { status: "review", version: 1 },
        "PATCH",
      );
      assert.equal(r.data.task.version, 2);
      assert.equal(
        (
          await owner.request(
            `/api/workspaces/${ws}/tasks/${task.id}`,
            { title: "Stale", version: 1 },
            "PATCH",
          )
        ).status,
        409,
      );
      assert.equal(
        (
          await owner.request(`/api/workspaces/${ws}/tasks`, {
            title: "Invalid assignee",
            assignee: "not-a-member",
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await owner.request(`/api/workspaces/${ws}/tasks`, {
            title: "Invalid status",
            status: "oops",
          })
        ).status,
        400,
      );
    },
  );
  await t.test(
    "simultaneous task edits accept exactly one version",
    async () => {
      const results = await Promise.all(
        [owner, teammate].map((c) =>
          c.request(
            `/api/workspaces/${ws}/tasks/${task.id}`,
            { description: "Concurrent edit", version: 2 },
            "PATCH",
          ),
        ),
      );
      assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
    },
  );
  await t.test(
    "cross-origin mutations and missing verification headers fail",
    async () => {
      assert.equal(
        (
          await owner.request(
            `/api/workspaces/${ws}/messages`,
            { body: "CSRF" },
            "POST",
            { Origin: "https://untrusted.example" },
          )
        ).status,
        403,
      );
      const res = await fetch(base + `/api/workspaces/${ws}/messages`, {
        method: "POST",
        headers: { Cookie: owner.cookie, "Content-Type": "application/json" },
        body: '{"body":"no header"}',
      });
      assert.equal(res.status, 403);
    },
  );
  await t.test(
    "live connection receives another user’s chat update",
    async () => {
      const abort = new AbortController();
      const response = await fetch(base + `/api/workspaces/${ws}/events`, {
        headers: { Cookie: owner.cookie },
        signal: abort.signal,
      });
      assert.equal(response.headers.get("content-type"), "text/event-stream");
      const reader = response.body.getReader();
      await reader.read();
      assert.equal(
        (
          await teammate.request(`/api/workspaces/${ws}/messages`, {
            body: "The feature is ready for review.",
          })
        ).status,
        201,
      );
      const timeout = setTimeout(() => abort.abort(), 3000);
      try {
        let text = "";
        while (!text.includes("message")) {
          const r = await reader.read();
          text += new TextDecoder().decode(r.value);
        }
        assert.match(text, /"type":"message"/);
      } finally {
        clearTimeout(timeout);
        abort.abort();
      }
      assert.equal(
        (await owner.request("/api/workspaces/" + ws)).data.messages[0].name,
        "Teammate",
      );
    },
  );
  await t.test(
    "files require membership and retain bytes; task deletion keeps file",
    async () => {
      const res = await fetch(
        base + `/api/workspaces/${ws}/files?name=brief.txt&task=${task.id}`,
        {
          method: "POST",
          headers: { Cookie: owner.cookie, "X-Workspace-Request": "1" },
          body: "A useful project brief",
        },
      );
      assert.equal(res.status, 201);
      const file = await res.json();
      assert.equal(
        (await outsider.request(`/api/workspaces/${ws}/files/${file.id}`))
          .status,
        404,
      );
      const download = await fetch(
        base + `/api/workspaces/${ws}/files/${file.id}`,
        { headers: { Cookie: teammate.cookie } },
      );
      assert.equal(await download.text(), "A useful project brief");
      assert.match(download.headers.get("content-disposition"), /^attachment/);
      assert.equal(
        (
          await owner.request(
            `/api/workspaces/${ws}/tasks/${task.id}`,
            undefined,
            "DELETE",
          )
        ).status,
        200,
      );
      const snap = (await owner.request("/api/workspaces/" + ws)).data;
      assert.equal(snap.tasks.length, 0);
      assert.equal(snap.files[0].task_id, null);
      assert.ok(snap.activity.length >= 5);
    },
  );
  await t.test(
    "database survives restart; logout revokes authenticated access",
    async () => {
      await new Promise((r) => app.server.close(r));
      app.close();
      app = createApp({ dataDir: dir });
      await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
      base = "http://127.0.0.1:" + app.server.address().port;
      assert.equal(
        (await owner.request("/api/workspaces/" + ws)).data.messages.length,
        1,
      );
      const old = teammate.cookie;
      assert.equal(
        (await teammate.request("/api/auth/logout", {})).status,
        200,
      );
      const res = await fetch(base + "/api/workspaces/" + ws, {
        headers: { Cookie: old },
      });
      assert.equal(res.status, 401);
    },
  );
});

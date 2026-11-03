const $ = (s, root = document) => root.querySelector(s),
  $$ = (s, root = document) => [...root.querySelectorAll(s)];
const paths = {
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  board: "M3 4h18v16H3zM9 4v16M15 4v16",
  check: "m6 12 4 4 8-8",
  checkCircle: "M22 11.1V12a10 10 0 1 1-5.9-9.1M22 4 12 14l-3-3",
  circle: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  activity: "M3 12h4l3-8 4 16 3-8h4",
  chat: "M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-3 2V11.5a10 10 0 0 1 20 0Z",
  folder: "M3 5h6l2 3h10v12H3z",
  file: "M14 2H5v20h14V7zM14 2v6h5M8 13h8M8 17h6",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  plus: "M12 5v14M5 12h14",
  chevron: "m8 10 4 4 4-4",
  right: "m9 5 7 7-7 7",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  search: "M21 21l-5-5M18 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  filter: "M4 6h16M7 12h10M10 18h4",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  dots: "M5 12h.01M12 12h.01M19 12h.01",
  clock: "M12 8v4l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  calendar: "M4 5h16v16H4zM4 10h16M8 3v4M16 3v4",
  flag: "M5 21V3m0 0c4-3 8 3 14 0v10c-6 3-10-3-14 0",
  link: "M10 13a5 5 0 0 0 7 .1l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7-.1l-3 3a5 5 0 0 0 7 7l2-2",
  send: "m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13",
  clip: "m21 11-8 8a6 6 0 0 1-8-8L15 2a4 4 0 0 1 6 6L10 18a2 2 0 0 1-3-3l9-9",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M9 3l-1 3-3 1-2 3 2 2-1 3 3 3 3-1 2 2 3-1 1-3 3-1 2-3-2-2 1-3-3-3-3 1-2-2z",
  logout: "M9 21H4V3h5M9 12h12m-5-5 5 5-5 5",
  moon: "M21 13a9 9 0 0 1-10-10A9 9 0 1 0 21 13",
  sun: "M12 3V1M12 23v-2M3 12H1M23 12h-2M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0",
  close: "M6 6l12 12M6 18 18 6",
  menu: "M4 6h16M4 12h16M4 18h16",
  download: "M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4",
  lock: "M5 10h14v11H5zM8 10V6a4 4 0 0 1 8 0v4",
  spark: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3",
  copy: "M9 9h12v12H9zM15 9V3H3v12h6",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
};
const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.grid}"/></svg>`;
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const initials = (name) =>
  name
    .replace(/\([^)]*\)/g, "")
    .trim()
    .split(/\s+/)
    .map((s) => s[0] || "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
const color = (id) => [...id].reduce((a, c) => a + c.charCodeAt(0), 0) % 4;
const avatar = (u, online = false) =>
  `<span class="avatar" data-color="${color(u.id)}" title="${esc(u.name)}${online ? " — online" : ""}">${esc(initials(u.name))}${online ? '<i class="dot"></i>' : ""}</span>`;
const names = {
  backlog: "To do",
  active: "In progress",
  review: "In review",
  done: "Done",
};
function localDate() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}
let me,
  workspaces = [],
  data,
  wsId,
  stream,
  view = "board",
  railView = "chat",
  myOnly = false,
  query = "",
  priorityFilter = "",
  showFilters = false,
  authMode = "register",
  refreshSequence = 0,
  toastTimeout;
let inviteToken = new URL(location.href).searchParams.get("invite") || "";
try {
  if (localStorage.getItem("cg-theme") === "dark")
    document.documentElement.classList.add("dark");
} catch {}
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => ($("#toast").hidden = true), 4500);
}
async function api(path, { method = "GET", body, raw = false } = {}) {
  const res = await fetch(path, {
    method,
    headers:
      method === "GET"
        ? {}
        : {
            "X-Workspace-Request": "1",
            ...(raw ? {} : { "Content-Type": "application/json" }),
          },
    body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
  });
  let json;
  try {
    json = await res.json();
  } catch {
    throw Error("The server did not respond. Please try again.");
  }
  if (!res.ok) {
    if (res.status === 401 && me) {
      stream?.close();
      me = null;
      renderAuth();
    }
    throw Error(json.error || "Something went wrong.");
  }
  return json;
}
const endpoint = (s) => `/api/workspaces/${wsId}${s ? "/" + s : ""}`;
function modal(title, content, footer = "") {
  const el = $("#modal");
  $("#modal-content").innerHTML =
    `<div class="modal-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" id="close-modal" aria-label="Close dialog">${icon("close")}</button></div>${content}${footer}`;
  el.setAttribute("aria-label", title);
  $("#close-modal").onclick = () => el.close();
  if (!el.open) el.showModal();
  return el;
}
function formError(form, error) {
  $(".error", form).textContent = error.message || error;
}
function buttonBusy(button, busy) {
  button.disabled = busy;
}
function dateText(date) {
  if (!date) return "";
  return new Date(date + "T12:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
function timeText(n) {
  return new Date(n).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
function relative(n) {
  const m = Math.floor((Date.now() - n) / 60000);
  return m < 1
    ? "Just now"
    : m < 60
      ? `${m}m ago`
      : m < 1440
        ? `${Math.floor(m / 60)}h ago`
        : new Date(n).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          });
}
const sizeText = (n) =>
  n < 1024
    ? n + " B"
    : n < 1048576
      ? (n / 1024).toFixed(0) + " KB"
      : (n / 1048576).toFixed(1) + " MB";
const brand = () =>
  `<div class="brand"><span class="brand-mark">${icon("grid")}</span><span>common ground<span class="muted">.</span></span></div>`;
function renderAuth() {
  document.title = "Common Ground — your team, in sync";
  $("#app").innerHTML =
    `<main class="auth" id="main"><section class="auth-story">${brand()}<h1>Good things<br>happen <span>together.</span></h1><p>A shared home for the tasks, conversations, and small wins that move your team forward.</p><div class="auth-proof"><span>${icon("board")} Shared boards</span><span>${icon("chat")} Real conversations</span><span>${icon("activity")} In sync, live</span></div><div class="auth-art" aria-hidden="true"><div class="art-column"><div class="art-heading"><i class="status-dot active"></i> In progress</div><div class="art-task"><small>Design</small><p>Make the first impression count</p><div class="art-line"></div></div><div class="art-task"><small>Development</small><p>Bring the idea to life</p><div class="art-line"></div></div></div><div class="art-column"><div class="art-heading"><i class="status-dot done"></i> Done</div><div class="art-task"><small>A little milestone</small><p>Find our common ground</p>${icon("checkCircle")}</div></div></div><footer>A little less managing. A little more making.</footer></section><section class="auth-form-side"><div class="auth-card"><h2>${inviteToken ? "You’re invited." : "Your next chapter starts here."}</h2><p>${inviteToken ? "Sign in or create an account to join your team’s workspace." : "Bring your people and your next big idea. We’ll keep everything in one place."}</p><div class="auth-tabs"><button data-auth="register" class="${authMode === "register" ? "selected" : ""}">Create account</button><button data-auth="login" class="${authMode === "login" ? "selected" : ""}">Sign in</button></div><form id="auth-form">${authMode === "register" ? '<div class="field"><label for="auth-name">Your name</label><input id="auth-name" name="name" placeholder="e.g. Vanny" autocomplete="name" required maxlength="60"></div>' : ""}<div class="field"><label for="auth-email">Email address</label><input id="auth-email" name="email" type="email" placeholder="you@example.com" autocomplete="email" required maxlength="254"></div><div class="field"><label for="auth-password">Password</label><input id="auth-password" name="password" type="password" placeholder="At least 8 characters" autocomplete="${authMode === "register" ? "new-password" : "current-password"}" required minlength="8" maxlength="128"></div><p class="error" role="alert"></p><button class="btn primary wide" type="submit">${authMode === "register" ? "Create your account" : "Welcome back"} ${icon("arrow")}</button></form><div class="divider">or get a feel for it</div><button class="btn wide" id="demo-button">${icon("spark")} Explore a demo workspace</button><p class="auth-bottom">Your workspace, your team. No inbox noise.<br>Demo mode creates a separate account with sample tasks.</p></div></section></main>`;
  $$("[data-auth]").forEach(
    (b) =>
      (b.onclick = () => {
        authMode = b.dataset.auth;
        renderAuth();
      }),
  );
  $("#auth-form").onsubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget,
      button = $("button[type=submit]", form);
    buttonBusy(button, true);
    try {
      const input = Object.fromEntries(new FormData(form)),
        r = await api("/api/auth/" + authMode, { method: "POST", body: input });
      me = r.user;
      workspaces = r.workspaces;
      await afterLogin();
    } catch (err) {
      formError(form, err);
    } finally {
      buttonBusy(button, false);
    }
  };
  $("#demo-button").onclick = async (e) => {
    const b = e.currentTarget;
    b.disabled = true;
    b.textContent = "Preparing your workspace…";
    try {
      const id = crypto.randomUUID();
      const r = await api("/api/auth/register", {
        method: "POST",
        body: {
          name: "Vanny",
          email: `demo-${id}@example.test`,
          password: crypto.randomUUID() + crypto.randomUUID(),
        },
      });
      me = r.user;
      const w = await api("/api/workspaces", {
        method: "POST",
        body: {
          name: "The next big thing",
          description: "A space for good ideas to become great work.",
          sample: true,
        },
      });
      const result = await api("/api/me");
      workspaces = result.workspaces;
      await openWorkspace(w.workspace.id);
      toast("Your own demo workspace. Everything here is editable.");
    } catch (err) {
      toast(err.message);
      b.disabled = false;
      b.innerHTML = icon("spark") + " Explore a demo workspace";
    }
  };
}
async function afterLogin() {
  if (inviteToken) {
    try {
      const r = await api("/api/join", {
        method: "POST",
        body: { token: inviteToken },
      });
      inviteToken = "";
      history.replaceState(null, "", location.pathname);
      workspaces = (await api("/api/me")).workspaces;
      await openWorkspace(r.workspace.id);
      toast("You’re in. Welcome to the team.");
      return;
    } catch (err) {
      toast(err.message);
    }
  }
  if (workspaces.length) {
    let previous;
    try {
      previous = localStorage.getItem("cg-workspace");
    } catch {}
    await openWorkspace(
      workspaces.some((w) => w.id === previous) ? previous : workspaces[0].id,
    );
  } else renderOnboarding();
}
function renderOnboarding() {
  $("#app").innerHTML =
    `<main class="onboarding" id="main"><div class="onboarding-box">${brand()}<h1>Make a little room for your team.</h1><p>Welcome, ${esc(me.name.split(" ")[0])}. Start a workspace for your next project, or join a team with an invite code.</p><div class="actions"><button class="btn primary" id="create-first">${icon("plus")} Create a workspace</button><button class="btn" id="join-first">${icon("link")} Join a team</button></div><div class="signout"><button id="logout">Sign out</button></div></div></main>`;
  $("#create-first").onclick = createWorkspace;
  $("#join-first").onclick = joinWorkspace;
  $("#logout").onclick = logout;
}
async function openWorkspace(id) {
  stream?.close();
  wsId = id;
  query = "";
  priorityFilter = "";
  myOnly = false;
  view = "board";
  data = await api(endpoint());
  try {
    localStorage.setItem("cg-workspace", id);
  } catch {}
  renderShell();
  connect();
}
function connect() {
  stream?.close();
  stream = new EventSource(endpoint("events"));
  stream.onopen = () => setConnection(true);
  stream.onerror = () => setConnection(false);
  stream.onmessage = () => refresh();
}
function setConnection(live) {
  const el = $("#connection");
  if (el) {
    el.classList.toggle("live", live);
    el.innerHTML = `<i></i>${live ? "Live updates" : "Reconnecting…"}`;
  }
}
async function refresh() {
  if (dragActive) return;
  const seq = ++refreshSequence,
    id = wsId;
  try {
    const next = await api(endpoint());
    if (id !== wsId || seq !== refreshSequence || dragActive) return;
    data = next;
    renderProject();
    renderView();
    renderRail();
    updateWorkspaceName();
  } catch (err) {
    if (me) {
      setConnection(false);
      toast(err.message);
    }
  }
}
function updateWorkspaceName() {
  $$("[data-ws-name]").forEach((el) => (el.textContent = data.workspace.name));
  document.title = data.workspace.name + " — Common Ground";
}
function renderShell() {
  $("#app").innerHTML =
    `<div class="app-shell"><div class="sidebar-backdrop" id="sidebar-backdrop"></div><aside class="sidebar" id="sidebar">${brand()}<button class="workspace-choice" id="workspace-switch"><span class="mini-logo">${esc(initials(data.workspace.name))}</span><span class="choice-text"><span class="truncate" data-ws-name>${esc(data.workspace.name)}</span><small>Team workspace</small></span>${icon("chevron")}</button><div><div class="sidebar-label">WORKSPACE</div><nav class="nav" aria-label="Workspace"><button data-nav="board" class="selected">${icon("board")} Project board</button><button data-nav="mine">${icon("checkCircle")} My tasks <span class="badge" id="my-count"></span></button><button data-nav="activity">${icon("activity")} Activity</button><button data-nav="files">${icon("folder")} Shared files</button><button data-nav="members">${icon("users")} People</button></nav></div><div><div class="sidebar-label">YOUR PROJECT</div><div class="sidebar-project"><i></i><span class="truncate" data-ws-name>${esc(data.workspace.name)}</span></div></div><div class="sidebar-foot"><div class="sidebar-note"><h3>A better place to build.</h3><p>Bring everyone onto the same page. Good work starts together.</p><button id="sidebar-invite">Invite your team</button></div><div class="nav"><button id="settings">${icon("settings")} Workspace settings</button></div><div class="user-menu">${avatar(me)}<div class="user-name"><span class="truncate">${esc(me.name)}</span><small>${me.email.endsWith("@example.test") ? "Demo account" : "Personal account"}</small></div><button class="icon-btn" id="logout" aria-label="Sign out">${icon("logout")}</button></div></div></aside><div class="body-area"><header class="topbar"><div class="breadcrumbs"><button class="icon-btn mobile-menu" id="menu-toggle" aria-label="Open navigation">${icon("menu")}</button><span class="parent">Workspace</span>${icon("right")}<span>Project overview</span></div><div class="topbar-tools"><span class="connection" id="connection"><i></i>Connecting…</span><button class="icon-btn" id="theme-toggle" aria-label="Switch color theme">${icon(document.documentElement.classList.contains("dark") ? "sun" : "moon")}</button><button class="icon-btn chat-toggle" id="chat-toggle" aria-label="Open team chat">${icon("chat")}</button>${avatar(me)}</div></header><div class="content-split"><main class="main" id="main" tabindex="-1"><div id="project-header"></div><div class="view-bar"><nav class="tabs" aria-label="Project views"><button class="tab selected" data-view="board">${icon("board")} Board</button><button class="tab" data-view="list">${icon("list")} List</button><button class="tab" data-view="activity">${icon("activity")} Activity</button><button class="tab" data-view="files">${icon("folder")} Files</button></nav><div class="view-actions"><label class="search">${icon("search")}<input id="search" name="search" aria-label="Search tasks" placeholder="Search tasks…" type="search" autocomplete="off"></label><button class="filter-button" id="filter-toggle">${icon("filter")} Filter</button></div></div><div id="filters"></div><div class="board-toolbar"><span id="view-description">All tasks</span><span class="drag-hint">Drag to move · Open a card to edit</span></div><div class="content-panel" id="view-content"></div><footer class="main-footer"><span>${icon("lock")} Only your workspace members can see this</span><span id="member-summary"></span></footer></main><aside class="rail" id="rail" aria-label="Team space"><div class="rail-head"><h2>Team space</h2><span>${icon("chat")}</span><button class="icon-btn rail-close" id="rail-close" aria-label="Close team chat">${icon("close")}</button></div><div class="rail-tabs"><button data-rail="chat" class="selected">Conversation</button><button data-rail="activity">Recent activity</button></div><div class="chat-area" id="chat-area"><div class="chat-list" id="chat-list"></div><form class="chat-compose" id="chat-form"><label class="sr-only" for="message">Message your team</label><textarea id="message" name="message" placeholder="Message your team…" maxlength="2000" required></textarea><div class="compose-footer"><small>Keep the conversation going.</small><button class="send" type="submit" aria-label="Send message">${icon("send")}</button></div></form><p class="chat-foot">Enter to send · Shift + Enter for a new line</p></div><div class="rail-activity" id="rail-activity" hidden></div><div class="online-list" id="online-list"></div></aside></div></div></div>`;
  $("#workspace-switch").onclick = switchWorkspace;
  $("#sidebar-invite").onclick = invite;
  $("#settings").onclick = settings;
  $("#logout").onclick = logout;
  $("#theme-toggle").onclick = () => {
    const dark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("cg-theme", dark ? "dark" : "light");
    } catch {}
    $("#theme-toggle").innerHTML = icon(dark ? "sun" : "moon");
  };
  const menu = (open) => {
    $("#sidebar").classList.toggle("open", open);
    $("#sidebar-backdrop").classList.toggle("open", open);
  };
  $("#menu-toggle").onclick = () => menu(true);
  $("#sidebar-backdrop").onclick = () => menu(false);
  $("#chat-toggle").onclick = () => $("#rail").classList.toggle("open");
  $("#rail-close").onclick = () => $("#rail").classList.remove("open");
  $$("[data-nav]").forEach(
    (b) =>
      (b.onclick = () => {
        myOnly = b.dataset.nav === "mine";
        view = ["board", "mine"].includes(b.dataset.nav)
          ? "board"
          : b.dataset.nav;
        menu(false);
        renderView();
      }),
  );
  $$("[data-view]").forEach(
    (b) =>
      (b.onclick = () => {
        view = b.dataset.view;
        renderView();
      }),
  );
  $("#search").oninput = (e) => {
    query = e.target.value;
    renderView();
  };
  $("#filter-toggle").onclick = () => {
    showFilters = !showFilters;
    renderFilters();
  };
  $$("[data-rail]").forEach(
    (b) =>
      (b.onclick = () => {
        railView = b.dataset.rail;
        renderRail();
      }),
  );
  $("#chat-form").onsubmit = sendMessage;
  $("#message").onkeydown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      $("#chat-form").requestSubmit();
    }
  };
  renderProject();
  renderFilters();
  renderView();
  renderRail();
  updateWorkspaceName();
}
function renderProject() {
  if (!$("#project-header")) return;
  const total = data.tasks.length,
    done = data.tasks.filter((t) => t.status === "done").length,
    active = data.tasks.filter((t) => t.status === "active").length,
    percent = total ? Math.round((done / total) * 100) : 0;
  $("#project-header").innerHTML =
    `<div class="project-top"><div class="project-name"><div class="project-monogram">${icon("spark")}</div><div><h1>${esc(data.workspace.name)}</h1><p>${esc(data.workspace.description || "Your people, your plans, and a little forward momentum.")}</p></div></div><div class="project-tools"><div class="avatar-stack">${data.members
      .slice(0, 4)
      .map((u) => avatar(u))
      .join(
        "",
      )}</div><button class="btn" id="invite-button">${icon("users")} Invite</button><button class="btn primary" id="new-task">${icon("plus")} New task</button></div></div><div class="metrics"><div class="metric"><div><p class="metric-label">Total tasks</p><div class="metric-number">${total}</div></div><span class="metric-icon">${icon("board")}</span></div><div class="metric"><div><p class="metric-label">In progress</p><div class="metric-number">${active}</div></div><span class="metric-icon">${icon("clock")}</span></div><div class="metric done"><div><p class="metric-label">Completed <span class="muted">· ${percent}%</span></p><div class="metric-number">${done}</div></div><span class="metric-icon">${icon("checkCircle")}</span></div></div>`;
  $("#new-task").onclick = () => taskModal();
  $("#invite-button").onclick = invite;
  $("#my-count").textContent = data.tasks.filter(
    (t) => t.assignee === me.id && t.status !== "done",
  ).length;
  $("#member-summary").textContent =
    `${data.members.length} member${data.members.length === 1 ? "" : "s"} · ${data.members.filter((u) => u.online).length} online`;
}
function filtered() {
  return data.tasks.filter(
    (t) =>
      (!myOnly || t.assignee === me.id) &&
      (!priorityFilter || t.priority === priorityFilter) &&
      (!query ||
        [t.title, t.description, t.tag].some((v) =>
          v.toLowerCase().includes(query.toLowerCase()),
        )),
  );
}
function renderFilters() {
  const el = $("#filters");
  if (!el) return;
  el.innerHTML = showFilters
    ? `<div class="filter-panel"><label for="priority-filter">Priority</label><select id="priority-filter"><option value="">All priorities</option>${["high", "medium", "low"].map((p) => `<option value="${p}" ${priorityFilter === p ? "selected" : ""}>${p[0].toUpperCase() + p.slice(1)}</option>`).join("")}</select><button class="btn ghost" id="clear-filters">Clear filters</button></div>`
    : "";
  $("#filter-toggle").classList.toggle(
    "active",
    showFilters || !!priorityFilter,
  );
  if (showFilters) {
    $("#priority-filter").onchange = (e) => {
      priorityFilter = e.target.value;
      renderView();
    };
    $("#clear-filters").onclick = () => {
      priorityFilter = "";
      myOnly = false;
      query = "";
      $("#search").value = "";
      renderFilters();
      renderView();
    };
  }
}
function taskCard(t) {
  const u = data.members.find((u) => u.id === t.assignee),
    overdue = t.due && t.due < localDate() && t.status !== "done";
  return `<article class="task" draggable="true" data-task="${t.id}" tabindex="0" role="button" aria-label="Open task: ${esc(t.title)}"><div class="task-tags"><span class="tag ${["design", "research", "planning"].includes(t.tag.toLowerCase()) ? t.tag.toLowerCase() : ""}">${esc(t.tag)}</span><span class="task-menu">${icon("dots")}</span></div><h3>${esc(t.title)}</h3>${t.description ? `<p class="description">${esc(t.description)}</p>` : ""}<div class="priority ${t.priority}">${icon("flag")}${t.priority[0].toUpperCase() + t.priority.slice(1)} priority</div><div class="task-footer"><div class="task-metadata">${t.due ? `<span class="due ${overdue ? "overdue" : ""}">${icon("calendar")}${dateText(t.due)}</span>` : "<span>No due date</span>"}${t.file_count ? `<span class="due">${icon("clip")}${t.file_count}</span>` : ""}</div>${u ? avatar(u) : '<span title="Unassigned">—</span>'}</div></article>`;
}
function renderView() {
  const el = $("#view-content");
  if (!el || !data) return;
  const tasks = filtered();
  $$("[data-view]").forEach((b) =>
    b.classList.toggle("selected", view === b.dataset.view),
  );
  $$("[data-nav]").forEach((b) =>
    b.classList.toggle(
      "selected",
      b.dataset.nav ===
        (myOnly && view === "board"
          ? "mine"
          : view === "list"
            ? "board"
            : view),
    ),
  );
  $("#view-description").innerHTML =
    `<strong>${view === "members" ? "Your people" : view === "activity" ? "The latest, as it happens" : view === "files" ? "Everything shared in one place" : myOnly ? "Assigned to you" : "All tasks"}</strong>${["board", "list"].includes(view) ? ` <span class="muted">/ ${tasks.length} task${tasks.length === 1 ? "" : "s"}${query || priorityFilter ? " matching filters" : ""}</span>` : ""}`;
  $(".view-actions").hidden = !["board", "list"].includes(view);
  if (view === "board") {
    el.innerHTML = `<div class="board">${Object.entries(names)
      .map(
        ([status, label]) =>
          `<section class="column" data-status="${status}" aria-label="${label}"><div class="column-heading"><div class="column-title"><span class="status-dot ${status}"></span>${label}<span class="column-count">${tasks.filter((t) => t.status === status).length}</span></div><button class="icon-btn" data-add="${status}" aria-label="Add task to ${label}">${icon("plus")}</button></div>${tasks
            .filter((t) => t.status === status)
            .map(taskCard)
            .join(
              "",
            )}<button class="add-card" data-add="${status}">${icon("plus")} Add task</button></section>`,
      )
      .join("")}</div>`;
    $$("[data-add]").forEach(
      (b) => (b.onclick = () => taskModal(null, b.dataset.add)),
    );
    $$("[data-task]").forEach((b) => {
      b.onclick = () => taskModal(b.dataset.task);
      b.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          taskModal(b.dataset.task);
        }
      };
      b.ondragstart = (e) => {
        e.dataTransfer.setData("text/plain", b.dataset.task);
        e.dataTransfer.effectAllowed = "move";
        b.classList.add("dragging");
      };
      b.ondragend = () => b.classList.remove("dragging");
    });
    $$(".column").forEach((c) => {
      c.ondragover = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        c.classList.add("drop-target");
      };
      c.ondragleave = (e) => {
        if (!c.contains(e.relatedTarget)) c.classList.remove("drop-target");
      };
      c.ondrop = async (e) => {
        e.preventDefault();
        c.classList.remove("drop-target");
        const t = data.tasks.find(
          (t) => t.id === e.dataTransfer.getData("text/plain"),
        );
        if (t && t.status !== c.dataset.status) {
          try {
            await api(endpoint("tasks/" + t.id), {
              method: "PATCH",
              body: { status: c.dataset.status, version: t.version },
            });
            await refresh();
          } catch (err) {
            toast(err.message);
            refresh();
          }
        }
      };
    });
  } else if (view === "list") {
    el.innerHTML = tasks.length
      ? `<div class="table-wrap"><table class="task-table"><thead><tr><th>Task</th><th>Status</th><th>Priority</th><th>Assignee</th><th>Due date</th></tr></thead><tbody>${tasks.map((t) => `<tr><td><button data-task="${t.id}">${esc(t.title)}</button></td><td><span class="status-label"><i class="status-dot ${t.status}"></i>${names[t.status]}</span></td><td><span class="priority ${t.priority}">${icon("flag")}${t.priority}</span></td><td>${data.members.find((u) => u.id === t.assignee) ? avatar(data.members.find((u) => u.id === t.assignee)) : "—"}</td><td>${dateText(t.due) || "—"}</td></tr>`).join("")}</tbody></table></div>`
      : empty(
          "No tasks here yet",
          "Start with one small next step. Create a task or clear your filters.",
          "board",
        );
    $$("[data-task]").forEach(
      (b) => (b.onclick = () => taskModal(b.dataset.task)),
    );
  } else if (view === "activity") {
    el.innerHTML =
      data.activity.map(activityRow).join("") ||
      empty(
        "A fresh beginning",
        "Your workspace story will appear here as your team gets to work.",
        "activity",
      );
  } else if (view === "files") {
    el.innerHTML = `<div class="board-toolbar"><span>Up to 5 MB per file · 100 files per workspace</span><button class="btn" id="upload-workspace">${icon("plus")} Upload file</button></div>${data.files.length ? data.files.map(fileRow).join("") : empty("A place for the good stuff", "Share a brief, a sketch, or the file your team keeps asking for.", "folder")}`;
    $("#upload-workspace").onclick = () => uploadModal();
  } else if (view === "members") {
    el.innerHTML = `<div class="members-list">${data.members.map((u) => `<div class="member-row">${avatar(u, u.online)}<div class="member-details"><strong>${esc(u.name)}${u.id === me.id ? " (you)" : ""}</strong><small class="truncate">${esc(u.email)}</small></div><span class="member-role">${u.id === data.workspace.owner_id ? "Owner" : "Member"} · ${u.online ? "Online" : "Offline"}</span></div>`).join("")}</div>`;
  }
}
// Pointer-based dragging works with mouse, pen, and touch; status fields remain a keyboard alternative.
let dragActive = false;
const boardObserver = new MutationObserver(() => {
  $$(".task:not([data-pointer-ready])").forEach((card) => {
    card.dataset.pointerReady = "true";
    card.draggable = false;
    const open = card.onclick;
    let moved = false;
    card.onclick = (e) => {
      if (moved) {
        moved = false;
        return;
      }
      open?.(e);
    };
    card.onpointerdown = (e) => {
      if (e.button !== 0) return;
      const startX = e.clientX,
        startY = e.clientY;
      let preview = null;
      card.setPointerCapture(e.pointerId);
      const clear = () => {
        $$(".drop-target").forEach((c) => c.classList.remove("drop-target"));
        card.classList.remove("dragging");
        preview?.remove();
        dragActive = false;
        card.onpointermove = null;
        card.onpointerup = null;
        card.onpointercancel = null;
      };
      card.onpointermove = (ev) => {
        if (
          !preview &&
          Math.hypot(ev.clientX - startX, ev.clientY - startY) < 9
        )
          return;
        if (!preview) {
          moved = true;
          dragActive = true;
          const rect = card.getBoundingClientRect();
          preview = document.createElement("div");
          preview.className = "task drag-preview";
          preview.setAttribute("aria-hidden", "true");
          preview.innerHTML = card.innerHTML;
          preview.style.width = rect.width + "px";
          document.body.append(preview);
          card.classList.add("dragging");
        }
        preview.style.left = ev.clientX - 40 + "px";
        preview.style.top = ev.clientY - 25 + "px";
        $$(".drop-target").forEach((c) => c.classList.remove("drop-target"));
        document
          .elementFromPoint(ev.clientX, ev.clientY)
          ?.closest(".column")
          ?.classList.add("drop-target");
      };
      card.onpointerup = async (ev) => {
        if (!preview) {
          clear();
          return;
        }
        const column = document
            .elementFromPoint(ev.clientX, ev.clientY)
            ?.closest(".column"),
          t = data.tasks.find((t) => t.id === card.dataset.task);
        clear();
        try {
          if (column && t && t.status !== column.dataset.status)
            await api(endpoint("tasks/" + t.id), {
              method: "PATCH",
              body: { status: column.dataset.status, version: t.version },
            });
          await refresh();
        } catch (err) {
          toast(err.message);
          refresh();
        }
      };
      card.onpointercancel = () => {
        clear();
        refresh();
      };
    };
  });
});
boardObserver.observe($("#app"), { subtree: true, childList: true });
function empty(title, description, name) {
  return `<div class="empty-state">${icon(name)}<h3>${esc(title)}</h3><p>${esc(description)}</p></div>`;
}
function activityRow(a) {
  return `<div class="activity-entry">${avatar({ id: a.user_id, name: a.name })}<div><p><strong>${esc(a.name)}</strong> ${esc(a.body)}</p><time datetime="${new Date(a.created).toISOString()}">${relative(a.created)}</time></div></div>`;
}
function fileRow(f) {
  return `<div class="file-row">${icon("file")}<div class="file-detail"><p>${esc(f.name)}</p><small>${sizeText(f.size)} · ${esc(f.author)} · ${relative(f.created)}</small></div><a class="btn" href="${endpoint("files/" + f.id)}" download>${icon("download")} Download</a></div>`;
}
function renderRail() {
  if (!$("#chat-list")) return;
  $$("[data-rail]").forEach((b) =>
    b.classList.toggle("selected", b.dataset.rail === railView),
  );
  $("#chat-area").hidden = railView !== "chat";
  $("#rail-activity").hidden = railView !== "activity";
  $("#rail-activity").innerHTML = data.activity
    .slice(0, 30)
    .map(activityRow)
    .join("");
  const list = $("#chat-list"),
    atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 75;
  list.innerHTML = `<div class="chat-welcome">${icon("chat")}<h3>This is where ideas meet.</h3><p>A quick question, a small win, a fresh idea.<br>Keep your team in the loop.</p></div>${data.messages.map((m) => `<div class="chat-message ${m.user_id === me.id ? "mine" : ""}">${avatar({ id: m.user_id, name: m.name })}<div class="message-body"><div class="message-name">${esc(m.name)}<time>${timeText(m.created)}</time></div><p class="message-text">${esc(m.body)}</p></div></div>`).join("")}`;
  if (atBottom) list.scrollTop = list.scrollHeight;
  const online = data.members.filter((u) => u.online);
  $("#online-list").innerHTML =
    online
      .slice(0, 5)
      .map((u) => avatar(u, true))
      .join("") +
    `<span>${online.length ? online.length + " online" : "Waiting for the team"}</span>`;
}
async function sendMessage(e) {
  e.preventDefault();
  const input = $("#message"),
    body = input.value.trim();
  if (!body) return;
  const b = $("button[type=submit]", e.currentTarget);
  b.disabled = true;
  try {
    await api(endpoint("messages"), { method: "POST", body: { body } });
    input.value = "";
    await refresh();
    $("#chat-list").scrollTop = $("#chat-list").scrollHeight;
  } catch (err) {
    toast(err.message);
  } finally {
    b.disabled = false;
  }
}
function taskModal(id, status = "backlog") {
  const task = id ? data.tasks.find((t) => t.id === id) : null;
  if (id && !task) {
    toast("That task no longer exists.");
    return;
  }
  const t = task || {
    title: "",
    description: "",
    status,
    priority: "medium",
    tag: "General",
    assignee: "",
    due: "",
  };
  const dialog = modal(
    task ? "Task details" : "A new next step",
    `<form id="task-form"><div class="modal-body"><div class="field"><label for="task-title">Task title</label><input id="task-title" name="title" placeholder="What needs to happen?" value="${esc(t.title)}" maxlength="140" autocomplete="off" required></div><div class="field"><label for="task-description">Description</label><textarea id="task-description" name="description" placeholder="A little context goes a long way…" maxlength="5000">${esc(t.description)}</textarea></div><div class="field-row"><div class="field"><label for="task-status">Status</label><select id="task-status" name="status">${Object.entries(
      names,
    )
      .map(
        ([v, label]) =>
          `<option value="${v}" ${v === t.status ? "selected" : ""}>${label}</option>`,
      )
      .join(
        "",
      )}</select></div><div class="field"><label for="task-priority">Priority</label><select id="task-priority" name="priority">${["low", "medium", "high"].map((v) => `<option ${v === t.priority ? "selected" : ""} value="${v}">${v[0].toUpperCase() + v.slice(1)}</option>`).join("")}</select></div></div><div class="field-row"><div class="field"><label for="task-assignee">Assignee</label><select name="assignee" id="task-assignee"><option value="">Unassigned</option>${data.members.map((u) => `<option value="${u.id}" ${u.id === t.assignee ? "selected" : ""}>${esc(u.name)}</option>`).join("")}</select></div><div class="field"><label for="task-due">Due date</label><input type="date" name="due" id="task-due" value="${esc(t.due)}"></div></div><div class="field"><label for="task-tag">Label</label><input name="tag" id="task-tag" value="${esc(t.tag)}" maxlength="30" list="labels" autocomplete="off"><datalist id="labels"><option>Design</option><option>Development</option><option>Research</option><option>Planning</option></datalist></div>${
      task
        ? `<div class="task-files"><h3>Attachments</h3>${
            data.files
              .filter((f) => f.task_id === id)
              .map(
                (f) =>
                  `<a href="${endpoint("files/" + f.id)}" download><span>${esc(f.name)}</span><small>${sizeText(f.size)}</small></a>`,
              )
              .join("") || '<p class="hint">No attachments yet.</p>'
          }<button type="button" class="btn" id="task-upload">${icon("clip")} Attach a file</button></div>`
        : '<p class="hint">You can attach files after creating this task.</p>'
    }<p class="error" role="alert"></p></div><div class="modal-footer">${task ? `<button class="btn danger ghost" type="button" id="delete-task">${icon("trash")} Delete</button>` : ""}<div class="right"><button type="button" class="btn" id="cancel-task">Cancel</button><button type="submit" class="btn primary">${task ? "Save changes" : "Create task"}</button></div></div></form>`,
  );
  $("#cancel-task").onclick = () => dialog.close();
  $("#task-form").onsubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget,
      b = $("button[type=submit]", form);
    b.disabled = true;
    try {
      const input = Object.fromEntries(new FormData(form));
      if (task) input.version = task.version;
      await api(endpoint(task ? "tasks/" + id : "tasks"), {
        method: task ? "PATCH" : "POST",
        body: input,
      });
      dialog.close();
      await refresh();
      toast(task ? "Changes saved." : "One step closer. Task created.");
    } catch (err) {
      formError(form, err);
    } finally {
      b.disabled = false;
    }
  };
  if (task) {
    $("#delete-task").onclick = async () => {
      if (
        !confirm(
          "Delete this task? Its uploaded files will remain in Shared files.",
        )
      )
        return;
      try {
        await api(endpoint("tasks/" + id), { method: "DELETE" });
        dialog.close();
        await refresh();
        toast("Task deleted.");
      } catch (err) {
        toast(err.message);
      }
    };
    $("#task-upload").onclick = () => {
      if (
        !confirm(
          "Close the editor to attach a file? Any unsaved edits will be lost.",
        )
      )
        return;
      uploadModal(id);
    };
  }
}
function createWorkspace() {
  const dialog = modal(
    "A place to build together",
    `<form id="workspace-form"><div class="modal-body"><div class="field"><label for="workspace-name">Workspace name</label><input id="workspace-name" name="name" placeholder="e.g. Our next big thing" maxlength="70" required autocomplete="off"></div><div class="field"><label for="workspace-description">What are you building?</label><textarea id="workspace-description" name="description" placeholder="Give your team a little direction…" maxlength="250"></textarea></div><label class="check-label"><input type="checkbox" name="sample" checked> Start with a few clearly labeled sample tasks</label><p class="error" role="alert"></p></div><div class="modal-footer"><button class="btn primary" type="submit">Create workspace ${icon("arrow")}</button></div></form>`,
  );
  $("#workspace-form").onsubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget,
      b = $("button", form);
    b.disabled = true;
    try {
      const input = Object.fromEntries(new FormData(form));
      input.sample = input.sample === "on";
      const r = await api("/api/workspaces", { method: "POST", body: input });
      workspaces = (await api("/api/me")).workspaces;
      dialog.close();
      await openWorkspace(r.workspace.id);
    } catch (err) {
      formError(form, err);
    } finally {
      b.disabled = false;
    }
  };
}
function switchWorkspace() {
  modal(
    "Your workspaces",
    `<div class="modal-body">${workspaces.map((w) => `<button class="workspace-item" data-switch="${w.id}"><span class="avatar">${esc(initials(w.name))}</span><span class="name"><strong class="truncate">${esc(w.id === wsId ? data.workspace.name : w.name)}</strong><small>${w.member_count} member${w.member_count === 1 ? "" : "s"}</small></span>${icon(w.id === wsId ? "check" : "right")}</button>`).join("")}<div class="actions"><button class="btn primary" id="add-workspace">${icon("plus")} New workspace</button> <button class="btn" id="join-workspace">${icon("link")} Join a team</button></div></div>`,
  );
  $$("[data-switch]").forEach(
    (b) =>
      (b.onclick = async () => {
        try {
          $("#modal").close();
          await openWorkspace(b.dataset.switch);
        } catch (err) {
          toast(err.message);
        }
      }),
  );
  $("#add-workspace").onclick = createWorkspace;
  $("#join-workspace").onclick = joinWorkspace;
}
function joinWorkspace() {
  const dialog = modal(
    "Come on in",
    `<form id="join-form"><div class="modal-body"><p class="muted">Paste the invitation link or code your workspace owner shared with you.</p><div class="field"><label for="invite-token">Invite link or code</label><input id="invite-token" name="token" value="${esc(inviteToken)}" placeholder="Paste your invitation…" autocomplete="off" required maxlength="500"></div><p class="error" role="alert"></p></div><div class="modal-footer"><button class="btn primary" type="submit">Join workspace ${icon("arrow")}</button></div></form>`,
  );
  $("#join-form").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.currentTarget,
      b = $("button", f);
    b.disabled = true;
    try {
      let token = new FormData(f).get("token").trim();
      if (token.includes("://"))
        token = new URL(token).searchParams.get("invite") || "";
      const r = await api("/api/join", { method: "POST", body: { token } });
      workspaces = (await api("/api/me")).workspaces;
      dialog.close();
      inviteToken = "";
      history.replaceState(null, "", location.pathname);
      await openWorkspace(r.workspace.id);
      toast("Welcome to the team.");
    } catch (err) {
      formError(f, err);
    } finally {
      b.disabled = false;
    }
  };
}
function invite() {
  if (data.workspace.owner_id !== me.id) {
    modal(
      "Bring your people",
      `<div class="modal-body"><p>Ask ${esc(data.members.find((u) => u.id === data.workspace.owner_id)?.name || "the workspace owner")} for an invitation link. Only the owner can create invites.</p></div>`,
    );
    return;
  }
  modal(
    "Good work is better together",
    `<div class="modal-body"><p>Create a private invitation for <strong>${esc(data.workspace.name)}</strong>. Anyone with the link can join this workspace after signing in.</p><p class="hint">Links expire after 7 days. Creating a new invite replaces the previous one. Teammates need access to this server; localhost links work on this computer only.</p><button class="btn primary" id="generate-invite">${icon("link")} Create invitation link</button><div id="invite-result"></div><p class="error" role="alert"></p></div>`,
  );
  $("#generate-invite").onclick = async (e) => {
    const b = e.currentTarget;
    b.disabled = true;
    try {
      const r = await api(endpoint("invite"), { method: "POST", body: {} });
      const link = location.origin + location.pathname + "?invite=" + r.token;
      $("#invite-result").innerHTML =
        `<label for="invite-link" class="hint">Share this link with your team</label><input id="invite-link" class="invite-code" readonly value="${esc(link)}"><button class="btn" id="copy-invite">${icon("copy")} Copy link</button><p class="hint">Expires ${new Date(r.expires).toLocaleDateString()}.</p>`;
      $("#copy-invite").onclick = async () => {
        try {
          await navigator.clipboard.writeText(link);
          toast("Invite link copied.");
        } catch {
          $("#invite-link").select();
          toast("Select and copy the invitation link.");
        }
      };
      b.textContent = "Create a new link";
    } catch (err) {
      $(".error", $("#modal")).textContent = err.message;
    } finally {
      b.disabled = false;
    }
  };
}
function settings() {
  if (data.workspace.owner_id !== me.id) {
    modal(
      "Workspace settings",
      `<div class="modal-body"><p>Only the workspace owner can change workspace details. Your team’s data is stored on this server.</p></div>`,
    );
    return;
  }
  const dialog = modal(
    "Workspace settings",
    `<form id="settings-form"><div class="modal-body"><div class="field"><label for="settings-name">Workspace name</label><input name="name" id="settings-name" value="${esc(data.workspace.name)}" maxlength="70" required></div><div class="field"><label for="settings-description">Description</label><textarea name="description" id="settings-description" maxlength="250">${esc(data.workspace.description)}</textarea></div><p class="hint">Everyone in the workspace will see these changes.</p><p class="error" role="alert"></p></div><div class="modal-footer"><button class="btn primary" type="submit">Save workspace</button></div></form>`,
  );
  $("#settings-form").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.currentTarget,
      b = $("button", f);
    b.disabled = true;
    try {
      await api(endpoint(), {
        method: "PATCH",
        body: Object.fromEntries(new FormData(f)),
      });
      dialog.close();
      await refresh();
      workspaces = (await api("/api/me")).workspaces;
      toast("Workspace updated.");
    } catch (err) {
      formError(f, err);
    } finally {
      b.disabled = false;
    }
  };
}
function uploadModal(taskId = null) {
  const dialog = modal(
    "Share something useful",
    `<form id="upload-form"><div class="modal-body"><p>${taskId ? "Add an attachment to this task." : "Your file will be available to everyone in this workspace."}</p><div class="field"><label for="file">Choose a file</label><input class="file-input" type="file" id="file" name="file" required></div><p class="hint">Maximum 5 MB. Downloads require workspace membership.</p><p class="error" role="alert"></p></div><div class="modal-footer"><button class="btn primary" type="submit">${icon("clip")} Upload file</button></div></form>`,
  );
  $("#upload-form").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.currentTarget,
      b = $("button", f),
      file = $("#file").files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      formError(f, Error("Choose a file smaller than 5 MB."));
      return;
    }
    b.disabled = true;
    b.textContent = "Uploading…";
    try {
      await api(
        endpoint("files") +
          "?name=" +
          encodeURIComponent(file.name) +
          (taskId ? "&task=" + taskId : ""),
        { method: "POST", body: file, raw: true },
      );
      dialog.close();
      await refresh();
      toast("File shared with your team.");
    } catch (err) {
      formError(f, err);
    } finally {
      b.disabled = false;
      b.innerHTML = icon("clip") + " Upload file";
    }
  };
}
async function logout() {
  try {
    await api("/api/auth/logout", { method: "POST", body: {} });
    stream?.close();
    me = null;
    data = null;
    $("#modal").close();
    renderAuth();
  } catch (err) {
    toast(err.message);
  }
}
window.addEventListener("offline", () => setConnection(false));
window.addEventListener("online", () => {
  if (me && wsId) {
    refresh();
    connect();
  }
});
try {
  const result = await api("/api/me");
  me = result.user;
  workspaces = result.workspaces;
  if (me) await afterLogin();
  else renderAuth();
} catch (err) {
  $("#app").innerHTML =
    `<main class="onboarding"><div class="onboarding-box">${brand()}<h1>A small connection hiccup.</h1><p>${esc(err.message)}</p><button class="btn primary" id="retry">Try again</button></div></main>`;
  $("#retry").onclick = () => location.reload();
}

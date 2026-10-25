"use strict";

// Change this to your deployed API URL when you go live
// const API = "http://127.0.0.1:8000";

const API =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:8000"
    : "https://blog-api-project-3dvm.onrender.com";
const LIMIT = 5;
const $app = document.getElementById("app");
const state = { user: null, page: 1, search: "" };

/* ---------- helpers ---------- */
function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  kids.flat().forEach((c) => el.append(c instanceof Node ? c : document.createTextNode(c == null ? "" : c)));
  return el;
}
const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

let toastTimer;
function toast(msg, ok) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show" + (ok ? " ok" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = "toast"), 3500);
}

async function api(path, { method = "GET", body, form } = {}) {
  const headers = {};
  const token = localStorage.getItem("token");
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    payload = new URLSearchParams(form);
  } else if (body) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(API + path, { method, headers, body: payload });
  } catch (e) {
    throw new Error("Cannot reach the server. Is the API running?");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token && path !== "/login") logout(false);
    let msg = data.detail;
    if (Array.isArray(msg)) msg = msg.map((e) => e.msg).join(", ");
    throw new Error(msg || "Something went wrong");
  }
  return data;
}

/* ---------- auth ---------- */
function logout(redirect) {
  localStorage.removeItem("token");
  state.user = null;
  renderNav();
  if (redirect) location.hash = "#/";
}
async function doLogin(username, password) {
  const t = await api("/login", { method: "POST", form: { username, password } });
  localStorage.setItem("token", t.access_token);
  state.user = await api("/me");
  renderNav();
}
function renderNav() {
  const nav = document.getElementById("nav");
  nav.replaceChildren(h("a", { href: "#/" }, "Home"));
  if (state.user) {
    nav.append(
      h("a", { href: "#/new" }, "New post"),
      h("span", { class: "chip" }, "@" + state.user.username),
      h("button", { class: "btn ghost", onclick: () => logout(true) }, "Log out")
    );
  } else {
    nav.append(h("a", { class: "btn primary", href: "#/login" }, "Log in"));
  }
}

/* ---------- views ---------- */
function card(b) {
  const excerpt = b.content.length > 160 ? b.content.slice(0, 160) + "..." : b.content;
  return h(
    "article",
    { class: "card" },
    h("h2", {}, h("a", { href: `#/post/${b.id}` }, b.title)),
    h("p", { class: "meta" }, `By @${b.author.username} \u00B7 ${fmtDate(b.created_at)}`),
    h("p", {}, excerpt)
  );
}

async function viewHome() {
  const input = h("input", { type: "search", placeholder: "Search by title...", value: state.search });
  const form = h(
    "form",
    {
      class: "search",
      onsubmit: (e) => {
        e.preventDefault();
        state.search = input.value.trim();
        state.page = 1;
        viewHome();
      },
    },
    input,
    h("button", { class: "btn" }, "Search")
  );
  const list = h("div", {}, h("p", { class: "muted" }, "Loading..."));
  const pager = h("div", { class: "pager" });
  $app.replaceChildren(h("h1", {}, "Latest posts"), form, list, pager);
  try {
    const q = new URLSearchParams({ page: state.page, limit: LIMIT, search: state.search });
    const res = await api("/blogs?" + q);
    list.replaceChildren();
    if (!res.data.length) list.append(h("p", { class: "muted" }, "No posts found."));
    res.data.forEach((b) => list.append(card(b)));
    const pages = Math.max(1, Math.ceil(res.total / LIMIT));
    pager.append(
      h("button", { class: "btn", disabled: state.page <= 1, onclick: () => { state.page--; viewHome(); } }, "\u2190 Newer"),
      h("span", { class: "muted" }, `Page ${state.page} of ${pages}`),
      h("button", { class: "btn", disabled: state.page >= pages, onclick: () => { state.page++; viewHome(); } }, "Older \u2192")
    );
  } catch (err) {
    list.replaceChildren(h("p", { class: "muted" }, err.message));
  }
}

async function removePost(id) {
  if (!confirm("Delete this post?")) return;
  try {
    await api(`/blogs/${id}`, { method: "DELETE" });
    toast("Post deleted.", true);
    location.hash = "#/";
  } catch (err) {
    toast(err.message);
  }
}

async function viewPost(id) {
  $app.replaceChildren(h("p", { class: "muted" }, "Loading..."));
  try {
    const b = await api(`/blogs/${id}`);
    const mine = state.user && state.user.id === b.author.id;
    $app.replaceChildren(
      h("a", { class: "back", href: "#/" }, "\u2190 All posts"),
      h(
        "article",
        { class: "post" },
        h("h1", {}, b.title),
        h("p", { class: "meta" }, `By @${b.author.username} \u00B7 ${fmtDate(b.created_at)}`),
        h("div", { class: "body" }, b.content),
        mine
          ? h(
              "div",
              { class: "row" },
              h("a", { class: "btn", href: `#/edit/${b.id}` }, "Edit"),
              h("button", { class: "btn danger", onclick: () => removePost(b.id) }, "Delete")
            )
          : ""
      )
    );
  } catch (err) {
    $app.replaceChildren(h("a", { class: "back", href: "#/" }, "\u2190 All posts"), h("p", { class: "muted" }, err.message));
  }
}

async function viewEditor(id) {
  if (!state.user) {
    toast("Please log in first.");
    location.hash = "#/login";
    return;
  }
  let blog = { title: "", content: "" };
  if (id) {
    try {
      blog = await api(`/blogs/${id}`);
    } catch (err) {
      return toast(err.message);
    }
    if (blog.author.id !== state.user.id) {
      toast("You can only edit your own posts.");
      location.hash = "#/";
      return;
    }
  }
  const title = h("input", { type: "text", maxlength: "200", required: true, value: blog.title });
  const content = h("textarea", { rows: "12", required: true }, blog.content);
  const form = h(
    "form",
    {
      class: "form",
      onsubmit: async (e) => {
        e.preventDefault();
        try {
          const saved = await api(id ? `/blogs/${id}` : "/blogs", {
            method: id ? "PUT" : "POST",
            body: { title: title.value.trim(), content: content.value.trim() },
          });
          toast("Post saved.", true);
          location.hash = `#/post/${saved.id}`;
        } catch (err) {
          toast(err.message);
        }
      },
    },
    h("label", {}, "Title", title),
    h("label", {}, "Content", content),
    h("button", { class: "btn primary" }, id ? "Save changes" : "Publish")
  );
  $app.replaceChildren(h("h1", {}, id ? "Edit post" : "New post"), form);
}

function viewAuth() {
  let mode = "login";
  const user = h("input", { type: "text", required: true, minlength: "3", maxlength: "50", autocomplete: "username" });
  const pass = h("input", { type: "password", required: true, minlength: "6", maxlength: "72", autocomplete: "current-password" });
  const title = h("h1", {}, "Log in");
  const submit = h("button", { class: "btn primary" }, "Log in");
  const switcher = h("button", { type: "button", class: "link" }, "New here? Create an account");
  const form = h(
    "form",
    {
      class: "form narrow",
      onsubmit: async (e) => {
        e.preventDefault();
        try {
          if (mode === "register") {
            await api("/register", { method: "POST", body: { username: user.value, password: pass.value } });
          }
          await doLogin(user.value, pass.value);
          toast(mode === "register" ? "Account created. Welcome!" : "Welcome back!", true);
          location.hash = "#/";
        } catch (err) {
          toast(err.message);
        }
      },
    },
    title,
    h("label", {}, "Username", user),
    h("label", {}, "Password", pass),
    submit,
    switcher
  );
  switcher.addEventListener("click", () => {
    mode = mode === "login" ? "register" : "login";
    const login = mode === "login";
    title.textContent = submit.textContent = login ? "Log in" : "Create account";
    switcher.textContent = login ? "New here? Create an account" : "Already have an account? Log in";
    pass.autocomplete = login ? "current-password" : "new-password";
  });
  $app.replaceChildren(form);
}

/* ---------- router ---------- */
function route() {
  const [, a, b] = location.hash.split("/");
  window.scrollTo(0, 0);
  if (a === "post" && b) return viewPost(b);
  if (a === "new") return viewEditor();
  if (a === "edit" && b) return viewEditor(b);
  if (a === "login") return viewAuth();
  return viewHome();
}
window.addEventListener("hashchange", route);

(async function init() {
  if (localStorage.getItem("token")) {
    try {
      state.user = await api("/me");
    } catch (e) {
      localStorage.removeItem("token");
    }
  }
  renderNav();
  route();
})();

// LIVR project catalogue: interactive filter ("All projects") and the
// token-gated "LIVR members" section.
//
// Members section security model:
//   * The website itself never contains private data.
//   * A member pastes their own GitHub token; the browser talks directly to
//     api.github.com with it. The token is never sent anywhere else.
//   * The token is kept in sessionStorage (forgotten when the tab closes)
//     unless the member ticks "remember on this device" (localStorage).
(function () {
  const scriptSrc = (document.currentScript || {}).src || "";
  const assetUrl = f => scriptSrc.replace(/catalogue\.js.*$/, f);
  const TOKEN_KEY = "livr_gh_token";
  const API = "https://api.github.com";

  // ------------------------------------------------------------- helpers
  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") n.className = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) n.setAttribute(k, v === true ? "" : v);
    }
    kids.flat().forEach(k => k != null && k !== false && n.append(k));
    return n;
  }

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const niceDate = iso => { const [y, m, d] = iso.split("-"); return y && m && d ? `${+d} ${MONTHS[+m - 1]} ${y}` : iso; };

  // ----------------------------------------------- shared filter renderer
  function renderCatalogue(root, data, opts = {}) {
    const params = new URLSearchParams(location.search);
    const state = { q: "", type: params.get("type") || "", tags: new Set(params.getAll("tag")) };
    const UNTAGGED = "Unclassified";

    const search = el("input", { class: "cat-search md-input", type: "search", placeholder: "Search by name, description or topic" });
    const types = el("div", { class: "cat-chips" });
    const tags = el("div", { class: "cat-chips" });
    const count = el("p", { class: "cat-count" });
    const list = el("div", { class: "cat-list" });
    root.replaceChildren(...(opts.header ? [opts.header] : []), search,
      el("div", { class: "cat-label" }, "Research area"), types,
      el("div", { class: "cat-label" }, "Topic"), tags, count, list);
    search.addEventListener("input", () => { state.q = search.value.toLowerCase(); update(); });

    const chip = (label, active, onclick, n) =>
      el("button", { class: "cat-chip" + (active ? " is-active" : ""), onclick },
        label, n != null ? el("span", { class: "cat-n" }, String(n)) : null);
    const inType = (p, t) => t === UNTAGGED ? !(p.categories || []).length : (p.categories || []).includes(t);
    const toggleTag = t => { state.tags.has(t) ? state.tags.delete(t) : state.tags.add(t); update(); };

    function matches(p) {
      if (state.type && !inType(p, state.type)) return false;
      for (const t of state.tags) if (!p.topics.includes(t)) return false;
      if (state.q) {
        const hay = [p.name, p.description, p.topics.join(" "), p.language].join(" ").toLowerCase();
        if (!state.q.split(/\s+/).every(w => hay.includes(w))) return false;
      }
      return true;
    }

    function update() {
      const tagCounts = {};
      data.projects.forEach(p => p.topics.forEach(t => tagCounts[t] = (tagCounts[t] || 0) + 1));
      const tagList = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a] || a.localeCompare(b));
      const typeNames = [...data.categories, UNTAGGED];

      types.replaceChildren(chip("All", !state.type, () => { state.type = ""; update(); }, data.projects.length),
        ...typeNames.map(t => chip(t, state.type === t,
          () => { state.type = state.type === t ? "" : t; update(); },
          data.projects.filter(p => inType(p, t)).length)));
      tags.replaceChildren(...tagList.map(t => chip(t, state.tags.has(t), () => toggleTag(t), tagCounts[t])));

      const shown = data.projects.filter(matches);
      count.textContent = shown.length === data.projects.length ? `${shown.length} repositories` : `Showing ${shown.length} of ${data.projects.length} repositories`;
      list.replaceChildren(...shown.map(p => el("article", { class: "cat-card" },
        el("h3", {}, el("a", { href: p.url, target: "_blank", rel: "noopener" }, p.name),
          p.private ? el("span", { class: "cat-private", title: "Private repository" }, "Private") : null),
        el("p", {}, p.description || el("span", { class: "lp-muted" }, "No description provided.")),
        el("div", { class: "cat-tags" }, p.topics.map(t => el("button", {
          class: "cat-tag" + (state.tags.has(t) ? " is-active" : ""), onclick: () => toggleTag(t)
        }, t))),
        el("div", { class: "cat-meta" }, [p.language, p.updated && "Updated " + niceDate(p.updated),
          (p.categories || []).join(", ")].filter(Boolean).join(" · "))
      )));
      if (!shown.length) list.append(el("p", { class: "lp-empty" }, "No repositories match the current filters."));
    }
    update();
    return update;
  }

  async function renderPublic(root) {
    try {
      const data = await (await fetch(assetUrl("projects.json"))).json();
      renderCatalogue(root, data);
    } catch (e) { root.textContent = "Could not load the project list."; }
  }

  // ------------------------------------------------------ members section
  const getToken = () => sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  const clearToken = () => { sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY); };

  async function gh(path, token, raw) {
    const r = await fetch(API + path, { headers: {
      Authorization: "Bearer " + token,
      Accept: raw ? "application/vnd.github.raw" : "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    }});
    if (!r.ok) { const e = new Error("HTTP " + r.status); e.status = r.status; e.body = await r.text().catch(() => ""); throw e; }
    return raw ? r.text() : r.json();
  }

  function summarise(text, limit = 280) {
    for (const para of text.split(/\n\s*\n/)) {
      let p = para.trim();
      if (!p || /^(#|<|!|\[!|\||```|---|>)/.test(p)) continue;
      if (/^(\[!\[.*?\]\(.*?\)\]\(.*?\)\s*)+$/.test(p)) continue;
      p = p.replace(/!\[.*?\]\(.*?\)/g, "").replace(/\[(.*?)\]\(.*?\)/g, "$1").replace(/[*_`]/g, "").replace(/\s+/g, " ").trim();
      if (p.length > 30) return p.length <= limit ? p : p.slice(0, limit).replace(/\s\S*$/, "") + " …";
    }
    return "";
  }

  function loginForm(root, cfg, message) {
    const input = el("input", { class: "cat-search md-input", type: "password", placeholder: "Personal access token (github_pat_…)", autocomplete: "off" });
    const remember = el("input", { type: "checkbox", id: "livr-remember" });
    const go = async ev => {
      ev.preventDefault();
      const t = input.value.trim();
      if (!t) return;
      (remember.checked ? localStorage : sessionStorage).setItem(TOKEN_KEY, t);
      loadMembers(root, cfg);
    };
    root.replaceChildren(el("form", { class: "livr-login", onsubmit: go },
      el("h2", {}, "Sign in to view internal repositories"),
      el("p", {}, "This area lists every repository of the LIVR-VUB organisation, including private repositories. " +
        "Enter your personal GitHub access token. Your browser retrieves the list directly from GitHub; " +
        "you will see exactly the repositories your GitHub account has access to."),
      message ? el("div", { class: "livr-error" }, el("strong", {}, "Sign-in failed. "), message) : null,
      input,
      el("label", { class: "livr-remember" }, remember, "Keep me signed in on this device (not recommended on shared computers)"),
      el("button", { class: "md-button md-button--primary", type: "submit" }, "Sign in"),
      el("p", { class: "livr-help" }, "No token yet? See ",
        el("a", { href: assetUrl("../members-token/") }, "Access tokens"),
        " for a two-minute setup. The token is stored only in this browser and is sent exclusively to api.github.com.")
    ));
    input.focus();
  }

  async function loadMembers(root, cfg) {
    const token = getToken();
    if (!token) return loginForm(root, cfg);
    root.replaceChildren(el("p", { class: "lp-muted" }, "Retrieving repositories from GitHub…"));

    let user, raw = [];
    try {
      user = await gh("/user", token);
      for (let page = 1; ; page++) {
        const batch = await gh(`/orgs/${cfg.org}/repos?type=all&per_page=100&page=${page}`, token);
        raw = raw.concat(batch);
        if (batch.length < 100) break;
      }
    } catch (e) {
      clearToken();
      const msg = e.status === 401 ? "The token is invalid or has expired. Please create a new token."
        : e.status === 403 && /SAML|approv|forbid/i.test(e.body) ? "The token has not been approved for LIVR-VUB. An organisation owner needs to approve it."
        : e.status === 404 ? "The token has no access to LIVR-VUB. When creating the token, set the resource owner to LIVR-VUB."
        : "GitHub returned " + e.message + ". Please try again.";
      return loginForm(root, cfg, msg);
    }

    const excluded = new Set(cfg.exclude || []);
    const projects = raw
      .filter(r => !r.archived && !r.fork && !excluded.has(r.name))
      .map(r => ({
        name: r.name, url: r.html_url, description: (r.description || "").trim(),
        topics: (r.topics || []).slice().sort(), language: r.language || "",
        updated: (r.pushed_at || "").slice(0, 10), private: !!r.private,
      }))
      .sort((a, b) => b.updated.localeCompare(a.updated));
    for (const p of projects) {
      const own = new Set(p.topics.map(t => t.toLowerCase()));
      p.categories = cfg.categories.filter(c => c.topics.some(t => own.has(t.toLowerCase()))).map(c => c.name);
    }
    const nPrivate = projects.filter(p => p.private).length;

    const signOut = el("button", { class: "md-button", onclick: () => { clearToken(); loginForm(root, cfg); } }, "Sign out");
    const header = el("div", { class: "livr-bar" },
      el("span", {}, "Signed in as ", el("strong", {}, user.login), ` · ${projects.length} repositories, of which ${nPrivate} private`),
      signOut);
    if (!nPrivate) header.append(el("div", { class: "livr-note" },
      "No private repositories are visible with this token. It may lack access to LIVR-VUB or still await approval. See ",
      el("a", { href: assetUrl("../members-token/") }, "Access tokens"), "."));

    const update = renderCatalogue(root, { categories: cfg.categories.map(c => c.name), projects }, { header });

    // Fill empty descriptions from README first paragraphs, a few at a time.
    const todo = projects.filter(p => !p.description);
    const worker = async () => {
      while (todo.length) {
        const p = todo.shift();
        try { p.description = summarise(await gh(`/repos/${cfg.org}/${p.name}/readme`, token, true)); } catch (e) {}
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    update();
  }

  async function renderMembers(root) {
    try {
      const cfg = await (await fetch(assetUrl("categories.json"))).json();
      loadMembers(root, cfg);
    } catch (e) { root.textContent = "Could not load the site configuration."; }
  }

  // ----------------------------------------------------------------- init
  function init() {
    const pub = document.getElementById("catalogue");
    if (pub && !pub.dataset.ready) { pub.dataset.ready = "1"; renderPublic(pub); }
    const mem = document.getElementById("members");
    if (mem && !mem.dataset.ready) { mem.dataset.ready = "1"; renderMembers(mem); }
  }
  if (window.document$) window.document$.subscribe(init);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();

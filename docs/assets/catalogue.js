// LIVR Project Catalogue: interactive repository index and the token-protected Members area.
//
// Members area security model:
//   * The website itself never contains private data.
//   * A member enters their own GitHub token; the browser talks directly to
//     api.github.com with it. The token is never sent anywhere else.
//   * The token is kept in sessionStorage (discarded when the tab closes) unless
//     the member chooses "Keep me signed in" (localStorage).
(function () {
  const scriptSrc = (document.currentScript || {}).src || "";
  const assetUrl = f => scriptSrc.replace(/catalogue\.js.*$/, f);
  const TOKEN_KEY = "livr_gh_token";
  const API = "https://api.github.com";
  const UNCLASSIFIED = "Unclassified";
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // ------------------------------------------------------------- helpers
  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") n.className = v;
      else if (k === "style") n.setAttribute("style", v);
      else if (k === "html") n.innerHTML = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) n.setAttribute(k, v === true ? "" : v);
    }
    kids.flat().forEach(k => k != null && k !== false && n.append(k));
    return n;
  }
  const niceDate = iso => { const [y, m, d] = (iso || "").split("-"); return y && m && d ? `${+d} ${MONTHS[+m - 1]} ${y}` : iso; };
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const iconBox = (style, cls = "lp-icon") => el("span", { class: cls, style: `--c:${style.colour}`, html: style.icon });

  // Classification is by topic only. Keywords in the name/description only
  // produce suggestions for repositories that are still unclassified.
  function classify(projects, cfg) {
    for (const p of projects) {
      const own = new Set(p.topics.map(t => t.toLowerCase()));
      p.categories = cfg.categories.filter(c => (c.topics || []).some(t => own.has(t.toLowerCase()))).map(c => c.name);
      const text = (p.name + " " + (p.description || "")).toLowerCase();
      p.suggested = p.categories.length ? [] : cfg.categories
        .filter(c => (c.keywords || []).some(k => text.includes(k.toLowerCase())))
        .map(c => ({ name: c.name, topic: c.recommended || c.topics[0] }));
    }
  }

  // Click-to-copy topic chip.
  function copyChip(topic, label) {
    const b = el("button", { class: "lp-copy", type: "button", title: "Copy topic" }, topic);
    b.addEventListener("click", async ev => {
      ev.preventDefault();
      try { await navigator.clipboard.writeText(topic); } catch (e) {
        const t = el("textarea", {}, topic); document.body.append(t); t.select(); document.execCommand("copy"); t.remove();
      }
      b.classList.add("is-copied"); b.textContent = "Copied";
      setTimeout(() => { b.classList.remove("is-copied"); b.textContent = topic; }, 1200);
    });
    return label ? el("span", { class: "lp-copy-wrap" }, b, el("span", { class: "lp-muted" }, ` ${label}`)) : b;
  }
  function styleOf(p, cfg) {
    const c = cfg.categories.find(c => c.name === (p.categories || [])[0]);
    return c ? { icon: c.icon, colour: c.colour } : cfg.unclassified;
  }

  function projectCard(p, cfg, state, update) {
    return el("article", { class: "cat-card" },
      el("div", { class: "lp-card-top" },
        iconBox(styleOf(p, cfg), "lp-icon lp-icon-sm"),
        el("h3", {}, el("a", { href: p.url, target: "_blank", rel: "noopener" }, p.name),
          p.private ? el("span", { class: "cat-private", title: "Private repository" }, "Private") : null)),
      el("p", {}, p.description || el("span", { class: "lp-muted" }, "No description provided.")),
      el("div", { class: "cat-tags" }, p.topics.map(t => el("button", {
        class: "cat-tag" + (state && state.tags.has(t) ? " is-active" : ""),
        onclick: () => { if (!state) return; state.tags.has(t) ? state.tags.delete(t) : state.tags.add(t); update(); }
      }, t))),
      p.suggested && p.suggested.length ? el("div", { class: "lp-suggest" },
        el("span", { class: "lp-suggest-label" }, "Suggested topic"),
        p.suggested.map(x => copyChip(x.topic, `(${x.name})`)),
        el("a", { href: p.url, target: "_blank", rel: "noopener" }, "Add on GitHub")) : null,
      el("div", { class: "cat-meta" }, [p.language, p.updated && "Updated " + niceDate(p.updated),
        (p.categories || []).join(", ")].filter(Boolean).join(" · ")));
  }

  // Which topic to use for which project type.
  function topicGuide(cfg, open) {
    return el("details", { class: "lp-guide-box", open: !!open },
      el("summary", {}, "Topic guide: which topic should I add?"),
      el("p", { class: "lp-muted" }, "Classification uses GitHub topics only. Open the repository on GitHub, select the settings control next to ",
        el("strong", {}, "About"), ", and add the recommended topic. Click a topic to copy it."),
      el("div", { class: "lp-guide-table" },
        cfg.categories.map(c => el("div", { class: "lp-guide-row" },
          iconBox(c, "lp-icon lp-icon-sm"),
          el("span", { class: "lp-guide-name" }, c.name),
          el("span", {}, copyChip(c.recommended || c.topics[0])),
          el("span", { class: "lp-guide-alt" }, "Also accepted: ",
            (c.topics || []).filter(t => t !== (c.recommended || c.topics[0])).join(", ") || "none")))));
  }

  // ------------------------------------------- filterable list of projects
  // opts: { header, hideTypes, readUrl, placeholder }
  function renderCatalogue(root, projects, cfg, opts = {}) {
    const params = opts.readUrl ? new URLSearchParams(location.search) : new URLSearchParams();
    const state = { q: "", type: params.get("type") || "", tags: new Set(params.getAll("tag")) };
    const typeNames = [...cfg.categories.map(c => c.name), UNCLASSIFIED];

    const search = el("input", { class: "cat-search", type: "search", placeholder: opts.placeholder || "Search by name, description or topic" });
    const types = el("div", { class: "cat-chips" });
    const tags = el("div", { class: "cat-chips" });
    const count = el("p", { class: "cat-count" });
    const list = el("div", { class: "cat-list" });
    root.replaceChildren(...[opts.header, search,
      opts.hideTypes ? null : el("div", { class: "cat-label" }, "Project type"), opts.hideTypes ? null : types,
      el("div", { class: "cat-label" }, "Topic"), tags, count, list].filter(Boolean));
    search.addEventListener("input", () => { state.q = search.value.toLowerCase(); update(); });

    const chip = (label, active, onclick, n) =>
      el("button", { class: "cat-chip" + (active ? " is-active" : ""), onclick },
        label, n != null ? el("span", { class: "cat-n" }, String(n)) : null);
    const inType = (p, t) => t === UNCLASSIFIED ? !(p.categories || []).length : (p.categories || []).includes(t);

    function matches(p) {
      if (state.type && !inType(p, state.type)) return false;
      for (const t of state.tags) if (!p.topics.includes(t)) return false;
      if (state.q) {
        const hay = [p.name, p.description, p.topics.join(" "), p.language, (p.categories || []).join(" ")].join(" ").toLowerCase();
        if (!state.q.split(/\s+/).every(w => hay.includes(w))) return false;
      }
      return true;
    }

    function update() {
      const tagCounts = {};
      projects.forEach(p => p.topics.forEach(t => tagCounts[t] = (tagCounts[t] || 0) + 1));
      const tagList = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a] || a.localeCompare(b));
      if (!opts.hideTypes)
        types.replaceChildren(chip("All", !state.type, () => { state.type = ""; update(); }, projects.length),
          ...typeNames.map(t => [t, projects.filter(p => inType(p, t)).length]).filter(([, n]) => n)
            .map(([t, n]) => chip(t, state.type === t, () => { state.type = state.type === t ? "" : t; update(); }, n)));
      tags.replaceChildren(...tagList.map(t => chip(t, state.tags.has(t), () => {
        state.tags.has(t) ? state.tags.delete(t) : state.tags.add(t); update();
      }, tagCounts[t])));
      const shown = projects.filter(matches);
      count.textContent = shown.length === projects.length ? plural(shown.length, "repository", "repositories")
        : `Showing ${shown.length} of ${projects.length} repositories`;
      list.replaceChildren(...shown.map(p => projectCard(p, cfg, state, update)));
      if (!shown.length) list.append(el("p", { class: "lp-empty" }, "No repositories match the current filters."));
    }
    update();
    return update;
  }

  async function renderPublic(root) {
    try {
      const [data, cfg] = await Promise.all([
        fetch(assetUrl("projects.json")).then(r => r.json()),
        fetch(assetUrl("categories.json")).then(r => r.json())]);
      renderCatalogue(root, data.projects, cfg, { readUrl: true });
    } catch (e) { root.textContent = "The repository list could not be loaded."; }
  }

  // ------------------------------------------------------ members area
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
    const input = el("input", { class: "cat-search", type: "password", placeholder: "Personal access token (github_pat_…)", autocomplete: "off" });
    const remember = el("input", { type: "checkbox", id: "livr-remember" });
    const go = ev => {
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
    classify(projects, cfg);

    const app = { root, cfg, user, projects };
    const route = () => renderRoute(app);
    if (window.__livrRoute) window.removeEventListener("hashchange", window.__livrRoute);
    window.__livrRoute = route;
    window.addEventListener("hashchange", route);
    route();

    // Fill missing descriptions from README first paragraphs, then refresh the view.
    const todo = projects.filter(p => !p.description);
    const worker = async () => {
      while (todo.length) {
        const p = todo.shift();
        try { p.description = summarise(await gh(`/repos/${cfg.org}/${p.name}/readme`, token, true)); } catch (e) {}
      }
    };
    if (todo.length) {
      await Promise.all(Array.from({ length: 6 }, worker));
      classify(projects, cfg);
      // refresh only if the member is not typing in a search box
      if (!(document.activeElement && document.activeElement.classList.contains("cat-search") && document.activeElement.value)) route();
    }
  }

  function signedInBar(app) {
    const nPrivate = app.projects.filter(p => p.private).length;
    const bar = el("div", { class: "livr-bar" },
      el("span", {}, "Signed in as ", el("strong", {}, app.user.login),
        ` · ${plural(app.projects.length, "repository", "repositories")}, of which ${nPrivate} private`),
      el("button", { class: "md-button", onclick: () => { clearToken(); history.replaceState(null, "", location.pathname); loginForm(app.root, app.cfg); } }, "Sign out"));
    if (!nPrivate) bar.append(el("div", { class: "livr-note" },
      "No private repositories are visible with this token. It may lack access to LIVR-VUB or still await approval. See ",
      el("a", { href: assetUrl("../members-token/") }, "Access tokens"), "."));
    return bar;
  }

  function renderRoute(app) {
    if (!getToken()) return loginForm(app.root, app.cfg);
    const h = new URLSearchParams(location.hash.replace(/^#/, ""));
    const slug = h.get("type");
    if (!slug) return renderMembersHome(app);
    window.scrollTo(0, 0);
    if (slug === "all") return renderTypeView(app, { name: "All repositories",
      description: "Every repository you have access to in the LIVR-VUB organisation.", ...app.cfg.all }, app.projects, true);
    if (slug === "unclassified") return renderTypeView(app, { name: UNCLASSIFIED,
      description: "Repositories without a topic that maps to a project type. Where the name or description hints at a type, a suggested topic is shown on the card. Add it on GitHub and the repository is classified immediately.",
      ...app.cfg.unclassified, guide: true }, app.projects.filter(p => !(p.categories || []).length));
    const c = app.cfg.categories.find(c => c.slug === slug);
    if (!c) { location.hash = ""; return; }
    renderTypeView(app, c, app.projects.filter(p => (p.categories || []).includes(c.name)));
  }

  function typeTile(style, name, description, n, href) {
    return el("a", { class: "lp-type-tile" + (n ? "" : " is-empty"), href, style: `--c:${style.colour}` },
      iconBox(style, "lp-icon lp-icon-lg"),
      el("span", { class: "lp-type-text" },
        el("span", { class: "lp-type-name" }, name),
        el("span", { class: "lp-type-desc" }, description),
        el("span", { class: "lp-type-count" }, plural(n, "repository", "repositories"))));
  }

  function renderMembersHome(app) {
    const { cfg, projects } = app;
    const firstName = app.user.name ? app.user.name.split(" ")[0] : app.user.login;
    const count = c => projects.filter(p => (p.categories || []).includes(c.name)).length;
    const ordered = cfg.categories.slice().sort((a, b) => (count(b) > 0) - (count(a) > 0));  // empty types last
    const search = el("input", { class: "cat-search lp-home-search", type: "search", placeholder: "Search all repositories by name, description or topic" });
    const nUn = projects.filter(p => !(p.categories || []).length).length;
    const results = el("div", {});
    const browse = el("div", {},
      el("h3", { class: "lp-section" }, "Project types"),
      el("div", { class: "lp-type-grid" }, ordered.map(c => typeTile(c, c.name, c.description, count(c), "#type=" + c.slug))),
      el("h3", { class: "lp-section" }, "Other views"),
      el("div", { class: "lp-type-grid" },
        typeTile(cfg.all, "All repositories", "The complete list, with search and filters by type and topic.", projects.length, "#type=all"),
        nUn ? typeTile(cfg.unclassified, UNCLASSIFIED, "Repositories that still need a topic to be assigned to a type.", nUn, "#type=unclassified") : null),
      el("h3", { class: "lp-section" }, "Classifying repositories"),
      topicGuide(cfg, false));

    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      if (!q) { results.replaceChildren(); browse.hidden = false; return; }
      browse.hidden = true;
      const hits = projects.filter(p => q.split(/\s+/).every(w =>
        [p.name, p.description, p.topics.join(" "), (p.categories || []).join(" ")].join(" ").toLowerCase().includes(w)));
      results.replaceChildren(el("p", { class: "cat-count" }, plural(hits.length, "result", "results")),
        el("div", { class: "cat-list" }, hits.map(p => projectCard(p, cfg))));
    });

    app.root.replaceChildren(signedInBar(app),
      el("div", { class: "lp-welcome" },
        el("h2", {}, `Welcome, ${firstName}`),
        el("p", {}, "Select a project type to see its repositories, or search across everything you have access to.")),
      search, results, browse);
  }

  function renderTypeView(app, style, list, showTypes) {
    const crumbs = el("nav", { class: "lp-crumbs" },
      el("a", { href: "#" }, "Project types"), el("span", { class: "lp-crumb-sep" }, "/"), el("span", {}, style.name));
    const head = el("div", { class: "lp-type-hero", style: `--c:${style.colour}` },
      iconBox(style, "lp-icon lp-icon-xl"),
      el("div", {}, el("h2", {}, style.name), el("p", {}, style.description || ""),
        el("span", { class: "lp-type-count" }, plural(list.length, "repository", "repositories"))));
    const body = el("div", {});
    app.root.replaceChildren(signedInBar(app), crumbs, head, style.guide ? topicGuide(app.cfg, false) : null, body);
    renderCatalogue(body, list, app.cfg, { hideTypes: !showTypes, placeholder: `Search within ${style.name}` });
  }

  async function renderMembers(root) {
    try {
      const cfg = await (await fetch(assetUrl("categories.json"))).json();
      loadMembers(root, cfg);
    } catch (e) { root.textContent = "The site configuration could not be loaded."; }
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

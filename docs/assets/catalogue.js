// Interactive filter for the "All projects" page.
(function () {
  const scriptSrc = (document.currentScript || {}).src || "";
  const dataUrl = scriptSrc.replace(/catalogue\.js.*$/, "projects.json");

  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") n.className = v; else if (k.startsWith("on")) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v);
    }
    kids.flat().forEach(k => k != null && n.append(k));
    return n;
  }

  async function render(root) {
    let data;
    try { data = await (await fetch(dataUrl)).json(); }
    catch (e) { root.textContent = "Could not load the project list."; return; }

    const params = new URLSearchParams(location.search);
    const state = { q: "", type: "", tags: new Set(params.getAll("tag")) };

    const tagCounts = {};
    data.projects.forEach(p => p.topics.forEach(t => tagCounts[t] = (tagCounts[t] || 0) + 1));
    const tagList = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a] || a.localeCompare(b));

    const search = el("input", { class: "cat-search md-input", type: "search", placeholder: "Search name, description or tag…" });
    const types = el("div", { class: "cat-chips" });
    const tags = el("div", { class: "cat-chips" });
    const count = el("p", { class: "cat-count" });
    const list = el("div", { class: "cat-list" });
    root.replaceChildren(search, el("div", { class: "cat-label" }, "Type"), types,
      el("div", { class: "cat-label" }, "Tags"), tags, count, list);

    search.addEventListener("input", () => { state.q = search.value.toLowerCase(); update(); });

    function chip(label, active, onclick, n) {
      return el("button", { class: "cat-chip" + (active ? " is-active" : ""), onclick },
        label, n != null ? el("span", { class: "cat-n" }, String(n)) : null);
    }

    function matches(p) {
      if (state.type && !(p.categories || []).includes(state.type) &&
          !(state.type === "Not yet tagged" && !(p.categories || []).length)) return false;
      for (const t of state.tags) if (!p.topics.includes(t)) return false;
      if (state.q) {
        const hay = (p.name + " " + p.description + " " + p.topics.join(" ") + " " + p.language).toLowerCase();
        if (!state.q.split(/\s+/).every(w => hay.includes(w))) return false;
      }
      return true;
    }

    function update() {
      const typeNames = [...data.categories, "Not yet tagged"];
      types.replaceChildren(chip("All", !state.type, () => { state.type = ""; update(); }),
        ...typeNames.map(t => chip(t, state.type === t, () => { state.type = state.type === t ? "" : t; update(); })));
      tags.replaceChildren(...tagList.map(t => chip(t, state.tags.has(t), () => {
        state.tags.has(t) ? state.tags.delete(t) : state.tags.add(t); update();
      }, tagCounts[t])));

      const shown = data.projects.filter(matches);
      count.textContent = `${shown.length} of ${data.projects.length} projects`;
      list.replaceChildren(...shown.map(p => el("article", { class: "cat-card" },
        el("h3", {}, el("a", { href: p.url, target: "_blank", rel: "noopener" }, p.name), p.private ? " 🔒" : ""),
        el("p", {}, p.description || el("em", {}, "No description yet.")),
        el("div", { class: "cat-tags" }, p.topics.map(t => el("button", {
          class: "cat-tag" + (state.tags.has(t) ? " is-active" : ""),
          onclick: () => { state.tags.has(t) ? state.tags.delete(t) : state.tags.add(t); update(); }
        }, t))),
        el("div", { class: "cat-meta" }, [p.language, p.updated && "updated " + p.updated,
          (p.categories || []).join(" · ")].filter(Boolean).join("  •  "))
      )));
      if (!shown.length) list.append(el("p", {}, "No project matches these filters."));
    }
    update();
  }

  function init() {
    const root = document.getElementById("catalogue");
    if (root) render(root);
  }
  // Works with Material's instant navigation and with plain page loads.
  if (window.document$) window.document$.subscribe(init); else document.addEventListener("DOMContentLoaded", init);
})();

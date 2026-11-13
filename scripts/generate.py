#!/usr/bin/env python3
"""Generate the LIVR project catalogue (MkDocs pages) from GitHub repo topics.

  GITHUB_TOKEN=... python scripts/generate.py            # live, from the GitHub API
  python scripts/generate.py --from-json sample.json      # offline test

Writes:
  docs/index.md, docs/all.md, docs/<category>.md, docs/untagged.md,
  docs/assets/projects.json, and mkdocs.yml (= mkdocs.base.yml + generated nav).
Hand-written pages in docs/ (e.g. how-to-add.md) are left alone.
"""
import argparse
import html
import json
import os
import re
import urllib.error
import urllib.request
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
API = "https://api.github.com"


# ---------------------------------------------------------------- GitHub API
def gh(path, token, raw=False):
    req = urllib.request.Request(API + path, headers={
        "Accept": "application/vnd.github.raw" if raw else "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        **({"Authorization": f"Bearer {token}"} if token else {}),
    })
    with urllib.request.urlopen(req) as r:
        data = r.read()
    return data.decode("utf-8", "replace") if raw else json.loads(data)


def fetch_repos(org, token):
    repos, page = [], 1
    while True:
        batch = gh(f"/orgs/{org}/repos?per_page=100&page={page}&type=all", token)
        if not batch:
            return repos
        repos.extend(batch)
        page += 1


def readme_summary(org, name, token, limit=280):
    """First real paragraph of the README, used when the repo has no description."""
    try:
        text = gh(f"/repos/{org}/{name}/readme", token, raw=True)
    except urllib.error.HTTPError:
        return ""
    for para in re.split(r"\n\s*\n", text):
        p = para.strip()
        if not p or p.startswith(("#", "<", "!", "[!", "|", "```", "---", ">")):
            continue
        if re.fullmatch(r"(\[!\[.*?\]\(.*?\)\]\(.*?\)\s*)+", p):  # badge rows
            continue
        p = re.sub(r"!\[.*?\]\(.*?\)", "", p)                 # images
        p = re.sub(r"\[(.*?)\]\(.*?\)", r"\1", p)             # links -> text
        p = re.sub(r"[*_`]", "", p)
        p = " ".join(p.split())
        if len(p) > 30:
            return p if len(p) <= limit else p[:limit].rsplit(" ", 1)[0] + " …"
    return ""


# ------------------------------------------------------------------ helpers
def clean(r):
    return {
        "name": r["name"],
        "url": r["html_url"],
        "description": (r.get("description") or "").strip(),
        "topics": sorted(r.get("topics") or []),
        "language": r.get("language") or "",
        "updated": (r.get("pushed_at") or "")[:10],
        "private": bool(r.get("private")),
        "archived": bool(r.get("archived")),
        "fork": bool(r.get("fork")),
    }


def esc(text):
    return html.escape(text or "", quote=False)


def card(p, cfg_by_topic):
    lock = " :material-lock:{ title=\"Private\" }" if p["private"] else ""
    desc = esc(p["description"]) or "_No description yet. Add one in the repo's About box._"
    tags = " ".join(f"[`{t}`](all.md?tag={t})" for t in p["topics"]) or "_no tags_"
    meta = " · ".join(x for x in [
        f":material-code-tags: {p['language']}" if p["language"] else "",
        f":material-update: {p['updated']}" if p["updated"] else "",
    ] if x)
    return (f"-   :material-github: **[{p['name']}]({p['url']})**{lock}\n\n"
            f"    ---\n\n"
            f"    {desc}\n\n"
            f"    {tags}\n\n"
            f"    <small>{meta}</small>\n")


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


# --------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default=str(ROOT / "categories.yml"))
    ap.add_argument("--from-json")
    a = ap.parse_args()

    cfg = yaml.safe_load(open(a.config))
    org, token = cfg["org"], os.environ.get("GITHUB_TOKEN")
    raw = json.load(open(a.from_json)) if a.from_json else fetch_repos(org, token)

    vis = cfg.get("visibility", "public")
    excluded = set(cfg.get("exclude", []))
    projects = [clean(r) for r in raw]
    projects = [p for p in projects
                if p["name"] not in excluded and not p["archived"] and not p["fork"]
                and (vis == "all" or (vis == "private") == p["private"])]
    if not a.from_json:
        for p in projects:
            if not p["description"]:
                p["summary_from_readme"] = True
                p["description"] = readme_summary(org, p["name"], token)
    projects.sort(key=lambda p: p["updated"], reverse=True)

    # group
    groups, placed = [], set()
    for c in cfg["categories"]:
        want = {t.lower() for t in c["topics"]}
        members = [p for p in projects if want & {t.lower() for t in p["topics"]}]
        for p in members:
            p.setdefault("categories", []).append(c["name"])
            placed.add(p["name"])
        groups.append((c, members))
    untagged = [p for p in projects if p["name"] not in placed]

    # category pages
    for c, members in groups:
        body = [f"# :{c['icon'].replace('/', '-')}: {c['name']}\n",
                f"{c.get('description', '')}\n",
                f"**{len(members)} project{'s' * (len(members) != 1)}** · "
                f"tags: " + ", ".join(f"`{t}`" for t in c["topics"]) + "\n"]
        if members:
            body.append('<div class="grid cards" markdown>\n')
            body += [card(p, None) for p in members]
            body.append("</div>\n")
        else:
            body.append('!!! info "No projects yet"\n    Tag a repo with one of the topics above and it will appear here.\n')
        write(DOCS / f"{c['slug']}.md", "\n".join(body))

    # untagged page
    body = ["# :material-tag-off-outline: Not yet tagged\n",
            "These repos have no tag that matches a group. "
            "Add a topic to them on GitHub (gear icon next to **About**) "
            "and they will move to the right page at the next rebuild.\n"]
    if untagged:
        body.append('<div class="grid cards" markdown>\n')
        body += [card(p, None) for p in untagged]
        body.append("</div>\n")
    else:
        body.append('!!! success "Everything is tagged :tada:"\n')
    write(DOCS / "untagged.md", "\n".join(body))

    # home page
    tiles = []
    for c, members in groups:
        tiles.append(f"-   :{c['icon'].replace('/', '-')}:{{ .lg .middle }} **[{c['name']}]({c['slug']}.md)**\n\n"
                     f"    ---\n\n    {c.get('description', '')}\n\n"
                     f"    [:octicons-arrow-right-24: {len(members)} project{'s' * (len(members) != 1)}]({c['slug']}.md)\n")
    if untagged:
        tiles.append(f"-   :material-tag-off-outline:{{ .lg .middle }} **[Not yet tagged](untagged.md)**\n\n"
                     f"    ---\n\n    Repos without a matching tag.\n\n"
                     f"    [:octicons-arrow-right-24: {len(untagged)} project{'s' * (len(untagged) != 1)}](untagged.md)\n")
    recent = "\n".join(f"| [{p['name']}]({p['url']}) | {esc(p['description'])[:110]} | {p['updated']} |"
                       for p in projects[:8])
    home = f"""---
hide:
  - navigation
  - toc
---

# LIVR project catalogue

All code projects of the **Liver Cell Biology Research Group (LIVR, VUB)** in one place, grouped by type.
Press ++slash++ or click the search box to search all project names and descriptions,
or open [**All projects**](all.md) to filter by tag.

**{len(projects)} projects** · **{len({t for p in projects for t in p['topics']})} tags** · rebuilt automatically every hour

!!! info "LIVR members: see all projects, including private ones"
    Most of our projects are private. Lab members see **all** of them, grouped the same way, in
    [**LIVR members :material-lock:**](members.md) (sign in with your own GitHub token,
    [how to get one](members-token.md)).

## Browse by type

<div class="grid cards" markdown>

{chr(10).join(tiles)}
</div>

## Recently updated

| Project | What it is | Last update |
|---|---|---|
{recent}

[See all projects :octicons-arrow-right-24:](all.md){{ .md-button }}
[How to add your project :octicons-arrow-right-24:](how-to-add.md){{ .md-button }}
"""
    write(DOCS / "index.md", home)

    # all-projects page (interactive, rendered by docs/assets/catalogue.js)
    write(DOCS / "assets" / "projects.json",
          json.dumps({"org": org, "categories": [c["name"] for c, _ in groups],
                      "projects": projects}, indent=1))
    write(DOCS / "all.md", """---
hide:
  - navigation
  - toc
---

# All projects

Type to search, click a type or a tag to filter. Click a tag again to remove it.

<div id="catalogue">Loading…</div>

<script>
/* Self-heal: if the browser used an old cached catalogue.js, load a fresh copy. */
setTimeout(function () {
  var box = document.getElementById("catalogue");
  if (!box || box.dataset.ready) return;
  var old = document.querySelector('script[src*="catalogue.js"]');
  var s = document.createElement("script");
  s.src = (old ? old.src.split("?")[0] : "../assets/catalogue.js") + "?fresh=" + Date.now();
  document.body.appendChild(s);
  setTimeout(function () {
    if (!box.dataset.ready) box.innerHTML = "Still loading. Please press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd> to refresh.";
  }, 4000);
}, 1500);
</script>
""")

    # members-only page: data is fetched in the browser with the member's token
    write(DOCS / "assets" / "categories.json", json.dumps({
        "org": org, "exclude": sorted(excluded),
        "categories": [{"name": c["name"], "slug": c["slug"], "topics": c["topics"]} for c in cfg["categories"]],
    }, indent=1))
    write(DOCS / "members.md", """---
hide:
  - navigation
  - toc
search:
  exclude: true
---

# :material-lock: LIVR members

<div id="members">Loading…</div>

<noscript>This page needs JavaScript.</noscript>

<script>
/* Self-heal: if the browser used an old cached catalogue.js, load a fresh copy. */
setTimeout(function () {
  var box = document.getElementById("members");
  if (!box || box.dataset.ready) return;
  var old = document.querySelector('script[src*="catalogue.js"]');
  var s = document.createElement("script");
  s.src = (old ? old.src.split("?")[0] : "../assets/catalogue.js") + "?fresh=" + Date.now();
  document.body.appendChild(s);
  setTimeout(function () {
    if (!box.dataset.ready) box.innerHTML = "Still loading. Please press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd> to refresh.";
  }, 4000);
}, 1500);
</script>
""")

    # mkdocs.yml = base + nav
    nav = ["nav:", "  - Home: index.md", "  - All projects: all.md", "  - By type:"]
    nav += [f"      - {c['name']}: {c['slug']}.md" for c, _ in groups]
    nav += ["      - Not yet tagged: untagged.md", "  - How to add a project: how-to-add.md",
            "  - 🔒 LIVR members:", "      - All LIVR projects: members.md", "      - Get a token: members-token.md"]
    base = (ROOT / "mkdocs.base.yml").read_text()
    # cache-busting: browsers keep old JS/CSS for ~10 min on GitHub Pages
    import hashlib
    for asset in ("catalogue.js", "catalogue.css"):
        h = hashlib.sha1((DOCS / "assets" / asset).read_bytes()).hexdigest()[:8]
        base = base.replace(f"assets/{asset}", f"assets/{asset}?v={h}")
    (ROOT / "mkdocs.yml").write_text(
        "# GENERATED by scripts/generate.py - edit mkdocs.base.yml instead\n"
        + base.rstrip() + "\n\n" + "\n".join(nav) + "\n")
    print(f"{len(projects)} projects, {len(groups)} groups, {len(untagged)} untagged")


if __name__ == "__main__":
    main()

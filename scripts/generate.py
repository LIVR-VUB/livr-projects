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
import hashlib
from datetime import datetime
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
    return html.escape(text or "", quote=True)


def nice_date(iso):
    try:
        return datetime.strptime(iso, "%Y-%m-%d").strftime("%-d %b %Y")
    except ValueError:
        return iso


def card(p, base):
    """HTML project card. `base` is the relative path to the site root."""
    badge = '<span class="lp-badge">Private</span>' if p["private"] else ""
    desc = esc(p["description"]) or '<span class="lp-muted">No description provided.</span>'
    tags = "".join(f'<a class="lp-tag" href="{base}all/?tag={esc(t)}">{esc(t)}</a>' for t in p["topics"])
    meta = " · ".join(x for x in [esc(p["language"]),
                                  f"Updated {nice_date(p['updated'])}" if p["updated"] else ""] if x)
    return (f'<article class="lp-card">'
            f'<h3><a href="{esc(p["url"])}">{esc(p["name"])}</a>{badge}</h3>'
            f'<p>{desc}</p>'
            f'<div class="lp-tags">{tags}</div>'
            f'<div class="lp-meta">{meta}</div>'
            f'</article>')


def grid(cards):
    return '<div class="lp-grid">\n' + "\n".join(cards) + "\n</div>\n"


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


SELF_HEAL = '''
<script>
/* If the browser used an outdated cached catalogue.js, load a fresh copy. */
setTimeout(function () {
  var box = document.getElementById("ID");
  if (!box || box.dataset.ready) return;
  var old = document.querySelector('script[src*="catalogue.js"]');
  var s = document.createElement("script");
  s.src = (old ? old.src.split("?")[0] : "../assets/catalogue.js") + "?fresh=" + Date.now();
  document.body.appendChild(s);
  setTimeout(function () {
    if (!box.dataset.ready) box.innerHTML = "The page could not be loaded. Please refresh with Ctrl+Shift+R.";
  }, 4000);
}, 1500);
</script>
'''


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
                p["description"] = readme_summary(org, p["name"], token)
    projects.sort(key=lambda p: p["updated"], reverse=True)

    # ---- group by research area
    groups, placed = [], set()
    for c in cfg["categories"]:
        want = {t.lower() for t in c["topics"]}
        members = [p for p in projects if want & {t.lower() for t in p["topics"]}]
        for p in members:
            p.setdefault("categories", []).append(c["name"])
            placed.add(p["name"])
        groups.append((c, members))
    untagged = [p for p in projects if p["name"] not in placed]

    # ---- one page per research area
    for c, members in groups:
        body = [f"# {c['name']}\n",
                f'<p class="lp-lead">{esc(c.get("description", ""))}</p>\n',
                f'<p class="lp-sub">{len(members)} {"repository" if len(members) == 1 else "repositories"}'
                f' · Topics: ' + ", ".join(f"<code>{esc(t)}</code>" for t in c["topics"]) + "</p>\n"]
        if members:
            body.append(grid(card(p, "../") for p in members))
        else:
            body.append('<p class="lp-empty">No public repositories in this area yet. '
                        'Repositories appear here once they carry one of the topics listed above.</p>\n')
        write(DOCS / f"{c['slug']}.md", "\n".join(body))

    # ---- unclassified
    body = ["# Unclassified repositories\n",
            '<p class="lp-lead">These repositories do not yet carry a topic that maps to a research area. '
            'Add a topic on GitHub and they will be classified at the next update. '
            'See <a href="../how-to-add/">Contributing</a>.</p>\n']
    body.append(grid(card(p, "../") for p in untagged) if untagged
                else '<p class="lp-empty">All repositories are classified.</p>\n')
    write(DOCS / "untagged.md", "\n".join(body))

    # ---- home page
    def repos(n):
        return f"{n} {'repository' if n == 1 else 'repositories'}"

    areas = []
    for c, members in groups:
        areas.append(f'<a class="lp-area" href="{c["slug"]}/">'
                     f'<span class="lp-area-name">{esc(c["name"])}</span>'
                     f'<span class="lp-area-desc">{esc(c.get("description", ""))}</span>'
                     f'<span class="lp-area-count">{repos(len(members))}</span></a>')
    if untagged:
        areas.append(f'<a class="lp-area lp-area-muted" href="untagged/">'
                     f'<span class="lp-area-name">Unclassified</span>'
                     f'<span class="lp-area-desc">Repositories without a research-area topic.</span>'
                     f'<span class="lp-area-count">{repos(len(untagged))}</span></a>')
    recent = "\n".join(
        f'<tr><td><a href="{esc(p["url"])}">{esc(p["name"])}</a></td>'
        f'<td>{esc(p["description"])[:120]}</td><td class="lp-nowrap">{nice_date(p["updated"])}</td></tr>'
        for p in projects[:8])
    n_topics = len({t for p in projects for t in p["topics"]})

    home = f"""---
hide:
  - navigation
  - toc
---

<div class="lp-hero" markdown>
<p class="lp-eyebrow">Liver Cell Biology Research Group · Vrije Universiteit Brussel</p>
<h1>Project Catalogue</h1>
<p class="lp-hero-text">A single index of the group's analysis pipelines, research software and
computational resources, organised by research area. Use it to find existing work before starting
something new, and to locate the code behind a dataset, figure or publication.</p>
<div class="lp-actions">
<a class="lp-btn lp-btn-primary" href="all/">Browse all repositories</a>
<a class="lp-btn" href="members/">Members area</a>
</div>
</div>

<div class="lp-stats">
<div><strong>{len(projects)}</strong><span>public repositories</span></div>
<div><strong>{len(groups)}</strong><span>research areas</span></div>
<div><strong>{n_topics}</strong><span>topics</span></div>
<div><strong>Hourly</strong><span>automatic updates</span></div>
</div>

## Research areas

<div class="lp-areas">
{chr(10).join(areas)}
</div>

## Recently updated

<table class="lp-table">
<thead><tr><th>Repository</th><th>Description</th><th>Last update</th></tr></thead>
<tbody>
{recent}
</tbody>
</table>

## Internal repositories

Most of the group's work is held in private repositories. Members of the LIVR-VUB organisation
can view the complete index, including private repositories, in the [Members area](members.md)
after signing in with a personal GitHub access token. Setting up a token takes about two minutes;
see [Access tokens](members-token.md).
"""
    write(DOCS / "index.md", home)

    # ---- all repositories (interactive)
    write(DOCS / "assets" / "projects.json",
          json.dumps({"org": org, "categories": [c["name"] for c, _ in groups],
                      "projects": projects}, indent=1))
    write(DOCS / "all.md", """---
hide:
  - navigation
  - toc
---

# Repository index

<p class="lp-lead">All public repositories of the group. Search by name, description or topic,
or narrow the list by research area and topic.</p>

<div id="catalogue">Loading…</div>
""" + SELF_HEAL.replace("ID", "catalogue"))

    # ---- members area (data fetched in the browser with the member's token)
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

# Members area

<div id="members">Loading…</div>

<noscript>This page requires JavaScript.</noscript>
""" + SELF_HEAL.replace("ID", "members"))

    # ---- mkdocs.yml = base + nav (+ cache-busting for our own assets)
    nav = ["nav:", "  - Overview: index.md", "  - Repository index: all.md", "  - Research areas:"]
    nav += [f"      - {c['name']}: {c['slug']}.md" for c, _ in groups]
    nav += ["      - Unclassified: untagged.md",
            "  - Contributing: how-to-add.md",
            "  - Members area:", "      - Internal repositories: members.md", "      - Access tokens: members-token.md"]
    base = (ROOT / "mkdocs.base.yml").read_text()
    for asset in ("catalogue.js", "catalogue.css"):
        h = hashlib.sha1((DOCS / "assets" / asset).read_bytes()).hexdigest()[:8]
        base = base.replace(f"assets/{asset}", f"assets/{asset}?v={h}")
    (ROOT / "mkdocs.yml").write_text(
        "# GENERATED by scripts/generate.py - edit mkdocs.base.yml instead\n"
        + base.rstrip() + "\n\n" + "\n".join(nav) + "\n")
    print(f"{len(projects)} projects, {len(groups)} areas, {len(untagged)} unclassified")


if __name__ == "__main__":
    main()

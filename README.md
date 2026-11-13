# LIVR project catalogue

Source of the website **https://livr-vub.github.io/livr-projects/**, a searchable overview of all LIVR-VUB code projects grouped by type (RNA-seq, metabolomics, Cell Painting, image analysis, …).

The pages are generated every hour from the **topics** and **description** of each repo in the organization. To list a project, tag the repo; see [How to add a project](docs/how-to-add.md).

| File | What it does |
|---|---|
| `categories.yml` | The groups and which topics belong to them. **Edit this one.** |
| `scripts/generate.py` | Reads repos + topics from GitHub and writes the pages in `docs/` |
| `mkdocs.base.yml` | Site settings (theme, colours). `mkdocs.yml` is generated from it. |
| `docs/how-to-add.md`, `docs/assets/` | Hand-written page and the interactive filter |
| `.github/workflows/build.yml` | Hourly build and deploy to GitHub Pages |

## One-time setup

1. Create the repo `LIVR-VUB/livr-projects` and push these files.
2. **Settings → Pages → Source: GitHub Actions.**
3. **Actions → Build project catalogue → Run workflow.**

## Run locally

```bash
pip install "mkdocs<2" "mkdocs-material>=9.7,<10" pyyaml
GITHUB_TOKEN=$(gh auth token) python scripts/generate.py
mkdocs serve      # http://127.0.0.1:8000
```

# LIVR Project Catalogue

Source of **https://livr-vub.github.io/livr-projects/**, the index of analysis pipelines, research software and computational resources of the Liver Cell Biology Research Group (LIVR), Vrije Universiteit Brussel.

The public pages are generated hourly from the description and topics of each public repository in the LIVR-VUB organisation. The Members area lists all repositories, including private ones; it is populated in the visitor's browser using their personal GitHub access token, so no private information is stored on the site.

| File | Purpose |
|---|---|
| `categories.yml` | Research areas and the topics that map to them. Edit this file to change the classification. |
| `scripts/generate.py` | Retrieves repository metadata from GitHub and writes the pages in `docs/`. |
| `mkdocs.base.yml` | Site configuration. `mkdocs.yml` is generated from it. |
| `docs/assets/` | Stylesheet, interactive index and Members area script, logo. |
| `docs/how-to-add.md`, `docs/members-token.md` | Contributor and access-token guidance. |
| `.github/workflows/build.yml` | Hourly build and deployment to GitHub Pages. |

## Local preview

```bash
pip install "mkdocs<2" "mkdocs-material>=9.7,<10" pyyaml
GITHUB_TOKEN=$(gh auth token) python scripts/generate.py
mkdocs serve
```

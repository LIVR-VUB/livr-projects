# How to add your project

This site is built automatically from the **topics (tags)** and the **description** of every repo in the [LIVR-VUB](https://github.com/LIVR-VUB) organization. You never edit the website itself.

## 1. Give your repo a short description

On the repo page, click the :material-cog: gear icon next to **About** and fill in **Description**. Keep it to one sentence that says *what it does and on which data*, for example:

> Quantifies LSEC fenestrae from AFM images with a U-Net model.

If the description is empty, the site uses the first paragraph of the README instead.

## 2. Add at least one topic

In the same **About** box, add one or more **Topics**. The topic decides on which page the project appears:

| Type page | Use one of these topics |
|---|---|
| RNA-seq & Transcriptomics | `rna-seq`, `scrna-seq`, `single-cell`, `transcriptomics` |
| Metabolomics & Lipidomics | `metabolomics`, `lipidomics` |
| Cell Painting & High-Content Screening | `cell-painting`, `cellprofiler`, `cytomining`, `platemap` |
| Microscopy & Image Analysis | `image-analysis`, `microscopy`, `afm`, `organoids` |
| Spatial & Multi-omics | `spatial-transcriptomics`, `multiomics`, `proteomics` |
| Machine Learning & AI | `machine-learning`, `deep-learning` |
| HPC, Containers & Infrastructure | `hpc`, `containers`, `singularity`, `docker` |

The full list is in [`categories.yml`](https://github.com/LIVR-VUB/livr-projects/blob/main/categories.yml). You can add any other free tags too (`liver`, `lsec`, `hsc`, `masld`…); they show up as filters on [All projects](all.md).

## 3. Wait for the rebuild

The site rebuilds every hour. To update it right away: **livr-projects repo → Actions → Build project catalogue → Run workflow**.

## Adding a new type

Edit `categories.yml` in the `livr-projects` repo: add a block with a `name`, a `slug` (used in the URL), an `icon`, a one-line `description` and the `topics` that belong to it. The site rebuilds when the file changes.
